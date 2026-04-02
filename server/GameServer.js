import { EVENTS }        from '../shared/protocol.js'
import { GAME_CONFIG }   from '../shared/GameConfig.js'
import { CAMPAIGN }      from '../shared/LevelConfig.js'
import { BOSS_CONFIG }   from '../shared/BossConfig.js'
import { CLASSES, resolveClassName } from '../shared/ClassConfig.js'
import ServerPlayer      from './entities/ServerPlayer.js'
import ServerEnemy       from './entities/ServerEnemy.js'
import ServerBoss        from './entities/ServerBoss.js'
import TrainingDummy, { RangedDummy, MeleeDummy, MovingDummy } from './entities/TrainingDummy.js'
import CooldownSystem    from './systems/CooldownSystem.js'
import SkillSystem       from './systems/SkillSystem.js'
import SpawnSystem       from './systems/SpawnSystem.js'

/**
 * GameServer — authoritative game simulation.
 *
 * Runs a fixed-rate tick loop (TICK_RATE Hz).
 * All game state lives here; clients are pure renderers / input sources.
 *
 * Scene flow:  lobby → battle (level 1) → levelComplete → battle (level 2) → … → result
 *                   ↑______________________________________________________________|  (restart)
 */
export default class GameServer {
  constructor(io) {
    this.io        = io
    this.players   = new Map()      // socketId → ServerPlayer
    this.scene     = 'lobby'

    // Per-player input queue: filled by socket handlers, drained each tick
    this.inputQueues = new Map()    // socketId → Array<InputEvent>

    this.cooldowns   = new CooldownSystem()
    this.skillSystem = new SkillSystem()

    // Game entities
    this.projectiles   = new Map()  // id → projectile plain object
    this.enemies       = new Map()  // id → ServerEnemy
    this.boss          = null

    this._enemyIdSeq  = { value: 0 }
    this._minionIdSeq = 0
    this._lastSpawn   = 0
    this.killCount    = 0

    // Per-type kill tracking for objective evaluation
    this._killsByType = {}

    // Spawned minions (totems, traps, pets)
    this.minions = new Map()

    // Stats tracking
    this.stats = { damage: {}, deaths: {}, kills: 0, startTime: 0 }

    // Revive tracking: deadPlayerId → { reviverId, startedAt }
    this.reviveTimers = new Map()

    // ── Level system ──────────────────────────────────────────────────────
    this.currentLevelIndex = -1
    this.currentLevel      = null
    this.spawnSystem       = null
    this._levelStartTime   = 0
    this.arenaWidth        = GAME_CONFIG.CANVAS_WIDTH
    this.arenaHeight       = GAME_CONFIG.CANVAS_HEIGHT

    // Objective progress — synced to clients via OBJECTIVE_UPDATE
    this.objectiveProgress = []

    this.tick      = 0
    this.lastTick  = Date.now()

    // Start authoritative game loop
    this._loopInterval = setInterval(
      () => this._gameTick(),
      1000 / GAME_CONFIG.TICK_RATE
    )

    this._spawnTrainingDummy()
  }

  // ── Connection handling ────────────────────────────────────────────────────

  handleConnection(socket) {
    console.log(`[+] connected   ${socket.id}`)

    socket.on(EVENTS.JOIN,          data => this._onJoin(socket, data))
    socket.on(EVENTS.INPUT_MOVE,    data => this._onInputMove(socket, data))
    socket.on(EVENTS.INPUT_SKILL,   data => this._onInputSkill(socket, data))
    socket.on(EVENTS.INPUT_AIM,     ({ vector }) => {
      const player = this.players.get(socket.id)
      if (player && vector) {
        player.aimAngle    = Math.atan2(vector.y, vector.x)
        player.angle       = player.aimAngle
        player.isAiming    = true
        player.lastAimTime = Date.now()
        if (player.shieldActive) {
          player.shieldAngle = player.aimAngle
        }
      }
    })
    socket.on(EVENTS.START_GAME,    ()   => this._onStartGame(socket))
    socket.on(EVENTS.RESTART_GAME,  ()   => this._onRestartGame(socket))
    socket.on(EVENTS.HOST_ADVANCE,  ()   => this._onHostAdvance(socket))
    socket.on('disconnect',         ()   => this._onDisconnect(socket))
  }

  // ── Socket event handlers ──────────────────────────────────────────────────

