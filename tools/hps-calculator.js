#!/usr/bin/env node
/**
 * tools/hps-calculator.js
 *
 * Simulates a 5-minute healing rotation for each class using a greedy
 * optimal rotation (always use highest-HPS available healing ability).
 *
 * Handles: direct heals, HoT (ticks passively while casting other spells),
 * channel heals, persistent AOE heals, and shields (counted as effective HPS).
 *
 * Single-target by default. Pass --targets=N for multi-target simulation.
 * In multi-target mode, AOE heals scale by N, Chain Heal counts its chains
 * (up to N targets), and HoTs tick on N players simultaneously.
 * Single-target heals (direct, shield, channel) are unchanged.
 *
 * Run: node tools/hps-calculator.js
 *      node tools/hps-calculator.js --targets=3
 */

import SkillDatabase from '../shared/SkillDatabase.js'
import { BALANCE }   from '../shared/BalanceConfig.js'

// ── Config ────────────────────────────────────────────────────────────────────

const SIM_MS  = 5 * 60 * 1000
const TICK_MS = 50

const targetsArg   = process.argv.find(a => a.startsWith('--targets='))
const TARGET_COUNT = targetsArg ? Math.max(1, parseInt(targetsArg.split('=')[1], 10)) : 1

const R = BALANCE.RANGED_BASE_DPS

const HEALER_CLASSES = new Set(['Shaman', 'Druid', 'Priest'])

// ── Healing extraction helpers ─────────────────────────────────────────────────

/**
 * Healing delivered the moment a skill activates (or completes its cast).
 * HoT portion is NOT included here — it's tracked and accumulated separately,
 * just like DoTs in the DPS calculator.
 */
function getInstantHeal(skill) {
  switch (skill.type) {
    case 'TARGETED':
      if (skill.subtype === 'HEAL_ALLY') {
        // Chain Heal hits primary + up to maxChains targets, capped at TARGET_COUNT
        const targets = Math.min((skill.maxChains ?? 0) + 1, TARGET_COUNT)
        return (skill.healAmount ?? 0) * targets
      }
      return 0

    case 'PROJECTILE':
      // e.g. Penance: canHitAllies + healAmount
      if (skill.canHitAllies) return skill.healAmount ?? 0
      return 0

    case 'AOE':
      // Persistent ticking AOE heal
      if (skill.healAmount && skill.duration && skill.tickRate) {
        return Math.floor(skill.duration / skill.tickRate) * skill.healAmount * TARGET_COUNT
      }
      // Instant-burst AOE heal (e.g. Holy Nova)
      return (skill.healAmount ?? 0) * TARGET_COUNT

    case 'CHANNEL':
      // Direct healPerTick on the skill (e.g. Drain Life)
      if (skill.healPerTick && skill.castTime && skill.tickRate) {
        return Math.floor(skill.castTime / skill.tickRate) * skill.healPerTick
      }
      // healAmount in payload (e.g. Tranquility)
      if (skill.payload?.healAmount && skill.castTime && skill.tickRate) {
        return Math.floor(skill.castTime / skill.tickRate) * skill.payload.healAmount
      }
      return 0

    case 'BUFF':
      // Shield = absorbed damage = effective HPS
      return skill.effectParams?.shield ?? 0

    default:
      return 0
  }
}

/** How long the player is blocked (can't cast anything else). */
function getCastTime(skill) {
  return skill.castTime ?? 0
}

/** True if this skill produces any healing or shielding output. */
function dealsHealing(skill) {
  // Resurrection is pure utility — excluded from HPS rotation
  if (skill.type === 'CAST' && skill.payload?.effectType === 'REVIVE') return false
  return getInstantHeal(skill) > 0 || (skill.hot?.healPerTick ?? 0) > 0
}

/**
 * Priority score: higher = use sooner.
 *
 * For HoT skills whose HoT is NOT currently active: include the full HoT
 * value in the numerator. HoT healing is "free" — it ticks while the healer
 * casts filler abilities — so it should always be applied before filling.
 *
 * Example — Regrowth (HoT not active):
 *   (15 instant + 20 hot) / 1500ms cast = 0.023  > Chain Heal 30/3000 = 0.010
 *   → Regrowth wins priority, then Chain Heal fills.
 */
function priorityScore(skill, hotExpiry) {
  const castTime = getCastTime(skill)
  const cycle    = Math.max(skill.cooldown ?? 0, castTime, 1)

  if (skill.hot && !hotExpiry.has(skill.name)) {
    const hotTicks  = Math.floor(skill.hot.duration / skill.hot.tickRate)
    const hotTotal  = skill.hot.healPerTick * hotTicks * TARGET_COUNT
    const totalHeal = getInstantHeal(skill) + hotTotal
    const costMs    = Math.max(castTime, 1)
    return totalHeal / costMs
  }

  return getInstantHeal(skill) / cycle
}

// ── Simulation ────────────────────────────────────────────────────────────────

