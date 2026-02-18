/**
 * SkillDatabase.js
 * 
 * Configuration database for all 32 abilities (8 classes × 4 skills)
 * Each skill is defined with its archetype, parameters, and effects
 */

const SkillDatabase = {
  'Warrior': [
    { // S1: Cleave
      name: 'Cleave',
      type: 'MELEE',
      cooldown: 1000,
      damage: 50,
      range: 80,
      angle: Math.PI / 3,  // 60 degrees cone
      icon: '⚔️'
    },
    { // S2: Thunder Clap
      name: 'Thunder Clap',
      type: 'AOE',
      subtype: 'AOE_SELF',
      cooldown: 5000,
      damage: 40,
      radius: 150,
      effectType: 'DEBUFF',
      effectParams: { 
        speedMultiplier: 0.5, 
        duration: 2000 
      },
      icon: '🌀'
    },
    { // S3: Charge
      name: 'Charge',
      type: 'DASH',
      cooldown: 8000,
      speed: 800,
      distance: 300,
      effectType: 'DEBUFF',
      effectParams: { 
        stunned: true, 
        duration: 1000 
      },
      icon: '💨'
    },
    { // S4: Shield Wall
      name: 'Shield Wall',
      type: 'BUFF',
      cooldown: 30000,
      duration: 5000,
      effectParams: { 
        damageReduction: 0.9, 
        arc: Math.PI * 2  // 360 degrees protection
      },
        icon: '🛡️'
    }
  ],

  'Paladin': [
    { // S1: Hammer Swing
      name: 'Hammer Swing',
      type: 'MELEE',
      cooldown: 1200,
      damage: 45,
      range: 70,
      angle: Math.PI / 4,  // 45 degrees cone
      icon: '🔨'
    },
    { // S2: Judgement
      name: 'Judgement',
      type: 'PROJECTILE',
      cooldown: 4000,
      damage: 60,
      speed: 400,
      radius: 15,
      range: 400,
      pierce: false,
      icon: '✨'
    },
    { // S3: Divine Shield
      name: 'Divine Shield',
      type: 'SHIELD',
      cooldown: 0,
      arc: Math.PI / 2,  // 90 degrees
      duration: 3000,
      icon: '🔆'
    },
    { // S4: Consecration
      name: 'Consecration',
      type: 'AOE',
      subtype: 'AOE_SELF',
      cooldown: 20000,
      damage: 15,  // Damage per tick
      radius: 200,
      duration: 5000,
      tickRate: 500,  // Damage/heal every 0.5s
      effectType: 'DUAL',  // Damages enemies, heals allies
      healAmount: 10,
      icon: '⭐'
    }
  ],

  'Shaman': [
    { // S1: Lightning Bolt
      name: 'Lightning Bolt',
      type: 'PROJECTILE',
      cooldown: 800,
      damage: 35,
      speed: 600,
      radius: 10,
      range: 500,
      pierce: false,
      icon: '⚡'
    },
    { // S2: Chain Heal
      name: 'Chain Heal',
      type: 'PROJECTILE',
      subtype: 'TARGETED',
      cooldown: 3000,
      healAmount: 50,
      speed: 800,
      radius: 12,
      range: 400,
      pierce: false,
      effectType: 'HEAL',
      icon: '🌊'
    },
    { // S3: Ghost Wolf
      name: 'Ghost Wolf',
      type: 'BUFF',
      cooldown: 10000,
      duration: 3000,
      effectParams: {
        speedMultiplier: 1.5  // +50% speed
      },
      icon: '🔥'
    },
    { // S4: Bloodlust
      name: 'Bloodlust',
      type: 'AOE',
      subtype: 'AOE_SELF',
      cooldown: 60000,
      radius: 500,  // Global range
      duration: 8000,
      effectType: 'BUFF',
      effectParams: {
        speedMultiplier: 1.3,  // +30% speed
        fireRateMultiplier: 1.3  // +30% fire rate
      },
      icon: '⛈️'
    }
  ],

  'Hunter': [
    { // S1: Shoot Bow
      name: 'Shoot Bow',
      type: 'PROJECTILE',
      cooldown: 600,
      damage: 30,
      speed: 700,
      radius: 8,
      range: 600,
      pierce: false,
      icon: '🏹'
    },
    { // S2: Multi-Shot
      name: 'Multi-Shot',
      type: 'PROJECTILE',
      subtype: 'MULTI',
      cooldown: 4000,
      damage: 25,
      speed: 650,
      radius: 8,
      range: 500,
      pierce: false,
      projectileCount: 6,
      spreadAngle: Math.PI / 2,  // 30 degrees total spread
      icon: '🎯'
    },
    { // S3: Disengage
      name: 'Disengage',
      type: 'DASH',
      subtype: 'BACKWARDS',
      cooldown: 8000,
      speed: 1000,
      distance: 250,
      icon: '🐺'
    },
    { // S4: Explosive Trap
      name: 'Explosive Trap',
      type: 'AOE',
      subtype: 'AOE_LOBBED',
      cooldown: 15000,
      damage: 80,
      radius: 120,
      speed: 500,
      range: 400,
      triggerType: 'ENEMY_TOUCH',
      icon: '🪤'
    }
  ],

  'Priest': [
    { // S1: Smite
      name: 'Smite',
      type: 'PROJECTILE',
      cooldown: 1000,
      damage: 25,
      speed: 450,
      radius: 10,
      range: 450,
      pierce: false,
      icon: '✝️'
    },
    { // S2: Flash Heal
      name: 'Flash Heal',
      type: 'AOE',
      subtype: 'AOE_LOBBED',
      cooldown: 2500,
      healAmount: 60,
      radius: 80,
      speed: 600,
      range: 350,
      effectType: 'HEAL',
      icon: '💚'
    },
    { // S3: Power Word: Shield
      name: 'Power Word: Shield',
      type: 'BUFF',
      subtype: 'TARGETED',
      cooldown: 8000,
      duration: 10000,
      effectParams: {
        shield: 100  // Temporary HP
      },
      icon: '🔮'
    },
    { // S4: Mass Resurrection
      name: 'Mass Resurrection',
      type: 'CAST',
      cooldown: 120000,
      castTime: 2000,
      payload: {
        type: 'AOE',
        subtype: 'AOE_SELF',
        radius: 300,
        effectType: 'REVIVE',
        healPercent: 0.5  // Revive with 50% HP
      },
      icon: '👼'
    }
  ],

  'Mage': [
    { // S1: Fireball
      name: 'Fireball',
      type: 'PROJECTILE',
      cooldown: 900,
      damage: 40,
      speed: 500,
      radius: 12,
      range: 550,
      pierce: false,
      icon: '🔥'
    },
    { // S2: Frost Nova
      name: 'Frost Nova',
      type: 'AOE',
      subtype: 'AOE_SELF',
      cooldown: 10000,
      radius: 180,
      effectType: 'DEBUFF',
      effectParams: {
        rooted: true,  // Movement speed = 0
        duration: 2000
      },
      icon: '❄️'
    },
    { // S3: Blink
      name: 'Blink',
      type: 'DASH',
      subtype: 'TELEPORT',
      cooldown: 12000,
      distance: 150,
      icon: '✨'
    },
    { // S4: Pyroblast
      name: 'Pyroblast',
      type: 'CAST',
      cooldown: 20000,
      castTime: 1500,
      payload: {
        type: 'PROJECTILE',
        damage: 200,
        speed: 300,
        radius: 25,
        range: 600,
        pierce: false,
        onImpact: {
          type: 'AOE',
          subtype: 'AOE_SELF',
          damage: 100,
          radius: 100
        }
      },
      icon: '☄️'
    }
  ],

  'Druid': [
    { // S1: Wrath
      name: 'Wrath',
      type: 'PROJECTILE',
      cooldown: 1000,
      damage: 35,
      speed: 550,
      radius: 11,
      range: 500,
      pierce: false,
      icon: '🌿'
    },
    { // S2: Bear Form
      name: 'Bear Form',
      type: 'BUFF',
      subtype: 'TOGGLE',
      cooldown: 1000,
      duration: -1,  // Toggle, no duration
      effectParams: {
        armorBonus: 50,
        maxHpMultiplier: 1.5,
        transformSprite: 'bear',
        modifyS1: {
          type: 'MELEE',
          damage: 60,
          range: 60,
          angle: Math.PI / 4
        }
      },
      icon: '🐻'
    },
    { // S3: Cat Dash
      name: 'Cat Dash',
      type: 'DASH',
      cooldown: 6000,
      speed: 1200,
      distance: 200,
      icon: '🍃'
    },
    { // S4: Tranquility
      name: 'Tranquility',
      type: 'CAST',
      subtype: 'CHANNELED',
      cooldown: 90000,
      castTime: 4000,
      payload: {
        type: 'AOE',
        subtype: 'AOE_SELF',
        radius: 250,
        effectType: 'HEAL',
        healAmount: 20,
        tickRate: 500,  // Heal every 0.5s
        channeled: true
      },
      icon: '⭐'
    }
  ],

  'Rogue': [
    { // S1: Sinister Strike
      name: 'Sinister Strike',
      type: 'MELEE',
      cooldown: 800,
      damage: 70,
      range: 50,  // Very short range
      angle: Math.PI / 6,  // 30 degrees cone
      icon: '🗡️'
    },
    { // S2: Fan of Knives
      name: 'Fan of Knives',
      type: 'AOE',
      subtype: 'AOE_SELF',
      cooldown: 8000,
      damage: 30,
      projectileCount: 8,
      speed: 400,
      radius: 8,
      range: 200,
      pierce: false,
      pattern: 'CIRCULAR',  // 8 knives in circle
      icon: '👤'
    },
    { // S3: Sprint
      name: 'Sprint',
      type: 'BUFF',
      cooldown: 15000,
      duration: 3000,
      effectParams: {
        speedMultiplier: 2.0  // +100% speed
      },
      icon: '☠️'
    },
    { // S4: Ambush
      name: 'Ambush',
      type: 'BUFF',
      subtype: 'STEALTH',
      cooldown: 30000,
      duration: 10000,
      effectParams: {
        invisible: true,
        damageMultiplier: 3.0,  // Next attack 3x damage
        opacity: 0.3,  // Semi-transparent
        breaksOnAttack: true
      },
      icon: '💀'
    }
  ]
};

// Export for ES6 modules
export default SkillDatabase;

// Export for CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SkillDatabase;
}

// Also expose globally for browser (for backward compatibility)
if (typeof window !== 'undefined') {
  window.SkillDatabase = SkillDatabase;
}
