/**
 * shared/SkillDatabase.js
 * Configuration database for all 32 abilities (8 classes × 4 skills).
 *
 * Fields:
 *   name        – display name
 *   type        – server-side effect handler: PROJECTILE | MELEE | AOE | DASH | BUFF | SHIELD | CAST | CHANNEL | TARGETED | SPAWN
 *   subtype     – optional modifier for the handler (AOE_SELF, AOE_LOBBED, MULTI, BACKWARDS, TELEPORT, TOGGLE, TARGETED, CHANNELED,
 *                   BEAM, UNTARGETED, HEAL_ALLY, DAMAGE_ENEMY, TOTEM, TRAP, PET)
 *   inputType   – controller interaction: INSTANT | DIRECTIONAL | AIMED | TARGETED | SUSTAINED
 *                   INSTANT    = single tap, no direction needed
 *                   DIRECTIONAL= drag to aim direction, release to fire
 *                   AIMED      = drag to aim, then fire exactly once on release
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
      damage:    8,
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
      damage:    15,
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
      damage:    10,
      range:     70,
      angle:     Math.PI / 3,   // 60° cone
      icon:      '🔨'
    },
    {
      name:      "Avenger's Shield",
      type:      'PROJECTILE',
      inputType: 'AIMED',
      cooldown:  7000,
      damage:    40,
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
      arc:       Math.PI / 3,   // 60° block arc
      icon:      '🔆'
    },
    {
      name:      'Consecration',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  7000,
      damage:    3,
      radius:    100,
      duration:  6000,
      tickRate:  500,
      effectType: 'DUAL',
      healAmount: 2,
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
      cooldown:  0,
      castTime:  1000,
      payload: {
        type:    'PROJECTILE',
        damage:  7,
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
      castBar:          true,
      subtype:         'HEAL_ALLY',
      inputType:       'DIRECTIONAL',
      cooldown:        0,
      castTime:         1500,
      healAmount:      15,
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
      duration:  12000,
      totemAbility: {
        type:     'PROJECTILE',
        damage:   4,
        speed:    400,
        radius:   8,
        range:    250,
        tickRate: 1000,
      },
      icon:      '🔥'
    },
    {
      name:      'Bloodlust',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  30000,
      radius:    2500,
      duration:  10000,
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
      damage:    5,
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
      cooldown:  5000,
      damage:    10,
      speed:     650,
      radius:    6,
      range:     1000,
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
        damage:      5,
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
      cooldown:  8000,
      duration:  50000,
      triggerRadius: 40,
      trapEffect: {
        type:       'AOE',
        damage:     25,
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
      cooldown:     3000,
      damage:       6,
      healAmount:   10,
      speed:        500,
      radius:       10,
      range:        600,
      pierce:       false,
      canHitAllies: true,
      selfCastFallback: true,
      icon:         '✝️'
    },
    {
      name:       'Holy Nova',
      type:       'AOE',
      subtype:    'AOE_SELF',
      inputType:  'INSTANT',
      autoRefire: true,
      cooldown:   1000,
      radius:     320,
      damage:     3,
      healAmount: 3,
      effectType: 'DUAL',
      icon:       '💚'
    },
    {
      name:             'Power Word: Shield',
      type:             'BUFF',
      subtype:          'TARGETED',
      inputType:        'DIRECTIONAL',
      cooldown:         5000,
      duration:         7000,
      range:            600,
      selfCastFallback: true,
      effectParams:     { shield: 25 },
      icon:             '🔮'
    },
    {
      name:      'Mass Resurrection',
      type:      'CAST',
      inputType: 'INSTANT',
      cooldown:  15000,
      castTime:  2000,
      payload: {
        type:       'AOE',
        subtype:    'AOE_SELF',
        radius:     3000,
        effectType: 'REVIVE',
        healPercent: 0.3
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
      cooldown:  0,
      castTime:  1000,
      payload: {
        type:    'PROJECTILE',
        damage:  10,
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
      cooldown:  7000,
      distance:  250,
      icon:      '✨'
    },
    {
      name:      'Pyroblast',
      type:      'CAST',
      castBar:   true,
      inputType: 'DIRECTIONAL',
      cooldown:  7000,
      castTime:  2000,
      payload: {
        type:    'PROJECTILE',
        damage:  90,
        speed:   300,
        radius:  20,
        range:   600,
        pierce:  false,
        onImpact: {
          type:    'AOE',
          subtype: 'AOE_SELF',
          damage:  30,
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
      cooldown:  0,
      castTime:  800,
      payload: {
        type:    'PROJECTILE',
        damage:  3,
        speed:   550,
        radius:  11,
        range:   700,
        pierce:  false,
      },
      icon:      '☀'
    },
    {
      name:             'Moonfire',
      type:             'TARGETED',
      subtype:          'DAMAGE_ENEMY',
      inputType:        'DIRECTIONAL',
      cooldown:         1000,
      range:            450,
      damage:           3,
      dot: {
        damagePerTick: 3,
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
      cooldown:         1000,
      castTime:         1500,
      range:            600,
      healAmount:       15,
      hot: {
        healPerTick: 4,
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
      cooldown:  15000,
      castTime:  4000,
      tickRate:  500,
      payload: {
        type:       'AOE',
        subtype:    'AOE_SELF',
        radius:     700,
        effectType: 'HEAL',
        healAmount: 6,
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
      cooldown:       500,
      damage:         5,
      range:          70,
      angle:          Math.PI / 3,   // 60° cone — very precise
      addsComboPoint: true,
      icon:           '🗡️'
    },
    {
      name:      'Vanish',
      type:      'BUFF',
      subtype:   'STEALTH',
      inputType: 'INSTANT',
      cooldown:  5000,
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
      cooldown:  10000,
      duration:  5000,
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
      damage:      60,
      comboDamage: 15,
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
      cooldown:  0,
      castTime:  1000,
      payload: {
        type:    'PROJECTILE',
        damage:  9,
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
      cooldown:         0,
      castTime:         1000,
      range:            600,
      damage:       2,
      dot: {
        damagePerTick: 5,
        tickRate:      700,
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
      cooldown:  6000,
      castTime:  3000,
      range:     1000,
      tickRate:  500,
      damagePerTick: 4,
      healPerTick:   4,
      icon:      '💜'
    },
    {
      name:      'Fear',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  15000,
      radius:    250,
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
      cooldown:  700,
      damage:    7,
      range:     70,
      angle:     Math.PI / 3,   // 60° cone
      effectParams: { speedMultiplier: 0.6, duration: 1500 },
      icon:      '❄️'
    },
    {
      name:             'Death Grip',
      type:             'TARGETED',
      subtype:          'GRIP',
      inputType:        'TARGETED',
      selfCastFallback: true,
      cooldown:         6000,
      damage:           10,
      range:            350,
      effectType:       'GRIP',
      icon:             '🪝'
    },
    {
      name:      'Death and Decay',
      type:      'AOE',
      subtype:   'AOE_LOBBED',
      inputType: 'TARGETED',
      cooldown:  12000,
      damage:    4,
      radius:    120,
      speed:     500,
      range:     300,
      duration:  7000,
      tickRate:  500,
      effectType: 'DAMAGE',
      icon:      '💀'
    },
    {
      name:      'Anti-Magic Shell',
      type:      'BUFF',
      inputType: 'INSTANT',
      cooldown:  12000,
      duration:  7000,
      effectParams: { damageReduction: 0.8, shield: 50 },
      icon:      '💎'
    }
  ]
}

export default SkillDatabase
