/**
 * shared/EnemyTypeConfig.js
 * Named enemy archetypes — stats, AI behaviour, and visual hints.
 *
 * Each key is a stable type id referenced by LevelConfig.js and ServerEnemy.
 * Client uses `color` and `shape` for rendering; server uses everything else.
 */

export const ENEMY_TYPES = {
  // ── Basic melee ─────────────────────────────────────────────────────────
  grunt: {
    hp: 30,
    speed: 1.2,
    radius: 15,
    contactDamage: 15,
    spriteSize: 76,
    color: '#c0392b',
    shape: 'triangle',      // existing shape
    ai: 'chase',
  },

  brute: {
    hp: 80,
    speed: 0.9,
    radius: 22,
    contactDamage: 30,
    spriteSize: 96,
    color: '#8e44ad',
    shape: 'circle',
    ai: 'chase',
  },

  // ── Ranged ──────────────────────────────────────────────────────────────
  archer: {
    hp: 20,
    speed: 1.0,
    radius: 12,
    contactDamage: 5,
    spriteSize: 76,
    color: '#e67e22',
    shape: 'diamond',
    ai: 'ranged',
    projectileSpeed: 160,
    projectileDamage: 12,
    attackRange: 300,
    attackCooldown: 2500,
  },

  // ── Charger ─────────────────────────────────────────────────────────────
  charger: {
    hp: 50,
    speed: 1.4,             // walk speed (charge is faster)
    radius: 18,
    contactDamage: 40,
    spriteSize: 96,
    color: '#e74c3c',
    shape: 'arrow',
    ai: 'charger',
    chargeSpeed: 5.0,       // burst speed during charge
    chargeRange: 250,       // max distance from target to begin a charge
    chargeCooldown: 4000,
    chargeWindup: 500,      // ms telegraph before charge starts
  },

  // ── Healer ──────────────────────────────────────────────────────────────
  healer: {
    hp: 40,
    speed: 1.0,
    radius: 14,
    contactDamage: 5,
    spriteSize: 76,
    color: '#2ecc71',
    shape: 'cross',
    ai: 'healer',
    healAmount: 10,
    healRadius: 120,
    healCooldown: 3000,
    preferredRange: 100,    // tries to stay this far from the pack centre
  },

  // ── Gate Repairer (Level 2) ─────────────────────────────────────────────
  gateRepairer: {
    hp: 35,
    speed: 1.1,
    radius: 13,
    contactDamage: 5,
    spriteSize: 76,
    color: '#8B4513',
    shape: 'square',
    ai: 'gateRepairer',
    repairAmount: 8,        // HP restored per second while in range
    repairRange: 60,        // distance to gate to start repairing
  },

  // ── Leviathan (Level 3) ─────────────────────────────────────────────────
  leviathan: {
    hp: 300,
    speed: 1.0,
    radius: 50,
    contactDamage: 25,
    spriteSize: 116,
    color: '#2E8B57',
    shape: 'circle',
    ai: 'leviathan',
    projectileSpeed: 180,
    projectileDamage: 15,
    attackRange: 400,
    attackCooldown: 2000,
    maxRangedTargets: 2,
    splitOnDeath: {
      count: 2,
      statMultiplier: 0.75,
      maxGenerations: 3,
    },
  },

  // ── Warlock / Channeler (Level 4) ───────────────────────────────────────
  warlock: {
    hp: 60,
    speed: 0,
    radius: 14,
    contactDamage: 0,
    spriteSize: 80,
    color: '#6A0DAD',
    shape: 'diamond',
    ai: 'channeler',
    channelTarget: null,          // set at spawn time to target entity ID
    hpBuffPerSecond: 50,          // HP added to target per second per warlock
    damageBuffPerSecond: 2,       // damage added to target per second per warlock
  },

  // ── Illidan encounter adds (Level 5) ────────────────────────────────────

  // Phase 2 adds — must be kited to avoid Blaze zones; burning aura damages nearby players
  flameOfAzzinoth: {
    hp: 600,
    speed: 1.0,
    radius: 40,
    contactDamage: 0,     // dealt via aura tick, not contact
    spriteSize: 96,
    color: '#ff5500',
    shape: 'circle',
    ai: 'flameOfAzzinoth',
    blazeInterval: 8000,  // ms between leaving a Blaze ground zone
    blazeRadius:   80,
    auraRadius:    40,    // burning aura — damages players every 2 s
    auraDamage:    10,
    auraTickRate:  2000,
  },

  // Phase 3 — chases one random player, instantly kills on contact, retargets on death
  shadowDemon: {
    hp: 80,
    speed: 3.5,
    radius: 18,
    contactDamage: 0,     // dealt as instant kill logic in GameServer
    spriteSize: 80,
    color: '#7700cc',
    shape: 'diamond',
    ai: 'shadowDemon',
  },

  // Spawned when Parasitic Shadowfiend debuff expires on a player;
  // infects the next player it touches
  shadowfiend: {
    hp: 60,
    speed: 2.0,
    radius: 16,
    contactDamage: 0,     // infection applied by GameServer, not contact damage
    spriteSize: 76,
    color: '#440088',
    shape: 'triangle',
    ai: 'shadowfiend',
  },
}
