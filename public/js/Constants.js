// Game Constants and Configuration
export const GAME_CONFIG = {
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 768,
  TARGET_FPS: 60,
  PLAYER_COLLISION_RADIUS: 20,
  BOSS_COLLISION_RADIUS: 60,
  REVIVE_TIME: 3000,
  REVIVE_DISTANCE: 80
};

export const CLASSES = {
  WARRIOR: {
    name: 'Warrior',
    color: '#3498db',
    hp: 150,
    speed: 2.5,
    skills: [
      { name: 'Slash', cooldown: 1000, type: 'melee', damage: 15, range: 60, icon: '⚔️' },
      { name: 'Charge', cooldown: 5000, type: 'dash', damage: 25, range: 200, icon: '💨' },
      { name: 'Shield Block', cooldown: 8000, type: 'defense', duration: 3000, icon: '🛡️' },
      { name: 'Whirlwind', cooldown: 12000, type: 'aoe', damage: 30, radius: 100, icon: '🌀' }
    ]
  },
  PALADIN: {
    name: 'Paladin',
    color: '#f39c12',
    hp: 140,
    speed: 2.3,
    skills: [
      { name: 'Hammer', cooldown: 1200, type: 'melee', damage: 18, range: 55, icon: '🔨' },
      { name: 'Holy Light', cooldown: 6000, type: 'heal', amount: 40, range: 150, icon: '✨' },
      { name: 'Divine Shield', cooldown: 15000, type: 'defense', duration: 5000, icon: '🔆' },
      { name: 'Consecration', cooldown: 10000, type: 'aoe', damage: 20, radius: 120, icon: '⭐' }
    ]
  },
  SHAMAN: {
    name: 'Shaman',
    color: '#9b59b6',
    hp: 110,
    speed: 2.6,
    skills: [
      { name: 'Lightning Bolt', cooldown: 800, type: 'projectile', damage: 20, speed: 8, icon: '⚡' },
      { name: 'Healing Wave', cooldown: 5000, type: 'heal', amount: 35, range: 200, icon: '🌊' },
      { name: 'Bloodlust', cooldown: 20000, type: 'buff', duration: 8000, icon: '🔥' },
      { name: 'Chain Lightning', cooldown: 8000, type: 'projectile', damage: 35, speed: 7, icon: '⛈️' }
    ]
  },
  HUNTER: {
    name: 'Hunter',
    color: '#27ae60',
    hp: 100,
    speed: 3.0,
    skills: [
      { name: 'Shoot', cooldown: 600, type: 'projectile', damage: 15, speed: 10, icon: '🏹' },
      { name: 'Trap', cooldown: 8000, type: 'aoe', damage: 25, radius: 60, icon: '🪤' },
      { name: 'Pet Attack', cooldown: 10000, type: 'projectile', damage: 40, speed: 6, icon: '🐺' },
      { name: 'Multi-Shot', cooldown: 7000, type: 'projectile', damage: 20, speed: 9, icon: '🎯' }
    ]
  },
  PRIEST: {
    name: 'Priest',
    color: '#ecf0f1',
    hp: 90,
    speed: 2.4,
    skills: [
      { name: 'Smite', cooldown: 1000, type: 'projectile', damage: 12, speed: 7, icon: '✝️' },
      { name: 'Heal', cooldown: 4000, type: 'heal', amount: 50, range: 180, icon: '💚' },
      { name: 'Shield', cooldown: 6000, type: 'defense', amount: 40, duration: 5000, icon: '🔮' },
      { name: 'Mass Resurrect', cooldown: 30000, type: 'revive', range: 300, icon: '👼' }
    ]
  },
  MAGE: {
    name: 'Mage',
    color: '#e74c3c',
    hp: 85,
    speed: 2.5,
    skills: [
      { name: 'Fireball', cooldown: 900, type: 'projectile', damage: 25, speed: 6, icon: '🔥' },
      { name: 'Blink', cooldown: 8000, type: 'teleport', range: 150, icon: '✨' },
      { name: 'Frost Nova', cooldown: 10000, type: 'aoe', damage: 15, radius: 100, icon: '❄️' },
      { name: 'Pyroblast', cooldown: 15000, type: 'projectile', damage: 80, speed: 4, icon: '☄️' }
    ]
  },
  DRUID: {
    name: 'Druid',
    color: '#16a085',
    hp: 120,
    speed: 2.7,
    skills: [
      { name: 'Wrath', cooldown: 1000, type: 'projectile', damage: 14, speed: 7, icon: '🌿' },
      { name: 'Bear Form', cooldown: 12000, type: 'buff', duration: 8000, icon: '🐻' },
      { name: 'Rejuvenation', cooldown: 5000, type: 'heal', amount: 30, range: 150, icon: '🍃' },
      { name: 'Starfall', cooldown: 18000, type: 'aoe', damage: 40, radius: 150, icon: '⭐' }
    ]
  },
  ROGUE: {
    name: 'Rogue',
    color: '#34495e',
    hp: 95,
    speed: 3.2,
    skills: [
      { name: 'Backstab', cooldown: 800, type: 'melee', damage: 20, range: 50, icon: '🗡️' },
      { name: 'Stealth', cooldown: 15000, type: 'buff', duration: 5000, icon: '👤' },
      { name: 'Poison', cooldown: 6000, type: 'projectile', damage: 15, speed: 8, icon: '☠️' },
      { name: 'Eviscerate', cooldown: 10000, type: 'melee', damage: 60, range: 50, icon: '💀' }
    ]
  }
};

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

export const INPUT_CONFIG = {
  TAP_THRESHOLD: 150,
  DEADZONE: 0.2,
  JOYSTICK_SIZE: 100
};
