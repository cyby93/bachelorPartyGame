/**
 * shared/SkillDatabase.js
 * Configuration database for all 32 abilities (8 classes × 4 skills).
 *
 * Fields:
 *   name        – display name
 *   type        – server-side effect handler: PROJECTILE | MELEE | AOE | DASH | BUFF | SHIELD | CAST
 *   subtype     – optional modifier for the handler (AOE_SELF, AOE_LOBBED, MULTI, BACKWARDS, TELEPORT, TOGGLE, TARGETED, CHANNELED)
 *   inputType   – controller interaction: INSTANT | DIRECTIONAL | TARGETED | SUSTAINED
 *                   INSTANT    = single tap, no direction needed
 *                   DIRECTIONAL= drag to aim direction, release to fire
 *                   TARGETED   = drag to aim a landing spot on the arena
 *                   SUSTAINED  = hold to maintain (e.g. shield direction)
 *   cooldown    – ms
 *   icon        – emoji shown on skill button
 */

const SkillDatabase = {

  // ── WARRIOR ──────────────────────────────────────────────────────────────
  Warrior: [
    {
      name:      'Cleave',
      type:      'MELEE',
      inputType: 'DIRECTIONAL',
      cooldown:  1000,
      damage:    50,
      range:     80,
      angle:     Math.PI / 3,   // 60° cone
      icon:      '⚔️'
    },
    {
      name:      'Thunder Clap',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  5000,
      damage:    40,
      radius:    150,
      effectType: 'DEBUFF',
      effectParams: { speedMultiplier: 0.5, duration: 2000 },
      icon:      '🌀'
    },
    {
      name:      'Charge',
      type:      'DASH',
      inputType: 'DIRECTIONAL',
      cooldown:  8000,
      speed:     800,
      distance:  300,
      effectType: 'DEBUFF',
      effectParams: { stunned: true, duration: 1000 },
      icon:      '💨'
    },
    {
      name:      'Shield Wall',
      type:      'BUFF',
      inputType: 'INSTANT',
      cooldown:  30000,
      duration:  5000,
      effectParams: { damageReduction: 0.9, arc: Math.PI * 2 },
      icon:      '🛡️'
    }
  ],

  // ── PALADIN ──────────────────────────────────────────────────────────────
  Paladin: [
    {
      name:      'Hammer Swing',
      type:      'MELEE',
      inputType: 'DIRECTIONAL',
      cooldown:  1200,
      damage:    45,
      range:     70,
      angle:     Math.PI / 4,   // 45° cone
      icon:      '🔨'
    },
    {
      name:      'Judgement',
      type:      'PROJECTILE',
      inputType: 'DIRECTIONAL',
      cooldown:  4000,
      damage:    60,
      speed:     400,
      radius:    15,
      range:     400,
      pierce:    false,
      icon:      '✨'
    },
    {
      name:      'Divine Shield',
      type:      'SHIELD',
      inputType: 'SUSTAINED',
      cooldown:  0,
      arc:       Math.PI / 2,   // 90° block arc
      duration:  3000,
      icon:      '🔆'
    },
    {
      name:      'Consecration',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  20000,
      damage:    15,
      radius:    200,
      duration:  5000,
      tickRate:  500,
      effectType: 'DUAL',
      healAmount: 10,
      icon:      '⭐'
    }
  ],

  // ── SHAMAN ───────────────────────────────────────────────────────────────
  Shaman: [
    {
      name:      'Lightning Bolt',
      type:      'PROJECTILE',
      inputType: 'DIRECTIONAL',
      cooldown:  800,
      damage:    35,
      speed:     600,
      radius:    10,
      range:     500,
      pierce:    false,
      icon:      '⚡'
    },
    {
      name:      'Chain Heal',
      type:      'PROJECTILE',
      subtype:   'TARGETED',
      inputType: 'DIRECTIONAL',
      cooldown:  3000,
      healAmount: 50,
      speed:     800,
      radius:    12,
      range:     400,
      pierce:    false,
      effectType: 'HEAL',
      icon:      '🌊'
    },
    {
      name:      'Ghost Wolf',
      type:      'BUFF',
      inputType: 'INSTANT',
      cooldown:  10000,
      duration:  3000,
      effectParams: { speedMultiplier: 1.5 },
      icon:      '🔥'
    },
    {
      name:      'Bloodlust',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  60000,
      radius:    500,
      duration:  8000,
      effectType: 'BUFF',
      effectParams: { speedMultiplier: 1.3, fireRateMultiplier: 1.3 },
      icon:      '⛈️'
    }
  ],

  // ── HUNTER ───────────────────────────────────────────────────────────────
  Hunter: [
    {
      name:      'Shoot Bow',
      type:      'PROJECTILE',
      inputType: 'DIRECTIONAL',
      cooldown:  600,
      damage:    30,
      speed:     700,
      radius:    8,
      range:     600,
      pierce:    false,
      icon:      '🏹'
    },
    {
      name:      'Multi-Shot',
      type:      'PROJECTILE',
      subtype:   'MULTI',
      inputType: 'DIRECTIONAL',
      cooldown:  4000,
      damage:    25,
      speed:     650,
      radius:    8,
      range:     500,
      pierce:    false,
      projectileCount: 6,
      spreadAngle: Math.PI / 2,
      icon:      '🎯'
    },
    {
      name:      'Disengage',
      type:      'DASH',
      subtype:   'BACKWARDS',
      inputType: 'DIRECTIONAL',
      cooldown:  8000,
      speed:     1000,
      distance:  250,
      icon:      '🐺'
    },
    {
      name:      'Explosive Trap',
      type:      'AOE',
      subtype:   'AOE_LOBBED',
      inputType: 'TARGETED',
      cooldown:  15000,
      damage:    80,
      radius:    120,
      speed:     500,
      range:     400,
      icon:      '🪤'
    }
  ],

  // ── PRIEST ───────────────────────────────────────────────────────────────
  Priest: [
    {
      name:      'Smite',
      type:      'PROJECTILE',
      inputType: 'DIRECTIONAL',
      cooldown:  1000,
      damage:    25,
      speed:     450,
      radius:    10,
      range:     450,
      pierce:    false,
      icon:      '✝️'
    },
    {
      name:      'Flash Heal',
      type:      'AOE',
      subtype:   'AOE_LOBBED',
      inputType: 'TARGETED',
      cooldown:  2500,
      healAmount: 60,
      radius:    80,
      speed:     600,
      range:     350,
      effectType: 'HEAL',
      icon:      '💚'
    },
    {
      name:      'Power Word: Shield',
      type:      'BUFF',
      subtype:   'TARGETED',
      inputType: 'DIRECTIONAL',
      cooldown:  8000,
      duration:  10000,
      effectParams: { shield: 100 },
      icon:      '🔮'
    },
    {
      name:      'Mass Resurrection',
      type:      'CAST',
      inputType: 'INSTANT',
      cooldown:  120000,
      castTime:  2000,
      payload: {
        type:       'AOE',
        subtype:    'AOE_SELF',
        radius:     300,
        effectType: 'REVIVE',
        healPercent: 0.5
      },
      icon:      '👼'
    }
  ],

  // ── MAGE ─────────────────────────────────────────────────────────────────
  Mage: [
    {
      name:      'Fireball',
      type:      'PROJECTILE',
      inputType: 'DIRECTIONAL',
      cooldown:  900,
      damage:    40,
      speed:     500,
      radius:    12,
      range:     550,
      pierce:    false,
      icon:      '🔥'
    },
    {
      name:      'Frost Nova',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  10000,
      radius:    180,
      effectType: 'DEBUFF',
      effectParams: { rooted: true, duration: 2000 },
      icon:      '❄️'
    },
    {
      name:      'Blink',
      type:      'DASH',
      subtype:   'TELEPORT',
      inputType: 'DIRECTIONAL',
      cooldown:  12000,
      distance:  150,
      icon:      '✨'
    },
    {
      name:      'Pyroblast',
      type:      'CAST',
      inputType: 'DIRECTIONAL',
      cooldown:  500,
      castTime:  1500,
      payload: {
        type:    'PROJECTILE',
        damage:  200,
        speed:   300,
        radius:  25,
        range:   600,
        pierce:  false,
        onImpact: {
          type:    'AOE',
          subtype: 'AOE_SELF',
          damage:  100,
          radius:  100
        }
      },
      icon:      '☄️'
    }
  ],

  // ── DRUID ─────────────────────────────────────────────────────────────────
  Druid: [
    {
      name:      'Wrath',
      type:      'PROJECTILE',
      inputType: 'DIRECTIONAL',
      cooldown:  1000,
      damage:    35,
      speed:     550,
      radius:    11,
      range:     500,
      pierce:    false,
      icon:      '🌿'
    },
    {
      name:      'Bear Form',
      type:      'BUFF',
      subtype:   'TOGGLE',
      inputType: 'INSTANT',
      cooldown:  1000,
      duration:  -1,
      effectParams: {
        armorBonus:        50,
        maxHpMultiplier:   1.5,
        transformSprite:   'bear',
        modifyS1: { type: 'MELEE', damage: 60, range: 60, angle: Math.PI / 4 }
      },
      icon:      '🐻'
    },
    {
      name:      'Cat Dash',
      type:      'DASH',
      inputType: 'DIRECTIONAL',
      cooldown:  6000,
      speed:     1200,
      distance:  200,
      icon:      '🍃'
    },
    {
      name:      'Tranquility',
      type:      'CAST',
      subtype:   'CHANNELED',
      inputType: 'INSTANT',
      cooldown:  500,
      castTime:  4000,
      payload: {
        type:       'AOE',
        subtype:    'AOE_SELF',
        radius:     250,
        effectType: 'HEAL',
        healAmount: 20,
        tickRate:   500,
        channeled:  true
      },
      icon:      '⭐'
    }
  ],

  // ── ROGUE ─────────────────────────────────────────────────────────────────
  Rogue: [
    {
      name:      'Sinister Strike',
      type:      'MELEE',
      inputType: 'DIRECTIONAL',
      cooldown:  800,
      damage:    70,
      range:     50,
      angle:     Math.PI / 6,   // 30° cone — very precise
      icon:      '🗡️'
    },
    {
      name:      'Fan of Knives',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  8000,
      damage:    30,
      projectileCount: 8,
      speed:     400,
      radius:    8,
      range:     200,
      pierce:    false,
      pattern:   'CIRCULAR',
      icon:      '👤'
    },
    {
      name:      'Sprint',
      type:      'BUFF',
      inputType: 'INSTANT',
      cooldown:  15000,
      duration:  3000,
      effectParams: { speedMultiplier: 2.0 },
      icon:      '☠️'
    },
    {
      name:      'Ambush',
      type:      'BUFF',
      subtype:   'STEALTH',
      inputType: 'INSTANT',
      cooldown:  30000,
      duration:  10000,
      effectParams: {
        invisible:        true,
        damageMultiplier: 3.0,
        opacity:          0.3,
        breaksOnAttack:   true
      },
      icon:      '💀'
    }
  ]
}

export default SkillDatabase
