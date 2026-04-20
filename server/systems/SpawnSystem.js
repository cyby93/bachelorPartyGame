/**
 * server/systems/SpawnSystem.js
 * Reads a level's spawning config and produces enemies on a timer.
 *
 * Supports two modes:
 *  - 'continuous' (default): timer-based spawning from edges or near a position
 *  - 'wave': discrete waves where all enemies must die before the next wave begins
 *
 * Applies difficulty multipliers (scaled by player count) to enemy stats at
 * spawn time so the base EnemyTypeConfig stays clean.
 */

import { GAME_CONFIG }   from '../../shared/GameConfig.js'
import { ENEMY_TYPES }   from '../../shared/EnemyTypeConfig.js'
import ServerEnemy        from '../entities/ServerEnemy.js'

export default class SpawnSystem {
  /**
   * @param {object}  levelConfig   – the current level entry from CAMPAIGN
   * @param {number}  playerCount   – non-host player count at level start
   */
  constructor(levelConfig, playerCount) {
    this.config      = levelConfig.spawning
    this.difficulty  = levelConfig.difficulty ?? {}
    this.playerCount = Math.max(playerCount, 1)
    this.arenaWidth  = levelConfig.arena?.width ?? GAME_CONFIG.CANVAS_WIDTH
    this.arenaHeight = levelConfig.arena?.height ?? GAME_CONFIG.CANVAS_HEIGHT
    this._lastSpawn  = 0

    // Track only this system's own alive enemies — independent of building-spawned enemies
    this._ownedEnemyIds = new Set()

    // Pre-compute multipliers once per level
    this._hpMult     = this._mult(this.difficulty.hpMult)
    this._damageMult = this._mult(this.difficulty.damageMult)
    this._spawnMult  = this._mult(this.difficulty.spawnMult)   // scales interval (frequency)
    this._countMult  = this._mult(this.difficulty.countMult)   // scales count per spawn event

    // Mode detection
    this.mode = this.config?.mode ?? 'continuous'

    // Build weighted type table for fast random selection (continuous mode)
    this._typeTable  = this._buildTypeTable()

    // ── Wave mode state ──────────────────────────────────────────────────
    if (this.mode === 'wave') {
      this.waveCount       = this.config.waveCount ?? 8
      this.currentWave     = 0          // 0 = not started yet
      this.waveEnemiesAlive = 0
      this.betweenWaveDelay = this.config.betweenWaveDelayMs ?? 3000
      this._waveCleared     = true      // triggers first wave spawn
      this._waveClearedAt   = 0
      this.allWavesComplete = false
      this._progression     = this.config.progression ?? []
      // 'random2' edge: two edges chosen fresh each wave, stored here
      this._waveEdges       = null
    }

    // ── Phase gating (for Level 4 — only spawn in certain boss phases) ──
    this.activeInPhase = this.config?.activeInPhase ?? null
    this._phaseActive  = this.activeInPhase === null  // null = always active

    // ── Gate-phase spawn points (for Level 3 — spawn points change when a gate dies) ──
    this._spawnPhases    = this.config?.spawnPhases ?? null   // array of { phase, spawnPoints }
    this._activeSpawnPhase = 1                                // starts at phase 1
  }

  /** Returns the scaling multiplier for a given difficulty dimension. */
  _mult(dim) {
    if (!dim) return 1
    return (dim.base ?? 1) + (dim.perPlayer ?? 0) * (this.playerCount - 1)
  }

  /** Expand weighted enemy types into a flat lookup array. */
  _buildTypeTable() {
    if (!this.config?.enemyTypes?.length) return ['felGuard']
    const table = []
    for (const entry of this.config.enemyTypes) {
      const w = entry.weight ?? 1
      for (let i = 0; i < w; i++) table.push(entry.type)
    }
    return table
  }

  /**
   * Notify the spawn system that a boss phase has changed.
   * Used for phase-gated spawning (e.g., Level 4 Phase 2).
   */
  setPhase(phase) {
    if (this.activeInPhase === null) return
    this._phaseActive = (phase >= this.activeInPhase)
  }

  /**
   * Switch the active spawn-point phase (used for gate-destruction events, e.g., Level 3).
   * @param {number} phase – the new phase number to activate
   */
  setSpawnPhase(phase) {
    if (!this._spawnPhases) return
    this._activeSpawnPhase = phase
  }

