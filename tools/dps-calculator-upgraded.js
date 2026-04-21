#!/usr/bin/env node
/**
 * tools/dps-calculator-upgraded.js
 *
 * Simulates DPS for three upgrade scenarios per class:
 *   base   — no upgrades
 *   focus  — 6 upgrades dumped into the top-2 damage skills (3+3 on best skills)
 *   spread — 6 upgrades spread: 2+2 on top-2 damage skills, 1+1 on the other two
 *
 * Top-2 damage skills are hardcoded per class based on current base DPS output.
 * Known UpgradeConfig bugs are noted inline.
 *
 * Run: node tools/dps-calculator-upgraded.js
 */

import SkillDatabase from '../shared/SkillDatabase.js'
import { UPGRADE_CONFIG } from '../shared/UpgradeConfig.js'
import { applyUpgrades }  from '../shared/UpgradeUtils.js'
import { BALANCE }        from '../shared/BalanceConfig.js'

const SIM_MS  = 5 * 60 * 1000
const TICK_MS = 50
const R = BALANCE.RANGED_BASE_DPS

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

const DPS_TARGETS = {
  ranged: R * 1.0,
  melee:  R * 0.7,
  healer: R * 0.3,
}

// Per-class: which 2 skill indices are the primary damage contributors (by base DPS output).
// Format: [primaryIdx, secondaryIdx]
// The remaining two indices get 0 or 1 upgrade in the spread scenario.
const DAMAGE_FOCUS = {
  Mage:        [3, 0],  // Pyroblast, Fireball
  Rogue:       [0, 3],  // Sinister Strike, Ambush
  Hunter:      [1, 0],  // Aimed Shot, Shoot Bow  ← S1 upgrade config BUG (see below)
  Warrior:     [0, 2],  // Cleave, Bladestorm     ← S2 upgrade config BUG (distance delta is dead)
  Paladin:     [0, 1],  // Hammer Swing, Avenger's Shield
  Warlock:     [0, 1],  // Shadow Bolt, Corruption
  DeathKnight: [0, 2],  // Obliterate, Death and Decay
  Shaman:      [0, 2],  // Lightning Bolt, Searing Totem
  Priest:      [1, 0],  // Holy Nova, Penance
  Druid:       [0, 1],  // Wrath, Moonfire
}

// Build a set of 4 tier values for a class given 6 total upgrades in focus mode.
// Returns [t0, t1, t2, t3] where each tN = tier for skill N.
function buildFocusTiers(className) {
  const [p, s] = DAMAGE_FOCUS[className]
  const tiers = [0, 0, 0, 0]
  tiers[p] = 3
  tiers[s] = 3
  return tiers
}

// Spread: top 2 get tier-2, other 2 get tier-1 (total = 2+2+1+1 = 6)
function buildSpreadTiers(className) {
  const [p, s] = DAMAGE_FOCUS[className]
  const others = [0, 1, 2, 3].filter(i => i !== p && i !== s)
  const tiers = [0, 0, 0, 0]
  tiers[p] = 2
  tiers[s] = 2
  tiers[others[0]] = 1
  tiers[others[1]] = 1
  return tiers
}

// Apply a tier array to a class's skills, returning upgraded copies.
function applyTierArray(className, tiers) {
  const base = SkillDatabase[className]
  return base.map((skill, idx) => {
    const t = tiers[idx] ?? 0
    if (t === 0) return skill
    return applyUpgrades(skill, className, idx, t)
  })
}

// ── DPS simulation (same logic as dps-calculator.js) ──────────────────────────

function getInstantDamage(skill) {
  switch (skill.type) {
    case 'MELEE':
    case 'PROJECTILE':
      return skill.damage ?? 0
    case 'AOE':
      if (skill.duration && skill.tickRate) {
        return (skill.damage ?? 0) * Math.floor(skill.duration / skill.tickRate)
      }
      return skill.damage ?? 0
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
        return skill.trapEffect.damage ?? 0
      if (skill.subtype === 'TOTEM' && skill.totemAbility) {
        const ta = skill.totemAbility
        return Math.floor(skill.duration / ta.tickRate) * (ta.damage ?? 0)
      }
      if (skill.subtype === 'PET' && skill.petStats) {
        const p = skill.petStats
        return (skill.duration / p.attackRate) * p.damage
      }
      return 0
    default:
      return 0
  }
}

function getCastTime(skill)  { return skill.castTime ?? 0 }

