/**
 * shared/IllidanConfig.js
 * Full encounter configuration for Illidan Stormrage (Level 5).
 *
 * Extracted here rather than into BossConfig.js to keep Illidan-specific
 * mechanics isolated from the generic boss entity.
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

import { BALANCE } from './BalanceConfig.js'

const R = BALANCE.RANGED_BASE_DPS
const X = BALANCE.ENEMY_HP_MULT
const Y = BALANCE.ENEMY_DAMAGE_MULT

export const ILLIDAN_CONFIG = {
  name:           'Illidan Stormrage',
  maxHp:          Math.round(2116 * R * BALANCE.RLEF),
  speed:          0.1,
  radius:         20,
  meleeDamage:    Math.round(2 * Y * R),      // 80 at defaults
  attackCooldown: 3000,
  attackRange:    80,

  /**
   * Phase-keyed ability sets.
   * ServerBoss uses phaseAbilities[this.phase] instead of the flat abilities[].
   */
  phaseAbilities: {
    // ── Phase 1: sword form — full HP down to 60% ────────────────────────
    1: [
      {
        name:       'Flame Crash',
        cooldown:   6000,
        type:       'flameCrash',
        castTime:   1500,
        damage:     Math.round(2 * Y * R),       // 80 at defaults
        radius:     120,
        groundFire: { radius: 80, duration: 30000, tickDamage: Math.round(0.375 * Y * R), tickRate: 500 },
      },
      {
        name:          'Draw Soul',
        cooldown:      8000,
        type:          'drawSoul',
        damage:        Math.round(1.25 * Y * R),  // 50 at defaults
        coneAngle:     90,   // degrees
        coneRange:     200,
        healPerTarget: Math.round(10 * R),         // 100 at defaults
      },
      {
        name:           'Shear',
        cooldown:       8000,
        type:           'shear',
        maxHpReduction: 0.6,  // reduces effective max HP by 60%
        duration:       3000,
      },
      {
        name:          'Parasitic Shadowfiend',
        cooldown:      12000,
        type:          'parasiticShadowfiend',
        dotDamage:     Math.round(0.125 * Y * R),   // 5 at defaults
        dotInterval:   1000,
        dotDuration:   8000,
        spawnCount:    2,
        shadowfiendHp: Math.round(2 * X * R),      // 100 at defaults
      },
    ],

    // ── Phase 2: demon form airborne — immune, outside map ───────────────
    // Illidan hovers above the arena and bombards it until both
    // Flames of Azzinoth are destroyed.
    2: [
      {
        name:         'Fireball',
        cooldown:     4000,
        type:         'fireball',
        damage:       Math.round(2.5 * Y * R),     // 100 at defaults
        splashRadius: 80,
      },
      {
        name:        'Dark Barrage',
        cooldown:    8000,
        type:        'darkBarrage',
        dotDamage:   Math.round(0.5 * Y * R),      // 20 at defaults
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

    // ── Phase 3: demon form grounded — activated when both adds die ──────
    // Illidan is stationary. He stands and casts — speed is set to 0 by GameServer.
    3: [
      {
        name:         'Agonizing Flames',
        cooldown:     12000,
        type:         'agonizingFlames',
        damage:       Math.round(2.5 * Y * R),     // 100 at defaults
        splashRadius: 100,
        dotDamage:    Math.round(0.25 * Y * R),    // 10 at defaults
        dotInterval:  1000,
        dotDuration:  10000,
        dotRadius:    100,
      },
      {
        name:         'Shadow Blast',
        cooldown:     2500,
        type:         'shadowBlast',
        castTime:     2500,
        damage:       Math.round(2 * Y * R),        // 80 at defaults
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
   * Phase thresholds. HP-based phases (1→2). Phase 2→3 is triggered externally
   * when both Flame of Azzinoth adds die.
   */
  phases: [
    { threshold: 1.0,  speed: 1.5 },  // Phase 1: full HP → 60%
    { threshold: 0.60, speed: 0   },  // Phase 2: immune, teleports above the arena
  ],

  /** Where Illidan teleports during Phase 2 — above the top edge. */
  phase2Position: { x: 720, y: -80 },

  /** Adds spawned when Phase 2 begins. */
  phase2Adds: [
    { type: 'flameOfAzzinoth', x: 480, y: 300 },
    { type: 'flameOfAzzinoth', x: 960, y: 300 },
  ],
}
