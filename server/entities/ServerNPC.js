/**
 * server/entities/ServerNPC.js
 * Server-side friendly NPC entity.
 *
 * NPCs are allied entities that fight alongside players. They have HP,
 * can be damaged by enemies (not players), and their death can trigger
 * a loss condition for the level.
 *
 * Used for: Akama (Level 4)
 */

import { GAME_CONFIG } from '../../shared/GameConfig.js'

export default class ServerNPC {
  /**
   * @param {object} config – NPC definition from LevelConfig.npcs[]
   */
  constructor(config) {
    this.id            = config.id
    this.name          = config.name ?? 'NPC'
    this.hp            = config.hp ?? 1000
    this.maxHp         = config.hp ?? 1000
    this.speed         = config.speed ?? 0.8
    this.radius        = config.radius ?? 25
    this.meleeDamage   = config.meleeDamage ?? 15
    this.attackCooldown = config.attackCooldown ?? 1500
    this.attackRange   = config.attackRange ?? 50

    this.x             = config.spawnPosition?.x ?? 200
    this.y             = config.spawnPosition?.y ?? 400
    this.isDead        = false
    this.isNPC         = true
    this.isPlayer      = false
    this.isHealable    = config.isHealable ?? true
    this.activeEffects = []   // required for HoT compatibility (not ticked by SkillSystem)

    this.arenaWidth    = GAME_CONFIG.CANVAS_WIDTH
    this.arenaHeight   = GAME_CONFIG.CANVAS_HEIGHT

    // Target entity ID to attack (e.g., 'shade')
    this.targetId      = config.target ?? null

    // Phase gating: NPC stays idle until this phase
    this.idleUntilPhase = config.idleUntilPhase ?? 1
    this.isIdle        = true

    this._lastAttack   = 0
    this._facingAngle  = Math.PI / 2   // default facing south
  }

  setArenaSize(width, height) {
    this.arenaWidth = width
    this.arenaHeight = height
  }

  /**
   * Activate the NPC (when the required phase starts).
   */
  activate() {
    this.isIdle = false
  }

  takeDamage(amount) {
    if (this.isDead) return
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp === 0) this.isDead = true
  }

  heal(amount) {
    if (this.isDead) return
    this.hp = Math.min(this.maxHp, this.hp + amount)
  }

  /**
   * @param {number} dt         – seconds since last tick
   * @param {object} targetEntity – the entity to attack (e.g., boss)
   * @param {number} now        – Date.now()
   * @returns {object|null}      action descriptor or null
   */
  update(dt, targetEntity, now) {
    if (this.isDead || this.isIdle) return null
    if (!targetEntity || targetEntity.isDead) return null

    const dx   = targetEntity.x - this.x
    const dy   = targetEntity.y - this.y
    const dist = Math.hypot(dx, dy)

    const stopDist = (targetEntity.radius ?? 30) + this.radius

    // Move toward target
    if (dist > stopDist) {
      const pps  = this.speed * 60
      const step = Math.min(pps * dt, dist - stopDist)
      this.x += (dx / dist) * step
      this.y += (dy / dist) * step
      this._facingAngle = Math.atan2(dy, dx)
      this._clampToArena()
    }

    // Attack when in range
    if (dist <= this.attackRange + (targetEntity.radius ?? 30)) {
      if (now - this._lastAttack >= this.attackCooldown) {
        this._lastAttack = now
        return {
          action: 'melee',
          targetId: targetEntity.id,
          damage: this.meleeDamage,
        }
      }
    }

    return null
  }

  _clampToArena() {
    this.x = Math.max(this.radius, Math.min(this.arenaWidth  - this.radius, this.x))
    this.y = Math.max(this.radius, Math.min(this.arenaHeight - this.radius, this.y))
  }

  toDTO() {
    return {
      id:     this.id,
      name:   this.name,
      x:      Math.round(this.x),
      y:      Math.round(this.y),
      hp:     this.hp,
      maxHp:  this.maxHp,
      radius: this.radius,
      isDead: this.isDead,
      isNPC:  true,
      angle:  this._facingAngle,
    }
  }
}
