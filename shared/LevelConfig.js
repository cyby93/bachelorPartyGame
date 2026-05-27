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

const L2_BUILDING_SIZE = 90
const L2_MAP_WIDTH = 1400
const L2_MAP_HEIGHT = 1000
const L2_MAP_PADDING = 130
const L2_BUILDING_POSITIONS = [
  { x: L2_MAP_PADDING, y: L2_MAP_PADDING },
  { x: L2_MAP_WIDTH - L2_MAP_PADDING, y: L2_MAP_PADDING },
  { x: L2_MAP_PADDING, y: L2_MAP_HEIGHT - L2_MAP_PADDING },
  { x: L2_MAP_WIDTH - L2_MAP_PADDING, y: L2_MAP_HEIGHT - L2_MAP_PADDING },
]
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
        { fromWave: 1, enemyTypes: ['felGuard', 'bonechewerBrute'],
          countRange: [3, 4] },
        { fromWave: 2, enemyTypes: ['felGuard', 'coilskarHarpooner', 'bonechewerBrute'],
          countRange: [5, 6] },
        { fromWave: 3, enemyTypes: ['felGuard', 'coilskarHarpooner', 'bonechewerBrute', 'illidariCenturion'],
          countRange: [6, 8] },
        { fromWave: 4, enemyTypes: ['felGuard', 'coilskarHarpooner', 'ashtonghueMystic', 'bloodProphet', 'illidariCenturion'],
          countRange: [8, 10] },
        { fromWave: 5, enemyTypes: ['felGuard', 'coilskarHarpooner', 'bonechewerBrute', 'ashtonghueMystic', 'coilskarSerpentGuard', 'bloodProphet', 'illidariCenturion'],
          countRange: [10, 12] },
      ],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.05 },
      damageMult: { base: 1.0, perPlayer: 0.05 },
      spawnMult:  { base: 1.0, perPlayer: 0.10 },
      countMult:  { base: 1.0, perPlayer: 0.05 },
    },
    transition: {
      opening: {
        fadeInMs: 1200,
        walkInMs: 2500,
        enemySpawnDelayMs: 2000,
      },
      closing: {
        fadeOutMs: 1500,
        walkOutMs: 2000,
        steps: [
          { type: 'delay', ms: 2200 },
        ],
      },
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
    arena: { width: L2_MAP_WIDTH, height: L2_MAP_HEIGHT },
    objectives: [
      { type: 'destroyBuildings' },
    ],
    buildings: [
      { id: 'b1', position: L2_BUILDING_POSITIONS[0], hp: Math.round(8 * X * R), width: L2_BUILDING_SIZE, height: L2_BUILDING_SIZE, spriteKey: 'portal_building' },
      { id: 'b2', position: L2_BUILDING_POSITIONS[1], hp: Math.round(8 * X * R), width: L2_BUILDING_SIZE, height: L2_BUILDING_SIZE, spriteKey: 'portal_building' },
      { id: 'b3', position: L2_BUILDING_POSITIONS[2], hp: Math.round(8 * X * R), width: L2_BUILDING_SIZE, height: L2_BUILDING_SIZE, spriteKey: 'portal_building' },
      { id: 'b4', position: L2_BUILDING_POSITIONS[3], hp: Math.round(8 * X * R), width: L2_BUILDING_SIZE, height: L2_BUILDING_SIZE, spriteKey: 'portal_building' },
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
      baseInterval: 6000,          // ms between spawns per building
      countPerSpawn: [1, 3],       // min/max enemies per spawn event
      maxTotalAlive: 8,            // total cap shared across alive buildings — redistributes on death
      buffFactor: 0.10,            // 25% faster spawns per destroyed building
      spawnRadius: 120,             // spawn distance from building center
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
      interval: 4000,
      countPerWave: [1, 2],
      maxAliveAtOnce: 3,
      spawnEdge: 'all',
      enemyTypes: [
        { type: 'felGuard',          weight: 4 },
        { type: 'coilskarHarpooner', weight: 1 },
        { type: 'bonechewerBrute',   weight: 1 },
],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.06 },
      damageMult: { base: 1.0, perPlayer: 0.05 },
      spawnMult:  { base: 1.0, perPlayer: 0.10 },
      countMult:  { base: 1.0, perPlayer: 0.05 },
    },
    transition: {
      opening: {
        fadeInMs: 1200,
        walkInMs: 2500,
        enemySpawnDelayMs: 2000,
      },
      closing: {
        fadeOutMs: 1500,
        walkOutMs: 2000,
        steps: [
          { type: 'delay', ms: 2200 },
        ],
      },
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
      { id: 'gate1', passageId: 'passage1', hp: Math.round(4 * X * R), position: { x: 750, y: 300 }, width: 40, height: 180, spriteKey: 'gate_blacktemple' },
      // Gate2 at the far right edge of the right room — x=1062 center, y=300 matches gate1
      { id: 'gate2', passageId: null,       hp: Math.round(8 * X * R), position: { x: 1062, y: 300 }, width: 48, height: 180, spriteKey: 'gate_blacktemple' },
    ],
    boulderMechanic: {
      cycleMs:         16000,  // full cycle: rest + charge + roll
      chargingMs:       4000,  // warning/charge phase before boulders move
      rollingMs:        2000,  // boulders cross the 600px arena in this time
      restMs:          10000,  // downtime after a roll before next cycle
      damage:             80,  // HP per boulder hit
      slowMultiplier:    0.5,  // 50% speed for 4s
      slowDurationMs:   4000,
      boulderRadius:      28,  // px — server-authoritative collision radius
      columnWidth:        60,  // px — 12 columns left room, 5 columns right room
      rooms: [
        { roomId: 'left',  xStart: 0,   xEnd: 730 },
        { roomId: 'right', xStart: 770, xEnd: 1100, requiresGate1Dead: true },
      ],
    },
    spawning: {
      mode: 'continuous',
      interval: 6000,
      countPerWave: [1, 3],
      maxAliveAtOnce: 6,
      spawnRadius: 50,
      enemyTypes: [
        { type: 'felGuard',          weight: 3 },
        { type: 'bonechewerBrute',   weight: 1 },
        { type: 'coilskarHarpooner', weight: 2 },
        { type: 'ashtonghueMystic',  weight: 1 },
        { type: 'ritualChanneler',   weight: 2 },
      ],
      // Phase 1: only the two left spawn points (Room 1). After gate1 is destroyed,
      // SpawnSystem advances to phase 2 and all 4 points become active.
      spawnPhases: [
        { phase: 1, spawnPoints: [
          { x: 690, y: 30  },   // Room 1, top wall edge, near gate1
          { x: 690, y: 570 },   // Room 1, bottom wall edge, near gate1
        ]},
        { phase: 2, spawnPoints: [
          { x: 690, y: 30  },   // Room 1, top
          { x: 690, y: 570 },   // Room 1, bottom
          { x: 1060, y: 30  },  // Room 2, top
          { x: 1060, y: 570 },  // Room 2, bottom
        ]},
      ],
    },
    difficulty: {
      hpMult:     { base: 1.0, perPlayer: 0.06 },
      damageMult: { base: 1.0, perPlayer: 0.06 },
      spawnMult:  { base: 1.0, perPlayer: 0.10 },
      countMult:  { base: 1.0, perPlayer: 0.05 },
    },
    transition: {
      opening: {
        fadeInMs: 1500,
        walkInMs: 2500,
        enemySpawnDelayMs: 2000,
      },
      closing: {
        fadeOutMs: 1500,
        walkOutMs: 2000,
        steps: [
          { type: 'delay', ms: 2200 },
        ],
      },
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
    transition: {
      opening: {
        fadeInMs: 1500,
        walkInMs: 2500,
        // Leviathan activates 2s after players finish walking in
        initialEnemyDelayMs: 2000,
      },
      closing: {
        fadeOutMs: 1800,
        walkOutMs: 2000,
        steps: [
          { type: 'delay', ms: 2500 },
        ],
      },
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
        speed: 0.5,
        radius: 62,
        meleeDamage: 40,
        attackCooldown: 1000,
        attackRange: 200,
        target: 'shade',
        idleUntilPhase: 2,
        spawnPosition: { x: 350, y: 450 },
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
    // Ambient spawning — deferred until the opening dialog completes so the
    // cinematic plays uninterrupted. Activated by GameServer when dialog ends.
    minionSpawning: {
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
      { speaker: 'shade', text: 'I live again', voiceKey: 'voice_akama_shade_intro_01', delayAfter: 4000 },
      { speaker: 'akama', text: 'Slay all who see us. Word must not get back to Illidan!', voiceKey: 'voice_akama_shade_intro_02', delayAfter: 6000 },
      { speaker: 'shade', text: 'My soul consumed by hate!', voiceKey: 'voice_akama_shade_intro_03', delayAfter: 4500 },
      { speaker: 'shade', text: 'Die!!', voiceKey: 'voice_akama_shade_intro_04', delayAfter: 3000 },
    ],
    transition: {
      opening: {
        fadeInMs: 2000,
        walkInMs: 2500,
      },
      closing: {
        fadeOutMs: 2000,
        walkOutMs: 2000,
        steps: [
          { type: 'delay', ms: 2800 },
        ],
      },
    },
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
    bossSpawnPosition: { x: 820, y: 450 },
    bossInitialAngle: Math.PI,   // face west (toward Akama on the left)

    // Akama stands on the left side for the opening dialog — decorative, does not fight.
    npcs: [
      {
        id:             'akama',
        name:           'Akama',
        hp:             Math.round(40 * X * R),
        speed:          0.8,
        radius:         62,
        meleeDamage:    15,
        attackCooldown: 1500,
        attackRange:    200,
        target:         null,     // decorative — does not attack Illidan
        initialAngle:   0,        // face east (toward Illidan)
        spawnPosition:  { x: 320, y: 450 },
        isHealable:     false,    // players should not waste heals on Akama in this level
      },
    ],
    visualBounds: { height: 1150 }, // extra vertical room for Illidan's large sprite near arena edges

    // Entrance cinematic. Boss is immune until all lines have played.
    // After dialog completes, boss becomes vulnerable.
    // TODO(Cyby): Replace [PLACEHOLDER] lines with final Illidan text.
    dialog: [
      { 
        speaker: 'illidan', 
        text: 'Akama. Your duplicity is hardly surprising. I should have slaughtered you and your malformed brethren long ago.', 
        voiceKey: 'voice_illidan_intro_01', 
        delayAfter: 14000 
      },
      { 
        speaker: 'akama', 
        text: 'We"ve come to end your reign, Illidan. My people and all of Outland shall be free!', 
        voiceKey: 'voice_akama_intro_02', 
        delayAfter: 10000 
      },
      { 
        speaker: 'illidan', 
        text: 'Boldly said. But I remain...unconvinced.', 
        voiceKey: 'voice_illidan_intro_03', 
        delayAfter: 8000 
      },
      { 
        speaker: 'akama', 
        text: 'The time has come! The moment is at hand!', 
        voiceKey: 'voice_akama_intro_04', 
        delayAfter: 4000 
      },
      { 
        speaker: 'illidan', 
        text: 'You are not prepared!', 
        voiceKey: 'voice_illidan_intro_05', 
        delayAfter: 5000 
      },
    ],
    
    transition: {
      opening: {
        fadeInMs: 2500,
        walkInMs: 2500,
      },
      closing: {
        fadeOutMs: 2500,
        walkOutMs: 2000,
        steps: [
          { type: 'delay', ms: 3500 },
        ],
      },
    },
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