  _onJoin(socket, data) {
    const { name, className, isHost } = data ?? {}

    const resolvedClass = resolveClassName(className) ?? 'Warrior'
    const { x, y } = this._randomPointNearCenter(300, 200)

    const player = new ServerPlayer({
      id:        socket.id,
      name:      (name || 'Player').slice(0, 20),
      className: resolvedClass,
      isHost:    !!isHost,
      arenaWidth: this.arenaWidth,
      arenaHeight: this.arenaHeight,
      x,
      y,
    })

    this.players.set(socket.id, player)
    this.inputQueues.set(socket.id, [])

    console.log(`[>] joined  ${player.name.padEnd(16)} class=${resolvedClass}${isHost ? ' (HOST)' : ''}`)

    // Full snapshot for the new arrival
    socket.emit(EVENTS.INIT, this._fullState())

    // Tell everyone else
    this.io.emit(EVENTS.PLAYER_JOINED, player.toDTO())
  }

  _onInputMove(socket, data) {
    const queue = this.inputQueues.get(socket.id)
    if (!queue) return
    queue.push({ type: 'move', x: Number(data?.x) || 0, y: Number(data?.y) || 0 })
  }

  _onInputSkill(socket, data) {
    const queue = this.inputQueues.get(socket.id)
    if (!queue) return
    queue.push({
      type:   'skill',
      index:  Number(data?.index) || 0,
      vector: data?.vector ?? { x: 1, y: 0 },
      action: data?.action ?? undefined,
    })
  }

  // ── Campaign flow ──────────────────────────────────────────────────────────

  _onStartGame(socket) {
    if (!this.players.get(socket.id)?.isHost) return
    this._startCampaign()
  }

  _onRestartGame(socket) {
    if (!this.players.get(socket.id)?.isHost) return

    this._setArenaSize(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)

    // Reset all players to full HP / alive
    this.players.forEach(p => {
      if (!p.isHost) {
        p.hp          = p.maxHp
        p.isDead      = false
        p.activeCast  = null
        p.shieldActive = false
        p.activeEffects = []
        p.rebuildStats()
        p.setArenaSize(this.arenaWidth, this.arenaHeight)
        const { x, y } = this._randomPointNearCenter(300, 200)
        p.x = x
        p.y = y
        this.cooldowns.clearPlayer(p.id)
      }
    })

    this._clearCombatState()
    this._changeScene('lobby')
  }

  _onHostAdvance(socket) {
    if (!this.players.get(socket.id)?.isHost) return
    if (this.scene !== 'levelComplete') return

    const nextIndex = this.currentLevelIndex + 1
    if (nextIndex >= CAMPAIGN.length) {
      // Campaign complete — final victory!
      this._changeScene('result')
    } else {
      this._startLevel(nextIndex)
    }
  }

  _startCampaign() {
    this.stats = { damage: {}, deaths: {}, kills: 0, startTime: Date.now() }
    this._clearCombatState()
    this._startLevel(0)
  }

  _startLevel(index) {
    const level = CAMPAIGN[index]
    if (!level) return

    this.currentLevelIndex = index
    this.currentLevel      = level
    this._setArenaSize(level.arena?.width ?? GAME_CONFIG.CANVAS_WIDTH, level.arena?.height ?? GAME_CONFIG.CANVAS_HEIGHT)

    // Reset combat state between levels
    this._clearCombatState()

    // Reset all non-host players to full HP and scatter them
    this.players.forEach(p => {
      if (p.isHost) return
      p.hp           = p.maxHp
      p.isDead       = false
      p.activeCast   = null
      p.shieldActive = false
      p.activeEffects = []
      p.rebuildStats()
      p.setArenaSize(this.arenaWidth, this.arenaHeight)
      const { x, y } = this._randomPointNearCenter(400, 250)
      p.x = x
      p.y = y
    })

    // Compute player count for difficulty scaling
    let playerCount = 0
    this.players.forEach(p => { if (!p.isHost) playerCount++ })

    // Set up spawn system if level has spawning
    if (level.spawning) {
      this.spawnSystem = new SpawnSystem(level, playerCount)
    }

    // Set up boss if level has one
    if (level.boss) {
      const diff = level.difficulty ?? {}
      const hpMult     = (diff.hpMult?.base ?? 1)     + (diff.hpMult?.perPlayer ?? 0)     * (playerCount - 1)
      const damageMult = (diff.damageMult?.base ?? 1) + (diff.damageMult?.perPlayer ?? 0) * (playerCount - 1)
      this.boss = new ServerBoss(level.boss, { hpMult, damageMult, arenaWidth: this.arenaWidth, arenaHeight: this.arenaHeight })
    }

    // Init objective progress
    this._levelStartTime = Date.now()
    this._initObjectiveProgress()

    console.log(`[~] Level ${index + 1}/${CAMPAIGN.length}: ${level.name}`)

    // Determine scene type for the renderer
    const scene = level.boss ? 'bossFight' : 'battle'
    this._changeScene(scene, {
      levelIndex:  index,
      totalLevels: CAMPAIGN.length,
      levelName:   level.name,
      arenaWidth:  this.arenaWidth,
      arenaHeight: this.arenaHeight,
      objectives:  this.objectiveProgress,
    })
  }

