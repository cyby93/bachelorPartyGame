/**
 * shared/IllidanConfig.js
 * Full encounter configuration for Illidan Stormrage (Level 5).
 *
 * Illidan-specific mechanics are isolated here from the generic boss entity
 * (ShadeOfAkamaConfig.js). Common defaults come from BaseBossConfig.js.
 *
 * maxHp is the 1-player base. LevelConfig.js applies hpMult at runtime:
 *   hpMult = 1.0 + (playerCount - 1) × 0.10   → ×2.2 at 13 players
 *   Illidan HP (13p, Normal) = maxHp × 2.2 ≈ R × 23,276
 *
 * Tune RANGED_BASE_DPS (R) in BalanceConfig.js until the fight feels right.
 *
 * ── Fight duration math ─────────────────────────────────────────────────────
 *
 *  fight_time = (2116 × R × RLEF × 2.2) / (9.7 × R × RLEF)
 *             = (2116 × 2.2) / 9.7 ≈ 480 s = 8 min   (R and RLEF cancel)
 *
 *  The constant 2116 encodes the 8-minute target. R and RLEF do NOT affect
 *  fight duration — they control ability/enemy weight. Upgrading R rescales
 *  everything proportionally; the fight clock stays at 8 min.
 *
 *  RLEF is a difficulty-pressure dial:
 *    Easy (0.3)  — more HP relative to a casual party
 *    Normal (0.5) — design baseline
 *    Hard (0.7)  — near-optimal play required
 *
 *  Roguelike upgrade note: players with full ability upgrades deal ~1.5× base
 *  DPS → kill Illidan in ~5 min. Unupgraded players are at 8 min, close to
 *  the 12-min enrage. Upgrades are the margin between a clean kill and a wipe.
 */

import { BASE_BOSS_DEFAULTS } from './BaseBossConfig.js'
import { BALANCE } from './BalanceConfig.js'

const R = BALANCE.RANGED_BASE_DPS
const X = BALANCE.ENEMY_HP_MULT
const Y = BALANCE.ENEMY_DAMAGE_MULT

export const ILLIDAN_PHASE = Object.freeze({
  HUNT:       'hunt',        // Phase 1 — sword form, full HP → 60%
  AZZINOTH:   'azzinoth',    // Phase 2 — airborne, immune, Flames of Azzinoth active
  HUNT_2:     'hunt_2',      // Phase 3 — sword form again, 60% → 30%
  DEMON_FORM: 'demon_form',  // Phase 4 — demon form grounded, 30% → death
})

const _huntAbilities = [
  {
    name:       'Flame Crash',
    cooldown:   6000,
    type:       'flameCrash',
    castTime:   1500,
    meleeOnly:  true,
    damage:     Math.round(0.25 * Y * R),       // 10 at defaults
    radius:     120,
    groundFire: { radius: 80, duration: 30000, tickDamage: Math.round(0.375 * Y * R), tickRate: 500 },
  },
  {
    name:          'Draw Soul',
    cooldown:      10000,
    type:          'drawSoul',
    damage:        Math.round(0.5 * Y * R),  // 20 at defaults
    coneAngle:     90,   // degrees
    coneRange:     200,
    healPerTarget: Math.round(7 * R),         // 70 at defaults
  },
  // {
  //   name:           'Shear',
  //   cooldown:       8000,
  //   type:           'shear',
  //   maxHpReduction: 0.2,  // reduces effective max HP by 20%
  //   duration:       3000,
  // },
  {
    name:          'Parasitic Shadowfiend',
    cooldown:      14000,
    type:          'parasiticShadowfiend',
    dotDamage:     Math.round(0.125 * Y * R),   // 5 at defaults
    dotInterval:   1000,
    dotDuration:   8000,
    spawnCount:    2,
    shadowfiendHp: Math.round(1.5 * X * R),      // 60 at defaults
  },
]

