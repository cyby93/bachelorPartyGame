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
 *  { type: 'killCount',  target: 10, enemyTypes: ['coilskarHarpooner'] } — kill 10 archers
 *  { type: 'survive',    durationMs: 60000 }             — survive 60 seconds
 *  { type: 'killBoss' }                                  — defeat the level's boss
 *  { type: 'surviveWaves' }                              — clear all discrete waves
 *  { type: 'destroyGates' }                              — destroy all gates
 *  { type: 'destroyBuildings' }                          — destroy all buildings
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

import { BALANCE } from './BalanceConfig.js'

const R = BALANCE.RANGED_BASE_DPS
const X = BALANCE.ENEMY_HP_MULT

export const CAMPAIGN = [
  // ── Level 1: Survive the Waves ────────────────────────────────────────
  {
    id: 'level_1',
    name: 'The Courtyard',
    audio: {
      music: 'music_level_1_courtyard',
    },
    arena: { width: 1024, height: 768 },
    objectives: [
      { type: 'surviveWaves' },
    ],
    spawning: {
      mode: 'wave',
      waveCount: 5,
      betweenWaveDelayMs: 3000,
      // 'random2' — server picks 2 random edges per wave so the horde
      // is grouped and players can't predict which sides to watch.
      // ⚠ Requires server-side support: on each wave start, randomly
      //   select 2 of ['top','bottom','left','right'] and spawn from those only.
      spawnEdge: 'random2',
      progression: [
        { fromWave: 1, enemyTypes: ['felGuard', 'coilskarHarpooner'],
          countRange: [3, 4] },
        { fromWave: 2, enemyTypes: ['felGuard', 'coilskarHarpooner', 'bonechewerBrute', 'ashtonghueMystic'],
          countRange: [5, 6] },
        { fromWave: 3, enemyTypes: ['felGuard', 'coilskarHarpooner', 'bonechewerBrute', 'ashtonghueMystic'],
          countRange: [7, 8] },
        { fromWave: 4, enemyTypes: ['felGuard', 'coilskarHarpooner', 'bonechewerBrute', 'ashtonghueMystic', 'coilskarSerpentGuard', 'bloodProphet', 'illidariCenturion'],
          countRange: [9, 10] },
      ],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.05 },
      damageMult: { base: 1.0, perPlayer: 0.05 },
      spawnMult:  { base: 1.0, perPlayer: 0.10 },
      countMult:  { base: 1.0, perPlayer: 0.05 },
    },
    boss: null,
  },

  // ── Level 2: The Siege (Destroy the Buildings) ────────────────────────
  {
    id: 'level_2',
    name: 'The Siege',
    audio: {
      music: 'music_level_2_siege',
    },
    arena: { width: 1400, height: 1000 },
    objectives: [
      { type: 'destroyBuildings' },
    ],
    buildings: [
      { id: 'b1', position: { x: 80, y: 80 }, hp: Math.round(12 * X * R), width: 60, height: 60 },
      { id: 'b2', position: { x: 1320, y: 80 }, hp: Math.round(12 * X * R), width: 60, height: 60 },
      { id: 'b3', position: { x: 80, y: 920 }, hp: Math.round(12 * X * R), width: 60, height: 60 },
      { id: 'b4', position: { x: 1320, y: 920 }, hp: Math.round(12 * X * R), width: 60, height: 60 },
    ],
    // Portal beam mechanic: two buildings link via a mirror every 10 seconds.
    // 3-second warning phase, then damage phase. Cyby will tune damage values.
    // mirrors?: [{ id: string, position: { x: number, y: number } }]
    mirrors: [
      { id: 'm1', position: { x: 700, y: 200 } },
      { id: 'm2', position: { x: 400, y: 500 } },
      { id: 'm3', position: { x: 1000, y: 500 } },
      { id: 'm4', position: { x: 700, y: 800 } },
    ],
    beamMechanic: {
      cycleMs:         10000,  // full cycle length (warning + damage combined)
      warningMs:       3000,   // warning phase duration before damage starts
      damageMs:        5000,   // how long the damage phase lasts
      damagePerSecond: 40,     // DPS to players caught in the beam rectangle
      beamWidth:       60,     // half-width of each beam rectangle
    },
    buildingSpawning: {
      baseInterval: 3000,          // ms between spawns per building
      countPerSpawn: [1, 2],       // min/max enemies per spawn event
      maxAlivePerBuilding: 1,      // cap per building
      buffFactor: 0.25,            // 25% faster spawns per destroyed building
      spawnRadius: 80,             // spawn distance from building center
      enemyTypes: [
        { type: 'felGuard',   weight: 4 },
        { type: 'bonechewerBrute',   weight: 2 },
        { type: 'coilskarHarpooner',  weight: 3 },
        { type: 'illidariCenturion', weight: 2 },
        { type: 'bonechewerBladeFury', weight: 2 },
        { type: 'ashtonghueMystic', weight: 2 },
        { type: 'bloodProphet', weight: 2 },
        { type: 'coilskarSerpentGuard', weight: 1 },
      ],
    },
    // Reinforcements pour in from all 4 edges — distinct from building-local
    // spawning and reinforces the "surrounded siege" feeling
    spawning: {
      mode: 'continuous',
      interval: 5000,
      countPerWave: [1, 2],
      maxAliveAtOnce: 1,
      spawnEdge: 'all',
      enemyTypes: [
        { type: 'felGuard',          weight: 3 },
        { type: 'coilskarHarpooner', weight: 2 },
        { type: 'bonechewerBrute',   weight: 2 },
],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.06 },
      damageMult: { base: 1.0, perPlayer: 0.05 },
      spawnMult:  { base: 1.0, perPlayer: 0.10 },
      countMult:  { base: 1.0, perPlayer: 0.05 },
    },
    boss: null,
  },

  // ── Level 3: Destroy the Gates ────────────────────────────────────────
  {
    id: 'level_3',
    name: 'The Black Temple Gates',
    audio: {
      music: 'music_level_3_gates',
    },
    arena: {
      width: 1100,
      height: 600,
      rooms: [
        // Left room: players start here. Full arena height. Widened to 730px.
        { id: 'left',  x: 0,   y: 0, width: 730, height: 600 },
        // Right room: narrowed to 330px so total stays 1100 (730 wall + 40 passage + 330 room).
        { id: 'right', x: 770, y: 0, width: 330, height: 600 },
      ],
      passages: [
        // Passage at right edge of left room, vertically centered in the 600px arena
        { id: 'passage1', fromRoom: 'left', toRoom: 'right', x: 730, y: 210, width: 40, height: 180, blockedByGate: 'gate1' },
      ],
    },
    objectives: [
      { type: 'destroyGates' },
    ],
    gates: [
      // Gate1 blocks passage1 — x=750 is center of 40px gap (730+20), y=300 is center of passage (210..390)
      { id: 'gate1', passageId: 'passage1', hp: Math.round(5 * X * R), position: { x: 750, y: 300 }, width: 40, height: 180 },
      // Gate2 at the far right edge of the right room — x=1062 center, y=300 matches gate1
      { id: 'gate2', passageId: null,       hp: Math.round(15 * X * R), position: { x: 1062, y: 300 }, width: 48, height: 180 },
    ],
    spawning: {
      mode: 'continuous',
      interval: 3000,
      countPerWave: [1, 3],
      maxAliveAtOnce: 10,
      spawnRadius: 60,
      enemyTypes: [
        { type: 'felGuard',          weight: 3 },
        { type: 'bonechewerBrute',   weight: 1 },
        { type: 'coilskarHarpooner', weight: 1 },
        { type: 'ashtonghueMystic',  weight: 1 },
        { type: 'ritualChanneler',   weight: 2 },
      ],
      // Phase-gated spawn points — server switches activeSpawnPhase when gate1 is destroyed.
      // phase 1: Gate 1 alive → spawn in Room 1 (left room) near gate1, top and bottom wall edges.
      // phase 2: Gate 1 destroyed → spawn in Room 2 (right room) on the left side (near where gate1 was).
      spawnPhases: [
        {
          phase: 1,
          spawnPoints: [
            { x: 690, y: 30  },   // Room 1, top wall edge, near gate1
            { x: 690, y: 570 },   // Room 1, bottom wall edge, near gate1
          ],
        },
        {
          phase: 2,
          spawnPoints: [
            { x: 1060, y: 30  },   // Room 2, top edge, right side (near gate2)
            { x: 1060, y: 570 },   // Room 2, bottom edge, right side (near gate2)
          ],
        },
      ],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.06 },
      damageMult: { base: 1.0, perPlayer: 0.06 },
      spawnMult:  { base: 1.0, perPlayer: 0.10 },
      countMult:  { base: 1.0, perPlayer: 0.05 },
    },
    boss: null,
  },

  // ── Level 4: The Leviathan ────────────────────────────────────────────
  {
    id: 'level_4',
    name: 'Serpentshrine Cavern',
    audio: {
      music: 'music_level_4_cavern',
    },
    arena: { width: 1400, height: 1000 },
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
      countMult:  { base: 1.0, perPlayer: 0.05 },
    },
    boss: null,
  },

  // ── Level 5: Shade of Akama ──────────────────────────────────────────
  {
    id: 'level_5',
    name: 'The Refectory',
    audio: {
      music: 'music_level_5_shade',
    },
    arena: { width: 1400, height: 900 },
    objectives: [
      { type: 'killBossProtectNPC', npcId: 'akama', bossId: 'shade' },
    ],
    npcs: [
      {
        id: 'akama',
        name: 'Akama',
        hp: Math.round(40 * X * R),   // 2000 at defaults — scales with R
        speed: 0.8,
        radius: 48,
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
      hp: Math.round(2.20 * X * R),   // tunable per-level warlock HP (falls back to EnemyTypeConfig if omitted)
    },
    // Ambient spawning throughout the encounter — active from phase 1
    spawning: {
      mode: 'continuous',
      interval: 3000,
      countPerWave: [1, 2],
      maxAliveAtOnce: 6,
      spawnEdge: 'all',
      enemyTypes: [
        { type: 'felGuard',          weight: 3 },
        { type: 'coilskarHarpooner', weight: 1 },
        { type: 'bonechewerBrute',   weight: 1 },
        { type: 'ashtonghueMystic',  weight: 1 },
      ],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.06 },
      damageMult: { base: 1.0, perPlayer: 0.04 },
      spawnMult:  { base: 1.0, perPlayer: 0.08 },
      countMult:  { base: 1.0, perPlayer: 0.05 },
    },

    // Entrance cinematic. Boss is immune until all lines have played.
    // After dialog completes, boss becomes vulnerable AND minionSpawning activates.
    // delayAfter: ms to wait after this line before showing the next.
    // TODO(Cyby): Replace [PLACEHOLDER] lines with final text.
    dialog: [
      { speaker: 'akama', text: '[PLACEHOLDER] Brothers, today we take back what was stolen from us.', voiceKey: 'voice_akama_shade_intro_01', delayAfter: 3500 },
      // { speaker: 'akama', text: '[PLACEHOLDER] The Shade has drained this place long enough. Fight with me!', voiceKey: 'voice_akama_shade_intro_02', delayAfter: 3500 },
      // { speaker: 'shade', text: '[PLACEHOLDER] You cannot kill what has already been consumed.', voiceKey: 'voice_shade_intro_01', delayAfter: 3000 },
    ],
  },

  // ── Level 6: Illidan Stormrage ────────────────────────────────────────
  {
    id: 'level_6',
    name: "Illidan's Sanctum",
    audio: {
      music: 'music_level_6_illidan',
    },
    arena: { width: 1440, height: 900 },
    objectives: [
      { type: 'killBoss' },
    ],
    // Adds (Flame of Azzinoth) are spawned programmatically by GameServer in Phase 2.
    spawning: null,
    // No ambient minionSpawning on Illidan — all adds are phase-scripted (Flames, Shadow Demons).
    minionSpawning: null,
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.10 },  // +10%/player → ×2.2 at 13p (brainstorm derivation)
      damageMult: { base: 1.0, perPlayer: 0.06 },
      // countMult not applicable — Illidan adds are spawned programmatically, not via SpawnSystem
      spawnMult:  { base: 1.0, perPlayer: 0.0  },
    },
    boss: 'ILLIDAN',

    // Entrance cinematic. Boss is immune until all lines have played.
    // After dialog completes, boss becomes vulnerable.
    // TODO(Cyby): Replace [PLACEHOLDER] lines with final Illidan text.
    dialog: [
      { speaker: 'illidan', text: '[PLACEHOLDER] You are not prepared!', voiceKey: 'voice_illidan_intro_01', delayAfter: 3500 },
      // { speaker: 'illidan', text: '[PLACEHOLDER] I have waited ten thousand years for this.', voiceKey: 'voice_illidan_intro_02', delayAfter: 3500 },
      // { speaker: 'akama', text: '[PLACEHOLDER] I have watched you waste away, Illidan.', voiceKey: 'voice_akama_illidan_intro_01', delayAfter: 3000 },
    ],

  },
]

export const DEBUG_TEST_LEVEL = {
  id: 'debug_test_level',
  name: 'Enemy Sandbox',
  debugSandbox: true,
  audio: {
    music: 'music_debug_sandbox',
  },
  arena: { width: 1400, height: 900 },
  objectives: [],
  spawning: null,
  difficulty: {
    hpMult:     { base: 1.0, perPlayer: 0.05 },
    damageMult: { base: 1.0, perPlayer: 0.05 },
    spawnMult:  { base: 1.0, perPlayer: 0.0 },
    countMult:  { base: 1.0, perPlayer: 0.0 },
  },
  boss: null,
}

export const LEVEL_SELECT_OPTIONS = [...CAMPAIGN, DEBUG_TEST_LEVEL]