  /**
   * Call once per server tick.
   * @param {number} now          – Date.now()
   * @param {Map}    enemies      – live enemies map
   * @param {object} idSeqRef     – object with `value` property for id counter
   * @param {object} [spawnPos]   – optional { x, y } to spawn near (e.g., active gate)
   * @returns {ServerEnemy[]}       newly spawned enemies (caller adds to map)
   */
  tick(now, enemies, idSeqRef, spawnPos) {
    if (!this.config) return []
    if (!this._phaseActive) return []

    if (this.mode === 'wave') {
      return this._tickWave(now, enemies, idSeqRef)
    }
    return this._tickContinuous(now, enemies, idSeqRef, spawnPos)
  }

  // ── Continuous mode ───────────────────────────────────────────────────

  _tickContinuous(now, enemies, idSeqRef, spawnPos) {
    const interval = this.config.interval / this._spawnMult
    if (now - this._lastSpawn < interval) return []
    this._lastSpawn = now

    // Prune owned set — remove any ids no longer alive in the global map
    for (const id of this._ownedEnemyIds) {
      if (!enemies.has(id)) this._ownedEnemyIds.delete(id)
    }

    const maxAlive = Math.ceil((this.config.maxAliveAtOnce ?? 15) * this._spawnMult)
    // Use own counter so building-spawned enemies don't eat into our cap
    if (this._ownedEnemyIds.size >= maxAlive) return []

    const [minCount, maxCount] = this.config.countPerWave ?? [1, 3]
    const scaledMin = Math.ceil(minCount * this._countMult)
    const scaledMax = Math.ceil(maxCount * this._countMult)
    const count = Math.floor(Math.random() * (scaledMax - scaledMin + 1)) + scaledMin

    const spawned = []
    for (let i = 0; i < count; i++) {
      if (this._ownedEnemyIds.size + spawned.length >= maxAlive) break

      const typeName = this._typeTable[Math.floor(Math.random() * this._typeTable.length)]
      const base     = ENEMY_TYPES[typeName]
      if (!base) continue

      // Resolve active spawn points — spawnPhases override static spawnPoints
      const activePhasePts = this._spawnPhases
        ?.find(p => p.phase === this._activeSpawnPhase)
        ?.spawnPoints
      const pts = activePhasePts ?? this.config.spawnPoints
      let x, y
      if (pts?.length) {
        const pt = pts[Math.floor(Math.random() * pts.length)]
        const res = this._randomNearPos(pt.x, pt.y, this.config.spawnRadius ?? 60)
        x = res.x; y = res.y
      } else if (spawnPos) {
        const res = this._randomNearPos(spawnPos.x, spawnPos.y, this.config.spawnRadius ?? 150)
        x = res.x; y = res.y
      } else {
        const res = this._edgePos(this.config.spawnEdge, 30)
        x = res.x; y = res.y
      }

      const enemy = this._createEnemy(idSeqRef, typeName, base, x, y)
      spawned.push(enemy)
      this._ownedEnemyIds.add(enemy.id)
    }

    return spawned
  }

  // ── Wave mode ─────────────────────────────────────────────────────────

