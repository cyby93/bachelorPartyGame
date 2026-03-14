/**
 * shared/BossConfig.js
 * Configuration for all boss encounters.
 */

export const BOSS_CONFIG = {
  ILLIDAN: {
    name:  'Illidan Stormrage',
    maxHp: 5000,
    speed: 1.5,
    abilities: [
      { name: 'Fel Beam',    cooldown: 3000, damage: 30, type: 'beam'   },
      { name: 'Flame Burst', cooldown: 5000, damage: 25, type: 'aoe', radius: 100 },
      { name: 'Shadow Dash', cooldown: 8000, damage: 40, type: 'charge' }
    ],
    // Phase thresholds: activated when HP drops BELOW the threshold percentage
    phases: [
      { threshold: 1.0, speed: 1.5 },   // Phase 1: full HP → 60%
      { threshold: 0.6, speed: 2.0 },   // Phase 2: 60% → 30%
      { threshold: 0.3, speed: 2.5 }    // Phase 3: 30% → dead (enraged)
    ]
  }
}
