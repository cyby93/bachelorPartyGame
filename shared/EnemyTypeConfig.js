/**
 * shared/EnemyTypeConfig.js
 * Named enemy archetypes — stats, AI behaviour, and visual hints.
 *
 * Each key is a stable type id referenced by LevelConfig.js and ServerEnemy.
 * Client uses `color` and `shape` for rendering; server uses everything else.
 *
 * ── Stat formulas ─────────────────────────────────────────────────────────
 * All HP and damage values are expressed as multiples of the balance constants
 * R (RANGED_BASE_DPS), X (ENEMY_HP_MULT), and Y (ENEMY_DAMAGE_MULT) from
 * BalanceConfig.js. Tune those constants to rescale the entire game at once.
 *
 *   L5 reference unit: hp = X×R = 50   damage = Y×R = 40   (at defaults)
 *
 * Heal amounts scale with X×R (HP pool), not Y×R (damage).
 */

import { BALANCE } from './BalanceConfig.js'

const R = BALANCE.RANGED_BASE_DPS
const X = BALANCE.ENEMY_HP_MULT
const Y = BALANCE.ENEMY_DAMAGE_MULT

export const ENEMY_TYPES = {
  // ════════════════════════════════════════════════════════════════════════
  // BLACK TEMPLE ENEMIES
  // ════════════════════════════════════════════════════════════════════════

  // ── Illidari Fel Guard — fast melee pack unit ────────────────────────────
  felGuard: {
    hp: Math.round(0.70 * X * R), speed: 1.3, radius: 15, contactDamage: Math.round(0.45 * Y * R),
    spriteSize: 76,
    color: '#1a7a1a',
    ai: 'chase',
  },

  // ── Bonechewer Brute — slow tanky fel orc ───────────────────────────────
  bonechewerBrute: {
    hp: Math.round(2.00 * X * R), speed: 0.8, radius: 24, contactDamage: Math.round(0.875 * Y * R),
    spriteSize: 116,
    color: '#8B0000',
    ai: 'chase',
  },

  // ── Coilskar Harpooner — ranged naga ────────────────────────────────────
  coilskarHarpooner: {
    hp: Math.round(0.50 * X * R), speed: 1.0, radius: 13, contactDamage: Math.round(0.125 * Y * R),
    spriteSize: 76,
    color: '#1a5f7a',
    ai: 'ranged',
    projectileSpeed: 280,
    projectileDamage: Math.round(0.35 * Y * R),
    attackRange: 320,
    attackCooldown: 2500,
  },

  // ── Illidari Centurion — charging demon elite ────────────────────────────
  illidariCenturion: {
    hp: Math.round(1.40 * X * R), speed: 1.4, radius: 20, contactDamage: Math.round(1.25 * Y * R),
    spriteSize: 116,
    color: '#2d6b2d',
    ai: 'charger',
    chargeSpeed: 5.5,
    chargeRange: 260,
    chargeCooldown: 4000,
    chargeWindup: 500,
    chargeSilenceDuration: 2000,  // ms — silences hit player on charge contact
  },

  // ── Bonechewer Blade Fury — berserking whirlwind orc ────────────────────
  bonechewerBladeFury: {
    hp: Math.round(1.20 * X * R), speed: 1.3, radius: 18, contactDamage: Math.round(0.55 * Y * R),
    spriteSize: 96,
    color: '#cc2200',
    ai: 'berserk',
    berserckSpeed:    1.9,
    berserckRadius:   65,
    berserckDamage:   Math.round(0.45 * Y * R),    // per AoE tick while spinning
    berserckDuration: 2500,  // ms spinning
    berserckCooldown: 9000,  // ms between activations
    berserckExhaust:  600,   // ms slow after spin ends
  },

  // ── Ashtongue Mystic — broken draenei healer ────────────────────────────
  ashtonghueMystic: {
    hp: Math.round(0.90 * X * R), speed: 1.0, radius: 14, contactDamage: Math.round(0.125 * Y * R),
    spriteSize: 76,
    color: '#7b4f9e',
    ai: 'healer',
    healAmount: Math.round(0.24 * X * R),
    healRadius: 130,
    healCooldown: 3000,
    preferredRange: 100,
  },

  // ── Bonechewer Blood Prophet — stationary fel orc damage buffer ──────────
  bloodProphet: {
    hp: Math.round(1.40 * X * R), speed: 0, radius: 15, contactDamage: 0,
    spriteSize: 96,
    color: '#8B0000',
    ai: 'channeler',
    channelTarget: null,
    hpBuffPerSecond: 50,
    damageBuffPerSecond: 2,
  },

  // ── Coilskar Serpent Guard — shield-bearing naga tank ───────────────────
  coilskarSerpentGuard: {
    hp: Math.round(1.70 * X * R), speed: 1.0, radius: 21, contactDamage: Math.round(0.70 * Y * R),
    spriteSize: 116,
    color: '#0d4f6b',
    ai: 'shielded',
    shieldArc: 2.094,  // 120° in radians (Math.PI * 2/3)
  },

  // ── Ashtongue Ritual Channeler — repairs ritual objectives ──────────────
  ritualChanneler: {
    hp: Math.round(0.80 * X * R), speed: 1.1, radius: 13, contactDamage: Math.round(0.125 * Y * R),
    spriteSize: 64,
    color: '#6a3d9a',
    ai: 'gateRepairer',
    repairAmount: 8,
    repairRange: 60,
  },

  // ════════════════════════════════════════════════════════════════════════
  // PLACEHOLDER ENEMIES (kept for backwards-compat until LevelConfig updated)
  // ════════════════════════════════════════════════════════════════════════

  // ── Basic melee ─────────────────────────────────────────────────────────
  grunt: {
    hp: Math.round(1.00 * X * R),
    speed: 1.2,
    radius: 15,
    contactDamage: Math.round(1.00 * Y * R),
    spriteSize: 76,
    color: '#c0392b',
    shape: 'triangle',
    ai: 'chase',
  },

  brute: {
    hp: Math.round(2.40 * X * R),
    speed: 0.9,
    radius: 22,
    contactDamage: Math.round(2.50 * Y * R),
    spriteSize: 96,
    color: '#8e44ad',
    shape: 'circle',
    ai: 'chase',
  },

  // ── Ranged ──────────────────────────────────────────────────────────────
  archer: {
    hp: Math.round(0.50 * X * R),
    speed: 1.0,
    radius: 12,
    contactDamage: Math.round(0.125 * Y * R),
    spriteSize: 76,
    color: '#e67e22',
    shape: 'diamond',
    ai: 'ranged',
    projectileSpeed: 160,
    projectileDamage: Math.round(0.40 * Y * R),
    attackRange: 300,
    attackCooldown: 2500,
  },

  // ── Charger ─────────────────────────────────────────────────────────────
  charger: {
    hp: Math.round(1.00 * X * R),
    speed: 1.4,             // walk speed (charge is faster)
    radius: 18,
    contactDamage: Math.round(1.30 * Y * R),
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
    hp: Math.round(0.80 * X * R),
    speed: 1.0,
    radius: 14,
    contactDamage: Math.round(0.125 * Y * R),
    spriteSize: 76,
    color: '#2ecc71',
    shape: 'cross',
    ai: 'healer',
    healAmount: Math.round(0.20 * X * R),
    healRadius: 120,
    healCooldown: 3000,
    preferredRange: 100,    // tries to stay this far from the pack centre
  },

  // ── Gate Repairer (Level 2) ─────────────────────────────────────────────
  gateRepairer: {
    hp: Math.round(0.70 * X * R),
    speed: 1.1,
    radius: 13,
    contactDamage: Math.round(0.125 * Y * R),
    spriteSize: 76,
    color: '#8B4513',
    shape: 'square',
    ai: 'gateRepairer',
    repairAmount: 8,        // HP restored per second while in range
    repairRange: 60,        // distance to gate to start repairing
  },

  // ── Leviathan (Level 3) ─────────────────────────────────────────────────
  leviathan: {
    hp: Math.round(12.00 * X * R),
    speed: 1.0,
    radius: 50,
    contactDamage: Math.round(0.625 * Y * R),
    spriteSize: 116,
    color: '#2E8B57',
    shape: 'circle',
    ai: 'leviathan',
    projectileSpeed: 180,
    projectileDamage: Math.round(0.375 * Y * R),
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
    hp: Math.round(1.20 * X * R),
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
    hp: Math.round(10.00 * X * R),
    speed: 0.5,
    radius: 40,
    contactDamage: 0,     // dealt via aura tick, not contact
    spriteSize: 96,
    color: '#ff5500',
    shape: 'circle',
    ai: 'flameOfAzzinoth',
    blazeInterval: 4000,  // ms between leaving a Blaze ground zone
    blazeRadius:   80,
    auraRadius:    100,    // burning aura — damages players every 2 s
    auraDamage:    10,
    auraTickRate:  2000,
  },

  // Phase 3 — slowly crawls toward one random player, instantly kills on contact, retargets on death
  // Mechanic: party must stop and focus it down before it reaches its target
  shadowDemon: {
    hp: Math.round(10 * X * R),   // 500 at defaults — tanky enough to require focused fire
    speed: 0.6,                    // slow crawl — gives the party time to react
    radius: 18,
    contactDamage: 0,              // dealt as instant kill logic in GameServer
    spriteSize: 80,
    color: '#7700cc',
    shape: 'diamond',
    ai: 'shadowDemon',
  },

  // Spawned when Parasitic Shadowfiend debuff expires on a player;
  // infects the next player it touches
  shadowfiend: {
    hp: Math.round(1.20 * X * R),
    speed: 2.0,
    radius: 16,
    contactDamage: 0,     // infection applied by GameServer, not contact damage
    spriteSize: 76,
    color: '#440088',
    shape: 'triangle',
    ai: 'shadowfiend',
  },
}
