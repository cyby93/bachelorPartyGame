/**
 * shared/SkillDatabase.js
 * Configuration database for all 32 abilities (8 classes × 4 skills).
 *
 * Fields:
 *   name        – display name
 *   type        – server-side effect handler: PROJECTILE | MELEE | AOE | DASH | BUFF | SHIELD | CAST | CHANNEL | TARGETED | SPAWN
 *   subtype     – optional modifier for the handler (AOE_SELF, AOE_ADJACENT, BLADESTORM, BURST, BEAM, UNTARGETED,
 *                   HEAL_ALLY, DAMAGE_ENEMY, TARGETED, TOTEM, TRAP, WILD_BEAST, STEALTH, TELEPORT, TELEPORT_BEHIND,
 *                   GRIP)
 *   inputType   – controller interaction: INSTANT | DIRECTIONAL | AIMED | TARGETED
 *                   INSTANT    = single tap, no direction needed
 *                   DIRECTIONAL= drag to aim direction, release to fire
 *                   AIMED      = drag to aim, then fire exactly once on release
 *                   TARGETED   = drag to aim a landing spot on the arena
 *   cooldown    – ms
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
      range:     70,
      angle:     Math.PI,   // 180° cone
      iconFile:  'ability_warrior_cleave'
    },
    {
      name:      'Thunder Clap',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  4000,
      damage:    15,
      radius:    120,
      effectType: 'DEBUFF',
      effectParams: { speedMultiplier: 0.3, duration: 3500 },
      iconFile:  'ability_thunderclap',
      dotColor:  0x4488ff,
    },
    {
      name:      'Bladestorm',
      type:      'AOE',
      subtype:   'BLADESTORM',  // player-attached spinning AOE — follows caster, blocks Shield Block only
      inputType: 'INSTANT',
      cooldown:  14000,
      damage:    8,             // damage per tick — tune via BalanceConfig
      radius:    70,           
      duration:  4000,          // 4 seconds of spinning
      tickRate:  500,           // hits every 400 ms
      effectType: 'DAMAGE',
      iconFile:  'ability_warrior_bladestorm',
      dotColor:  0xcc2200,
    },
    {
      name:                'Shield Block',
      type:                'SHIELD',
      inputType:           'DIRECTIONAL',
      cooldown:            3000,
      arc:                 Math.PI,  // 180° block arc
      shieldReduction:     0.65,     // base 65% reduction on overflow damage; upgradeable to 90%
      shieldAbsorbThreshold: 10,     // flat damage fully absorbed before reduction; upgradeable to 25
      chargeDuration:      2000,     // ms to hold before auto-latch is available
      duration:            2500,     // ms the shield stays active after charged release
      iconFile:            'ability_defend',
      dotColor:            0xcccccc,
    }
  ],

  // ── PALADIN ──────────────────────────────────────────────────────────────
  Paladin: [
    {
      name:      'Hammer of Light',
      type:      'MELEE',
      inputType: 'DIRECTIONAL',
      cooldown:  1000,
      damage:    7,
      range:     70,
      angle:     Math.PI  / 2,   // 90° cone
      iconFile:  'spell_paladin_hammerofwrath',
      holyStrikeProc: {
        procEvery: 4,
        heal:      24,
        range:     200,
      }
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
      spriteKey:   'projectile_avengers_shield',
      iconFile:  'spell_holy_avengersshield',
      dotColor:  0x88ccff,
    },
    {
      name:                'Divine Protection',
      type:                'SHIELD',
      inputType:           'DIRECTIONAL',
      cooldown:            3000,
      arc:                 Math.PI,  // 180° block arc
      shieldReduction:     0.65,     // base 65% reduction on overflow damage; upgradeable to 90%
      shieldAbsorbThreshold: 10,     // flat damage fully absorbed before reduction; upgradeable to 25
      chargeDuration:      2500,     // ms to hold before auto-latch is available
      duration:            2500,     // ms the shield stays active after charged release
      iconFile:            'spell_holy_divineprotection',
      dotColor:            0xffd700,
    },
    {
      name:      'Consecration',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  7000,
      damage:    4,
      healAmount: 5,
      radius:    100,
      duration:  6000,
      tickRate:  700,
      effectType: 'DUAL',
      iconFile:  'spell_holy_innerfire',
      dotColor:  0xffaa33,
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
        type:      'PROJECTILE',
        damage:    7,
        speed:     600,
        radius:    10,
        range:     500,
        pierce:    false,
        spriteKey: 'projectile_lightning_bolt',
      },
      iconFile:  'spell_nature_lightning'
    },
    {
      name:            'Chain Heal',
      type:            'TARGETED',
      castBar:          true,
      subtype:         'HEAL_ALLY',
      inputType:       'DIRECTIONAL',
      cooldown:        0,
      castTime:         1500,
      healAmount:      26,
      range:           400,
      maxChains:       2,
      chainRadius:     200,
      selfCastFallback: true,
      iconFile:        'spell_nature_healingwavegreater'
    },
    {
      name:      'Searing Totem',
      type:      'SPAWN',
      subtype:   'TOTEM',
      inputType: 'INSTANT',
      cooldown:  10000,
      duration:  12000,
      spriteKey: 'searing_totem',
      totemAbility: {
        name:      'Searing Totem',
        type:      'PROJECTILE',
        damage:    4,
        speed:     600,
        radius:    8,
        range:     600,
        tickRate:  1000,
        spriteKey: 'projectile_fireball',
      },
      iconFile:  'spell_fire_searingtotem',
      dotColor:  0xff6600,
    },
    {
      name:      'Bloodlust',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  17000,
      radius:    2500,
      duration:  7000,
      effectType: 'BUFF',
      effectParams: { speedMultiplier: 1.2, fireRateMultiplier: 1.5 },
      iconFile:  'spell_nature_bloodlust',
      dotColor:  0xff2200,
    }
  ],

  // ── HUNTER ───────────────────────────────────────────────────────────────
  Hunter: [
    {
      name:      'Shoot Bow',
      type:      'PROJECTILE',
      inputType: 'DIRECTIONAL',
      cooldown:  500,
      damage:    6,
      speed:     700,
      radius:    6,
      range:     800,
      pierce:    false,
      spriteKey: 'projectile_shoot_arrow',
      iconFile:  'ability_marksmanship'
    },
    {
      name:      'Aimed Shot',
      type:      'CAST',
      castBar:   true,
      inputType: 'DIRECTIONAL',
      cooldown:  4000,
      castTime:  1500,          // noticeable cast time
      payload: {
        type:     'PROJECTILE',
        damage:   40,           // greatly more than Shoot Bow (5)
        speed:    800,
        radius:   10,
        range:    1200,
        pierce:   false,
        onHitEffect: { speedMultiplier: 0.5, duration: 4000 },  // 50% slow for 3s
        spriteKey: 'projectile_aimed_shot',
      },
      iconFile:  'inv_spear_07',
      dotColor:  0x336600,
    },
    {
      name:        'Call of the Wild',
      type:        'SPAWN',
      subtype:     'WILD_BEAST',  // randomly picks bear / hawk / panther at cast time
      inputType:   'INSTANT',
      cooldown:    15000,
      duration:    15000,
      damageBonus: 0,             // added to all beast variants' damage at spawn time
      // Beast variants — server picks one at random each cast
      beastVariants: [
        {
          beast:       'bear',
          hp:          230,
          speed:       1.6,
          radius:      22,
          damage:      8,
          attackRange: 50,
          attackRate:  2000,
          taunt:       true,     // forces nearby enemies to target this minion
          tauntRadius: 150,
        },
        {
          beast:       'hawk',
          hp:          Infinity, // invincible — cannot be targeted or damaged
          invincible:  true,
          speed:       2.2,
          radius:      10,
          damage:      3,
          attackRange: 400,
          attackRate:  700,
          ranged:      true,
        },
        {
          beast:       'panther',
          hp:          60,
          speed:       2.2,
          radius:      14,
          damage:      7,
          attackRange: 45,
          attackRate:  800,
        },
      ],
      iconFile:  'ability_hunter_invigeration',
      dotColor:  0xaa6633,
    },
    {
      name:          'Freezing Trap',
      type:          'SPAWN',
      subtype:       'TRAP',
      inputType:     'INSTANT',
      cooldown:      8000,
      duration:      50000,
      triggerRadius: 100,
      spriteKey:     'trap_freezing',
      trapEffect: {
        radius:      120,
        zoneDuration: 6000,
        vfxColor:    '#00ccff',
        effectParams: {
          speedMultiplier: 0.5,
        },
      },
      iconFile:  'spell_frost_frostnova',
      dotColor:  0x00aaff,
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
      damage:       500,
      healAmount:   500,
      // damage:       12,
      // healAmount:   22,
      speed:        600,
      radius:       14,
      range:        600,
      pierce:       false,
      canHitAllies: true,
      selfCastFallback: true,
      spriteKey:    'projectile_penance',
      iconFile:     'spell_holy_penance',
      dotColor:     0xcc88ff,
    },
    {
      name:       'Holy Nova',
      type:       'AOE',
      subtype:    'AOE_SELF',
      inputType:  'INSTANT',
      autoRefire: true,
      cooldown:   1000,
      radius:     160,
      // damage:     400,
      // healAmount: 600,
      damage:     4,
      healAmount: 6,
      effectType: 'DUAL',
      iconFile:   'spell_holy_holynova'
    },
    {
      name:             'Power Word: Shield',
      type:             'BUFF',
      subtype:          'TARGETED',
      inputType:        'DIRECTIONAL',
      cooldown:         4000,
      duration:         7000,
      range:            600,
      selfCastFallback: true,
      effectParams:     { shield: 30 },
      iconFile:         'spell_holy_powerwordshield',
      dotColor:         0x4488ff,
    },
    {
      name:      'Mass Resurrection',
      type:      'CAST',
      inputType: 'INSTANT',
      castBar:   true,
      cooldown:  20000,
      castTime:  3000,
      payload: {
        type:       'AOE',
        subtype:    'AOE_SELF',
        radius:     3000,
        effectType: 'REVIVE',
        healPercent: 0.3
      },
      iconFile:  'spell_holy_resurrection',
      dotColor:  0xffffaa,
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
      castTime:  800,
      payload: {
        type:      'PROJECTILE',
        damage:    11,
        speed:     500,
        radius:    9,
        range:     550,
        pierce:    false,
        spriteKey: 'projectile_fireball',
      },
      iconFile:  'spell_fire_firebolt'
    },
    {
      name:      'Frost Nova',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  8000,
      radius:    180,
      effectType: 'DEBUFF',
      effectParams: { rooted: true, duration: 4000 },
      iconFile:  'spell_frost_frostnova',
      dotColor:  0x44eeff,
    },
    {
      name:      'Blink',
      type:      'DASH',
      subtype:   'TELEPORT',
      inputType: 'DIRECTIONAL',
      cooldown:  6000,
      distance:  200,
      iconFile:  'spell_arcane_blink',
      dotColor:  0xaa44ff,
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
        damage:  72,
        speed:   300,
        radius:  22,
        range:   600,
        pierce:    false,
        spriteKey: 'projectile_fireball',
        onImpact: {
          type:    'AOE',
          subtype: 'AOE_SELF',
          damage:  30,
          radius:  100
        }
      },
      iconFile:  'spell_fire_fireball02',
      dotColor:  0xff4400,
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
        type:      'PROJECTILE',
        damage:    4,
        speed:     550,
        radius:    11,
        range:     700,
        pierce:    false,
        spriteKey: 'projectile_wrath',
      },
      iconFile:  'spell_nature_wrathv2'
    },
    {
      name:             'Moonfire',
      type:             'TARGETED',
      subtype:          'DAMAGE_ENEMY',
      inputType:        'DIRECTIONAL',
      cooldown:         1000,
      range:            450,
      damage:           4,
      dot: {
        damagePerTick: 3,
        tickRate:      1000,
        duration:      6000,
        sourceSkill:   'Moonfire',
      },
      selfCastFallback: true,   // tap with no aim = closest enemy
      iconFile:         'spell_nature_starfall',
    },
    {
      name:             'Regrowth',
      type:             'TARGETED',
      castBar:          true,
      subtype:          'HEAL_ALLY',
      inputType:        'DIRECTIONAL',
      cooldown:         0,
      castTime:         1500,
      range:            600,
      healAmount:       12,
      hot: {
        healPerTick: 7,
        tickRate:    800,
        duration:    6000,
        sourceSkill: 'Regrowth',
      },
      selfCastFallback: true,
      iconFile:         'spell_nature_resistnature'
    },
    {
      name:      'Tranquility',
      type:      'CHANNEL',
      subtype:   'UNTARGETED',
      inputType: 'INSTANT',
      cooldown:  16000,
      castTime:  4000,
      tickRate:  500,
      payload: {
        type:       'AOE',
        subtype:    'AOE_SELF',
        radius:     300,
        effectType: 'HEAL',
        healAmount: 12,
      },
      iconFile:  'spell_nature_tranquility',
      dotColor:  0x44ff88,
    }
  ],

  // ── ROGUE ─────────────────────────────────────────────────────────────────
  Rogue: [
    {
      name:           'Sinister Strike',
      type:           'MELEE',
      inputType:      'DIRECTIONAL',
      cooldown:       500,
      damage:         7,
      range:          100,   // longer reach than cone peers — rewarded by precise aim
      width:          10,    // 40px each side; rectangular hitbox aligned to aim direction
      addsComboPoint: true,
      iconFile:       'spell_shadow_ritualofsacrifice'
    },
    {
      name:      'Vanish',
      type:      'BUFF',
      subtype:   'STEALTH',
      inputType: 'INSTANT',
      cooldown:  8000,
      duration:  4000,
      effectParams: {
        invisible:              true,
        opacity:                0.15,
        breaksOnAttack:         false,
        shadowStrikeMultiplier: 1.5,
        immunityDuration:       1500,
      },
      iconFile: 'ability_vanish',
      dotColor: 0x9966ff,
    },
    {
      name:      'Sprint',
      type:      'BUFF',
      inputType: 'INSTANT',
      cooldown:  7000,
      duration:  4000,
      effectParams: { speedMultiplier: 2.0 },
      iconFile:  'ability_rogue_sprint',
      dotColor:  0xffdd00,
    },
    {
      name:        'Ambush',
      type:        'TARGETED',
      subtype:     'TELEPORT_BEHIND',
      inputType:   'TARGETED',
      cooldown:    5000,
      range:       350,
      damage:      34,
      comboDamage: 14,
      iconFile:    'ability_rogue_ambush',
      dotColor:    0x660099,
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
        type:      'PROJECTILE',
        damage:    12,
        speed:     550,
        radius:    10,
        range:     700,
        pierce:    false,
        spriteKey: 'projectile_shadow_bolt',
      },
      iconFile:  'spell_shadow_shadowbolt'
    },
    {
      name:             'Corruption',
      type:             'TARGETED',
      castBar:          true,
      subtype:          'DAMAGE_ENEMY',
      inputType:        'DIRECTIONAL',
      cooldown:         0,
      castTime:         800,
      range:            700,
      damage:       2,
      dot: {
        damagePerTick: 6,
        tickRate:      700,
        duration:      7000,
        sourceSkill:   'Corruption',
      },
      selfCastFallback: false,
      iconFile:         'spell_shadow_abominationexplosion'
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
      healPerTick:   6,
      iconFile:  'spell_shadow_lifedrain02',
      dotColor:  0xcc44ff,
    },
    {
      name:      'Fear',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  12000,
      radius:    300,
      effectType: 'FEAR',
      fearDuration: 2500,
      iconFile:  'spell_shadow_deathscream',
      dotColor:  0x660066,
    }
  ],

  // ── DEATH KNIGHT ────────────────────────────────────────────────────────
  DeathKnight: [
    {
      name:      'Death Strike',
      type:      'MELEE',
      inputType: 'DIRECTIONAL',
      cooldown:  700,
      damage:    7,
      range:     70,
      angle:     Math.PI / 3,   // 60° cone
      effectParams: { speedMultiplier: 0.6, duration: 1500 },
      lifesteal: 0.8,           // 80% lifesteal
      iconFile:  'spell_deathknight_deathstrike'
    },
    {
      name:             'Death Grip',
      type:             'TARGETED',
      subtype:          'GRIP',
      inputType:        'TARGETED',
      selfCastFallback: true,
      cooldown:         5000,
      damage:           15,
      range:            350,
      effectType:       'GRIP',
      iconFile:         'spell_deathknight_strangulate',
      dotColor:         0x9900cc,
    },
    {
      name:      'Death and Decay',
      type:      'AOE',
      subtype:   'AOE_ADJACENT',   // spawns adjacent to caster: edge touches caster, extends outward
      inputType: 'DIRECTIONAL',
      cooldown:  10000,
      damage:    3,
      radius:    100,
      duration:  7000,
      tickRate:  500,
      effectType: 'DAMAGE',
      iconFile:  'spell_shadow_deathanddecay',
      dotColor:  0x66cc00,
    },
    {
      name:      'Icebound Fortitude',
      type:      'BUFF',
      inputType: 'INSTANT',
      cooldown:  10000,
      duration:  7000,
      effectParams: { damageReduction: 0.6, shield: 60 },
      iconFile:  'spell_deathknight_iceboundfortitude',
      dotColor:  0x00cccc,
    }
  ]
}

export default SkillDatabase