function simulate(className, skills) {
  const healSkills = skills.filter(dealsHealing)

  const cdReady   = new Map(skills.map(s => [s.name, 0]))
  const hotExpiry = new Map()
  const skillHeal = new Map(skills.map(s => [s.name, 0]))

  let playerFreeAt = 0

  for (let t = 0; t < SIM_MS; t += TICK_MS) {

    // ── Accumulate HoT ticks ───────────────────────────────────────────────
    for (const [name, expiry] of hotExpiry) {
      if (t >= expiry) { hotExpiry.delete(name); continue }
      const skill = skills.find(s => s.name === name)
      if (!skill?.hot) continue
      skillHeal.set(name, skillHeal.get(name) + skill.hot.healPerTick * (TICK_MS / skill.hot.tickRate) * TARGET_COUNT)
    }

    // ── Player action ──────────────────────────────────────────────────────
    if (t < playerFreeAt) continue

    const available = healSkills.filter(s => {
      if ((cdReady.get(s.name) ?? 0) > t) return false
      // Don't reapply a HoT if it still has more than 1 tick remaining
      if (s.hot && hotExpiry.has(s.name)) {
        const remaining = hotExpiry.get(s.name) - t
        if (remaining > s.hot.tickRate) return false
      }
      return true
    })

    if (available.length === 0) continue

    available.sort((a, b) => priorityScore(b, hotExpiry) - priorityScore(a, hotExpiry))

    const skill    = available[0]
    const castTime = getCastTime(skill)
    const heal     = getInstantHeal(skill)

    cdReady.set(skill.name, t + (skill.cooldown ?? 0))
    if (castTime > 0) playerFreeAt = t + castTime

    skillHeal.set(skill.name, skillHeal.get(skill.name) + heal)

    if (skill.hot) {
      hotExpiry.set(skill.name, t + skill.hot.duration)
    }
  }

  // ── Build result ───────────────────────────────────────────────────────
  const breakdown = []
  let total = 0
  for (const [name, heal] of skillHeal) {
    if (heal < 1) continue
    breakdown.push({ name, heal: Math.round(heal) })
    total += heal
  }
  breakdown.sort((a, b) => b.heal - a.heal)
  total = Math.round(total)

  return { total, hps: total / (SIM_MS / 1000), breakdown }
}

// ── Output formatting ──────────────────────────────────────────────────────────

function bar(ratio, width = 20) {
  const filled = Math.round(Math.min(ratio, 1.0) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function run() {
  const W_CLASS = 13
  const W_HPS   = 8
  const W_BAR   = 22

  console.log()
  const modeLabel = TARGET_COUNT === 1 ? 'single-target' : `${TARGET_COUNT} targets`
  console.log(`  HPS Calculator — 5-minute healing rotation (${modeLabel}, greedy)`)
  console.log(`  BalanceConfig: R=${R}  |  No HPS target set — compare healers against each other`)
  console.log()

  const results = []
  for (const [className, skills] of Object.entries(SkillDatabase)) {
    const { hps, breakdown } = simulate(className, skills)
    if (hps < 0.05) continue  // skip classes with zero/negligible healing
    const role = HEALER_CLASSES.has(className) ? 'healer' : 'off-role'
    results.push({ className, hps, role, breakdown })
  }

  results.sort((a, b) => b.hps - a.hps)
  const maxHps = results[0]?.hps ?? 1

  const header = `  ${'Class'.padEnd(W_CLASS)}│${'HPS'.padStart(W_HPS)} │ ${'bar (rel. to top)'.padEnd(W_BAR)} │ Top contributors`
  console.log(header)
  console.log('  ' + '─'.repeat(W_CLASS) + '┼' + '─'.repeat(W_HPS) + '─┼─' + '─'.repeat(W_BAR) + '─┼─' + '─'.repeat(30))

  for (const r of results) {
    const ratio  = r.hps / maxHps
    const hpsStr = r.hps.toFixed(1).padStart(W_HPS)
    const barStr = bar(ratio, W_BAR)
    const topStr = r.breakdown.slice(0, 3)
      .map(b => `${b.name} ${(b.heal / (SIM_MS / 1000)).toFixed(1)}`).join('  |  ')
    const tag    = r.role === 'off-role' ? ' [off-role]' : ''
    console.log(`  ${r.className.padEnd(W_CLASS)}│${hpsStr} │ ${barStr} │ ${topStr}${tag}`)
  }

  console.log()
  console.log('  Notes:')
  console.log('  • Bar is relative to the top healer (not an absolute target).')
  if (TARGET_COUNT === 1) {
    console.log('  • Chain Heal counts primary target only — run with --targets=N to model chaining.')
  } else {
    console.log(`  • Chain Heal counts up to min(maxChains+1, ${TARGET_COUNT}) targets.`)
  }
  console.log('  • Shields (Power Word: Shield) counted as effective HPS (absorbed damage).')
  console.log('  • Mass Resurrection excluded — utility spell, not a sustained HPS contributor.')
  console.log('  • [off-role] = class has incidental healing (e.g. self-heal, hybrid), not a dedicated healer.')
  console.log('  • Define a HPS target after playtesting: measure avg incoming DPS per player.')
  console.log()

  // Per-class breakdown — dedicated healers only
  console.log('  ─── Per-ability breakdown (dedicated healers) ────────────────────────────')
  for (const r of results.filter(r => r.role === 'healer')) {
    const totalHeal = r.breakdown.reduce((s, b) => s + b.heal, 0)
    console.log()
    console.log(`  ${r.className} (${r.hps.toFixed(1)} HPS total)`)
    for (const b of r.breakdown) {
      const abilHps = (b.heal / (SIM_MS / 1000)).toFixed(1).padStart(7)
      const pct     = ((b.heal / totalHeal) * 100).toFixed(0).padStart(3)
      const abilBar = bar(b.heal / totalHeal, 16)
      console.log(`    ${b.name.padEnd(24)} ${abilHps} hps  ${pct}%  ${abilBar}`)
    }
  }

  console.log()
}

run()