  _initObjectiveProgress() {
    this.objectiveProgress = (this.currentLevel?.objectives ?? []).map(obj => {
      switch (obj.type) {
        case 'killCount':
          return { ...obj, current: 0 }
        case 'survive':
          return { ...obj, current: 0 }
        case 'killBoss':
          return { ...obj, current: 0, target: 1 }
        default:
          return { ...obj, current: 0 }
      }
    })
  }

  _clearCombatState() {
    this.projectiles.clear()
    this.enemies.clear()
    this.boss          = null
    this.killCount     = 0
    this._killsByType  = {}
    this.reviveTimers.clear()
    this.minions.clear()
    this._lastSpawn    = 0
    this.spawnSystem   = null
    this.skillSystem.activeZones    = []
    this.skillSystem._pendingBursts = []
  }

  _onDisconnect(socket) {
    const player = this.players.get(socket.id)
    console.log(`[-] disconnect  ${player?.name ?? socket.id}`)

    this.players.delete(socket.id)
    this.inputQueues.delete(socket.id)
    this.cooldowns.clearPlayer(socket.id)
    this.minions.forEach((m, id) => { if (m.ownerId === socket.id) this.minions.delete(id) })

    this.io.emit(EVENTS.PLAYER_LEFT, socket.id)
  }

  // ── Scene management ───────────────────────────────────────────────────────

  _changeScene(name, extra = {}) {
    if (name === 'lobby') {
      this._setArenaSize(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)
    }

    this.scene = name
    console.log(`[~] scene → ${name}`)
    this.io.emit(EVENTS.SCENE_CHANGE, {
      scene: name,
      arenaWidth: this.arenaWidth,
      arenaHeight: this.arenaHeight,
      ...extra,
    })

    // Clean up on return to lobby
    if (name === 'lobby') {
      this.enemies.clear()
      this.projectiles.clear()
      this.boss = null
      this.reviveTimers.clear()
      this.minions.clear()
      this.currentLevelIndex = -1
      this.currentLevel      = null
      this.spawnSystem       = null
      this._spawnTrainingDummy()
    }
  }

  _spawnTrainingDummy() {
    const W = this.arenaWidth
    const H = this.arenaHeight

    const idle = new TrainingDummy({ id: 'training-dummy' })
    const ranged = new RangedDummy({ id: 'ranged-dummy', x: W * 0.2, y: H * 0.5 })
    const melee = new MeleeDummy({ id: 'melee-dummy', x: W * 0.8, y: H * 0.5 })
    const moving = new MovingDummy({
      id: 'moving-dummy', pointA: { x: W * 0.5, y: H * 0.55 }, pointB: { x: W * 0.5, y: H * 0.80 }, speed: 1.5,
    })

    ;[idle, ranged, melee, moving].forEach(dummy => dummy.setArenaSize(this.arenaWidth, this.arenaHeight))

    this.enemies.set('training-dummy', idle)
    this.enemies.set('ranged-dummy', ranged)
    this.enemies.set('melee-dummy', melee)
    this.enemies.set('moving-dummy', moving)
  }

  _setArenaSize(width, height) {
    this.arenaWidth = width
    this.arenaHeight = height
    this.players.forEach(p => p.setArenaSize(width, height))
  }

  _randomPointNearCenter(spreadX, spreadY) {
    return {
      x: this.arenaWidth / 2 + (Math.random() - 0.5) * spreadX,
      y: this.arenaHeight / 2 + (Math.random() - 0.5) * spreadY,
    }
  }

