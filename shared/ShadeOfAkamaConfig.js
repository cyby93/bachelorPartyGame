/**
 * shared/ShadeOfAkamaConfig.js
 * Configuration for the Shade of Akama boss encounter (Level 5).
 */

import { BASE_BOSS_DEFAULTS } from './BaseBossConfig.js'
import { BALANCE } from './BalanceConfig.js'

const X = BALANCE.ENEMY_HP_MULT
const Y = BALANCE.ENEMY_DAMAGE_MULT
const R = BALANCE.RANGED_BASE_DPS

export const SHADE_OF_AKAMA_CONFIG = {
  ...BASE_BOSS_DEFAULTS,
  name:           'Shade of Akama',
  maxHp:          Math.round(60 * X * R),   // 4000 at defaults
  speed:          0.6,
  radius:         55,
  meleeDamage:    Math.round(Y * R),         // 40 at defaults
  attackCooldown: 2000,
  attackRange:    90,
  // No abilities array — Shade uses simple melee only
  abilities: [],
  // Two phases: idle (immune) → active (attacks Akama)
  // Phase transition is triggered manually by GameServer, not by HP threshold.
  phases: [
    { threshold: 1.0, speed: 0,   idle: true  },  // Phase 1: immune, stationary
    { threshold: 1.0, speed: 0.6, idle: false },  // Phase 2: active, chases Akama
  ],
  // Target override: attacks NPC instead of players
  targetNPC: 'akama',

  spriteType: 'akama',

  pylons: {
    spawnDelay:      8000,   // ms delay after a pylon despawns before the next one spawns
    chargeRadius:    80,     // px — proximity range to gain charges
    chargesRequired: 20,
    healPctPerSec:   0.15,   // fraction of Akama's maxHp healed per second
    healDuration:    4000,   // ms the active pylon heals for (= 60% total)
  },
}
