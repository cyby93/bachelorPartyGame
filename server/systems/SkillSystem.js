/**
 * server/systems/SkillSystem.js
 * Authoritative skill execution engine.
 * Routes skill inputs by config.type and manages projectile / effect / cast ticks.
 */

import CollisionSystem from './CollisionSystem.js'
import { GAME_CONFIG } from '../../shared/GameConfig.js'
import { CLASSES }     from '../../shared/ClassConfig.js'

// ── Standalone helpers ────────────────────────────────────────────────────────

/**
 * Rebuild derived stats for a player from their activeEffects array.
 * Called after any effect is added or removed.
 */
export function rebuildStats(player) {
  player.speedMult       = 1
  player.damageMult      = 1
  player.damageReduction = 0
  player.isRooted        = false
  player.isStunned       = false
  player.isInvisible     = false
  // shieldAbsorb is accumulated, not reset — handled carefully below

  let shieldAbsorb = 0

  for (const effect of player.activeEffects) {
    const p = effect.params ?? {}
    if (p.speedMultiplier  != null) player.speedMult       *= p.speedMultiplier
    if (p.damageMultiplier != null) player.damageMult      *= p.damageMultiplier
    if (p.damageReduction  != null) player.damageReduction  = Math.max(player.damageReduction, p.damageReduction)
    if (p.shield           != null && !effect.shieldApplied) {
      effect.shieldApplied = true
      shieldAbsorb += p.shield
    } else if (p.shield != null && effect.shieldApplied) {
      // already counted — keep absorb at current runtime value
    }
    if (p.rooted)    player.isRooted    = true
    if (p.stunned)   player.isStunned   = true
    if (p.invisible) player.isInvisible = true
  }

  // Re-total shield from all active effects
  let totalShield = 0
  for (const effect of player.activeEffects) {
    if (effect.params?.shield != null && effect.shieldApplied) {
      totalShield += effect.params.shield
    }
  }
  // Preserve remaining absorb — only reset upward if new shields are added
  if (player.shieldAbsorb == null) player.shieldAbsorb = 0
  if (totalShield > player.shieldAbsorb) player.shieldAbsorb = totalShield
}

// ── Normalise a vector to unit length ────────────────────────────────────────

