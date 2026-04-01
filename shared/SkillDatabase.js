/**
 * shared/SkillDatabase.js
 * Configuration database for all 32 abilities (8 classes × 4 skills).
 *
 * Fields:
 *   name        – display name
 *   type        – server-side effect handler: PROJECTILE | MELEE | AOE | DASH | BUFF | SHIELD | CAST | CHANNEL | TARGETED | SPAWN
 *   subtype     – optional modifier for the handler (AOE_SELF, AOE_LOBBED, MULTI, BACKWARDS, TELEPORT, TOGGLE, TARGETED, CHANNELED,
 *                   BEAM, UNTARGETED, HEAL_ALLY, DAMAGE_ENEMY, TOTEM, TRAP, PET)
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
      cooldown:  3000,
      damage:    40,
      radius:    100,
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
      type:      'SHIELD',
      inputType: 'DIRECTIONAL',
      cooldown:  5000,
      arc:       Math.PI,        // 180° block arc
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
      name:      "Avenger's Shield",
      type:      'PROJECTILE',
      inputType: 'AIMED',
      cooldown:  4500,
      damage:    50,
      speed:     420,
      radius:    18,
      range:     500,
      pierce:    false,
      chain:     2,
      chainRange: 15000,
      onHitEffect: { speedMultiplier: 0.5, duration: 2000 },
      icon:      '🛡️'
    },
    {
      name:      'Divine Shield',
      type:      'SHIELD',
      inputType: 'DIRECTIONAL',
      cooldown:  3000,
      arc:       Math.PI / 2,   // 90° block arc
      icon:      '🔆'
    },
    {
      name:      'Consecration',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  10000,
      damage:    15,
      radius:    200,
      duration:  4000,
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
      type:      'CAST',
      castBar:   true,
      inputType: 'DIRECTIONAL',
      cooldown:  800,
      castTime:  600,
      payload: {
        type:    'PROJECTILE',
        damage:  35,
        speed:   600,
        radius:  10,
        range:   500,
        pierce:  false,
      },
      icon:      '⚡'
    },
    {
      name:            'Chain Heal',
      type:            'TARGETED',
      subtype:         'HEAL_ALLY',
      inputType:       'DIRECTIONAL',
      cooldown:        3000,
      healAmount:      50,
      range:           400,
      maxChains:       2,
      chainRadius:     200,
      selfCastFallback: true,
      icon:            '🌊'
    },
    {
      name:      'Searing Totem',
      type:      'SPAWN',
      subtype:   'TOTEM',
      inputType: 'INSTANT',
      cooldown:  10000,
      duration:  15000,
      totemAbility: {
        type:     'PROJECTILE',
        damage:   20,
        speed:    400,
        radius:   8,
        range:    250,
        tickRate: 1200,
      },
      icon:      '🔥'
    },
    {
      name:      'Bloodlust',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  30000,
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
      cooldown:  500,
      damage:    15,
      speed:     700,
      radius:    8,
      range:     1000,
      pierce:    false,
      icon:      '🏹'
    },
    {
      name:      'Multi-Shot',
      type:      'PROJECTILE',
      subtype:   'MULTI',
      inputType: 'DIRECTIONAL',
      cooldown:  3000,
      damage:    25,
      speed:     650,
      radius:    6,
      range:     800,
      pierce:    false,
      projectileCount: 10,
      spreadAngle: Math.PI / 3,
      icon:      '🎯'
    },
    {
      name:      'Call of the Wild',
      type:      'SPAWN',
      subtype:   'PET',
      inputType: 'INSTANT',
      cooldown:  20000,
      duration:  20000,
      petStats: {
        hp:          80,
        speed:       2.0,
        damage:      25,
        attackRange: 45,
        attackRate:  1000,
      },
      icon:      '🐺'
    },
    {
      name:      'Explosive Trap',
      type:      'SPAWN',
      subtype:   'TRAP',
      inputType: 'INSTANT',
      cooldown:  15000,
      duration:  30000,
      triggerRadius: 40,
      trapEffect: {
        type:       'AOE',
        damage:     80,
        radius:     120,
        effectType: 'DAMAGE',
      },
      icon:      '🪤'
    }
  ],

  // ── PRIEST ───────────────────────────────────────────────────────────────
  Priest: [
    {
      name:         'Penance',
      type:         'PROJECTILE',
      subtype:      'BURST',
      inputType:    'AIMED',
      cooldown:     4000,
      damage:       30,
      healAmount:   40,
      speed:        500,
      radius:       10,
      range:        450,
      canHitAllies: true,
      icon:         '✝️'
    },
    {
      name:       'Holy Nova',
      type:       'AOE',
      subtype:    'AOE_SELF',
      inputType:  'INSTANT',
      autoRefire: true,
      cooldown:   1000,
      radius:     120,
      damage:     20,
      healAmount: 25,
      effectType: 'DUAL',
      icon:       '💚'
    },
    {
      name:             'Power Word: Shield',
      type:             'BUFF',
      subtype:          'TARGETED',
      inputType:        'DIRECTIONAL',
      cooldown:         8000,
      duration:         10000,
      range:            400,
      selfCastFallback: true,
      effectParams:     { shield: 100 },
      icon:             '🔮'
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
      type:      'CAST',
      castBar:   true,
      inputType: 'DIRECTIONAL',
      cooldown:  900,
      castTime:  800,
      payload: {
        type:    'PROJECTILE',
        damage:  40,
        speed:   500,
        radius:  12,
        range:   550,
        pierce:  false,
      },
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
      castBar:   true,
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
      type:      'CAST',
      castBar:   true,
      inputType: 'DIRECTIONAL',
      cooldown:  1000,
      castTime:  700,
      payload: {
        type:    'PROJECTILE',
        damage:  35,
        speed:   550,
        radius:  11,
        range:   500,
        pierce:  false,
      },
      icon:      '🌿'
    },
    {
      name:             'Moonfire',
      type:             'TARGETED',
      subtype:          'DAMAGE_ENEMY',
      inputType:        'DIRECTIONAL',
      cooldown:         500,
      range:            450,
      damage:           25,
      dot: {
        damagePerTick: 12,
        tickRate:      1000,
        duration:      6000,
        sourceSkill:   'Moonfire',
      },
      selfCastFallback: true,   // tap with no aim = closest enemy
      icon:             '🌙'
    },
    {
      name:             'Regrowth',
      type:             'TARGETED',
      castBar:          true,
      subtype:          'HEAL_ALLY',
      inputType:        'DIRECTIONAL',
      cooldown:         500,
      castTime:         1200,
      range:            600,
      healAmount:       40,
      hot: {
        healPerTick: 15,
        tickRate:    1000,
        duration:    5000,
        sourceSkill: 'Regrowth',
      },
      selfCastFallback: true,
      icon:             '🌿'
    },
    {
      name:      'Tranquility',
      type:      'CHANNEL',
      subtype:   'UNTARGETED',
      inputType: 'INSTANT',
      cooldown:  500,
      castTime:  4000,
      tickRate:  500,
      payload: {
        type:       'AOE',
        subtype:    'AOE_SELF',
        radius:     250,
        effectType: 'HEAL',
        healAmount: 20,
      },
      icon:      '⭐'
    }
  ],

  // ── ROGUE ─────────────────────────────────────────────────────────────────
  Rogue: [
    {
      name:           'Sinister Strike',
      type:           'MELEE',
      inputType:      'DIRECTIONAL',
      cooldown:       800,
      damage:         70,
      range:          50,
      angle:          Math.PI / 6,   // 30° cone — very precise
      addsComboPoint: true,
      icon:           '🗡️'
    },
    {
      name:      'Vanish',
      type:      'BUFF',
      subtype:   'STEALTH',
      inputType: 'INSTANT',
      cooldown:  20000,
      duration:  8000,
      effectParams: {
        invisible:              true,
        opacity:                0.15,
        breaksOnAttack:         true,
        shadowStrikeMultiplier: 1.5,
      },
      icon: '👤'
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
      name:        'Ambush',
      type:        'TARGETED',
      subtype:     'TELEPORT_BEHIND',
      inputType:   'TARGETED',
      cooldown:    8000,
      range:       350,
      damage:      80,
      comboDamage: 40,
      icon:        '💀'
    }
  ],

  // ── WARLOCK ─────────────────────────────────────────────────────────────
  Warlock: [
    {
      name:      'Shadow Bolt',
      type:      'CAST',
      castBar:   true,
      inputType: 'DIRECTIONAL',
      cooldown:  500,
      castTime:  700,
      payload: {
        type:    'PROJECTILE',
        damage:  35,
        speed:   550,
        radius:  10,
        range:   500,
        pierce:  false,
      },
      icon:      '🔮'
    },
    {
      name:             'Corruption',
      type:             'TARGETED',
      castBar:          true,
      subtype:          'DAMAGE_ENEMY',
      inputType:        'DIRECTIONAL',
      cooldown:         500,
      castTime:         1200,
      range:            600,
      damage:       10,
      dot: {
        damagePerTick: 15,
        tickRate:      1000,
        duration:      7000,
        sourceSkill:   'Corruption',
      },
      selfCastFallback: false,
      icon:             '☠️'
    },
    {
      name:      'Drain Life',
      type:      'CHANNEL',
      subtype:   'BEAM',
      inputType: 'DIRECTIONAL',
      cooldown:  500,
      castTime:  3000,
      range:     1000,
      tickRate:  500,
      damagePerTick: 15,
      healPerTick:   15,
      icon:      '💜'
    },
    {
      name:      'Fear',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  20000,
      radius:    150,
      effectType: 'FEAR',
      fearDuration: 2500,
      icon:      '😱'
    }
  ],

  // ── DEATH KNIGHT ────────────────────────────────────────────────────────
  DeathKnight: [
    {
      name:      'Frost Strike',
      type:      'MELEE',
      inputType: 'DIRECTIONAL',
      cooldown:  1000,
      damage:    65,
      range:     50,
      angle:     Math.PI / 3,   // 60° cone
      effectParams: { speedMultiplier: 0.6, duration: 1500 },
      icon:      '❄️'
    },
    {
      name:      'Death Grip',
      type:      'PROJECTILE',
      subtype:   'GRIP',
      inputType: 'DIRECTIONAL',
      cooldown:  10000,
      damage:    0,
      speed:     800,
      radius:    12,
      range:     350,
      pierce:    false,
      effectType: 'GRIP',
      icon:      '🪝'
    },
    {
      name:      'Death and Decay',
      type:      'AOE',
      subtype:   'AOE_LOBBED',
      inputType: 'TARGETED',
      cooldown:  15000,
      damage:    20,
      radius:    120,
      speed:     500,
      range:     300,
      duration:  5000,
      tickRate:  500,
      effectType: 'DAMAGE',
      icon:      '💀'
    },
    {
      name:      'Anti-Magic Shell',
      type:      'BUFF',
      inputType: 'INSTANT',
      cooldown:  25000,
      duration:  5000,
      effectParams: { damageReduction: 0.8, shield: 100 },
      icon:      '💎'
    }
  ]
}

export default SkillDatabase
