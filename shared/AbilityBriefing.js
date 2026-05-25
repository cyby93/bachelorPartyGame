/**
 * shared/AbilityBriefing.js
 * Per-ability display copy for the lobby briefing screen.
 *
 * ABILITY_LABEL  — the gesture label shown prominently (e.g. "Tap", "Aim and hold")
 * ABILITY_HINT   — one-line behavioural hint shown below the label
 * ABILITY_DETAIL — full 1-2 sentence description of what the ability does
 *
 * Keys match the `name` field in SkillDatabase.
 */

export const ABILITY_LABEL = {
  // Warrior
  'Cleave':                'Aim and hold',
  'Thunder Clap':          'Tap',
  'Bladestorm':            'Tap',
  'Shield Block':          'Hold to charge',

  // Paladin
  'Hammer Swing':          'Aim and hold',
  "Avenger's Shield":      'Aim and release',
  'Divine Protection':     'Hold to charge',
  'Consecration':          'Tap',

  // Shaman
  'Lightning Bolt':        'Aim and hold',
  'Chain Heal':            'Aim and hold',
  'Searing Totem':         'Tap',
  'Bloodlust':             'Tap',

  // Hunter
  'Shoot Bow':             'Aim and hold',
  'Aimed Shot':            'Aim and hold',
  'Call of the Wild':      'Tap',
  'Freezing Trap':         'Tap',

  // Priest
  'Penance':               'Aim and release',
  'Holy Nova':             'Tap',
  'Power Word: Shield':    'Aim and release',
  'Mass Resurrection':     'Tap',

  // Mage
  'Fireball':              'Aim and hold',
  'Frost Nova':            'Tap',
  'Blink':                 'Aim and release',
  'Pyroblast':             'Aim and hold',

  // Druid
  'Wrath':                 'Aim and hold',
  'Moonfire':              'Aim and release',
  'Regrowth':              'Aim and hold',
  'Tranquility':           'Tap',

  // Rogue
  'Sinister Strike':       'Aim and hold',
  'Vanish':                'Tap',
  'Sprint':                'Tap',
  'Ambush':                'Aim and release',

  // Warlock
  'Shadow Bolt':           'Aim and hold',
  'Corruption':            'Aim and hold',
  'Drain Life':            'Aim and release',
  'Fear':                  'Tap',

  // Death Knight
  'Death Strike':          'Aim and hold',
  'Death Grip':            'Aim and release',
  'Death and Decay':       'Aim and release',
  'Icebound Fortitude':    'Tap',
}

export const ABILITY_DETAIL = {
  // Warrior
  'Cleave':
    'Deals melee damage to all enemies in a 180° arc in front of you.',
  'Thunder Clap':
    'Deals damage to all enemies within 120 units and slows them by 50% for 2 seconds.',
  'Bladestorm':
    'Spins for 4 seconds, dealing damage to all enemies in melee range. Other skills are unavailable while active.',
  'Shield Block':
    'Aim and hold to raise a 180° steel shield that blocks 65% of incoming damage. Hold for 2s to fully charge it — releasing a charged shield keeps it active hands-free for 2.5s.',

  // Paladin
  'Hammer Swing':
    'A focused melee strike in a 90° arc.',
  "Avenger's Shield":
    'Hurls a holy shield that bounces between up to 3 targets, slowing each on hit.',
  'Divine Protection':
    'Aim and hold to raise a 180° divine shield that blocks 65% of incoming damage. Hold for 2.5s to fully charge it — releasing a charged shield keeps it active hands-free for 2.5s.',
  'Consecration':
    'Consecrates the ground beneath you for 6 seconds, dealing damage to enemies and healing allies who stand in it.',

  // Shaman
  'Lightning Bolt':
    'Channels for 1 second and fires a lightning bolt in the aimed direction.',
  'Chain Heal':
    'Heals the nearest ally in the aimed direction and bounces to 2 more nearby allies.',
  'Searing Totem':
    'Places a fire totem at your feet that fires fireballs at nearby enemies for 12 seconds.',
  'Bloodlust':
    'Increases movement speed and attack rate of every player by 30% for 7 seconds.',

  // Hunter
  'Shoot Bow':
    'Fires an arrow in the aimed direction.',
  'Aimed Shot':
    'Deals high damage and slows the target by 50% for 4 seconds.',
  'Call of the Wild':
    'Summons a random companion for 20 seconds — bear (melee tank), hawk (invincible ranged), or panther (fast melee).',
  'Freezing Trap':
    'Drops a trap that creates a freezing area slowing all enemies by 50% for 6 seconds when triggered.',

  // Priest
  'Penance':
    'A burst of holy energy that damages enemies or heals allies it hits.',
  'Holy Nova':
    'Deals damage to all nearby enemies and heals all nearby allies simultaneously.',
  'Power Word: Shield':
    'Applies a 30-HP absorb shield to the nearest ally for 7 seconds. If no ally is nearby, shields yourself.',
  'Mass Resurrection':
    'Channels for 3 seconds and revives all fallen players at 30% health.',

  // Mage
  'Fireball':
    'Channels and fires a fireball in the aimed direction.',
  'Frost Nova':
    'Roots all nearby enemies in place for 2 seconds.',
  'Blink':
    'Teleports you 250 units in the aimed direction.',
  'Pyroblast':
    'A massive fireball that deals heavy damage on impact plus a secondary explosion in the surrounding area.',

  // Druid
  'Wrath':
    'Channels nature energy and fires a projectile in the aimed direction.',
  'Moonfire':
    'Deals instant damage and applies a damage-over-time effect to the target for 6 seconds.',
  'Regrowth':
    'Heals the nearest ally in range and applies a heal-over-time for 6 seconds.',
  'Tranquility':
    'Channels for 4 seconds, healing all allies within 300 units every 0.5 seconds.',

  // Rogue
  'Sinister Strike':
    'A melee strike that generates a combo point on hit.',
  'Vanish':
    'Turns you invisible for 5 seconds. Your next attack while invisible deals 50% bonus damage.',
  'Sprint':
    'Doubles your movement speed for 4 seconds.',
  'Ambush':
    'Teleports you behind a target and deals heavy damage. Deals bonus damage with a combo point active.',

  // Warlock
  'Shadow Bolt':
    'Channels and fires a shadow bolt in the aimed direction.',
  'Corruption':
    'Curses the nearest enemy in range, dealing damage every 0.7 seconds for 7 seconds.',
  'Drain Life':
    'Channels a life-draining beam for up to 3 seconds, damaging the target and healing you with each tick.',
  'Fear':
    'Causes all nearby enemies to flee in panic for 2.5 seconds.',

  // Death Knight
  'Death Strike':
    'A melee strike that slows hit enemies and restores 80% of the damage dealt as health.',
  'Death Grip':
    'Pulls a target enemy to your location and deals damage.',
  'Death and Decay':
    'Creates a decaying zone that deals damage every 0.5 seconds to enemies standing in it for 7 seconds.',
  'Icebound Fortitude':
    'Absorbs 60 HP of incoming damage and reduces all damage taken by 60% for 7 seconds.',
}
