/**
 * server/systems/IllidanEncounter.js
 * Illidan Stormrage encounter — phase transitions, abilities, and per-tick effects.
 *
 * Owns all Illidan-specific state (eye beams, fireballs, phase flags) so that
 * GameServer is not polluted with encounter-specific code.
 *
 * Usage:
 *   const enc = new IllidanEncounter({ boss, io, players, enemies, skillSystem,
 *                                       stats, enemyIdSeq, arenaWidth, arenaHeight, difficulty })
 *   enc.update(dt, now)               — call each tick
 *   enc.onEnemyDied(id)               — call when any enemy dies
 *   enc.getEyeBeamsDTO()              — for state serialization
 *   enc.getFireballsDTO()             — for state serialization
 */

import { EVENTS }                         from '../../shared/protocol.js'
import { GAME_CONFIG }                    from '../../shared/GameConfig.js'
import { ILLIDAN_CONFIG, ILLIDAN_PHASE }  from '../../shared/IllidanConfig.js'
import { ENEMY_TYPES }                    from '../../shared/EnemyTypeConfig.js'
import ServerEnemy                        from '../entities/ServerEnemy.js'

function playerHitsCircle(px, py, cx, cy, otherRadius) {
  const dx = px - cx
  const dy = py - cy
  const rx = GAME_CONFIG.PLAYER_RADIUS_X + otherRadius
  const ry = GAME_CONFIG.PLAYER_RADIUS_Y + otherRadius
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
}

