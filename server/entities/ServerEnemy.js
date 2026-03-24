/**
 * server/entities/ServerEnemy.js
 * Server-side enemy entity: spawns at edge, chases nearest living non-host player.
 */

import { GAME_CONFIG } from '../../shared/GameConfig.js'

export default class ServerEnemy {
  constructor({ id, x, y }) {
    this.id      = id
    this.x       = x
    this.y       = y
    this.hp      = 30
    this.maxHp   = 30
    this.radius  = GAME_CONFIG.ENEMY_RADIUS
    this.speed   = 1.2        // px/frame equivalent (× 60 for pps)
    this.isDead  = false
    this.isPlayer = false

    this.activeEffects = []
    this.isRooted      = false
    this.isStunned     = false
    this.isFeared      = false
    this.fearSource    = null      // { x, y } — position to flee from
    this.pullTarget    = null      // { x, y, speed } — destination to pull toward
    this.speedMult     = 1

    // Contact damage rate-limiter
    this._lastContactDamage = 0
  }

  takeDamage(amount) {
    if (this.isDead) return
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp === 0) this.isDead = true
  }

  update(dt, players) {
    if (this.isDead || this.isRooted || this.isStunned) return

    // Pull overrides all other movement
    if (this.pullTarget) {
      const dx = this.pullTarget.x - this.x
      const dy = this.pullTarget.y - this.y
      const dist = Math.hypot(dx, dy)
      if (dist < 15) {
        // Arrived at pull destination
        this.x = this.pullTarget.x
        this.y = this.pullTarget.y
        this.pullTarget = null
      } else {
        const pullSpeed = (this.pullTarget.speed ?? 600) * dt
        this.x += (dx / dist) * pullSpeed
        this.y += (dy / dist) * pullSpeed
      }
      this._clampToArena()
      return
    }

    const effectiveSpeed = this.speed * (this.speedMult ?? 1)
    const pps = effectiveSpeed * 60

    // Feared: flee from fear source
    if (this.isFeared && this.fearSource) {
      const dx = this.x - this.fearSource.x
      const dy = this.y - this.fearSource.y
      const dist = Math.hypot(dx, dy)
      if (dist > 2) {
        this.x += (dx / dist) * pps * dt
        this.y += (dy / dist) * pps * dt
      }
      this._clampToArena()
      return
    }

    // Chase nearest living non-host player
    let nearest = null
    let bestDist = Infinity
    players.forEach(p => {
      if (p.isHost || p.isDead) return
      const d = Math.hypot(p.x - this.x, p.y - this.y)
      if (d < bestDist) { bestDist = d; nearest = p }
    })
    if (!nearest) return

    const dx   = nearest.x - this.x
    const dy   = nearest.y - this.y
    const dist = Math.hypot(dx, dy)
    if (dist < 2) return

    this.x += (dx / dist) * pps * dt
    this.y += (dy / dist) * pps * dt
    this._clampToArena()
  }

  _clampToArena() {
    this.x = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_WIDTH  - this.radius, this.x))
    this.y = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_HEIGHT - this.radius, this.y))
  }

  toDTO() {
    return {
      id:    this.id,
      x:     Math.round(this.x),
      y:     Math.round(this.y),
      hp:    this.hp,
      maxHp: this.maxHp,
    }
  }
}
