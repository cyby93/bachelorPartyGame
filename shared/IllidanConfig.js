/**
 * shared/IllidanConfig.js
 * Full encounter configuration for Illidan Stormrage (Level 5).
 *
 * Extracted here rather than into BossConfig.js to keep Illidan-specific
 * mechanics isolated from the generic boss entity.
 */

export const ILLIDAN_CONFIG = {
  name:          'Illidan Stormrage',
  maxHp:         8000,
  speed:         1.5,
  radius:        50,
  meleeDamage:   35,
  attackCooldown: 1500,
  attackRange:   80,

  /**
   * Phase-keyed ability sets.
   * ServerBoss uses phaseAbilities[this.phase] instead of the flat abilities[].
   */
  phaseAbilities: {
    1: [
      {
        name:      'Flame Crash',
        cooldown:  12000,
        type:      'flameCrash',
        damage:    80,
        radius:    120,
        groundFire: { radius: 90, duration: 12000, tickDamage: 15, tickRate: 1000 },
      },
      {
        name:          'Draw Soul',
        cooldown:      10000,
        type:          'drawSoul',
        damage:        50,
        coneAngle:     90,   // degrees
        coneRange:     200,
        healPerTarget: 500,
      },
      {
        name:           'Shear',
        cooldown:       8000,
        type:           'shear',
        maxHpReduction: 0.6,  // reduces effective max HP by 60%
        duration:       5000,
      },
      {
        name:        'Parasitic Shadowfiend',
        cooldown:    18000,
        type:        'parasiticShadowfiend',
        dotDamage:   30,
        dotInterval: 2000,
        dotDuration: 10000,
        spawnCount:  2,
      },
    ],

    2: [
      {
        name:         'Fireball',
        cooldown:     8000,
        type:         'fireball',
        damage:       100,
        splashRadius: 80,
      },
      {
        name:        'Dark Barrage',
        cooldown:    12000,
        type:        'darkBarrage',
        dotDamage:   20,
        dotInterval: 1000,
        dotDuration: 10000,
      },
      {
        name:         'Eye Beams',
        cooldown:     22000,
        type:         'eyeBeams',
        drawDuration: 3500,   // ms to draw the line
        lineLength:   420,
        groundFire:   { radius: 30, duration: 10000, tickDamage: 30, tickRate: 1000 },
        damage:       60,     // damage per tip-hit while drawing
      },
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
        cooldown:     5000,
        type:         'shadowBlast',
        damage:       120,
        splashRadius: 80,
      },
      {
        name:    'Summon Shadow Demons',
        cooldown: 30000,
        type:    'summonShadowDemons',
        count:   4,
      },
    ],
  },

  /**
   * Aura of Dread — passive, active in Phase 3 (demon form).
   * Applied every tickRate ms to all players within radius.
   */
  phase3Aura: { radius: 120, damage: 10, tickRate: 3000 },

  /**
   * Phase thresholds. HP-based phases (1→2). Phase 2→3 is triggered externally
   * when both Flame of Azzinoth adds die.
   */
  phases: [
    { threshold: 1.0, speed: 1.5 },  // Phase 1: full HP → 60%
    { threshold: 0.6, speed: 0   },  // Phase 2: immune, outside map
  ],

  /** Where Illidan teleports during Phase 2 — above the top edge. */
  phase2Position: { x: 720, y: -80 },

  /** Adds spawned when Phase 2 begins. */
  phase2Adds: [
    { type: 'flameOfAzzinoth', x: 480, y: 300 },
    { type: 'flameOfAzzinoth', x: 960, y: 300 },
  ],
}
