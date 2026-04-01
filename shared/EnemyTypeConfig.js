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
    color: '#c0392b',
    shape: 'triangle',      // existing shape
    ai: 'chase',
  },

  brute: {
    hp: 80,
    speed: 0.9,
    radius: 22,
    contactDamage: 30,
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
    color: '#2ecc71',
    shape: 'cross',
    ai: 'healer',
    healAmount: 10,
    healRadius: 120,
    healCooldown: 3000,
    preferredRange: 100,    // tries to stay this far from the pack centre
  },
}
