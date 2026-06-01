import { CLASSES, CLASS_NAMES, resolveClassName } from '../shared/ClassConfig.js'
import { ENEMY_TYPES } from '../shared/EnemyTypeConfig.js'
import { GAME_CONFIG } from '../shared/GameConfig.js'
import { ILLIDAN_CONFIG, ILLIDAN_PHASE } from '../shared/IllidanConfig.js'
import { CAMPAIGN, DEBUG_TEST_LEVEL, LEVEL_SELECT_OPTIONS } from '../shared/LevelConfig.js'
import { EVENTS } from '../shared/protocol.js'
import { QUIZ_QUESTIONS } from '../shared/QuizQuestions.js'
import { SHADE_OF_AKAMA_CONFIG } from '../shared/ShadeOfAkamaConfig.js'
import { getMaxTier, getUpgradePreview } from '../shared/UpgradeUtils.js'
import { buildWallSegments, resolveWallCollision } from '../shared/WallCollision.js'
import ServerBoss from './entities/ServerBoss.js'
import ServerBuilding from './entities/ServerBuilding.js'
import ServerEnemy from './entities/ServerEnemy.js'
import ServerGate from './entities/ServerGate.js'
import ServerNPC from './entities/ServerNPC.js'
import ServerPlayer from './entities/ServerPlayer.js'
import TrainingDummy, { MeleeDummy, RangedDummy } from './entities/TrainingDummy.js'
import BotController from './systems/BotController.js'
import BuildingSpawnSystem from './systems/BuildingSpawnSystem.js'
import CinematicMovementSystem from './systems/CinematicMovementSystem.js'
import CooldownSystem from './systems/CooldownSystem.js'
import DialogSystem from './systems/DialogSystem.js'
import IllidanEncounter from './systems/IllidanEncounter.js'
import ClosingCinematicSystem from './systems/ClosingCinematicSystem.js'
import BoulderSystem    from './systems/BoulderSystem.js'
import PortalBeamSystem from './systems/PortalBeamSystem.js'
import SkillSystem from './systems/SkillSystem.js'
import SpawnSystem from './systems/SpawnSystem.js'
import { buildDeltaState, buildFullState, buildYouPayload, buildingsDTO, gatesDTO, npcsDTO } from './systems/StateSerializer.js'
import RunHistory from './RunHistory.js'
import TransitionRunner from './TransitionRunner.js'

/**
 * Returns true if the point (cx, cy) with radius `otherRadius` overlaps the player's
 * oval hitbox centred at (px, py). Uses a Minkowski-sum approximation: expand each
 * ellipse axis by otherRadius.
 */
function playerHitsCircle(px, py, cx, cy, otherRadius) {
  const dx = px - cx
  const dy = py - cy
  const rx = GAME_CONFIG.PLAYER_RADIUS_X + otherRadius
  const ry = GAME_CONFIG.PLAYER_RADIUS_Y + otherRadius
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
}

