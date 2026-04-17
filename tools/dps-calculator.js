#!/usr/bin/env node
/**
 * tools/dps-calculator.js
 *
 * Simulates a 5-minute target-dummy fight for each class using a greedy
 * optimal rotation (always use highest-DPS available ability).
 *
 * Handles: instant, cast (with cast-time blocking), channel, DoT (refresh
 * just before expiry), persistent AoE zones, spawns (totem/pet), traps,
 * and the Rogue stealth multiplier.
 *
 * Single-target by default. Pass --targets=N for multi-target simulation.
 * In multi-target mode, DoTs, AoE zones, and totems/pets scale by N targets.
 * Single-target abilities (projectiles, direct casts) are unchanged.
 *
 * Run: node tools/dps-calculator.js
 *      node tools/dps-calculator.js --targets=3
 */

import SkillDatabase from '../shared/SkillDatabase.js'
import { BALANCE }   from '../shared/BalanceConfig.js'

// ── Config ────────────────────────────────────────────────────────────────────

const SIM_MS   = 5 * 60 * 1000   // simulation duration (ms)
const TICK_MS  = 50               // simulation tick granularity (ms)

const targetsArg  = process.argv.find(a => a.startsWith('--targets='))
const TARGET_COUNT = targetsArg ? Math.max(1, parseInt(targetsArg.split('=')[1], 10)) : 1

const R = BALANCE.RANGED_BASE_DPS
const DPS_TARGETS = {
  ranged: R * 1.0,
  melee:  R * 0.7,
  healer: R * 0.3,
}

const CLASS_ROLE = {
  Warrior:    'melee',
  Paladin:    'melee',
  DeathKnight:'melee',
  Rogue:      'ranged',
  Mage:       'ranged',
  Warlock:    'ranged',
  Hunter:     'ranged',
  Shaman:     'healer',
  Druid:      'healer',
  Priest:     'healer',
}

// ── Damage extraction helpers ─────────────────────────────────────────────────

/**
 * Damage dealt the moment a skill activates (or completes its cast).
 * For persistent AoE zones, returns total tick damage (all ticks summed).
 * For spawns, returns total damage over the spawn's lifetime.
 */
function getInstantDamage(skill) {
  switch (skill.type) {
    case 'MELEE':
    case 'PROJECTILE':
      // MULTI and chain abilities: single-target sim counts 1 hit
      return skill.damage ?? 0

    case 'AOE':
      if (skill.duration && skill.tickRate) {
        const ticks = Math.floor(skill.duration / skill.tickRate)
        return (skill.damage ?? 0) * ticks * TARGET_COUNT
      }
      return (skill.damage ?? 0) * TARGET_COUNT

    case 'CAST': {
      const p = skill.payload ?? {}
      let dmg = p.damage ?? 0
      if (p.onImpact) dmg += p.onImpact.damage ?? 0
      return dmg
    }

    case 'CHANNEL':
      if (skill.damagePerTick && skill.tickRate && skill.castTime) {
        return Math.floor(skill.castTime / skill.tickRate) * skill.damagePerTick
      }
      return 0

    case 'TARGETED':
      if (skill.subtype === 'HEAL_ALLY') return 0
      if (skill.subtype === 'GRIP')      return 0
      {
        let dmg = skill.damage ?? 0
        if (skill.subtype === 'TELEPORT_BEHIND') dmg += skill.comboDamage ?? 0
        return dmg
      }

    case 'SPAWN':
      if (skill.subtype === 'TRAP' && skill.trapEffect)
        return (skill.trapEffect.damage ?? 0) * TARGET_COUNT
      if (skill.subtype === 'TOTEM' && skill.totemAbility) {
        const ta = skill.totemAbility
        return Math.floor(skill.duration / ta.tickRate) * (ta.damage ?? 0) * TARGET_COUNT
      }
      if (skill.subtype === 'PET' && skill.petStats) {
        const p = skill.petStats
        return (skill.duration / p.attackRate) * p.damage * TARGET_COUNT
      }
      return 0

    default:
      return 0
  }
}

/** How long the player is blocked (can't cast anything else). */
function getCastTime(skill) {
  return skill.castTime ?? 0
}

/** True if this skill contributes any damage to a single target. */
function dealsDamage(skill) {
  if (skill.subtype === 'HEAL_ALLY') return false
  if (skill.subtype === 'STEALTH')   return false
  if (skill.subtype === 'GRIP')      return false
  if (skill.type   === 'BUFF' && !skill.damage && !skill.dot) return false
  if (skill.type   === 'SHIELD')     return false
  if (skill.type   === 'DASH')       return false
  return getInstantDamage(skill) > 0 || (skill.dot?.damagePerTick ?? 0) > 0
}

