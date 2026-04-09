/**
 * shared/UpgradeConfig.js
 * Defines upgrade tiers for every skill (10 classes × 4 skills × 3 tiers).
 *
 * Each tier is { label, deltas } where deltas is a map of dot-paths → additive values.
 * Negative values reduce the stat (e.g. cooldown: -100 reduces cooldown by 100ms).
 */

export const UPGRADE_CONFIG = {

  // ── WARRIOR ──────────────────────────────────────────────────────────────
  Warrior: [
    // S0: Cleave (MELEE) — damage 50, range 80, cooldown 1000
    [
      { label: 'Cleave +1', deltas: { damage: 10, cooldown: -100 } },
      { label: 'Cleave +2', deltas: { damage: 15, range: 10 } },
      { label: 'Cleave +3', deltas: { damage: 20, cooldown: -100 } },
    ],
    // S1: Thunder Clap (AOE) — damage 40, radius 100, cooldown 3000
    [
      { label: 'Thunder Clap +1', deltas: { damage: 10, radius: 15 } },
      { label: 'Thunder Clap +2', deltas: { damage: 10, 'effectParams.duration': 500 } },
      { label: 'Thunder Clap +3', deltas: { damage: 15, cooldown: -500 } },
    ],
    // S2: Charge (DASH) — distance 300, cooldown 8000
    [
      { label: 'Charge +1', deltas: { distance: 50, cooldown: -500 } },
      { label: 'Charge +2', deltas: { 'effectParams.duration': 500, cooldown: -500 } },
      { label: 'Charge +3', deltas: { distance: 50, cooldown: -1000 } },
    ],
    // S3: Shield Wall (SHIELD) — arc PI, cooldown 5000
    [
      { label: 'Shield Wall +1', deltas: { cooldown: -500 } },
      { label: 'Shield Wall +2', deltas: { arc: 0.3 } },
      { label: 'Shield Wall +3', deltas: { cooldown: -500, arc: 0.3 } },
    ],
  ],

  // ── PALADIN ──────────────────────────────────────────────────────────────
  Paladin: [
    // S0: Hammer Swing (MELEE) — damage 45, range 70, cooldown 1200
    [
      { label: 'Hammer Swing +1', deltas: { damage: 10, cooldown: -100 } },
      { label: 'Hammer Swing +2', deltas: { damage: 10, range: 10 } },
      { label: 'Hammer Swing +3', deltas: { damage: 15, cooldown: -200 } },
    ],
    // S1: Avenger's Shield (PROJECTILE) — damage 50, cooldown 4500
    [
      { label: "Avenger's Shield +1", deltas: { damage: 15, cooldown: -500 } },
      { label: "Avenger's Shield +2", deltas: { damage: 15, chain: 1 } },
      { label: "Avenger's Shield +3", deltas: { damage: 20, cooldown: -500 } },
    ],
    // S2: Divine Shield (SHIELD) — arc PI/2, cooldown 3000
    [
      { label: 'Divine Shield +1', deltas: { cooldown: -300 } },
      { label: 'Divine Shield +2', deltas: { arc: 0.3 } },
      { label: 'Divine Shield +3', deltas: { cooldown: -400, arc: 0.3 } },
    ],
    // S3: Consecration (AOE) — damage 15, healAmount 10, radius 200, cooldown 10000
    [
      { label: 'Consecration +1', deltas: { damage: 5, healAmount: 5, cooldown: -1000 } },
      { label: 'Consecration +2', deltas: { radius: 30, duration: 1000 } },
      { label: 'Consecration +3', deltas: { damage: 10, healAmount: 10, cooldown: -1000 } },
    ],
  ],

  // ── SHAMAN ───────────────────────────────────────────────────────────────
  Shaman: [
    // S0: Lightning Bolt (CAST) — payload.damage 35, cooldown 800, castTime 600
    [
      { label: 'Lightning Bolt +1', deltas: { 'payload.damage': 10, cooldown: -50 } },
      { label: 'Lightning Bolt +2', deltas: { 'payload.damage': 10, castTime: -50 } },
      { label: 'Lightning Bolt +3', deltas: { 'payload.damage': 15, cooldown: -100 } },
    ],
    // S1: Chain Heal (TARGETED) — healAmount 50, cooldown 3000, castTime 1200
    [
      { label: 'Chain Heal +1', deltas: { healAmount: 15, cooldown: -200 } },
      { label: 'Chain Heal +2', deltas: { healAmount: 15, maxChains: 1 } },
      { label: 'Chain Heal +3', deltas: { healAmount: 20, castTime: -200 } },
    ],
    // S2: Searing Totem (SPAWN/TOTEM) — totemAbility.damage 20, cooldown 10000
    [
      { label: 'Searing Totem +1', deltas: { 'totemAbility.damage': 5, cooldown: -1000 } },
      { label: 'Searing Totem +2', deltas: { 'totemAbility.damage': 5, 'totemAbility.tickRate': -200 } },
      { label: 'Searing Totem +3', deltas: { duration: 5000, 'totemAbility.damage': 10 } },
    ],
    // S3: Bloodlust (AOE/BUFF) — cooldown 30000, duration 8000
    [
      { label: 'Bloodlust +1', deltas: { duration: 2000, cooldown: -3000 } },
      { label: 'Bloodlust +2', deltas: { 'effectParams.speedMultiplier': 0.1, 'effectParams.fireRateMultiplier': 0.1 } },
      { label: 'Bloodlust +3', deltas: { duration: 2000, cooldown: -3000 } },
    ],
  ],

  // ── HUNTER ───────────────────────────────────────────────────────────────
  Hunter: [
    // S0: Shoot Bow (PROJECTILE) — damage 15, cooldown 500
    [
      { label: 'Shoot Bow +1', deltas: { damage: 5, cooldown: -50 } },
      { label: 'Shoot Bow +2', deltas: { damage: 5, range: 100 } },
      { label: 'Shoot Bow +3', deltas: { damage: 10, cooldown: -50 } },
    ],
    // S1: Multi-Shot (PROJECTILE/MULTI) — damage 25, projectileCount 10, cooldown 3000
    [
      { label: 'Multi-Shot +1', deltas: { damage: 5, projectileCount: 2 } },
      { label: 'Multi-Shot +2', deltas: { damage: 5, cooldown: -300 } },
      { label: 'Multi-Shot +3', deltas: { damage: 10, projectileCount: 2 } },
    ],
    // S2: Call of the Wild (SPAWN/PET) — petStats.damage 25, cooldown 20000
    [
      { label: 'Call of the Wild +1', deltas: { 'petStats.damage': 10, 'petStats.hp': 20 } },
      { label: 'Call of the Wild +2', deltas: { 'petStats.damage': 10, cooldown: -3000 } },
      { label: 'Call of the Wild +3', deltas: { 'petStats.damage': 15, 'petStats.hp': 30 } },
    ],
    // S3: Explosive Trap (SPAWN/TRAP) — trapEffect.damage 80, cooldown 15000
    [
      { label: 'Explosive Trap +1', deltas: { 'trapEffect.damage': 20, cooldown: -2000 } },
      { label: 'Explosive Trap +2', deltas: { 'trapEffect.radius': 30, triggerRadius: 10 } },
      { label: 'Explosive Trap +3', deltas: { 'trapEffect.damage': 30, cooldown: -2000 } },
    ],
  ],

  // ── PRIEST ───────────────────────────────────────────────────────────────
  Priest: [
    // S0: Penance (PROJECTILE/BURST) — damage 30, healAmount 40, cooldown 4000
    [
      { label: 'Penance +1', deltas: { damage: 10, healAmount: 10 } },
      { label: 'Penance +2', deltas: { damage: 10, healAmount: 10, cooldown: -500 } },
      { label: 'Penance +3', deltas: { damage: 15, healAmount: 15 } },
    ],
    // S1: Holy Nova (AOE) — damage 100, healAmount 105, cooldown 1000
    [
      { label: 'Holy Nova +1', deltas: { damage: 15, healAmount: 15 } },
      { label: 'Holy Nova +2', deltas: { radius: 30, cooldown: -100 } },
      { label: 'Holy Nova +3', deltas: { damage: 20, healAmount: 20, cooldown: -100 } },
    ],
    // S2: Power Word: Shield (BUFF/TARGETED) — shield 100, cooldown 8000
    [
      { label: 'PW: Shield +1', deltas: { 'effectParams.shield': 30, cooldown: -1000 } },
      { label: 'PW: Shield +2', deltas: { 'effectParams.shield': 30, duration: 2000 } },
      { label: 'PW: Shield +3', deltas: { 'effectParams.shield': 40, cooldown: -1000 } },
    ],
    // S3: Mass Resurrection (CAST) — cooldown 120000, castTime 2000
    [
      { label: 'Mass Rez +1', deltas: { cooldown: -15000, castTime: -200 } },
      { label: 'Mass Rez +2', deltas: { 'payload.radius': 50, 'payload.healPercent': 0.1 } },
      { label: 'Mass Rez +3', deltas: { cooldown: -15000, castTime: -300 } },
    ],
  ],

  // ── MAGE ─────────────────────────────────────────────────────────────────
  Mage: [
    // S0: Fireball (CAST) — payload.damage 40, cooldown 900, castTime 800
    [
      { label: 'Fireball +1', deltas: { 'payload.damage': 10, cooldown: -50 } },
      { label: 'Fireball +2', deltas: { 'payload.damage': 15, castTime: -100 } },
      { label: 'Fireball +3', deltas: { 'payload.damage': 20, cooldown: -100 } },
    ],
    // S1: Frost Nova (AOE) — radius 180, cooldown 10000
    [
      { label: 'Frost Nova +1', deltas: { radius: 20, cooldown: -1000 } },
      { label: 'Frost Nova +2', deltas: { 'effectParams.duration': 500, radius: 20 } },
      { label: 'Frost Nova +3', deltas: { cooldown: -1500, radius: 30 } },
    ],
    // S2: Blink (DASH/TELEPORT) — distance 150, cooldown 12000
    [
      { label: 'Blink +1', deltas: { distance: 30, cooldown: -1500 } },
      { label: 'Blink +2', deltas: { distance: 30, cooldown: -1500 } },
      { label: 'Blink +3', deltas: { distance: 40, cooldown: -2000 } },
    ],
    // S3: Pyroblast (CAST) — payload.damage 200, payload.onImpact.damage 100, cooldown 500
    [
      { label: 'Pyroblast +1', deltas: { 'payload.damage': 30, cooldown: -30 } },
      { label: 'Pyroblast +2', deltas: { 'payload.damage': 30, 'payload.onImpact.damage': 20 } },
      { label: 'Pyroblast +3', deltas: { 'payload.damage': 40, 'payload.onImpact.radius': 20 } },
    ],
  ],

  // ── DRUID ─────────────────────────────────────────────────────────────────
  Druid: [
    // S0: Wrath (CAST) — payload.damage 35, cooldown 1000, castTime 700
    [
      { label: 'Wrath +1', deltas: { 'payload.damage': 10, cooldown: -50 } },
      { label: 'Wrath +2', deltas: { 'payload.damage': 10, castTime: -100 } },
      { label: 'Wrath +3', deltas: { 'payload.damage': 15, cooldown: -100 } },
    ],
    // S1: Moonfire (TARGETED) — damage 25, dot.damagePerTick 12, cooldown 500
    [
      { label: 'Moonfire +1', deltas: { damage: 8, 'dot.damagePerTick': 3 } },
      { label: 'Moonfire +2', deltas: { damage: 8, 'dot.duration': 1000 } },
      { label: 'Moonfire +3', deltas: { damage: 10, 'dot.damagePerTick': 5 } },
    ],
    // S2: Regrowth (TARGETED/HEAL_ALLY) — healAmount 40, hot.healPerTick 15, cooldown 500
    [
      { label: 'Regrowth +1', deltas: { healAmount: 10, 'hot.healPerTick': 5 } },
      { label: 'Regrowth +2', deltas: { healAmount: 10, 'hot.duration': 1000 } },
      { label: 'Regrowth +3', deltas: { healAmount: 15, 'hot.healPerTick': 5, castTime: -200 } },
    ],
    // S3: Tranquility (CHANNEL) — payload.healAmount 20, cooldown 500, castTime 4000
    [
      { label: 'Tranquility +1', deltas: { 'payload.healAmount': 5, cooldown: -50 } },
      { label: 'Tranquility +2', deltas: { 'payload.healAmount': 5, 'payload.radius': 30 } },
      { label: 'Tranquility +3', deltas: { 'payload.healAmount': 10, tickRate: -50 } },
    ],
  ],

  // ── ROGUE ─────────────────────────────────────────────────────────────────
  Rogue: [
    // S0: Sinister Strike (MELEE) — damage 70, range 70, cooldown 500
    [
      { label: 'Sinister Strike +1', deltas: { damage: 15, cooldown: -30 } },
      { label: 'Sinister Strike +2', deltas: { damage: 15, range: 10 } },
      { label: 'Sinister Strike +3', deltas: { damage: 20, cooldown: -50 } },
    ],
    // S1: Vanish (BUFF/STEALTH) — duration 8000, cooldown 5000
    [
      { label: 'Vanish +1', deltas: { duration: 2000, cooldown: -500 } },
      { label: 'Vanish +2', deltas: { 'effectParams.shadowStrikeMultiplier': 0.3 } },
      { label: 'Vanish +3', deltas: { duration: 2000, cooldown: -500 } },
    ],
    // S2: Sprint (BUFF) — duration 3000, cooldown 7000
    [
      { label: 'Sprint +1', deltas: { duration: 1000, cooldown: -500 } },
      { label: 'Sprint +2', deltas: { 'effectParams.speedMultiplier': 0.3 } },
      { label: 'Sprint +3', deltas: { duration: 1000, cooldown: -1000 } },
    ],
    // S3: Ambush (TARGETED/TELEPORT_BEHIND) — damage 80, comboDamage 40, cooldown 8000
    [
      { label: 'Ambush +1', deltas: { damage: 20, cooldown: -1000 } },
      { label: 'Ambush +2', deltas: { damage: 20, comboDamage: 10 } },
      { label: 'Ambush +3', deltas: { damage: 25, cooldown: -1000 } },
    ],
  ],

  // ── WARLOCK ─────────────────────────────────────────────────────────────
  Warlock: [
    // S0: Shadow Bolt (CAST) — payload.damage 35, cooldown 500, castTime 700
    [
      { label: 'Shadow Bolt +1', deltas: { 'payload.damage': 10, cooldown: -30 } },
      { label: 'Shadow Bolt +2', deltas: { 'payload.damage': 10, castTime: -100 } },
      { label: 'Shadow Bolt +3', deltas: { 'payload.damage': 15, cooldown: -50 } },
    ],
    // S1: Corruption (TARGETED) — damage 10, dot.damagePerTick 15, cooldown 500
    [
      { label: 'Corruption +1', deltas: { damage: 5, 'dot.damagePerTick': 5 } },
      { label: 'Corruption +2', deltas: { 'dot.damagePerTick': 5, 'dot.duration': 1000 } },
      { label: 'Corruption +3', deltas: { damage: 10, 'dot.damagePerTick': 8 } },
    ],
    // S2: Drain Life (CHANNEL/BEAM) — damagePerTick 15, healPerTick 15, cooldown 500
    [
      { label: 'Drain Life +1', deltas: { damagePerTick: 5, healPerTick: 5 } },
      { label: 'Drain Life +2', deltas: { damagePerTick: 5, healPerTick: 5, range: 100 } },
      { label: 'Drain Life +3', deltas: { damagePerTick: 8, healPerTick: 8 } },
    ],
    // S3: Fear (AOE) — radius 150, fearDuration 2500, cooldown 20000
    [
      { label: 'Fear +1', deltas: { radius: 20, cooldown: -2000 } },
      { label: 'Fear +2', deltas: { fearDuration: 500, radius: 20 } },
      { label: 'Fear +3', deltas: { radius: 30, cooldown: -3000 } },
    ],
  ],

  // ── DEATH KNIGHT ────────────────────────────────────────────────────────
  DeathKnight: [
    // S0: Frost Strike (MELEE) — damage 65, range 50, cooldown 1000
    [
      { label: 'Frost Strike +1', deltas: { damage: 15, cooldown: -100 } },
      { label: 'Frost Strike +2', deltas: { damage: 15, 'effectParams.duration': 500 } },
      { label: 'Frost Strike +3', deltas: { damage: 20, range: 10, cooldown: -100 } },
    ],
    // S1: Death Grip (TARGETED/GRIP) — range 350, cooldown 1000
    [
      { label: 'Death Grip +1', deltas: { range: 50, cooldown: -100 } },
      { label: 'Death Grip +2', deltas: { range: 50, cooldown: -100 } },
      { label: 'Death Grip +3', deltas: { range: 50, cooldown: -200 } },
    ],
    // S2: Death and Decay (AOE/LOBBED) — damage 20, radius 120, cooldown 15000
    [
      { label: 'Death and Decay +1', deltas: { damage: 5, radius: 15, cooldown: -2000 } },
      { label: 'Death and Decay +2', deltas: { damage: 5, duration: 1000 } },
      { label: 'Death and Decay +3', deltas: { damage: 10, radius: 20, cooldown: -2000 } },
    ],
    // S3: Anti-Magic Shell (BUFF) — damageReduction 0.8, shield 100, cooldown 25000
    [
      { label: 'Anti-Magic Shell +1', deltas: { 'effectParams.shield': 30, cooldown: -3000 } },
      { label: 'Anti-Magic Shell +2', deltas: { duration: 1000, 'effectParams.shield': 30 } },
      { label: 'Anti-Magic Shell +3', deltas: { 'effectParams.shield': 40, cooldown: -4000 } },
    ],
  ],
}
