/**
 * server/entities/TrainingDummy.js
 * A stationary target in the lobby that players can attack to practice skills.
 * Never dies — HP is clamped to 1 and regenerates over time.
 */

import { GAME_CONFIG } from '../../shared/GameConfig.js'

const REGEN_RATE = 80   // HP per second

export default class TrainingDummy {
  constructor() {
    this.id      = 'training-dummy'
    this.x       = GAME_CONFIG.CANVAS_WIDTH  / 2
    this.y       = GAME_CONFIG.CANVAS_HEIGHT / 4
    this.hp      = 500
    this.maxHp   = 500
    this.radius  = GAME_CONFIG.ENEMY_RADIUS
    this.isDead  = false
    this.isDummy = true
    this.isPlayer = false

    // Fields required by SkillSystem for status effects
    this.activeEffects = []
    this.isRooted      = false
    this.isStunned     = false
    this.speedMult     = 1

    this._lastContactDamage = 0
  }

  takeDamage(amount) {
    // Never reaches 0 — dummy cannot die
    this.hp = Math.max(1, this.hp - amount)
  }

  update(dt) {
    this.hp = Math.min(this.maxHp, this.hp + REGEN_RATE * dt)
  }

  toDTO() {
    return {
      id:      this.id,
      x:       Math.round(this.x),
      y:       Math.round(this.y),
      hp:      Math.round(this.hp),
      maxHp:   this.maxHp,
      isDummy: true,
    }
  }
}
