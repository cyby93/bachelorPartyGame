/**
 * shared/IllidanConfig.js
 * Full encounter configuration for Illidan Stormrage (Level 5).
 *
 * Extracted here rather than into BossConfig.js to keep Illidan-specific
 * mechanics isolated from the generic boss entity.
 *
 * maxHp is the 1-player base. LevelConfig.js applies hpMult at runtime:
 *   hpMult = 1.0 + (playerCount - 1) × 0.10   → ×2.2 at 13 players
 *   Illidan HP (13p, Normal) = maxHp × 2.2 ≈ R × 11,638
 *
 * Tune RANGED_BASE_DPS (R) in BalanceConfig.js until the fight feels right.
 */

import { BALANCE } from './BalanceConfig.js'

export const ILLIDAN_CONFIG = {
  name:          'Illidan Stormrage',
  maxHp:         Math.round(1058 * BALANCE.RANGED_BASE_DPS * BALANCE.RLEF),
  speed:         0.1,
  radius:        20,
  meleeDamage:   80,
  attackCooldown: 3000,
  attackRange:   80,

  /**
   * Phase-keyed ability sets.
   * ServerBoss uses phaseAbilities[this.phase] instead of the flat abilities[].
   */
  phaseAbilities: {
    1: [
      // {
      //   name:      'Flame Crash',
      //   cooldown:  6000,
      //   type:      'flameCrash',
      //   castTime:  1500,
      //   damage:    80,
      //   radius:    120,
      //   groundFire: { radius: 80, duration: 30000, tickDamage: 15, tickRate: 500 },
      // },
      // {
      //   name:          'Draw Soul',
      //   cooldown:      2000,
      //   type:          'drawSoul',
      //   damage:        50,
      //   coneAngle:     90,   // degrees
      //   coneRange:     200,
      //   healPerTarget: 500,
      // },
      // {
      //   name:           'Shear',
      //   cooldown:       8000,
      //   type:           'shear',
      //   maxHpReduction: 0.9,  // reduces effective max HP by 60%
      //   duration:       3000,
      // },
      // {
      //   name:          'Parasitic Shadowfiend',
      //   cooldown:      6000,
      //   type:          'parasiticShadowfiend',
      //   dotDamage:     5,
      //   dotInterval:   2000,
      //   dotDuration:   3000,
      //   spawnCount:    2,
      //   shadowfiendHp: 460,
      // },
    ],

    2: [
      {
        name:         'Fireball',
        cooldown:     2000,
        type:         'fireball',
        damage:       100,
        splashRadius: 80,
      },
      // {
      //   name:        'Dark Barrage',
      //   cooldown:    12000,
      //   type:        'darkBarrage',
      //   dotDamage:   20,
      //   dotInterval: 1000,
      //   dotDuration: 10000,
      // },
      // {
      //   name:         'Eye Beams',
      //   cooldown:     12000,
      //   type:         'eyeBeams',
      //   drawDuration: 2000,   // ms to draw the line
      //   lineLength:   420,
      //   groundFire:   { radius: 30, duration: 26000, tickDamage: 30, tickRate: 1000 },
      //   damage:       60,     // damage per tip-hit while drawing
      // },
    ],

    3: [
      {
        name:         'Agonizing Flames',
        cooldown:     15000,
        type:         'agonizingFlames',
        damage:       100,
        splashRadius: 50,
        dotDamage:    30,
        dotInterval:  5000,
        dotDuration:  20000,
        dotRadius:    50,
      },
      {
        name:         'Shadow Blast',
        cooldown:     8000,
        type:         'shadowBlast',
        castTime:     2000,
        damage:       120,
        splashRadius: 80,
      },
      {
        name:    'Summon Shadow Demons',
        cooldown: 5000,
        type:    'summonShadowDemons',
        count:   4,
        hp:      800,
        speed:   0.6,
      },
    ],
  },

  /**
   * Aura of Dread — passive, active in Phase 3 (demon form).
   * Applied every tickRate ms to all players within radius.
   */
  phase3Aura: { radius: 120, damage: 10, tickRate: 3000 },

  /**
   * Enrage — triggers if the fight exceeds enrageTimer ms.
   * Attack and cast cooldowns are divided by their respective multipliers,
   * forcing the encounter to resolve one way or another.
   */
  enrageTimer:          BALANCE.ILLIDAN_ENRAGE_MS,
  enrageAttackSpeedMult: BALANCE.ILLIDAN_ENRAGE_ATTACK_MULT,
  enrageCastSpeedMult:   BALANCE.ILLIDAN_ENRAGE_CAST_MULT,

  /**
   * Phase thresholds. HP-based phases (1→2). Phase 2→3 is triggered externally
   * when both Flame of Azzinoth adds die.
   */
  phases: [
    { threshold: 1.0, speed: 1.5 },  // Phase 1: full HP → 60%
    { threshold: 0.95, speed: 0   },  // Phase 2: immune, outside map
  ],

  /** Where Illidan teleports during Phase 2 — above the top edge. */
  phase2Position: { x: 720, y: -80 },

  /** Adds spawned when Phase 2 begins. */
  phase2Adds: [
    { type: 'flameOfAzzinoth', x: 480, y: 300 },
    { type: 'flameOfAzzinoth', x: 960, y: 300 },
  ],
}