  _tickWave(now, enemies, idSeqRef) {
    if (this.allWavesComplete) return []

    // Count non-training-dummy enemies from current wave
    if (this.currentWave > 0 && this.waveEnemiesAlive > 0) {
      // Count is decremented externally via onEnemyDied()
      return []
    }

    // All enemies from previous wave are dead
    if (this.currentWave > 0 && !this._waveCleared) {
      this._waveCleared = true
      this._waveClearedAt = now
    }

    // Check if all waves done
    if (this.currentWave >= this.waveCount) {
      this.allWavesComplete = true
      return []
    }

    // Wait for between-wave delay
    if (this._waveCleared && this.currentWave > 0) {
      if (now - this._waveClearedAt < this.betweenWaveDelay) return []
    }

    // Spawn next wave
    this.currentWave++
    this._waveCleared = false

    const prog = this._getProgression(this.currentWave)
    const [minCount, maxCount] = prog.countRange
    const scaledMin = Math.ceil(minCount * this._countMult)
    const scaledMax = Math.ceil(maxCount * this._countMult)
    const count = Math.floor(Math.random() * (scaledMax - scaledMin + 1)) + scaledMin

    // 'random2': pick two fresh edges for this wave — all enemies spawn from those sides
    if (this.config.spawnEdge === 'random2') {
      const all = ['top', 'bottom', 'left', 'right']
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]]
      }
      this._waveEdges = all.slice(0, 2)
    }

    // Build type table from this wave's available types
    const waveTypeTable = []
    for (const typeName of prog.enemyTypes) {
      const base = ENEMY_TYPES[typeName]
      if (!base) continue
      // Use existing weights from the full config if available, else weight 1
      const configEntry = this.config.enemyTypes?.find(e => e.type === typeName)
      const w = configEntry?.weight ?? 1
      for (let i = 0; i < w; i++) waveTypeTable.push(typeName)
    }
    if (waveTypeTable.length === 0) waveTypeTable.push('felGuard')

    const spawned = []
    for (let i = 0; i < count; i++) {
      const typeName = waveTypeTable[Math.floor(Math.random() * waveTypeTable.length)]
      const base     = ENEMY_TYPES[typeName]
      if (!base) continue

      const { x, y } = this._edgePos(this.config.spawnEdge, 30)
      const enemy = this._createEnemy(idSeqRef, typeName, base, x, y)
      spawned.push(enemy)
    }

    this.waveEnemiesAlive = spawned.length
    console.log(`[~] Wave ${this.currentWave}/${this.waveCount}: spawned ${spawned.length} enemies`)

    return spawned
  }

  /** Find the progression entry for the given wave number. */
  _getProgression(wave) {
    let best = this._progression[0] ?? { enemyTypes: ['felGuard'], countRange: [3, 4] }
    for (const entry of this._progression) {
      if (wave >= entry.fromWave) best = entry
    }
    return best
  }

  /** Notify that an enemy has died (called by GameServer). */
  onEnemyDied(enemyId) {
    if (this.mode === 'wave') {
      this.waveEnemiesAlive = Math.max(0, this.waveEnemiesAlive - 1)
    }
    // Remove from owned set so the slot becomes available for continuous spawning
    if (enemyId != null) this._ownedEnemyIds.delete(enemyId)
  }

  // ── Enemy factory ─────────────────────────────────────────────────────

  /**
   * Create an enemy with difficulty-scaled stats.
   * @param {object}  idSeqRef  – { value } counter
   * @param {string}  typeName  – enemy type key
   * @param {object}  base      – base stats from ENEMY_TYPES
   * @param {number}  x
   * @param {number}  y
   * @param {object}  [overrides] – optional stat overrides (e.g., for split children)
   */
  createEnemy(idSeqRef, typeName, x, y, overrides = {}) {
    const base = ENEMY_TYPES[typeName]
    if (!base) return null
    return this._createEnemy(idSeqRef, typeName, base, x, y, overrides)
  }

  _createEnemy(idSeqRef, typeName, base, x, y, overrides = {}) {
    const id = ++idSeqRef.value

    const hp            = overrides.hp            ?? Math.round(base.hp * this._hpMult)
    const contactDamage = overrides.contactDamage  ?? Math.round(base.contactDamage * this._damageMult)
    const speed         = overrides.speed          ?? base.speed
    const radius        = overrides.radius         ?? base.radius

    const enemy = new ServerEnemy({
      id,
      x,
      y,
      type:          typeName,
      hp,
      maxHp:         hp,
      speed,
      radius,
      contactDamage,
      generation:    overrides.generation ?? 0,
    })
    enemy.setArenaSize(this.arenaWidth, this.arenaHeight)

    return enemy
  }

  // ── Position helpers ──────────────────────────────────────────────────

  _edgePos(edge, margin) {
    const W = this.arenaWidth
    const H = this.arenaHeight

    if (edge === 'right') {
      return { x: W - margin, y: margin + Math.random() * (H - 2 * margin) }
    }
    if (edge === 'left') {
      return { x: margin, y: margin + Math.random() * (H - 2 * margin) }
    }
    if (edge === 'top') {
      return { x: margin + Math.random() * (W - 2 * margin), y: margin }
    }
    if (edge === 'bottom') {
      return { x: margin + Math.random() * (W - 2 * margin), y: H - margin }
    }

    // 'random2': use the two edges chosen at wave-start (falls back to full random)
    if (edge === 'random2') {
      const edges = this._waveEdges ?? ['left', 'right']
      return this._edgePos(edges[Math.floor(Math.random() * edges.length)], margin)
    }

    // 'all' or anything else — random edge
    return this._randomEdgePos(margin)
  }

  _randomEdgePos(margin) {
    const W = this.arenaWidth
    const H = this.arenaHeight
    const edge = Math.floor(Math.random() * 4)

    switch (edge) {
      case 0: return { x: margin + Math.random() * (W - 2 * margin), y: margin }
      case 1: return { x: margin + Math.random() * (W - 2 * margin), y: H - margin }
      case 2: return { x: margin, y: margin + Math.random() * (H - 2 * margin) }
      default: return { x: W - margin, y: margin + Math.random() * (H - 2 * margin) }
    }
  }

  _randomNearPos(cx, cy, radius) {
    const angle = Math.random() * Math.PI * 2
    const dist  = Math.random() * radius
    const x = Math.max(30, Math.min(this.arenaWidth  - 30, cx + Math.cos(angle) * dist))
    const y = Math.max(30, Math.min(this.arenaHeight - 30, cy + Math.sin(angle) * dist))
    return { x, y }
  }
}
