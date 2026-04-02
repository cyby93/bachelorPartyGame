/**
 * server/entities/ServerEnemy.js
 * Server-side enemy entity with typed archetypes.
 *
 * Stats are injected at construction time (SpawnSystem applies difficulty
 * multipliers before creating the instance).  The `ai` field from
 * EnemyTypeConfig drives the update() dispatch.
 */

import { GAME_CONFIG }   from '../../shared/GameConfig.js'
import { ENEMY_TYPES }   from '../../shared/EnemyTypeConfig.js'

export default class ServerEnemy {
  constructor({ id, x, y, type = 'grunt', hp, maxHp, speed, radius, contactDamage }) {
    const base = ENEMY_TYPES[type] ?? ENEMY_TYPES.grunt

    this.id            = id
    this.x             = x
    this.y             = y
    this.type          = type
    this.hp            = hp    ?? base.hp
    this.maxHp         = maxHp ?? base.hp
    this.radius        = radius ?? base.radius
    this.speed         = speed  ?? base.speed
    this.contactDamage = contactDamage ?? base.contactDamage
    this.isDead        = false
    this.isPlayer      = false
    this.arenaWidth    = GAME_CONFIG.CANVAS_WIDTH
    this.arenaHeight   = GAME_CONFIG.CANVAS_HEIGHT

    // Status effects (same as before)
    this.activeEffects = []
    this.isRooted      = false
    this.isStunned     = false
    this.isFeared      = false
    this.fearSource    = null
    this.pullTarget    = null
    this.speedMult     = 1

    // Contact damage rate-limiter
    this._lastContactDamage = 0

    // AI-specific state
    this.ai = base.ai ?? 'chase'

    // Ranged AI
    this._lastAttack    = 0
    this._attackRange    = base.attackRange    ?? 300
    this._attackCooldown = base.attackCooldown ?? 2500
    this._projSpeed      = base.projectileSpeed  ?? 160
    this._projDamage     = base.projectileDamage  ?? 12

    // Charger AI
    this._chargeSpeed    = base.chargeSpeed    ?? 5.0
    this._chargeRange    = base.chargeRange    ?? 250
    this._chargeCooldown = base.chargeCooldown ?? 4000
    this._chargeWindup   = base.chargeWindup   ?? 500
    this._lastChargeEnd  = 0
    this._chargeState    = 'idle'   // idle | windup | charging
    this._chargeStart    = 0
    this._chargeDir      = null     // { dx, dy } normalised

    // Healer AI
    this._healAmount     = base.healAmount     ?? 10
    this._healRadius     = base.healRadius     ?? 120
    this._healCooldown   = base.healCooldown   ?? 3000
    this._preferredRange = base.preferredRange ?? 100
    this._lastHeal       = 0
  }

