/**
 * server/systems/SpawnSystem.js
 * Reads a level's spawning config and produces enemies on a timer.
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

    // Pre-compute multipliers once per level
    this._hpMult     = this._mult(this.difficulty.hpMult)
    this._damageMult = this._mult(this.difficulty.damageMult)
    this._spawnMult  = this._mult(this.difficulty.spawnMult)

    // Build weighted type table for fast random selection
    this._typeTable  = this._buildTypeTable()
  }

  /** Returns the scaling multiplier for a given difficulty dimension. */
  _mult(dim) {
    if (!dim) return 1
    return (dim.base ?? 1) + (dim.perPlayer ?? 0) * (this.playerCount - 1)
  }

  /** Expand weighted enemy types into a flat lookup array. */
  _buildTypeTable() {
    if (!this.config?.enemyTypes?.length) return ['grunt']
    const table = []
    for (const entry of this.config.enemyTypes) {
      const w = entry.weight ?? 1
      for (let i = 0; i < w; i++) table.push(entry.type)
    }
    return table
  }

  /**
   * Call once per server tick.
   * @param {number} now          – Date.now()
   * @param {Map}    enemies      – live enemies map
   * @param {object} idSeqRef     – object with `value` property for id counter
   * @returns {ServerEnemy[]}       newly spawned enemies (caller adds to map)
   */
  tick(now, enemies, idSeqRef) {
    if (!this.config) return []

    const interval = this.config.interval / this._spawnMult
    if (now - this._lastSpawn < interval) return []
    this._lastSpawn = now

    const maxAlive = Math.ceil((this.config.maxAliveAtOnce ?? 15) * this._spawnMult)
    if (enemies.size >= maxAlive) return []

    const [minCount, maxCount] = this.config.countPerWave ?? [1, 3]
    const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount

    const spawned = []
    for (let i = 0; i < count; i++) {
      if (enemies.size + spawned.length >= maxAlive) break

      const typeName = this._typeTable[Math.floor(Math.random() * this._typeTable.length)]
      const base     = ENEMY_TYPES[typeName]
      if (!base) continue

      const { x, y } = this._randomEdgePos(30)
      const id = ++idSeqRef.value

      const enemy = new ServerEnemy({
        id,
        x,
        y,
        type:          typeName,
        hp:            Math.round(base.hp * this._hpMult),
        maxHp:         Math.round(base.hp * this._hpMult),
        speed:         base.speed,
        radius:        base.radius,
        contactDamage: Math.round(base.contactDamage * this._damageMult),
      })
      enemy.setArenaSize(this.arenaWidth, this.arenaHeight)

      spawned.push(enemy)
    }

    return spawned
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
}