/**
 * Priority score: higher = use sooner.
 *
 * For DoT skills whose DoT is NOT currently active: include the full DoT
 * damage in the numerator and use cast time as the denominator (opportunity
 * cost). This reflects that DoT damage is "free" — it ticks passively while
 * the player casts filler abilities.
 *
 * Example — Corruption (not active):
 *   (10 instant + 105 dot) / 1200ms cast = 0.096  > Shadow Bolt 35/700 = 0.05
 *   → Corruption wins priority until the DoT is running, then SB fills.
 */
function priorityScore(skill, dotExpiry, t) {
  const castTime = getCastTime(skill)
  const cycle    = Math.max(skill.cooldown ?? 0, castTime, 1)

  if (skill.dot && !dotExpiry.has(skill.name)) {
    // DoT not active: factor in the full DoT value as incremental gain.
    // In multi-target mode, one cast applies the DoT to all targets.
    const dotTicks    = Math.floor(skill.dot.duration / skill.dot.tickRate)
    const dotTotal    = skill.dot.damagePerTick * dotTicks * TARGET_COUNT
    const totalDmg    = getInstantDamage(skill) + dotTotal
    const costMs      = Math.max(castTime, 1)   // opportunity cost = time player is blocked
    return totalDmg / costMs
  }

  return getInstantDamage(skill) / cycle
}

// ── Simulation ────────────────────────────────────────────────────────────────

function simulate(className, skills) {
  const dmgSkills = skills.filter(dealsDamage)

  // Cooldown tracking: when can each skill next be activated
  const cdReady = new Map(skills.map(s => [s.name, 0]))

  // DoT tracking: when does each DoT expire
  const dotExpiry = new Map()

  // Per-skill damage accumulators
  const skillDmg = new Map(skills.map(s => [s.name, 0]))

  // Player cast state
  let playerFreeAt = 0

  // Rogue stealth: next damage hit gets a multiplier
  let stealthMult = 1.0

  for (let t = 0; t < SIM_MS; t += TICK_MS) {

    // ── Accumulate DoT ticks ─────────────────────────────────────────────────
    for (const [name, expiry] of dotExpiry) {
      if (t >= expiry) { dotExpiry.delete(name); continue }
      const skill = skills.find(s => s.name === name)
      if (!skill?.dot) continue
      // Accumulate proportional tick damage each simulation tick
      const dot = skill.dot
      skillDmg.set(name, skillDmg.get(name) + dot.damagePerTick * (TICK_MS / dot.tickRate) * TARGET_COUNT)
    }

    // ── Player action ─────────────────────────────────────────────────────────
    if (t < playerFreeAt) continue

    // Skills available this tick (off CD, deals damage)
    const available = dmgSkills.filter(s => {
      if ((cdReady.get(s.name) ?? 0) > t) return false
      // Don't reapply a DoT if it still has more than 1 tick remaining — let it run
      if (s.dot && dotExpiry.has(s.name)) {
        const remaining = dotExpiry.get(s.name) - t
        if (remaining > s.dot.tickRate) return false
      }
      return true
    })

    if (available.length === 0) continue

    // ── Phase 1: weave in all available instant-cast abilities ─────────────────
    // Instants don't block the player — fire them all before starting the next cast.
    const instants = available.filter(s => getCastTime(s) === 0)
    instants.sort((a, b) => priorityScore(b, dotExpiry, t) - priorityScore(a, dotExpiry, t))
    for (const instant of instants) {
      cdReady.set(instant.name, t + (instant.cooldown ?? 0))
      if (instant.subtype === 'STEALTH') {
        stealthMult = instant.effectParams?.shadowStrikeMultiplier ?? 1.5
        continue
      }
      const effectiveDmg = Math.round(getInstantDamage(instant) * stealthMult)
      stealthMult = 1.0
      skillDmg.set(instant.name, skillDmg.get(instant.name) + effectiveDmg)
      if (instant.dot) dotExpiry.set(instant.name, t + instant.dot.duration)
    }

    // ── Phase 2: select best cast-time ability and begin casting ───────────────
    const castable = available.filter(s => getCastTime(s) > 0 && (cdReady.get(s.name) ?? 0) <= t)
    if (castable.length === 0) continue

    castable.sort((a, b) => priorityScore(b, dotExpiry, t) - priorityScore(a, dotExpiry, t))

    const skill      = castable[0]
    const castTime   = getCastTime(skill)
    const instantDmg = getInstantDamage(skill)

    cdReady.set(skill.name, t + (skill.cooldown ?? 0))
    playerFreeAt = t + castTime

    // Apply stealth multiplier once to the next damaging hit
    const effectiveDmg = Math.round(instantDmg * stealthMult)
    stealthMult = 1.0  // consumed

    skillDmg.set(skill.name, skillDmg.get(skill.name) + effectiveDmg)

    if (skill.dot) {
      dotExpiry.set(skill.name, t + skill.dot.duration)
    }
  }

  // ── Build result ──────────────────────────────────────────────────────────
  const breakdown = []
  let total = 0

  for (const [name, dmg] of skillDmg) {
    if (dmg < 1) continue
    breakdown.push({ name, dmg: Math.round(dmg) })
    total += dmg
  }

  breakdown.sort((a, b) => b.dmg - a.dmg)
  total = Math.round(total)

  return { total, dps: total / (SIM_MS / 1000), breakdown }
}

