/**
 * shared/BossConfig.js
 * Configuration for all boss encounters.
 */

// Note: ILLIDAN config lives in shared/IllidanConfig.js — it has Illidan-specific
// phase/ability mechanics that are handled separately from the generic boss entity.

export const BOSS_CONFIG = {
  SHADE_OF_AKAMA: {
    name:  'Shade of Akama',
    maxHp: 4000,
    speed: 0.6,
    radius: 55,
    meleeDamage: 40,
    attackCooldown: 2000,
    attackRange: 90,
    // No abilities array — Shade uses simple melee only
    abilities: [],
    // Two phases: idle (immune) → active (attacks Akama)
    phases: [
      { threshold: 1.0, speed: 0,   idle: true },    // Phase 1: immune, stationary
      { threshold: 1.0, speed: 0.6, idle: false },   // Phase 2: active, chases Akama
    ],
    // Target override: attacks NPC instead of players
    targetNPC: 'akama',
  },
}
