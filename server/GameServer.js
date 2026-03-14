import { EVENTS }        from '../shared/protocol.js'
import { GAME_CONFIG }   from '../shared/GameConfig.js'
import { CLASSES, resolveClassName } from '../shared/ClassConfig.js'
import ServerPlayer      from './entities/ServerPlayer.js'
import CooldownSystem    from './systems/CooldownSystem.js'

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

    this.cooldowns = new CooldownSystem()

    this.tick      = 0
    this.lastTick  = Date.now()

    // Start authoritative game loop
    this._loopInterval = setInterval(
      () => this._gameTick(),
      1000 / GAME_CONFIG.TICK_RATE
    )
  }

  // ── Connection handling ────────────────────────────────────────────────

  handleConnection(socket) {
    console.log(`[+] connected   ${socket.id}`)

    socket.on(EVENTS.JOIN,         data => this._onJoin(socket, data))
    socket.on(EVENTS.INPUT_MOVE,   data => this._onInputMove(socket, data))
    socket.on(EVENTS.INPUT_SKILL,  data => this._onInputSkill(socket, data))
    socket.on(EVENTS.START_GAME,   ()   => this._onStartGame(socket))
    socket.on(EVENTS.RESTART_GAME, ()   => this._onRestartGame(socket))
    socket.on('disconnect',        ()   => this._onDisconnect(socket))
  }

  // ── Socket event handlers ──────────────────────────────────────────────

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
      vector: data?.vector ?? { x: 1, y: 0 }
    })
  }

  _onStartGame(socket) {
    if (!this.players.get(socket.id)?.isHost) return
    this._changeScene('trashMob')
  }

  _onRestartGame(socket) {
    if (!this.players.get(socket.id)?.isHost) return

    // Reset all players to full HP / alive
    this.players.forEach(p => {
      if (!p.isHost) {
        p.hp     = p.maxHp
        p.isDead = false
        p.x = GAME_CONFIG.CANVAS_WIDTH  / 2 + (Math.random() - 0.5) * 300
        p.y = GAME_CONFIG.CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 200
      }
    })

    this._changeScene('lobby')
  }

  _onDisconnect(socket) {
    const player = this.players.get(socket.id)
    console.log(`[-] disconnect  ${player?.name ?? socket.id}`)

    this.players.delete(socket.id)
    this.inputQueues.delete(socket.id)
    this.cooldowns.clearPlayer(socket.id)

    this.io.emit(EVENTS.PLAYER_LEFT, socket.id)
  }

  // ── Scene management ───────────────────────────────────────────────────

  _changeScene(name) {
    this.scene = name
    console.log(`[~] scene → ${name}`)
    this.io.emit(EVENTS.SCENE_CHANGE, { scene: name })
  }

  // ── Tick loop ──────────────────────────────────────────────────────────

  _gameTick() {
    const now = Date.now()
    const dt  = Math.min((now - this.lastTick) / 1000, 0.1)  // seconds, capped at 100 ms
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

    // 2. Update all entities
    this.players.forEach(p => p.update(dt))

    // 3. Future phases will update enemies, boss, projectiles here

    // 4. Broadcast delta state
    this.io.emit(EVENTS.STATE_DELTA, this._deltaState())
  }

  /**
   * Skill input handler.
   * Phase 4 will wire this to SkillSystem. For now it validates and logs.
   */
  _processSkillInput(player, input) {
    if (player.isDead) return
    const { index, vector } = input

    if (this.cooldowns.isOnCooldown(player.id, index)) return

    const skillConfig = player.getSkillConfig(index)
    if (!skillConfig) return

    // Placeholder: start cooldown and broadcast it
    this.cooldowns.start(player.id, index, skillConfig.cooldown)

    const expiresAt = Date.now() + skillConfig.cooldown
    this.io.emit(EVENTS.COOLDOWN, { playerId: player.id, skillIndex: index, expiresAt })

    // TODO Phase 4: pass to SkillSystem for actual effect execution
  }

  // ── State serialisation ────────────────────────────────────────────────

  /** Full snapshot — sent once to a joining player. */
  _fullState() {
    const players = {}
    this.players.forEach((p, id) => { players[id] = p.toDTO() })
    return { players, scene: this.scene, tick: this.tick }
  }

  /** Delta snapshot — broadcast every tick. Only includes changed fields. */
  _deltaState() {
    const players = {}
    this.players.forEach((p, id) => { players[id] = p.toDeltaDTO() })
    return { players, scene: this.scene, tick: this.tick }
  }
}
