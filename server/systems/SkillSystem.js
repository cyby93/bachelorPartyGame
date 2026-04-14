/**
 * server/systems/SkillSystem.js
 * Authoritative skill execution engine.
 * Routes skill inputs by config.type and manages projectile / effect / cast ticks.
 */

import CollisionSystem from './CollisionSystem.js'
import { GAME_CONFIG } from '../../shared/GameConfig.js'
import { CLASSES }     from '../../shared/ClassConfig.js'
import ServerMinion    from '../entities/ServerMinion.js'
import { hitsWall }    from '../../shared/WallCollision.js'

// ── Standalone helpers ────────────────────────────────────────────────────────

/**
 * Rebuild derived stats for a player from their activeEffects array.
 * Called after any effect is added or removed.
 */
export function rebuildStats(player) {
  player.speedMult       = 1
  player.damageMult      = 1
  player.fireRateMult    = 1
  player.damageReduction = 0
  player.isRooted        = false
  player.isStunned       = false
  player.isInvisible     = false
  for (const effect of player.activeEffects) {
    const p = effect.params ?? {}
    if (p.speedMultiplier    != null) player.speedMult    *= p.speedMultiplier
    if (p.damageMultiplier   != null) player.damageMult   *= p.damageMultiplier
    if (p.fireRateMultiplier != null) player.fireRateMult *= p.fireRateMultiplier
    if (p.damageReduction    != null) player.damageReduction = Math.max(player.damageReduction, p.damageReduction)
    if (p.rooted)    player.isRooted    = true
    if (p.stunned)   player.isStunned   = true
    if (p.invisible) player.isInvisible = true
  }

  // Grant any newly-added shield effects
  if (player.shieldAbsorb == null) player.shieldAbsorb = 0
  for (const effect of player.activeEffects) {
    if (effect.params?.shield != null && !effect.shieldApplied) {
      effect.shieldApplied = true
      player.shieldAbsorb += effect.params.shield
    }
  }
  // Clamp to total from currently-active effects so that an expiring effect
  // zeroes out whatever absorb remained (prevents the timer/absorb desync)
  const totalShield = player.activeEffects
    .filter(e => e.params?.shield != null && e.shieldApplied)
    .reduce((sum, e) => sum + e.params.shield, 0)
  player.shieldAbsorb = Math.min(player.shieldAbsorb, totalShield)
}

// ── Normalise a vector to unit length ────────────────────────────────────────

