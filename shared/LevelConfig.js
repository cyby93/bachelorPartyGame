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
 *  { type: 'surviveWaves' }                              — clear all discrete waves
 *  { type: 'destroyGates' }                              — destroy all gates
 *  { type: 'killAll' }                                   — kill all enemies (incl. splits)
 *  { type: 'killBossProtectNPC', npcId, bossId }         — kill boss before NPC dies
 *
 * ── Spawning modes ────────────────────────────────────────────────────────
 *  mode: 'continuous' (default) — timer-based spawning from edges
 *  mode: 'wave'                 — discrete waves, all must die before next
 *
 * ── Difficulty scaling ────────────────────────────────────────────────────
 *  Multiplier = base + perPlayer × (playerCount - 1)
 *  Applied to enemy HP, damage, and spawn frequency at spawn time.
 */

export const CAMPAIGN = [
  // ── Level 1: Survive the Waves ────────────────────────────────────────
  {
    id: 'level_1',
    name: 'The Courtyard',
    arena: { width: 1024, height: 768 },
    objectives: [
      { type: 'surviveWaves' },
    ],
    spawning: {
      mode: 'wave',
      waveCount: 8,
      betweenWaveDelayMs: 3000,
      spawnEdge: 'right',
      progression: [
        { fromWave: 1, enemyTypes: ['grunt'],                                    countRange: [3, 4] },
        { fromWave: 3, enemyTypes: ['grunt', 'archer'],                          countRange: [4, 6] },
        { fromWave: 5, enemyTypes: ['grunt', 'archer', 'brute'],                 countRange: [5, 8] },
        { fromWave: 7, enemyTypes: ['grunt', 'archer', 'brute', 'healer'],       countRange: [6, 10] },
      ],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.05 },
      damageMult: { base: 1.0, perPlayer: 0.05 },
      spawnMult:  { base: 1.0, perPlayer: 0.10 },
    },
    boss: null,
  },

  // ── Level 2: Destroy the Gates ────────────────────────────────────────
  {
    id: 'level_2',
    name: 'The Black Temple Gates',
    arena: {
      width: 2200,
      height: 800,
      rooms: [
        { id: 'left',  x: 0,    y: 0, width: 1060, height: 800 },
        { id: 'right', x: 1140, y: 0, width: 1060, height: 800 },
      ],
      passages: [
        { id: 'passage1', fromRoom: 'left', toRoom: 'right', x: 1060, y: 300, width: 80, height: 200, blockedByGate: 'gate1' },
      ],
    },
    objectives: [
      { type: 'destroyGates' },
    ],
    gates: [
      { id: 'gate1', passageId: 'passage1', hp: 500, position: { x: 1060, y: 400 }, radius: 30 },
      { id: 'gate2', passageId: null,        hp: 500, position: { x: 2170, y: 400 }, radius: 30 },
    ],
    spawning: {
      mode: 'continuous',
      interval: 2000,
      countPerWave: [1, 3],
      maxAliveAtOnce: 12,
      spawnNearActiveGate: true,
      spawnRadius: 150,
      enemyTypes: [
        { type: 'grunt',        weight: 3 },
        { type: 'brute',        weight: 1 },
        { type: 'archer',       weight: 1 },
        { type: 'healer',       weight: 1 },
        { type: 'gateRepairer', weight: 2 },
      ],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.06 },
      damageMult: { base: 1.0, perPlayer: 0.06 },
      spawnMult:  { base: 1.0, perPlayer: 0.10 },
    },
    boss: null,
  },

  // ── Level 3: The Leviathan ────────────────────────────────────────────
  {
    id: 'level_3',
    name: 'Serpentshrine Cavern',
    arena: { width: 1200, height: 900 },
    objectives: [
      { type: 'killAll' },
    ],
    spawning: null,
    initialEnemies: [
      {
        type: 'leviathan',
        x: 900,
        y: 450,
        generation: 0,
      },
    ],
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.08 },
      damageMult: { base: 1.0, perPlayer: 0.05 },
      spawnMult:  { base: 1.0, perPlayer: 0.0 },
    },
    boss: null,
  },

  // ── Level 4: Shade of Akama ──────────────────────────────────────────
  {
    id: 'level_4',
    name: 'The Refectory',
    arena: { width: 1400, height: 900 },
    objectives: [
      { type: 'killBossProtectNPC', npcId: 'akama', bossId: 'shade' },
    ],
    npcs: [
      {
        id: 'akama',
        name: 'Akama',
        hp: 2000,
        speed: 0.8,
        radius: 25,
        meleeDamage: 15,
        attackCooldown: 1500,
        attackRange: 50,
        target: 'shade',
        idleUntilPhase: 2,
        spawnPosition: { x: 250, y: 450 },
      },
    ],
    boss: 'SHADE_OF_AKAMA',
    bossSpawnPosition: { x: 1100, y: 450 },
    warlocks: {
      count: 6,
      circleRadius: 120,
      centerEntityId: 'shade',
    },
    // Phase 2 spawning (activated when all warlocks die)
    spawning: {
      mode: 'continuous',
      interval: 3000,
      countPerWave: [1, 2],
      maxAliveAtOnce: 8,
      activeInPhase: 2,
      enemyTypes: [
        { type: 'grunt',  weight: 3 },
        { type: 'archer', weight: 1 },
        { type: 'brute',  weight: 1 },
        { type: 'healer', weight: 1 },
      ],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.06 },
      damageMult: { base: 1.0, perPlayer: 0.04 },
      spawnMult:  { base: 1.0, perPlayer: 0.08 },
    },
  },

  // ── Level 5: Illidan Stormrage (Placeholder) ─────────────────────────
  {
    id: 'level_5',
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
