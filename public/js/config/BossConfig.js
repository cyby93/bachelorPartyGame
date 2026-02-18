/**
 * BossConfig.js
 * 
 * Boss configuration and abilities
 */

export const BOSS_CONFIG = {
  ILLIDAN: {
    name: 'Illidan Stormrage',
    maxHp: 5000,
    speed: 1.5,
    abilities: [
      { name: 'Fel Beam', cooldown: 3000, damage: 30, type: 'beam' },
      { name: 'Flame Burst', cooldown: 5000, damage: 25, type: 'aoe', radius: 100 },
      { name: 'Shadow Dash', cooldown: 8000, damage: 40, type: 'charge' }
    ],
    phases: [
      { threshold: 1.0, speed: 1.5 },
      { threshold: 0.6, speed: 2.0 },
      { threshold: 0.3, speed: 2.5 }
    ]
  }
};

// Export for CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BOSS_CONFIG };
}