  // ── Game state accessor ────────────────────────────────────────────────────

  _gs() {
    return {
      arenaWidth:   this.arenaWidth,
      arenaHeight:  this.arenaHeight,
      players:      this.players,
      projectiles:  this.projectiles,
      enemies:      this.enemies,
      boss:         this.boss,
      stats:        this.stats,
      io:           this.io,
      cooldowns:    this.cooldowns,
      minions:      this.minions,
      nextMinionId: () => ++this._minionIdSeq,
    }
  }

  // ── Tick loop ──────────────────────────────────────────────────────────────

  _gameTick() {
    try {
    const now = Date.now()
    const dt  = Math.min((now - this.lastTick) / 1000, 0.1)
    this.lastTick = now
    this.tick++

    // 1. Drain input queues
    this.inputQueues.forEach((queue, playerId) => {
      const player = this.players.get(playerId)
      if (!player) return

      let lastMove = null

      for (const input of queue) {
        if (input.type === 'move') {
          lastMove = input
        } else if (input.type === 'skill') {
          this._processSkillInput(player, input)
        }
      }

      if (lastMove) player.setMoveInput(lastMove.x, lastMove.y)
      queue.length = 0
    })

    // 2. Update players
    this.players.forEach(p => p.update(dt))

    // 3. Scene-specific logic
    if (this.scene === 'lobby') {
      const gs = this._gs()
      this.skillSystem.tick(gs, dt)
      this.enemies.forEach(dummy => dummy.update(dt, gs))
    }

    if (this.scene === 'battle' || this.scene === 'bossFight') {
      const gs = this._gs()
      this.skillSystem.tick(gs, dt)

      // Spawn enemies from SpawnSystem
      if (this.spawnSystem) {
        const spawned = this.spawnSystem.tick(now, this.enemies, this._enemyIdSeq)
        for (const e of spawned) {
          this.enemies.set(e.id, e)
        }
      }

      // Update enemies (AI + contact damage)
      this._updateEnemies(dt, now)

      // Update boss
      if (this.boss) {
        this._updateBoss(dt, now)
      }

      this._checkRevive(now)
      this._updateObjectives(now)
      this._checkAllDead()
    }

    // 4. Broadcast delta state
    this.io.emit(EVENTS.STATE_DELTA, this._deltaState())
    } catch (err) {
      console.error('[GameTick ERROR]', err)
    }
  }

  // ── Skill processing ────────────────────────────────────────────────────────

