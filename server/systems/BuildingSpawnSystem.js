/**
 * server/systems/BuildingSpawnSystem.js
 * Spawns enemies near alive buildings on independent timers.
 *
 * As buildings are destroyed, surviving buildings spawn faster
 * (controlled by buffFactor config).
 */

import { ENEMY_TYPES }  from '../../shared/EnemyTypeConfig.js'
import ServerEnemy       from '../entities/ServerEnemy.js'

export default class BuildingSpawnSystem {
  /**
   * @param {object} config       – buildingSpawning block from LevelConfig
   * @param {object} difficulty   – difficulty block from LevelConfig
   * @param {number} playerCount  – number of non-host players
   * @param {number} arenaWidth
   * @param {number} arenaHeight
   */
  constructor(config, difficulty, playerCount, arenaWidth, arenaHeight) {
    this.config      = config
    this.arenaWidth  = arenaWidth
    this.arenaHeight = arenaHeight

    const pc = Math.max(playerCount, 1)
    this._hpMult     = this._mult(difficulty.hpMult, pc)
    this._damageMult = this._mult(difficulty.damageMult, pc)
    this._spawnMult  = this._mult(difficulty.spawnMult, pc)   // scales interval
    this._countMult  = this._mult(difficulty.countMult, pc)   // scales count per spawn + cap

    // Per-building spawn timers: buildingId → lastSpawnTime
    this._lastSpawn = new Map()

    // Track which enemies belong to which building: enemyId → buildingId
    this._enemyOwner = new Map()

    // Count alive enemies per building: buildingId → count
    this._aliveCount = new Map()

    // Build weighted type table
    this._typeTable = this._buildTypeTable()
  }

  _mult(dim, pc) {
    if (!dim) return 1
    return (dim.base ?? 1) + (dim.perPlayer ?? 0) * (pc - 1)
  }

  _buildTypeTable() {
    const table = []
    for (const entry of (this.config.enemyTypes ?? [])) {
      const w = entry.weight ?? 1
      for (let i = 0; i < w; i++) table.push(entry.type)
    }
    return table.length ? table : ['felGuard']
  }

  /**
   * @param {number} now
   * @param {Map}    buildings  – Map<id, ServerBuilding>
   * @param {Map}    enemies   – live enemies map
   * @param {object} idSeqRef  – { value } counter
   * @returns {ServerEnemy[]}
   */
  tick(now, buildings, enemies, idSeqRef) {
    const spawned = []

    // Count destroyed buildings for buff calculation
    let destroyedCount = 0
    buildings.forEach(b => { if (b.isDead) destroyedCount++ })

    const baseInterval   = this.config.baseInterval ?? 3000
    const buffFactor     = this.config.buffFactor ?? 0.25
    const maxPerBuilding = Math.ceil((this.config.maxAlivePerBuilding ?? 6) * this._countMult)
    const [minCount, maxCount] = this.config.countPerSpawn ?? [1, 2]
    const scaledMin      = Math.ceil(minCount * this._countMult)
    const scaledMax      = Math.ceil(maxCount * this._countMult)
    const spawnRadius    = this.config.spawnRadius ?? 80

    // Effective interval decreases as buildings die
    const interval = baseInterval / ((1 + buffFactor * destroyedCount) * this._spawnMult)

    buildings.forEach((building) => {
      if (building.isDead) return

      // Init timer on first tick
      if (!this._lastSpawn.has(building.id)) {
        this._lastSpawn.set(building.id, now)
        this._aliveCount.set(building.id, 0)
        return  // don't spawn on the very first tick
      }

      if (now - this._lastSpawn.get(building.id) < interval) return
      this._lastSpawn.set(building.id, now)

      // Respect per-building cap
      const alive = this._aliveCount.get(building.id) ?? 0
      if (alive >= maxPerBuilding) return

      const count = Math.floor(Math.random() * (scaledMax - scaledMin + 1)) + scaledMin
      const toSpawn = Math.min(count, maxPerBuilding - alive)

      for (let i = 0; i < toSpawn; i++) {
        const typeName = this._typeTable[Math.floor(Math.random() * this._typeTable.length)]
        const base = ENEMY_TYPES[typeName]
        if (!base) continue

        const { x, y } = this._randomNearPos(building.x, building.y, spawnRadius)
        const enemy = this._createEnemy(idSeqRef, typeName, base, x, y)
        spawned.push(enemy)

        // Track ownership
        this._enemyOwner.set(enemy.id, building.id)
        this._aliveCount.set(building.id, (this._aliveCount.get(building.id) ?? 0) + 1)
      }
    })

    return spawned
  }

  /** Called when any enemy dies — decrement owner building's alive count. */
  onEnemyDied(enemyId) {
    const ownerId = this._enemyOwner.get(enemyId)
    if (ownerId == null) return
    this._enemyOwner.delete(enemyId)
    const count = this._aliveCount.get(ownerId) ?? 0
    this._aliveCount.set(ownerId, Math.max(0, count - 1))
  }

  _createEnemy(idSeqRef, typeName, base, x, y) {
    const id = ++idSeqRef.value
    const hp            = Math.round(base.hp * this._hpMult)
    const contactDamage = Math.round(base.contactDamage * this._damageMult)

    const enemy = new ServerEnemy({
      id,
      x, y,
      type:          typeName,
      hp,
      maxHp:         hp,
      speed:         base.speed,
      radius:        base.radius,
      contactDamage,
      generation:    0,
    })
    enemy.setArenaSize(this.arenaWidth, this.arenaHeight)
    return enemy
  }

  _randomNearPos(cx, cy, radius) {
    const angle = Math.random() * Math.PI * 2
    const dist  = Math.random() * radius
    const x = Math.max(30, Math.min(this.arenaWidth  - 30, cx + Math.cos(angle) * dist))
    const y = Math.max(30, Math.min(this.arenaHeight - 30, cy + Math.sin(angle) * dist))
    return { x, y }
  }
}
