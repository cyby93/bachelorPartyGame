/**
 * shared/BaseBossConfig.js
 * Shared defaults and constants for all boss encounters.
 *
 * Individual boss configs (IllidanConfig.js, ShadeOfAkamaConfig.js) spread
 * BASE_BOSS_DEFAULTS and override only what differs.
 */

export const DEFAULT_BOSS_RADIUS = 60

/**
 * Schema-anchoring defaults shared by every boss.
 * Override any field in the individual config — nothing here is load-bearing
 * unless the boss config omits it.
 */
export const BASE_BOSS_DEFAULTS = {
  speed:          0,
  radius:         DEFAULT_BOSS_RADIUS,
  abilities:      [],
  phases:         [],
  attackCooldown: 2000,
  attackRange:    80,

  // Hitbox shape — 'circle' (default) or 'oval' (rx = radius/2, ry = radius)
  hitboxShape: 'oval',

  // Client-side sprite config
  spriteType:  null,  // string key used for sprite/animation asset lookup
  phaseModels: null,  // { [phase: number]: spriteType } — swaps model on phase change
}