// ── Output formatting ─────────────────────────────────────────────────────────

function bar(ratio, width = 20) {
  const filled = Math.round(Math.min(ratio, 3) * (width / 3))  // cap at 3× for display
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function fmt(n) {
  return String(Math.round(n)).padStart(7)
}

function run() {
  const W_CLASS = 13
  const W_DPS   = 8
  const W_VS    = 9
  const W_BAR   = 22

  console.log()
  const modeLabel = TARGET_COUNT === 1 ? 'single-target' : `${TARGET_COUNT} targets`
  console.log(`  DPS Calculator — 5-minute target dummy (${modeLabel}, greedy rotation)`)
  console.log(`  BalanceConfig: R=${R}  Targets → ranged: ${DPS_TARGETS.ranged} | melee: ${DPS_TARGETS.melee.toFixed(1)} | healer: ${DPS_TARGETS.healer.toFixed(1)}`)
  console.log()

  const header = `  ${'Class'.padEnd(W_CLASS)}│${'DPS'.padStart(W_DPS)} │${'vs target'.padStart(W_VS)} │ ${'bar (×target)'.padEnd(W_BAR)} │ Top contributors`
  console.log(header)
  console.log('  ' + '─'.repeat(W_CLASS) + '┼' + '─'.repeat(W_DPS) + '─┼' + '─'.repeat(W_VS) + '─┼─' + '─'.repeat(W_BAR) + '─┼─' + '─'.repeat(30))

  const results = []

  for (const [className, skills] of Object.entries(SkillDatabase)) {
    const { dps, breakdown } = simulate(className, skills)
    const role    = CLASS_ROLE[className] ?? 'ranged'
    const target  = DPS_TARGETS[role]
    const ratio   = dps / target
    const vsStr   = `×${ratio.toFixed(1)}`
    const topStr  = breakdown.slice(0, 3).map(b => `${b.name} ${(b.dmg / (SIM_MS / 1000)).toFixed(1)}`).join('  |  ')

    results.push({ className, dps, role, ratio, vsStr, topStr, breakdown })
  }

  // Sort by DPS descending
  results.sort((a, b) => b.dps - a.dps)

  for (const r of results) {
    const flag    = r.ratio > 5 ? ' ⚠' : r.ratio < 0.3 ? ' ↓' : ''
    const dpsStr  = r.dps.toFixed(1).padStart(W_DPS)
    const vsStr   = r.vsStr.padStart(W_VS)
    const barStr  = bar(r.ratio, W_BAR)
    console.log(`  ${r.className.padEnd(W_CLASS)}│${dpsStr} │${vsStr} │ ${barStr} │ ${r.topStr}${flag}`)
  }

  console.log()
  console.log('  Notes:')
  console.log('  ⚠  DPS is >5× target — ability values almost certainly need scaling down')
  console.log('  ↓  DPS is <0.3× target — class will feel useless, check ability values')
  console.log('  Bar fills to 3× target. AoE abilities counted as single-target (1 enemy hit).')
  console.log('  Buffs with no damage (Charge, Shield Wall, Sprint, Bloodlust…) not counted.')
  console.log()

  // Per-class breakdown
  console.log('  ─── Per-ability breakdown ────────────────────────────────────────────────')
  for (const r of results) {
    const target = DPS_TARGETS[r.role]
    console.log()
    console.log(`  ${r.className} (${r.role}, target: ${target} DPS)`)
    for (const b of r.breakdown) {
      const abilDps = (b.dmg / (SIM_MS / 1000)).toFixed(1).padStart(7)
      const pct     = ((b.dmg / r.breakdown.reduce((s, x) => s + x.dmg, 0)) * 100).toFixed(0).padStart(3)
      const dpsBar  = bar(b.dmg / (SIM_MS / 1000) / target, 16)
      console.log(`    ${b.name.padEnd(24)} ${abilDps} dps  ${pct}%  ${dpsBar}`)
    }
  }

  console.log()
}

run()