export const ILLIDAN_CONFIG = {
  ...BASE_BOSS_DEFAULTS,
  name:           'Illidan Stormrage',
  // maxHp:          Math.round(2116 * R * BALANCE.RLEF),
  maxHp:          Math.round(1200 * R * BALANCE.RLEF),
  speed:          1,
  // meleeDamage:    Math.round(0.5 * Y * R),      // 20 at defaults
  meleeDamage:    1,
  attackCooldown: 2000,
  attackRange:    80,

  spriteType:  'illidan',
  phaseModels: {
    [ILLIDAN_PHASE.HUNT]:       'illidan',
    [ILLIDAN_PHASE.AZZINOTH]:   'illidan',
    [ILLIDAN_PHASE.HUNT_2]:     'illidan',
    [ILLIDAN_PHASE.DEMON_FORM]: 'illidan_demon',
  },

  /**
   * Phase-keyed ability sets.
   * ServerBoss uses phaseAbilities[this.phase] instead of the flat abilities[].
   */
  phaseAbilities: {
    // ── Phase 1 & 3: sword form ───────────────────────────────────────────
    [ILLIDAN_PHASE.HUNT]:   _huntAbilities,
    [ILLIDAN_PHASE.HUNT_2]: _huntAbilities,

    // ── Phase 2: demon form airborne — immune, outside map ───────────────
    // Illidan hovers above the arena and bombards it until both
    // Flames of Azzinoth are destroyed.
    [ILLIDAN_PHASE.AZZINOTH]: [
      {
        name:         'Fireball',
        cooldown:     4000,
        type:         'fireball',
        damage:       Math.round(1.25 * Y * R),     // 50 at defaults
        splashRadius: 60,
      },
      {
        name:        'Dark Barrage',
        cooldown:    8000,
        type:        'darkBarrage',
        dotDamage:   Math.round(0.25 * Y * R),      // 10 at defaults
        dotInterval: 1000,
        dotDuration: 6000,
      },
      {
        name:         'Eye Beams',
        cooldown:     12000,
        type:         'eyeBeams',
        drawDuration: 2000,   // ms to draw the line across the arena
        lineLength:   420,
        groundFire:   { radius: 40, duration: 26000, tickDamage: Math.round(0.75 * Y * R), tickRate: 1000 },
        damage:       Math.round(1.5 * Y * R),     // 60 at defaults — tip-hit while drawing
      },
    ],

    // ── Phase 4: demon form grounded — activated when both adds die and HP ≤ 30% ──
    // Illidan is stationary. He stands and casts — speed is set to 0.
    [ILLIDAN_PHASE.DEMON_FORM]: [
      {
        name:         'Agonizing Flames',
        cooldown:     12000,
        type:         'agonizingFlames',
        damage:       Math.round(1.5 * Y * R),     // 60 at defaults
        splashRadius: 100,
        dotDamage:    Math.round(0.25 * Y * R),    // 10 at defaults
        dotInterval:  1000,
        dotDuration:  10000,
        dotRadius:    100,
      },
      {
        name:         'Shadow Blast',
        cooldown:     1000,
        type:         'shadowBlast',
        castTime:     2500,
        damage:       Math.round(1.5 * Y * R),        // 60 at defaults
        splashRadius: 80,
      },
      {
        name:     'Summon Shadow Demons',
        cooldown: 12000,
        type:     'summonShadowDemons',
        count:    2,
        hp:       Math.round(10 * X * R),              // 500 at defaults — tanky, requires focused fire
        speed:    0.6,                               // slow crawl — kill it before it reaches the player
      },
    ],
  },

  /**
   * Aura of Dread — passive, active in Phase 3 (demon form).
   * Applied every tickRate ms to all players within radius.
   */
  phase3Aura: { radius: 1000, damage: R, tickRate: 3000 },

  /**
   * Enrage — triggers if the fight exceeds enrageTimer ms.
   * Attack and cast cooldowns are divided by their respective multipliers,
   * forcing the encounter to resolve one way or another.
   */
  enrageTimer:           BALANCE.ILLIDAN_ENRAGE_MS,
  enrageAttackSpeedMult: BALANCE.ILLIDAN_ENRAGE_ATTACK_MULT,
  enrageCastSpeedMult:   BALANCE.ILLIDAN_ENRAGE_CAST_MULT,

  /**
   * HP-based phase thresholds (P1 → P2 only).
   * P3 (hunt_2) is triggered externally when both Flames of Azzinoth die.
   * P4 (demon_form) is triggered by IllidanEncounter when HP ≤ 30% in P3.
   */
  phases: [
    { threshold: 1.0,  speed: 1.5, name: ILLIDAN_PHASE.HUNT },
    { threshold: 0.60, speed: 0,   name: ILLIDAN_PHASE.AZZINOTH },
  ],

  /** Where Illidan teleports during Phase 2 — above the top edge. */
  phase2Position: { x: 720, y: -80 },

  /** Adds spawned when Phase 2 begins. */
  phase2Adds: [
    { type: 'flameOfAzzinoth', x: 480, y: 300 },
    { type: 'flameOfAzzinoth', x: 960, y: 300 },
  ],
}