  takeDamage(amount) {
    if (this.isDead) return
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp === 0) this.isDead = true
  }

  /**
   * @param {number}   dt      – seconds since last tick
   * @param {Map}      players – live player map
   * @param {object}   [ctx]   – optional context: { enemies, now, projectiles, enemyIdSeq }
   * @returns {object|null}      action descriptor (e.g. ranged shot) or null
   */
  update(dt, players, ctx) {
    if (this.isDead || this.isRooted || this.isStunned) return null

    // Pull overrides all other movement
    if (this.pullTarget) {
      const dx = this.pullTarget.x - this.x
      const dy = this.pullTarget.y - this.y
      const dist = Math.hypot(dx, dy)
      if (dist < 15) {
        this.x = this.pullTarget.x
        this.y = this.pullTarget.y
        this.pullTarget = null
      } else {
        const pullSpeed = (this.pullTarget.speed ?? 600) * dt
        this.x += (dx / dist) * pullSpeed
        this.y += (dy / dist) * pullSpeed
      }
      this._clampToArena()
      return null
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
      return null
    }

    // Dispatch to AI type
    switch (this.ai) {
      case 'ranged':  return this._aiRanged(dt, pps, players, ctx)
      case 'charger': return this._aiCharger(dt, pps, players, ctx)
      case 'healer':  return this._aiHealer(dt, pps, players, ctx)
      default:        return this._aiChase(dt, pps, players)
    }
  }

  // ── AI: Chase (default) ──────────────────────────────────────────────────

  _aiChase(dt, pps, players) {
    const nearest = this._findNearest(players)
    if (!nearest) return null

    const dx   = nearest.x - this.x
    const dy   = nearest.y - this.y
    const dist = Math.hypot(dx, dy)
    const stopDist = GAME_CONFIG.PLAYER_RADIUS + this.radius

    if (dist <= stopDist) return null

    const step = Math.min(pps * dt, dist - stopDist)
    this.x += (dx / dist) * step
    this.y += (dy / dist) * step
    this._clampToArena()
    return null
  }

  // ── AI: Ranged ───────────────────────────────────────────────────────────

  _aiRanged(dt, pps, players, ctx) {
    const nearest = this._findNearest(players)
    if (!nearest) return null

    const dx   = nearest.x - this.x
    const dy   = nearest.y - this.y
    const dist = Math.hypot(dx, dy)

    // Approach to attack range, but don't get closer than half of it
    const idealDist = this._attackRange * 0.7
    if (dist > this._attackRange) {
      // Walk toward player
      const step = Math.min(pps * dt, dist - idealDist)
      this.x += (dx / dist) * step
      this.y += (dy / dist) * step
    } else if (dist < idealDist * 0.5) {
      // Too close, back away
      const step = Math.min(pps * dt, idealDist - dist)
      this.x -= (dx / dist) * step
      this.y -= (dy / dist) * step
    }
    this._clampToArena()

    // Fire projectile if in range and off cooldown
    const now = ctx?.now ?? Date.now()
    if (dist <= this._attackRange && now - this._lastAttack >= this._attackCooldown) {
      this._lastAttack = now
      const norm = Math.hypot(dx, dy) || 1
      return {
        action: 'shoot',
        x: this.x,
        y: this.y,
        vx: (dx / norm) * this._projSpeed,
        vy: (dy / norm) * this._projSpeed,
        damage: this._projDamage,
        speed: this._projSpeed,
        color: ENEMY_TYPES[this.type]?.color ?? '#e67e22',
      }
    }
    return null
  }

  // ── AI: Charger ──────────────────────────────────────────────────────────

  _aiCharger(dt, pps, players, ctx) {
    const now = ctx?.now ?? Date.now()

    if (this._chargeState === 'charging') {
      // Rush in stored direction
      const chargePps = this._chargeSpeed * 60
      this.x += this._chargeDir.dx * chargePps * dt
      this.y += this._chargeDir.dy * chargePps * dt
      this._clampToArena()

      // End charge after reaching edge or travelling far enough
      const elapsed = now - this._chargeStart
      if (elapsed > 600) {  // max charge duration
        this._chargeState = 'idle'
        this._lastChargeEnd = now
      }
      return null
    }

    if (this._chargeState === 'windup') {
      // Stand still during telegraph
      if (now - this._chargeStart >= this._chargeWindup) {
        this._chargeState = 'charging'
        this._chargeStart = now
      }
      return null
    }

    // Idle — walk toward player, attempt charge when close enough
    const nearest = this._findNearest(players)
    if (!nearest) return null

    const dx   = nearest.x - this.x
    const dy   = nearest.y - this.y
    const dist = Math.hypot(dx, dy)

    // Attempt charge
    if (dist <= this._chargeRange && now - this._lastChargeEnd >= this._chargeCooldown) {
      const norm = dist || 1
      this._chargeDir   = { dx: dx / norm, dy: dy / norm }
      this._chargeState = 'windup'
      this._chargeStart = now
      return null
    }

    // Walk toward target
    const stopDist = GAME_CONFIG.PLAYER_RADIUS + this.radius
    if (dist > stopDist) {
      const step = Math.min(pps * dt, dist - stopDist)
      this.x += (dx / dist) * step
      this.y += (dy / dist) * step
      this._clampToArena()
    }
    return null
  }

  // ── AI: Healer ───────────────────────────────────────────────────────────

  _aiHealer(dt, pps, players, ctx) {
    const now = ctx?.now ?? Date.now()

    // Stay near injured allies
    const enemies = ctx?.enemies
    let targetX = this.x, targetY = this.y

    if (enemies) {
      // Find injured ally to move toward
      let bestDist = Infinity
      let bestAlly = null
      enemies.forEach(e => {
        if (e === this || e.isDead) return
        if (e.hp < e.maxHp) {
          const d = Math.hypot(e.x - this.x, e.y - this.y)
          if (d < bestDist) { bestDist = d; bestAlly = e }
        }
      })

      if (bestAlly) {
        targetX = bestAlly.x
        targetY = bestAlly.y
      }
    }

    // Move toward target but keep preferred range from players
    const nearest = this._findNearest(players)
    if (nearest) {
      const dxP = nearest.x - this.x
      const dyP = nearest.y - this.y
      const distP = Math.hypot(dxP, dyP)

      // If too close to a player, flee
      if (distP < this._preferredRange) {
        const flee = Math.min(pps * dt, this._preferredRange - distP)
        this.x -= (dxP / distP) * flee
        this.y -= (dyP / distP) * flee
      } else {
        // Move toward injured ally
        const dx = targetX - this.x
        const dy = targetY - this.y
        const dist = Math.hypot(dx, dy)
        if (dist > this._healRadius * 0.5) {
          const step = Math.min(pps * dt, dist)
          this.x += (dx / dist) * step
          this.y += (dy / dist) * step
        }
      }
    }
    this._clampToArena()

    // Heal nearby injured allies
    if (enemies && now - this._lastHeal >= this._healCooldown) {
      let healed = false
      enemies.forEach(e => {
        if (e === this || e.isDead) return
        if (e.hp >= e.maxHp) return
        const d = Math.hypot(e.x - this.x, e.y - this.y)
        if (d <= this._healRadius) {
          e.hp = Math.min(e.maxHp, e.hp + this._healAmount)
          healed = true
        }
      })
      if (healed) {
        this._lastHeal = now
        return {
          action: 'heal',
          x: this.x,
          y: this.y,
          radius: this._healRadius,
          color: ENEMY_TYPES[this.type]?.color ?? '#2ecc71',
        }
      }
    }
    return null
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _findNearest(players) {
    let nearest = null
    let bestDist = Infinity
    players.forEach(p => {
      if (p.isHost || p.isDead || p.isInvisible) return
      const d = Math.hypot(p.x - this.x, p.y - this.y)
      if (d < bestDist) { bestDist = d; nearest = p }
    })
    return nearest
  }

  _clampToArena() {
    this.x = Math.max(this.radius, Math.min(this.arenaWidth  - this.radius, this.x))
    this.y = Math.max(this.radius, Math.min(this.arenaHeight - this.radius, this.y))
  }

  setArenaSize(width, height) {
    this.arenaWidth = width
    this.arenaHeight = height
  }

  toDTO() {
    return {
      id:    this.id,
      x:     Math.round(this.x),
      y:     Math.round(this.y),
      hp:    this.hp,
      maxHp: this.maxHp,
      type:  this.type,
    }
  }
}