function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  if (len === 0) return { x: 1, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

function clampPos(x, y, r) {
  return {
    x: Math.max(r, Math.min(GAME_CONFIG.CANVAS_WIDTH  - r, x)),
    y: Math.max(r, Math.min(GAME_CONFIG.CANVAS_HEIGHT - r, y)),
  }
}

// ── SkillSystem ───────────────────────────────────────────────────────────────

export default class SkillSystem {
  constructor() {
    this._collision = new CollisionSystem()
    this._projSeq   = 0
    this._zoneSeq   = 0
    this.activeZones = []   // persistent AOE ground zones
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Execute a skill on behalf of a player.
   * @param {object} gs         – game state reference { players, projectiles, enemies, boss, stats }
   * @param {object} player     – ServerPlayer
   * @param {object} config     – skill config from SkillDatabase
   * @param {number} skillIndex – 0-3
   * @param {object} vector     – { x, y } aim direction (may not be normalised)
   * @param {string} action     – 'START' | 'END' | undefined
   */
  execute(gs, player, config, skillIndex, vector, action) {
    const v = normalize(vector ?? { x: 1, y: 0 })

    switch (config.type) {
      case 'PROJECTILE': return this._executeProjectile(gs, player, config, v)
      case 'MELEE':      return this._executeMelee(gs, player, config, v)
      case 'AOE':        return this._executeAOE(gs, player, config, v)
      case 'DASH':       return this._executeDash(gs, player, config, v)
      case 'BUFF':       return this._executeBuff(gs, player, config, skillIndex)
      case 'SHIELD':     return this._executeShield(player, config, vector, action, skillIndex)
      case 'CAST':       return this._executeCast(gs, player, config, v)
      default:
        console.warn(`[SkillSystem] Unknown skill type: ${config.type}`)
    }
  }

  /**
   * Per-tick update: advance projectiles, tick effects, tick casts.
   * @param {object} gs – game state reference
   * @param {number} dt – delta time in seconds
   */
  tick(gs, dt) {
    this._tickProjectiles(gs, dt)
    this._tickEffects(gs)
    this._tickCasts(gs)
    this._tickZones(gs)
  }

  // ── Skill handlers ─────────────────────────────────────────────────────────

  _executeProjectile(gs, player, config, v) {
    const color = CLASSES[player.className]?.color ?? '#ffffff'

    if (config.subtype === 'MULTI') {
      // Fan of projectiles
      const count = config.projectileCount ?? 3
      const spread = config.spreadAngle ?? Math.PI / 4
      const baseAngle = Math.atan2(v.y, v.x)
      const step = count > 1 ? spread / (count - 1) : 0
      const startAngle = baseAngle - spread / 2

      for (let i = 0; i < count; i++) {
        const angle = startAngle + step * i
        this._spawnProjectile(gs, player, config, {
          vx: Math.cos(angle) * config.speed,
          vy: Math.sin(angle) * config.speed,
          color,
        })
      }
    } else {
      this._spawnProjectile(gs, player, config, {
        vx: v.x * config.speed,
        vy: v.y * config.speed,
        color,
      })
    }
  }

  _executeMelee(gs, player, config, v) {
    const halfAngle = (config.angle ?? Math.PI / 3) / 2

    // Hit enemies
    gs.enemies.forEach(e => {
      if (e.isDead) return
      if (this._collision.inCone({ x: player.x, y: player.y }, v, halfAngle, config.range, { x: e.x, y: e.y })) {
        this._dealDamage(gs, player, e, config.damage ?? 0)
      }
    })

    // Hit boss
    if (gs.boss && !gs.boss.isDead) {
      if (this._collision.inCone({ x: player.x, y: player.y }, v, halfAngle, config.range, { x: gs.boss.x, y: gs.boss.y })) {
        this._dealDamage(gs, player, gs.boss, config.damage ?? 0)
      }
    }
  }

  _executeAOE(gs, player, config, v) {
    if (config.subtype === 'AOE_SELF') {
      // If skill has both duration and tickRate, create a persistent ground zone
      if (config.duration && config.tickRate) {
        const color = CLASSES[player.className]?.color ?? '#ffff00'
        this.addZone(player.id, config, player.x, player.y, color)
        // Also fire immediately for the first tick
        this._executeAOEAtPoint(gs, player, config, player.x, player.y)
      } else {
        this._executeAOEAtPoint(gs, player, config, player.x, player.y)
      }
    } else if (config.subtype === 'AOE_LOBBED') {
      // Spawn a lobbed projectile that detonates at target
      const targetX = player.x + v.x * (config.range ?? 300)
      const targetY = player.y + v.y * (config.range ?? 300)
      const clamp = clampPos(targetX, targetY, 0)

      const id = ++this._projSeq
      const color = CLASSES[player.className]?.color ?? '#ffff00'
      const pps = config.speed ?? 400

      gs.projectiles.set(id, {
        id,
        x: player.x,
        y: player.y,
        vx: v.x * pps,
        vy: v.y * pps,
        radius: config.radius ?? 20,
        range: config.range ?? 300,
        distTraveled: 0,
        ownerId: player.id,
        damage: config.damage ?? 0,
        healAmount: config.healAmount ?? 0,
        effectType: config.effectType ?? 'DAMAGE',
        pierce: false,
        hit: new Set(),
        color,
        isAlive: true,
        isLobbed: true,
        targetX: clamp.x,
        targetY: clamp.y,
        aoeConfig: config,   // detonate with original config
        onImpact: null,
      })
    }
  }

  _executeDash(gs, player, config, v) {
    const dist = config.distance ?? 200
    const r = GAME_CONFIG.PLAYER_RADIUS

    if (config.subtype === 'TELEPORT') {
      const newPos = clampPos(
        player.x + v.x * dist,
        player.y + v.y * dist,
        r
      )
      player.x = newPos.x
      player.y = newPos.y
    } else if (config.subtype === 'BACKWARDS') {
      const newPos = clampPos(
        player.x - v.x * dist,
        player.y - v.y * dist,
        r
      )
      player.x = newPos.x
      player.y = newPos.y
    } else {
      // Default: forward charge — stun enemies in path
      const newPos = clampPos(
        player.x + v.x * dist,
        player.y + v.y * dist,
        r
      )
      // Stun enemies touched during the dash
      const effect = config.effectParams
      if (effect) {
        gs.enemies.forEach(e => {
          if (e.isDead) return
          // Simple check: is enemy near the dash line?
          const dx = e.x - player.x
          const dy = e.y - player.y
          const dot = dx * v.x + dy * v.y
          if (dot < 0 || dot > dist) return
          const perpX = dx - v.x * dot
          const perpY = dy - v.y * dot
          const perpDist = Math.sqrt(perpX * perpX + perpY * perpY)
          if (perpDist <= r + e.radius) {
            e.activeEffects = e.activeEffects ?? []
            e.activeEffects.push({
              source: 'dash',
              params: effect,
              expiresAt: Date.now() + (effect.duration ?? 1000),
            })
            if (effect.stunned) e.isStunned = true
            if (effect.rooted)  e.isRooted  = true
          }
        })
      }
      player.x = newPos.x
      player.y = newPos.y
    }
  }

  _executeBuff(gs, player, config, skillIndex) {
    const source = `skill:${skillIndex}`

    if (config.subtype === 'TOGGLE') {
      const existing = player.activeEffects.findIndex(e => e.source === source)
      if (existing !== -1) {
        player.activeEffects.splice(existing, 1)
        rebuildStats(player)
        return
      }
    } else {
      // Remove existing effect with same source before re-applying
      const existing = player.activeEffects.findIndex(e => e.source === source)
      if (existing !== -1) player.activeEffects.splice(existing, 1)
    }

    player.activeEffects.push({
      source,
      params: config.effectParams ?? {},
      expiresAt: config.duration === -1 ? Infinity : Date.now() + (config.duration ?? 0),
    })
    rebuildStats(player)
  }

  _executeShield(player, config, vector, action, skillIndex) {
    if (action === 'START') {
      const v = normalize(vector ?? { x: 1, y: 0 })
      player.shieldActive     = true
      player.shieldAngle      = Math.atan2(v.y, v.x)
      player.shieldArc        = config.arc ?? Math.PI / 2
      player.shieldSkillIndex = skillIndex
    } else if (action === 'END') {
      player.shieldActive     = false
      player.shieldSkillIndex = -1
    }
  }

  _executeCast(gs, player, config, v) {
    if (player.activeCast != null) return   // already casting

    // DIRECTIONAL casts were pre-cast on the controller — fire immediately
    if (config.inputType === 'DIRECTIONAL') {
      this._executeCastPayload(gs, player, config.payload, v)
      return
    }

    player.activeCast = {
      config,
      vector: v,
      startedAt: Date.now(),
      isChanneled: config.subtype === 'CHANNELED',
      lastChannelTick: Date.now(),
    }
  }

  // ── AOE detonation ─────────────────────────────────────────────────────────

  _executeAOEAtPoint(gs, player, config, cx, cy) {
    const radius = config.radius ?? 100
    const effectType = config.effectType ?? 'DAMAGE'

    if (effectType === 'HEAL') {
      // Heal all living players in radius
      gs.players.forEach(p => {
        if (p.isDead || p.isHost) return
        if (this._collision.distance({ x: cx, y: cy }, { x: p.x, y: p.y }) <= radius) {
          const amount = config.healAmount ?? 0
          p.heal(amount)
          if (gs.io && amount > 0) {
            gs.io.emit('effect:damage', { targetId: p.id, amount, type: 'heal', sourceSkill: config.name ?? null })
          }
        }
      })
      return
    }

    if (effectType === 'BUFF') {
      // Buff all living players in radius
      gs.players.forEach(p => {
        if (p.isDead || p.isHost) return
        if (this._collision.distance({ x: cx, y: cy }, { x: p.x, y: p.y }) <= radius) {
          if (config.effectParams) {
            p.activeEffects.push({
              source: 'aoe_buff',
              params: config.effectParams,
              expiresAt: Date.now() + (config.effectParams.duration ?? config.duration ?? 3000),
            })
            rebuildStats(p)
          }
        }
      })
      return
    }

    if (effectType === 'DUAL') {
      // Damage enemies + heal players
      this._aoeHitEnemies(gs, player, config, cx, cy, radius)
      gs.players.forEach(p => {
        if (p.isDead || p.isHost) return
        if (this._collision.distance({ x: cx, y: cy }, { x: p.x, y: p.y }) <= radius) {
          const amount = config.healAmount ?? 0
          p.heal(amount)
          if (gs.io && amount > 0) {
            gs.io.emit('effect:damage', { targetId: p.id, amount, type: 'heal', sourceSkill: config.name ?? null })
          }
        }
      })
      return
    }

    if (effectType === 'REVIVE') {
      // Revive all dead players in radius
      gs.players.forEach(p => {
        if (!p.isDead || p.isHost) return
        if (this._collision.distance({ x: cx, y: cy }, { x: p.x, y: p.y }) <= radius) {
          p.revive()
        }
      })
      return
    }

    // Default: DAMAGE
    this._aoeHitEnemies(gs, player, config, cx, cy, radius)
  }

  _aoeHitEnemies(gs, player, config, cx, cy, radius) {
    // Damage enemies
    gs.enemies.forEach(e => {
      if (e.isDead) return
      if (this._collision.distance({ x: cx, y: cy }, { x: e.x, y: e.y }) <= radius + e.radius) {
        this._dealDamage(gs, player, e, config.damage ?? 0)
        // Apply debuff if effectParams present
        if (config.effectParams) {
          const ep = config.effectParams
          e.activeEffects = e.activeEffects ?? []
          e.activeEffects.push({
            source: 'aoe_debuff',
            params: ep,
            expiresAt: Date.now() + (ep.duration ?? 2000),
          })
          if (ep.stunned) e.isStunned = true
          if (ep.rooted)  e.isRooted  = true
          if (ep.speedMultiplier != null) e.speedMult = (e.speedMult ?? 1) * ep.speedMultiplier
        }
      }
    })

    // Damage boss
    if (gs.boss && !gs.boss.isDead) {
      if (this._collision.distance({ x: cx, y: cy }, { x: gs.boss.x, y: gs.boss.y }) <= radius + gs.boss.radius) {
        this._dealDamage(gs, player, gs.boss, config.damage ?? 0)
      }
    }
  }

  // ── Damage helper ──────────────────────────────────────────────────────────

  _dealDamage(gs, attacker, target, amount, sourceSkill) {
    if (amount <= 0) return
    if (target.isDead) return

    let remaining = amount

    // Shield absorption
    if (target.shieldAbsorb > 0) {
      const absorbed = Math.min(target.shieldAbsorb, remaining)
      target.shieldAbsorb -= absorbed
      remaining -= absorbed
      if (remaining <= 0) return
    }

    // Damage reduction
    if (target.damageReduction) {
      remaining *= (1 - target.damageReduction)
    }

    // Attacker damage multiplier
    const mult = attacker?.damageMult ?? 1
    remaining *= mult

    const finalAmount = Math.round(remaining)
    if (finalAmount <= 0) return

    const wasDead = target.isDead
    target.takeDamage(finalAmount)

    // Emit damage event for VFX
    if (gs.io) {
      gs.io.emit('effect:damage', {
        targetId: target.id,
        amount: finalAmount,
        type: 'damage',
        sourceSkill: sourceSkill ?? null,
      })
    }

    // Track damage dealt
    if (attacker) {
      gs.stats.damage[attacker.id] = (gs.stats.damage[attacker.id] ?? 0) + finalAmount
    }

    // Check death
    if (!wasDead && target.isDead) {
      if (!target.isPlayer) {
        // Enemy kill
        gs.stats.kills = (gs.stats.kills ?? 0) + 1
      } else {
        // Player death
        gs.stats.deaths[target.id] = (gs.stats.deaths[target.id] ?? 0) + 1
      }
    }

    // Break stealth on attack
    if (attacker?.isInvisible) {
      attacker.activeEffects = attacker.activeEffects.filter(e => !(e.params?.invisible))
      rebuildStats(attacker)
    }
  }

  // ── Tick helpers ───────────────────────────────────────────────────────────

  _tickProjectiles(gs, dt) {
    gs.projectiles.forEach((proj, id) => {
      if (!proj.isAlive) {
        gs.projectiles.delete(id)
        return
      }

      const prevX = proj.x
      const prevY = proj.y

      proj.x += proj.vx * dt
      proj.y += proj.vy * dt

      const moved = Math.hypot(proj.x - prevX, proj.y - prevY)
      proj.distTraveled += moved

      // Out of bounds
      if (
        proj.x < 0 || proj.x > GAME_CONFIG.CANVAS_WIDTH ||
        proj.y < 0 || proj.y > GAME_CONFIG.CANVAS_HEIGHT
      ) {
        proj.isAlive = false
        gs.projectiles.delete(id)
        return
      }

      if (proj.isLobbed) {
        // Lobbed: check proximity to target
        const distToTarget = Math.hypot(proj.targetX - proj.x, proj.targetY - proj.y)
        if (distToTarget < 20 || proj.distTraveled >= proj.range) {
          // Detonate
          const aoCfg = proj.aoeConfig
          if (aoCfg) {
            const owner = gs.players.get(proj.ownerId)
            this._executeAOEAtPoint(gs, owner ?? null, aoCfg, proj.x, proj.y)
          }
          proj.isAlive = false
          gs.projectiles.delete(id)
        }
        return
      }

      // Range exceeded
      if (proj.distTraveled >= proj.range) {
        proj.isAlive = false
        gs.projectiles.delete(id)
        return
      }

      // Collision check vs enemies
      gs.enemies.forEach(e => {
        if (!proj.isAlive || e.isDead) return
        if (proj.hit.has(e.id)) return
        const projCircle = { x: proj.x, y: proj.y, radius: proj.radius }
        const enemyCircle = { x: e.x, y: e.y, radius: e.radius }
        if (this._collision.circlesOverlap(projCircle, enemyCircle)) {
          this._handleProjectileHit(gs, proj, e)
        }
      })

      // Collision check vs boss
      if (proj.isAlive && gs.boss && !gs.boss.isDead) {
        if (!proj.hit.has('boss')) {
          const projCircle = { x: proj.x, y: proj.y, radius: proj.radius }
          const bossCircle = { x: gs.boss.x, y: gs.boss.y, radius: gs.boss.radius }
          if (this._collision.circlesOverlap(projCircle, bossCircle)) {
            this._handleProjectileHit(gs, proj, gs.boss)
          }
        }
      }

      if (!proj.isAlive) {
        gs.projectiles.delete(id)
      }
    })
  }

  _handleProjectileHit(gs, proj, target) {
    proj.hit.add(target.id)

    if (proj.effectType === 'HEAL') {
      // Heal projectile — only hits players
      if (target.isPlayer) {
        const amount = proj.healAmount ?? 0
        target.heal(amount)
        if (gs.io && amount > 0) {
          gs.io.emit('effect:damage', { targetId: target.id, amount, type: 'heal', sourceSkill: null })
        }
      }
    } else {
      const owner = gs.players.get(proj.ownerId)
      this._dealDamage(gs, owner, target, proj.damage ?? 0)

      // Secondary AOE on impact (e.g. Pyroblast)
      if (proj.onImpact) {
        this._executeAOEAtPoint(gs, owner ?? null, {
          damage: proj.onImpact.damage,
          radius: proj.onImpact.radius,
          effectType: 'DAMAGE',
        }, proj.x, proj.y)
      }
    }

    if (!proj.pierce) {
      proj.isAlive = false
    }
  }

  _tickEffects(gs) {
    const now = Date.now()
    gs.players.forEach(p => {
      if (!p.activeEffects?.length) return
      const before = p.activeEffects.length
      p.activeEffects = p.activeEffects.filter(e => e.expiresAt > now)
      if (p.activeEffects.length !== before) {
        rebuildStats(p)
      }
    })

    // Also tick enemy effects
    gs.enemies.forEach(e => {
      if (!e.activeEffects?.length) return
      const before = e.activeEffects.length
      e.activeEffects = e.activeEffects.filter(eff => eff.expiresAt > now)
      if (e.activeEffects.length !== before) {
        // Re-evaluate status effects for enemy
        e.isStunned = e.activeEffects.some(eff => eff.params?.stunned)
        e.isRooted  = e.activeEffects.some(eff => eff.params?.rooted)
        e.speedMult = 1
        for (const eff of e.activeEffects) {
          if (eff.params?.speedMultiplier != null) e.speedMult *= eff.params.speedMultiplier
        }
      }
    })
  }

  _tickCasts(gs) {
    const now = Date.now()
    gs.players.forEach(p => {
      if (!p.activeCast) return
      const cast = p.activeCast
      const elapsed = now - cast.startedAt

      if (cast.isChanneled) {
        // Fire payload on each channel tick
        const timeSinceLastTick = now - cast.lastChannelTick
        const tickRate = cast.config.payload?.tickRate ?? 500
        if (timeSinceLastTick >= tickRate) {
          cast.lastChannelTick = now
          this._executeCastPayload(gs, p, cast.config.payload, cast.vector)
        }
        // End channeling when castTime expires
        if (elapsed >= cast.config.castTime) {
          p.activeCast = null
        }
      } else {
        // Non-channeled: fire when castTime expires
        if (elapsed >= cast.config.castTime) {
          this._executeCastPayload(gs, p, cast.config.payload, cast.vector)
          p.activeCast = null
        }
      }
    })
  }

  _tickZones(gs) {
    const now = Date.now()
    for (let i = this.activeZones.length - 1; i >= 0; i--) {
      const zone = this.activeZones[i]
      if (now >= zone.expiresAt) {
        this.activeZones.splice(i, 1)
        continue
      }
      // Tick damage/heal at tickRate intervals
      if (now - zone.lastTick >= zone.tickRate) {
        zone.lastTick = now
        const owner = gs.players.get(zone.ownerId)
        this._executeAOEAtPoint(gs, owner, zone.config, zone.x, zone.y)
      }
    }
  }

  /**
   * Create a persistent AOE ground zone.
   */
  addZone(ownerId, config, x, y, color) {
    const id = ++this._zoneSeq
    this.activeZones.push({
      id,
      ownerId,
      config,
      x, y,
      radius: config.radius ?? 100,
      color,
      createdAt: Date.now(),
      expiresAt: Date.now() + (config.duration ?? 5000),
      tickRate: config.tickRate ?? 500,
      lastTick: Date.now(),
    })
    return id
  }

  /** Serialise active zones for delta state. */
  getZonesDTO() {
    const now = Date.now()
    return this.activeZones.map(z => ({
      id: z.id,
      x: Math.round(z.x),
      y: Math.round(z.y),
      radius: z.radius,
      color: z.color,
      remaining: Math.max(0, z.expiresAt - now),
      duration: z.expiresAt - z.createdAt,
    }))
  }

  _executeCastPayload(gs, player, payload, vector) {
    if (!payload) return
    if (payload.type === 'PROJECTILE') {
      const color = CLASSES[player.className]?.color ?? '#ffffff'
      const v = normalize(vector)
      this._spawnProjectile(gs, player, {
        speed:    payload.speed  ?? 300,
        radius:   payload.radius ?? 15,
        range:    payload.range  ?? 500,
        damage:   payload.damage ?? 0,
        healAmount: payload.healAmount ?? 0,
        effectType: payload.effectType ?? 'DAMAGE',
        pierce:   payload.pierce ?? false,
      }, {
        vx: v.x * (payload.speed ?? 300),
        vy: v.y * (payload.speed ?? 300),
        color,
        onImpact: payload.onImpact ?? null,
      })
    } else if (payload.type === 'AOE') {
      this._executeAOEAtPoint(gs, player, {
        ...payload,
        damage: payload.damage ?? 0,
        radius: payload.radius ?? 100,
      }, player.x, player.y)
    }
  }

  // ── Internal projectile spawner ────────────────────────────────────────────

  _spawnProjectile(gs, player, config, overrides) {
    const id = ++this._projSeq
    gs.projectiles.set(id, {
      id,
      x: player.x,
      y: player.y,
      vx: overrides.vx ?? 0,
      vy: overrides.vy ?? 0,
      radius:      config.radius    ?? 8,
      range:       config.range     ?? 500,
      distTraveled: 0,
      ownerId:     player.id,
      damage:      config.damage    ?? 0,
      healAmount:  config.healAmount ?? 0,
      effectType:  config.effectType ?? 'DAMAGE',
      pierce:      config.pierce    ?? false,
      hit:         new Set(),
      color:       overrides.color  ?? '#ffffff',
      isAlive:     true,
      isLobbed:    false,
      targetX:     0,
      targetY:     0,
      onImpact:    overrides.onImpact ?? null,
    })
  }
}
