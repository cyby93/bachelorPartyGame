/**
 * server/entities/ServerMinion.js
 * Server-side entity for SPAWN skill type.
 * Subtypes: TOTEM (stationary attacker), TRAP (proximity trigger), PET (mobile melee),
 *           WILD_BEAST (random bear/hawk/panther with unique behaviours)
 */

export default class ServerMinion {
  constructor({ id, ownerId, config, x, y, color }) {
    this.id         = id
    this.ownerId    = ownerId
    this.minionType = config.subtype   // 'TOTEM' | 'TRAP' | 'PET' | 'WILD_BEAST'
    this.config     = config
    this.x          = x
    this.y          = y
    this.color      = color
    this.isDead     = false
    this.expiresAt  = Date.now() + (config.duration ?? 15000)

    // PET / WILD_BEAST combat stats
    const petStats  = config.petStats ?? {}
    const rawHp     = petStats.hp ?? 40
    this.invincible = petStats.invincible ?? false     // hawk — cannot take damage
    this.hp         = this.invincible ? Infinity : rawHp
    this.maxHp      = this.invincible ? Infinity : rawHp
    this.radius     = petStats.radius ?? 15
    this.speed      = petStats.speed ?? 1.5
    this.chosenBeast = config.chosenBeast ?? null      // 'bear' | 'hawk' | 'panther'

    // Attack timing shared by TOTEM, PET, and WILD_BEAST
    this._lastAttack = 0
    this._lastTauntPulse = 0

    // TRAP arm delay — prevents instant trigger on spawn
    this._armedAt    = Date.now() + 300
  }

  takeDamage(amount) {
    if (this.isDead) return
    if (this.minionType === 'TOTEM') return   // totems are invulnerable
    if (this.invincible) return               // hawk — invincible
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp <= 0) this.isDead = true
  }

  update(dt, gs, skillSystem) {
    if (this.isDead) return
    if (Date.now() >= this.expiresAt) { this.isDead = true; return }

    switch (this.minionType) {
      case 'TOTEM':      this._updateTotem(dt, gs, skillSystem); break
      case 'TRAP':       this._updateTrap(gs, skillSystem);      break
      case 'PET':        this._updatePet(dt, gs, skillSystem);   break
      case 'WILD_BEAST': this._updateWildBeast(dt, gs, skillSystem); break
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
      const radius = effect.radius ?? 120
      skillSystem._executeAOEAtPoint(gs, this._asPlayer(), {
        radius,
        damage:      effect.damage     ?? 0,
        healAmount:  effect.healAmount ?? 0,
        effectType:  effect.effectType ?? 'DAMAGE',
        effectParams: effect.effectParams,
      }, this.x, this.y)

      if (gs.io) {
        gs.io.emit('skill:fired', {
          type:      'EXPLOSION',
          skillName: this.config.name ?? null,
          x:         Math.round(this.x),
          y:         Math.round(this.y),
          radius,
          color:     '#ff6600',
        })
      }
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

  // ── WILD_BEAST ─────────────────────────────────────────────────────────────

  _updateWildBeast(dt, gs, skillSystem) {
    const petStats    = this.config.petStats ?? {}
    const attackRange = petStats.attackRange ?? 45
    const attackRate  = petStats.attackRate  ?? 1000
    const damage      = petStats.damage      ?? 5

    const now = Date.now()

    // Bear: periodically taunt nearby enemies to target this minion
    if (this.chosenBeast === 'bear') {
      const tauntRadius = petStats.tauntRadius ?? 150
      const TAUNT_INTERVAL = 2000
      if (now - this._lastTauntPulse >= TAUNT_INTERVAL) {
        this._lastTauntPulse = now
        gs.enemies.forEach(e => {
          if (e.isDead) return
          if (Math.hypot(e.x - this.x, e.y - this.y) <= tauntRadius) {
            e._tauntedBy = this.id
            e._tauntedUntil = now + 3000
          }
        })
      }
    }

    // Hawk: ranged attacker — fires projectiles at nearest enemy
    if (this.chosenBeast === 'hawk') {
      const target = this._findNearest(gs)
      if (target && now - this._lastAttack >= attackRate) {
        this._lastAttack = now
        const dx = target.x - this.x
        const dy = target.y - this.y
        const dist = Math.hypot(dx, dy)
        if (dist > 0 && dist <= attackRange) {
          const speed = 500
          skillSystem._spawnProjectile(gs, this._asPlayer(), {
            speed,
            radius:     6,
            range:      attackRange + 50,
            damage,
            healAmount: 0,
            effectType: 'DAMAGE',
            pierce:     false,
          }, {
            vx:      (dx / dist) * speed,
            vy:      (dy / dist) * speed,
            color:   this.color,
            onImpact: null,
          })
        }
        // Move toward target at full hawk speed
        if (dist > 30) {
          const move = Math.min(dist, this.speed * 60 * dt)
          this.x += (dx / dist) * move
          this.y += (dy / dist) * move
        }
      } else if (!this._lastAttackTarget) {
        // Reposition toward nearest when no attack queued
        const t = this._findNearest(gs)
        if (t) {
          const dx = t.x - this.x
          const dy = t.y - this.y
          const dist = Math.hypot(dx, dy)
          if (dist > attackRange) {
            const move = Math.min(dist - attackRange + 10, this.speed * 60 * dt)
            this.x += (dx / dist) * move
            this.y += (dy / dist) * move
          }
        }
      }
      return
    }

    // Bear / Panther: melee chase-and-attack (same as PET but uses WILD_BEAST petStats)
    const target = this._findNearest(gs)
    if (!target) return

    const dx   = target.x - this.x
    const dy   = target.y - this.y
    const dist = Math.hypot(dx, dy)

    if (dist > attackRange) {
      const move = Math.min(dist, this.speed * 60 * dt)
      this.x += (dx / dist) * move
      this.y += (dy / dist) * move
    } else {
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
      id:          this.id,
      ownerId:     this.ownerId,
      minionType:  this.minionType,
      chosenBeast: this.chosenBeast,
      invincible:  this.invincible,
      x:           Math.round(this.x),
      y:           Math.round(this.y),
      hp:          this.invincible ? null : this.hp,
      maxHp:       this.invincible ? null : this.maxHp,
      color:       this.color,
      remaining:   Math.max(0, this.expiresAt - Date.now()),
    }
  }
}
