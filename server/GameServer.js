import { EVENTS }          from '../shared/protocol.js'
import { GAME_CONFIG }     from '../shared/GameConfig.js'
import { CAMPAIGN, DEBUG_TEST_LEVEL, LEVEL_SELECT_OPTIONS } from '../shared/LevelConfig.js'
import { ILLIDAN_CONFIG }        from '../shared/IllidanConfig.js'
import { SHADE_OF_AKAMA_CONFIG } from '../shared/ShadeOfAkamaConfig.js'
import DialogSystem        from './systems/DialogSystem.js'
import { CLASSES, CLASS_NAMES, resolveClassName } from '../shared/ClassConfig.js'
import ServerPlayer      from './entities/ServerPlayer.js'
import ServerEnemy       from './entities/ServerEnemy.js'
import ServerBoss        from './entities/ServerBoss.js'
import ServerNPC         from './entities/ServerNPC.js'
import ServerGate        from './entities/ServerGate.js'
import ServerBuilding    from './entities/ServerBuilding.js'
import BuildingSpawnSystem from './systems/BuildingSpawnSystem.js'
import PortalBeamSystem   from './systems/PortalBeamSystem.js'
import IllidanEncounter   from './systems/IllidanEncounter.js'
import BotController      from './systems/BotController.js'
import { buildFullState, buildDeltaState, gatesDTO, buildingsDTO, npcsDTO } from './systems/StateSerializer.js'
import TrainingDummy, { RangedDummy, MeleeDummy, MovingDummy } from './entities/TrainingDummy.js'
import CooldownSystem    from './systems/CooldownSystem.js'
import SkillSystem       from './systems/SkillSystem.js'
import SpawnSystem       from './systems/SpawnSystem.js'
import { ENEMY_TYPES }   from '../shared/EnemyTypeConfig.js'
import { buildWallSegments, resolveWallCollision, hitsWall } from '../shared/WallCollision.js'
import { QUIZ_QUESTIONS }  from '../shared/QuizQuestions.js'
import { getUpgradePreview, getMaxTier } from '../shared/UpgradeUtils.js'

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
    this.portalBeamSystem    = null

    // Level 4: warlock/boss phase tracking
    this._bossPhase = 1
    this._warlockCount = 0

    this.minionSpawnSystem  = null   // ambient minions (activated after dialog)
    this._illidanEncounter  = null   // IllidanEncounter instance for Level 6
    this._dialogSystem      = null

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

    // Bot players (server-side fake players for solo testing)
    this.bots    = new Map()   // botId → { socket (stub), wanderAngle, wanderTimer }
    this._botSeq = 0

    this._botController = new BotController({
      bots:        this.bots,
      players:     this.players,
      inputQueues: this.inputQueues,
      enemies:     this.enemies,
      getBoss:     () => this.boss,
    })

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
    socket.on(EVENTS.BOT_ADD,              data => this._onBotAdd(socket, data))
    socket.on(EVENTS.BOT_REMOVE,           ()   => this._onBotRemove(socket))
    socket.on(EVENTS.DEBUG_SET_SKILL_TIER, data => this._onDebugSetSkillTier(socket, data))
    socket.on(EVENTS.DEBUG_SPAWN_ENEMY,    data => this._onDebugSpawnEnemy(socket, data))
    socket.on(EVENTS.DEBUG_CLEAR_ENEMIES,  ()   => this._onDebugClearEnemies(socket))
    socket.on(EVENTS.QUIZ_ANSWER,  data => this._onQuizAnswer(socket, data))
    socket.on(EVENTS.QUIZ_UPGRADE, data => this._onQuizUpgrade(socket, data))
    socket.on('disconnect',         ()   => this._onDisconnect(socket))
  }

  // ── Socket event handlers ──────────────────────────────────────────────────

  _onJoin(socket, data) {
    const { name, className, isHost, isBot, sessionToken } = data ?? {}

    // Reconnect: reclaim a bot-controlled character via session token
    if (sessionToken && !isBot && !isHost) {
      for (const [botId, botEntry] of this.bots) {
        const existing = this.players.get(botId)
        if (existing?.sessionToken === sessionToken) {
          this._reclaimBotPlayer(socket, botId, existing)
          return
        }
      }
    }

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

    // Full snapshot for the new arrival
    socket.emit(EVENTS.INIT, buildFullState(this))

    // Tell everyone else
    this.io.emit(EVENTS.PLAYER_JOINED, player.toDTO())
  }

  _reclaimBotPlayer(socket, oldId, player) {
    player.id    = socket.id
    player.isBot = false

    this.players.set(socket.id, player)
    this.players.delete(oldId)

    this.inputQueues.set(socket.id, this.inputQueues.get(oldId) ?? [])
    this.inputQueues.delete(oldId)

    // Cooldowns stay keyed to old id — clear them (minor penalty is acceptable)
    this.cooldowns.clearPlayer(oldId)

    this.bots.delete(oldId)

    // Tell clients old id is gone, new player entity takes over
    this.io.emit(EVENTS.PLAYER_LEFT, oldId)
    socket.emit(EVENTS.INIT, buildFullState(this))
    this.io.emit(EVENTS.PLAYER_JOINED, player.toDTO())

    console.log(`[↩] reclaimed  ${player.name.padEnd(16)} socket=${socket.id}`)
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
    for (const player of this.players.values()) {
      if (player.isHost) continue
      player.skillUpgrades[skillIndex] = tier
    }
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

  _tickBotAI() {
    this._botController.update()
  }

  // ── Campaign flow ──────────────────────────────────────────────────────────

  _onSetLevel(socket, { levelIndex, skipDialog }) {
    if (!this.players.get(socket.id)?.isHost) return
    if (this.scene !== 'lobby') return
    const idx = Math.max(0, Math.min(levelIndex ?? 0, LEVEL_SELECT_OPTIONS.length - 1))
    const level = this._getLevelBySelectionIndex(idx)
    this.startingLevelIndex = idx
    if (skipDialog !== undefined) this.skipDialog = !!skipDialog
    this.io.emit(EVENTS.SET_LEVEL, { levelIndex: idx, levelName: level.name, skipDialog: this.skipDialog })
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
    this.io.emit(EVENTS.SET_LEVEL, { levelIndex: 0, levelName: LEVEL_SELECT_OPTIONS[0].name, skipDialog: false })
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
    const selected = this._getLevelBySelectionIndex(this.startingLevelIndex ?? 0)
    if (selected.id === DEBUG_TEST_LEVEL.id) {
      this._startLevel(selected)
      return
    }
    this._startLevel(this.startingLevelIndex ?? 0)
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
      p.hp              = p.maxHp
      p.isDead          = false
      p.activeCast      = null
      p.shieldActive    = false
      p.activeEffects   = []
      p.bladestormActive = false
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
      // Portal beam mechanic (The Siege)
      if (level.beamMechanic && level.mirrors?.length) {
        this.portalBeamSystem = new PortalBeamSystem(
          level.beamMechanic, level.mirrors,
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
          meleeDamage: Math.round(base.meleeDamage * damageMult),
          generation: entry.generation ?? 0,
        })
        enemy.setArenaSize(this.arenaWidth, this.arenaHeight)
        this.enemies.set(id, enemy)
      }
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
      this._dialogSystem.start((event, data) => this.io.emit(event, data))
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
      rooms:       level.arena?.rooms ?? [],
      passages:    level.arena?.passages ?? [],
      mirrors:     level.mirrors ?? [],
      debugSandbox: !!level.debugSandbox,
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
    this._bossPhase    = 1
    this._warlockCount = 0
    this._lastSpawn    = 0
    this.spawnSystem   = null
    this.skillSystem.activeZones    = []
    this.skillSystem._pendingBursts = []

    // Encounter systems
    this.minionSpawnSystem = null
    this._illidanEncounter = null
    if (this._dialogSystem) { this._dialogSystem.destroy(); this._dialogSystem = null }
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

    // During active combat, convert to bot so the character keeps fighting
    if (player && !player.isHost && !player.isBot &&
        (this.scene === 'battle' || this.scene === 'bossFight')) {
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
      console.log(`[↩] bot-ified   ${player.name} (will reclaim on reconnect)`)
      return
    }

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
      levelId: this.currentLevel?.id ?? null,
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
        const resolved = resolveWallCollision(p.x, p.y, GAME_CONFIG.PLAYER_RADIUS_X, this._wallSegments, isGateDead)
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
        // Level 4: pause ambient spawning while any Leviathan is alive
        const leviathanAlive = [...this.enemies.values()].some(e => !e.isDead && e.type === 'leviathan')
        if (!leviathanAlive) {
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
    this.io.emit(EVENTS.STATE_DELTA, buildDeltaState(this))
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

    // Bladestorm suppresses all other skills while active
    if (player.bladestormActive && config.subtype !== 'BLADESTORM') return

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

    // Non-directional CAST abilities (e.g. Mass Resurrection) set activeCast here but don't
    // fire their payload until the cast bar completes. SKILL_FIRED is deferred to _tickCasts()
    // so VFX and sprite animations align with the actual payload execution.
    if (config.type === 'CAST' && config.inputType !== 'DIRECTIONAL') return

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
      radius:    config.payload?.radius ?? config.radius ?? 0,
      range:     config.range ?? 0,
      color:     classColor,
    })
  }

  // ── Enemy management ────────────────────────────────────────────────────────

  _updateEnemies(dt, now) {
    // Provide active gate to enemy AI context (for gate repairer)
    const activeGate = this._getActiveGate()
    const ctx = { enemies: this.enemies, now, projectiles: this.projectiles, enemyIdSeq: this._enemyIdSeq, activeGate, minions: this.minions }

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
          this.spawnSystem.onEnemyDied(id)
        }
        if (this.buildingSpawnSystem) {
          this.buildingSpawnSystem.onEnemyDied(id)
        }
        if (this.minionSpawnSystem) {
          this.minionSpawnSystem.onEnemyDied(id)
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
                meleeDamage: Math.round(e.meleeDamage * mult),
              })
            }
          }
        }

        // Track warlock deaths for Phase 2 transition (Level 4)
        if (e.type === 'warlock') {
          // warlockAliveCount will be recounted below
        }

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
          if (p.isHost || p.isDead) return
          if (playerHitsEntity(p.x, p.y, e)) {
            if (p.isShieldBlocking(e.x, e.y)) return
            e._lastContactDamage = now
            p.takeDamage(p.maxHp * 10)   // effectively instant kill
            this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: 9999, type: 'damage', sourceSkill: 'Shadow Demon' })
            if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
          }
        })
      }

      // Shadowfiend: infects next player on contact (Level 6)
      if (e.type === 'shadowfiend' && !e._infectedTarget && now - e._lastContactDamage > 500) {
        this.players.forEach(p => {
          if (p.isHost || p.isDead || p.id === e.sourcePlayerId) return
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

      if (e.meleeDamage > 0 && now - e._lastContactDamage > e._attackCooldown) {
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          if (playerHitsEntity(p.x, p.y, e)) {
            if (p.isShieldBlocking(e.x, e.y)) return
            e._lastContactDamage = now
            p.takeDamage(e.meleeDamage)
            if (!this.stats.deaths) this.stats.deaths = {}
            if (p.isDead) {
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
        meleeDamage: child.meleeDamage,
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
        spriteKey: action.spriteKey ?? null,
        isAlive: true,
        isEnemyProj: true,
        ownerId: enemyId,
        hit: hitSet,
        homingTargetId: action.homingTargetId ?? null,
        homingSpeed:    action.speed ?? null,
      })
    } else if (action.action === 'repair') {
      // Gate repairer heals the active gate
      const gate = this.gates.get(action.gateId)
      if (gate) gate.repair(action.amount)
    } else if (action.action === 'leaveBlaze') {
      // Flame of Azzinoth drops a persistent fire circle — damages players, not the flame itself
      this.skillSystem.addZone('enemy_' + enemyId, {
        radius:     action.radius,
        duration:   30000,
        damage:     25,
        tickRate:   1000,
        effectType: 'PLAYER_DAMAGE',
      }, action.x, action.y, '#ff4400')
    } else if (action.action === 'burningAuraTick') {
      // Flame of Azzinoth burning aura — damage nearby players
      this.players.forEach(p => {
        if (p.isHost || p.isDead) return
        if (playerHitsCircle(p.x, p.y, action.x, action.y, action.radius)) {
          p.takeDamage(action.damage)
          this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: action.damage, type: 'damage', sourceSkill: 'Burning Aura' })
          if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
        }
      })
      // Visual pulse so players see the aura radius on each tick
      this.io.emit(EVENTS.ILLIDAN_AURA_PULSE, { x: action.x, y: action.y, radius: action.radius, color: '#ff4400' })
    } else if (action.action === 'berserkAoeTick') {
      // Bonechewer Blade Fury whirlwind spin — AoE damage around the enemy
      this.players.forEach(p => {
        if (p.isHost || p.isDead) return
        if (playerHitsCircle(p.x, p.y, action.x, action.y, action.radius)) {
          if (p.isShieldBlocking?.(action.x, action.y)) return
          p.takeDamage(action.damage)
          this.io.emit(EVENTS.EFFECT_DAMAGE, { targetId: p.id, amount: action.damage, type: 'damage', sourceSkill: 'Whirlwind' })
          if (p.isDead) this.stats.deaths[p.id] = (this.stats.deaths[p.id] ?? 0) + 1
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
      this.io.emit(EVENTS.SKILL_FIRED, {
        type: 'TELEPORT', subtype: 'BLOOD_PROPHET',
        x: action.x, y: action.y, color: '#8B0000',
      })
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
          if (d < 350 && !target.isShieldBlocking(this.boss.x, this.boss.y)) {
            target.takeDamage(attack.damage ?? 30)
            if (target.isDead) this.stats.deaths[target.id] = (this.stats.deaths[target.id] ?? 0) + 1
          }
        }
      } else if (attack.type === 'aoe') {
        const r = attack.radius ?? 100
        this.players.forEach(p => {
          if (p.isHost || p.isDead) return
          if (playerHitsCircle(p.x, p.y, attack.bossX, attack.bossY, r)) {
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
      if (playerHitsEntity(p.x, p.y, this.boss, 5)) {
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
      if (p.isHost || p.isDead) return
      if (playerHitsEntity(p.x, p.y, this.boss, 5)) {
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

        // Phase-aware spawn switching — when gate1 dies, move enemies to Room 2 spawn points
        if (gate.id === 'gate1' && this.spawnSystem?.setSpawnPhase) {
          this.spawnSystem.setSpawnPhase(2)
          console.log('[~] SpawnSystem advanced to phase 2 (gate1 destroyed)')
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
    if (this.currentLevel?.debugSandbox) {
      this._showLevelComplete()
      return
    }

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
    if (this.currentLevel?.debugSandbox) return
    let livingCount = 0
    this.players.forEach(p => {
      if (!p.isHost && !p.isBot && !p.isDead) livingCount++
    })
    if (livingCount === 0 && this.players.size > 0) {
      console.log('[~] All players dead — game over')
      this.currentLevelIndex = -1
      this.currentLevel      = null
      this._changeScene('gameover', { cumulativeStats: { ...this.stats } })
    }
  }

}
