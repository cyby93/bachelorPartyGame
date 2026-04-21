/**
 * shared/UpgradeConfig.js
 * Defines upgrade tiers for every skill (10 classes × 4 skills × 3 tiers).
 *
 * Each tier is { label, deltas } where deltas is a map of dot-paths → additive values.
 * Negative values reduce the stat (e.g. cooldown: -100 reduces cooldown by 100ms).
 *
 * Calibration target: 6 upgrades focused into top-2 damage skills (3+3)
 * should yield approximately ×1.5–1.7 total character DPS vs base.
 * Base values in comments match current SkillDatabase.js.
 */

export const UPGRADE_CONFIG = {

  // ── WARRIOR ──────────────────────────────────────────────────────────────
  Warrior: [
    // S0: Cleave (MELEE) — damage 8, range 80, cooldown 1000ms → base DPS ~8.0
    [
      { label: 'Cleave +1', deltas: { damage: 1, cooldown: -100 } },
      { label: 'Cleave +2', deltas: { damage: 1, range: 10 } },
      { label: 'Cleave +3', deltas: { damage: 1, cooldown: -100 } },
    ],
    // S1: Thunder Clap (AOE_SELF) — damage 15, radius 120, cooldown 3000ms → base DPS ~5.0
    [
      { label: 'Thunder Clap +1', deltas: { damage: 3, radius: 15 } },
      { label: 'Thunder Clap +2', deltas: { damage: 3, 'effectParams.duration': 500 } },
      { label: 'Thunder Clap +3', deltas: { damage: 3, cooldown: -300 } },
    ],
    // S2: Bladestorm (AOE/BLADESTORM) — damage 6/tick, tickRate 300ms, duration 4000ms, cooldown 12000ms → base DPS ~6.5
    [
      { label: 'Bladestorm +1', deltas: { damage: 1 } },
      { label: 'Bladestorm +2', deltas: { duration: 500 } },
      { label: 'Bladestorm +3', deltas: { damage: 1, cooldown: -1000 } },
    ],
    // S3: Shield Wall (SHIELD) — utility only
    [
      { label: 'Shield Wall +1', deltas: { cooldown: -500 } },
      { label: 'Shield Wall +2', deltas: { arc: 0.3 } },
      { label: 'Shield Wall +3', deltas: { cooldown: -500, arc: 0.2 } },
    ],
  ],

  // ── PALADIN ──────────────────────────────────────────────────────────────
  Paladin: [
    // S0: Hammer Swing (MELEE) — damage 10, range 70, cooldown 1200ms → base DPS ~8.3
    [
      { label: 'Hammer Swing +1', deltas: { damage: 2 } },
      { label: 'Hammer Swing +2', deltas: { damage: 1, range: 10 } },
      { label: 'Hammer Swing +3', deltas: { damage: 2, cooldown: -200 } },
    ],
    // S1: Avenger's Shield (PROJECTILE) — damage 40, chain 2, cooldown 7000ms → base DPS ~5.7
    [
      { label: "Avenger's Shield +1", deltas: { damage: 8, cooldown: -500 } },
      { label: "Avenger's Shield +2", deltas: { damage: 7 } },
      { label: "Avenger's Shield +3", deltas: { damage: 7, cooldown: -500 } },
    ],
    // S2: Divine Shield (SHIELD) — utility only
    [
      { label: 'Divine Shield +1', deltas: { cooldown: -300 } },
      { label: 'Divine Shield +2', deltas: { arc: 0.3 } },
      { label: 'Divine Shield +3', deltas: { cooldown: -400, arc: 0.2 } },
    ],
    // S3: Consecration (AOE_SELF) — damage 3/tick, 8 ticks, healAmount 3, cooldown 7000ms → base DPS ~3.4
    [
      { label: 'Consecration +1', deltas: { damage: 1, healAmount: 1, cooldown: -500 } },
      { label: 'Consecration +2', deltas: { radius: 15 } },
      { label: 'Consecration +3', deltas: { damage: 1, healAmount: 1, cooldown: -700 } },
    ],
  ],

  // ── SHAMAN ───────────────────────────────────────────────────────────────
  Shaman: [
    // S0: Lightning Bolt (CAST) — payload.damage 5, castTime 1000ms, cooldown 0 → base DPS ~5.0
    [
      { label: 'Lightning Bolt +1', deltas: { 'payload.damage': 1 } },
      { label: 'Lightning Bolt +2', deltas: { 'payload.damage': 1, castTime: -100 } },
      { label: 'Lightning Bolt +3', deltas: { 'payload.damage': 1 } },
    ],
    // S1: Chain Heal (TARGETED/HEAL_ALLY) — healAmount 12, maxChains 2, castTime 1500ms
    [
      { label: 'Chain Heal +1', deltas: { healAmount: 3 } },
      { label: 'Chain Heal +2', deltas: { healAmount: 3, maxChains: 1 } },
      { label: 'Chain Heal +3', deltas: { healAmount: 4, castTime: -200 } },
    ],
    // S2: Searing Totem (SPAWN/TOTEM) — totemAbility.damage 3, tickRate 1000ms, duration 12000ms, cooldown 10000ms → base DPS ~3.6
    [
      { label: 'Searing Totem +1', deltas: { 'totemAbility.damage': 1 } },
      { label: 'Searing Totem +2', deltas: { cooldown: -1000 } },
      { label: 'Searing Totem +3', deltas: { 'totemAbility.damage': 1 } },
    ],
    // S3: Bloodlust (AOE/BUFF) — duration 10000ms, cooldown 30000ms — utility only
    [
      { label: 'Bloodlust +1', deltas: { duration: 2000, cooldown: -3000 } },
      { label: 'Bloodlust +2', deltas: { 'effectParams.speedMultiplier': 0.1, 'effectParams.fireRateMultiplier': 0.1 } },
      { label: 'Bloodlust +3', deltas: { duration: 2000, cooldown: -3000 } },
    ],
  ],

  // ── HUNTER ───────────────────────────────────────────────────────────────
  Hunter: [
    // S0: Shoot Bow (PROJECTILE) — damage 5, range 1000, cooldown 500ms → base DPS ~7.5 (in rotation)
    [
      { label: 'Shoot Bow +1', deltas: { damage: 1 } },
      { label: 'Shoot Bow +2', deltas: { damage: 1, range: 80 } },
      { label: 'Shoot Bow +3', deltas: { damage: 1, cooldown: -50 } },
    ],
    // S1: Aimed Shot (CAST) — payload.damage 45, castTime 1500ms, cooldown 4000ms → base DPS ~11.3
    [
      { label: 'Aimed Shot +1', deltas: { 'payload.damage': 8 } },
      { label: 'Aimed Shot +2', deltas: { 'payload.damage': 8, castTime: -200 } },
      { label: 'Aimed Shot +3', deltas: { 'payload.damage': 9, cooldown: -500 } },
    ],
    // S2: Call of the Wild (SPAWN/WILD_BEAST) — damageBonus 0 (added to all variants at spawn), duration 20000ms, cooldown 2000ms
    // damageBonus is applied server-side in SkillSystem when flattening beastVariants → petStats.
    [
      { label: 'Call of the Wild +1', deltas: { damageBonus: 1, duration: 2000 } },
      { label: 'Call of the Wild +2', deltas: { damageBonus: 1, cooldown: -300 } },
      { label: 'Call of the Wild +3', deltas: { damageBonus: 2, duration: 2000, cooldown: -300 } },
    ],
    // S3: Explosive Trap (SPAWN/TRAP) — trapEffect.damage 25, trapEffect.radius 120, cooldown 8000ms → base DPS ~3.2
    [
      { label: 'Explosive Trap +1', deltas: { 'trapEffect.damage': 4, cooldown: -1000 } },
      { label: 'Explosive Trap +2', deltas: { 'trapEffect.damage': 4, 'trapEffect.radius': 15 } },
      { label: 'Explosive Trap +3', deltas: { 'trapEffect.damage': 5 } },
    ],
  ],

  // ── PRIEST ───────────────────────────────────────────────────────────────
  Priest: [
    // S0: Penance (PROJECTILE/BURST) — damage 10, healAmount 12, cooldown 3000ms → base DPS ~3.3
    [
      { label: 'Penance +1', deltas: { damage: 2, healAmount: 2 } },
      { label: 'Penance +2', deltas: { damage: 2, healAmount: 2, cooldown: -300 } },
      { label: 'Penance +3', deltas: { damage: 2, healAmount: 2 } },
    ],
    // S1: Holy Nova (AOE_SELF) — damage 4, healAmount 6, radius 200, cooldown 1000ms → base DPS ~4.0
    [
      { label: 'Holy Nova +1', deltas: { damage: 1, healAmount: 1 } },
      { label: 'Holy Nova +2', deltas: { radius: 20, cooldown: -100 } },
      { label: 'Holy Nova +3', deltas: { damage: 1, healAmount: 1, cooldown: -100 } },
    ],
    // S2: Power Word: Shield (BUFF/TARGETED) — effectParams.shield 30, cooldown 5000ms — utility only
    [
      { label: 'PW: Shield +1', deltas: { 'effectParams.shield': 10, cooldown: -1000 } },
      { label: 'PW: Shield +2', deltas: { 'effectParams.shield': 10, duration: 2000 } },
      { label: 'PW: Shield +3', deltas: { 'effectParams.shield': 10, cooldown: -1000 } },
    ],
    // S3: Mass Resurrection (CAST) — cooldown 15000ms, castTime 2000ms — utility only
    [
      { label: 'Mass Rez +1', deltas: { cooldown: -2000, castTime: -200 } },
      { label: 'Mass Rez +2', deltas: { 'payload.healPercent': 0.1, 'payload.radius': 50 } },
      { label: 'Mass Rez +3', deltas: { cooldown: -2000, castTime: -200 } },
    ],
  ],

  // ── MAGE ─────────────────────────────────────────────────────────────────
  Mage: [
    // S0: Fireball (CAST) — payload.damage 10, castTime 800ms, cooldown 0 → base DPS ~8.3 (in rotation)
    [
      { label: 'Fireball +1', deltas: { 'payload.damage': 2 } },
      { label: 'Fireball +2', deltas: { 'payload.damage': 2, castTime: -80 } },
      { label: 'Fireball +3', deltas: { 'payload.damage': 2 } },
    ],
    // S1: Frost Nova (AOE_SELF) — radius 180, cooldown 10000ms — CC utility only
    [
      { label: 'Frost Nova +1', deltas: { radius: 20, cooldown: -1000 } },
      { label: 'Frost Nova +2', deltas: { 'effectParams.duration': 500, radius: 20 } },
      { label: 'Frost Nova +3', deltas: { cooldown: -1500, radius: 30 } },
    ],
    // S2: Blink (DASH/TELEPORT) — distance 250, cooldown 7000ms — mobility only
    [
      { label: 'Blink +1', deltas: { distance: 30, cooldown: -1500 } },
      { label: 'Blink +2', deltas: { distance: 30, cooldown: -1500 } },
      { label: 'Blink +3', deltas: { distance: 40, cooldown: -2000 } },
    ],
    // S3: Pyroblast (CAST) — payload.damage 90, onImpact.damage 30, castTime 2000ms, cooldown 6000ms → base DPS ~20.0
    [
      { label: 'Pyroblast +1', deltas: { 'payload.damage': 15 } },
      { label: 'Pyroblast +2', deltas: { 'payload.damage': 15, 'payload.onImpact.damage': 5 } },
      { label: 'Pyroblast +3', deltas: { 'payload.damage': 20, cooldown: -500 } },
    ],
  ],

  // ── DRUID ─────────────────────────────────────────────────────────────────
  Druid: [
    // S0: Wrath (CAST) — payload.damage 3, castTime 800ms, cooldown 0 → base DPS ~3.8
    [
      { label: 'Wrath +1', deltas: { 'payload.damage': 1 } },
      { label: 'Wrath +2', deltas: { castTime: -100 } },
      { label: 'Wrath +3', deltas: { 'payload.damage': 1 } },
    ],
    // S1: Moonfire (TARGETED) — damage 3, dot.damagePerTick 3, dot.duration 6000ms, cooldown 1000ms → base DPS ~3.5
    [
      { label: 'Moonfire +1', deltas: { damage: 1, 'dot.damagePerTick': 1 } },
      { label: 'Moonfire +2', deltas: { 'dot.damagePerTick': 1, 'dot.duration': 1000 } },
      { label: 'Moonfire +3', deltas: { damage: 1, 'dot.damagePerTick': 1 } },
    ],
    // S2: Regrowth (TARGETED/HEAL_ALLY) — healAmount 13, hot.healPerTick 3, hot.duration 6000ms
    [
      { label: 'Regrowth +1', deltas: { healAmount: 3, 'hot.healPerTick': 1 } },
      { label: 'Regrowth +2', deltas: { healAmount: 3, 'hot.duration': 1000 } },
      { label: 'Regrowth +3', deltas: { healAmount: 4, 'hot.healPerTick': 1, castTime: -200 } },
    ],
    // S3: Tranquility (CHANNEL) — payload.healAmount 15, cooldown 13000ms — healing only
    [
      { label: 'Tranquility +1', deltas: { 'payload.healAmount': 3, cooldown: -1000 } },
      { label: 'Tranquility +2', deltas: { 'payload.healAmount': 3, 'payload.radius': 30 } },
      { label: 'Tranquility +3', deltas: { 'payload.healAmount': 4, cooldown: -1000, tickRate: -50 } },
    ],
  ],

  // ── ROGUE ─────────────────────────────────────────────────────────────────
  Rogue: [
    // S0: Sinister Strike (MELEE) — damage 7, range 70, cooldown 500ms → base DPS ~14.0
    [
      { label: 'Sinister Strike +1', deltas: { damage: 1, cooldown: -30 } },
      { label: 'Sinister Strike +2', deltas: { damage: 1, range: 5 } },
      { label: 'Sinister Strike +3', deltas: { damage: 1, cooldown: -50 } },
    ],
    // S1: Vanish (BUFF/STEALTH) — duration 8000ms, cooldown 5000ms — utility only
    [
      { label: 'Vanish +1', deltas: { duration: 2000, cooldown: -500 } },
      { label: 'Vanish +2', deltas: { 'effectParams.shadowStrikeMultiplier': 0.3 } },
      { label: 'Vanish +3', deltas: { duration: 2000, cooldown: -500 } },
    ],
    // S2: Sprint (BUFF) — duration 5000ms, cooldown 10000ms — utility only
    [
      { label: 'Sprint +1', deltas: { duration: 1000, cooldown: -1000 } },
      { label: 'Sprint +2', deltas: { 'effectParams.speedMultiplier': 0.3 } },
      { label: 'Sprint +3', deltas: { duration: 1500, cooldown: -1000 } },
    ],
    // S3: Ambush (TARGETED/TELEPORT_BEHIND) — damage 60, comboDamage 20, cooldown 7000ms → base DPS ~11.5
    [
      { label: 'Ambush +1', deltas: { damage: 10, cooldown: -500 } },
      { label: 'Ambush +2', deltas: { damage: 10, comboDamage: 5 } },
      { label: 'Ambush +3', deltas: { damage: 15, cooldown: -500 } },
    ],
  ],

  // ── WARLOCK ─────────────────────────────────────────────────────────────
  Warlock: [
    // S0: Shadow Bolt (CAST) — payload.damage 12, castTime 1000ms, cooldown 0 → base DPS ~10.8 (in rotation)
    [
      { label: 'Shadow Bolt +1', deltas: { 'payload.damage': 2, castTime: -50 } },
      { label: 'Shadow Bolt +2', deltas: { 'payload.damage': 2, castTime: -50 } },
      { label: 'Shadow Bolt +3', deltas: { 'payload.damage': 3 } },
    ],
    // S1: Corruption (TARGETED) — damage 2, dot.damagePerTick 5, dot.duration 7000ms, castTime 800ms → base DPS ~6.6
    [
      { label: 'Corruption +1', deltas: { damage: 1, 'dot.damagePerTick': 1 } },
      { label: 'Corruption +2', deltas: { 'dot.damagePerTick': 1, 'dot.duration': 1000 } },
      { label: 'Corruption +3', deltas: { damage: 1, 'dot.damagePerTick': 1 } },
    ],
    // S2: Drain Life (CHANNEL/BEAM) — damagePerTick 4, healPerTick 4, cooldown 6000ms — sustain
    [
      { label: 'Drain Life +1', deltas: { damagePerTick: 1, healPerTick: 1 } },
      { label: 'Drain Life +2', deltas: { damagePerTick: 1, healPerTick: 1, range: 100 } },
      { label: 'Drain Life +3', deltas: { damagePerTick: 1, healPerTick: 1 } },
    ],
    // S3: Fear (AOE/FEAR) — radius 250, fearDuration 2500ms, cooldown 15000ms — CC utility only
    [
      { label: 'Fear +1', deltas: { radius: 20, cooldown: -2000 } },
      { label: 'Fear +2', deltas: { fearDuration: 500, radius: 20 } },
      { label: 'Fear +3', deltas: { radius: 30, cooldown: -3000 } },
    ],
  ],

  // ── DEATH KNIGHT ────────────────────────────────────────────────────────
  DeathKnight: [
    // S0: Obliterate (MELEE) — damage 7, range 70, cooldown 700ms → base DPS ~10.0
    [
      { label: 'Obliterate +1', deltas: { damage: 1 } },
      { label: 'Obliterate +2', deltas: { damage: 1, 'effectParams.duration': 500 } },
      { label: 'Obliterate +3', deltas: { damage: 1, cooldown: -100 } },
    ],
    // S1: Death Grip (TARGETED/GRIP) — range 350, cooldown 6000ms — utility only
    [
      { label: 'Death Grip +1', deltas: { range: 50, cooldown: -500 } },
      { label: 'Death Grip +2', deltas: { range: 50, cooldown: -500 } },
      { label: 'Death Grip +3', deltas: { range: 50, cooldown: -1000 } },
    ],
    // S2: Death and Decay (AOE_ADJACENT) — damage 4/tick, tickRate 500ms, duration 7000ms, cooldown 12000ms → base DPS ~4.7
    [
      { label: 'Death and Decay +1', deltas: { damage: 1, cooldown: -1000 } },
      { label: 'Death and Decay +2', deltas: { cooldown: -1000, radius: 15 } },
      { label: 'Death and Decay +3', deltas: { duration: 1000 } },
    ],
    // S3: Anti-Magic Shell (BUFF) — effectParams.shield 60, duration 7000ms, cooldown 10000ms — defensive only
    [
      { label: 'Anti-Magic Shell +1', deltas: { 'effectParams.shield': 20, cooldown: -2000 } },
      { label: 'Anti-Magic Shell +2', deltas: { duration: 2000, 'effectParams.shield': 20 } },
      { label: 'Anti-Magic Shell +3', deltas: { 'effectParams.shield': 20, cooldown: -2000 } },
    ],
  ],
}
