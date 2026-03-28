/**
 * server/entities/ServerMinion.js
 * Server-side entity for SPAWN skill type.
 * Subtypes: TOTEM (stationary attacker), TRAP (proximity trigger), PET (mobile melee)
 */

export default class ServerMinion {
  constructor({ id, ownerId, config, x, y, color }) {
    this.id         = id
    this.ownerId    = ownerId
    this.minionType = config.subtype   // 'TOTEM' | 'TRAP' | 'PET'
    this.config     = config
    this.x          = x
    this.y          = y
    this.color      = color
    this.isDead     = false
    this.expiresAt  = Date.now() + (config.duration ?? 15000)

    // PET combat stats
    const petStats  = config.petStats ?? {}
    this.hp         = petStats.hp    ?? 40
    this.maxHp      = this.hp
    this.radius     = 15
    this.speed      = petStats.speed ?? 1.5

    // Attack timing shared by TOTEM and PET
    this._lastAttack = 0

    // TRAP arm delay — prevents instant trigger on spawn
    this._armedAt    = Date.now() + 300
  }

  takeDamage(amount) {
    if (this.isDead) return
    if (this.minionType === 'TOTEM') return   // totems are invulnerable
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp <= 0) this.isDead = true
  }

  update(dt, gs, skillSystem) {
    if (this.isDead) return
    if (Date.now() >= this.expiresAt) { this.isDead = true; return }

    switch (this.minionType) {
      case 'TOTEM': this._updateTotem(dt, gs, skillSystem); break
      case 'TRAP':  this._updateTrap(gs, skillSystem);      break
      case 'PET':   this._updatePet(dt, gs, skillSystem);   break
    }
  }

  // ── TOTEM ──────────────────────────────────────────────────────────────────

  _updateTotem(dt, gs, skillSystem) {
    const ability = this.config.totemAbility
    if (!ability) return
    const now = Date.now()
    const tickRate = ability.tickRate ?? 1500
    if (now - this._lastAttack < tickRate) return

    const target = this._findNearest(gs)
    if (!target) return

    this._lastAttack = now

    if (ability.type === 'PROJECTILE') {
      const dx = target.x - this.x
      const dy = target.y - this.y
      const dist = Math.hypot(dx, dy)
      if (dist === 0) return
      const speed = ability.speed ?? 400
      skillSystem._spawnProjectile(gs, this._asPlayer(), {
        speed,
        radius:     ability.radius ?? 8,
        range:      ability.range  ?? 250,
        damage:     ability.damage ?? 0,
        healAmount: 0,
        effectType: 'DAMAGE',
        pierce:     false,
      }, {
        vx:      (dx / dist) * speed,
        vy:      (dy / dist) * speed,
        color:   this.color,
        onImpact: null,
      })
    } else if (ability.type === 'AOE') {
      skillSystem._executeAOEAtPoint(gs, this._asPlayer(), {
        radius:     ability.radius ?? 80,
        damage:     ability.damage ?? 0,
        effectType: 'DAMAGE',
      }, this.x, this.y)
    }
  }

  // ── TRAP ───────────────────────────────────────────────────────────────────

  _updateTrap(gs, skillSystem) {
    if (Date.now() < this._armedAt) return
    const triggerRadius = this.config.triggerRadius ?? 40

    const triggered = this._findNearestWithinRadius(gs, triggerRadius)
    if (!triggered) return

    // Trigger the trap
    const effect = this.config.trapEffect
    if (effect) {
      skillSystem._executeAOEAtPoint(gs, this._asPlayer(), {
        radius:      effect.radius     ?? 120,
        damage:      effect.damage     ?? 0,
        healAmount:  effect.healAmount ?? 0,
        effectType:  effect.effectType ?? 'DAMAGE',
        effectParams: effect.effectParams,
      }, this.x, this.y)
    }

    this.isDead = true
  }

  // ── PET ────────────────────────────────────────────────────────────────────

  _updatePet(dt, gs, skillSystem) {
    const petStats   = this.config.petStats ?? {}
    const attackRange = petStats.attackRange ?? 45
    const attackRate  = petStats.attackRate  ?? 1000
    const damage      = petStats.damage      ?? 25

    const target = this._findNearest(gs)
    if (!target) return

    const dx   = target.x - this.x
    const dy   = target.y - this.y
    const dist = Math.hypot(dx, dy)

    if (dist > attackRange) {
      // Move toward target
      const speed = this.speed * 60 * dt  // convert to px/tick equivalent
      const move  = Math.min(dist, speed)
      this.x += (dx / dist) * move
      this.y += (dy / dist) * move
    } else {
      // Attack
      const now = Date.now()
      if (now - this._lastAttack >= attackRate) {
        this._lastAttack = now
        skillSystem._dealDamage(gs, this._asPlayer(), target, damage, this.config.name)
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _findNearest(gs) {
    let best = null
    let bestDist = Infinity

    const check = (entity) => {
      if (entity.isDead) return
      const dist = Math.hypot(entity.x - this.x, entity.y - this.y)
      if (dist < bestDist) { bestDist = dist; best = entity }
    }

    gs.enemies.forEach(check)
    if (gs.boss && !gs.boss.isDead) check(gs.boss)

    return best
  }

  _findNearestWithinRadius(gs, radius) {
    let best = null
    let bestDist = Infinity

    const check = (entity) => {
      if (entity.isDead) return
      const dist = Math.hypot(entity.x - this.x, entity.y - this.y)
      if (dist <= radius && dist < bestDist) { bestDist = dist; best = entity }
    }

    gs.enemies.forEach(check)
    if (gs.boss && !gs.boss.isDead) check(gs.boss)

    return best
  }

  /** Return a minimal player-like object so skill helpers can attribute ownership */
  _asPlayer() {
    return {
      id:       this.ownerId,
      x:        this.x,
      y:        this.y,
      isDead:   false,
      isHost:   false,
      className: null,
    }
  }

  toDTO() {
    return {
      id:        this.id,
      ownerId:   this.ownerId,
      minionType: this.minionType,
      x:         Math.round(this.x),
      y:         Math.round(this.y),
      hp:        this.hp,
      maxHp:     this.maxHp,
      color:     this.color,
      remaining: Math.max(0, this.expiresAt - Date.now()),
    }
  }
}