/** Shape-aware collision: player oval vs entity hitbox (circle or oval). Optional pad expands the entity hitbox. */
function playerHitsEntity(px, py, entity, pad = 0) {
  const dx = px - entity.x
  const dy = py - entity.y
  if (entity.hitboxShape === 'oval') {
    const rx = GAME_CONFIG.PLAYER_RADIUS_X + entity.radiusX + pad
    const ry = GAME_CONFIG.PLAYER_RADIUS_Y + entity.radiusY + pad
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
  }
  return playerHitsCircle(px, py, entity.x, entity.y, entity.radius + pad)
}

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
    this.scene     = 'staging'      // initial state — server ready, game not yet running

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

    // NPCs (friendly entities like Akama)
    this.npcs = new Map()         // id → ServerNPC

    // Gates (destructible objectives)
    this.gates = new Map()        // id → ServerGate
    this._activeGateIndex = 0     // which gate in the sequence is active

    // Buildings (destructible spawners)
    this.buildings = new Map()    // id → ServerBuilding
    this.buildingSpawnSystem = null
    this.portalBeamSystem    = null
    this._boulderSystem      = null

    // Level 5: warlock/boss phase tracking
    this._bossPhase = 1
    this._warlockCount = 0
    this._lastWarlockBuffVfxTime = 0

    // Level 5: healing pylons (Phase 2)
    this._pylons         = new Map()   // id → pylon object
    this._pylonIdSeq     = 0
    this._pylonNextSpawn = null        // timestamp to spawn next pylon (null = inactive)

    this.minionSpawnSystem  = null   // ambient minions (activated after dialog)
    this._illidanEncounter  = null   // IllidanEncounter instance for Level 6
    this._closingCinematic  = null   // ClosingCinematicSystem — active after Illidan dies
    this._dialogSystem      = null
    this._cinematicSystem   = null   // walk-in / walk-out cinematic movement

    // Debug: skip entrance cinematic when testing boss mechanics
    this.skipDialog = false
    this.disableQuiz = false

    // Debug overrides — persist across deaths/restarts so the host doesn't have to re-set sliders
    this._debugOverrides = { playerLevel: 0, skillTiers: [0, 0, 0, 0] }

    // Stats tracking — cumulative across entire campaign run
    this.stats     = { damage: {}, heal: {}, deaths: {}, resurrections: {}, quiz: {}, kills: 0, startTime: 0 }
    // Per-level stats — reset at the start of each level
    this.levelStats = { damage: {}, heal: {}, resurrections: {}, kills: 0, startTime: 0 }
    // Run history — keyed by player name for cross-session stability
    this.runHistory = new RunHistory()

    // Revive tracking: deadPlayerId → { reviverId, startedAt }
    this.reviveTimers = new Map()

    // ── Level system ──────────────────────────────────────────────────────
    this.currentLevelIndex = -1
    this.currentLevel      = null
    this.spawnSystem       = null
    this._levelStartTime   = 0
    this._spawnSystemTimer       = null   // delayed spawn init during opening transition
    this._initialEnemiesReady    = false  // true once initialEnemies have been spawned
    this._levelCompletePending   = false  // guard against double-fire of _onLevelComplete
    this._closingRunner        = null   // TransitionRunner for closing sequence
    this.arenaWidth        = GAME_CONFIG.CANVAS_WIDTH
    this.arenaHeight       = GAME_CONFIG.CANVAS_HEIGHT
    this._wallSegments     = []

    // Objective progress — synced to clients via OBJECTIVE_UPDATE
    this.objectiveProgress = []

    // ── Tutorial ──────────────────────────────────────────────────────────
    this._tutorialActive            = false
    this._tutorialPhase             = 0          // 0 = inactive, 1–5 = active phase
    this._tutorialPhaseDone         = new Set()  // player IDs that completed current phase
    this._tutorialAbilityUses       = new Map()  // playerId → use-count for current phase
    this._tutorialLastCooldownReset = 0
    this._tutorialEndScheduled      = false

    // ── Quiz & Upgrade system ─────────────────────────────────────────────
    this._quizPhase         = null   // 'answering' | 'results' | 'upgrading'
    this._quizQuestion      = null
    this._quizAnswers       = new Map()   // playerId → chosenIndex
    this._quizResults       = new Map()   // playerId → boolean
    this._quizUpgradesDone  = new Set()
    this._usedQuestionIds   = new Set()

    // ── Level unlock & zone selector ──────────────────────────────────────
    this.unlockedLevelCount   = 1
    this._levelZoneState      = null   // null when only 1 level unlocked
    this._preLevelQuizQueue   = 0
    this._preLevelTargetIndex = 0
    this._zoneCountdownMs     = 4000   // used internally by _tickZoneSelector

    // Bot players (server-side fake players for solo testing)
    this.bots    = new Map()   // botId → { socket (stub), wanderAngle, wanderTimer }

    // Disconnected real players waiting for reconnect — keyed by sessionToken.
    // Bot-ify timer fires independently after BOT_IFICATION_DELAY_MS.
    this.disconnectedPlayers = new Map() // sessionToken → ServerPlayer
    this._waitingPlayers     = new Map() // socketId → name (entered name, picking class)
    this._botSeq = 0

    this._botController = new BotController({
      bots:            this.bots,
      players:         this.players,
      inputQueues:     this.inputQueues,
      enemies:         this.enemies,
      getBoss:         () => this.boss,
      buildings:       this.buildings,
      gates:           this.gates,
      getCurrentLevel: () => this.currentLevel,
      isDialogRunning: () => this._dialogSystem?.isRunning() ?? false,
      getScene:        () => this.scene,
    })

    this.tick      = 0
    this.lastTick  = Date.now()

    // Start authoritative game loop
    this._loopInterval = setInterval(
      () => this._gameTick(),
      1000 / GAME_CONFIG.TICK_RATE
    )
  }

  // ── Connection handling ────────────────────────────────────────────────────

  handleConnection(socket) {
    console.log(`[+] connected   ${socket.id}`)

    socket.on(EVENTS.HANDSHAKE,     data => this._onHandshake(socket, data))
    socket.on(EVENTS.REJOIN,        ()   => this._onRejoin(socket))
    socket.on(EVENTS.PLAYER_READY,  ()   => this._onPlayerReady(socket))
    socket.on(EVENTS.JOIN,          data => this._onJoin(socket, data))
    socket.on(EVENTS.PLAYER_WAITING, data => this._onPlayerWaiting(socket, data))
    socket.on(EVENTS.INPUT_MOVE,      data => this._onInputMove(socket, data))
    socket.on(EVENTS.INPUT_SKILL,     data => this._onInputSkill(socket, data))
    socket.on(EVENTS.INPUT_HIGHLIGHT, ()   => this._onInputHighlight(socket))
    socket.on(EVENTS.INPUT_AIM,     ({ vector, selfZone }) => {
      if (this._cinematicSystem?.isActive()) return
      const player = this.players.get(socket.id)
      if (player && vector) {
        player.aimAngle    = Math.atan2(vector.y, vector.x)
        player.angle       = player.aimAngle
        player.isAiming    = true
        player.aimSelf     = !!selfZone
        player.lastAimTime = Date.now()
        // Track aim while held; freeze once auto-latched (shieldExpiresAt set)
        if (player.shieldActive && player.shieldExpiresAt == null) {
          player.shieldAngle = player.aimAngle
        }
      }
    })
    socket.on(EVENTS.START_GAME,    ()   => this._onStartGame(socket))
    socket.on(EVENTS.HOST_ENTER_RAID,  () => this._onEnterRaid(socket))
    socket.on(EVENTS.TUTORIAL_START,   () => this._onTutorialStart(socket))
    socket.on(EVENTS.TUTORIAL_QUIT,    () => this._onTutorialQuit(socket))
    socket.on(EVENTS.RESTART_GAME,  ()   => this._onRestartGame(socket))
    socket.on(EVENTS.QUIT_CAMPAIGN, ()   => this._onRestartGame(socket))
    socket.on(EVENTS.HOST_ADVANCE,  ()   => this._onHostAdvance(socket))
    socket.on(EVENTS.SET_LEVEL,     data => this._onSetLevel(socket, data))
    socket.on(EVENTS.SESSION_RESET,        ()   => this._onSessionReset(socket))
    socket.on(EVENTS.KICK,                 data => this._onKick(socket, data))
    socket.on(EVENTS.BOT_ADD,              data => this._onBotAdd(socket, data))
    socket.on(EVENTS.BOT_REMOVE,           ()   => this._onBotRemove(socket))
    socket.on(EVENTS.DEBUG_SET_SKILL_TIER,    data => this._onDebugSetSkillTier(socket, data))
    socket.on(EVENTS.DEBUG_SET_PLAYER_LEVEL,    data => this._onDebugSetPlayerLevel(socket, data))
    socket.on(EVENTS.DEBUG_SET_UNLOCKED_LEVELS, data => this._onDebugSetUnlockedLevels(socket, data))
    socket.on(EVENTS.DEBUG_SPAWN_ENEMY,       data => this._onDebugSpawnEnemy(socket, data))
    socket.on(EVENTS.DEBUG_CLEAR_ENEMIES,  ()   => this._onDebugClearEnemies(socket))
    socket.on(EVENTS.DEBUG_KILL_ILLIDAN,   ()   => this._onDebugKillIllidan(socket))
    socket.on(EVENTS.QUIZ_ANSWER,  data => this._onQuizAnswer(socket, data))
    socket.on(EVENTS.QUIZ_UPGRADE, data => this._onQuizUpgrade(socket, data))
    socket.on('disconnect',         ()   => this._onDisconnect(socket))
  }

  // ── Socket event handlers ──────────────────────────────────────────────────

  // ── Handshake — fires on every controller connect ─────────────────────────

  _onHandshake(socket, data) {
    const { token } = data ?? {}

    if (!token) return // fresh player — waits for JOIN after class selection

    // Reclaim: token matches a disconnected player
    if (this.disconnectedPlayers.has(token)) {
      this._reclaimPlayer(socket, this.disconnectedPlayers.get(token))
      return
    }

    // Dual-tab guard: same token already active on a connected socket
    for (const p of this.players.values()) {
      if (p.sessionToken === token && !p.isBot) {
        socket.emit(EVENTS.FORCE_REJOIN, { reason: 'session_reset' })
        return
      }
    }

    // Token unknown (old session, post-reset) — send to name screen with message
    socket.emit(EVENTS.FORCE_REJOIN, { reason: 'session_reset' })
  }

  _reclaimPlayer(socket, player) {
    const oldId = player.id

    // Re-key stat maps so accumulated data follows the player to their new socket ID
    const rekey = (map) => {
      if (map && oldId in map) {
        map[socket.id] = (map[socket.id] ?? 0) + map[oldId]
        delete map[oldId]
      }
    }
    rekey(this.stats.damage)
    rekey(this.stats.heal)
    rekey(this.stats.deaths)
    rekey(this.stats.resurrections)
    rekey(this.levelStats.damage)
    rekey(this.levelStats.heal)
    rekey(this.levelStats.resurrections)

    player.id    = socket.id
    player.isBot = false

    this.players.set(socket.id, player)
    this.players.delete(oldId)
    this.disconnectedPlayers.delete(player.sessionToken)

    this.inputQueues.set(socket.id, [])
    this.inputQueues.delete(oldId)

    this.cooldowns.transferPlayer(oldId, socket.id)
    this.bots.delete(oldId)

    this.io.emit(EVENTS.PLAYER_LEFT, oldId)
    socket.emit(EVENTS.INIT, { ...buildFullState(this), you: buildYouPayload(player, this.cooldowns, this.scene) })
    this.io.emit(EVENTS.PLAYER_JOINED, player.toDTO())

    console.log(`[↩] reclaimed  ${player.name.padEnd(16)} socket=${socket.id}`)
  }

  _onRejoin(socket) {
    const player = this.players.get(socket.id)
    if (!player || player.isHost) return

    // Park in waiting list first so the host pill turns gray rather than vanishing.
    // WAITING_PLAYERS must land before PLAYER_LEFT so guestOrder retains the slot.
    this._waitingPlayers.set(socket.id, player.name)
    this._broadcastWaitingPlayers()

    this.disconnectedPlayers.delete(player.sessionToken)
    this.players.delete(socket.id)
    this.inputQueues.delete(socket.id)
    this.cooldowns.clearPlayer(socket.id)
    this.bots.delete(socket.id)

    this.io.emit(EVENTS.PLAYER_LEFT, socket.id)
    console.log(`[←] rejoin     ${player.name} (voluntary)`)
  }

  // ── Pre-join: player entered name, now picking class ──────────────────────

  _onPlayerWaiting(socket, data) {
    const name = (data?.name || '').slice(0, 20)
    if (!name) return
    this._waitingPlayers.set(socket.id, name)
    this._broadcastWaitingPlayers()
  }

  _broadcastWaitingPlayers() {
    const list = [...this._waitingPlayers.entries()].map(([id, name]) => ({ id, name }))
    this.io.emit(EVENTS.WAITING_PLAYERS, list)
  }

  // ── Fresh join — called after class selection ──────────────────────────────

  _onJoin(socket, data) {
    const { name, className, isHost, isBot, sessionToken } = data ?? {}

    const resolvedClass = resolveClassName(className) ?? 'Warrior'
    const { x, y } = this._randomPointNearCenter(300, 200)

    const player = new ServerPlayer({
      id:           socket.id,
      name:         (name || 'Player').slice(0, 20),
      className:    resolvedClass,
      isHost:       !!isHost,
      isBot:        !!isBot,
      sessionToken: sessionToken ?? null,
      arenaWidth:   this.arenaWidth,
      arenaHeight:  this.arenaHeight,
      x,
      y,
    })

    this.players.set(socket.id, player)
    this.inputQueues.set(socket.id, [])

    console.log(`[>] joined  ${player.name.padEnd(16)} class=${resolvedClass}${isHost ? ' (HOST)' : ''}`)

    socket.emit(EVENTS.INIT, { ...buildFullState(this), you: buildYouPayload(player, this.cooldowns, this.scene) })
    this.io.emit(EVENTS.PLAYER_JOINED, player.toDTO())

    // Broadcast waiting list AFTER player_joined so the client sees the player
    // in the joined list before they disappear from the waiting list.
    this._waitingPlayers.delete(socket.id)
    this._broadcastWaitingPlayers()
  }

  _onInputMove(socket, data) {
    if (this._cinematicSystem?.isActive()) return
    const queue = this.inputQueues.get(socket.id)
    if (!queue) return
    queue.push({ type: 'move', x: Number(data?.x) || 0, y: Number(data?.y) || 0 })
  }

  _onInputSkill(socket, data) {
    if (this._cinematicSystem?.isActive()) return
    if (this.scene === 'lobby') return
    const queue = this.inputQueues.get(socket.id)
    if (!queue) return
    queue.push({
      type:   'skill',
      index:  Number(data?.index) || 0,
      vector: data?.vector ?? { x: 1, y: 0 },
      action: data?.action ?? undefined,
    })
  }

  _onInputHighlight(socket) {
    const player = this.players.get(socket.id)
    if (!player || player.isHost) return
    this.io.emit(EVENTS.PLAYER_HIGHLIGHT, { playerId: player.id })
  }

  // ── Bot player management (dev/testing tool) ───────────────────────────────

  _onBotAdd(socket, data) {
    if (!this.players.get(socket.id)?.isHost) return
    if (this.bots.size >= 12) return

    const id = `bot-${this._botSeq++}`
    const className = resolveClassName(data?.className)
      ?? CLASS_NAMES[Math.floor(Math.random() * CLASS_NAMES.length)]

    // Fake socket — bots have no real client; emit is a no-op
    const fakeSocket = { id, emit: () => {} }

    this._onJoin(fakeSocket, { name: `Bot ${this._botSeq - 1}`, className, isHost: false, isBot: true })
    this.bots.set(id, {
      socket:           fakeSocket,
      wanderAngle:      Math.random() * Math.PI * 2,
      wanderTimer:      0,
      skillCursor:      0,
      skillTimer:       0,
      skillNextAllowed: {},
      strafeDir:        Math.random() < 0.5 ? 1 : -1,
      strafeDirTimer:   0,
    })
  }

  _onBotRemove(socket) {
    if (!this.players.get(socket.id)?.isHost) return
    for (const [id, entry] of [...this.bots]) {
      if (entry.disconnected) continue   // real disconnected players — don't remove
      this._onDisconnect(entry.socket)
      this.bots.delete(id)
    }
  }

  _onDebugSetSkillTier(socket, data) {
    if (!this.players.get(socket.id)?.isHost) return
    const { skillIndex, tier } = data ?? {}
    if (typeof skillIndex !== 'number' || skillIndex < 0 || skillIndex > 3) return
    if (typeof tier !== 'number' || tier < 0 || tier > 3) return
    this._debugOverrides.skillTiers[skillIndex] = tier
    for (const player of this.players.values()) {
      if (player.isHost) continue
      player.skillUpgrades[skillIndex] = tier
    }
  }

  _onDebugSetPlayerLevel(socket, data) {
    if (!this.players.get(socket.id)?.isHost) return
    const { level } = data ?? {}
    if (typeof level !== 'number' || level < 0 || level > 10) return
    this._debugOverrides.playerLevel = level
    for (const player of this.players.values()) {
      if (player.isHost) continue
      if (player.hpUpgrades === level) continue
      player.hpUpgrades = 0
      player.baseMaxHp  = CLASSES[player.className].hp
      player.maxHp      = player.baseMaxHp
      player.hp         = Math.min(player.hp, player.maxHp)
      for (let i = 0; i < level; i++) player.applyHpUpgrade()
    }
  }

  _onDebugSetUnlockedLevels(socket, data) {
    if (!this.players.get(socket.id)?.isHost) return
    const { count } = data ?? {}
    if (typeof count !== 'number') return
    this.unlockedLevelCount = Math.max(1, Math.min(count, CAMPAIGN.length))
  }

  _isDebugSandboxLevel(level = this.currentLevel) {
    return level?.id === DEBUG_TEST_LEVEL.id
  }

  _emitDebugResult(message, isError = false) {
    this.io.emit(EVENTS.DEBUG_ACTION_RESULT, { message, isError })
  }

  _getLevelBySelectionIndex(index) {
    return LEVEL_SELECT_OPTIONS[index] ?? CAMPAIGN[0]
  }

  _onDebugSpawnEnemy(socket, data) {
    if (!this.players.get(socket.id)?.isHost) return
    if (!this._isDebugSandboxLevel()) {
      this._emitDebugResult('Not in sandbox level', true)
      return
    }
    if (this.scene !== 'battle' && this.scene !== 'bossFight') {
      this._emitDebugResult(`Game not active (scene: ${this.scene})`, true)
      return
    }

    const enemyType = data?.enemyType
    if (!ENEMY_TYPES[enemyType]) {
      this._emitDebugResult(`Unknown enemy type: ${enemyType ?? 'none'}`, true)
      return
    }

    const playerCount = Math.max(1, [...this.players.values()].filter(p => !p.isHost).length)
    const sandboxSpawner = new SpawnSystem({
      arena: this.currentLevel?.arena,
      difficulty: this.currentLevel?.difficulty ?? {},
      spawning: { enemyTypes: [{ type: enemyType, weight: 1 }] },
    }, playerCount)
    const pos = this._randomPointNearCenter(480, 320)
    const enemy = sandboxSpawner.createEnemy(this._enemyIdSeq, enemyType, pos.x, pos.y)
    if (!enemy) {
      this._emitDebugResult(`Failed to spawn ${enemyType}`, true)
      return
    }

    this.enemies.set(enemy.id, enemy)
    this._emitDebugResult(`Spawned ${enemyType}`)
  }

  _onDebugClearEnemies(socket) {
    if (!this.players.get(socket.id)?.isHost) return
    if (!this._isDebugSandboxLevel() || (this.scene !== 'battle' && this.scene !== 'bossFight')) {
      this._emitDebugResult('Not in sandbox or game not active', true)
      return
    }

    let removed = 0
    this.enemies.forEach(enemy => {
      if (enemy.isDead) return
      enemy.isDead = true
      removed++
    })
    this._emitDebugResult(removed > 0 ? `Removed ${removed} enemies` : 'No enemies to remove')
  }

  _onDebugKillIllidan(socket) {
    if (!this.players.get(socket.id)?.isHost) return
    if (this.currentLevel?.id !== 'level_6' || this.scene !== 'bossFight') {
      this._emitDebugResult('Not on the Illidan level', true)
      return
    }
    if (this._levelCompletePending) {
      this._emitDebugResult('Closing cinematic already started')
      return
    }
    if (!this.boss) {
      this._emitDebugResult('No boss found', true)
      return
    }
    this.boss.hp     = 0
    this.boss.isDead = true
    this._onLevelComplete()
    this._emitDebugResult('Illidan killed — closing cinematic starting')
  }

  _tickBotAI() {
    this._botController.update()
  }

  // ── Campaign flow ──────────────────────────────────────────────────────────

  _onSetLevel(socket, { levelIndex, skipDialog, disableQuiz }) {
    if (!this.players.get(socket.id)?.isHost) return
    if (this.scene !== 'lobby' && this.scene !== 'trainingGrounds') return
    const idx = Math.max(0, Math.min(levelIndex ?? 0, LEVEL_SELECT_OPTIONS.length - 1))
    const level = this._getLevelBySelectionIndex(idx)
    this.startingLevelIndex = idx
    if (skipDialog !== undefined) this.skipDialog = !!skipDialog
    if (disableQuiz !== undefined) this.disableQuiz = !!disableQuiz
    this.io.emit(EVENTS.SET_LEVEL, { levelIndex: idx, levelName: level.name, skipDialog: this.skipDialog })
  }

  _onStartGame(socket) {
    if (!this.players.get(socket.id)?.isHost) return
    if (this.scene === 'staging') {
      this._changeScene('lobby')
      return
    }
    if (this.scene === 'lobby') {
      this.players.forEach(p => { if (!p.isHost) p.ready = false })
      this._changeScene('trainingGrounds')
      return
    }
  }

  _onEnterRaid(socket) {
    if (!this.players.get(socket.id)?.isHost) return
    if (this.scene !== 'trainingGrounds') return
    this._startCampaign()
  }

  _onPlayerReady(socket) {
    const player = this.players.get(socket.id)
    if (!player || player.isHost || player.isBot) return
    player.ready = true
    this.io.emit(EVENTS.PLAYER_JOINED, player.toDTO())
    console.log(`[✓] ready      ${player.name}`)
  }

  _onSessionReset(socket) {
    if (!this.players.get(socket.id)?.isHost) return

    // Broadcast FORCE_REJOIN to all non-host sockets before clearing
    for (const [socketId, player] of this.players) {
      if (!player.isHost) {
        this.io.to(socketId).emit(EVENTS.FORCE_REJOIN, { reason: 'session_reset' })
      }
    }

    // Remove all non-host players
    for (const [socketId, player] of [...this.players]) {
      if (player.isHost) continue
      this.players.delete(socketId)
      this.inputQueues.delete(socketId)
      this.cooldowns.clearPlayer(socketId)
      this.bots.delete(socketId)
      this.io.emit(EVENTS.PLAYER_LEFT, socketId)
    }
    this.disconnectedPlayers.clear()
    this._waitingPlayers.clear()
    this._broadcastWaitingPlayers()

    this.unlockedLevelCount = 1
    this._levelZoneState    = null

    this.scene = 'staging'
    this.io.to(socket.id).emit(EVENTS.SCENE_CHANGE, { scene: 'menu' })
    console.log(`[!] session reset — returning host to menu`)
  }

  _onKick(hostSocket, data) {
    if (!this.players.get(hostSocket.id)?.isHost) return
    const { playerId } = data ?? {}
    const target = this.players.get(playerId)
    if (!target || target.isHost) return

    this.io.to(playerId).emit(EVENTS.FORCE_REJOIN, { reason: 'kicked_by_host' })
    this.players.delete(playerId)
    this.disconnectedPlayers.delete(target.sessionToken)
    this.inputQueues.delete(playerId)
    this.cooldowns.clearPlayer(playerId)
    this.bots.delete(playerId)
    this.io.emit(EVENTS.PLAYER_LEFT, playerId)
    console.log(`[✕] kicked     ${target.name}`)
  }

  _onRestartGame(socket) {
    if (!this.players.get(socket.id)?.isHost) return

    this.startingLevelIndex = 0
    this.skipDialog = false

    this._setArenaSize(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)

    // Reset all players to full HP / alive
    this.players.forEach(p => {
      if (!p.isHost) {
        p.hpUpgrades    = 0
        p.baseMaxHp     = CLASSES[p.className].hp
        p.maxHp         = p.baseMaxHp
        p.skillUpgrades = [0, 0, 0, 0]
        // Re-apply debug overrides so they're visible in training grounds immediately
        const { playerLevel, skillTiers } = this._debugOverrides
        if (playerLevel > 0) {
          for (let i = 0; i < playerLevel; i++) p.applyHpUpgrade()
        }
        if (skillTiers.some(t => t > 0)) {
          for (let i = 0; i < 4; i++) p.skillUpgrades[i] = skillTiers[i]
        }
        p.hp          = p.maxHp
        p.isDowned      = false
        p.activeCast  = null
        p.shieldActive      = false
        p.shieldExpiresAt   = null
        p.shieldChargeStart = null
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
    this._usedQuestionIds.clear()
    this._changeScene('trainingGrounds')
    this.io.emit(EVENTS.SET_LEVEL, { levelIndex: 0, levelName: LEVEL_SELECT_OPTIONS[0].name, skipDialog: false })
  }

  _onHostAdvance(socket) {
    if (!this.players.get(socket.id)?.isHost) return

    if (this.scene === 'quiz' && this._quizPhase === 'done') {
      this._quizPhase    = null
      this._quizQuestion = null
      if (this._preLevelQuizQueue > 0) {
        this._preLevelQuizQueue--
        if (this._preLevelQuizQueue > 0) {
          this._startPreLevelQuiz()
        } else {
          this._startLevel(this._preLevelTargetIndex)
        }
      } else {
        this._showLevelComplete()
      }
      return
    }

    if (this.scene !== 'levelComplete') return

    const nextIndex = this.currentLevelIndex + 1
    if (nextIndex >= CAMPAIGN.length) {
      const snapshot = this._buildPlayerSnapshot()
      this._changeScene('result', { cumulativeStats: { ...this.stats, playerSnapshot: snapshot } })
    } else {
      this._startLevel(nextIndex)
    }
  }

  _startCampaign() {
    this.stats     = { damage: {}, heal: {}, deaths: {}, resurrections: {}, quiz: {}, kills: 0, startTime: Date.now() }
    this.levelStats = { damage: {}, heal: {}, resurrections: {}, kills: 0, startTime: Date.now() }
    this._clearCombatState()

    // Always reset HP and upgrades to class baseline at campaign start
    this.players.forEach(p => {
      if (p.isHost) return
      p.hpUpgrades    = 0
      p.baseMaxHp     = CLASSES[p.className].hp
      p.maxHp         = p.baseMaxHp
      p.skillUpgrades = [0, 0, 0, 0]
    })

    const selected = this._getLevelBySelectionIndex(this.startingLevelIndex ?? 0)
    if (selected.id === DEBUG_TEST_LEVEL.id) {
      this._startLevel(selected)
      return
    }

    const startIdx = this.startingLevelIndex ?? 0
    if (startIdx > 0 && !this.disableQuiz) {
      this._preLevelQuizQueue   = startIdx
      this._preLevelTargetIndex = startIdx
      this._startPreLevelQuiz()
    } else {
      this._startLevel(startIdx)
    }
  }

  _startLevel(indexOrLevel) {
    const level = typeof indexOrLevel === 'number' ? CAMPAIGN[indexOrLevel] : indexOrLevel
    if (!level) return

    const campaignIndex = typeof indexOrLevel === 'number' ? indexOrLevel : -1
    const totalLevels = campaignIndex >= 0 ? CAMPAIGN.length : 1
    const levelNumber = campaignIndex >= 0 ? campaignIndex + 1 : null

    this.currentLevelIndex = campaignIndex
    this.currentLevel      = level
    this.levelStats = { damage: {}, heal: {}, resurrections: {}, kills: 0, startTime: Date.now() }
    this._setArenaSize(level.arena?.width ?? GAME_CONFIG.CANVAS_WIDTH, level.arena?.height ?? GAME_CONFIG.CANVAS_HEIGHT)
    this._wallSegments = buildWallSegments(level.arena)

    // Reset combat state between levels
    this._clearCombatState()
    this._resetPlayerInputs()

    // Reset all non-host players to full HP and scatter them
    // If rooms are defined, spawn in the first (left) room; otherwise near centre.
    const firstRoom = level.arena?.rooms?.[0]
    this.players.forEach(p => {
      if (p.isHost) return
      // Re-apply persistent debug overrides (survive deaths/restarts — host sets once, plays many times)
      const { playerLevel, skillTiers } = this._debugOverrides
      if (playerLevel > 0 && playerLevel !== p.hpUpgrades) {
        p.hpUpgrades = 0
        p.baseMaxHp  = CLASSES[p.className].hp
        p.maxHp      = p.baseMaxHp
        for (let i = 0; i < playerLevel; i++) p.applyHpUpgrade()
      }
      if (skillTiers.some(t => t > 0)) {
        for (let i = 0; i < 4; i++) p.skillUpgrades[i] = skillTiers[i]
      }
      p.hp              = p.maxHp   // full HP — set AFTER overrides so upgraded maxHp is used
      p.isDowned          = false
      p.activeCast      = null
      p.shieldActive      = false
      p.shieldExpiresAt   = null
      p.shieldChargeStart = null
      p.activeEffects   = []
      p.bladestormActive  = false
      p.hammerSwingCount  = 0
      p.rebuildStats()
      p.setArenaSize(this.arenaWidth, this.arenaHeight)
      // Walk-in system sets positions — handled after this forEach
    })

    // Compute player count for difficulty scaling
    let playerCount = 0
    this.players.forEach(p => { if (!p.isHost) playerCount++ })

    // Walk-in cinematic — spawn players off-screen left, walk them into the arena
    const walkInMs = level.transition?.opening?.walkInMs ?? 0
    if (walkInMs > 0 && !this.skipDialog) {
      const targets = CinematicMovementSystem.buildWalkInTargets(this.players, this.arenaWidth, this.arenaHeight)
      this._cinematicSystem = new CinematicMovementSystem({
        targets,
        durationMs: walkInMs,
        onComplete: () => this._onWalkInComplete(level, playerCount),
      })
    } else {
      this._placePlayersInFormation()
    }

    const diff = level.difficulty ?? {}
    const hpMult     = (diff.hpMult?.base ?? 1)     + (diff.hpMult?.perPlayer ?? 0)     * (playerCount - 1)
    const damageMult = (diff.damageMult?.base ?? 1) + (diff.damageMult?.perPlayer ?? 0) * (playerCount - 1)

    // Set up spawn system if level has spawning.
    // If walk-in is active, defer to _onWalkInComplete so enemies don't appear before players arrive.
    if (level.spawning) {
      const deferToWalkIn = walkInMs > 0 && !this.skipDialog
      if (!deferToWalkIn) {
        const spawnDelay = level.transition?.opening?.enemySpawnDelayMs ?? 0
        if (spawnDelay > 0) {
          this._spawnSystemTimer = setTimeout(() => {
            if (this.currentLevel === level) this.spawnSystem = new SpawnSystem(level, playerCount)
            this._spawnSystemTimer = null
          }, spawnDelay)
        } else {
          this.spawnSystem = new SpawnSystem(level, playerCount)
        }
      }
      // else: _onWalkInComplete() creates the SpawnSystem after players have entered
    }

    // Set up boss if level has one
    if (level.boss) {
      this.boss = new ServerBoss(level.boss, { hpMult, damageMult, arenaWidth: this.arenaWidth, arenaHeight: this.arenaHeight })
      // Custom boss spawn position
      if (level.bossSpawnPosition) {
        this.boss.x = level.bossSpawnPosition.x
        this.boss.y = level.bossSpawnPosition.y
      }
      if (level.bossInitialAngle != null) {
        this.boss.angle = level.bossInitialAngle
      }
    }

    // Set up gates (Level 2)
    if (level.gates?.length) {
      for (const gateCfg of level.gates) {
        this.gates.set(gateCfg.id, new ServerGate(gateCfg, hpMult))
      }
      this._activeGateIndex = 0
      this._activateNextGate()
    }

    // Set up buildings (The Siege)
    if (level.buildings?.length) {
      for (const bCfg of level.buildings) {
        this.buildings.set(bCfg.id, new ServerBuilding(bCfg, hpMult))
      }
      if (level.buildingSpawning) {
        this.buildingSpawnSystem = new BuildingSpawnSystem(
          level.buildingSpawning, diff, playerCount,
          this.arenaWidth, this.arenaHeight
        )
      }
      // Portal beam mechanic (The Siege)
      if (level.beamMechanic && level.mirrors?.length) {
        this.portalBeamSystem = new PortalBeamSystem(
          level.beamMechanic, level.mirrors,
          this.arenaWidth, this.arenaHeight
        )
      }
    }

    // Boulder rolling mechanic (The Black Temple Gates)
    if (level.boulderMechanic) {
      this._boulderSystem = new BoulderSystem(level.boulderMechanic, this.arenaHeight)
    }

    // Set up NPCs (Level 4 — Akama)
    if (level.npcs?.length) {
      for (const npcCfg of level.npcs) {
        const npc = new ServerNPC(npcCfg)
        npc.setArenaSize(this.arenaWidth, this.arenaHeight)
        // Scale NPC HP with difficulty
        npc.hp    = Math.round(npc.hp * hpMult)
        npc.maxHp = npc.hp
        this.npcs.set(npc.id, npc)
      }
    }

    // Set up warlocks (Level 4 — 6 channelers around the boss)
    this._bossPhase = 1
    this._warlockCount = 0
    this._lastWarlockBuffVfxTime = 0
    if (level.warlocks && this.boss) {
      const wCfg = level.warlocks
      const count = wCfg.count ?? 6
      const circleR = wCfg.circleRadius ?? 120
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        const wx = this.boss.x + Math.cos(angle) * circleR
        const wy = this.boss.y + Math.sin(angle) * circleR
        const base = ENEMY_TYPES.warlock
        const warlockHp = wCfg.hp != null ? Math.round(wCfg.hp * hpMult) : Math.round(base.hp * hpMult)
        const id = ++this._enemyIdSeq.value
        const warlock = new ServerEnemy({
          id,
          x: wx,
          y: wy,
          type: 'warlock',
          renderType: 'ritualChanneler',
          forcedAnimation: 'channel',
          hp: warlockHp,
          maxHp: warlockHp,
          speed: base.speed,
          radius: base.radius,
          meleeDamage: base.meleeDamage,
        })
        warlock.setArenaSize(this.arenaWidth, this.arenaHeight)
        warlock._channelTarget = this.boss.id
        warlock._facingAngle = angle + Math.PI  // face toward boss (inward)
        // Channelers are immune during the opening dialog so the cinematic plays uninterrupted
        if (level.dialog?.length && !this.skipDialog) warlock.isImmune = true
        this.enemies.set(id, warlock)
        this._warlockCount++
      }
      // Boss starts immune in phase 1
      this.boss.isImmune = true
    }

    // Spawn initial enemies (e.g. Leviathan in Level 4).
    // When walk-in is active, defer to _onWalkInComplete so the enemy doesn't appear
    // before players arrive. The opening config may also add an extra delay via
    // initialEnemyDelayMs applied on top of the walk-in.
    const deferInitialEnemies = walkInMs > 0 && !this.skipDialog
    if (level.initialEnemies?.length && !deferInitialEnemies) {
      this._spawnInitialEnemies(level, hpMult, damageMult)
    }

    // Illidan encounter setup (Level 6)
    if (level.boss === 'ILLIDAN' && this.boss) {
      this._illidanEncounter = new IllidanEncounter({
        boss:        this.boss,
        io:          this.io,
        players:     this.players,
        enemies:     this.enemies,
        skillSystem: this.skillSystem,
        stats:       this.stats,
        enemyIdSeq:  this._enemyIdSeq,
        arenaWidth:  this.arenaWidth,
        arenaHeight: this.arenaHeight,
        difficulty:  level.difficulty ?? {},
      })
      // Illidan's minionSpawning is null — phase-scripted adds (Flames, Shadow Demons) are
      // spawned programmatically by IllidanEncounter and never go through minionSpawnSystem.
    }

    // Entrance cinematic for any boss level with a dialog array.
    // Applies to both Shade of Akama (Level 5) and Illidan (Level 6).
    if (level.boss && level.dialog?.length && !this.skipDialog && this.boss) {
      // Ensure boss is immune during the cinematic.
      // For Shade: warlocks block above already set isImmune = true; this is a no-op.
      // For Illidan: sets immunity so he stands still during the intro.
      this.boss.isImmune = true
      this._dialogSystem = new DialogSystem({
        lines: level.dialog,
        onComplete: () => {
          this._dialogSystem = null
          // If this level has warlocks, immunity is held until all warlocks die — don't release it here.
          // For boss levels without warlocks (Illidan included), dialog end = boss becomes vulnerable.
          if (this.boss && !level.warlocks) this.boss.isImmune = false
          // Lift channeler immunity now that the cinematic is over (Level 5)
          if (level.warlocks) {
            this.enemies.forEach(e => { if (e.type === 'warlock') e.isImmune = false })
          }
          // Activate ambient minion spawning now that dialog is done (used by Shade Phase 2).
          // Illidan's minionSpawning is null so this is a safe no-op for Level 6.
          if (level.minionSpawning && !this.minionSpawnSystem) {
            this.minionSpawnSystem = new SpawnSystem(
              { spawning: level.minionSpawning, difficulty: level.difficulty ?? {}, arena: level.arena },
              playerCount
            )
          }
        },
      })
      // Dialog start is deferred to _onWalkInComplete (fires after players walk in).
      // If walk-in is skipped (skipDialog=true or no walkInMs), start dialog after fadeInMs as before.
      if (walkInMs === 0 || this.skipDialog) {
        const fadeInMs = level.transition?.opening?.fadeInMs ?? 0
        setTimeout(() => {
          if (this._dialogSystem) this._dialogSystem.start((event, data) => this.io.emit(event, data))
        }, fadeInMs)
      }
      // else: _onWalkInComplete() calls dialogSystem.start() directly
    } else if (level.boss && level.minionSpawning && !this.minionSpawnSystem) {
      // No dialog (skipDialog=true or no dialog array) — activate minion spawning immediately.
      this.minionSpawnSystem = new SpawnSystem(
        { spawning: level.minionSpawning, difficulty: level.difficulty ?? {}, arena: level.arena },
        playerCount
      )
    }

    // Init objective progress
    this._levelStartTime = Date.now()
    this._initObjectiveProgress()

    console.log(`[~] ${level.debugSandbox ? 'Debug Sandbox' : `Level ${campaignIndex + 1}/${CAMPAIGN.length}`}: ${level.name}`)

    // Determine scene type for the renderer
    const scene = level.boss ? 'bossFight' : 'battle'
      this._changeScene(scene, {
      levelId:     level.id,
      levelIndex:  campaignIndex,
      levelNumber,
      totalLevels,
      levelName:   level.name,
      arenaWidth:  this.arenaWidth,
      arenaHeight: this.arenaHeight,
      objectives:  this.objectiveProgress,
      gates:       gatesDTO(this),
      buildings:   buildingsDTO(this),
      npcs:        npcsDTO(this),
      rooms:        level.arena?.rooms ?? [],
      passages:     level.arena?.passages ?? [],
      mirrors:      level.mirrors ?? [],
      debugSandbox: !!level.debugSandbox,
      transition:   level.transition ?? null,
      visualBounds: level.visualBounds ?? null,
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
        case 'surviveWaves':
          return { ...obj, current: 0, target: this.spawnSystem?.waveCount ?? 0 }
        case 'destroyGates':
          return { ...obj, current: 0, target: this.gates.size }
        case 'destroyBuildings':
          return { ...obj, current: 0, target: this.buildings.size }
        case 'killAll':
          return { ...obj, current: 0, target: 1 }
        case 'killBossProtectNPC':
          return { ...obj, current: 0, target: 1, npcId: obj.npcId, bossId: obj.bossId }
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
    this.npcs.clear()
    this.gates.clear()
    this._activeGateIndex = 0
    this.buildings.clear()
    this.buildingSpawnSystem = null
    this.portalBeamSystem    = null
    this._boulderSystem      = null
    this._bossPhase    = 1
    this._warlockCount = 0
    this._lastWarlockBuffVfxTime = 0
    this._lastSpawn    = 0
    this.spawnSystem   = null
    this.skillSystem.activeZones    = []
    this.skillSystem._pendingBursts = []

    this._pylons.clear()
    this._pylonIdSeq     = 0
    this._pylonNextSpawn = null

    // Encounter systems
    this.minionSpawnSystem = null
    this._illidanEncounter = null
    if (this._closingCinematic) { this._closingCinematic.destroy(); this._closingCinematic = null }
    if (this._dialogSystem)   { this._dialogSystem.destroy();   this._dialogSystem   = null }
    if (this._cinematicSystem){ this._cinematicSystem.destroy(); this._cinematicSystem = null }

    // Transition state
    if (this._spawnSystemTimer) { clearTimeout(this._spawnSystemTimer); this._spawnSystemTimer = null }
    if (this._closingRunner)    { this._closingRunner.abort(); this._closingRunner = null }
    this._levelCompletePending = false
    this._initialEnemiesReady  = false
  }

  _resetPlayerInputs() {
    this.players.forEach(p => {
      if (p.isHost) return
      p.setMoveInput(0, 0)
      p.activeCast        = null
      p.shieldActive      = false
      p.shieldExpiresAt   = null
      p.shieldChargeStart = null
    })

    this.inputQueues.forEach(queue => {
      queue.length = 0
    })
  }

  _onDisconnect(socket) {
    if (this._waitingPlayers.delete(socket.id)) {
      this._broadcastWaitingPlayers()
    }
    const player = this.players.get(socket.id)
    console.log(`[-] disconnect  ${player?.name ?? socket.id}`)

    if (!player || player.isHost) {
      this.players.delete(socket.id)
      this.inputQueues.delete(socket.id)
      return
    }

    if (player.isBot) {
      // Pure testing bot — clean up fully, no reconnect slot needed
      this.players.delete(socket.id)
      this.inputQueues.delete(socket.id)
      this.cooldowns.clearPlayer(socket.id)
      this.bots.delete(socket.id)
      this.io.emit(EVENTS.PLAYER_LEFT, socket.id)
      return
    }

    // Real player: park in disconnectedPlayers for reconnect window
    if (player.sessionToken) {
      this.disconnectedPlayers.set(player.sessionToken, player)
    }

    if (this.scene === 'battle' || this.scene === 'bossFight') {
      // Bot-ify immediately during active combat so the character keeps fighting
      player.isBot = true
      this.bots.set(socket.id, {
        socket:           { id: socket.id, emit: () => {} },
        wanderAngle:      Math.random() * Math.PI * 2,
        wanderTimer:      0,
        skillCursor:      0,
        skillTimer:       0,
        skillNextAllowed: {},
        strafeDir:        Math.random() < 0.5 ? 1 : -1,
        strafeDirTimer:   0,
        disconnected:     true,
      })
      console.log(`[↩] bot-ified   ${player.name} (reclaim via HANDSHAKE)`)
      return
    }

    // Non-battle disconnect: remove from active simulation
    this.players.delete(socket.id)
    this.inputQueues.delete(socket.id)
    this.minions.forEach((m, id) => { if (m.ownerId === socket.id) this.minions.delete(id) })
    this.io.emit(EVENTS.PLAYER_LEFT, socket.id)

    if (this.scene === 'quiz') {
      const participants = this._getQuizParticipants()
      if (this._quizPhase === 'answering') {
        if (participants.length === 0 || this._quizAnswers.size >= participants.length) {
          this._resolveQuiz()
        }
      } else if (this._quizPhase === 'upgrading') {
        this._quizUpgradesDone.add(socket.id)
        if (participants.length === 0 || this._quizUpgradesDone.size >= participants.length) {
          this._finishQuiz()
        }
      }
    }
  }

  // ── Scene management ───────────────────────────────────────────────────────

  _buildPlayerSnapshot() {
    const snapshot = []
    this.players.forEach(p => {
      if (p.isHost) return
      snapshot.push({ id: p.id, name: p.name, className: p.className, isDowned: p.isDowned })
    })
    return snapshot
  }

  _changeScene(name, extra = {}) {
    const prevScene = this.scene
    this._resetPlayerInputs()

    if (this.scene === 'trainingGrounds' && name !== 'trainingGrounds') {
      this._levelZoneState  = null
      this._zoneCountdownMs = 4000
    }

    if (name === 'lobby' || name === 'trainingGrounds') {
      this._setArenaSize(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)
      this._wallSegments = []
    }

    this.scene = name
    console.log(`[~] scene → ${name}`)
    // Training Grounds portals render 30px above the arena top — add visual buffer so
    // the fit-scale calculation leaves room for them on narrow-height screens.
    const _tgBounds = name === 'trainingGrounds'
      ? { visualBounds: { height: GAME_CONFIG.CANVAS_HEIGHT + 100 } }
      : {}
    this.io.emit(EVENTS.SCENE_CHANGE, {
      scene: name,
      levelId: this.currentLevel?.id ?? null,
      arenaWidth: this.arenaWidth,
      arenaHeight: this.arenaHeight,
      ..._tgBounds,
      ...extra,
    })

    // Clean up on return to lobby
    if (name === 'lobby') {
      this.enemies.clear()
      this.projectiles.clear()
      this.boss = null
      this.reviveTimers.clear()
      this.minions.clear()
      this.npcs.clear()
      this.gates.clear()
      this._activeGateIndex = 0
      this.buildings.clear()
      this.buildingSpawnSystem = null
      this._bossPhase    = 1
      this._warlockCount = 0
      this._lastWarlockBuffVfxTime = 0
      this._pylons.clear()
      this._pylonIdSeq     = 0
      this._pylonNextSpawn = null
      this.currentLevelIndex = -1
      this.currentLevel      = null
      this.spawnSystem       = null
    }

    if (name === 'trainingGrounds') {
      this.enemies.clear()
      this.projectiles.clear()
      this.boss = null
      this._spawnTrainingDummy()
    }

    if (prevScene === 'trainingGrounds' && name !== 'trainingGrounds') {
      this._tutorialActive = false
      this._tutorialPhase = 0
      this._tutorialPhaseDone.clear()
      this._tutorialAbilityUses.clear()
      this._tutorialEndScheduled = false
    }

  }

  _spawnTrainingDummy() {
    const W = this.arenaWidth
    const H = this.arenaHeight
    const Y = H * 0.82   // bottom-aligned row

    const idle   = new TrainingDummy({ id: 'training-dummy', x: W * 0.5,  y: Y })
    const ranged = new RangedDummy(  { id: 'ranged-dummy',   x: W * 0.25, y: Y })
    const melee  = new MeleeDummy(   { id: 'melee-dummy',    x: W * 0.75, y: Y })

    ;[idle, ranged, melee].forEach(dummy => dummy.setArenaSize(this.arenaWidth, this.arenaHeight))

    this.enemies.set('training-dummy', idle)
    this.enemies.set('ranged-dummy', ranged)
    this.enemies.set('melee-dummy', melee)
  }

  _setArenaSize(width, height) {
    this.arenaWidth = width
    this.arenaHeight = height
    this.players.forEach(p => p.setArenaSize(width, height))
  }

  // ── Tutorial ───────────────────────────────────────────────────────────────

  _onTutorialStart(socket) {
    if (!this.players.get(socket.id)?.isHost) return
    if (this.scene !== 'trainingGrounds' && this.scene !== 'lobby') return
    if (this._tutorialActive) return

    if (this.scene === 'lobby') {
      this.players.forEach(p => { if (!p.isHost) p.ready = false })
      this._changeScene('trainingGrounds')
    }

    this._tutorialActive = true
    this._tutorialPhase = 1
    this._tutorialPhaseDone.clear()
    this._tutorialAbilityUses.clear()
    this._tutorialEndScheduled = false
    this._tutorialLastCooldownReset = Date.now()
    this._tutorialResetAllCooldowns()
    this._tutorialBroadcastState()
  }

  _onTutorialQuit(socket) {
    if (socket && !this.players.get(socket.id)?.isHost) return
    this._tutorialEnd()
  }

  _tutorialEnd() {
    if (!this._tutorialActive) return
    this._tutorialActive = false
    this._tutorialPhase = 0
    this._tutorialPhaseDone.clear()
    this._tutorialAbilityUses.clear()
    this._tutorialEndScheduled = false
    this._tutorialBroadcastState()
  }

  _tutorialGetEnabledSkills(phase) {
    if (phase === 0) return [0, 1, 2, 3]
    if (phase === 1) return []
    return [phase - 2]
  }

  _tutorialBroadcastState() {
    const phaseNames = ['', 'Movement', 'Ability 1', 'Ability 2', 'Ability 3', 'Ability 4']
    const nonHostPlayers = [...this.players.values()].filter(p => !p.isHost && !p.isBot)
    const totalCount = nonHostPlayers.length

    const playerProgress = {}
    nonHostPlayers.forEach(p => {
      playerProgress[p.id] = {
        name:      p.name,
        className: p.className,
        completed: this._tutorialPhaseDone.has(p.id),
        count:     this._tutorialPhase >= 2 ? (this._tutorialAbilityUses.get(p.id) ?? 0) : undefined,
      }
    })

    this.io.emit(EVENTS.TUTORIAL_STATE, {
      active:         this._tutorialActive,
      phase:          this._tutorialPhase,
      phaseName:      phaseNames[this._tutorialPhase] ?? '',
      completedCount: this._tutorialPhaseDone.size,
      totalCount,
      enabledSkills:  this._tutorialGetEnabledSkills(this._tutorialPhase),
      playerProgress,
      allComplete:    this._tutorialEndScheduled,
    })
  }

  _tutorialRecordAbilityUse(player, skillIndex) {
    if (!this._tutorialActive || this._tutorialPhase < 2 || player.isHost) return
    const expectedIdx = this._tutorialPhase - 2
    if (skillIndex !== expectedIdx) return
    if (this._tutorialPhaseDone.has(player.id)) return

    const count = (this._tutorialAbilityUses.get(player.id) ?? 0) + 1
    this._tutorialAbilityUses.set(player.id, count)
    this._tutorialBroadcastState()

    if (count >= 3) {
      this._tutorialPhaseDone.add(player.id)
      this._tutorialBroadcastState()
      this._tutorialCheckPhaseComplete()
    }
  }

  _tutorialCheckPhaseComplete() {
    const nonHostCount = [...this.players.values()].filter(p => !p.isHost && !p.isBot).length
    if (nonHostCount === 0) return
    if (this._tutorialPhaseDone.size >= nonHostCount) {
      this._tutorialAdvanceOrEnd()
    }
  }

  _tutorialAdvanceOrEnd() {
    if (this._tutorialEndScheduled) return
    if (this._tutorialPhase >= 5) {
      this._tutorialEndScheduled = true
      this._tutorialBroadcastState()
      setTimeout(() => this._tutorialEnd(), 2000)
      return
    }
    this._tutorialPhase++
    this._tutorialPhaseDone.clear()
    this._tutorialAbilityUses.clear()
    this._tutorialBroadcastState()
  }

  _tutorialResetAllCooldowns() {
    this.players.forEach(p => {
      if (p.isHost || p.isDead) return
      this.cooldowns.clearPlayer(p.id)
      for (let i = 0; i < 4; i++) {
        this.io.emit(EVENTS.COOLDOWN, { playerId: p.id, skillIndex: i, durationMs: 0 })
      }
    })
  }

  /** Returns true if the gate with the given id has been destroyed. */
  _isGateDead(gateId) {
    const gate = this.gates.get(gateId)
    return gate ? gate.isDead : true   // unknown gate → treat as open
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
      scene:        this.scene,
      arenaWidth:   this.arenaWidth,
      arenaHeight:  this.arenaHeight,
      players:      this.players,
      projectiles:  this.projectiles,
      enemies:      this.enemies,
      boss:         this.boss,
      gates:        this.gates,
      buildings:    this.buildings,
      npcs:         this.npcs,
      stats:        this.stats,
      levelStats:   this.levelStats,
      io:           this.io,
      cooldowns:    this.cooldowns,
      minions:      this.minions,
      nextMinionId: () => ++this._minionIdSeq,
      wallSegments: this._wallSegments,
      isGateDead:   (id) => this._isGateDead(id),
    }
  }

  // ── Tick loop ──────────────────────────────────────────────────────────────

  _gameTick() {
    if (this.scene === 'staging') return
    try {
    const now = Date.now()
    const dt  = Math.min((now - this.lastTick) / 1000, 0.1)
    this.lastTick = now
    this.tick++

    // 0. Bot AI — populate input queues before the drain
    this._tickBotAI()

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

      if (lastMove && !this._cinematicSystem?.isActive()) {
        player.setMoveInput(lastMove.x, lastMove.y)
        if (this._tutorialActive && this._tutorialPhase === 1 && !player.isHost && !this._tutorialPhaseDone.has(player.id)) {
          const mag = Math.hypot(lastMove.x, lastMove.y)
          if (mag > 0.1) {
            this._tutorialPhaseDone.add(player.id)
            this._tutorialBroadcastState()
            this._tutorialCheckPhaseComplete()
          }
        }
      }
      queue.length = 0
    })

    // 2. Update players
    this.players.forEach(p => p.update(dt))

    // 2a. Auto-expire latched shields
    this.players.forEach(p => {
      if (p.shieldExpiresAt != null && now >= p.shieldExpiresAt) {
        const skillIndex = p.shieldSkillIndex
        p.shieldActive      = false
        p.shieldSkillIndex  = -1
        p.shieldExpiresAt   = null
        p.shieldChargeStart = null
        if (skillIndex >= 0) {
          const config = p.getSkillConfig(skillIndex)
          const effectiveCooldown = config
            ? Math.round(config.cooldown / (p.fireRateMult ?? 1))
            : 3000
          this.cooldowns.start(p.id, skillIndex, effectiveCooldown)
          this.io.emit(EVENTS.COOLDOWN, { playerId: p.id, skillIndex, durationMs: effectiveCooldown })
        }
      }
    })

    // 2b. Wall collision for players (includes downed players who can now crawl)
    if (this._wallSegments.length > 0) {
      const isGateDead = (id) => this._isGateDead(id)
      this.players.forEach(p => {
        if (p.isHost) return
        const resolved = resolveWallCollision(p.x, p.y, GAME_CONFIG.PLAYER_RADIUS_X, this._wallSegments, isGateDead)
        p.x = resolved.x
        p.y = resolved.y
      })
    }

    // 2c. Cinematic movement — runs after p.update() and wall collision so lerp positions win
    if (this._cinematicSystem) this._cinematicSystem.tick(dt)

    // 3. Scene-specific logic
    if (this.scene === 'lobby' || this.scene === 'trainingGrounds') {
      const gs = this._gs()
      this.skillSystem.tick(gs, dt)
      this.enemies.forEach(dummy => dummy.update(dt, this.players, gs))

      if (this._tutorialActive && now - this._tutorialLastCooldownReset > 3000) {
        this._tutorialLastCooldownReset = now
        this._tutorialResetAllCooldowns()
      }

      if (this.scene === 'trainingGrounds' && !this._tutorialActive) {
        this._tickZoneSelector(dt)
      }
    }

    if (this.scene === 'battle' || this.scene === 'bossFight') {
      const gs = this._gs()
      this.skillSystem.tick(gs, dt)

      // Spawn enemies from SpawnSystem
      if (this.spawnSystem) {
        // Repairer-type enemies (ritualChanneler) only spawn when a gate is actually damaged
        if (this.gates?.size) {
          const anyGateDamaged = [...this.gates.values()].some(g => !g.isDead && g.hp < g.maxHp)
          if (anyGateDamaged) {
            this.spawnSystem.excludeTypes.delete('ritualChanneler')
          } else {
            this.spawnSystem.excludeTypes.add('ritualChanneler')
          }
        }

        // For gate-based spawning, offset spawn point to the left of the gate
        // (players advance from the left, enemies defend the gate from the player side)
        let spawnPos = null
        if (this.currentLevel?.spawning?.spawnNearActiveGate) {
          const gate = this._getActiveGate()
          if (gate) {
            const offsetX = gate.passageId ? -((gate.width ?? 40) / 2 + 60) : 0
            spawnPos = { x: gate.x + offsetX, y: gate.y }
          }
        }
        const spawned = this.spawnSystem.tick(now, this.enemies, this._enemyIdSeq, spawnPos)
        for (const e of spawned) {
          this.enemies.set(e.id, e)
        }
      }

      // Spawn enemies from BuildingSpawnSystem
      if (this.buildingSpawnSystem) {
        const bSpawned = this.buildingSpawnSystem.tick(now, this.buildings, this.enemies, this._enemyIdSeq)
        for (const e of bSpawned) this.enemies.set(e.id, e)
      }

      // Spawn ambient minions (Level 5 — activated after dialog)
      if (this.minionSpawnSystem) {
        const mSpawned = this.minionSpawnSystem.tick(now, this.enemies, this._enemyIdSeq, null)
        for (const e of mSpawned) this.enemies.set(e.id, e)
      }

      // Portal beam mechanic (Level 2 — The Siege)
      if (this.portalBeamSystem) {
        const gs = this._gs()
        this.portalBeamSystem.tick(
          now,
          this.buildings,
          this.players,
          (event, data) => this.io.emit(event, data),
          (player, dmg) => this.skillSystem._dealDamage(gs, null, player, dmg, 'Portal Beam')
        )
      }

      // Boulder mechanic (Level 3 — The Black Temple Gates)
      if (this._boulderSystem) {
        const gs = this._gs()
        this._boulderSystem.tick(
          now,
          this.players,
          (event, data) => this.io.emit(event, data),
          (player, dmg) => this.skillSystem._dealDamage(gs, null, player, dmg, 'Boulder'),
          (player, slowMult, durationMs) => {
            player.activeEffects.push({ source: 'boulder:slow', params: { speedMultiplier: slowMult }, expiresAt: now + durationMs })
            player.rebuildStats()
          }
        )
      }

      // Update enemies (AI + contact damage + split-on-death)
      this._updateEnemies(dt, now)

      // Update boss (skipped while closing cinematic is running)
      if (this.boss && !this._closingCinematic) {
        this._updateBoss(dt, now)
      }

      // Tick closing cinematic (replaces boss + objective updates for Level 6 end-sequence)
      if (this._closingCinematic) {
        this._closingCinematic.tick(dt, now)
      }

      // Update NPCs (Akama attacks boss)
      if (this.npcs.size > 0) {
        this._updateNPCs(dt, now)
      }

      // Update healing pylons (Level 5 Phase 2)
      if (this._pylonNextSpawn !== null || this._pylons.size > 0) {
        this._updatePylons(dt, now)
      }

      // Update gates (check destruction, advance sequence)
      if (this.gates.size > 0) {
        this._updateGates()
      }

      // Log building destruction
      if (this.buildings.size > 0) {
        this.buildings.forEach(b => {
          if (b.isDead && b.isActive) {
            b.isActive = false
            console.log(`[~] Building ${b.id} destroyed`)
          }
        })
      }

      this._checkRevive(now)
      if (!this._closingCinematic) {
        this._updateObjectives(now)
        this._checkAllDead()
      }
    }

    // 4. Broadcast delta state
    this.io.emit(EVENTS.STATE_DELTA, buildDeltaState(this))
    } catch (err) {
      console.error('[GameTick ERROR]', err)
    }
  }

  // ── Skill processing ────────────────────────────────────────────────────────

  _processSkillInput(player, input) {
    if (player.isDowned) return
    if (this._cinematicSystem?.isActive()) return
    if (this.scene !== 'lobby' && this.scene !== 'trainingGrounds' && this.scene !== 'battle' && this.scene !== 'bossFight') return

    const { index, vector, action } = input
    const config = player.getSkillConfig(index)
    if (!config) return

    if (this._tutorialActive) {
      const allowed = this._tutorialGetEnabledSkills(this._tutorialPhase)
      if (!allowed.includes(index)) return
    }

    // Bladestorm suppresses Shield Block only — other skills remain usable
    if (player.bladestormActive && config.type === 'SHIELD') return

    // Stealth break / shadow strike handling on ability use
    if (player.isInvisible) {
      const stealthIdx = player.activeEffects.findIndex(e => e.params?.invisible)
      if (stealthIdx !== -1 && player.activeEffects[stealthIdx].source !== `skill:${index}`) {
        const stealthEffect = player.activeEffects[stealthIdx]
        const shadowMult = stealthEffect.params?.shadowStrikeMultiplier
        if (stealthEffect.params?.breaksOnAttack !== false) {
          // Breakable stealth: stamp shadow strike bonus and remove stealth
          if (shadowMult) player.shadowStrikeMult = shadowMult
          player.activeEffects.splice(stealthIdx, 1)
          player.rebuildStats()
        } else if (shadowMult && !stealthEffect.shadowStrikeUsed) {
          // Unbreakable stealth: grant shadow strike bonus on first ability use only
          player.shadowStrikeMult = shadowMult
          stealthEffect.shadowStrikeUsed = true
        }
      }
    }

    // SHIELD: START bypasses cooldown; END triggers cooldown (deferred if auto-latch)
    if (config.type === 'SHIELD') {
      if (action === 'START') {
        if (this.cooldowns.isOnCooldown(player.id, index)) return
        const gs = this._gs()
        this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 }, action)
      } else if (action === 'END') {
        const gs = this._gs()
        this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 }, action)
        // Auto-latch: shield stays active — cooldown fires when shield expires (in tick)
        if (player.shieldExpiresAt != null) {
          this._tutorialRecordAbilityUse(player, index)
        } else {
          // Manual or early release — start cooldown now
          const effectiveCooldown = Math.round(config.cooldown / (player.fireRateMult ?? 1))
          this.cooldowns.start(player.id, index, effectiveCooldown)
          this.io.emit(EVENTS.COOLDOWN, { playerId: player.id, skillIndex: index, durationMs: effectiveCooldown })
          this._tutorialRecordAbilityUse(player, index)
        }
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
          effectiveCastTime: Math.round((config.castTime ?? 1000) / (player.fireRateMult ?? 1)),
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
        this._tutorialRecordAbilityUse(player, index)
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
        this._tutorialRecordAbilityUse(player, index)
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
    this._tutorialRecordAbilityUse(player, index)

    const gs = this._gs()
    const _preDashX = config.type === 'DASH' ? Math.round(player.x) : null
    const _preDashY = config.type === 'DASH' ? Math.round(player.y) : null
    this.skillSystem.execute(gs, player, config, index, vector ?? { x: 1, y: 0 }, action)

    // Non-directional CAST abilities (e.g. Mass Resurrection) set activeCast here but don't
    // fire their payload until the cast bar completes. SKILL_FIRED is deferred to _tickCasts()
    // so VFX and sprite animations align with the actual payload execution.
    if (config.type === 'CAST' && config.inputType !== 'DIRECTIONAL') return

    // Emit skill fired event for VFX
    const classColor = CLASSES[player.className]?.color ?? '#ffffff'
    const v = vector ?? { x: 1, y: 0 }
    const _skillPayload = {
      playerId:  player.id,
      skillName: config.name,
      type:      config.type,
      subtype:   config.subtype ?? null,
      x:         Math.round(player.x),
      y:         Math.round(player.y),
      angle:     Math.atan2(v.y, v.x),
      radius:    config.payload?.radius ?? config.radius ?? 0,
      range:     config.range ?? 0,
      color:     classColor,
    }
    if (config.width  != null) _skillPayload.width      = config.width
    if (config.angle  != null) _skillPayload.skillAngle = config.angle
    if (_preDashX !== null && config.subtype === 'TELEPORT') {
      _skillPayload.srcX = _preDashX
      _skillPayload.srcY = _preDashY
    }
    this.io.emit(EVENTS.SKILL_FIRED, _skillPayload)
  }

  // ── Enemy management ────────────────────────────────────────────────────────

  _updateEnemies(dt, now) {
    // Provide active gate to enemy AI context (for gate repairer)
    const activeGate = this._getActiveGate()
    const ctx = { enemies: this.enemies, now, projectiles: this.projectiles, enemyIdSeq: this._enemyIdSeq, activeGate, minions: this.minions }

    let warlockAliveCount = 0

    this.enemies.forEach((e, id) => {
      if (e.isDead) {
        // ── Leviathan split-on-death: 1s death animation before despawn ──────
        if (e.splitOnDeath) {
          if (!e._deathAt) {
            // First frame of death — emit event, notify systems, pre-compute children
            e._deathAt = now
            this.io.emit(EVENTS.LEVIATHAN_DEATH, { entityId: id, x: Math.round(e.x), y: Math.round(e.y), generation: e.generation })

            this.spawnSystem?.onEnemyDied(id)
            this.buildingSpawnSystem?.onEnemyDied(id)
            this.minionSpawnSystem?.onEnemyDied(id)
            this._illidanEncounter?.onEnemyDied(id)

            // Pre-compute child data if this generation can split
            if (e.generation < (e.splitOnDeath.maxGenerations - 1)) {
              const split = e.splitOnDeath
              const mult  = split.statMultiplier
              const base  = ENEMY_TYPES[e.type]
              if (base) {
                const childGen = e.generation + 1
                e._pendingChildren = []
                for (let i = 0; i < split.count; i++) {
                  const angle = (i / split.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
                  const dist = e.radius * 1.5 + 20
                  e._pendingChildren.push({
                    type:        e.type,
                    x:           e.x + Math.cos(angle) * dist,
                    y:           e.y + Math.sin(angle) * dist,
                    generation:  childGen,
                    hp:          Math.round(e.maxHp * mult),
                    speed:       e.speed * mult,
                    radius:      Math.round(e.radius * mult),
                    meleeDamage: Math.round(e.meleeDamage * mult),
                  })
                }
              }
            }
          }

          // After 1000ms: spawn children
          if (e._pendingChildren && now - e._deathAt >= 1000) {
            for (const child of e._pendingChildren) {
              const childId = ++this._enemyIdSeq.value
              const childEnemy = new ServerEnemy({ id: childId, ...child, maxHp: child.hp })
              childEnemy.setArenaSize(this.arenaWidth, this.arenaHeight)
              this.enemies.set(childId, childEnemy)
              this.io.emit(EVENTS.LEVIATHAN_SPAWN, { entityId: childId, x: Math.round(child.x), y: Math.round(child.y), generation: child.generation })
            }
            e._pendingChildren = null
          }

          // After 1100ms: despawn
          if (now - e._deathAt >= 1100) {
            this.enemies.delete(id)
            this.killCount++
            this._killsByType[e.type] = (this._killsByType[e.type] ?? 0) + 1
            this.stats.kills = this.killCount
          }
          return
        }

        // ── Normal enemy death ────────────────────────────────────────────────
        this.enemies.delete(id)
        this.killCount++
        this._killsByType[e.type] = (this._killsByType[e.type] ?? 0) + 1
        this.stats.kills = this.killCount

        this.spawnSystem?.onEnemyDied(id)
        this.buildingSpawnSystem?.onEnemyDied(id)
        this.minionSpawnSystem?.onEnemyDied(id)

        // Flame of Azzinoth deaths → trigger Phase 3 (Level 5)
        this._illidanEncounter?.onEnemyDied(id)

        return
      }

      if (e.type === 'warlock') warlockAliveCount++

      const action = e.update(dt, this.players, ctx)

      // Handle enemy actions
      if (action === null) {
        // no-op
      } else if (Array.isArray(action)) {
        // Leviathan returns an array of shoot actions
        for (const a of action) this._handleEnemyAction(a, id, e, now)
      } else {
        this._handleEnemyAction(action, id, e, now)
      }

      // Shadow Demon: instant kill on contact (Level 5)
      if (e.type === 'shadowDemon' && now - (e._lastContactDamage ?? 0) > 1000) {
        this.players.forEach(p => {
          if (p.isHost || p.isDowned) return
          if (playerHitsEntity(p.x, p.y, e)) {
            const { damage: shadowDmg } = p.shieldResult(e.x, e.y, p.maxHp * 10)
            if (shadowDmg <= 0) return
            e._lastContactDamage = now
            p.takeDamage(shadowDmg)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: 9999, type: 'damage', sourceSkill: 'Shadow Demon' })
            if (p.isDowned) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
        })
      }

      // Shadowfiend: infects next player on contact (Level 6)
      if (e.type === 'shadowfiend' && !e._infectedTarget && now - e._lastContactDamage > 500) {
        this.players.forEach(p => {
          if (p.isHost || p.isDowned || p.id === e.sourcePlayerId) return
          if (playerHitsEntity(p.x, p.y, e)) {
            e._infectedTarget = true
            e._lastContactDamage = now
            e.isDead = true   // self-destruct after infecting
            // Apply Parasitic Shadowfiend debuff to the new player
            p.activeEffects = p.activeEffects ?? []
            p.activeEffects = p.activeEffects.filter(ef => ef.source !== 'illidan:parasiticShadowfiend')
            const abilityConfig = (ILLIDAN_CONFIG.phaseAbilities[1] ?? []).find(a => a.type === 'parasiticShadowfiend')
            p.activeEffects.push({
              source:    'illidan:parasiticShadowfiend',
              params:    { dotDamage: abilityConfig?.dotDamage ?? 30, spawnCount: abilityConfig?.spawnCount ?? 2, shadowfiendHp: abilityConfig?.shadowfiendHp, targetId: p.id, parasitic: true },
              expiresAt: now + (abilityConfig?.dotDuration ?? 10000),
              lastTick:  now,
              tickRate:  abilityConfig?.dotInterval ?? 2000,
            })
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: 0, type: 'damage', sourceSkill: 'Parasitic Shadowfiend' })
          }
        })
      }

      if (e.meleeDamage > 0 && e._chargeState !== 'dazed' && now - e._lastContactDamage > e._attackCooldown) {
        this.players.forEach(p => {
          if (p.isHost || p.isDowned) return
          if (playerHitsEntity(p.x, p.y, e)) {
            const { damage: meleeDmg, type: meleeType } = p.shieldResult(e.x, e.y, e.meleeDamage)
            if (meleeDmg <= 0) return
            e._lastContactDamage = now
            p.takeDamage(meleeDmg)
            const _meleeSourceSkill = e.type === 'leviathan' ? 'Leviathan Melee' : 'Melee'
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: meleeDmg, type: meleeType, sourceSkill: _meleeSourceSkill })
            if (!this.stats.deaths) this.stats.deaths = {}
            if (p.isDowned) {
              this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
            }
          }
        })
        // Contact damage to pets (PET/WILD_BEAST minions)
        this.minions.forEach(m => {
          if (m.isDead) return
          if (m.minionType !== 'PET' && m.minionType !== 'WILD_BEAST') return
          if (playerHitsCircle(m.x, m.y, e.x, e.y, e.radius)) {
            e._lastContactDamage = now
            m.takeDamage(e.meleeDamage)
          }
        })
      }
    })

    // Wall collision for enemies
    if (this._wallSegments.length > 0) {
      const isGateDead = (id) => this._isGateDead(id)
      this.enemies.forEach(e => {
        if (e.isDead) return
        const resolved = resolveWallCollision(e.x, e.y, e.radius, this._wallSegments, isGateDead)
        e.x = resolved.x
        e.y = resolved.y
      })
    }

    // Warlock / Phase 2 transition (Level 4)
    if (this._warlockCount > 0 && warlockAliveCount === 0) {
      this._onAllWarlocksDead()
    }
    this._warlockCount = warlockAliveCount

    // Warlock channeling buff application (continuous while alive, paused during opening dialog)
    if (this.boss && this.boss.isImmune && !this._dialogSystem) {
      this.enemies.forEach(e => {
        if (e.type !== 'warlock' || e.isDead) return
        // Each warlock buffs the boss HP and damage per second
        const base = ENEMY_TYPES.warlock
        this.boss.maxHp += (base.hpBuffPerSecond ?? 50) * dt
        this.boss.hp    += (base.hpBuffPerSecond ?? 50) * dt
        this.boss._damageMult += ((base.damageBuffPerSecond ?? 2) * dt) / 40
        // The damage buff is normalized: +2 dmg/s means +2 to base meleeDamage per second
        // We approximate by scaling _damageMult since boss damage = ability.damage * _damageMult
      })
      if (warlockAliveCount > 0 && now - this._lastWarlockBuffVfxTime >= 800) {
        this._lastWarlockBuffVfxTime = now
        this.io.emit(EVENTS.SKILL_FIRED, {
          type: 'BUFF',
          subtype: 'WARLOCK_CHANNEL',
          x: this.boss.x,
          y: this.boss.y,
          warlockCount: warlockAliveCount,
        })
      }
    }
  }

  /** Handle a single enemy action descriptor. */
  _handleEnemyAction(action, enemyId, enemy, now) {
    if (!action) return

    if (action.action === 'shoot') {
      const projId = `ep_${++this._enemyIdSeq.value}`
      const hitSet = new Set([enemyId])
      // Projectile exclusion: if the action specifies a target to exclude, add it
      if (action.excludeTargetId) {
        hitSet.add(action.excludeTargetId)
      }
      this.projectiles.set(projId, {
        id: projId,
        x: action.x, y: action.y,
        vx: action.vx, vy: action.vy,
        radius: action.radius ?? 5,
        range: 500,
        distTraveled: 0,
        damage: action.damage,
        color: action.color,
        spriteKey: action.spriteKey ?? null,
        isAlive: true,
        isEnemyProj: true,
        ownerId: enemyId,
        hit: hitSet,
        homingTargetId: action.homingTargetId ?? null,
        homingSpeed:    action.speed ?? null,
        sourceSkill:    action.sourceSkill ?? null,
      })
    } else if (action.action === 'repair') {
      // Gate repairer heals the active gate
      const gate = this.gates.get(action.gateId)
      if (gate) gate.repair(action.amount)
    } else if (action.action === 'leaveBlaze') {
      // Flame of Azzinoth drops a persistent fire circle — damages players, not the flame itself
      this.skillSystem.addZone('enemy_' + enemyId, {
        name:       'Blaze',
        radius:     action.radius,
        duration:   30000,
        damage:     25,
        tickRate:   1000,
        effectType: 'PLAYER_DAMAGE',
      }, action.x, action.y, '#ff4400')
    } else if (action.action === 'burningAuraTick') {
      // Flame of Azzinoth burning aura — damage nearby players
      this.players.forEach(p => {
        if (p.isHost || p.isDowned) return
        if (playerHitsCircle(p.x, p.y, action.x, action.y, action.radius)) {
          p.takeDamage(action.damage)
          this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: action.damage, type: 'damage', sourceSkill: 'Burning Aura' })
          if (p.isDowned) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
        }
      })
      // Visual pulse so players see the aura radius on each tick
      this.io.emit(EVENTS.ILLIDAN_AURA_PULSE, { x: action.x, y: action.y, radius: action.radius, color: '#ff4400' })
    } else if (action.action === 'berserkAoeTick') {
      // Bonechewer Blade Fury whirlwind spin — AoE damage around the enemy
      this.players.forEach(p => {
        if (p.isHost || p.isDowned) return
        if (playerHitsCircle(p.x, p.y, action.x, action.y, action.radius)) {
          const { damage: whirlDmg, type: whirlType } = p.shieldResult(action.x, action.y, action.damage)
          if (whirlDmg <= 0) return
          p.takeDamage(whirlDmg)
          this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: whirlDmg, type: whirlType, sourceSkill: 'Whirlwind' })
          if (p.isDowned) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
        }
      })
    } else if (action.action === 'bloodProphetBuff') {
      // Apply speed-buff to nearby allies
      this.enemies.forEach(e => {
        if (e.isDead || e.type === 'bloodProphet') return
        if (Math.hypot(e.x - action.x, e.y - action.y) > action.radius) return
        e.activeEffects = e.activeEffects ?? []
        e.activeEffects.push({
          source: 'blood_prophet_buff',
          params: { speedMultiplier: action.speedMult },
          expiresAt: now + (action.duration ?? 4000),
        })
        e.speedMult = (e.speedMult ?? 1) * action.speedMult
      })
      this.io.emit(EVENTS.SKILL_FIRED, {
        type: 'BUFF', subtype: 'BLOOD_PROPHET',
        x: action.x, y: action.y,
        radius: action.radius, color: '#8B0000',
      })
    } else if (action.action === 'teleport') {
      const vfxX = action.departX ?? action.x
      const vfxY = action.departY ?? action.y
      this.io.emit(EVENTS.SKILL_FIRED, {
        type: 'TELEPORT', subtype: 'BLOOD_PROPHET',
        x: vfxX, y: vfxY, color: '#8B0000',
      })
      if (action.departX != null) {
        this.skillSystem.addZone('enemy_' + enemyId, {
          name: 'Crimson Puddle',
          radius: action.puddleRadius ?? 60,
          duration: 6000,
          damage: 15,
          tickRate: 1000,
          effectType: 'PLAYER_DAMAGE',
        }, action.departX, action.departY, '#8B0000')
      }
    } else if (action.action === 'heal') {
      this.io.emit(EVENTS.SKILL_FIRED, {
        type: 'ENEMY_HEAL',
        x: action.x, y: action.y,
        radius: action.radius ?? 300,
        color: action.color ?? '#7b4f9e',
      })
    }
    // 'heal', 'channel', 'leaveBlaze', 'burningAuraTick', 'berserkAoeTick', 'bloodProphetBuff', 'teleport' handled above
  }

  /** Activate the next gate in sequence. */
  _activateNextGate() {
    const level = this.currentLevel
    if (!level?.gates) return
    const gateIds = level.gates.map(g => g.id)
    // Deactivate all first
    this.gates.forEach(g => { g.isActive = false })
    // Find the next non-dead gate
    for (let i = this._activeGateIndex; i < gateIds.length; i++) {
      const gate = this.gates.get(gateIds[i])
      if (gate && !gate.isDead) {
        gate.isActive = true
        this._activeGateIndex = i
        return
      }
    }
  }

  /** Get the currently active gate (for gate repairer AI). */
  _getActiveGate() {
    let active = null
    this.gates.forEach(g => { if (g.isActive && !g.isDead) active = g })
    return active
  }

  /** Called when all warlocks die — transition to Phase 2. */
  _onAllWarlocksDead() {
    console.log('[~] All warlocks dead — Phase 2 begins')
    this._bossPhase = 2

    if (this.boss) {
      this.boss.isImmune = false
      // Activate Phase 2 AI (boss now targets NPC)
      this.boss.phase = 2
      this.boss.speed = SHADE_OF_AKAMA_CONFIG.phases[1]?.speed ?? 0.6
    }

    // Activate NPCs
    this.npcs.forEach(npc => {
      if (npc.idleUntilPhase <= 2) npc.activate()
    })

    // Activate phase-gated spawning
    if (this.spawnSystem) {
      this.spawnSystem.setPhase(2)
    }

    // Start pylon cycle — first pylon spawns immediately
    this._pylonNextSpawn = Date.now()
  }

  _spawnPylon() {
    const cfg = SHADE_OF_AKAMA_CONFIG.pylons
    const margin = 150
    const x = margin + Math.random() * (this.arenaWidth  - margin * 2)
    const y = margin + Math.random() * (this.arenaHeight - margin * 2)
    const id = `pylon_${++this._pylonIdSeq}`
    this._pylons.set(id, {
      id,
      x: Math.round(x),
      y: Math.round(y),
      state:        'inactive',
      charges:      0,
      activatedAt:  null,
      _playerAccum: {},   // playerId → accumulated seconds in range (server-only)
      _wasCharging: false,
    })
    this.io.emit(EVENTS.SKILL_FIRED, { type: 'PYLON_SPAWN', x: Math.round(x), y: Math.round(y) })
    console.log(`[~] Pylon ${id} spawned at (${Math.round(x)}, ${Math.round(y)})`)
    return id
  }

  _updatePylons(dt, now) {
    if (this._bossPhase < 2) return

    // Spawn next pylon if due and none active/inactive exist
    if (this._pylonNextSpawn !== null && now >= this._pylonNextSpawn && this._pylons.size === 0) {
      this._pylonNextSpawn = null
      this._spawnPylon()
    }

    const cfg    = SHADE_OF_AKAMA_CONFIG.pylons
    const akama  = this.npcs.get('akama')

    for (const [id, pylon] of this._pylons) {
      if (pylon.state === 'inactive') {
        // Charge accumulation — one charge per player per second of proximity
        let anyInRange = false
        this.players.forEach(p => {
          if (p.isHost || p.isDowned) return
          const dist = Math.hypot(p.x - pylon.x, p.y - pylon.y)
          if (dist <= cfg.chargeRadius) {
            anyInRange = true
            pylon._playerAccum[p.id] = (pylon._playerAccum[p.id] ?? 0) + dt
            while (pylon._playerAccum[p.id] >= 1) {
              pylon.charges++
              pylon._playerAccum[p.id] -= 1
            }
          } else {
            pylon._playerAccum[p.id] = 0
          }
        })

        if (anyInRange && !pylon._wasCharging) {
          pylon._wasCharging = true
          this.io.emit(EVENTS.SKILL_FIRED, { type: 'PYLON_CHARGING' })
        } else if (!anyInRange && pylon._wasCharging) {
          pylon._wasCharging = false
          this.io.emit(EVENTS.SKILL_FIRED, { type: 'PYLON_IDLE' })
        }

        if (pylon.charges >= cfg.chargesRequired) {
          pylon.state       = 'active'
          pylon.charges     = cfg.chargesRequired
          pylon.activatedAt = now
          this.io.emit(EVENTS.SKILL_FIRED, { type: 'PYLON_ACTIVATED', id, x: pylon.x, y: pylon.y })
          console.log(`[~] Pylon ${id} activated`)
        }
      } else if (pylon.state === 'active') {
        // Heal Akama each tick
        if (akama && !akama.isDead) {
          const healPerTick = akama.maxHp * cfg.healPctPerSec * dt
          akama.hp = Math.min(akama.maxHp, akama.hp + healPerTick)
        }

        if (now - pylon.activatedAt >= cfg.healDuration) {
          this._pylons.delete(id)
          this.io.emit(EVENTS.SKILL_FIRED, { type: 'PYLON_EXPIRED', id })
          console.log(`[~] Pylon ${id} expired — scheduling next in ${cfg.spawnDelay}ms`)
          this._pylonNextSpawn = now + cfg.spawnDelay
        }
      }
    }
  }

  // ── Boss management ─────────────────────────────────────────────────────────

  _updateBoss(dt, now) {
    if (!this.boss) return

    // ── Illidan encounter ──────────────────────────────────────────────────
    if (this._illidanEncounter) {
      this._illidanEncounter.update(dt, now)
      return
    }

    // ── Generic boss (Shade of Akama) ──────────────────────────────────────
    if (this.boss.isImmune) return  // Shade Phase 1: idle, immune

    const bossConfig = this.currentLevel?.boss === 'SHADE_OF_AKAMA' ? SHADE_OF_AKAMA_CONFIG : null
    if (bossConfig?.targetNPC && this._bossPhase >= 2) {
      const npc = this.npcs.get(bossConfig.targetNPC)
      this._updateBossTargetingNPC(dt, now, npc, bossConfig)
      return
    }

    this.boss.update(dt, this.players)

    const attacks = this.boss.updateAbilities(dt, this.players, now)
    for (const attack of attacks) {
      if (attack.type === 'beam') {
        const target = attack.target
        if (target && !target.isDead) {
          const d = Math.hypot(target.x - this.boss.x, target.y - this.boss.y)
          if (d < 350) {
            const { damage: beamDmg } = target.shieldResult(this.boss.x, this.boss.y, attack.damage ?? 30)
            if (beamDmg > 0) {
              target.takeDamage(beamDmg)
              if (target.isDead) this.stats.deaths[target.id] = (this.stats.deaths[target.id] ?? 0) + 1
            }
          }
        }
      } else if (attack.type === 'aoe') {
        const r = attack.radius ?? 100
        this.players.forEach(p => {
          if (p.isHost || p.isDowned) return
          if (playerHitsCircle(p.x, p.y, attack.bossX, attack.bossY, r)) {
            const { damage: aoeDmg } = p.shieldResult(attack.bossX, attack.bossY, attack.damage ?? 25)
            if (aoeDmg <= 0) return
            p.takeDamage(aoeDmg)
            if (p.isDowned) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
        })
      } else if (attack.type === 'charge') {
        const target = attack.target
        if (target && !target.isDead) {
          const { damage: chargeDmg } = target.shieldResult(this.boss.x, this.boss.y, attack.damage ?? 40)
          if (chargeDmg > 0) {
            target.takeDamage(chargeDmg)
            if (target.isDead) this.stats.deaths[target.id] = (this.stats.deaths[target.id] ?? 0) + 1
          }
        }
      }
    }

    // Contact damage: per-player rate-limited
    this.players.forEach(p => {
      if (p.isHost || p.isDowned) return
      if (playerHitsEntity(p.x, p.y, this.boss, 5)) {
        const { damage: contactDmg } = p.shieldResult(this.boss.x, this.boss.y, 5)
        if (contactDmg <= 0) return
        if (!p._lastBossContact) p._lastBossContact = 0
        if (now - p._lastBossContact > 500) {
          p._lastBossContact = now
          p.takeDamage(contactDmg)
          if (p.isDowned) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
        }
      }
    })
  }

  /** Shade of Akama Phase 2: chase and melee-attack NPC target. */
  _updateBossTargetingNPC(dt, now, npc, bossConfig) {
    if (!npc || npc.isDead || this.boss.isDead) return

    // Chase NPC
    const dx   = npc.x - this.boss.x
    const dy   = npc.y - this.boss.y
    const dist = Math.hypot(dx, dy)

    const attackRange = bossConfig.attackRange ?? 60
    // Stop when NPC is within natural melee reach; prevents Shade/Akama from overlapping
    const stopDist = this.boss.radius + npc.radius

    if (dist > stopDist) {
      const pps = this.boss.speed * 60
      this.boss.x += (dx / dist) * pps * dt
      this.boss.y += (dy / dist) * pps * dt
      this.boss.angle = Math.atan2(dy, dx)
      this.boss.x = Math.max(this.boss.radius, Math.min(this.arenaWidth  - this.boss.radius, this.boss.x))
      this.boss.y = Math.max(this.boss.radius, Math.min(this.arenaHeight - this.boss.radius, this.boss.y))
    }

    // Melee attack NPC when in range
    if (dist <= attackRange + npc.radius) {
      if (!this.boss._lastNpcAttack) this.boss._lastNpcAttack = 0
      const attackCD = bossConfig.attackCooldown ?? 2000
      if (now - this.boss._lastNpcAttack >= attackCD) {
        this.boss._lastNpcAttack = now
        const dmg = Math.round((bossConfig.meleeDamage ?? 40) * this.boss._damageMult)
        npc.takeDamage(dmg)
      }
    }

    // Contact damage to players who wander too close
    this.players.forEach(p => {
      if (p.isHost || p.isDowned) return
      if (playerHitsEntity(p.x, p.y, this.boss, 5)) {
        const { damage: contactDmg } = p.shieldResult(this.boss.x, this.boss.y, 5)
        if (contactDmg <= 0) return
        if (!p._lastBossContact) p._lastBossContact = 0
        if (now - p._lastBossContact > 500) {
          p._lastBossContact = now
          p.takeDamage(contactDmg)
          if (p.isDowned) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
        }
      }
    })
  }

  /** Update friendly NPCs (e.g., Akama attacks boss). */
  _updateNPCs(dt, now) {
    this.npcs.forEach(npc => {
      if (npc.isDead) return

      // Find the target entity
      let targetEntity = null
      if (npc.targetId === 'shade' || npc.targetId === 'boss') {
        targetEntity = this.boss
      }

      const action = npc.update(dt, targetEntity, now)
      if (action?.action === 'melee' && targetEntity && !targetEntity.isDead) {
        targetEntity.takeDamage(action.damage)
      }
    })
  }

  /** Check gate destruction and advance to next gate. */
  _updateGates() {
    if (this.gates.size === 0) return

    let needAdvance = false
    this.gates.forEach(gate => {
      if (gate.isDead && gate.isActive) {
        gate.isActive = false
        needAdvance = true
        console.log(`[~] Gate ${gate.id} destroyed`)
        this.io.emit(EVENTS.GATE_DESTROY, { gateId: gate.id })

        // Phase-aware spawn switching — when gate1 dies, move enemies to Room 2 spawn points
        if (gate.id === 'gate1' && this.spawnSystem?.setSpawnPhase) {
          this.spawnSystem.setSpawnPhase(2)
          console.log('[~] SpawnSystem advanced to phase 2 (gate1 destroyed)')
          this._boulderSystem?.onGate1Destroyed((event, data) => this.io.emit(event, data))
        }
      }
    })

    if (needAdvance) {
      this._activeGateIndex++
      this._activateNextGate()
    }
  }

  // ── Revive mechanic ─────────────────────────────────────────────────────────

  _checkRevive(now) {
    const downedPlayers = []
    const alivePlayers  = []

    this.players.forEach(p => {
      if (p.isHost) return
      if (p.isDowned) downedPlayers.push(p)
      else            alivePlayers.push(p)
    })

    downedPlayers.forEach(dead => {
      const existing = this.reviveTimers.get(dead.id)

      // Prefer the current reviver if still in range — prevents timer reset churn when
      // iteration order shifts or another player briefly enters range alongside them.
      let reviver = null
      if (existing) {
        const prev = alivePlayers.find(p => p.id === existing.reviverId)
        if (prev && Math.hypot(prev.x - dead.x, prev.y - dead.y) <= GAME_CONFIG.REVIVE_DISTANCE) {
          reviver = prev
        }
      }

      // Fall back to any nearby alive player
      if (!reviver) {
        for (const alive of alivePlayers) {
          if (Math.hypot(alive.x - dead.x, alive.y - dead.y) <= GAME_CONFIG.REVIVE_DISTANCE) {
            reviver = alive
            break
          }
        }
      }

      if (!reviver) {
        // Grace period: brief movement out of range (e.g. casting / input jitter) should
        // not reset the revive. Only clear after 300ms of confirmed absence.
        if (existing && now - (existing.lastSeenAt ?? existing.startedAt) < 300) return
        this.reviveTimers.delete(dead.id)
        return
      }

      if (!existing || existing.reviverId !== reviver.id) {
        this.reviveTimers.set(dead.id, { reviverId: reviver.id, startedAt: now, lastSeenAt: now })
        return
      }

      existing.lastSeenAt = now

      const elapsed = now - existing.startedAt
      if (elapsed >= GAME_CONFIG.REVIVE_TIME) {
        dead.revive()
        this.reviveTimers.delete(dead.id)
        console.log(`[~] revived ${dead.name}`)
        const reviverId = existing.reviverId
        this.stats.resurrections[reviverId]      = (this.stats.resurrections[reviverId]      ?? 0) + 1
        this.levelStats.resurrections[reviverId] = (this.levelStats.resurrections[reviverId] ?? 0) + 1
      }
    })
  }

  // ── Objective evaluation ───────────────────────────────────────────────────

  _updateObjectives(now) {
    if (!this.currentLevel) return
    if (this.currentLevel.debugSandbox || this.objectiveProgress.length === 0) return

    let allComplete = true
    let npcDied = false

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

        // ── New objective types ──────────────────────────────────────────

        case 'surviveWaves': {
          obj.current = this.spawnSystem?.currentWave ?? 0
          obj.target  = this.spawnSystem?.waveCount ?? 0
          if (!this.spawnSystem?.allWavesComplete) allComplete = false
          break
        }
        case 'destroyGates': {
          let destroyed = 0
          this.gates.forEach(g => { if (g.isDead) destroyed++ })
          obj.current = destroyed
          if (destroyed < obj.target) allComplete = false
          break
        }
        case 'destroyBuildings': {
          let destroyed = 0
          this.buildings.forEach(b => { if (b.isDead) destroyed++ })
          obj.current = destroyed
          if (destroyed < obj.target) allComplete = false
          break
        }
        case 'killAll': {
          // Wait for deferred initial enemies (e.g. Leviathan) before allowing completion
          const level = this.currentLevel
          if (level?.initialEnemies?.length && !this._initialEnemiesReady) {
            allComplete = false
            break
          }
          // Count alive enemies + dead-but-splitting ones (pending children not yet spawned)
          let aliveCount = 0
          this.enemies.forEach(e => { if (!e.isDead || e._pendingChildren?.length) aliveCount++ })
          obj.current = aliveCount === 0 ? 1 : 0
          if (aliveCount > 0) allComplete = false
          break
        }
        case 'killBossProtectNPC': {
          // Win: boss dies. Lose: NPC dies.
          const npc = this.npcs.get(obj.npcId)
          if (npc?.isDead) {
            npcDied = true
          }
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

    // NPC death = game over (Level 4 loss condition)
    if (npcDied) {
      console.log('[~] NPC died — game over')
      const snapshot = this._buildPlayerSnapshot()
      this.runHistory.recordLevel(this.currentLevelIndex, this.currentLevel?.name ?? `Level ${this.currentLevelIndex + 1}`, 'defeat', { ...this.levelStats }, snapshot)
      this.currentLevelIndex = -1
      this.currentLevel      = null
      this._changeScene('gameover', { cumulativeStats: { ...this.stats, playerSnapshot: snapshot } })
      return
    }

    if (allComplete) {
      this._onLevelComplete()
    }
  }

  async _onLevelComplete() {
    if (this._levelCompletePending) return
    this._levelCompletePending = true

    // Level 6 (Illidan): hand off to the closing cinematic instead of the normal flow
    if (this.currentLevel?.id === 'level_6') {
      this._startClosingCinematic()
      return
    }

    // Walk-out cinematic: clear enemies and walk players off-screen right before victory fires
    const walkOutMs = this.currentLevel?.transition?.closing?.walkOutMs ?? 0
    if (walkOutMs > 0 && !this.skipDialog && !this.currentLevel?.debugSandbox) {
      this.enemies.clear()
      this.projectiles.clear()
      const targets = CinematicMovementSystem.buildWalkOutTargets(this.players, this.arenaWidth)
      this._cinematicSystem = new CinematicMovementSystem({
        targets,
        durationMs: walkOutMs,
        onComplete: () => {
          this._cinematicSystem = null
          this._doLevelComplete()
        },
      })
      return
    }

    await this._doLevelComplete()
  }

  _startClosingCinematic() {
    this.enemies.clear()
    this.projectiles.clear()

    for (const p of this.players.values()) {
      p.activeEffects = p.activeEffects.filter(e => !e.source?.startsWith('illidan:'))
    }

    if (this.boss?.phase === ILLIDAN_PHASE.DEMON_FORM) {
      this.boss.phase = ILLIDAN_PHASE.HUNT_2
    }

    this._closingCinematic = new ClosingCinematicSystem({
      io:          this.io,
      players:     this.players,
      boss:        this.boss,
      arenaWidth:  this.arenaWidth,
      arenaHeight: this.arenaHeight,
      config:      ILLIDAN_CONFIG.closingCinematic,
      onComplete:  () => {
        this._closingCinematic = null
        this._doLevelComplete()
      },
    })
  }

  async _doLevelComplete() {
    const levelIndex = this.currentLevelIndex

    // Run closing transition before advancing scene (skip for debug sandbox)
    if (!this.currentLevel?.debugSandbox) {
      const closingSteps = this.currentLevel?.transition?.closing?.steps
      if (closingSteps?.length) {
        this.io.emit(EVENTS.LEVEL_VICTORY, {})
        this._closingRunner = new TransitionRunner(this.io)
        await this._closingRunner.run(closingSteps)
        this._closingRunner = null
      }
    }

    if (this.currentLevel?.debugSandbox) {
      this._showLevelComplete()
      return
    }

    const isLastLevel = levelIndex >= CAMPAIGN.length - 1

    if (!this.currentLevel?.debugSandbox && !isLastLevel) {
      this.unlockedLevelCount = Math.max(this.unlockedLevelCount, this.currentLevelIndex + 2)
    }

    console.log(`[~] Level ${levelIndex + 1} complete! ${isLastLevel ? '(final)' : ''}`)

    // Snapshot players and record level history before levelStats is reset by _startLevel
    const snapshot = this._buildPlayerSnapshot()
    this.runHistory.recordLevel(levelIndex, this.currentLevel?.name ?? `Level ${levelIndex + 1}`, 'victory', { ...this.levelStats }, snapshot)

    if (isLastLevel) {
      // Campaign complete — final victory!
      this._changeScene('result', { cumulativeStats: { ...this.stats, playerSnapshot: snapshot } })
    } else if (GAME_CONFIG.QUIZ_BETWEEN_LEVELS && !this.disableQuiz) {
      // Start quiz phase before showing level-complete
      this._startQuiz()
    } else {
      // Show level-complete screen and wait for host to advance
      this._showLevelComplete()
    }
  }

  // Called by CinematicMovementSystem when the walk-in finishes.
  // Starts ambient spawn system (if any) and/or dialog (if any).
  _onWalkInComplete(level, playerCount) {
    this._cinematicSystem = null

    // Restore zero move input on all players so they stop after the walk-in
    this.players.forEach(p => { if (!p.isHost) p.setMoveInput(0, 0) })

    // Start ambient spawn system for levels that have one, respecting any post-arrival delay
    if (level.spawning && !this.spawnSystem) {
      const spawnDelay = level.transition?.opening?.enemySpawnDelayMs ?? 0
      if (spawnDelay > 0) {
        this._spawnSystemTimer = setTimeout(() => {
          if (this.currentLevel === level) this.spawnSystem = new SpawnSystem(level, playerCount)
          this._spawnSystemTimer = null
        }, spawnDelay)
      } else {
        this.spawnSystem = new SpawnSystem(level, playerCount)
      }
    }

    // Spawn deferred initial enemies (e.g. Leviathan), optionally with an extra delay
    if (level.initialEnemies?.length) {
      const diff = level.difficulty ?? {}
      const hpMult     = (diff.hpMult?.base ?? 1)     + (diff.hpMult?.perPlayer ?? 0)     * (playerCount - 1)
      const damageMult = (diff.damageMult?.base ?? 1) + (diff.damageMult?.perPlayer ?? 0) * (playerCount - 1)
      const extraDelay = level.transition?.opening?.initialEnemyDelayMs ?? 0
      if (extraDelay > 0) {
        setTimeout(() => {
          if (this.currentLevel === level) this._spawnInitialEnemies(level, hpMult, damageMult)
        }, extraDelay)
      } else {
        this._spawnInitialEnemies(level, hpMult, damageMult)
      }
    }

    // Start dialog (levels 5 & 6) — combat will begin when dialog completes
    if (this._dialogSystem) {
      this._dialogSystem.start((event, data) => this.io.emit(event, data))
    }
  }

  /** Spawn all entries in level.initialEnemies into the enemies map. */
  _spawnInitialEnemies(level, hpMult, damageMult) {
    this._initialEnemiesReady = true
    for (const entry of level.initialEnemies) {
      const base = ENEMY_TYPES[entry.type]
      if (!base) continue
      const id = ++this._enemyIdSeq.value
      const enemy = new ServerEnemy({
        id,
        x: entry.x,
        y: entry.y,
        type: entry.type,
        hp: Math.round(base.hp * hpMult),
        maxHp: Math.round(base.hp * hpMult),
        speed: base.speed,
        radius: base.radius,
        meleeDamage: Math.round(base.meleeDamage * damageMult),
        generation: entry.generation ?? 0,
      })
      enemy.setArenaSize(this.arenaWidth, this.arenaHeight)
      this.enemies.set(id, enemy)
    }
  }

  // Teleports players directly to walk-in formation positions (no animation).
  // Used when skipDialog=true or when the level has no walkInMs configured.
  _placePlayersInFormation() {
    const FORMATION = [
      { xOffset:    0, yOffset:    0 },
      { xOffset:  -40, yOffset:  -50 },
      { xOffset:  -40, yOffset:   50 },
      { xOffset:  -80, yOffset: -100 },
      { xOffset:  -80, yOffset:  100 },
      { xOffset:  -80, yOffset:    0 },
      { xOffset: -120, yOffset: -150 },
      { xOffset: -120, yOffset:  150 },
      { xOffset: -120, yOffset:  -60 },
      { xOffset: -120, yOffset:   60 },
      { xOffset: -160, yOffset: -200 },
      { xOffset: -160, yOffset:  200 },
      { xOffset: -160, yOffset:    0 },
    ]
    const entryX  = this.arenaWidth * 0.15
    const centerY = this.arenaHeight / 2
    const pad     = GAME_CONFIG.PLAYER_RADIUS + 10
    let slotIndex = 0
    this.players.forEach(p => {
      if (p.isHost) return
      const slot = FORMATION[Math.min(slotIndex, FORMATION.length - 1)]
      p.x = entryX + slot.xOffset
      p.y = Math.max(pad, Math.min(this.arenaHeight - pad, centerY + slot.yOffset))
      slotIndex++
    })
  }

  _showLevelComplete() {
    this._changeScene('levelComplete', {
      levelIndex: this.currentLevelIndex,
      levelNumber: this.currentLevelIndex >= 0 ? this.currentLevelIndex + 1 : null,
      levelName: this.currentLevel?.name ?? '',
      totalLevels: this.currentLevel?.debugSandbox ? 1 : CAMPAIGN.length,
      stats: { ...this.levelStats },
      debugSandbox: !!this.currentLevel?.debugSandbox,
    })
  }

  // ── Quiz system ─────────────────────────────────────────────────────────────

  _startQuiz() {
    // Pick a random unused question
    const available = QUIZ_QUESTIONS.filter(q => !this._usedQuestionIds.has(q.id))
    if (available.length === 0) {
      // All questions used — skip quiz
      this._showLevelComplete()
      return
    }

    const question = available[Math.floor(Math.random() * available.length)]
    this._usedQuestionIds.add(question.id)

    this._quizQuestion = question
    this._quizAnswers.clear()
    this._quizResults.clear()
    this._quizUpgradesDone.clear()
    this._quizPhase = 'answering'

      this._changeScene('quiz', {
        levelIndex: this.currentLevelIndex,
        levelNumber: this.currentLevelIndex + 1,
        levelName: this.currentLevel?.name ?? '',
        totalLevels: CAMPAIGN.length,
      })

    // Send question to all (without correctIndex)
    this.io.emit(EVENTS.QUIZ_QUESTION, {
      question: question.question,
      options:  question.options,
    })
  }

  _startPreLevelQuiz() {
    const available = QUIZ_QUESTIONS.filter(q => !this._usedQuestionIds.has(q.id))
    if (available.length === 0) {
      // No questions left — skip remaining and start the level
      this._preLevelQuizQueue = 0
      this._startLevel(this._preLevelTargetIndex)
      return
    }
    const question = available[Math.floor(Math.random() * available.length)]
    this._usedQuestionIds.add(question.id)
    this._quizQuestion = question
    this._quizAnswers.clear()
    this._quizResults.clear()
    this._quizUpgradesDone.clear()
    this._quizPhase = 'answering'

    const questionIndex  = this._preLevelTargetIndex - this._preLevelQuizQueue + 1
    const totalQuestions = this._preLevelTargetIndex

    this._changeScene('quiz', {
      question:       question.question,
      options:        question.options,
      preLevel:       true,
      questionIndex,
      totalQuestions,
    })
    this.io.emit(EVENTS.QUIZ_QUESTION, { question: question.question, options: question.options })
  }

  _getQuizParticipants() {
    const participants = []
    this.players.forEach(p => { if (!p.isHost && !p.isBot) participants.push(p) })
    return participants
  }

  _onQuizAnswer(socket, data) {
    if (this.scene !== 'quiz' || this._quizPhase !== 'answering') return
    const player = this.players.get(socket.id)
    if (!player || player.isHost) return
    if (this._quizAnswers.has(socket.id)) return  // already answered

    const { chosenIndex } = data ?? {}
    if (typeof chosenIndex !== 'number') return

    this._quizAnswers.set(socket.id, chosenIndex)

    // Broadcast progress
    const participants = this._getQuizParticipants()
    this.io.emit(EVENTS.QUIZ_PROGRESS, {
      answered: this._quizAnswers.size,
      total:    participants.length,
    })

    // Check if all have answered
    if (this._quizAnswers.size >= participants.length) {
      this._resolveQuiz()
    }
  }

  _resolveQuiz() {
    const correct = this._quizQuestion.correctIndex

    // Evaluate each answer
    const participants = this._getQuizParticipants()
    const playerResults = {}
    let correctCount = 0
    let wrongCount = 0

    for (const p of participants) {
      const answer = this._quizAnswers.get(p.id)
      const isCorrect = answer === correct
      this._quizResults.set(p.id, isCorrect)
      playerResults[p.id] = isCorrect
      if (isCorrect) correctCount++
      else wrongCount++
    }

    this._quizPhase = 'results'

    // Track quiz stats cumulatively
    for (const p of participants) {
      const isCorrect = this._quizResults.get(p.id)
      if (!this.stats.quiz[p.id]) this.stats.quiz[p.id] = { correct: 0, wrong: 0 }
      if (isCorrect) this.stats.quiz[p.id].correct++
      else this.stats.quiz[p.id].wrong++
    }

    // Broadcast results to all
    this.io.emit(EVENTS.QUIZ_RESULTS, {
      correctIndex: correct,
      playerResults,
      correctCount,
      wrongCount,
    })

    // Apply HP upgrade to all correct players, mark wrong players as upgrade-done
    for (const p of participants) {
      if (this._quizResults.get(p.id)) {
        p.applyHpUpgrade()
      } else {
        this._quizUpgradesDone.add(p.id)
      }
    }

    if (correctCount === 0) {
      // Nobody got it right — skip upgrade phase
      setTimeout(() => this._finishQuiz(), 2000)
      return
    }

    // Send upgrade options to correct players
    this._quizPhase = 'upgrading'
    for (const p of participants) {
      if (!this._quizResults.get(p.id)) continue

      const baseSkills = CLASSES[p.className]?.skills ?? []
      const skills = baseSkills.map((skill, i) => {
        const currentTier = p.skillUpgrades[i]
        const maxTier = getMaxTier(p.className, i)
        const preview = getUpgradePreview(skill, p.className, i, currentTier)
        return {
          name: skill.name,
          icon: skill.icon,
          iconFile: skill.iconFile ?? null,
          skillIndex: i,
          currentTier,
          maxTier,
          preview,  // null if already maxed
        }
      })

      // Send to this specific player only
      const sock = this.io.sockets.sockets.get(p.id)
      if (sock) {
        sock.emit(EVENTS.QUIZ_UPGRADE_OPTIONS, { skills })
      }
    }
  }

  _onQuizUpgrade(socket, data) {
    if (this.scene !== 'quiz' || this._quizPhase !== 'upgrading') return
    const player = this.players.get(socket.id)
    if (!player || player.isHost) return
    if (this._quizUpgradesDone.has(socket.id)) return
    if (!this._quizResults.get(socket.id)) return  // didn't answer correctly

    const { skillIndex } = data ?? {}
    if (typeof skillIndex !== 'number' || skillIndex < 0 || skillIndex > 3) return

    const maxTier = getMaxTier(player.className, skillIndex)
    if (player.skillUpgrades[skillIndex] >= maxTier) return  // already maxed

    // Apply upgrade
    player.skillUpgrades[skillIndex]++
    this._quizUpgradesDone.add(socket.id)

    const skillName = CLASSES[player.className]?.skills?.[skillIndex]?.name ?? ''
    console.log(`[~] ${player.name} upgraded ${skillName} to tier ${player.skillUpgrades[skillIndex]}`)

    // Broadcast so host can show progress
    this.io.emit(EVENTS.QUIZ_UPGRADE_CHOSEN, {
      playerId:  player.id,
      playerName: player.name,
      skillIndex,
      skillName,
    })

    // Check if all done
    const participants = this._getQuizParticipants()
    if (this._quizUpgradesDone.size >= participants.length) {
      this._finishQuiz()
    }
  }

  _finishQuiz() {
    this._quizPhase = 'done'
    this.io.emit(EVENTS.QUIZ_DONE)
    // Stay on quiz scene — host must press CONTINUE to proceed
  }

  // ── Zone selector (training grounds, multi-level unlock) ──────────────────

  _tickZoneSelector(dt) {
    const ZONE_HEIGHT  = 90   // container y=-30 + portal sprite height 120
    const totalZones   = CAMPAIGN.length
    const zoneWidth    = this.arenaWidth / totalZones
    const counts       = new Array(totalZones).fill(0)
    let totalPlayers   = 0

    this.players.forEach(p => {
      if (p.isHost || p.isDowned) return
      totalPlayers++
      if (p.y <= ZONE_HEIGHT) {
        const zoneIdx = Math.floor(p.x / zoneWidth)
        if (zoneIdx >= 0 && zoneIdx < this.unlockedLevelCount) {
          counts[zoneIdx]++
        }
      }
    })

    const threshold   = Math.ceil(totalPlayers / 2)
    let pendingIndex  = null
    let maxCount      = 0

    for (let i = 0; i < counts.length; i++) {
      if (counts[i] > maxCount) {
        maxCount = counts[i]
        if (counts[i] >= threshold && threshold > 0) pendingIndex = i
      }
    }

    const prev = this._levelZoneState

    // Countdown logic
    if (pendingIndex !== null) {
      if (prev?.pendingIndex === pendingIndex) {
        // Same zone still majority — tick down
        this._zoneCountdownMs = Math.max(0, (prev.countdownMs ?? 4000) - dt * 1000)
      } else {
        // New majority zone — reset countdown
        this._zoneCountdownMs = 4000
      }
    } else {
      this._zoneCountdownMs = 4000
    }

    // Commit when countdown reaches zero
    let committedIndex = prev?.committedIndex ?? null
    if (pendingIndex !== null && this._zoneCountdownMs === 0 && prev?.committedIndex === null) {
      committedIndex = pendingIndex
      this.startingLevelIndex = committedIndex
      this._levelZoneState = { counts, pendingIndex, countdownMs: 0, committedIndex }
      this._startCampaign()
      return
    }

    this._levelZoneState = {
      counts,
      pendingIndex,
      countdownMs:    this._zoneCountdownMs,
      committedIndex,
    }
  }

  // ── Win / lose conditions ───────────────────────────────────────────────────

  _checkAllDead() {
    if (this.currentLevel?.debugSandbox) return
    let livingCount = 0
    this.players.forEach(p => {
      if (!p.isHost && !p.isDowned) livingCount++
    })
    if (livingCount === 0 && this.players.size > 0) {
      console.log('[~] All players dead — game over')
      const snapshot = this._buildPlayerSnapshot()
      this.runHistory.recordLevel(this.currentLevelIndex, this.currentLevel?.name ?? `Level ${this.currentLevelIndex + 1}`, 'defeat', { ...this.levelStats }, snapshot)
      this.currentLevelIndex = -1
      this.currentLevel      = null
      this._changeScene('gameover', { cumulativeStats: { ...this.stats, playerSnapshot: snapshot } })
    }
  }

}
