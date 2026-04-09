/**
 * server/entities/ServerBuilding.js
 * Destructible building entity that spawns enemies until destroyed.
 *
 * All buildings are active simultaneously (unlike gates which are sequential).
 * When a building is destroyed, surviving buildings spawn enemies faster.
 *
 * Used for: Level 2 (The Siege)
 */

export default class ServerBuilding {
  /**
   * @param {object} config – building definition from LevelConfig.buildings[]
   * @param {number} hpMult – difficulty HP multiplier
   */
  constructor(config, hpMult = 1) {
    this.id     = config.id
    this.hp     = Math.round((config.hp ?? 600) * hpMult)
    this.maxHp  = this.hp
    this.x      = config.position?.x ?? 0
    this.y      = config.position?.y ?? 0
    this.width  = config.width  ?? 60
    this.height = config.height ?? 60
    this.radius = Math.max(this.width, this.height) / 2
    this.isDead    = false
    this.isActive  = true      // all buildings are always active
    this.isPlayer  = false
    this.isBuilding = true
  }

  takeDamage(amount) {
    if (this.isDead) return
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp === 0) {
      this.isDead = true
    }
  }

  toDTO() {
    return {
      id:         this.id,
      x:          this.x,
      y:          this.y,
      hp:         this.hp,
      maxHp:      this.maxHp,
      width:      this.width,
      height:     this.height,
      radius:     this.radius,
      isDead:     this.isDead,
      isActive:   this.isActive,
      isBuilding: true,
    }
  }
}
