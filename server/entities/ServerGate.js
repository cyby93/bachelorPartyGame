/**
 * server/entities/ServerGate.js
 * Destructible gate entity that blocks passages between rooms.
 *
 * Gates have HP and can be damaged by player skills (projectiles, melee, AOE).
 * When HP reaches 0, the gate is destroyed and its associated passage opens.
 * Only the active gate can be damaged; inactive gates are immune.
 *
 * Used for: Level 2 (Destroy the Gates)
 */

export default class ServerGate {
  /**
   * @param {object} config – gate definition from LevelConfig.gates[]
   * @param {number} hpMult – difficulty HP multiplier
   */
  constructor(config, hpMult = 1) {
    this.id        = config.id
    this.passageId = config.passageId ?? null
    this.hp        = Math.round((config.hp ?? 500) * hpMult)
    this.maxHp     = this.hp
    this.x         = config.position?.x ?? 0
    this.y         = config.position?.y ?? 0
    this.width     = config.width  ?? 40
    this.height    = config.height ?? 100
    this.radius    = Math.max(this.width, this.height) / 2   // kept for legacy cone/AOE range checks
    this.isDead    = false
    this.isActive  = false    // only active gate can be damaged
    this.isPlayer  = false
  }

  /**
   * Take damage from player skills.
   * Only takes damage if the gate is active (current objective target).
   */
  takeDamage(amount) {
    if (this.isDead || !this.isActive) return
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp === 0) {
      this.isDead = true
    }
  }

  /**
   * Repair HP (from gate repairer enemies).
   */
  repair(amount) {
    if (this.isDead || !this.isActive) return
    this.hp = Math.min(this.maxHp, this.hp + amount)
  }

  toDTO() {
    return {
      id:       this.id,
      x:        this.x,
      y:        this.y,
      hp:       this.hp,
      maxHp:    this.maxHp,
      width:    this.width,
      height:   this.height,
      radius:   this.radius,
      isDead:   this.isDead,
      isActive: this.isActive,
      isGate:   true,
    }
  }
}
