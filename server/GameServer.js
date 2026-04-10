import { EVENTS }          from '../shared/protocol.js'
import { GAME_CONFIG }     from '../shared/GameConfig.js'
import { CAMPAIGN }        from '../shared/LevelConfig.js'
import { BOSS_CONFIG }     from '../shared/BossConfig.js'
import { ILLIDAN_CONFIG }  from '../shared/IllidanConfig.js'
import DialogSystem        from './systems/DialogSystem.js'
import { CLASSES, resolveClassName } from '../shared/ClassConfig.js'
import ServerPlayer      from './entities/ServerPlayer.js'
import ServerEnemy       from './entities/ServerEnemy.js'
import ServerBoss        from './entities/ServerBoss.js'
import ServerNPC         from './entities/ServerNPC.js'
import ServerGate        from './entities/ServerGate.js'
import ServerBuilding    from './entities/ServerBuilding.js'
import BuildingSpawnSystem from './systems/BuildingSpawnSystem.js'
import TrainingDummy, { RangedDummy, MeleeDummy, MovingDummy } from './entities/TrainingDummy.js'
import CooldownSystem    from './systems/CooldownSystem.js'
import SkillSystem       from './systems/SkillSystem.js'
import SpawnSystem       from './systems/SpawnSystem.js'
import { ENEMY_TYPES }   from '../shared/EnemyTypeConfig.js'
import { buildWallSegments, resolveWallCollision, hitsWall } from '../shared/WallCollision.js'
import { QUIZ_QUESTIONS }  from '../shared/QuizQuestions.js'
import { getUpgradePreview, getMaxTier } from '../shared/UpgradeUtils.js'

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

    // NPCs (friendly entities like Akama)
    this.npcs = new Map()         // id → ServerNPC

    // Gates (destructible objectives)
    this.gates = new Map()        // id → ServerGate
    this._activeGateIndex = 0     // which gate in the sequence is active

    // Buildings (destructible spawners)
    this.buildings = new Map()    // id → ServerBuilding
    this.buildingSpawnSystem = null

    // Level 4: warlock/boss phase tracking
    this._bossPhase = 1
    this._warlockCount = 0

    // Level 5: Illidan encounter state
    this._illidanState   = null
    this._activeEyeBeams = []
    this._eyeBeamSeq     = 0
    this._dialogSystem   = null

    // Debug: skip entrance cinematic when testing boss mechanics
    this.skipDialog = false

    // Stats tracking — cumulative across entire campaign run
    this.stats     = { damage: {}, heal: {}, deaths: {}, resurrections: {}, quiz: {}, kills: 0, startTime: 0 }
    // Per-level stats — reset at the start of each level
    this.levelStats = { damage: {}, heal: {}, resurrections: {}, kills: 0, startTime: 0 }

    // Revive tracking: deadPlayerId → { reviverId, startedAt }
    this.reviveTimers = new Map()

    // ── Level system ──────────────────────────────────────────────────────
    this.currentLevelIndex = -1
    this.currentLevel      = null
    this.spawnSystem       = null
    this._levelStartTime   = 0
    this.arenaWidth        = GAME_CONFIG.CANVAS_WIDTH
    this.arenaHeight       = GAME_CONFIG.CANVAS_HEIGHT
    this._wallSegments     = []

    // Objective progress — synced to clients via OBJECTIVE_UPDATE
    this.objectiveProgress = []

    // ── Quiz & Upgrade system ─────────────────────────────────────────────
    this._quizPhase         = null   // 'answering' | 'results' | 'upgrading'
    this._quizQuestion      = null
    this._quizAnswers       = new Map()   // playerId → chosenIndex
    this._quizResults       = new Map()   // playerId → boolean
    this._quizUpgradesDone  = new Set()
    this._usedQuestionIds   = new Set()

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
    socket.on(EVENTS.QUIT_CAMPAIGN, ()   => this._onRestartGame(socket))
    socket.on(EVENTS.HOST_ADVANCE,  ()   => this._onHostAdvance(socket))
    socket.on(EVENTS.SET_LEVEL,     data => this._onSetLevel(socket, data))
    socket.on(EVENTS.QUIZ_ANSWER,  data => this._onQuizAnswer(socket, data))
    socket.on(EVENTS.QUIZ_UPGRADE, data => this._onQuizUpgrade(socket, data))
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

  _onSetLevel(socket, { levelIndex, skipDialog }) {
    if (!this.players.get(socket.id)?.isHost) return
    if (this.scene !== 'lobby') return
    const idx = Math.max(0, Math.min(levelIndex ?? 0, CAMPAIGN.length - 1))
    this.startingLevelIndex = idx
    if (skipDialog !== undefined) this.skipDialog = !!skipDialog
    this.io.emit(EVENTS.SET_LEVEL, { levelIndex: idx, levelName: CAMPAIGN[idx].name, skipDialog: this.skipDialog })
  }

  _onStartGame(socket) {
    if (!this.players.get(socket.id)?.isHost) return
    this._startCampaign()
  }

  _onRestartGame(socket) {
    if (!this.players.get(socket.id)?.isHost) return

    this.startingLevelIndex = 0
    this.skipDialog = false

    this._setArenaSize(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)

    // Reset all players to full HP / alive
    this.players.forEach(p => {
      if (!p.isHost) {
        p.hp          = p.maxHp
        p.isDead      = false
        p.activeCast  = null
        p.shieldActive = false
        p.activeEffects = []
        p.skillUpgrades = [0, 0, 0, 0]
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
    this._changeScene('lobby')
    this.io.emit(EVENTS.SET_LEVEL, { levelIndex: 0, levelName: CAMPAIGN[0].name, skipDialog: false })
  }

  _onHostAdvance(socket) {
    if (!this.players.get(socket.id)?.isHost) return

    if (this.scene === 'quiz' && this._quizPhase === 'done') {
      // Quiz resolved — move to level-complete screen
      this._quizPhase = null
      this._quizQuestion = null
      this._showLevelComplete()
      return
    }

    if (this.scene !== 'levelComplete') return

    const nextIndex = this.currentLevelIndex + 1
    if (nextIndex >= CAMPAIGN.length) {
      this._changeScene('result')
    } else {
      this._startLevel(nextIndex)
    }
  }

  _startCampaign() {
    this.stats     = { damage: {}, heal: {}, deaths: {}, resurrections: {}, quiz: {}, kills: 0, startTime: Date.now() }
    this.levelStats = { damage: {}, heal: {}, resurrections: {}, kills: 0, startTime: Date.now() }
    this._clearCombatState()
    this._startLevel(this.startingLevelIndex ?? 0)
  }

  _startLevel(index) {
    const level = CAMPAIGN[index]
    if (!level) return

    this.currentLevelIndex = index
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
      p.hp           = p.maxHp
      p.isDead       = false
      p.activeCast   = null
      p.shieldActive = false
      p.activeEffects = []
      p.rebuildStats()
      p.setArenaSize(this.arenaWidth, this.arenaHeight)
      if (firstRoom) {
        const pad = GAME_CONFIG.PLAYER_RADIUS + 10
        p.x = firstRoom.x + pad + Math.random() * (firstRoom.width - pad * 2)
        p.y = firstRoom.y + pad + Math.random() * (firstRoom.height - pad * 2)
      } else {
        const { x, y } = this._randomPointNearCenter(400, 250)
        p.x = x
        p.y = y
      }
    })

    // Compute player count for difficulty scaling
    let playerCount = 0
    this.players.forEach(p => { if (!p.isHost) playerCount++ })

    const diff = level.difficulty ?? {}
    const hpMult     = (diff.hpMult?.base ?? 1)     + (diff.hpMult?.perPlayer ?? 0)     * (playerCount - 1)
    const damageMult = (diff.damageMult?.base ?? 1) + (diff.damageMult?.perPlayer ?? 0) * (playerCount - 1)

    // Set up spawn system if level has spawning
    if (level.spawning) {
      this.spawnSystem = new SpawnSystem(level, playerCount)
    }

    // Set up boss if level has one
    if (level.boss) {
      this.boss = new ServerBoss(level.boss, { hpMult, damageMult, arenaWidth: this.arenaWidth, arenaHeight: this.arenaHeight })
      // Custom boss spawn position
      if (level.bossSpawnPosition) {
        this.boss.x = level.bossSpawnPosition.x
        this.boss.y = level.bossSpawnPosition.y
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
    if (level.warlocks && this.boss) {
      const wCfg = level.warlocks
      const count = wCfg.count ?? 6
      const circleR = wCfg.circleRadius ?? 120
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        const wx = this.boss.x + Math.cos(angle) * circleR
        const wy = this.boss.y + Math.sin(angle) * circleR
        const base = ENEMY_TYPES.warlock
        const id = ++this._enemyIdSeq.value
        const warlock = new ServerEnemy({
          id,
          x: wx,
          y: wy,
          type: 'warlock',
          hp: Math.round(base.hp * hpMult),
          maxHp: Math.round(base.hp * hpMult),
          speed: base.speed,
          radius: base.radius,
          contactDamage: base.contactDamage,
        })
        warlock.setArenaSize(this.arenaWidth, this.arenaHeight)
        warlock._channelTarget = this.boss.id
        this.enemies.set(id, warlock)
        this._warlockCount++
      }
      // Boss starts immune in phase 1
      this.boss.isImmune = true
    }

    // Spawn initial enemies (Level 3 — Leviathan)
    if (level.initialEnemies?.length) {
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
          contactDamage: Math.round(base.contactDamage * damageMult),
          generation: entry.generation ?? 0,
        })
        enemy.setArenaSize(this.arenaWidth, this.arenaHeight)
        this.enemies.set(id, enemy)
      }
    }

    // Illidan encounter setup (Level 5)
    if (level.boss === 'ILLIDAN' && this.boss) {
      this._illidanState = {
        phase2AddsSpawned:    false,
        flameOfAzzinothIds:   new Set(),
        phase3Entered:        false,
        auraDreadLastTick:    0,
        phase2TransitionDone: false,
      }
      this._activeEyeBeams = []

      // Wire phase-change callback
      this.boss.onPhaseChange = (phase) => {
        this.io.emit(EVENTS.ILLIDAN_PHASE_TRANSITION, { phase })
        if (phase === 2) this._onIllidanPhase2()
      }

      // Start entrance cinematic — boss is immune until dialog completes
      if (level.dialog?.length && !this.skipDialog) {
        this.boss.isImmune = true
        this._dialogSystem = new DialogSystem({
          lines: level.dialog,
          onComplete: () => {
            if (this.boss) this.boss.isImmune = false
            this._dialogSystem = null
          },
        })
        this._dialogSystem.start((event, data) => this.io.emit(event, data))
      }
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
      gates:       this._gatesDTO(),
      buildings:   this._buildingsDTO(),
      npcs:        this._npcsDTO(),
      rooms:       level.arena?.rooms ?? [],
      passages:    level.arena?.passages ?? [],
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
    this._bossPhase    = 1
    this._warlockCount = 0
    this._lastSpawn    = 0
    this.spawnSystem   = null
    this.skillSystem.activeZones    = []
    this.skillSystem._pendingBursts = []

    // Illidan state
    if (this._dialogSystem) { this._dialogSystem.destroy(); this._dialogSystem = null }
    this._illidanState   = null
    this._activeEyeBeams = []
  }

  _resetPlayerInputs() {
    this.players.forEach(p => {
      if (p.isHost) return
      p.setMoveInput(0, 0)
      p.activeCast = null
      p.shieldActive = false
    })

    this.inputQueues.forEach(queue => {
      queue.length = 0
    })
  }

  _onDisconnect(socket) {
    const player = this.players.get(socket.id)
    console.log(`[-] disconnect  ${player?.name ?? socket.id}`)

    this.players.delete(socket.id)
    this.inputQueues.delete(socket.id)
    this.cooldowns.clearPlayer(socket.id)
    this.minions.forEach((m, id) => { if (m.ownerId === socket.id) this.minions.delete(id) })

    this.io.emit(EVENTS.PLAYER_LEFT, socket.id)

    // If a player disconnects mid-quiz, re-check whether we can advance the phase
    // so the remaining connected players are not left waiting forever.
    if (this.scene === 'quiz') {
      const participants = this._getQuizParticipants()
      if (this._quizPhase === 'answering') {
        if (participants.length === 0 || this._quizAnswers.size >= participants.length) {
          this._resolveQuiz()
        }
      } else if (this._quizPhase === 'upgrading') {
        // Treat the disconnected player as having finished their upgrade choice
        this._quizUpgradesDone.add(socket.id)
        if (participants.length === 0 || this._quizUpgradesDone.size >= participants.length) {
          this._finishQuiz()
        }
      }
    }
  }

  // ── Scene management ───────────────────────────────────────────────────────

  _changeScene(name, extra = {}) {
    this._resetPlayerInputs()

    if (name === 'lobby') {
      this._setArenaSize(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)
      this._wallSegments = []
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
      this.npcs.clear()
      this.gates.clear()
      this._activeGateIndex = 0
      this.buildings.clear()
      this.buildingSpawnSystem = null
      this._bossPhase    = 1
      this._warlockCount = 0
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

    // 2b. Wall collision for players
    if (this._wallSegments.length > 0) {
      const isGateDead = (id) => this._isGateDead(id)
      this.players.forEach(p => {
        if (p.isHost || p.isDead) return
        const resolved = resolveWallCollision(p.x, p.y, GAME_CONFIG.PLAYER_RADIUS, this._wallSegments, isGateDead)
        p.x = resolved.x
        p.y = resolved.y
      })
    }

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

      // Update enemies (AI + contact damage + split-on-death)
      this._updateEnemies(dt, now)

      // Update boss
      if (this.boss) {
        this._updateBoss(dt, now)
      }

      // Update NPCs (Akama attacks boss)
      if (this.npcs.size > 0) {
        this._updateNPCs(dt, now)
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
    if (this.scene !== 'lobby' && this.scene !== 'battle' && this.scene !== 'bossFight') return

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
    // Provide active gate to enemy AI context (for gate repairer)
    const activeGate = this._getActiveGate()
    const ctx = { enemies: this.enemies, now, projectiles: this.projectiles, enemyIdSeq: this._enemyIdSeq, activeGate }

    // Collect enemies to spawn from split-on-death (defer to avoid modifying map during iteration)
    const pendingSplits = []
    let warlockAliveCount = 0

    this.enemies.forEach((e, id) => {
      if (e.isDead) {
        this.enemies.delete(id)
        this.killCount++
        this._killsByType[e.type] = (this._killsByType[e.type] ?? 0) + 1
        this.stats.kills = this.killCount

        // Notify spawn systems
        if (this.spawnSystem) {
          this.spawnSystem.onEnemyDied()
        }
        if (this.buildingSpawnSystem) {
          this.buildingSpawnSystem.onEnemyDied(id)
        }

        // Split-on-death: queue child spawns
        if (e.splitOnDeath && e.generation < (e.splitOnDeath.maxGenerations - 1)) {
          const split = e.splitOnDeath
          const mult  = split.statMultiplier
          const base  = ENEMY_TYPES[e.type]
          if (base) {
            const childGen = e.generation + 1
            for (let i = 0; i < split.count; i++) {
              const angle = (i / split.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
              const dist = e.radius * 1.5 + 20
              const offsetX = Math.cos(angle) * dist
              const offsetY = Math.sin(angle) * dist
              pendingSplits.push({
                type:          e.type,
                x:             e.x + offsetX,
                y:             e.y + offsetY,
                generation:    childGen,
                hp:            Math.round(e.maxHp * mult),
                speed:         e.speed * mult,
                radius:        Math.round(e.radius * mult),
                contactDamage: Math.round(e.contactDamage * mult),
              })
            }
          }
        }

        // Track warlock deaths for Phase 2 transition (Level 4)
        if (e.type === 'warlock') {
          // warlockAliveCount will be recounted below
        }

        // Flame of Azzinoth deaths → trigger Phase 3 (Level 5)
        if (this._illidanState?.flameOfAzzinothIds.has(id)) {
          this._illidanState.flameOfAzzinothIds.delete(id)
          if (this._illidanState.flameOfAzzinothIds.size === 0) {
            this._onIllidanPhase3()
          }
        }

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
      if (e.type === 'shadowDemon' && now - e._lastContactDamage > 1000) {
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          const dist = Math.hypot(p.x - e.x, p.y - e.y)
          if (dist <= GAME_CONFIG.PLAYER_RADIUS + e.radius) {
            if (p.isShieldBlocking(e.x, e.y)) return
            e._lastContactDamage = now
            p.takeDamage(p.maxHp * 10)   // effectively instant kill
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: 9999, type: 'damage', sourceSkill: 'Shadow Demon' })
            if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
        })
      }

      // Shadowfiend: infects next player on contact (Level 5)
      if (e.type === 'shadowfiend' && !e._infectedTarget && now - e._lastContactDamage > 500) {
        this.players.forEach(p => {
          if (p.isHost || p.isDead || p.id === e.sourcePlayerId) return
          const dist = Math.hypot(p.x - e.x, p.y - e.y)
          if (dist <= GAME_CONFIG.PLAYER_RADIUS + e.radius) {
            e._infectedTarget = true
            e._lastContactDamage = now
            e.isDead = true   // self-destruct after infecting
            // Apply Parasitic Shadowfiend debuff to the new player
            p.activeEffects = p.activeEffects ?? []
            p.activeEffects = p.activeEffects.filter(ef => ef.source !== 'illidan:parasiticShadowfiend')
            const abilityConfig = (ILLIDAN_CONFIG.phaseAbilities[1] ?? []).find(a => a.type === 'parasiticShadowfiend')
            p.activeEffects.push({
              source:    'illidan:parasiticShadowfiend',
              params:    { dotDamage: abilityConfig?.dotDamage ?? 30, spawnCount: abilityConfig?.spawnCount ?? 2, targetId: p.id },
              expiresAt: now + (abilityConfig?.dotDuration ?? 10000),
              lastTick:  now,
              tickRate:  abilityConfig?.dotInterval ?? 2000,
            })
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: 0, type: 'damage', sourceSkill: 'Parasitic Shadowfiend' })
          }
        })
      }

      // Contact damage to players (rate-limited: once per 500ms per enemy)
      if (e.contactDamage > 0 && now - e._lastContactDamage > 500) {
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

    // Spawn split children
    for (const child of pendingSplits) {
      const id = ++this._enemyIdSeq.value
      const enemy = new ServerEnemy({
        id,
        x:             child.x,
        y:             child.y,
        type:          child.type,
        hp:            child.hp,
        maxHp:         child.hp,
        speed:         child.speed,
        radius:        child.radius,
        contactDamage: child.contactDamage,
        generation:    child.generation,
      })
      enemy.setArenaSize(this.arenaWidth, this.arenaHeight)
      this.enemies.set(id, enemy)
    }

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

    // Warlock channeling buff application (continuous while alive)
    if (this.boss && this.boss.isImmune) {
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
        radius: 5,
        range: 500,
        distTraveled: 0,
        damage: action.damage,
        color: action.color,
        isAlive: true,
        isEnemyProj: true,
        ownerId: enemyId,
        hit: hitSet,
      })
    } else if (action.action === 'repair') {
      // Gate repairer heals the active gate
      const gate = this.gates.get(action.gateId)
      if (gate) gate.repair(action.amount)
    } else if (action.action === 'leaveBlaze') {
      // Flame of Azzinoth drops a persistent fire circle
      this.skillSystem.addZone('enemy_' + enemyId, {
        radius:   action.radius,
        duration: 30000,
        damage:   25,
        tickRate: 1000,
      }, action.x, action.y, '#ff4400')
    } else if (action.action === 'burningAuraTick') {
      // Flame of Azzinoth burning aura — damage nearby players
      this.players.forEach(p => {
        if (p.isHost || p.isDead) return
        const d = Math.hypot(p.x - action.x, p.y - action.y)
        if (d <= action.radius + GAME_CONFIG.PLAYER_RADIUS) {
          p.takeDamage(action.damage)
          this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: action.damage, type: 'damage', sourceSkill: 'Burning Aura' })
          if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
        }
      })
    }
    // 'heal', 'channel', 'leaveBlaze', 'burningAuraTick' handled above
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
      this.boss.speed = BOSS_CONFIG.SHADE_OF_AKAMA?.phases?.[1]?.speed ?? 0.6
    }

    // Activate NPCs
    this.npcs.forEach(npc => {
      if (npc.idleUntilPhase <= 2) npc.activate()
    })

    // Activate phase-gated spawning
    if (this.spawnSystem) {
      this.spawnSystem.setPhase(2)
    }
  }

  // ── Boss management ─────────────────────────────────────────────────────────

  _updateBoss(dt, now) {
    if (!this.boss) return

    // ── Illidan encounter ──────────────────────────────────────────────────
    if (this.currentLevel?.boss === 'ILLIDAN') {
      this._updateIllidan(dt, now)
      return
    }

    // ── Generic boss (Shade of Akama) ──────────────────────────────────────
    if (this.boss.isImmune) return  // Shade Phase 1: idle, immune

    const bossConfig = BOSS_CONFIG[this.currentLevel?.boss]
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

  // ── Illidan Stormrage update ─────────────────────────────────────────────

  _updateIllidan(dt, now) {
    if (!this.boss || !this._illidanState) return

    // Phase 2: boss is outside the map — skip movement/contact but fire abilities
    if (this.boss.isImmune && this._illidanState.phase2AddsSpawned) {
      const attacks = this.boss.updateAbilities(dt, this.players, now)
      for (const attack of attacks) this._handleIllidanAbility(attack, now)
      this._tickIllidanEyeBeams(now)
      this._tickIllidanEffects(now)
      return
    }

    // Skip if immune for other reasons (dialog, phase transition)
    if (this.boss.isImmune) return

    // Normal movement toward nearest player
    this.boss.update(dt, this.players)

    // Fire phase-aware abilities
    const attacks = this.boss.updateAbilities(dt, this.players, now)
    for (const attack of attacks) this._handleIllidanAbility(attack, now)

    // Tick eye beams (Phase 2 only, but safe to call always)
    this._tickIllidanEyeBeams(now)

    // Tick Illidan-specific player debuffs
    this._tickIllidanEffects(now)

    // Aura of Dread — Phase 3 passive
    if (this.boss.phase === 3) {
      const aura = ILLIDAN_CONFIG.phase3Aura
      if (now - this._illidanState.auraDreadLastTick >= aura.tickRate) {
        this._illidanState.auraDreadLastTick = now
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          const d = Math.hypot(p.x - this.boss.x, p.y - this.boss.y)
          if (d <= aura.radius + GAME_CONFIG.PLAYER_RADIUS) {
            p.takeDamage(aura.damage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: aura.damage, type: 'damage', sourceSkill: 'Aura of Dread' })
            if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
        })
      }
    }

    // Melee contact damage
    this.players.forEach(p => {
      if (p.isHost || p.isDead) return
      const d = Math.hypot(p.x - this.boss.x, p.y - this.boss.y)
      if (d <= this.boss.radius + GAME_CONFIG.PLAYER_RADIUS + 5) {
        if (p.isShieldBlocking(this.boss.x, this.boss.y)) return
        if (!p._lastBossContact) p._lastBossContact = 0
        if (now - p._lastBossContact > 500) {
          p._lastBossContact = now
          const dmg = Math.round(ILLIDAN_CONFIG.meleeDamage * this.boss._damageMult)
          p.takeDamage(dmg)
          if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
        }
      }
    })
  }

  /** Handle a single Illidan ability attack object. */
  _handleIllidanAbility(attack, now) {
    if (!attack || !this.boss) return

    const applyDeath = (p) => {
      if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
    }

    switch (attack.type) {

      case 'flameCrash': {
        const crashX = attack.bossX
        const crashY = attack.bossY
        this.boss.isImmune = true
        setTimeout(() => {
          if (!this.boss || this.boss.isDead) return
          this.boss.isImmune = false
          this.players.forEach(p => {
            if (p.isHost || p.isDead) return
            const d = Math.hypot(p.x - crashX, p.y - crashY)
            if (d <= attack.radius + GAME_CONFIG.PLAYER_RADIUS) {
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
          }, crashX, crashY, '#0044ff')
        }, 1500)
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
          if (dist > attack.coneRange + GAME_CONFIG.PLAYER_RADIUS) return
          const angle = Math.atan2(dy, dx)
          let diff = Math.abs(angle - facing)
          if (diff > Math.PI) diff = 2 * Math.PI - diff
          if (diff <= coneHalfRad) {
            if (p.isShieldBlocking(attack.bossX, attack.bossY)) return
            p.takeDamage(attack.damage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: attack.damage, type: 'damage', sourceSkill: 'Draw Soul' })
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
          params:    { maxHpReduction: attack.maxHpReduction },
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
          params:   { dotDamage: attack.dotDamage, spawnCount: attack.spawnCount, targetId: target.id },
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
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          const d = Math.hypot(p.x - target.x, p.y - target.y)
          if (d <= attack.splashRadius + GAME_CONFIG.PLAYER_RADIUS) {
            if (p.isShieldBlocking(attack.bossX, attack.bossY)) return
            p.takeDamage(attack.damage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: attack.damage, type: 'damage', sourceSkill: 'Fireball' })
            applyDeath(p)
          }
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
          params:    { dotDamage: attack.dotDamage },
          expiresAt: now + attack.dotDuration,
          lastTick:  now,
          tickRate:  attack.dotInterval,
        })
        this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: target.id, amount: 0, type: 'damage', sourceSkill: 'Dark Barrage' })
        break
      }

      case 'eyeBeams': {
        for (let i = 0; i < 2; i++) {
          const x1 = 80 + Math.random() * (this.arenaWidth  - 160)
          const y1 = 80 + Math.random() * (this.arenaHeight - 160)
          const angle = Math.random() * Math.PI * 2
          const x2 = x1 + Math.cos(angle) * attack.lineLength
          const y2 = y1 + Math.sin(angle) * attack.lineLength
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
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          const d = Math.hypot(p.x - primary.x, p.y - primary.y)
          if (d <= attack.splashRadius + GAME_CONFIG.PLAYER_RADIUS) {
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
          params:    { dotDamage: attack.dotDamage, dotRadius: attack.dotRadius, targetId: primary.id },
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
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          const d = Math.hypot(p.x - target.x, p.y - target.y)
          if (d <= attack.splashRadius + GAME_CONFIG.PLAYER_RADIUS) {
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
            hp: base.hp, maxHp: base.hp,
            speed: base.speed,
            radius: base.radius,
            contactDamage: 0,
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

  /** Transition Illidan to Phase 2: teleport outside map, spawn Flame of Azzinoth adds. */
  _onIllidanPhase2() {
    if (!this.boss || !this._illidanState) return
    if (this._illidanState.phase2AddsSpawned) return
    this._illidanState.phase2AddsSpawned = true

    console.log('[Illidan] Phase 2 — flying outside map')

    this.boss.isImmune = true
    this.boss.x = ILLIDAN_CONFIG.phase2Position.x
    this.boss.y = ILLIDAN_CONFIG.phase2Position.y

    const diff = this.currentLevel?.difficulty ?? {}
    let playerCount = 0
    this.players.forEach(p => { if (!p.isHost) playerCount++ })
    const hpMult = (diff.hpMult?.base ?? 1) + (diff.hpMult?.perPlayer ?? 0) * (playerCount - 1)

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
        contactDamage: 0,
      })
      add.setArenaSize(this.arenaWidth, this.arenaHeight)
      this.enemies.set(id, add)
      this._illidanState.flameOfAzzinothIds.add(id)
    }
  }

  /** Transition Illidan to Phase 3: return to map, become vulnerable. */
  _onIllidanPhase3() {
    if (!this.boss || !this._illidanState) return
    if (this._illidanState.phase3Entered) return
    this._illidanState.phase3Entered = true

    console.log('[Illidan] Phase 3 — demon form')

    this.boss.phase = 3
    this.boss.isImmune = false
    this.boss.speed = 2.0
    this.boss.x = this.arenaWidth  / 2
    this.boss.y = this.arenaHeight / 2

    this.io.emit(EVENTS.ILLIDAN_PHASE_TRANSITION, { phase: 3 })
  }

  /** Advance eye beam progress; leave ground fire zones along the path. */
  _tickIllidanEyeBeams(now) {
    for (let i = this._activeEyeBeams.length - 1; i >= 0; i--) {
      const beam = this._activeEyeBeams[i]
      const progress = Math.min(1, (now - beam.startedAt) / beam.drawDuration)

      const tipX = beam.x1 + (beam.x2 - beam.x1) * progress
      const tipY = beam.y1 + (beam.y2 - beam.y1) * progress

      // Damage players near the tip every 500ms while still drawing
      if (progress < 1 && now - beam.lastDamageTick >= 500) {
        beam.lastDamageTick = now
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          const d = Math.hypot(p.x - tipX, p.y - tipY)
          if (d <= 35 + GAME_CONFIG.PLAYER_RADIUS) {
            p.takeDamage(beam.damage)
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: beam.damage, type: 'damage', sourceSkill: 'Eye Beams' })
            if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
        })
      }

      // Leave ground fire zones periodically (every ~10% of the path)
      const pctSinceLastZone = progress - (beam.lastFireZonePct ?? 0)
      if (pctSinceLastZone >= 0.1) {
        beam.lastFireZonePct = progress
        const gf = beam.groundFire
        this.skillSystem.addZone('boss', {
          radius: gf.radius, duration: gf.duration,
          damage: gf.tickDamage, tickRate: gf.tickRate,
        }, tipX, tipY, '#6600cc')
      }

      if (progress >= 1) this._activeEyeBeams.splice(i, 1)
    }
  }

  /** Tick Illidan-specific player debuffs (DoTs, spawn-on-expiry). */
  _tickIllidanEffects(now) {
    this.players.forEach(p => {
      if (p.isDead || !p.activeEffects?.length) return

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
            toSpawn.push({ type: 'shadowfiend', count: eff.params.spawnCount, x: p.x, y: p.y, sourcePlayerId: p.id })
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
              const d = Math.hypot(other.x - p.x, other.y - p.y)
              if (d <= eff.params.dotRadius + GAME_CONFIG.PLAYER_RADIUS) {
                other.takeDamage(eff.params.dotDamage)
                this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: other.id, amount: eff.params.dotDamage, type: 'damage', sourceSkill: 'Agonizing Flames' })
                if (other.isDead) this.stats.deaths[other.id] = (this.stats.deaths[other.id] ?? 0) + 1
              }
            })
          }
        }
      }

      // Spawn shadowfiends on Parasitic Shadowfiend expiry
      for (const spawn of toSpawn) {
        const base = ENEMY_TYPES[spawn.type]
        if (!base) continue
        for (let i = 0; i < spawn.count; i++) {
          const angle = (i / spawn.count) * Math.PI * 2
          const sx = spawn.x + Math.cos(angle) * 30
          const sy = spawn.y + Math.sin(angle) * 30
          const id = ++this._enemyIdSeq.value
          const fiend = new ServerEnemy({
            id,
            x: sx, y: sy,
            type: spawn.type,
            hp: base.hp, maxHp: base.hp,
            speed: base.speed,
            radius: base.radius,
            contactDamage: 0,
          })
          fiend.setArenaSize(this.arenaWidth, this.arenaHeight)
          fiend.sourcePlayerId = spawn.sourcePlayerId
          this.enemies.set(id, fiend)
        }
      }

      // Expire illidan effects (normal effects are expired by SkillSystem._tickEffects)
      p.activeEffects = p.activeEffects.filter(e =>
        !e.source?.startsWith('illidan:') || now < e.expiresAt
      )
    })
  }

  /** Shade of Akama Phase 2: chase and melee-attack NPC target. */
  _updateBossTargetingNPC(dt, now, npc, bossConfig) {
    if (!npc || npc.isDead || this.boss.isDead) return

    // Chase NPC
    const dx   = npc.x - this.boss.x
    const dy   = npc.y - this.boss.y
    const dist = Math.hypot(dx, dy)

    if (dist > 5) {
      const pps = this.boss.speed * 60
      this.boss.x += (dx / dist) * pps * dt
      this.boss.y += (dy / dist) * pps * dt
      this.boss.angle = Math.atan2(dy, dx)
      this.boss.x = Math.max(this.boss.radius, Math.min(this.arenaWidth  - this.boss.radius, this.boss.x))
      this.boss.y = Math.max(this.boss.radius, Math.min(this.arenaHeight - this.boss.radius, this.boss.y))
    }

    // Melee attack NPC when in range
    const attackRange = bossConfig.attackRange ?? 60
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
      }
    })

    if (needAdvance) {
      this._activeGateIndex++
      this._activateNextGate()
    }
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
        const reviverId = existing.reviverId
        this.stats.resurrections[reviverId]     = (this.stats.resurrections[reviverId]     ?? 0) + 1
        this.levelStats.resurrections[reviverId] = (this.levelStats.resurrections[reviverId] ?? 0) + 1
      }
    })
  }

  // ── Objective evaluation ───────────────────────────────────────────────────

  _updateObjectives(now) {
    if (!this.currentLevel) return

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
          // Complete when no enemies remain (including no pending splits)
          const enemyCount = this.enemies.size
          obj.current = enemyCount === 0 ? 1 : 0
          if (enemyCount > 0) allComplete = false
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
      this.currentLevelIndex = -1
      this.currentLevel      = null
      this._changeScene('gameover', { cumulativeStats: { ...this.stats } })
      return
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
      this._changeScene('result', { cumulativeStats: { ...this.stats } })
    } else if (GAME_CONFIG.QUIZ_BETWEEN_LEVELS) {
      // Start quiz phase before showing level-complete
      this._startQuiz()
    } else {
      // Show level-complete screen and wait for host to advance
      this._showLevelComplete()
    }
  }

  _showLevelComplete() {
    this._changeScene('levelComplete', {
      levelIndex: this.currentLevelIndex,
      levelName: this.currentLevel?.name ?? '',
      totalLevels: CAMPAIGN.length,
      stats: { ...this.levelStats },
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
      levelName: this.currentLevel?.name ?? '',
      totalLevels: CAMPAIGN.length,
    })

    // Send question to all (without correctIndex)
    this.io.emit(EVENTS.QUIZ_QUESTION, {
      question: question.question,
      options:  question.options,
    })
  }

  _getQuizParticipants() {
    const participants = []
    this.players.forEach(p => { if (!p.isHost) participants.push(p) })
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

    // Mark wrong players as upgrade-done immediately
    for (const p of participants) {
      if (!this._quizResults.get(p.id)) {
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
      this._changeScene('gameover', { cumulativeStats: { ...this.stats } })
    }
  }

  // ── State serialisation ────────────────────────────────────────────────────

  /** Full snapshot — sent once to a joining player. */
  _fullState() {
    const players = {}
    this.players.forEach((p, id) => { players[id] = p.toDTO() })
    return {
      players,
      scene:       this.scene,
      tick:        this.tick,
      killCount:   this.killCount,
      boss:        this.boss ? this.boss.toDTO() : null,
      arenaWidth:  this.arenaWidth,
      arenaHeight: this.arenaHeight,
      levelIndex:  this.currentLevelIndex,
      totalLevels: CAMPAIGN.length,
      levelName:   this.currentLevel?.name ?? null,
      objectives:  this.objectiveProgress,
      gates:       this._gatesDTO(),
      buildings:   this._buildingsDTO(),
      npcs:        this._npcsDTO(),
      rooms:       this.currentLevel?.arena?.rooms ?? [],
      passages:    this.currentLevel?.arena?.passages ?? [],
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
      stats:       this.levelStats,
      aoeZones:    this.skillSystem.getZonesDTO(),
      minions,
      gates:       this._gatesDTO(),
      buildings:   this._buildingsDTO(),
      npcs:        this._npcsDTO(),
      waveInfo:    this._waveInfoDTO(),
      eyeBeams:    this._eyeBeamsDTO(),
    }
  }

  _eyeBeamsDTO() {
    if (!this._activeEyeBeams.length) return null
    const now = Date.now()
    return this._activeEyeBeams.map(b => ({
      id:       b.id,
      x1: b.x1, y1: b.y1,
      x2: b.x2, y2: b.y2,
      progress: Math.min(1, (now - b.startedAt) / b.drawDuration),
    }))
  }

  _gatesDTO() {
    if (this.gates.size === 0) return null
    const arr = []
    this.gates.forEach(g => arr.push(g.toDTO()))
    return arr
  }

  _buildingsDTO() {
    if (this.buildings.size === 0) return null
    const arr = []
    this.buildings.forEach(b => arr.push(b.toDTO()))
    return arr
  }

  _npcsDTO() {
    if (this.npcs.size === 0) return null
    const arr = []
    this.npcs.forEach(n => arr.push(n.toDTO()))
    return arr
  }

  _waveInfoDTO() {
    if (this.spawnSystem?.mode !== 'wave') return null
    return {
      currentWave: this.spawnSystem.currentWave,
      totalWaves:  this.spawnSystem.waveCount,
      allComplete: this.spawnSystem.allWavesComplete,
    }
  }
}
