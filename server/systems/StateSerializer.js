/**
 * server/systems/StateSerializer.js
 * Serializes GameServer state into client-bound payloads.
 *
 * Two contracts:
 *   buildFullState(gs)        — INIT payload sent to a joining/reconnecting player
 *   buildDeltaState(gs)       — STATE_DELTA payload broadcast every tick
 *
 * Helper DTOs are exported for use in other GameServer call sites (e.g. _startLevel).
 *
 * All functions take `gs` (GameServer instance) and return plain objects — no
 * side effects, no mutations. Keeping them outside GameServer makes the
 * server→client contract explicit and independently auditable.
 */

import { GAME_CONFIG } from '../../shared/GameConfig.js'
import { CAMPAIGN }    from '../../shared/LevelConfig.js'

// ── Exported helper DTOs ─────────────────────────────────────────────────────
// Used in both serialization functions and in _startLevel's _changeScene call.

export function gatesDTO(gs) {
  if (gs.gates.size === 0) return null
  const arr = []
  gs.gates.forEach(g => arr.push(g.toDTO()))
  return arr
}

export function buildingsDTO(gs) {
  if (gs.buildings.size === 0) return null
  const arr = []
  gs.buildings.forEach(b => arr.push(b.toDTO()))
  return arr
}

export function npcsDTO(gs) {
  if (gs.npcs.size === 0) return null
  const arr = []
  gs.npcs.forEach(n => arr.push(n.toDTO()))
  return arr
}

// ── Private helpers ──────────────────────────────────────────────────────────

function waveInfoDTO(gs) {
  if (gs.spawnSystem?.mode !== 'wave') return null
  return {
    currentWave: gs.spawnSystem.currentWave,
    totalWaves:  gs.spawnSystem.waveCount,
    allComplete: gs.spawnSystem.allWavesComplete,
  }
}

function eyeBeamsDTO(gs) {
  return gs._illidanEncounter?.getEyeBeamsDTO() ?? null
}

// ── Primary serializers ──────────────────────────────────────────────────────

/**
 * Full snapshot — sent once to a joining or reconnecting player via INIT.
 * Must include all persistent game state so the client can render immediately
 * without waiting for the first delta.
 */
export function buildFullState(gs) {
  const players = {}
  gs.players.forEach((p, id) => { players[id] = p.toDTO() })

  const enemies = []
  gs.enemies.forEach(e => { if (!e.isDead) enemies.push(e.toDTO()) })

  const minions = []
  gs.minions.forEach(m => { if (!m.isDead) minions.push(m.toDTO()) })

  return {
    // Scene and level identity
    scene:       gs.scene,
    levelId:     gs.currentLevel?.id ?? null,
    levelIndex:  gs.currentLevelIndex,
    levelNumber: gs.currentLevelIndex >= 0 ? gs.currentLevelIndex + 1 : null,
    totalLevels: gs.currentLevel?.debugSandbox ? 1 : CAMPAIGN.length,
    levelName:   gs.currentLevel?.name ?? null,
    debugSandbox: !!gs.currentLevel?.debugSandbox,
    arenaWidth:  gs.arenaWidth,
    arenaHeight: gs.arenaHeight,
    rooms:       gs.currentLevel?.arena?.rooms ?? [],
    passages:    gs.currentLevel?.arena?.passages ?? [],
    objectives:  gs.objectiveProgress,
    mirrors:     gs.currentLevel?.mirrors ?? [],

    // Player and entity state
    tick:      gs.tick,
    killCount: gs.killCount,
    players,
    boss:      gs.boss ? gs.boss.toDTO() : null,
    enemies,
    minions,

    // Structural entities
    gates:     gatesDTO(gs),
    buildings: buildingsDTO(gs),
    npcs:      npcsDTO(gs),

    // Live gameplay state — needed for mid-battle reconnects
    aoeZones: gs.skillSystem.getZonesDTO(),
    waveInfo: waveInfoDTO(gs),
    stats:    gs.levelStats,
  }
}

/**
 * Delta snapshot — broadcast every tick via STATE_DELTA.
 * Includes all fields that change frame-to-frame. Static fields (arena size,
 * level identity, room layout) are omitted — they're in the INIT payload.
 */
export function buildDeltaState(gs) {
  const players = {}
  gs.players.forEach((p, id) => { players[id] = p.toDeltaDTO() })

  const projectiles = []
  gs.projectiles.forEach(proj => {
    if (proj.isAlive) {
      projectiles.push({
        id:        proj.id,
        x:         Math.round(proj.x),
        y:         Math.round(proj.y),
        radius:    proj.radius,
        color:     proj.color,
        spriteKey: proj.spriteKey ?? null,
      })
    }
  })

  const enemies = []
  gs.enemies.forEach(e => { if (!e.isDead) enemies.push(e.toDTO()) })

  const tombstones = []
  gs.players.forEach(p => {
    if (!p.isDead || p.isHost) return
    const timer = gs.reviveTimers.get(p.id)
    tombstones.push({
      id:       p.id,
      x:        Math.round(p.x),
      y:        Math.round(p.y),
      progress: timer
        ? Math.min(1, (Date.now() - timer.startedAt) / GAME_CONFIG.REVIVE_TIME)
        : 0,
    })
  })

  const minions = []
  gs.minions.forEach(m => { if (!m.isDead) minions.push(m.toDTO()) })

  return {
    tick:             gs.tick,
    players,
    projectiles,
    enemies,
    boss:             gs.boss ? gs.boss.toDTO() : null,
    killCount:        gs.killCount,
    tombstones,
    stats:            gs.levelStats,
    aoeZones:         gs.skillSystem.getZonesDTO(),
    minions,
    gates:            gatesDTO(gs),
    buildings:        buildingsDTO(gs),
    npcs:             npcsDTO(gs),
    waveInfo:         waveInfoDTO(gs),
    eyeBeams:         eyeBeamsDTO(gs),
    illidanFireballs: gs._illidanEncounter?.getFireballsDTO() ?? [],
  }
}