export default class IllidanEncounter {
  constructor({ boss, io, players, enemies, skillSystem, stats, enemyIdSeq, arenaWidth, arenaHeight, difficulty }) {
    this.boss        = boss
    this.io          = io
    this.players     = players
    this.enemies     = enemies
    this.skillSystem = skillSystem
    this.stats       = stats
    this._enemyIdSeq = enemyIdSeq
    this.arenaWidth  = arenaWidth
    this.arenaHeight = arenaHeight
    this._difficulty = difficulty ?? {}

    this._state = {
      phase2AddsSpawned:    false,
      flameOfAzzinothIds:   new Set(),
      phase3Entered:        false,
      phase4Entered:        false,
      auraDreadLastTick:    0,
      phase2TransitionDone: false,
    }

    this._activeEyeBeams      = []
    this._eyeBeamSeq          = 0
    this._illidanFireballs    = []
    this._illidanFireballSeq  = 0

    // Wire phase-change callback on the boss entity
    this.boss.onPhaseChange = (phase) => {
      this.io.emit(EVENTS.ILLIDAN_PHASE_TRANSITION, { phase })
      if (phase === ILLIDAN_PHASE.AZZINOTH) this._onPhase2()
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /** Call when any enemy dies. Returns true if the death was encounter-relevant. */
  onEnemyDied(id) {
    if (!this._state.flameOfAzzinothIds.has(id)) return false
    this._state.flameOfAzzinothIds.delete(id)
    if (this._state.flameOfAzzinothIds.size === 0) {
      this._onPhase3()
    }
    return true
  }

  /** Main encounter tick — call every server tick. */
  update(dt, now) {
    if (!this.boss) return

    // Phase 2: boss is outside the map — skip movement/contact but fire abilities
    if (this._state.phase2AddsSpawned && !this._state.phase3Entered) {
      const attacks = this.boss.updateAbilities(dt, this.players, now)
      for (const attack of attacks) this._handleAbility(attack, now)
      this._tickEyeBeams(now)
      this._tickEffects(now)
      if (this._illidanFireballs.length) this._tickFireballs(dt)
      return
    }

    // Tick eye beams and player debuffs regardless of immunity
    this._tickEyeBeams(now)
    this._tickEffects(now)
    if (this._illidanFireballs.length) this._tickFireballs(dt)

    // Always tick any in-progress cast
    const completedCast = this.boss.tickCast(now)
    if (completedCast) this._handleAbility(completedCast, now)

    if (this.boss.isImmune) return

    this.boss.update(dt, this.players)

    const attacks = this.boss.updateAbilities(dt, this.players, now)
    for (const attack of attacks) this._handleAbility(attack, now)

    // Melee contact damage
    const meleeRange    = ILLIDAN_CONFIG.attackRange    ?? 80
    const meleeCooldown = ILLIDAN_CONFIG.attackCooldown ?? 1500
    this.players.forEach(p => {
      if (p.isHost || p.isDead) return
      if (playerHitsCircle(p.x, p.y, this.boss.x, this.boss.y, meleeRange)) {
        if (p.isShieldBlocking(this.boss.x, this.boss.y)) return
        if (!p._lastBossContact) p._lastBossContact = 0
        if (now - p._lastBossContact > meleeCooldown) {
          p._lastBossContact = now
          const dmg = Math.round(ILLIDAN_CONFIG.meleeDamage * this.boss._damageMult)
          p.takeDamage(dmg)
          this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: dmg, type: 'damage', sourceSkill: 'Melee' })
          if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
        }
      }
    })

    // Phase 3 (hunt_2) → Phase 4 (demon_form) at 30% HP
    if (this.boss.phase === ILLIDAN_PHASE.HUNT_2 && !this._state.phase4Entered) {
      if (this.boss.hp / this.boss.maxHp <= 0.30) {
        this._onPhase4()
      }
    }

    // Aura of Dread — Phase 4 (demon_form) passive
    if (this.boss.phase === ILLIDAN_PHASE.DEMON_FORM) {
      const aura = ILLIDAN_CONFIG.phase3Aura
      if (now - this._state.auraDreadLastTick >= aura.tickRate) {
        this._state.auraDreadLastTick = now
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          if (playerHitsCircle(p.x, p.y, this.boss.x, this.boss.y, aura.radius)) {
            p.takeDamage(aura.damage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: aura.damage, type: 'damage', sourceSkill: 'Aura of Dread' })
            if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
        })
      }
    }

    // Despawn shadowfiends whose source player is dead or disconnected
    this.enemies.forEach((enemy, id) => {
      if (enemy.type !== 'shadowfiend' || !enemy.sourcePlayerId) return
      const src = this.players.get(enemy.sourcePlayerId)
      if (!src || src.isDead) {
        enemy.isDead = true
      }
    })
  }

  getEyeBeamsDTO() {
    if (!this._activeEyeBeams.length) return null
    const now = Date.now()
    return this._activeEyeBeams.map(b => ({
      id:       b.id,
      x1: b.x1, y1: b.y1,
      x2: b.x2, y2: b.y2,
      progress: Math.min(1, (now - b.startedAt) / b.drawDuration),
    }))
  }

  getFireballsDTO() {
    return this._illidanFireballs.map(fb => ({
      id:     fb.id,
      x:      Math.round(fb.x),
      y:      Math.round(fb.y),
      radius: 12,
      color:  '#ff6600',
    }))
  }

  // ── Phase transitions ────────────────────────────────────────────────────────

  _onPhase2() {
    if (this._state.phase2AddsSpawned) return
    this._state.phase2AddsSpawned = true

    console.log('[Illidan] Phase 2 — flying outside map')

    this.boss.isImmune = true
    this.boss.x = ILLIDAN_CONFIG.phase2Position.x
    this.boss.y = ILLIDAN_CONFIG.phase2Position.y

    let playerCount = 0
    this.players.forEach(p => { if (!p.isHost) playerCount++ })
    const hpMult = (this._difficulty.hpMult?.base ?? 1) + (this._difficulty.hpMult?.perPlayer ?? 0) * (playerCount - 1)

    for (const addCfg of ILLIDAN_CONFIG.phase2Adds) {
      const base = ENEMY_TYPES[addCfg.type]
      if (!base) continue
      const id = ++this._enemyIdSeq.value
      const add = new ServerEnemy({
        id,
        x: addCfg.x, y: addCfg.y,
        type: addCfg.type,
        hp: Math.round(base.hp * hpMult), maxHp: Math.round(base.hp * hpMult),
        speed: base.speed,
        radius: base.radius,
        meleeDamage: 0,
      })
      add.setArenaSize(this.arenaWidth, this.arenaHeight)
      this.enemies.set(id, add)
      this._state.flameOfAzzinothIds.add(id)
    }
  }

  _onPhase3() {
    if (this._state.phase3Entered) return
    this._state.phase3Entered = true

    console.log('[Illidan] Phase 3 — hunt_2 (sword form resumes)')

    this.boss._phases              = []   // prevent _updatePhase() from interfering
    this.boss.phase                = ILLIDAN_PHASE.HUNT_2
    this.boss.isImmune             = false
    this.boss.speed                = ILLIDAN_CONFIG.phases[0].speed
    this.boss._abilityCooldowns    = {}   // reset all cooldowns for the second sword phase
    this.boss.x                    = this.arenaWidth  / 2
    this.boss.y                    = this.arenaHeight / 2

    this.io.emit(EVENTS.ILLIDAN_PHASE_TRANSITION, { phase: ILLIDAN_PHASE.HUNT_2, freeze: true, freezeDuration: 2500 })
  }

  _onPhase4() {
    if (this._state.phase4Entered) return
    this._state.phase4Entered = true

    console.log('[Illidan] Phase 4 — demon_form')

    this.boss._phases  = []
    this.boss.phase    = ILLIDAN_PHASE.DEMON_FORM
    this.boss.isImmune = false
    this.boss.speed    = 0

    this.io.emit(EVENTS.ILLIDAN_PHASE_TRANSITION, { phase: ILLIDAN_PHASE.DEMON_FORM, freeze: true, freezeDuration: 3500 })
  }

  // ── Ability handler ──────────────────────────────────────────────────────────

  _handleAbility(attack, now) {
    if (!attack || !this.boss) return

    const applyDeath = (p) => {
      if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
    }

    switch (attack.type) {

      case 'flameCrash': {
        const crashX = attack.castTargetX ?? ((attack.target && !attack.target.isDead) ? attack.target.x : attack.bossX)
        const crashY = attack.castTargetY ?? ((attack.target && !attack.target.isDead) ? attack.target.y : attack.bossY)
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          if (playerHitsCircle(p.x, p.y, crashX, crashY, attack.radius)) {
            if (p.isShieldBlocking(crashX, crashY)) return
            p.takeDamage(attack.damage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: attack.damage, type: 'damage', sourceSkill: 'Flame Crash' })
            applyDeath(p)
          }
        })
        const gf = attack.groundFire
        this.skillSystem.addZone('boss', {
          radius: gf.radius, duration: gf.duration,
          damage: gf.tickDamage, tickRate: gf.tickRate,
          effectType: 'PLAYER_DAMAGE',
        }, crashX, crashY, '#ff4400')
        break
      }

      case 'drawSoul': {
        const coneHalfRad = (attack.coneAngle / 2) * (Math.PI / 180)
        const facing = this.boss.angle
        let hits = 0
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          const dx = p.x - attack.bossX
          const dy = p.y - attack.bossY
          const dist = Math.hypot(dx, dy)
          if (dist > attack.coneRange + GAME_CONFIG.PLAYER_RADIUS_X) return
          const angle = Math.atan2(dy, dx)
          let diff = Math.abs(angle - facing)
          if (diff > Math.PI) diff = 2 * Math.PI - diff
          if (diff <= coneHalfRad) {
            if (p.isShieldBlocking(attack.bossX, attack.bossY)) return
            p.takeDamage(attack.damage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: attack.damage, type: 'damage', sourceSkill: 'Draw Soul' })
            this.io.emit(EVENTS.TARGETED_HIT, {
              casterX: p.x, casterY: p.y,
              targetX: attack.bossX, targetY: attack.bossY,
              effectType: 'damage', color: '#9900ff',
            })
            applyDeath(p)
            hits++
          }
        })
        if (hits > 0 && !this.boss.isDead) {
          const healAmt = attack.healPerTarget * hits
          this.boss.hp = Math.min(this.boss.maxHp, this.boss.hp + healAmt)
          this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: 'boss', amount: healAmt, type: 'heal', sourceSkill: 'Draw Soul' })
        }
        break
      }

      case 'shear': {
        let nearest = null, bestDist = Infinity
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          const d = Math.hypot(p.x - attack.bossX, p.y - attack.bossY)
          if (d < bestDist) { bestDist = d; nearest = p }
        })
        if (!nearest) break
        nearest.activeEffects = nearest.activeEffects ?? []
        nearest.activeEffects = nearest.activeEffects.filter(e => e.source !== 'illidan:shear')
        nearest.activeEffects.push({
          source:    'illidan:shear',
          params:    { maxHpReduction: attack.maxHpReduction, shear: true },
          expiresAt: now + attack.duration,
        })
        nearest.rebuildStats()
        this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: nearest.id, amount: 0, type: 'damage', sourceSkill: 'Shear' })
        break
      }

      case 'parasiticShadowfiend': {
        const living = []
        this.players.forEach(p => { if (!p.isHost && !p.isDead) living.push(p) })
        if (!living.length) break
        const target = living[Math.floor(Math.random() * living.length)]
        target.activeEffects = target.activeEffects ?? []
        target.activeEffects = target.activeEffects.filter(e => e.source !== 'illidan:parasiticShadowfiend')
        target.activeEffects.push({
          source:   'illidan:parasiticShadowfiend',
          params:   { dotDamage: attack.dotDamage, spawnCount: attack.spawnCount, shadowfiendHp: attack.shadowfiendHp, targetId: target.id, parasitic: true },
          expiresAt: now + attack.dotDuration,
          lastTick:  now,
          tickRate:  attack.dotInterval,
        })
        this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: target.id, amount: 0, type: 'damage', sourceSkill: 'Parasitic Shadowfiend' })
        break
      }

      case 'fireball': {
        const living = []
        this.players.forEach(p => { if (!p.isHost && !p.isDead) living.push(p) })
        if (!living.length) break
        const target = living[Math.floor(Math.random() * living.length)]
        this._illidanFireballs.push({
          id:           ++this._illidanFireballSeq,
          x:            attack.bossX,
          y:            attack.bossY,
          targetId:     target.id,
          speed:        280,
          damage:       attack.damage,
          splashRadius: attack.splashRadius,
        })
        break
      }

      case 'darkBarrage': {
        const living = []
        this.players.forEach(p => { if (!p.isHost && !p.isDead) living.push(p) })
        if (!living.length) break
        const target = living[Math.floor(Math.random() * living.length)]
        target.activeEffects = target.activeEffects ?? []
        target.activeEffects = target.activeEffects.filter(e => e.source !== 'illidan:darkBarrage')
        target.activeEffects.push({
          source:    'illidan:darkBarrage',
          params:    { dotDamage: attack.dotDamage, darkBarrage: true },
          expiresAt: now + attack.dotDuration,
          lastTick:  now,
          tickRate:  attack.dotInterval,
        })
        this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: target.id, amount: 0, type: 'damage', sourceSkill: 'Dark Barrage' })
        break
      }

      case 'eyeBeams': {
        const living = []
        this.players.forEach(p => { if (!p.isHost && !p.isDead) living.push(p) })
        if (!living.length) break
        for (let i = 0; i < 2; i++) {
          const anchor = living[Math.floor(Math.random() * living.length)]
          const x1    = anchor.x
          const y1    = anchor.y
          const angle = Math.random() * Math.PI * 2
          const x2    = x1 + Math.cos(angle) * attack.lineLength
          const y2    = y1 + Math.sin(angle) * attack.lineLength
          this._activeEyeBeams.push({
            id:              ++this._eyeBeamSeq,
            x1, y1, x2, y2,
            startedAt:       now,
            drawDuration:    attack.drawDuration,
            groundFire:      attack.groundFire,
            damage:          attack.damage,
            lastDamageTick:  now,
            lastFireZonePct: 0,
          })
        }
        break
      }

      case 'agonizingFlames': {
        const living = []
        this.players.forEach(p => { if (!p.isHost && !p.isDead) living.push(p) })
        if (!living.length) break
        const primary = living[Math.floor(Math.random() * living.length)]
        this.io.emit(EVENTS.TARGETED_HIT, {
          casterX: attack.bossX, casterY: attack.bossY,
          targetX: primary.x, targetY: primary.y,
          effectType: 'damage', color: '#ff8800',
        })
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          if (playerHitsCircle(p.x, p.y, primary.x, primary.y, attack.splashRadius)) {
            if (p.isShieldBlocking(attack.bossX, attack.bossY)) return
            p.takeDamage(attack.damage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: attack.damage, type: 'damage', sourceSkill: 'Agonizing Flames' })
            applyDeath(p)
          }
        })
        primary.activeEffects = primary.activeEffects ?? []
        primary.activeEffects = primary.activeEffects.filter(e => e.source !== 'illidan:agonizingFlames')
        primary.activeEffects.push({
          source:    'illidan:agonizingFlames',
          params:    { dotDamage: attack.dotDamage, dotRadius: attack.dotRadius, targetId: primary.id, agonizingFlames: true },
          expiresAt: now + attack.dotDuration,
          lastTick:  now,
          tickRate:  attack.dotInterval,
        })
        this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: primary.id, amount: 0, type: 'damage', sourceSkill: 'Agonizing Flames' })
        break
      }

      case 'shadowBlast': {
        const living = []
        this.players.forEach(p => { if (!p.isHost && !p.isDead) living.push(p) })
        if (!living.length) break
        const target = living[Math.floor(Math.random() * living.length)]
        this.io.emit(EVENTS.TARGETED_HIT, {
          casterX: attack.bossX, casterY: attack.bossY,
          targetX: target.x, targetY: target.y,
          effectType: 'damage', color: '#6600cc',
        })
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          if (playerHitsCircle(p.x, p.y, target.x, target.y, attack.splashRadius)) {
            if (p.isShieldBlocking(attack.bossX, attack.bossY)) return
            p.takeDamage(attack.damage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: attack.damage, type: 'damage', sourceSkill: 'Shadow Blast' })
            applyDeath(p)
          }
        })
        break
      }

      case 'summonShadowDemons': {
        const spread = 40
        for (let i = 0; i < attack.count; i++) {
          const angle  = (i / attack.count) * Math.PI * 2
          const sx     = attack.bossX + Math.cos(angle) * spread
          const sy     = attack.bossY + Math.sin(angle) * spread
          const base   = ENEMY_TYPES.shadowDemon
          const id     = ++this._enemyIdSeq.value
          const demon  = new ServerEnemy({
            id,
            x: sx, y: sy,
            type: 'shadowDemon',
            hp: attack.hp ?? base.hp, maxHp: attack.hp ?? base.hp,
            speed: attack.speed ?? base.speed,
            radius: base.radius,
            meleeDamage: 0,
          })
          demon.setArenaSize(this.arenaWidth, this.arenaHeight)
          const living = []
          this.players.forEach(p => { if (!p.isHost && !p.isDead) living.push(p) })
          if (living.length) {
            demon.targetPlayerId = living[Math.floor(Math.random() * living.length)].id
          }
          this.enemies.set(id, demon)
        }
        break
      }
    }
  }

  // ── Per-tick subsystems ──────────────────────────────────────────────────────

  _tickEyeBeams(now) {
    for (let i = this._activeEyeBeams.length - 1; i >= 0; i--) {
      const beam = this._activeEyeBeams[i]
      const progress = Math.min(1, (now - beam.startedAt) / beam.drawDuration)

      const tipX = beam.x1 + (beam.x2 - beam.x1) * progress
      const tipY = beam.y1 + (beam.y2 - beam.y1) * progress

      if (progress < 1 && now - beam.lastDamageTick >= 500) {
        beam.lastDamageTick = now
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          if (playerHitsCircle(p.x, p.y, tipX, tipY, 35)) {
            p.takeDamage(beam.damage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: beam.damage, type: 'damage', sourceSkill: 'Eye Beams' })
            if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
        })
      }

      const pctSinceLastZone = progress - (beam.lastFireZonePct ?? 0)
      if (pctSinceLastZone >= 0.1) {
        beam.lastFireZonePct = progress
        const gf = beam.groundFire
        this.skillSystem.addZone('boss', {
          radius: gf.radius, duration: gf.duration,
          damage: gf.tickDamage, tickRate: gf.tickRate,
          effectType: 'PLAYER_DAMAGE',
        }, tipX, tipY, '#6600cc')
      }

      if (progress >= 1) this._activeEyeBeams.splice(i, 1)
    }
  }

  _tickEffects(now) {
    this.players.forEach(p => {
      // For dead players: expire the parasitic shadowfiend effect immediately so fiends don't spawn
      if (p.isDead) {
        if (p.activeEffects?.some(e => e.source === 'illidan:parasiticShadowfiend')) {
          p.activeEffects = p.activeEffects.filter(e => e.source !== 'illidan:parasiticShadowfiend')
        }
        return
      }
      if (!p.activeEffects?.length) return

      const toSpawn = []

      for (const eff of p.activeEffects) {
        if (eff.source === 'illidan:parasiticShadowfiend') {
          if (!eff.lastTick) eff.lastTick = now
          if (now - eff.lastTick >= eff.tickRate) {
            eff.lastTick = now
            p.takeDamage(eff.params.dotDamage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: eff.params.dotDamage, type: 'damage', sourceSkill: 'Parasitic Shadowfiend' })
            if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
          if (now >= eff.expiresAt && !eff._spawnQueued) {
            eff._spawnQueued = true
            toSpawn.push({ type: 'shadowfiend', count: eff.params.spawnCount, hp: eff.params.shadowfiendHp, x: p.x, y: p.y, sourcePlayerId: p.id })
          }
        }

        if (eff.source === 'illidan:darkBarrage') {
          if (!eff.lastTick) eff.lastTick = now
          if (now - eff.lastTick >= eff.tickRate) {
            eff.lastTick = now
            p.takeDamage(eff.params.dotDamage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: eff.params.dotDamage, type: 'damage', sourceSkill: 'Dark Barrage' })
            if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
        }

        if (eff.source === 'illidan:agonizingFlames') {
          if (!eff.lastTick) eff.lastTick = now
          if (now - eff.lastTick >= eff.tickRate) {
            eff.lastTick = now
            p.takeDamage(eff.params.dotDamage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: eff.params.dotDamage, type: 'damage', sourceSkill: 'Agonizing Flames' })
            if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
            this.players.forEach(other => {
              if (other.id === p.id || other.isHost || other.isDead) return
              if (playerHitsCircle(other.x, other.y, p.x, p.y, eff.params.dotRadius)) {
                other.takeDamage(eff.params.dotDamage)
                this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: other.id, amount: eff.params.dotDamage, type: 'damage', sourceSkill: 'Agonizing Flames' })
                if (other.isDead) this.stats.deaths[other.id] = (this.stats.deaths[other.id] ?? 0) + 1
              }
            })
          }
        }
      }

      for (const spawn of toSpawn) {
        const base = ENEMY_TYPES[spawn.type]
        if (!base) continue
        for (let i = 0; i < spawn.count; i++) {
          const angle = (i / spawn.count) * Math.PI * 2
          const sx = spawn.x + Math.cos(angle) * 30
          const sy = spawn.y + Math.sin(angle) * 30
          const id = ++this._enemyIdSeq.value
          const hp = spawn.hp ?? base.hp
          const fiend = new ServerEnemy({
            id,
            x: sx, y: sy,
            type: spawn.type,
            hp, maxHp: hp,
            speed: base.speed,
            radius: base.radius,
            meleeDamage: 0,
          })
          fiend.setArenaSize(this.arenaWidth, this.arenaHeight)
          fiend.sourcePlayerId = spawn.sourcePlayerId
          this.enemies.set(id, fiend)
        }
      }

      p.activeEffects = p.activeEffects.filter(e =>
        !e.source?.startsWith('illidan:') || now < e.expiresAt
      )
    })
  }

  _tickFireballs(dt) {
    const HIT_DIST = 20
    for (let i = this._illidanFireballs.length - 1; i >= 0; i--) {
      const fb     = this._illidanFireballs[i]
      const target = this.players.get(fb.targetId)

      if (!target || target.isDead) {
        this._illidanFireballs.splice(i, 1)
        continue
      }

      const dx   = target.x - fb.x
      const dy   = target.y - fb.y
      const dist = Math.hypot(dx, dy)

      if (dist <= HIT_DIST + fb.splashRadius) {
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          if (playerHitsCircle(p.x, p.y, fb.x, fb.y, fb.splashRadius)) {
            if (p.isShieldBlocking(fb.x, fb.y)) return
            p.takeDamage(fb.damage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: fb.damage, type: 'damage', sourceSkill: 'Fireball' })
            if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
        })
        this._illidanFireballs.splice(i, 1)
        continue
      }

      fb.x += (dx / dist) * fb.speed * dt
      fb.y += (dy / dist) * fb.speed * dt
    }
  }
}
