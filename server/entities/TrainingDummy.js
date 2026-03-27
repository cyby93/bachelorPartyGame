/**
 * server/entities/TrainingDummy.js
 * A stationary target in the lobby that players can attack to practice skills.
 * Never dies — HP is clamped to 1 and regenerates over time.
 */

import { GAME_CONFIG } from '../../shared/GameConfig.js'

const REGEN_RATE = 80   // HP per second

export default class TrainingDummy {
  constructor({ id, x, y } = {}) {
    this.id      = id ?? 'training-dummy'
    this.x       = x ?? GAME_CONFIG.CANVAS_WIDTH  / 2
    this.y       = y ?? GAME_CONFIG.CANVAS_HEIGHT / 4
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
    this.isFeared      = false
    this.fearSource    = null
    this.pullTarget    = null
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

/**
 * A training dummy that patrols between two points.
 * Responds to slow, root, fear, and pull effects like a real enemy.
 */
export class MovingDummy extends TrainingDummy {
  constructor({ id, pointA, pointB, speed }) {
    super({ id, x: pointA.x, y: pointA.y })
    this._pointA = pointA
    this._pointB = pointB
    this._speed  = speed ?? 1.5   // same units as ServerEnemy.speed
    this._target = this._pointB   // current patrol destination
  }

  update(dt) {
    // Regen HP
    super.update(dt)

    // Pull overrides patrol
    if (this.pullTarget) {
      const dx = this.pullTarget.x - this.x
      const dy = this.pullTarget.y - this.y
      const dist = Math.hypot(dx, dy)
      if (dist < 15) {
        this.x = this.pullTarget.x
        this.y = this.pullTarget.y
        this.pullTarget = null
      } else {
        const step = (this.pullTarget.speed ?? 600) * dt
        this.x += (dx / dist) * step
        this.y += (dy / dist) * step
      }
      return
    }

    // Feared: flee from fear source
    if (this.isFeared && this.fearSource) {
      const dx = this.x - this.fearSource.x
      const dy = this.y - this.fearSource.y
      const dist = Math.hypot(dx, dy)
      if (dist > 2) {
        const pps = this._speed * (this.speedMult ?? 1) * 60
        this.x += (dx / dist) * pps * dt
        this.y += (dy / dist) * pps * dt
      }
      this._clamp()
      return
    }

    // Rooted or stunned: no patrol movement
    if (this.isRooted || this.isStunned) return

    // Patrol between A and B
    const dx = this._target.x - this.x
    const dy = this._target.y - this.y
    const dist = Math.hypot(dx, dy)

    if (dist < 5) {
      // Swap destination
      this._target = this._target === this._pointA ? this._pointB : this._pointA
      return
    }

    const pps = this._speed * (this.speedMult ?? 1) * 60
    this.x += (dx / dist) * pps * dt
    this.y += (dy / dist) * pps * dt
    this._clamp()
  }

  _clamp() {
    this.x = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_WIDTH  - this.radius, this.x))
    this.y = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_HEIGHT - this.radius, this.y))
  }
}