function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  if (len === 0) return { x: 1, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

function clampPos(gs, x, y, r) {
  const arenaWidth = gs?.arenaWidth ?? GAME_CONFIG.CANVAS_WIDTH
  const arenaHeight = gs?.arenaHeight ?? GAME_CONFIG.CANVAS_HEIGHT
  return {
    x: Math.max(r, Math.min(arenaWidth  - r, x)),
    y: Math.max(r, Math.min(arenaHeight - r, y)),
  }
}

// ── SkillSystem ───────────────────────────────────────────────────────────────

export default class SkillSystem {
  constructor() {
    this._collision    = new CollisionSystem()
    this._projSeq      = 0
    this._zoneSeq      = 0
    this.activeZones   = []   // persistent AOE ground zones
    this._pendingBursts = []  // queued consecutive projectiles (BURST subtype)
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
    const isSelfCast = !!(config.selfCastFallback && Math.hypot(vector?.x ?? 0, vector?.y ?? 0) < 0.01)
    const v = normalize(vector ?? { x: 1, y: 0 })

    switch (config.type) {
      case 'PROJECTILE': return this._executeProjectile(gs, player, config, v, isSelfCast)
      case 'MELEE':      return this._executeMelee(gs, player, config, v)
      case 'AOE':        return this._executeAOE(gs, player, config, v)
      case 'DASH':       return this._executeDash(gs, player, config, v)
      case 'BUFF':       return this._executeBuff(gs, player, config, skillIndex, v, isSelfCast)
      case 'SHIELD':     return this._executeShield(player, config, vector, action, skillIndex)
      case 'CAST':       return this._executeCast(gs, player, config, v)
      case 'CHANNEL':    return this._executeChannel(gs, player, config, skillIndex, v)
      case 'TARGETED':   return this._executeTargeted(gs, player, config, v, isSelfCast)
      case 'SPAWN':      this._executeSpawn(gs, player, config, v); break
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
    this._tickBursts(gs)
    this._tickEffects(gs)
    this._tickCasts(gs)
    this._tickChannels(gs)
    this._tickZones(gs)
    this._tickMinions(gs, dt)
  }

  // ── Skill handlers ─────────────────────────────────────────────────────────

  _executeProjectile(gs, player, config, v, isSelfCast = false) {
    const color = CLASSES[player.className]?.color ?? '#ffffff'

    if (config.subtype === 'BURST') {
      const count    = config.burstCount    ?? 3
      const interval = config.burstInterval ?? 200
      const now      = Date.now()
      for (let i = 0; i < count; i++) {
        this._pendingBursts.push({
          spawnAt:  now + i * interval,
          playerId: player.id,
          vx:       isSelfCast ? 0 : v.x * config.speed,
          vy:       isSelfCast ? 0 : v.y * config.speed,
          config,
          color,
          selfCast: isSelfCast,
        })
      }
      return
    }

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
    let hitCount = 0

    // Hit enemies
    gs.enemies.forEach(e => {
      if (e.isDead) return
      if (this._collision.inCone({ x: player.x, y: player.y }, v, halfAngle, config.range, { x: e.x, y: e.y })) {
        this._dealDamage(gs, player, e, config.damage ?? 0)
        hitCount++
        // Apply debuff if effectParams present (e.g. Frost Strike slow)
        if (config.effectParams) {
          const ep = config.effectParams
          e.activeEffects = e.activeEffects ?? []
          e.activeEffects.push({
            source: 'melee_debuff',
            params: ep,
            expiresAt: Date.now() + (ep.duration ?? 2000),
          })
          if (ep.stunned) e.isStunned = true
          if (ep.rooted)  e.isRooted  = true
          if (ep.speedMultiplier != null) e.speedMult = (e.speedMult ?? 1) * ep.speedMultiplier
        }
      }
    })

    // Hit boss
    if (gs.boss && !gs.boss.isDead && !gs.boss.isImmune) {
      if (this._collision.inCone({ x: player.x, y: player.y }, v, halfAngle, config.range, { x: gs.boss.x, y: gs.boss.y })) {
        this._dealDamage(gs, player, gs.boss, config.damage ?? 0)
        hitCount++
      }
    }

    // Hit gates
    if (gs.gates) {
      gs.gates.forEach(gate => {
        if (gate.isDead || !gate.isActive) return
        if (this._collision.inCone({ x: player.x, y: player.y }, v, halfAngle, config.range, { x: gate.x, y: gate.y })) {
          gate.takeDamage(Math.round((config.damage ?? 0) * (player.damageMult ?? 1)))
          hitCount++
        }
      })
    }

    // Hit buildings
    if (gs.buildings) {
      gs.buildings.forEach(building => {
        if (building.isDead) return
        if (this._collision.inCone({ x: player.x, y: player.y }, v, halfAngle, config.range, { x: building.x, y: building.y })) {
          building.takeDamage(Math.round((config.damage ?? 0) * (player.damageMult ?? 1)))
          hitCount++
        }
      })
    }

    // Combo point generation (Sinister Strike)
    if (config.addsComboPoint && hitCount > 0) {
      player.comboPoints = Math.min(5, (player.comboPoints ?? 0) + 1)
      if (gs.io) {
        gs.io.emit('player:comboPoints', { playerId: player.id, points: player.comboPoints })
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
      const clamp = clampPos(gs, targetX, targetY, 0)

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
        gs,
        player.x + v.x * dist,
        player.y + v.y * dist,
        r
      )
      player.x = newPos.x
      player.y = newPos.y
    } else if (config.subtype === 'BACKWARDS') {
      const newPos = clampPos(
        gs,
        player.x - v.x * dist,
        player.y - v.y * dist,
        r
      )
      player.x = newPos.x
      player.y = newPos.y
    } else {
      // Default: forward charge — stun enemies in path
      const newPos = clampPos(
        gs,
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

  _executeBuff(gs, player, config, skillIndex, v = { x: 1, y: 0 }, isSelfCast = false) {
    const source = `skill:${skillIndex}`

    // TARGETED: apply buff to an ally (or self on self-cast)
    if (config.subtype === 'TARGETED') {
      const target = isSelfCast ? player : this._findAllyForBuff(gs, player, v, config.range ?? 400)
      if (!target) return false   // no ally in direction — caller skips cooldown

      const existing = target.activeEffects.findIndex(e => e.source === source)
      if (existing !== -1) target.activeEffects.splice(existing, 1)
      target.activeEffects.push({
        source,
        params:    config.effectParams ?? {},
        expiresAt: config.duration === -1 ? Infinity : Date.now() + (config.duration ?? 0),
      })
      rebuildStats(target)
      return true
    }

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
    return true
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

    // BEAM subtype: find target in aim direction, start channeled drain
    if (config.subtype === 'BEAM') {
      const target = this._findBeamTarget(gs, player, v, config.range ?? 250)
      if (!target) return   // no valid target — skill fizzles

      const frm = player.fireRateMult ?? 1
      player.activeCast = {
        config,
        vector: v,
        startedAt: Date.now(),
        isChanneled: true,
        lastChannelTick: Date.now(),
        beamTargetId: target.id,
        beamRange: config.range ?? 250,
        effectiveCastTime: (config.castTime ?? 1000) / frm,
        effectiveTickRate: (config.tickRate ?? 500) / frm,
      }
      return
    }

    // DIRECTIONAL casts were pre-cast on the controller — fire immediately
    if (config.inputType === 'DIRECTIONAL' && config.subtype !== 'CHANNELED') {
      this._executeCastPayload(gs, player, config.payload, v)
      return
    }

    const frm = player.fireRateMult ?? 1
    player.activeCast = {
      config,
      vector: v,
      startedAt: Date.now(),
      isChanneled: config.subtype === 'CHANNELED',
      lastChannelTick: Date.now(),
      effectiveCastTime: (config.castTime ?? 1000) / frm,
      effectiveTickRate: (config.payload?.tickRate ?? config.tickRate ?? 500) / frm,
    }
  }

  _executeChannel(gs, player, config, skillIndex, v) {
    if (player.activeCast != null) return false   // already casting/channeling

    // BEAM: must find a target first — if none, fizzle without consuming cooldown
    if (config.subtype === 'BEAM') {
      const target = this._findBeamTarget(gs, player, v, config.range ?? 250)
      if (!target) return false

      const frm = player.fireRateMult ?? 1
      player.activeCast = {
        config,
        vector: v,
        startedAt:       Date.now(),
        lastChannelTick: Date.now(),
        skillIndex,
        channelStartX:   player.x,
        channelStartY:   player.y,
        beamTargetId:    target.id,
        beamRange:       config.range ?? 250,
        effectiveCastTime: (config.castTime ?? 1000) / frm,
        effectiveTickRate: (config.tickRate ?? 500) / frm,
      }
      return true
    }

    // UNTARGETED (e.g. Tranquility): activate immediately
    const frm = player.fireRateMult ?? 1
    player.activeCast = {
      config,
      vector: v,
      startedAt:       Date.now(),
      lastChannelTick: Date.now(),
      skillIndex,
      channelStartX:   player.x,
      channelStartY:   player.y,
      effectiveCastTime: (config.castTime ?? 1000) / frm,
      effectiveTickRate: (config.tickRate ?? 500) / frm,
    }
    return true
  }

  _executeTargeted(gs, player, config, v, isSelfCast = false) {
    if (config.subtype === 'HEAL_ALLY') {
      let primaryTarget
      let healedIds

      if (isSelfCast) {
        primaryTarget = player
        healedIds     = new Set()
      } else {
        primaryTarget = this._findRayAlly(gs, player, v, config.range ?? 400)
        if (!primaryTarget) {
          // No ally in aim direction — fall back to self if skill allows it
          if (config.selfCastFallback) {
            primaryTarget = player
          } else {
            return false
          }
        }
        healedIds = new Set([player.id])
      }

      const amount      = config.healAmount  ?? 0
      const maxChains   = config.maxChains   ?? 0
      const chainRadius = config.chainRadius ?? 200
      const color       = CLASSES[player.className]?.color ?? '#ffffff'

      let prevX   = player.x
      let prevY   = player.y
      let current = primaryTarget

      for (let i = 0; i <= maxChains; i++) {
        current.heal(amount)
        this._trackHeal(gs, player.id, amount)
        if (gs.io && amount > 0) {
          gs.io.emit('effect:damage', { targetId: current.id, amount, type: 'heal', sourceSkill: config.name })
        }
        if (gs.io) {
          gs.io.emit('targeted:hit', {
            casterX: Math.round(prevX),     casterY: Math.round(prevY),
            targetX: Math.round(current.x), targetY: Math.round(current.y),
            effectType: 'heal', color,
          })
        }

        // Apply HoT if configured (e.g. Regrowth) — only on primary target (i === 0)
        if (config.hot && i === 0) {
          const h = config.hot
          const hotSource = `hot:${config.name}`
          const existingIdx = current.activeEffects.findIndex(e => e.source === hotSource)
          if (existingIdx !== -1) current.activeEffects.splice(existingIdx, 1)   // refresh HoT
          current.activeEffects.push({
            source:        hotSource,
            ownerId:       player.id,
            params:        { healPerTick: h.healPerTick, tickRate: h.tickRate, sourceSkill: h.sourceSkill ?? config.name },
            expiresAt:     Date.now() + (h.duration ?? 5000),
            lastHealTick:  Date.now(),
          })
        }

        healedIds.add(current.id)
        prevX = current.x
        prevY = current.y
        if (i === maxChains) break
        const next = this._findChainTarget(gs, current.x, current.y, chainRadius, healedIds)
        if (!next) break
        current = next
      }

      return true
    }

    if (config.subtype === 'DAMAGE_ENEMY') {
      // Tap with no aim direction → find nearest enemy; otherwise ray-cast in aim direction
      const target = isSelfCast
        ? this._findNearestEnemy(gs, player, config.range ?? 450)
        : this._findBeamTarget(gs, player, v, config.range ?? 400)
      if (!target) return false
      this._dealDamage(gs, player, target, config.damage ?? 0, config.name)

      // Apply DoT if configured (e.g. Moonfire)
      if (config.dot) {
        const d = config.dot
        target.activeEffects = target.activeEffects ?? []
        const existingIdx = target.activeEffects.findIndex(e => e.params?.sourceSkill === d.sourceSkill)
        if (existingIdx !== -1) target.activeEffects.splice(existingIdx, 1)   // refresh DoT
        target.activeEffects.push({
          source:         `dot:${config.name}`,
          ownerId:        player.id,
          params:         { damagePerTick: d.damagePerTick, tickRate: d.tickRate, sourceSkill: d.sourceSkill ?? config.name },
          expiresAt:      Date.now() + (d.duration ?? 4000),
          lastDamageTick: Date.now(),
        })
      }

      const color = CLASSES[player.className]?.color ?? '#ffffff'
      if (gs.io) {
        gs.io.emit('targeted:hit', {
          casterX: Math.round(player.x), casterY: Math.round(player.y),
          targetX: Math.round(target.x), targetY: Math.round(target.y),
          effectType: 'damage', color,
        })
      }
      return true
    }

    if (config.subtype === 'TELEPORT_BEHIND') {
      const target = this._findBeamTarget(gs, player, v, config.range ?? 350)
      if (!target) return false

      // Record position before teleport for VFX line
      const fromX = player.x
      const fromY = player.y

      // Teleport behind enemy — same approach direction, past target center
      const dx = target.x - player.x
      const dy = target.y - player.y
      const dist = Math.hypot(dx, dy)
      const nx = dx / dist
      const ny = dy / dist
      const behindDist = (target.radius ?? 15) + (GAME_CONFIG.PLAYER_RADIUS ?? 12) + 5
      const behindPos = clampPos(gs, target.x + nx * behindDist, target.y + ny * behindDist, GAME_CONFIG.PLAYER_RADIUS ?? 12)
      player.x = behindPos.x
      player.y = behindPos.y

      // Damage scales with combo points then resets them
      const comboBonus = (config.comboDamage ?? 0) * (player.comboPoints ?? 0)
      this._dealDamage(gs, player, target, (config.damage ?? 0) + comboBonus, config.name)

      const oldPoints = player.comboPoints ?? 0
      player.comboPoints = 0
      if (gs.io && oldPoints > 0) {
        gs.io.emit('player:comboPoints', { playerId: player.id, points: 0 })
      }

      // VFX leap line from old position to target
      const color = CLASSES[player.className]?.color ?? '#ffffff'
      if (gs.io) {
        gs.io.emit('targeted:hit', {
          casterX: Math.round(fromX), casterY: Math.round(fromY),
          targetX: Math.round(target.x), targetY: Math.round(target.y),
          effectType: 'damage', color,
        })
      }
      return true
    }

    if (config.subtype === 'GRIP') {
      const target = isSelfCast
        ? this._findNearestEnemy(gs, player, config.range ?? 350)
        : this._findBeamTarget(gs, player, v, config.range ?? 350)
      if (!target || target.id === 'boss') return false   // boss is immune
      target.pullTarget = { x: player.x, y: player.y, speed: 600 }
      target.activeEffects = target.activeEffects ?? []
      target.activeEffects.push({
        source:    'grip',
        ownerId:   player.id,
        params:    { isPull: true },
        expiresAt: Date.now() + 1000,
      })
      const color = CLASSES[player.className]?.color ?? '#ffffff'
      if (gs.io) {
        gs.io.emit('targeted:hit', {
          casterX: Math.round(player.x), casterY: Math.round(player.y),
          targetX: Math.round(target.x), targetY: Math.round(target.y),
          effectType: 'damage', color,
        })
      }
      return true
    }

    return false
  }

  _executeSpawn(gs, player, config, v) {
    if (!gs.minions) return

    // Replace existing minion of same subtype from this player
    gs.minions.forEach((m, id) => {
      if (m.ownerId === player.id && m.minionType === config.subtype) {
        gs.minions.delete(id)
      }
    })

    const id = gs.nextMinionId()
    const color = CLASSES[player.className]?.color ?? '#ffffff'
    const spawnX = player.x + v.x * 30
    const spawnY = player.y + v.y * 30

    gs.minions.set(id, new ServerMinion({ id, ownerId: player.id, config, x: spawnX, y: spawnY, color }))
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
          this._trackHeal(gs, player.id, amount)
          if (gs.io && amount > 0) {
            gs.io.emit('effect:damage', { targetId: p.id, amount, type: 'heal', sourceSkill: config.name ?? null })
          }
        }
      })
      // Also heal healable NPCs in radius (e.g. Akama)
      gs.npcs?.forEach(npc => {
        if (npc.isDead || !npc.isHealable) return
        if (this._collision.distance({ x: cx, y: cy }, { x: npc.x, y: npc.y }) <= radius) {
          const amount = config.healAmount ?? 0
          npc.heal(amount)
          if (gs.io && amount > 0) {
            gs.io.emit('effect:damage', { targetId: npc.id, amount, type: 'heal', sourceSkill: config.name ?? null })
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
          this._trackHeal(gs, player.id, amount)
          if (gs.io && amount > 0) {
            gs.io.emit('effect:damage', { targetId: p.id, amount, type: 'heal', sourceSkill: config.name ?? null })
          }
        }
      })
      // Also heal healable NPCs in radius
      gs.npcs?.forEach(npc => {
        if (npc.isDead || !npc.isHealable) return
        if (this._collision.distance({ x: cx, y: cy }, { x: npc.x, y: npc.y }) <= radius) {
          const amount = config.healAmount ?? 0
          npc.heal(amount)
          if (gs.io && amount > 0) {
            gs.io.emit('effect:damage', { targetId: npc.id, amount, type: 'heal', sourceSkill: config.name ?? null })
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

    if (effectType === 'FEAR') {
      // Fear all trash mobs in radius (boss immune)
      const fearDuration = config.fearDuration ?? 2500
      gs.enemies.forEach(e => {
        if (e.isDead) return
        if (this._collision.distance({ x: cx, y: cy }, { x: e.x, y: e.y }) <= radius + e.radius) {
          e.activeEffects = e.activeEffects ?? []
          e.activeEffects.push({
            source: 'fear',
            ownerId: player?.id,
            params: {
              feared: true,
              fearSource: { x: cx, y: cy },
              sourceSkill: config.name,
            },
            expiresAt: Date.now() + fearDuration,
          })
          e.isFeared = true
          e.fearSource = { x: cx, y: cy }
        }
      })
      // Boss is immune — no effect
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
    if (gs.boss && !gs.boss.isDead && !gs.boss.isImmune) {
      if (this._collision.distance({ x: cx, y: cy }, { x: gs.boss.x, y: gs.boss.y }) <= radius + gs.boss.radius) {
        this._dealDamage(gs, player, gs.boss, config.damage ?? 0)
      }
    }

    // Damage gates (circle AOE vs rect gate)
    if (gs.gates) {
      gs.gates.forEach(gate => {
        if (gate.isDead || !gate.isActive) return
        const aoeCircle = { x: cx, y: cy, radius }
        const gateRect  = { x: gate.x, y: gate.y, width: gate.width ?? 40, height: gate.height ?? 100 }
        if (this._collision.circleRectOverlap(aoeCircle, gateRect)) {
          gate.takeDamage(Math.round((config.damage ?? 0) * (player?.damageMult ?? 1)))
        }
      })
    }

    // Damage buildings (circle AOE vs rect building)
    if (gs.buildings) {
      gs.buildings.forEach(building => {
        if (building.isDead) return
        const aoeCircle    = { x: cx, y: cy, radius }
        const buildingRect = { x: building.x, y: building.y, width: building.width ?? 60, height: building.height ?? 60 }
        if (this._collision.circleRectOverlap(aoeCircle, buildingRect)) {
          building.takeDamage(Math.round((config.damage ?? 0) * (player?.damageMult ?? 1)))
        }
      })
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

    // Attacker damage multiplier (includes active buffs)
    const mult = attacker?.damageMult ?? 1
    remaining *= mult

    // Shadow strike bonus — one-shot multiplier from attacking out of Vanish
    if (attacker?.shadowStrikeMult) {
      remaining *= attacker.shadowStrikeMult
      attacker.shadowStrikeMult = 0
    }

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

    // Track damage dealt (cumulative + per-level)
    if (attacker) {
      gs.stats.damage[attacker.id] = (gs.stats.damage[attacker.id] ?? 0) + finalAmount
      if (gs.levelStats) gs.levelStats.damage[attacker.id] = (gs.levelStats.damage[attacker.id] ?? 0) + finalAmount
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

  // Track healing done by a caster (cumulative + per-level)
  _trackHeal(gs, casterId, amount) {
    if (!casterId || !amount || amount <= 0) return
    gs.stats.heal[casterId] = (gs.stats.heal[casterId] ?? 0) + amount
    if (gs.levelStats) gs.levelStats.heal[casterId] = (gs.levelStats.heal[casterId] ?? 0) + amount
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

      // Wall collision — destroy projectile if it hits a solid wall
      if (gs.wallSegments && gs.wallSegments.length > 0 && gs.isGateDead) {
        if (hitsWall(proj.x, proj.y, proj.radius ?? 4, gs.wallSegments, gs.isGateDead)) {
          proj.isAlive = false
          gs.projectiles.delete(id)
          return
        }
      }

      // Out of bounds
      if (
        proj.x < 0 || proj.x > (gs.arenaWidth ?? GAME_CONFIG.CANVAS_WIDTH) ||
        proj.y < 0 || proj.y > (gs.arenaHeight ?? GAME_CONFIG.CANVAS_HEIGHT)
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
            // Create persistent zone if config has duration + tickRate
            if (aoCfg.duration && aoCfg.tickRate) {
              const color = owner ? (CLASSES[owner.className]?.color ?? '#ffff00') : '#ffff00'
              this.addZone(proj.ownerId, aoCfg, proj.x, proj.y, color)
            }
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
          // Shield check — shielded enemies block projectiles from the protected arc
          if (e._shieldActive && e._shieldAngle != null) {
            let diff = Math.atan2(proj.vy, proj.vx) - e._shieldAngle
            // Normalise to [-π, π]
            while (diff >  Math.PI) diff -= Math.PI * 2
            while (diff < -Math.PI) diff += Math.PI * 2
            if (Math.abs(diff) < e._shieldArc / 2) {
              // Deflected — consume the projectile but deal no damage
              proj.hit.add(e.id)
              if (!proj.pierce) proj.isAlive = false
              gs.io?.emit('skill:fired', { type: 'BUFF', subtype: 'SHIELD_DEFLECT', x: proj.x, y: proj.y, color: '#4db8e8' })
              return
            }
          }
          this._handleProjectileHit(gs, proj, e)
        }
      })

      // Collision check vs boss
      if (proj.isAlive && gs.boss && !gs.boss.isDead && !gs.boss.isImmune) {
        if (!proj.hit.has('boss')) {
          const projCircle = { x: proj.x, y: proj.y, radius: proj.radius }
          const bossCircle = { x: gs.boss.x, y: gs.boss.y, radius: gs.boss.radius }
          if (this._collision.circlesOverlap(projCircle, bossCircle)) {
            this._handleProjectileHit(gs, proj, gs.boss)
          }
        }
      }

      // Collision check vs gates (circle-vs-rect)
      if (proj.isAlive && gs.gates && !proj.isEnemyProj) {
        gs.gates.forEach(gate => {
          if (!proj.isAlive || gate.isDead || !gate.isActive) return
          if (proj.hit.has(gate.id)) return
          const projCircle = { x: proj.x, y: proj.y, radius: proj.radius }
          const gateRect   = { x: gate.x, y: gate.y, width: gate.width ?? 40, height: gate.height ?? 100 }
          if (this._collision.circleRectOverlap(projCircle, gateRect)) {
            proj.hit.add(gate.id)
            gate.takeDamage(proj.damage ?? 0)
            if (!proj.pierce) proj.isAlive = false
          }
        })
      }

      // Collision check vs buildings (circle-vs-rect)
      if (proj.isAlive && gs.buildings && !proj.isEnemyProj) {
        gs.buildings.forEach(building => {
          if (!proj.isAlive || building.isDead) return
          if (proj.hit.has(building.id)) return
          const projCircle    = { x: proj.x, y: proj.y, radius: proj.radius }
          const buildingRect  = { x: building.x, y: building.y, width: building.width ?? 60, height: building.height ?? 60 }
          if (this._collision.circleRectOverlap(projCircle, buildingRect)) {
            proj.hit.add(building.id)
            building.takeDamage(proj.damage ?? 0)
            if (!proj.pierce) proj.isAlive = false
          }
        })
      }

      // Collision check vs players — for canHitAllies projectiles (e.g. Penance heals allies)
      if (proj.isAlive && proj.canHitAllies) {
        gs.players.forEach(p => {
          if (!proj.isAlive || p.isHost || p.isDead) return
          if (proj.hit.has(p.id)) return
          // Skip the caster unless this is a self-cast projectile
          if (p.id === proj.ownerId && !proj.selfCast) return
          const projCircle     = { x: proj.x, y: proj.y, radius: proj.radius }
          const playerEllipse  = { x: p.x,    y: p.y,    rx: GAME_CONFIG.PLAYER_RADIUS_X, ry: GAME_CONFIG.PLAYER_RADIUS_Y }
          if (!this._collision.ellipseCircleOverlap(playerEllipse, projCircle)) return
          proj.hit.add(p.id)
          const amount = proj.healAmount ?? 0
          if (amount > 0) {
            p.heal(amount)
            this._trackHeal(gs, proj.ownerId, amount)
            if (gs.io) gs.io.emit('effect:damage', { targetId: p.id, amount, type: 'heal', sourceSkill: null })
          }
          if (!proj.pierce) proj.isAlive = false
        })
        // Also check healable NPCs (e.g. Akama)
        if (proj.isAlive) {
          gs.npcs?.forEach(npc => {
            if (!proj.isAlive || npc.isDead || !npc.isHealable) return
            if (proj.hit.has(npc.id)) return
            const projCircle = { x: proj.x, y: proj.y, radius: proj.radius }
            const npcCircle  = { x: npc.x,  y: npc.y,  radius: npc.radius }
            if (!this._collision.circlesOverlap(projCircle, npcCircle)) return
            proj.hit.add(npc.id)
            const amount = proj.healAmount ?? 0
            if (amount > 0) {
              npc.heal(amount)
              if (gs.io) gs.io.emit('effect:damage', { targetId: npc.id, amount, type: 'heal', sourceSkill: null })
            }
            if (!proj.pierce) proj.isAlive = false
          })
        }
      }

      // Collision check vs players — for enemy-fired projectiles (e.g. RangedDummy)
      if (proj.isAlive && proj.isEnemyProj) {
        gs.players.forEach(p => {
          if (!proj.isAlive || p.isHost || p.isDead) return
          if (proj.hit.has(p.id)) return
          const projCircle    = { x: proj.x, y: proj.y, radius: proj.radius }
          const playerEllipse = { x: p.x,    y: p.y,    rx: GAME_CONFIG.PLAYER_RADIUS_X, ry: GAME_CONFIG.PLAYER_RADIUS_Y }
          if (!this._collision.ellipseCircleOverlap(playerEllipse, projCircle)) return

          proj.hit.add(p.id)
          // Directional shield blocks the projectile entirely
          if (p.isShieldBlocking(proj.x, proj.y)) {
            if (gs.io) gs.io.emit('effect:damage', { targetId: p.id, amount: 0, type: 'blocked', sourceSkill: null })
          } else {
            const amount = proj.damage ?? 0
            if (amount > 0) {
              const dealt = p.takeDamage(amount, 1)   // minHp=1: never kill players via enemy proj
              if (gs.io) gs.io.emit('effect:damage', { targetId: p.id, amount: dealt, type: 'damage', sourceSkill: null })
            }
          }
          if (!proj.pierce) proj.isAlive = false
        })
      }

      if (!proj.isAlive) {
        gs.projectiles.delete(id)
      }
    })
  }

  _tickBursts(gs) {
    const now = Date.now()
    for (let i = this._pendingBursts.length - 1; i >= 0; i--) {
      const entry = this._pendingBursts[i]
      if (now < entry.spawnAt) continue
      const player = gs.players.get(entry.playerId)
      if (!player || player.isDead) { this._pendingBursts.splice(i, 1); continue }
      this._spawnProjectile(gs, player, entry.config, {
        vx: entry.vx, vy: entry.vy, color: entry.color,
        selfCast: entry.selfCast,
      })
      this._pendingBursts.splice(i, 1)
    }
  }

  _handleProjectileHit(gs, proj, target) {
    proj.hit.add(target.id)
    if (proj.effectType === 'HEAL') {
      // Heal projectile — only hits players
      if (target.isPlayer) {
        const amount = proj.healAmount ?? 0
        target.heal(amount)
        this._trackHeal(gs, proj.ownerId, amount)
        if (gs.io && amount > 0) {
          gs.io.emit('effect:damage', { targetId: target.id, amount, type: 'heal', sourceSkill: null })
        }
      }
    } else if (proj.effectType === 'GRIP') {
      // Pull enemy toward caster (boss immune)
      if (!target.isPlayer && target.id !== 'boss') {
        const owner = gs.players.get(proj.ownerId)
        if (owner) {
          target.pullTarget = { x: owner.x, y: owner.y, speed: 600 }
          target.activeEffects = target.activeEffects ?? []
          target.activeEffects.push({
            source: 'grip',
            ownerId: owner.id,
            params: { isPull: true },
            expiresAt: Date.now() + 1000,   // safety timeout
          })
        }
      }
    } else {
      const owner = gs.players.get(proj.ownerId)
      this._dealDamage(gs, owner, target, proj.damage ?? 0)

      // Apply DoT if configured
      if (proj.dot && !target.isPlayer) {
        target.activeEffects = target.activeEffects ?? []
        target.activeEffects.push({
          source: 'dot',
          ownerId: proj.ownerId,
          params: {
            damagePerTick: proj.dot.damagePerTick,
            tickRate: proj.dot.tickRate,
            sourceSkill: proj.dot.sourceSkill ?? null,
          },
          expiresAt: Date.now() + (proj.dot.duration ?? 4000),
          lastDamageTick: Date.now(),
        })
      }

      // Apply on-hit debuff (e.g. slow from Avenger's Shield)
      if (proj.onHitEffect && !target.isPlayer) {
        const ep = proj.onHitEffect
        target.activeEffects = target.activeEffects ?? []
        target.activeEffects.push({
          source: 'projectile_debuff',
          ownerId: proj.ownerId,
          params: ep,
          expiresAt: Date.now() + (ep.duration ?? 2000),
        })
        if (ep.speedMultiplier != null) {
          target.speedMult = (target.speedMult ?? 1) * ep.speedMultiplier
        }
      }

      // Secondary AOE on impact (e.g. Pyroblast)
      if (proj.onImpact) {
        this._executeAOEAtPoint(gs, owner ?? null, {
          damage: proj.onImpact.damage,
          radius: proj.onImpact.radius,
          effectType: 'DAMAGE',
        }, proj.x, proj.y)
      }

      // Chain/ricochet — spawn a new projectile aimed at the next target
      if (proj.chainLeft > 0) {
        const nextTarget = this._findRicochetTarget(gs, proj)
        if (nextTarget) {
          const dx    = nextTarget.x - proj.x
          const dy    = nextTarget.y - proj.y
          const dist  = Math.sqrt(dx * dx + dy * dy)
          const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy)
          const chainId = ++this._projSeq
          gs.projectiles.set(chainId, {
            id:           chainId,
            x:            proj.x,
            y:            proj.y,
            vx:           dist > 0 ? (dx / dist) * speed : proj.vx,
            vy:           dist > 0 ? (dy / dist) * speed : proj.vy,
            radius:       proj.radius,
            range:        dist + 50,
            distTraveled: 0,
            ownerId:      proj.ownerId,
            damage:       proj.damage,
            healAmount:   proj.healAmount ?? 0,
            effectType:   proj.effectType,
            pierce:       false,
            hit:          new Set(proj.hit),   // copy — excludes already-hit targets
            color:        proj.color,
            isAlive:      true,
            isLobbed:     false,
            targetX:      0,
            targetY:      0,
            onImpact:     proj.onImpact,
            dot:          proj.dot,
            chainLeft:    proj.chainLeft - 1,
            chainRange:   proj.chainRange,
            onHitEffect:  proj.onHitEffect,
          })
        }
      }
      // original projectile dies after hitting its target (falls through below)
    }

    if (!proj.pierce) {
      proj.isAlive = false
    }
  }

  _findRicochetTarget(gs, proj) {
    let nearest = null
    let nearestDist = proj.chainRange

    for (const enemy of gs.enemies.values()) {
      if (enemy.isDead || proj.hit.has(enemy.id)) continue
      const d = this._collision.distance(proj, enemy)
      if (d < nearestDist) { nearestDist = d; nearest = enemy }
    }
    if (gs.boss && !gs.boss.isDead && !proj.hit.has(gs.boss.id)) {
      const d = this._collision.distance(proj, gs.boss)
      if (d < nearestDist) { nearestDist = d; nearest = gs.boss }
    }
    return nearest
  }

  _tickEffects(gs) {
    const now = Date.now()
    gs.players.forEach(p => {
      if (!p.activeEffects?.length) return

      // Tick HoT healing on players (e.g. Regrowth)
      for (const eff of p.activeEffects) {
        if (eff.params?.healPerTick && eff.params?.tickRate) {
          if (!eff.lastHealTick) eff.lastHealTick = now
          if (now - eff.lastHealTick >= eff.params.tickRate) {
            eff.lastHealTick = now
            if (!p.isDead) {
              p.heal(eff.params.healPerTick)
              this._trackHeal(gs, eff.ownerId, eff.params.healPerTick)
              if (gs.io) {
                gs.io.emit('effect:damage', { targetId: p.id, amount: eff.params.healPerTick, type: 'heal', sourceSkill: eff.params.sourceSkill ?? null })
              }
            }
          }
        }
      }

      const before = p.activeEffects.length
      p.activeEffects = p.activeEffects.filter(e => e.expiresAt > now)
      if (p.activeEffects.length !== before) {
        rebuildStats(p)
      }
    })

    // Also tick enemy effects
    gs.enemies.forEach(e => {
      if (e.isDead) return
      if (!e.activeEffects?.length) return

      // Tick DoT damage on enemies
      for (const eff of e.activeEffects) {
        if (eff.params?.damagePerTick && eff.params?.tickRate) {
          if (!eff.lastDamageTick) eff.lastDamageTick = now
          if (now - eff.lastDamageTick >= eff.params.tickRate) {
            eff.lastDamageTick = now
            const owner = eff.ownerId ? gs.players.get(eff.ownerId) : null
            this._dealDamage(gs, owner, e, eff.params.damagePerTick, eff.params.sourceSkill)
          }
        }
      }

      const before = e.activeEffects.length
      e.activeEffects = e.activeEffects.filter(eff => eff.expiresAt > now)
      if (e.activeEffects.length !== before) {
        // Re-evaluate status effects for enemy
        e.isStunned = e.activeEffects.some(eff => eff.params?.stunned)
        e.isRooted  = e.activeEffects.some(eff => eff.params?.rooted)
        e.isFeared  = e.activeEffects.some(eff => eff.params?.feared)
        e.speedMult = 1
        for (const eff of e.activeEffects) {
          if (eff.params?.speedMultiplier != null) e.speedMult *= eff.params.speedMultiplier
        }

        // Update fear source from active fear effects
        const fearEffect = e.activeEffects.find(eff => eff.params?.feared)
        e.fearSource = fearEffect?.params?.fearSource ?? null

        // Clear pull target if pull effect expired
        if (!e.activeEffects.some(eff => eff.params?.isPull)) {
          e.pullTarget = null
        }
      }
    })
  }

  _tickCasts(gs) {
    const now = Date.now()
    gs.players.forEach(p => {
      if (!p.activeCast) return
      const cast = p.activeCast
      if (cast.config.type === 'CHANNEL') return   // handled by _tickChannels
      const elapsed = now - cast.startedAt

      // BEAM channeling — drain life style (legacy CAST/BEAM path)
      if (cast.beamTargetId != null) {
        const target = this._resolveTarget(gs, cast.beamTargetId)
        // End beam if target dead, gone, or out of range
        if (!target || target.isDead) {
          p.activeCast = null
          return
        }
        const dist = Math.hypot(target.x - p.x, target.y - p.y)
        if (dist > cast.beamRange * 1.3) {   // 30% leeway
          p.activeCast = null
          return
        }

      const tickRate = cast.effectiveTickRate ?? cast.config.tickRate ?? 500
        if (now - cast.lastChannelTick >= tickRate) {
          cast.lastChannelTick = now
          const dmg = cast.config.damagePerTick ?? 0
          const heal = cast.config.healPerTick ?? 0
          if (dmg > 0) this._dealDamage(gs, p, target, dmg, cast.config.name)
          if (heal > 0) {
            p.heal(heal)
            this._trackHeal(gs, p.id, heal)
            if (gs.io) gs.io.emit('effect:damage', { targetId: p.id, amount: heal, type: 'heal', sourceSkill: cast.config.name })
          }
        }
        if (elapsed >= (cast.effectiveCastTime ?? cast.config.castTime)) {
          p.activeCast = null
        }
        return
      }

      if (cast.isChanneled) {
        // Fire payload on each channel tick
        const timeSinceLastTick = now - cast.lastChannelTick
        const tickRate = cast.effectiveTickRate ?? cast.config.payload?.tickRate ?? 500
        if (timeSinceLastTick >= tickRate) {
          cast.lastChannelTick = now
          this._executeCastPayload(gs, p, cast.config.payload, cast.vector)
        }
        // End channeling when castTime expires
        if (elapsed >= (cast.effectiveCastTime ?? cast.config.castTime)) {
          p.activeCast = null
        }
      } else {
        // Non-channeled: fire when castTime expires
        if (elapsed >= (cast.effectiveCastTime ?? cast.config.castTime)) {
          this._executeCastPayload(gs, p, cast.config.payload, cast.vector)
          p.activeCast = null
        }
      }
    })
  }

  _tickChannels(gs) {
    const INTERRUPT_THRESHOLD = 8
    const now = Date.now()
    gs.players.forEach(p => {
      if (!p.activeCast) return
      const cast = p.activeCast
      if (cast.config.type !== 'CHANNEL') return

      const elapsed = now - cast.startedAt

      // Player died — cancel silently
      if (p.isDead) { p.activeCast = null; return }

      // Movement interrupt
      const moved = Math.hypot(p.x - cast.channelStartX, p.y - cast.channelStartY)
      if (moved > INTERRUPT_THRESHOLD) {
        if (gs.cooldowns) {
          const effectiveCooldown = Math.round(cast.config.cooldown / (p.fireRateMult ?? 1))
          gs.cooldowns.start(p.id, cast.skillIndex, effectiveCooldown)
          const expiresAt = now + effectiveCooldown
          if (gs.io) gs.io.emit('skill:cooldown', { playerId: p.id, skillIndex: cast.skillIndex, expiresAt })
        }
        if (gs.io) gs.io.emit('channel:interrupted', { playerId: p.id })
        p.activeCast = null
        return
      }

      // Natural expiry
      if (elapsed >= (cast.effectiveCastTime ?? cast.config.castTime)) {
        p.activeCast = null
        return
      }

      const tickRate = cast.effectiveTickRate ?? cast.config.tickRate ?? 500
      if (now - cast.lastChannelTick < tickRate) return
      cast.lastChannelTick = now

      // BEAM: drain life from target
      if (cast.config.subtype === 'BEAM') {
        const target = this._resolveTarget(gs, cast.beamTargetId)
        if (!target || target.isDead) { p.activeCast = null; return }
        const dist = Math.hypot(target.x - p.x, target.y - p.y)
        if (dist > cast.beamRange * 1.3) { p.activeCast = null; return }
        const dmg = cast.config.damagePerTick ?? 0
        const heal = cast.config.healPerTick ?? 0
        if (dmg > 0) this._dealDamage(gs, p, target, dmg, cast.config.name)
        if (heal > 0) {
          p.heal(heal)
          this._trackHeal(gs, p.id, heal)
          if (gs.io) gs.io.emit('effect:damage', { targetId: p.id, amount: heal, type: 'heal', sourceSkill: cast.config.name })
        }
        return
      }

      // UNTARGETED: fire payload around caster each tick
      if (cast.config.subtype === 'UNTARGETED') {
        this._executeCastPayload(gs, p, cast.config.payload, cast.vector)
      }
    })
  }

  _tickMinions(gs, dt) {
    if (!gs.minions) return
    gs.minions.forEach((m, id) => {
      if (m.isDead) { gs.minions.delete(id); return }
      m.update(dt, gs, this)
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

  /** Find first enemy in the aim direction within range (for BEAM targeting). */
  _findBeamTarget(gs, player, v, range) {
    let best = null
    let bestDist = Infinity

    const checkTarget = (target) => {
      if (target.isDead) return
      const dx = target.x - player.x
      const dy = target.y - player.y
      const dist = Math.hypot(dx, dy)
      if (dist > range || dist < 5) return
      // Check angle — must be within ~45° of aim direction
      const dot = (dx * v.x + dy * v.y) / dist
      if (dot < 0.5) return   // cos(60°) ≈ 0.5
      if (dist < bestDist) { bestDist = dist; best = target }
    }

    gs.enemies.forEach(e => checkTarget(e))
    if (gs.boss && !gs.boss.isDead && !gs.boss.isImmune) checkTarget(gs.boss)

    return best
  }

  /** Find the nearest enemy (or boss) to the player within range, regardless of direction. */
  _findNearestEnemy(gs, player, range) {
    let best = null
    let bestDist = Infinity
    const check = (e) => {
      if (e.isDead) return
      const dist = Math.hypot(e.x - player.x, e.y - player.y)
      if (dist > range) return
      if (dist < bestDist) { bestDist = dist; best = e }
    }
    gs.enemies.forEach(e => check(e))
    if (gs.boss && !gs.boss.isDead && !gs.boss.isImmune) check(gs.boss)
    return best
  }

  /** Find closest alive ally within radius of (pivotX, pivotY), excluding healedIds. */
  _findChainTarget(gs, pivotX, pivotY, radius, healedIds) {
    let best     = null
    let bestDist = Infinity
    gs.players.forEach(p => {
      if (p.isDead || p.isHost || healedIds.has(p.id)) return
      const dist = Math.hypot(p.x - pivotX, p.y - pivotY)
      if (dist > radius) return
      if (dist < bestDist) { bestDist = dist; best = p }
    })
    gs.npcs?.forEach(npc => {
      if (npc.isDead || !npc.isHealable || healedIds.has(npc.id)) return
      const dist = Math.hypot(npc.x - pivotX, npc.y - pivotY)
      if (dist > radius) return
      if (dist < bestDist) { bestDist = dist; best = npc }
    })
    return best
  }

  /** Find closest ally in the aim direction within range (for BUFF/TARGETED ally-targeting). */
  _findAllyForBuff(gs, player, v, range = 400) {
    let best = null, bestDist = Infinity
    gs.players.forEach(p => {
      if (p.isDead || p.isHost || p.id === player.id) return
      const dx = p.x - player.x, dy = p.y - player.y
      const dist = Math.hypot(dx, dy)
      if (dist > range || dist < 5) return
      if ((dx * v.x + dy * v.y) / dist < 0.5) return
      if (dist < bestDist) { bestDist = dist; best = p }
    })
    return best
  }

  /** Find first ally in the aim direction within range (for TARGETED/HEAL_ALLY). */
  _findRayAlly(gs, player, v, range) {
    let best = null
    let bestDist = Infinity

    gs.players.forEach(p => {
      if (p.isDead || p.isHost || p.id === player.id) return
      const dx = p.x - player.x
      const dy = p.y - player.y
      const dist = Math.hypot(dx, dy)
      if (dist > range || dist < 5) return
      const dot = (dx * v.x + dy * v.y) / dist
      if (dot < 0.5) return
      if (dist < bestDist) { bestDist = dist; best = p }
    })

    gs.npcs?.forEach(npc => {
      if (npc.isDead || !npc.isHealable) return
      const dx = npc.x - player.x
      const dy = npc.y - player.y
      const dist = Math.hypot(dx, dy)
      if (dist > range || dist < 5) return
      const dot = (dx * v.x + dy * v.y) / dist
      if (dot < 0.5) return
      if (dist < bestDist) { bestDist = dist; best = npc }
    })

    return best
  }

  /** Resolve a target by id from enemies or boss. */
  _resolveTarget(gs, targetId) {
    if (targetId === 'boss') return gs.boss
    for (const e of gs.enemies.values()) {
      if (e.id === targetId) return e
    }
    return null
  }

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
      onImpact:    overrides.onImpact    ?? null,
      dot:         config.dot            ?? null,
      chainLeft:   config.chain          ?? 0,
      chainRange:  config.chainRange     ?? 200,
      onHitEffect: config.onHitEffect    ?? null,
      canHitAllies: config.canHitAllies  ?? false,
      selfCast:    overrides.selfCast   ?? false,
    })
  }
}