  _processSkillInput(player, input) {
    if (player.isDead) return

    const { index, vector, action } = input
    const config = player.getSkillConfig(index)
    if (!config) return

    // Vanish/stealth breaks when any ability other than the stealth skill itself is used
    if (player.isInvisible) {
      const stealthIdx = player.activeEffects.findIndex(
        e => e.params?.invisible && e.params?.breaksOnAttack
      )
      if (stealthIdx !== -1 && player.activeEffects[stealthIdx].source !== `skill:${index}`) {
        const shadowMult = player.activeEffects[stealthIdx].params?.shadowStrikeMultiplier
        if (shadowMult) player.shadowStrikeMult = shadowMult
        player.activeEffects.splice(stealthIdx, 1)
        player.rebuildStats()
      }
    }

    // SHIELD: START bypasses cooldown; END triggers cooldown
    if (config.type === 'SHIELD') {
      if (action === 'START') {
        if (this.cooldowns.isOnCooldown(player.id, index)) return
        const gs = this._gs()
        this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 }, action)
      } else if (action === 'END') {
        const gs = this._gs()
        this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 }, action)
        const effectiveCooldown = Math.round(config.cooldown / (player.fireRateMult ?? 1))
        this.cooldowns.start(player.id, index, effectiveCooldown)
        this.io.emit(EVENTS.COOLDOWN, { playerId: player.id, skillIndex: index, durationMs: effectiveCooldown })
      }
      return
    }

    // Cast-on-hold: controller-driven cast bar for CAST/TARGETED + DIRECTIONAL skills with castTime
    if ((config.type === 'CAST' || (config.type === 'TARGETED' && config.castTime != null)) && config.inputType === 'DIRECTIONAL') {
      if (action === 'CAST_START') {
        if (player.activeCast != null) return
        player.activeCast = {
          config,
          vector: vector ?? { x: 1, y: 0 },
          startedAt: Date.now(),
          isChanneled: false,
        }
        return
      }
      if (action === 'CAST_CANCEL') {
        player.activeCast = null
        return
      }
      player.activeCast = null
    }

    if (player.isStunned) return

    // CHANNEL/BEAM: execute first; only apply cooldown if a target was found
    if (config.type === 'CHANNEL' && config.subtype === 'BEAM') {
      if (this.cooldowns.isOnCooldown(player.id, index)) return
      const gs = this._gs()
      const found = this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 })
      if (found) {
        const effectiveCooldown = Math.round(config.cooldown / (player.fireRateMult ?? 1))
        this.cooldowns.start(player.id, index, effectiveCooldown)
        this.io.emit(EVENTS.COOLDOWN, { playerId: player.id, skillIndex: index, durationMs: effectiveCooldown })
        const classColor = CLASSES[player.className]?.color ?? '#ffffff'
        const v = vector ?? { x: 1, y: 0 }
        this.io.emit(EVENTS.SKILL_FIRED, { playerId: player.id, skillName: config.name, type: config.type, subtype: config.subtype ?? null, x: Math.round(player.x), y: Math.round(player.y), angle: Math.atan2(v.y, v.x), radius: 0, range: config.range ?? 0, color: classColor })
      }
      return
    }

    // TARGETED (and BUFF+TARGETED): execute first; only apply cooldown if a target was found
    if (config.type === 'TARGETED' || (config.type === 'BUFF' && config.subtype === 'TARGETED')) {
      if (this.cooldowns.isOnCooldown(player.id, index)) return
      const gs = this._gs()
      const found = this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 })
      if (found) {
        const effectiveCooldown = Math.round(config.cooldown / (player.fireRateMult ?? 1))
        this.cooldowns.start(player.id, index, effectiveCooldown)
        this.io.emit(EVENTS.COOLDOWN, { playerId: player.id, skillIndex: index, durationMs: effectiveCooldown })
        const classColor = CLASSES[player.className]?.color ?? '#ffffff'
        const v = vector ?? { x: 1, y: 0 }
        this.io.emit(EVENTS.SKILL_FIRED, { playerId: player.id, skillName: config.name, type: config.type, subtype: config.subtype ?? null, x: Math.round(player.x), y: Math.round(player.y), angle: Math.atan2(v.y, v.x), radius: 0, range: config.range ?? 0, color: classColor })
      }
      return
    }

    if (this.cooldowns.isOnCooldown(player.id, index)) return
    const effectiveCooldown = Math.round(config.cooldown / (player.fireRateMult ?? 1))
    this.cooldowns.start(player.id, index, effectiveCooldown)

    this.io.emit(EVENTS.COOLDOWN, { playerId: player.id, skillIndex: index, durationMs: effectiveCooldown })

    const gs = this._gs()
    this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 }, action)

    // Emit skill fired event for VFX
    const classColor = CLASSES[player.className]?.color ?? '#ffffff'
    const v = vector ?? { x: 1, y: 0 }
    this.io.emit(EVENTS.SKILL_FIRED, {
      playerId:  player.id,
      skillName: config.name,
      type:      config.type,
      subtype:   config.subtype ?? null,
      x:         Math.round(player.x),
      y:         Math.round(player.y),
      angle:     Math.atan2(v.y, v.x),
      radius:    config.radius ?? 0,
      range:     config.range ?? 0,
      color:     classColor,
    })
  }

  // ── Enemy management ────────────────────────────────────────────────────────

  _updateEnemies(dt, now) {
    const ctx = { enemies: this.enemies, now, projectiles: this.projectiles, enemyIdSeq: this._enemyIdSeq }

    this.enemies.forEach((e, id) => {
      if (e.isDead) {
        this.enemies.delete(id)
        this.killCount++
        this._killsByType[e.type] = (this._killsByType[e.type] ?? 0) + 1
        this.stats.kills = this.killCount
        return
      }

      const action = e.update(dt, this.players, ctx)

      // Handle enemy actions (ranged shots, healer pulses)
      if (action?.action === 'shoot') {
        const projId = `ep_${++this._enemyIdSeq.value}`
        this.projectiles.set(projId, {
          id: projId,
          x: action.x, y: action.y,
          vx: action.vx, vy: action.vy,
          radius: 5,
          range: 500,
          distTraveled: 0,
          damage: action.damage,
          color: action.color,
          isAlive: true,
          isEnemyProj: true,
          ownerId: id,
          hit: new Set([id]),
        })
      }

      // Contact damage to players (rate-limited: once per 500ms per enemy)
      if (now - e._lastContactDamage > 500) {
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          const dist = Math.hypot(p.x - e.x, p.y - e.y)
          const combined = (GAME_CONFIG.PLAYER_RADIUS + e.radius)
          if (dist <= combined) {
            if (p.isShieldBlocking(e.x, e.y)) return
            e._lastContactDamage = now
            p.takeDamage(e.contactDamage)
            if (!this.stats.deaths) this.stats.deaths = {}
            if (p.isDead) {
              this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
            }
          }
        })
      }
    })
  }

  // ── Boss management ─────────────────────────────────────────────────────────

  _updateBoss(dt, now) {
    if (!this.boss) return

    this.boss.update(dt, this.players)

    const attacks = this.boss.updateAbilities(dt, this.players, now)
    for (const attack of attacks) {
      if (attack.type === 'beam') {
        const target = attack.target
        if (target && !target.isDead) {
          const d = Math.hypot(target.x - this.boss.x, target.y - this.boss.y)
          if (d < 350 && !target.isShieldBlocking(this.boss.x, this.boss.y)) {
            target.takeDamage(attack.damage ?? 30)
            if (target.isDead) this.stats.deaths[target.id] = (this.stats.deaths[target.id] ?? 0) + 1
          }
        }
      } else if (attack.type === 'aoe') {
        const r = attack.radius ?? 100
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          const d = Math.hypot(p.x - attack.bossX, p.y - attack.bossY)
          if (d <= r + GAME_CONFIG.PLAYER_RADIUS) {
            if (p.isShieldBlocking(attack.bossX, attack.bossY)) return
            p.takeDamage(attack.damage ?? 25)
            if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
        })
      } else if (attack.type === 'charge') {
        const target = attack.target
        if (target && !target.isDead && !target.isShieldBlocking(this.boss.x, this.boss.y)) {
          target.takeDamage(attack.damage ?? 40)
          if (target.isDead) this.stats.deaths[target.id] = (this.stats.deaths[target.id] ?? 0) + 1
        }
      }
    }

    // Contact damage: per-player rate-limited
    this.players.forEach(p => {
      if (p.isHost || p.isDead) return
      const d = Math.hypot(p.x - this.boss.x, p.y - this.boss.y)
      if (d <= GAME_CONFIG.BOSS_RADIUS + GAME_CONFIG.PLAYER_RADIUS + 5) {
        if (p.isShieldBlocking(this.boss.x, this.boss.y)) return
        if (!p._lastBossContact) p._lastBossContact = 0
        if (now - p._lastBossContact > 500) {
          p._lastBossContact = now
          p.takeDamage(5)
          if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
        }
      }
    })
  }

  // ── Revive mechanic ─────────────────────────────────────────────────────────

  _checkRevive(now) {
    const deadPlayers  = []
    const alivePlayers = []

    this.players.forEach(p => {
      if (p.isHost) return
      if (p.isDead) deadPlayers.push(p)
      else          alivePlayers.push(p)
    })

    deadPlayers.forEach(dead => {
      let reviver = null
      for (const alive of alivePlayers) {
        const d = Math.hypot(alive.x - dead.x, alive.y - dead.y)
        if (d <= GAME_CONFIG.REVIVE_DISTANCE) { reviver = alive; break }
      }

      if (!reviver) {
        this.reviveTimers.delete(dead.id)
        return
      }

      const existing = this.reviveTimers.get(dead.id)
      if (!existing || existing.reviverId !== reviver.id) {
        this.reviveTimers.set(dead.id, { reviverId: reviver.id, startedAt: now })
        return
      }

      const elapsed = now - existing.startedAt
      if (elapsed >= GAME_CONFIG.REVIVE_TIME) {
        dead.revive()
        this.reviveTimers.delete(dead.id)
        console.log(`[~] revived ${dead.name}`)
      }
    })
  }

  // ── Objective evaluation ───────────────────────────────────────────────────

  _updateObjectives(now) {
    if (!this.currentLevel) return

    let allComplete = true

    for (let i = 0; i < this.objectiveProgress.length; i++) {
      const obj = this.objectiveProgress[i]

      switch (obj.type) {
        case 'killCount': {
          if (obj.enemyTypes?.length) {
            let count = 0
            for (const t of obj.enemyTypes) count += (this._killsByType[t] ?? 0)
            obj.current = count
          } else {
            obj.current = this.killCount
          }
          if (obj.current < obj.target) allComplete = false
          break
        }
        case 'survive': {
          obj.current = now - this._levelStartTime
          obj.target  = obj.durationMs
          if (obj.current < obj.durationMs) allComplete = false
          break
        }
        case 'killBoss': {
          obj.current = this.boss?.isDead ? 1 : 0
          obj.target  = 1
          if (!this.boss?.isDead) allComplete = false
          break
        }
        default:
          allComplete = false
      }
    }

    // Broadcast objective progress periodically (every 5 ticks ≈ 250ms)
    if (this.tick % 5 === 0) {
      this.io.emit(EVENTS.OBJECTIVE_UPDATE, { objectives: this.objectiveProgress })
    }

    if (allComplete) {
      this._onLevelComplete()
    }
  }

  _onLevelComplete() {
    const levelIndex = this.currentLevelIndex
    const isLastLevel = levelIndex >= CAMPAIGN.length - 1

    console.log(`[~] Level ${levelIndex + 1} complete! ${isLastLevel ? '(final)' : ''}`)

    if (isLastLevel) {
      // Campaign complete — final victory!
      this._changeScene('result')
    } else {
      // Show level-complete screen and wait for host to advance
      this._changeScene('levelComplete', {
        levelIndex,
        levelName: this.currentLevel?.name ?? '',
        totalLevels: CAMPAIGN.length,
        stats: { ...this.stats },
      })
    }
  }

  // ── Win / lose conditions ───────────────────────────────────────────────────

  _checkAllDead() {
    let livingCount = 0
    this.players.forEach(p => {
      if (!p.isHost && !p.isDead) livingCount++
    })
    if (livingCount === 0 && this.players.size > 0) {
      console.log('[~] All players dead — game over')
      this.currentLevelIndex = -1
      this.currentLevel      = null
      this._changeScene('gameover')
    }
  }

  // ── State serialisation ────────────────────────────────────────────────────

  /** Full snapshot — sent once to a joining player. */
  _fullState() {
    const players = {}
    this.players.forEach((p, id) => { players[id] = p.toDTO() })
    return {
      players,
      scene:      this.scene,
      tick:       this.tick,
      killCount:  this.killCount,
      boss:       this.boss ? this.boss.toDTO() : null,
      arenaWidth: this.arenaWidth,
      arenaHeight: this.arenaHeight,
      levelIndex:  this.currentLevelIndex,
      totalLevels: CAMPAIGN.length,
      levelName:   this.currentLevel?.name ?? null,
      objectives:  this.objectiveProgress,
    }
  }

  /** Delta snapshot — broadcast every tick. Only includes changed fields. */
  _deltaState() {
    const players = {}
    this.players.forEach((p, id) => { players[id] = p.toDeltaDTO() })

    const projectiles = []
    this.projectiles.forEach(proj => {
      if (proj.isAlive) {
        projectiles.push({
          id:     proj.id,
          x:      Math.round(proj.x),
          y:      Math.round(proj.y),
          radius: proj.radius,
          color:  proj.color,
        })
      }
    })

    const enemies = []
    this.enemies.forEach(e => {
      if (!e.isDead) enemies.push(e.toDTO())
    })

    // Build tombstones (dead players with revive progress)
    const tombstones = []
    this.players.forEach(p => {
      if (!p.isDead || p.isHost) return
      const timer = this.reviveTimers.get(p.id)
      tombstones.push({
        id:       p.id,
        x:        Math.round(p.x),
        y:        Math.round(p.y),
        progress: timer
          ? Math.min(1, (Date.now() - timer.startedAt) / GAME_CONFIG.REVIVE_TIME)
          : 0,
      })
    })

    const minions = []
    this.minions.forEach(m => { if (!m.isDead) minions.push(m.toDTO()) })

    return {
      tick:        this.tick,
      players,
      projectiles,
      enemies,
      boss:        this.boss ? this.boss.toDTO() : null,
      killCount:   this.killCount,
      tombstones,
      stats:       this.stats,
      aoeZones:    this.skillSystem.getZonesDTO(),
      minions,
    }
  }
}
