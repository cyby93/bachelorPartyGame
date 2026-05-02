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
      icon:      '⚔️',
      iconFile:  'ability_warrior_cleave'
    },
    {
      name:      'Thunder Clap',
      type:      'AOE',
      subtype:   'AOE_SELF',
      inputType: 'INSTANT',
      cooldown:  3000,
      damage:    15,
      radius:    120,
      effectType: 'DEBUFF',
      effectParams: { speedMultiplier: 0.5, duration: 2000 },
      icon:      '🌀',
      iconFile:  'ability_thunderclap'
    },
    {
      name:      'Bladestorm',
      type:      'AOE',
      subtype:   'BLADESTORM',  // player-attached spinning AOE — follows caster, blocks other skills
      inputType: 'INSTANT',
      cooldown:  12000,
      damage:    6,             // damage per tick — tune via BalanceConfig
      radius:    80,           // slightly larger than Cleave range
      duration:  4000,          // 4 seconds of spinning
      tickRate:  300,           // hits every 300 ms
      effectType: 'DAMAGE',
      icon:      '🌀',
      iconFile:  'ability_warrior_bladestorm'
    },
    {
      name:      'Shield Wall',
      type:      'SHIELD',
      inputType: 'DIRECTIONAL',
      cooldown:  5000,
      arc:       Math.PI,        // 180° block arc
      icon:      '🛡️',
      iconFile:  'ability_defend'
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
      icon:      '🔨',
      iconFile:  'spell_paladin_hammerofwrath'
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
      icon:      '🛡️',
      iconFile:  'spell_holy_avengersshield'
    },
    {
      name:      'Divine Shield',
      type:      'SHIELD',
      inputType: 'DIRECTIONAL',
      cooldown:  3000,
      arc:       Math.PI / 3,   // 60° block arc
      icon:      '🔆',
      iconFile:  'spell_holy_divineshield'
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
      tickRate:  700,
      effectType: 'DUAL',
      healAmount: 3,
      icon:      '⭐',
      iconFile:  'spell_holy_innerfire'
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
        damage:  5,
        speed:   600,
        radius:  10,
        range:   500,
        pierce:  false,
      },
      icon:      '⚡',
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
      healAmount:      12,
      range:           400,
      maxChains:       2,
      chainRadius:     200,
      selfCastFallback: true,
      icon:            '🌊',
      iconFile:        'spell_nature_healingwavegreater'
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
        damage:   3,
        speed:    600,
        radius:   8,
        range:    300,
        tickRate: 1000,
      },
      icon:      '🔥',
      iconFile:  'spell_fire_searingtotem'
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
      icon:      '⛈️',
      iconFile:  'spell_nature_bloodlust'
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
      icon:      '🏹',
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
        damage:   45,           // greatly more than Shoot Bow (5)
        speed:    800,
        radius:   10,
        range:    1200,
        pierce:   false,
        onHitEffect: { speedMultiplier: 0.5, duration: 3000 },  // 50% slow for 3s
      },
      icon:      '🎯',
      iconFile:  'inv_spear_07'
    },
    {
      name:        'Call of the Wild',
      type:        'SPAWN',
      subtype:     'WILD_BEAST',  // randomly picks bear / hawk / panther at cast time
      inputType:   'INSTANT',
      cooldown:    2000,
      duration:    20000,
      damageBonus: 0,             // added to all beast variants' damage at spawn time
      // Beast variants — server picks one at random each cast
      beastVariants: [
        {
          beast:       'bear',
          hp:          120,
          speed:       1.6,
          radius:      22,
          damage:      8,
          attackRange: 50,
          attackRate:  1200,
          taunt:       true,     // forces nearby enemies to target this minion
          tauntRadius: 150,
        },
        {
          beast:       'hawk',
          hp:          Infinity, // invincible — cannot be targeted or damaged
          invincible:  true,
          speed:       3.5,
          radius:      10,
          damage:      3,
          attackRange: 300,
          attackRate:  400,
          ranged:      true,
        },
        {
          beast:       'panther',
          hp:          60,
          speed:       2.8,
          radius:      14,
          damage:      12,
          attackRange: 45,
          attackRate:  800,
        },
      ],
      icon:      '🐺',
      iconFile:  'ability_hunter_invigeration'
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
      icon:      '🪤',
      iconFile:  'spell_fire_selfdestruct'
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
      // damage:       10,
      // healAmount:   12,
      speed:        600,
      radius:       10,
      range:        600,
      pierce:       false,
      canHitAllies: true,
      selfCastFallback: true,
      spriteKey:    'projectile_penance',
      icon:         '✝️',
      iconFile:     'spell_holy_penance'
    },
    {
      name:       'Holy Nova',
      type:       'AOE',
      subtype:    'AOE_SELF',
      inputType:  'INSTANT',
      autoRefire: true,
      cooldown:   1000,
      radius:     200,
      damage:     400,
      healAmount: 600,
      // damage:     4,
      // healAmount: 6,
      effectType: 'DUAL',
      icon:       '💚',
      iconFile:   'spell_holy_holynova'
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
      effectParams:     { shield: 30 },
      icon:             '🔮',
      iconFile:         'spell_holy_powerwordshield'
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
      icon:      '👼',
      iconFile:  'spell_holy_resurrection'
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
        type:    'PROJECTILE',
        damage:  10,
        speed:   500,
        radius:  12,
        range:   550,
        pierce:  false,
      },
      icon:      '🔥',
      iconFile:  'spell_fire_firebolt'
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
      icon:      '❄️',
      iconFile:  'spell_frost_frostnova'
    },
    {
      name:      'Blink',
      type:      'DASH',
      subtype:   'TELEPORT',
      inputType: 'DIRECTIONAL',
      cooldown:  7000,
      distance:  250,
      icon:      '✨',
      iconFile:  'spell_arcane_blink'
    },
    {
      name:      'Pyroblast',
      type:      'CAST',
      castBar:   true,
      inputType: 'DIRECTIONAL',
      cooldown:  6000,
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
      icon:      '☄️',
      iconFile:  'spell_fire_fireball02'
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
      icon:      '☀',
      iconFile:  'spell_nature_wrathv2'
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
      icon:             '🌙',
      iconFile:         'spell_nature_starfall'
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
      healAmount:       13,
      hot: {
        healPerTick: 3,
        tickRate:    800,
        duration:    6000,
        sourceSkill: 'Regrowth',
      },
      selfCastFallback: true,
      icon:             '🌿',
      iconFile:         'spell_nature_resistnature'
    },
    {
      name:      'Tranquility',
      type:      'CHANNEL',
      subtype:   'UNTARGETED',
      inputType: 'INSTANT',
      cooldown:  13000,
      castTime:  4000,
      tickRate:  500,
      payload: {
        type:       'AOE',
        subtype:    'AOE_SELF',
        radius:     300,          // heal all players within 300px of caster each tick
        effectType: 'HEAL',
        healAmount: 15,
      },
      icon:      '⭐',
      iconFile:  'spell_nature_tranquility'
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
      range:          70,
      angle:          Math.PI / 3,   // 60° cone — very precise
      addsComboPoint: true,
      icon:           '🗡️',
      iconFile:       'spell_shadow_ritualofsacrifice'
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
      icon:     '👤',
      iconFile: 'ability_vanish'
    },
    {
      name:      'Sprint',
      type:      'BUFF',
      inputType: 'INSTANT',
      cooldown:  10000,
      duration:  5000,
      effectParams: { speedMultiplier: 2.0 },
      icon:      '☠️',
      iconFile:  'ability_rogue_sprint'
    },
    {
      name:        'Ambush',
      type:        'TARGETED',
      subtype:     'TELEPORT_BEHIND',
      inputType:   'TARGETED',
      cooldown:    7000,
      range:       350,
      damage:      60,
      comboDamage: 20,
      icon:        '💀',
      iconFile:    'ability_rogue_ambush'
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
        damage:  12,
        speed:   550,
        radius:  10,
        range:   600,
        pierce:  false,
      },
      icon:      '🔮',
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
      range:            600,
      damage:       2,
      dot: {
        damagePerTick: 5,
        tickRate:      700,
        duration:      7000,
        sourceSkill:   'Corruption',
      },
      selfCastFallback: false,
      icon:             '☠️',
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
      healPerTick:   4,
      icon:      '💜',
      iconFile:  'spell_shadow_lifedrain02'
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
      icon:      '😱',
      iconFile:  'spell_shadow_deathscream'
    }
  ],

  // ── DEATH KNIGHT ────────────────────────────────────────────────────────
  DeathKnight: [
    {
      name:      'Obliterate',
      type:      'MELEE',
      inputType: 'DIRECTIONAL',
      cooldown:  700,
      damage:    7,
      range:     70,
      angle:     Math.PI / 3,   // 60° cone
      effectParams: { speedMultiplier: 0.6, duration: 1500 },
      lifesteal: 1.0,           // 100% lifesteal — heals DK for full damage dealt
      icon:      '❄️',
      iconFile:  'spell_deathknight_classicon'
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
      icon:             '🪝',
      iconFile:         'spell_deathknight_strangulate'
    },
    {
      name:      'Death and Decay',
      type:      'AOE',
      subtype:   'AOE_ADJACENT',   // spawns adjacent to caster: edge touches caster, extends outward
      inputType: 'DIRECTIONAL',
      cooldown:  12000,
      damage:    4,
      radius:    120,
      duration:  7000,
      tickRate:  500,
      effectType: 'DAMAGE',
      icon:      '💀',
      iconFile:  'spell_shadow_deathanddecay'
    },
    {
      name:      'Anti-Magic Shell',
      type:      'BUFF',
      inputType: 'INSTANT',
      cooldown:  10000,
      duration:  7000,
      effectParams: { damageReduction: 0.8, shield: 60 },
      icon:      '💎',
      iconFile:  'spell_deathknight_iceboundfortitude'
    }
  ]
}

export default SkillDatabase
