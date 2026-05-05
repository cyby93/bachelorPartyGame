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
  constructor({ id, x, y, type = 'felGuard', hp, maxHp, speed, radius, contactDamage, generation, renderType = null, forcedAnimation = null }) {
    const base = ENEMY_TYPES[type] ?? ENEMY_TYPES.felGuard

    this.id            = id
    this.x             = x
    this.y             = y
    this.type          = type
    this.renderType    = renderType
    this.forcedAnimation = forcedAnimation
    this.hp            = hp    ?? base.hp
    this.maxHp         = maxHp ?? base.hp
    this.radius        = radius ?? base.radius
    this.hitboxShape   = base.hitboxShape ?? 'oval'
    this.radiusX       = this.hitboxShape === 'oval' ? this.radius / 2 : this.radius
    this.radiusY       = this.radius
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

    // Movement facing angle (radians, 0=East) — broadcast in toDTO for directional sprites
    this._facingAngle = Math.PI / 2   // default facing south

    // AI-specific state
    this.ai = base.ai ?? 'chase'

    // Ranged AI
    this._lastAttack          = 0
    this._attackRange         = base.attackRange    ?? 300
    this._attackCooldown      = base.attackCooldown ?? 2500
    this._pendingAttackAbility = null   // set for one tick when attack fires; drives client anim
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

    // Split-on-death / generation tracking
    this.generation      = generation ?? 0
    this.splitOnDeath    = base.splitOnDeath ?? null

    // Leviathan AI — multi-target
    this._maxRangedTargets = base.maxRangedTargets ?? 2
    this._meleeTarget      = null
    this._rangedTargets    = []

    // Gate Repairer AI
    this._repairAmount   = base.repairAmount  ?? 8
    this._repairRange    = base.repairRange   ?? 60
    this._isRepairing    = false

    // Channeler AI
    this._channelTarget  = base.channelTarget ?? null
    this._hpBuffPerSec   = base.hpBuffPerSecond     ?? 50
    this._dmgBuffPerSec  = base.damageBuffPerSecond  ?? 2

    // Flame of Azzinoth AI (Level 5, Phase 2)
    this._blazeLastTick  = 0
    this._blazeInterval  = base.blazeInterval ?? 8000
    this._blazeRadius    = base.blazeRadius   ?? 80
    this._auraLastTick   = 0
    this._auraRadius     = base.auraRadius    ?? 40
    this._auraDamage     = base.auraDamage    ?? 10
    this._auraTickRate   = base.auraTickRate  ?? 2000

    // Berserk AI (Bonechewer Blade Fury)
    this._berserkState       = 'chase'   // 'chase' | 'berserk' | 'exhausted'
    this._berserkTimer       = 0         // ms until next berserk activation (counts up)
    this._berserkStateTimer  = 0         // ms spent in current berserk/exhausted state
    this._berserkHpTriggered = false     // one-time HP-based trigger fired
    this._berserkSpeed       = base.berserkSpeed    ?? 1.9
    this._berserkRadius      = base.berserkRadius   ?? 65
    this._berserkDamage      = base.berserkDamage   ?? 18
    this._berserkDuration    = base.berserkDuration ?? 2500
    this._berserkCooldown    = base.berserkCooldown ?? 9000
    this._berserkExhaust     = base.berserkExhaust  ?? 600
    this._berserkAoeTimer    = 0         // ms since last AoE tick during berserk

    // Shielded AI (Coilskar Serpent Guard)
    this._shieldArc    = base.shieldArc ?? (Math.PI * 2 / 3)  // 120° default
    this._shieldAngle  = 0      // radians — updated each tick toward nearest player
    this._shieldActive = (base.ai === 'shielded')

    // Blood Prophet AI
    this._buffRadius       = base.buffRadius       ?? 180
    this._buffCooldown     = base.buffCooldown     ?? 6000
    this._buffSpeedMult    = base.buffSpeedMult    ?? 1.5
    this._teleportRange    = base.teleportRange    ?? 100
    this._teleportCooldown = base.teleportCooldown ?? 3000
    this._lastBuff         = 0
    this._lastTeleport     = 0

    // Shadow Demon AI (Level 5, Phase 3) — set by GameServer after spawn
    this.targetPlayerId  = null

    // Shadowfiend AI (Level 5) — player who was infected (don't re-infect same player)
    this.sourcePlayerId  = null
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

    const _prevX = this.x
    const _prevY = this.y

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
    let _action
    switch (this.ai) {
      case 'ranged':          _action = this._aiRanged(dt, pps, players, ctx); break
      case 'charger':         _action = this._aiCharger(dt, pps, players, ctx); break
      case 'healer':          _action = this._aiHealer(dt, pps, players, ctx); break
      case 'bloodProphet':    _action = this._aiBloodProphet(dt, pps, players, ctx); break
      case 'leviathan':       _action = this._aiLeviathan(dt, pps, players, ctx); break
      case 'gateRepairer':    _action = this._aiGateRepairer(dt, pps, players, ctx); break
      case 'channeler':       _action = this._aiChanneler(dt, pps, players, ctx); break
      case 'flameOfAzzinoth': _action = this._aiFlameOfAzzinoth(dt, pps, players, ctx); break
      case 'shadowDemon':     _action = this._aiShadowDemon(dt, pps, players); break
      case 'shadowfiend':     _action = this._aiShadowfiend(dt, pps, players); break
      case 'berserk':         _action = this._aiBerserk(dt, pps, players, ctx); break
      case 'shielded':        _action = this._aiShielded(dt, pps, players, ctx?.minions); break
      default:                _action = this._aiChase(dt, pps, players, ctx?.minions); break
    }

    // Update facing angle from movement delta
    const movedX = this.x - _prevX
    const movedY = this.y - _prevY
    if (movedX * movedX + movedY * movedY > 0.01) {
      this._facingAngle = Math.atan2(movedY, movedX)
    }

    return _action
  }

  // ── AI: Chase (default) ──────────────────────────────────────────────────

  _aiChase(dt, pps, players, minions = null) {
    const nearest = this._findNearest(players, minions)
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
    const nearest = this._findNearest(players, ctx?.minions)
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
      this._pendingAttackAbility = ENEMY_TYPES[this.type]?.attackAnimKey ?? 'attack'
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
    const nearest = this._findNearest(players, ctx?.minions)
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

    // Find injured ally to move toward
    const enemies = ctx?.enemies
    let targetX = this.x, targetY = this.y
    let hasHealTarget = false

    if (enemies) {
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
        hasHealTarget = true
      }
    }

    // Move: flee if too close to player, otherwise approach heal/attack target
    const nearest = this._findNearest(players)
    if (nearest) {
      const dxP = nearest.x - this.x
      const dyP = nearest.y - this.y
      const distP = Math.hypot(dxP, dyP)

      if (distP < this._preferredRange) {
        const flee = Math.min(pps * dt, this._preferredRange - distP)
        this.x -= (dxP / distP) * flee
        this.y -= (dyP / distP) * flee
      } else if (hasHealTarget) {
        const dx = targetX - this.x
        const dy = targetY - this.y
        const dist = Math.hypot(dx, dy)
        if (dist > this._healRadius * 0.5) {
          const step = Math.min(pps * dt, dist)
          this.x += (dx / dist) * step
          this.y += (dy / dist) * step
        }
      } else if (distP > this._attackRange) {
        // No allies need healing — close in to attack range
        const step = Math.min(pps * dt, distP - this._attackRange)
        this.x += (dxP / distP) * step
        this.y += (dyP / distP) * step
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

    // No allies to heal — attack nearest player if in range and off cooldown
    if (!hasHealTarget && nearest && now - this._lastAttack >= this._attackCooldown) {
      const dx = nearest.x - this.x
      const dy = nearest.y - this.y
      const dist = Math.hypot(dx, dy)
      if (dist <= this._attackRange) {
        this._lastAttack = now
        const norm = dist || 1
        return {
          action: 'shoot',
          x: this.x,
          y: this.y,
          vx: (dx / norm) * this._projSpeed,
          vy: (dy / norm) * this._projSpeed,
          damage: this._projDamage,
          speed: this._projSpeed,
          color: ENEMY_TYPES[this.type]?.color ?? '#7b4f9e',
        }
      }
    }

    return null
  }

  // ── AI: Blood Prophet (mobile speed-buffer) ─────────────────────────────

  _aiBloodProphet(dt, pps, players, ctx) {
    const now = ctx?.now ?? Date.now()
    const actions = []

    // Teleport away if any player is within melee range
    if (now - this._lastTeleport >= this._teleportCooldown) {
      let tooClose = false
      players.forEach(p => {
        if (p.isHost || p.isDead) return
        if (Math.hypot(p.x - this.x, p.y - this.y) <= this._teleportRange) tooClose = true
      })

      if (tooClose) {
        // Try 8 candidate positions within 300px; pick the one farthest from all players
        let bestX = this.x, bestY = this.y, bestMinDist = -1
        const teleportRadius = 300
        const margin = this.radius + 20
        for (let attempt = 0; attempt < 8; attempt++) {
          const angle = Math.random() * Math.PI * 2
          const dist  = 80 + Math.random() * (teleportRadius - 80)
          const cx = Math.max(margin, Math.min(this.arenaWidth  - margin, this.x + Math.cos(angle) * dist))
          const cy = Math.max(margin, Math.min(this.arenaHeight - margin, this.y + Math.sin(angle) * dist))
          let minDist = Infinity
          players.forEach(p => {
            if (p.isHost || p.isDead) return
            const d = Math.hypot(p.x - cx, p.y - cy)
            if (d < minDist) minDist = d
          })
          if (minDist > bestMinDist) { bestMinDist = minDist; bestX = cx; bestY = cy }
        }
        this.x = bestX
        this.y = bestY
        this._lastTeleport = now
        actions.push({ action: 'teleport', x: this.x, y: this.y })
      }
    }

    // Move toward centroid of all living allies (whole map — no range cap)
    const enemies = ctx?.enemies
    if (enemies) {
      let sumX = 0, sumY = 0, count = 0
      enemies.forEach(e => {
        if (e === this || e.isDead || e.type === 'bloodProphet') return
        sumX += e.x; sumY += e.y; count++
      })
      if (count > 0) {
        const cx = sumX / count
        const cy = sumY / count
        const dx = cx - this.x
        const dy = cy - this.y
        const dist = Math.hypot(dx, dy)
        if (dist > 50) {
          const step = Math.min(pps * dt, dist - 50)
          this.x += (dx / dist) * step
          this.y += (dy / dist) * step
          this._clampToArena()
        }
      }
    }

    // Pulse speed buff to nearby allies on cooldown
    if (now - this._lastBuff >= this._buffCooldown) {
      this._lastBuff = now
      actions.push({
        action: 'bloodProphetBuff',
        x: this.x,
        y: this.y,
        radius: this._buffRadius,
        speedMult: this._buffSpeedMult,
        duration: 4000,
      })
    }

    return actions.length > 0 ? actions : null
  }

  // ── AI: Leviathan (multi-target) ─────────────────────────────────────

  _aiLeviathan(dt, pps, players, ctx) {
    const now = ctx?.now ?? Date.now()

    // Determine how many ranged targets this generation supports
    // Gen 0 = maxRangedTargets, Gen 1 = max-1, Gen 2+ = 0 (melee only)
    // const rangedSlots = Math.max(0, this._maxRangedTargets - this.generation)
    const rangedSlots = this._maxRangedTargets

    // If no ranged slots, behave as chase AI
    if (rangedSlots === 0) {
      return this._aiChase(dt, pps, players, ctx?.minions)
    }

    // Find all living, non-host, non-invisible players sorted by distance
    const candidates = []
    players.forEach(p => {
      if (p.isHost || p.isDead || p.isInvisible) return
      const d = Math.hypot(p.x - this.x, p.y - this.y)
      candidates.push({ player: p, dist: d })
    })
    candidates.sort((a, b) => a.dist - b.dist)

    if (candidates.length === 0) return null

    // Melee target: nearest player
    this._meleeTarget = candidates[0].player

    // Ranged targets: random selection from remaining players
    const remaining = candidates.slice(1).map(c => c.player)
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]]
    }
    this._rangedTargets = remaining.slice(0, rangedSlots)

    // Chase melee target
    const mx = this._meleeTarget.x - this.x
    const my = this._meleeTarget.y - this.y
    const mDist = Math.hypot(mx, my)
    const stopDist = GAME_CONFIG.PLAYER_RADIUS + this.radius

    if (mDist > stopDist) {
      const step = Math.min(pps * dt, mDist - stopDist)
      this.x += (mx / mDist) * step
      this.y += (my / mDist) * step
      this._clampToArena()
    }

    // Fire ranged projectiles at ranged targets on cooldown
    const actions = []
    if (this._rangedTargets.length > 0 && now - this._lastAttack >= this._attackCooldown) {
      this._lastAttack = now
      this._pendingAttackAbility = ENEMY_TYPES[this.type]?.attackAnimKey ?? 'attack'
      for (const target of this._rangedTargets) {
        const dx = target.x - this.x
        const dy = target.y - this.y
        const norm = Math.hypot(dx, dy) || 1
        actions.push({
          action: 'shoot',
          x: this.x,
          y: this.y,
          vx: (dx / norm) * this._projSpeed,
          vy: (dy / norm) * this._projSpeed,
          damage: this._projDamage,
          speed: this._projSpeed,
          color: ENEMY_TYPES[this.type]?.color ?? '#2E8B57',
          spriteKey: 'projectile_ichor',
          // Exclude melee target from projectile hits
          excludeTargetId: this._meleeTarget.id,
          homingTargetId: target.id,
        })
      }
    }

    return actions.length > 0 ? actions : null
  }

  // ── AI: Flame of Azzinoth (Level 5 Phase 2) ─────────────────────────────

  /**
   * Chases the nearest player. Periodically leaves a Blaze ground zone at its
   * current position. Has a burning aura that deals damage to nearby players
   * (ticked by GameServer via the returned action).
   */
  _aiFlameOfAzzinoth(dt, pps, players, ctx) {
    // Chase nearest player
    this._aiChase(dt, pps, players, ctx?.minions)

    const now = ctx?.now ?? Date.now()
    const actions = []

    // Drop a Blaze zone periodically
    if (now - this._blazeLastTick >= this._blazeInterval) {
      this._blazeLastTick = now
      actions.push({
        action: 'leaveBlaze',
        x: this.x,
        y: this.y,
        radius: this._blazeRadius,
      })
    }

    // Burning aura tick
    if (now - this._auraLastTick >= this._auraTickRate) {
      this._auraLastTick = now
      actions.push({
        action: 'burningAuraTick',
        x: this.x,
        y: this.y,
        radius: this._auraRadius,
        damage: this._auraDamage,
      })
    }

    return actions.length > 0 ? actions : null
  }

  // ── AI: Shadow Demon (Level 5 Phase 3) ──────────────────────────────────

  /**
   * Chases its assigned targetPlayerId. Instant kill on contact is handled by
   * GameServer. Returns a retarget action when the target is dead/missing.
   */
  _aiShadowDemon(dt, pps, players) {
    // Find target by ID
    let target = null
    if (this.targetPlayerId) {
      players.forEach(p => { if (p.id === this.targetPlayerId) target = p })
    }

    // Retarget if no valid target
    if (!target || target.isDead || target.isHost) {
      let fallback = null
      players.forEach(p => {
        if (p.isHost || p.isDead) return
        if (!fallback) fallback = p
      })
      if (!fallback) return null
      this.targetPlayerId = fallback.id
      target = fallback
    }

    // Move toward target
    const dx   = target.x - this.x
    const dy   = target.y - this.y
    const dist = Math.hypot(dx, dy)
    if (dist > 2) {
      const step = Math.min(pps * dt, dist)
      this.x += (dx / dist) * step
      this.y += (dy / dist) * step
    }
    this._clampToArena()
    return null
  }

  // ── AI: Shadowfiend (from Parasitic Shadowfiend debuff) ──────────────────

  /**
   * Chases the nearest player who does NOT have the sourcePlayerId.
   * Infection logic (applying the Parasitic Shadowfiend debuff) is handled
   * by GameServer on contact.
   */
  _aiShadowfiend(dt, pps, players) {
    let nearest = null
    let bestDist = Infinity
    players.forEach(p => {
      if (p.isHost || p.isDead || p.id === this.sourcePlayerId) return
      const d = Math.hypot(p.x - this.x, p.y - this.y)
      if (d < bestDist) { bestDist = d; nearest = p }
    })
    if (!nearest) return null

    const dx   = nearest.x - this.x
    const dy   = nearest.y - this.y
    const dist = Math.hypot(dx, dy)
    if (dist > 2) {
      const step = Math.min(pps * dt, dist)
      this.x += (dx / dist) * step
      this.y += (dy / dist) * step
    }
    this._clampToArena()
    return null
  }

  // ── AI: Gate Repairer ──────────────────────────────────────────────────

  _aiGateRepairer(dt, pps, players, ctx) {
    const gate = ctx?.activeGate
    this._isRepairing = false

    // If no active gate (destroyed), fall back to chase AI
    if (!gate || gate.isDead) {
      return this._aiChase(dt, pps, players, ctx?.minions)
    }

    const dx   = gate.x - this.x
    const dy   = gate.y - this.y
    const dist = Math.hypot(dx, dy)

    if (dist <= this._repairRange) {
      // In range: repair the gate
      this._isRepairing = true
      return {
        action: 'repair',
        gateId: gate.id,
        amount: this._repairAmount * dt,
      }
    }

    // Walk toward gate
    const step = Math.min(pps * dt, dist)
    this.x += (dx / dist) * step
    this.y += (dy / dist) * step
    this._clampToArena()
    return null
  }

  // ── AI: Channeler (stationary beam buff) ───────────────────────────────

  _aiChanneler(dt, pps, players, ctx) {
    // Channelers are stationary — they don't move
    // The buff application is handled by GameServer, not here
    // Return a channel action so GameServer knows this enemy is channeling
    return {
      action: 'channel',
      hpPerSecond: this._hpBuffPerSec,
      dmgPerSecond: this._dmgBuffPerSec,
    }
  }

  // ── AI: Berserk (Bonechewer Blade Fury) ─────────────────────────────────

  /**
   * Chases the nearest player normally, then periodically enters a whirlwind
   * spin (faster, AoE damage every 600ms, immune to knockback).
   * State machine: chase → berserk → exhausted → chase
   */
  _aiBerserk(dt, pps, players, ctx) {
    const now      = ctx?.now ?? Date.now()
    const dtMs     = dt * 1000

    // One-time HP trigger: go berserk the first time HP drops below 40%
    if (!this._berserkHpTriggered && this.hp / this.maxHp <= 0.4) {
      this._berserkHpTriggered = true
      if (this._berserkState === 'chase') {
        this._berserkState      = 'berserk'
        this._berserkStateTimer = 0
        this._berserkAoeTimer   = 0
      }
    }

    if (this._berserkState === 'berserk') {
      this._berserkStateTimer += dtMs
      this._berserkAoeTimer   += dtMs

      // Move faster during spin
      const berserkPps = this._berserkSpeed * 60
      this._aiChase(dt, berserkPps, players, ctx?.minions)

      // Periodic AoE damage tick (~every 600ms)
      if (this._berserkAoeTimer >= 600) {
        this._berserkAoeTimer = 0
        return {
          action: 'berserkAoeTick',
          x: this.x,
          y: this.y,
          radius: this._berserkRadius,
          damage: this._berserkDamage,
        }
      }

      // End berserk after duration
      if (this._berserkStateTimer >= this._berserkDuration) {
        this._berserkState      = 'exhausted'
        this._berserkStateTimer = 0
      }
      return null
    }

    if (this._berserkState === 'exhausted') {
      this._berserkStateTimer += dtMs
      // Move at half speed while exhausted
      this._aiChase(dt, pps * 0.5, players, ctx?.minions)
      if (this._berserkStateTimer >= this._berserkExhaust) {
        this._berserkState  = 'chase'
        this._berserkTimer  = 0
      }
      return null
    }

    // Chase state — walk normally, activate berserk on cooldown
    this._berserkTimer += dtMs
    if (this._berserkTimer >= this._berserkCooldown) {
      this._berserkState      = 'berserk'
      this._berserkTimer      = 0
      this._berserkStateTimer = 0
      this._berserkAoeTimer   = 0
    }
    return this._aiChase(dt, pps, players, ctx?.minions)
  }

  // ── AI: Shielded (Coilskar Serpent Guard) ────────────────────────────────

  /**
   * Chases the nearest player normally.
   * Maintains _shieldAngle pointing toward the nearest player each tick.
   * Projectile blocking is handled in SkillSystem (collision check).
   */
  _aiShielded(dt, pps, players, minions = null) {
    const nearest = this._findNearest(players, minions)
    if (nearest) {
      this._shieldAngle = Math.atan2(nearest.y - this.y, nearest.x - this.x)
    }
    return this._aiChase(dt, pps, players, minions)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _findNearest(players, minions = null) {
    let nearest = null
    let bestDist = Infinity
    players.forEach(p => {
      if (p.isHost || p.isDead || p.isInvisible) return
      const d = Math.hypot(p.x - this.x, p.y - this.y)
      if (d < bestDist) { bestDist = d; nearest = p }
    })
    if (minions) {
      minions.forEach(m => {
        if (m.isDead) return
        if (m.minionType !== 'PET' && m.minionType !== 'WILD_BEAST') return
        const d = Math.hypot(m.x - this.x, m.y - this.y)
        if (d < bestDist) { bestDist = d; nearest = m }
      })
    }
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
    const dto = {
      id:    this.id,
      x:     Math.round(this.x),
      y:     Math.round(this.y),
      hp:    this.hp,
      maxHp: this.maxHp,
      type:  this.type,
    }
    if (this.renderType) dto.renderType = this.renderType
    if (this.forcedAnimation) dto.forcedAnimation = this.forcedAnimation
    if (this.generation > 0)        dto.generation   = this.generation
    if (this._isRepairing)          dto.isRepairing  = true
    if (this._shieldActive)         dto.shieldAngle  = this._shieldAngle
    if (this._berserkState === 'berserk') dto.isBerserking = true
    if (this.isFeared)                     dto.isFeared     = true
    dto.angle = this._facingAngle
    if (this._pendingAttackAbility) {
      dto.attackingAbility           = this._pendingAttackAbility
      this._pendingAttackAbility     = null   // consumed — one tick only
    }
    return dto
  }
}