function dealsDamage(skill) {
  if (skill.subtype === 'HEAL_ALLY') return false
  if (skill.subtype === 'STEALTH')   return false
  if (skill.subtype === 'GRIP')      return false
  if (skill.type   === 'BUFF' && !skill.damage && !skill.dot) return false
  if (skill.type   === 'SHIELD')     return false
  if (skill.type   === 'DASH')       return false
  return getInstantDamage(skill) > 0 || (skill.dot?.damagePerTick ?? 0) > 0
}

function priorityScore(skill, dotExpiry) {
  const castTime = getCastTime(skill)
  const cycle    = Math.max(skill.cooldown ?? 0, castTime, 1)
  if (skill.dot && !dotExpiry.has(skill.name)) {
    const dotTicks = Math.floor(skill.dot.duration / skill.dot.tickRate)
    const dotTotal = skill.dot.damagePerTick * dotTicks
    return (getInstantDamage(skill) + dotTotal) / Math.max(castTime, 1)
  }
  return getInstantDamage(skill) / cycle
}

function simulate(skills) {
  const dmgSkills = skills.filter(dealsDamage)
  const cdReady   = new Map(skills.map(s => [s.name, 0]))
  const dotExpiry = new Map()
  const skillDmg  = new Map(skills.map(s => [s.name, 0]))
  let playerFreeAt = 0
  let stealthMult  = 1.0

  for (let t = 0; t < SIM_MS; t += TICK_MS) {
    for (const [name, expiry] of dotExpiry) {
      if (t >= expiry) { dotExpiry.delete(name); continue }
      const skill = skills.find(s => s.name === name)
      if (!skill?.dot) continue
      skillDmg.set(name, skillDmg.get(name) + skill.dot.damagePerTick * (TICK_MS / skill.dot.tickRate))
    }

    if (t < playerFreeAt) continue

    const available = dmgSkills.filter(s => {
      if ((cdReady.get(s.name) ?? 0) > t) return false
      if (s.dot && dotExpiry.has(s.name)) {
        if (dotExpiry.get(s.name) - t > s.dot.tickRate) return false
      }
      return true
    })
    if (available.length === 0) continue

    const instants = available.filter(s => getCastTime(s) === 0)
    instants.sort((a, b) => priorityScore(b, dotExpiry) - priorityScore(a, dotExpiry))
    for (const instant of instants) {
      cdReady.set(instant.name, t + (instant.cooldown ?? 0))
      if (instant.subtype === 'STEALTH') { stealthMult = instant.effectParams?.shadowStrikeMultiplier ?? 1.5; continue }
      skillDmg.set(instant.name, skillDmg.get(instant.name) + Math.round(getInstantDamage(instant) * stealthMult))
      stealthMult = 1.0
      if (instant.dot) dotExpiry.set(instant.name, t + instant.dot.duration)
    }

    const castable = available.filter(s => getCastTime(s) > 0 && (cdReady.get(s.name) ?? 0) <= t)
    if (castable.length === 0) continue
    castable.sort((a, b) => priorityScore(b, dotExpiry) - priorityScore(a, dotExpiry))
    const skill = castable[0]
    cdReady.set(skill.name, t + (skill.cooldown ?? 0))
    playerFreeAt = t + getCastTime(skill)
    skillDmg.set(skill.name, skillDmg.get(skill.name) + Math.round(getInstantDamage(skill) * stealthMult))
    stealthMult = 1.0
    if (skill.dot) dotExpiry.set(skill.name, t + skill.dot.duration)
  }

  let total = 0
  for (const dmg of skillDmg.values()) total += dmg
  return { dps: Math.round(total) / (SIM_MS / 1000) }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const BUGS = {
  // Hunter S2: Call of the Wild spawns beastVariants — the simulator models subtype=PET (petStats),
  // not WILD_BEAST. damageBonus upgrades do apply in-game but won't show in this sim.
  Hunter: 'S2 (Call of the Wild) — damageBonus upgrade not reflected in sim (WILD_BEAST not modelled)',
}

console.log()
console.log('  DPS — Upgrade Scenario Comparison (6 upgrades, R=10)')
console.log()
console.log('  Focus  = 3+3+0+0 on top-2 damage skills')
console.log('  Spread = 2+2+1+1 across all skills')
console.log()

const W = { cls: 13, dps: 7, mult: 7 }
console.log(
  '  ' + 'Class'.padEnd(W.cls) +
  '│' + ' Base'.padStart(W.dps) +
  '│' + ' Focus'.padStart(W.dps) + ' ×mult' +
  '│' + ' Spread'.padStart(W.dps) + ' ×mult' +
  '  Focus skills'
)
console.log('  ' + '─'.repeat(W.cls) + '┼' + '─'.repeat(W.dps) + '┼' + '─'.repeat(W.dps + 6) + '┼' + '─'.repeat(W.dps + 6) + '──' + '─'.repeat(24))

const classOrder = ['Mage','Rogue','Hunter','Warrior','Paladin','Warlock','DeathKnight','Shaman','Priest','Druid']

for (const className of classOrder) {
  const baseSkills   = SkillDatabase[className]
  const focusTiers   = buildFocusTiers(className)
  const spreadTiers  = buildSpreadTiers(className)

  const focusSkills  = applyTierArray(className, focusTiers)
  const spreadSkills = applyTierArray(className, spreadTiers)

  const baseDps   = simulate(baseSkills).dps
  const focusDps  = simulate(focusSkills).dps
  const spreadDps = simulate(spreadSkills).dps

  const focusMult  = (focusDps  / baseDps).toFixed(2)
  const spreadMult = (spreadDps / baseDps).toFixed(2)

  const [p, s]   = DAMAGE_FOCUS[className]
  const focusNames = [baseSkills[p].name, baseSkills[s].name].join(' + ')

  const bugMark = BUGS[className] ? ' ⚠' : ''
  console.log(
    '  ' + (className + bugMark).padEnd(W.cls) +
    '│' + baseDps.toFixed(1).padStart(W.dps) +
    '│' + focusDps.toFixed(1).padStart(W.dps) + ` ×${focusMult}` +
    '│' + spreadDps.toFixed(1).padStart(W.dps) + ` ×${spreadMult}` +
    '  ' + focusNames
  )
}

if (Object.keys(BUGS).length > 0) {
  console.log()
  console.log('  ─── Notes ───────────────────────────────────────────────────────────────')
  for (const [cls, note] of Object.entries(BUGS)) {
    console.log(`  ⚠ ${cls}: ${note}`)
  }
}
console.log()

// Illidan fight time projection.
// Illidan HP was calibrated so that fight_time = 8 min at base GroupDPS (no upgrades, RLEF=0.5).
// fight_time scales inversely with GroupDPS — upgrade multipliers map directly to time reduction.
// fight_time_upgraded = 8 min / avg_upgrade_mult
//
// Average upgrade multiplier: weight each class by its contribution to the 9.7×R theoretical GroupDPS.
//   6 ranged × 1.0R, 4 melee × 0.7R, 3 healers × 0.3R  (from BalanceConfig comments)
// We approximate with equal weighting across classes since exact 13-player comp varies.

console.log('  ─── Illidan fight time projection ───────────────────────────────────────')
console.log()
console.log('  Illidan is calibrated for 8 min at base. Upgrade multiplier → proportional time reduction.')
console.log()

const computedResults = {}
for (const className of classOrder) {
  const baseSkills   = SkillDatabase[className]
  const focusSkills  = applyTierArray(className, buildFocusTiers(className))
  const spreadSkills = applyTierArray(className, buildSpreadTiers(className))
  const base   = simulate(baseSkills).dps
  const focus  = simulate(focusSkills).dps
  const spread = simulate(spreadSkills).dps
  computedResults[className] = { focus: focus / base, spread: spread / base }
}

const avgFocusMult  = classOrder.reduce((s, c) => s + computedResults[c].focus,  0) / classOrder.length
const avgSpreadMult = classOrder.reduce((s, c) => s + computedResults[c].spread, 0) / classOrder.length

const BASE_MIN = 8.0
console.log(`  Scenario             Avg ×mult   Est. fight time   vs base`)
console.log(`  ────────────────────────────────────────────────────────────`)
console.log(`  Base (no upgrades)    ×1.00       ${BASE_MIN.toFixed(1)} min`)
console.log(`  Spread 2+2+1+1        ×${avgSpreadMult.toFixed(2)}      ~${(BASE_MIN / avgSpreadMult).toFixed(1)} min          -${((1 - 1/avgSpreadMult)*100).toFixed(0)}%`)
console.log(`  Focus 3+3 (best 2)    ×${avgFocusMult.toFixed(2)}      ~${(BASE_MIN / avgFocusMult).toFixed(1)} min          -${((1 - 1/avgFocusMult)*100).toFixed(0)}%`)
console.log()
console.log('  Enrage at 12 min. No upgrades = comfortable; focus upgrades = fast clear.')
console.log()
