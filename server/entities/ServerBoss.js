/**
 * server/entities/ServerBoss.js
 * Server-side boss entity: Illidan Stormrage with phase-based AI.
 */

import { BOSS_CONFIG } from '../../shared/BossConfig.js'
import { GAME_CONFIG } from '../../shared/GameConfig.js'

export default class ServerBoss {
  constructor() {
    const cfg = BOSS_CONFIG.ILLIDAN

    this.name      = cfg.name
    this.maxHp     = cfg.maxHp
    this.hp        = this.maxHp
    this.radius    = GAME_CONFIG.BOSS_RADIUS
    this.x         = GAME_CONFIG.CANVAS_WIDTH  / 2
    this.y         = GAME_CONFIG.CANVAS_HEIGHT / 2
    this.angle     = 0
    this.isDead    = false
    this.phase     = 1
    this.isPlayer  = false
    this.id        = 'boss'

    this._abilityCooldowns = {}
    this._phases   = cfg.phases
    this._abilities = cfg.abilities
    this.baseSpeed = cfg.speed
    this.speed     = this.baseSpeed

    // Contact damage rate-limiter per player: Map<playerId, timestamp>
    // Stored externally on ServerPlayer as _lastBossContact
  }

  takeDamage(amount) {
    if (this.isDead) return
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp === 0) { this.isDead = true; return }
    this._updatePhase()
  }

  _updatePhase() {
    const pct = this.hp / this.maxHp
    for (let i = this._phases.length - 1; i >= 0; i--) {
      if (pct <= this._phases[i].threshold) {
        const newPhase = i + 1
        if (newPhase !== this.phase) {
          this.phase = newPhase
          this.speed = this._phases[i].speed
          console.log(`[Boss] Phase ${newPhase} — speed ${this.speed}`)
        }
        break
      }
    }
  }

  update(dt, players) {
    if (this.isDead) return

    // Chase nearest living non-host player
    let nearest = null
    let bestDist = Infinity
    players.forEach(p => {
      if (p.isHost || p.isDead || p.isInvisible) return
      const d = Math.hypot(p.x - this.x, p.y - this.y)
      if (d < bestDist) { bestDist = d; nearest = p }
    })
    if (!nearest) return

    const dx   = nearest.x - this.x
    const dy   = nearest.y - this.y
    const dist = Math.hypot(dx, dy)
    if (dist < 5) return

    const pps = this.speed * 60
    this.x += (dx / dist) * pps * dt
    this.y += (dy / dist) * pps * dt
    this.angle = Math.atan2(dy, dx)

    // Clamp
    this.x = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_WIDTH  - this.radius, this.x))
    this.y = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_HEIGHT - this.radius, this.y))
  }

  /**
   * Returns array of attack objects this tick (applied by GameServer).
   * Each object: { type, damage, radius?, bossX, bossY, target }
   */
  updateAbilities(dt, players, now) {
    if (this.isDead) return []
    const attacks = []

    for (const ability of this._abilities) {
      const lastUsed = this._abilityCooldowns[ability.name] ?? 0
      if (now - lastUsed < ability.cooldown) continue

      // Find nearest living non-host player
      let nearest = null
      let bestDist = Infinity
      players.forEach(p => {
        if (p.isHost || p.isDead || p.isInvisible) return
        const d = Math.hypot(p.x - this.x, p.y - this.y)
        if (d < bestDist) { bestDist = d; nearest = p }
      })
      if (!nearest) continue

      const activationRange = ability.type === 'beam' ? 350 : 200
      if (bestDist > activationRange) continue

      this._abilityCooldowns[ability.name] = now
      attacks.push({ ...ability, bossX: this.x, bossY: this.y, target: nearest })
    }

    return attacks
  }

  toDTO() {
    return {
      id:     'boss',
      x:      Math.round(this.x),
      y:      Math.round(this.y),
      angle:  +this.angle.toFixed(3),
      hp:     this.hp,
      maxHp:  this.maxHp,
      phase:  this.phase,
      isDead: this.isDead,
    }
  }
}
