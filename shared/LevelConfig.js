/**
 * shared/LevelConfig.js
 * Campaign definition — ordered array of levels.
 *
 * The server walks through CAMPAIGN[0..N] sequentially.
 * Each level defines its objectives, enemy spawning rules, optional boss,
 * arena size, and difficulty scaling that adjusts with player count.
 *
 * ── Objective schema ──────────────────────────────────────────────────────
 *  { type: 'killCount',  target: 50 }                    — kill any 50 enemies
 *  { type: 'killCount',  target: 10, enemyTypes: ['archer'] } — kill 10 archers
 *  { type: 'survive',    durationMs: 60000 }             — survive 60 seconds
 *  { type: 'killBoss' }                                  — defeat the level's boss
 *
 * ── Difficulty scaling ────────────────────────────────────────────────────
 *  Multiplier = base + perPlayer × (playerCount - 1)
 *  Applied to enemy HP, damage, and spawn frequency at spawn time.
 */

export const CAMPAIGN = [
  // ── Level 1: easy intro with grunts ────────────────────────────────────
  {
    id: 'level_1',
    name: 'The Courtyard',
    arena: { width: 1024, height: 768 },
    objectives: [
      { type: 'killCount', target: 30 },
    ],
    spawning: {
      interval: 2000,
      countPerWave: [1, 2],
      maxAliveAtOnce: 10,
      enemyTypes: [
        { type: 'grunt', weight: 1 },
      ],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.05 },
      damageMult: { base: 1.0, perPlayer: 0.05 },
      spawnMult:  { base: 1.0, perPlayer: 0.08 },
    },
    boss: null,
  },

  // ── Level 2: introduce brutes and archers ──────────────────────────────
  {
    id: 'level_2',
    name: 'The Barracks',
    arena: { width: 1180, height: 820 },
    objectives: [
      { type: 'killCount', target: 40 },
    ],
    spawning: {
      interval: 1800,
      countPerWave: [1, 3],
      maxAliveAtOnce: 14,
      enemyTypes: [
        { type: 'grunt',  weight: 3 },
        { type: 'brute',  weight: 1 },
        { type: 'archer', weight: 1 },
      ],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.06 },
      damageMult: { base: 1.0, perPlayer: 0.06 },
      spawnMult:  { base: 1.0, perPlayer: 0.10 },
    },
    boss: null,
  },

  // ── Level 3: boss fight — Illidan ──────────────────────────────────────
  {
    id: 'level_3',
    name: "Illidan's Sanctum",
    arena: { width: 1440, height: 900 },
    objectives: [
      { type: 'killBoss' },
    ],
    spawning: null,
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.06 },
      damageMult: { base: 1.0, perPlayer: 0.06 },
      spawnMult:  { base: 1.0, perPlayer: 0.0 },
    },
    boss: 'ILLIDAN',
  },
]
