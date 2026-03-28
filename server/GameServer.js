import { EVENTS }        from '../shared/protocol.js'
import { GAME_CONFIG }   from '../shared/GameConfig.js'
import { CLASSES, resolveClassName } from '../shared/ClassConfig.js'
import ServerPlayer      from './entities/ServerPlayer.js'
import ServerEnemy       from './entities/ServerEnemy.js'
import ServerBoss        from './entities/ServerBoss.js'
import TrainingDummy, { RangedDummy, MeleeDummy, MovingDummy } from './entities/TrainingDummy.js'
import CooldownSystem    from './systems/CooldownSystem.js'
import SkillSystem       from './systems/SkillSystem.js'

/**
 * GameServer — authoritative game simulation.
 *
 * Runs a fixed-rate tick loop (TICK_RATE Hz).
 * All game state lives here; clients are pure renderers / input sources.
 *
 * Scene flow:  lobby → trashMob → bossFight → result
 *                   ↑__________________________|  (restart)
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

    this._enemyIdSeq  = 0
    this._minionIdSeq = 0
    this._lastSpawn   = 0
    this.killCount    = 0

    // Spawned minions (totems, traps, pets)
    this.minions = new Map()

    // Stats tracking
    this.stats = { damage: {}, deaths: {}, kills: 0, startTime: 0 }

    // Revive tracking: deadPlayerId → { reviverId, startedAt }
    this.reviveTimers = new Map()

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

    socket.on(EVENTS.JOIN,         data => this._onJoin(socket, data))
    socket.on(EVENTS.INPUT_MOVE,   data => this._onInputMove(socket, data))
    socket.on(EVENTS.INPUT_SKILL,  data => this._onInputSkill(socket, data))
    socket.on(EVENTS.INPUT_AIM,    ({ vector }) => {
      const player = this.players.get(socket.id)
      if (player && vector) {
        player.angle = Math.atan2(vector.y, vector.x)
        if (player.shieldActive) {
          player.shieldAngle = player.angle
        }
      }
    })
    socket.on(EVENTS.START_GAME,   ()   => this._onStartGame(socket))
    socket.on(EVENTS.RESTART_GAME, ()   => this._onRestartGame(socket))
    socket.on('disconnect',        ()   => this._onDisconnect(socket))
  }

  // ── Socket event handlers ──────────────────────────────────────────────────

  _onJoin(socket, data) {
    const { name, className, isHost } = data ?? {}

    const resolvedClass = resolveClassName(className) ?? 'Warrior'

    const player = new ServerPlayer({
      id:        socket.id,
      name:      (name || 'Player').slice(0, 20),
      className: resolvedClass,
      isHost:    !!isHost,
      x: GAME_CONFIG.CANVAS_WIDTH  / 2 + (Math.random() - 0.5) * 300,
      y: GAME_CONFIG.CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 200,
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

  _onStartGame(socket) {
    if (!this.players.get(socket.id)?.isHost) return

    // Reset stats and clear leftover state
    this.killCount   = 0
    this.stats       = { damage: {}, deaths: {}, kills: 0, startTime: Date.now() }
    this.projectiles.clear()
    this.enemies.clear()
    this.boss        = null
    this.reviveTimers.clear()
    this.minions.clear()
    this._lastSpawn  = 0
    this.skillSystem.activeZones = []

    this._changeScene('trashMob')
  }

  _onRestartGame(socket) {
    if (!this.players.get(socket.id)?.isHost) return

    // Reset all players to full HP / alive
    this.players.forEach(p => {
      if (!p.isHost) {
        p.hp          = p.maxHp
        p.isDead      = false
        p.activeCast  = null
        p.shieldActive = false
        p.activeEffects = []
        p.rebuildStats()
        p.x = GAME_CONFIG.CANVAS_WIDTH  / 2 + (Math.random() - 0.5) * 300
        p.y = GAME_CONFIG.CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 200
      }
    })

    // Clear all game entities
    this.projectiles.clear()
    this.enemies.clear()
    this.boss          = null
    this.killCount     = 0
    this.stats         = { damage: {}, deaths: {}, kills: 0, startTime: 0 }
    this.reviveTimers.clear()
    this.minions.clear()
    this._lastSpawn    = 0
    this.skillSystem.activeZones = []

    this._changeScene('lobby')
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

  _changeScene(name) {
    this.scene = name
    console.log(`[~] scene → ${name}`)
    this.io.emit(EVENTS.SCENE_CHANGE, { scene: name })

    // Clean up on return to lobby
    if (name === 'lobby') {
      this.enemies.clear()
      this.projectiles.clear()
      this.boss = null
      this.reviveTimers.clear()
      this.minions.clear()
      this._spawnTrainingDummy()
    }
  }

  _spawnTrainingDummy() {
    const W = GAME_CONFIG.CANVAS_WIDTH
    const H = GAME_CONFIG.CANVAS_HEIGHT

    // Idle dummy — stationary center-top, takes damage but never dies
    this.enemies.set('training-dummy', new TrainingDummy({ id: 'training-dummy' }))

    // Ranged dummy — stationary left, fires slow projectiles at nearest player
    this.enemies.set('ranged-dummy', new RangedDummy({
      id: 'ranged-dummy',
      x:  W * 0.2,
      y:  H * 0.5,
    }))

    // Melee dummy — stationary right, attacks if player walks into melee range
    this.enemies.set('melee-dummy', new MeleeDummy({
      id: 'melee-dummy',
      x:  W * 0.8,
      y:  H * 0.5,
    }))

    // Moving dummy — patrols center so players can practice on a moving target
    this.enemies.set('moving-dummy', new MovingDummy({
      id:     'moving-dummy',
      pointA: { x: W * 0.5, y: H * 0.55 },
      pointB: { x: W * 0.5, y: H * 0.80 },
      speed:  1.5,
    }))
  }

  // ── Game state accessor ────────────────────────────────────────────────────

  _gs() {
    return {
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

    // 3. Update enemies + boss + skill ticks
    // Lobby: run skill ticks so projectiles can hit training dummies
    if (this.scene === 'lobby') {
      const gs = this._gs()
      this.skillSystem.tick(gs, dt)
      this.enemies.forEach(dummy => dummy.update(dt, gs))
    }

    if (this.scene === 'trashMob' || this.scene === 'bossFight') {
      const gs = this._gs()
      this.skillSystem.tick(gs, dt)

      if (this.scene === 'trashMob') {
        this._updateEnemies(dt, now)
        this._spawnEnemies(now)
        this._checkRevive(now)
        this._checkTrashMobWin()
        this._checkAllDead()
      } else if (this.scene === 'bossFight') {
        this._updateBoss(dt, now)
        this._checkRevive(now)
        this._checkBossWin()
        this._checkAllDead()
      }
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

    // SHIELD: START bypasses cooldown; END triggers cooldown
    if (config.type === 'SHIELD') {
      if (action === 'START') {
        if (this.cooldowns.isOnCooldown(player.id, index)) return
        const gs = this._gs()
        this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 }, action)
      } else if (action === 'END') {
        const gs = this._gs()
        this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 }, action)
        // Start cooldown on release
        this.cooldowns.start(player.id, index, config.cooldown)
        const expiresAt = Date.now() + config.cooldown
        this.io.emit(EVENTS.COOLDOWN, { playerId: player.id, skillIndex: index, expiresAt })
      }
      return
    }

    // Cast-on-hold: controller-driven cast bar for CAST + DIRECTIONAL skills
    if (config.type === 'CAST' && config.inputType === 'DIRECTIONAL') {
      if (action === 'CAST_START') {
        // Visual-only cast bar — no cooldown, no execution yet
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
      // No action = cast completed on controller — clear visual cast, proceed to fire
      player.activeCast = null
    }

    if (player.isStunned) return

    // CHANNEL/BEAM: execute first; only apply cooldown if a target was found
    if (config.type === 'CHANNEL' && config.subtype === 'BEAM') {
      if (this.cooldowns.isOnCooldown(player.id, index)) return
      const gs = this._gs()
      const found = this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 })
      if (found) {
        this.cooldowns.start(player.id, index, config.cooldown)
        const expiresAt = Date.now() + config.cooldown
        this.io.emit(EVENTS.COOLDOWN, { playerId: player.id, skillIndex: index, expiresAt })
        const classColor = CLASSES[player.className]?.color ?? '#ffffff'
        const v = vector ?? { x: 1, y: 0 }
        this.io.emit(EVENTS.SKILL_FIRED, { playerId: player.id, skillName: config.name, type: config.type, subtype: config.subtype ?? null, x: Math.round(player.x), y: Math.round(player.y), angle: Math.atan2(v.y, v.x), radius: 0, range: config.range ?? 0, color: classColor })
      }
      return
    }

    // TARGETED: execute first; only apply cooldown if a target was found
    if (config.type === 'TARGETED') {
      if (this.cooldowns.isOnCooldown(player.id, index)) return
      const gs = this._gs()
      const found = this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 })
      if (found) {
        this.cooldowns.start(player.id, index, config.cooldown)
        const expiresAt = Date.now() + config.cooldown
        this.io.emit(EVENTS.COOLDOWN, { playerId: player.id, skillIndex: index, expiresAt })
        const classColor = CLASSES[player.className]?.color ?? '#ffffff'
        const v = vector ?? { x: 1, y: 0 }
        this.io.emit(EVENTS.SKILL_FIRED, { playerId: player.id, skillName: config.name, type: config.type, subtype: config.subtype ?? null, x: Math.round(player.x), y: Math.round(player.y), angle: Math.atan2(v.y, v.x), radius: 0, range: config.range ?? 0, color: classColor })
      }
      return
    }

    if (this.cooldowns.isOnCooldown(player.id, index)) return
    this.cooldowns.start(player.id, index, config.cooldown)

    const expiresAt = Date.now() + config.cooldown
    this.io.emit(EVENTS.COOLDOWN, { playerId: player.id, skillIndex: index, expiresAt })

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

  _spawnEnemies(now) {
    const SPAWN_INTERVAL = 2000
    if (now - this._lastSpawn < SPAWN_INTERVAL) return

    // Don't overspawn
    const total = this.enemies.size + this.killCount
    if (total >= GAME_CONFIG.ENEMY_KILL_GOAL + 10) return

    this._lastSpawn = now

    const count = Math.floor(Math.random() * 3) + 1   // 1-3

    for (let i = 0; i < count; i++) {
      const { x, y } = this._randomEdgePos(30)
      const id = ++this._enemyIdSeq
      this.enemies.set(id, new ServerEnemy({ id, x, y }))
    }
  }

  _randomEdgePos(margin) {
    const W = GAME_CONFIG.CANVAS_WIDTH
    const H = GAME_CONFIG.CANVAS_HEIGHT
    const edge = Math.floor(Math.random() * 4)

    switch (edge) {
      case 0: return { x: margin + Math.random() * (W - 2 * margin), y: margin }                  // top
      case 1: return { x: margin + Math.random() * (W - 2 * margin), y: H - margin }              // bottom
      case 2: return { x: margin,     y: margin + Math.random() * (H - 2 * margin) }              // left
      default: return { x: W - margin, y: margin + Math.random() * (H - 2 * margin) }             // right
    }
  }

  _updateEnemies(dt, now) {
    this.enemies.forEach((e, id) => {
      if (e.isDead) {
        this.enemies.delete(id)
        this.killCount++
        // Sync kills to stats
        this.stats.kills = this.killCount
        return
      }

      e.update(dt, this.players)

      // Contact damage to players (rate-limited: once per 500ms per enemy)
      if (now - e._lastContactDamage > 500) {
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          const dist = Math.hypot(p.x - e.x, p.y - e.y)
          if (dist <= p.constructor && false) return // type safety unused
          const combined = (GAME_CONFIG.PLAYER_RADIUS + e.radius)
          if (dist <= combined) {
            if (p.isShieldBlocking(e.x, e.y)) return  // shield blocks
            e._lastContactDamage = now
            p.takeDamage(15)
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
      // Find closest alive player within REVIVE_DISTANCE
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

  // ── Win / lose conditions ───────────────────────────────────────────────────

  _checkTrashMobWin() {
    if (this.killCount >= GAME_CONFIG.ENEMY_KILL_GOAL) {
      console.log('[~] TrashMob complete — spawning boss')

      // Reset all non-host players to full HP and scatter them
      this.players.forEach(p => {
        if (p.isHost) return
        p.hp          = p.maxHp
        p.isDead      = false
        p.activeCast  = null
        p.shieldActive = false
        p.activeEffects = []
        p.rebuildStats()
        p.x = GAME_CONFIG.CANVAS_WIDTH  / 2 + (Math.random() - 0.5) * 400
        p.y = GAME_CONFIG.CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 250
      })

      this.enemies.clear()
      this.projectiles.clear()
      this.reviveTimers.clear()
      this.minions.clear()
      this.skillSystem.activeZones = []
      this.boss = new ServerBoss()

      this._changeScene('bossFight')
    }
  }

  _checkBossWin() {
    if (this.boss?.isDead) {
      console.log('[~] Boss defeated — victory!')
      this._changeScene('result')
    }
  }

  _checkAllDead() {
    let livingCount = 0
    this.players.forEach(p => {
      if (!p.isHost && !p.isDead) livingCount++
    })
    if (livingCount === 0 && this.players.size > 0) {
      console.log('[~] All players dead — game over')
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
      scene:     this.scene,
      tick:      this.tick,
      killCount: this.killCount,
      boss:      this.boss ? this.boss.toDTO() : null,
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
