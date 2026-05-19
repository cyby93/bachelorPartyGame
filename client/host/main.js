/**
 * client/host/main.js
 * Host display entry point.
 *
 * Responsibilities:
 *  - Bootstrap PixiJS via HostGame (canvas always visible; CreationScreen overlays it)
 *  - Wire all socket events to HostGame, AudioManager, Svelte stores
 *  - Mount HostApp.svelte (owns all host UI) BEFORE game.init() so loading progress shows
 *  - SCENE_CHANGE is the single source of truth for UI stage transitions
 */

import { io }         from 'socket.io-client'
import { mount }      from 'svelte'
import { get }        from 'svelte/store'
import { EVENTS }     from '../../shared/protocol.js'
import HostGame       from './HostGame.js'
import AudioManager   from './systems/AudioManager.js'
import { gameState }  from './stores/gameState.js'
import { quizState }  from './stores/quizState.js'
import { dialogLine } from './stores/dialogStore.js'
import { audioStore } from './stores/audioStore.js'
import HostApp        from './HostApp.svelte'
import SceneOverlay   from './components/SceneOverlay.svelte'
import DialogOverlay  from './components/DialogOverlay.svelte'

// ── Core instances ──────────────────────────────────────────────
const game  = new HostGame()
const audio = new AudioManager()
audioStore.set(audio)

// Connection badge (global DOM element, managed directly for simplicity)
const badge = document.getElementById('conn-badge')
function setBadge(text, variant, autoHideMs = 0) {
  if (!badge) return
  clearTimeout(badge._timer)
  badge.textContent = text
  badge.classList.remove('connected', 'connecting')
  if (variant) badge.classList.add(variant)
  badge.classList.add('visible')
  if (autoHideMs > 0) {
    badge._timer = setTimeout(() => badge.classList.remove('visible'), autoHideMs)
  }
}

// ── Socket — deferred connection so game.init() finishes first ──
// autoConnect:false prevents connecting before game assets are ready.
// socket.connect() is called after game.init() completes.
const socket = io({ transports: ['websocket'], autoConnect: false })

// ── Mount UI components first (CreationScreen shows loading state) ──
mount(SceneOverlay,   { target: document.getElementById('scene-overlay'),  props: { socket } })
mount(DialogOverlay,  { target: document.getElementById('dialog-overlay') })
mount(HostApp,        { target: document.getElementById('host-app'),       props: { socket, audio } })

// ── Load PixiJS assets — progress updates flow through gameState ──
await game.init(document.getElementById('canvas-wrap'), (progress) => {
  gameState.update(s => ({ ...s, loadingProgress: progress }))
})

gameState.update(s => ({ ...s, isLoading: false, loadingProgress: 1 }))

// ── Now connect to server ───────────────────────────────────────
game.setSocket(socket)
socket.connect()

// ── State tracking (feeds syncGameState) ───────────────────────
let currentScene      = 'staging'
let currentObjectives = null
let currentLevelMeta  = null
let currentNetworkUrl = ''

function syncGameState() {
  gameState.set({
    ...get(gameState),
    players:            game.knownState.players,
    stats:              game.knownState.stats,
    boss:               game.knownState.boss,
    objectives:         currentObjectives,
    levelMeta:          currentLevelMeta,
    npcs:               game.knownState.npcs ?? [],
    scene:              currentScene,
    serverScene:        currentScene,
    networkUrl:         currentNetworkUrl,
    cumulativeStats:    currentLevelMeta?.cumulativeStats    ?? null,
    levelCompleteStats: currentLevelMeta?.stats              ?? null,
  })
}

// ── Socket events ──────────────────────────────────────────────

socket.on('connect', () => {
  setBadge('Connected', 'connected', 2000)
  audio.init()

  fetch('/api/network-url')
    .then(r => r.json())
    .then(({ url }) => {
      currentNetworkUrl = url
      syncGameState()
    })
    .catch(() => {
      currentNetworkUrl = window.location.origin + '/controller'
      syncGameState()
    })

  socket.emit(EVENTS.JOIN, { name: 'Host Display', className: 'Warrior', isHost: true })
})

socket.on('disconnect', () => setBadge('Disconnected', '', 0))

socket.on(EVENTS.INIT, state => {
  game.receiveFullState(state)
  const scene = state.scene ?? 'staging'
  const meta = {
    levelId:      state.levelId,
    levelIndex:   state.levelIndex,
    levelNumber:  state.levelNumber,
    totalLevels:  state.totalLevels,
    levelName:    state.levelName,
    debugSandbox: state.debugSandbox,
    objectives:   state.objectives,
    arenaWidth:   state.arenaWidth,
    arenaHeight:  state.arenaHeight,
    rooms:        state.rooms,
    passages:     state.passages,
    mirrors:      state.mirrors,
  }
  currentObjectives = state.objectives ?? null
  currentScene      = scene
  currentLevelMeta  = meta
  // 'staging' has no dedicated renderer — use lobby renderer as fallback
  game.switchScene(scene === 'staging' ? 'lobby' : scene, meta)
  audio.setScene(scene, meta)
  audio.syncPlayerState(game.knownState.players)
  syncGameState()
})

socket.on(EVENTS.PLAYER_JOINED, player => {
  game.addPlayer(player)
  if (!player?.isHost) audio.handlePlayerJoined()
  syncGameState()
})

socket.on(EVENTS.PLAYER_LEFT, id => {
  game.removePlayer(id)
  syncGameState()
})

socket.on(EVENTS.STATE_DELTA, delta => {
  game.receiveState(delta)
  syncGameState()
  audio.syncPlayerState(game.knownState.players)
})

socket.on(EVENTS.SCENE_CHANGE, (data) => {
  const { scene, ...meta } = data

  dialogLine.set(null)

  // 'menu' is a host-only signal: session reset → return to creation screen
  if (scene === 'menu') {
    currentScene     = 'staging'
    currentLevelMeta = null
    currentObjectives = null
    game.switchScene('lobby', {})
    syncGameState()
    return
  }

  currentObjectives = data.objectives ?? null
  currentScene      = scene
  if (scene === 'quiz') quizState.set({ phase: 'waiting', question: null, progress: null, results: null, upgrades: [] })
  game.switchScene(scene === 'staging' ? 'lobby' : scene, meta)
  currentLevelMeta = meta
  audio.setScene(scene, meta)
  syncGameState()
})

socket.on(EVENTS.OBJECTIVE_UPDATE, ({ objectives }) => {
  game.updateObjectives(objectives)
  currentObjectives = objectives
  syncGameState()
})

socket.on(EVENTS.SET_LEVEL, ({ levelIndex }) => {
  audio.handleDialogClear()
  dialogLine.set(null)
})

socket.on(EVENTS.DEBUG_ACTION_RESULT, ({ message, isError }) => {
  console.log(`[sandbox] ${isError ? 'ERROR: ' : ''}${message}`)
})

// ── Transition events ──────────────────────────────────────────

socket.on(EVENTS.LEVEL_VICTORY, data => {
  game.activeRenderer?.onLevelVictory?.(data)
})

socket.on(EVENTS.TRANSITION_VFX, data => {
  game.activeRenderer?.onTransitionVfx?.(data)
})

// ── VFX events ─────────────────────────────────────────────────

socket.on(EVENTS.COOLDOWN, data => {
  game.activeRenderer?.onCooldown?.(data)
})

socket.on(EVENTS.SKILL_FIRED, data => {
  audio.handleSkillFired(data)
  game.activeRenderer?.onSkillFired?.(data)
})

socket.on(EVENTS.PLAYER_HIGHLIGHT, data => {
  game.activeRenderer?.onPlayerHighlight?.(data.playerId)
})

socket.on(EVENTS.EFFECT_DAMAGE, data => {
  audio.handleEffectDamage(data)
  game.activeRenderer?.onEffectDamage?.(data)
})

socket.on(EVENTS.TARGETED_HIT, data => {
  audio.handleTargetedHit(data)
  game.activeRenderer?.onTargetedHit?.(data)
})

socket.on(EVENTS.GRIP_APPLIED, data => {
  game.activeRenderer?.onGripApplied?.(data)
})

socket.on(EVENTS.CHANNEL_INTERRUPTED, data => {
  audio.handleChannelInterrupted(data)
  game.activeRenderer?.onChannelInterrupted?.(data)
})

socket.on(EVENTS.CHANNEL_ENDED, data => {
  game.activeRenderer?.onChannelEnded?.(data)
})

socket.on(EVENTS.SKILL_INTERRUPTED, data => {
  audio.handleSkillInterrupted(data)
})

// ── Illidan encounter events ───────────────────────────────────

socket.on(EVENTS.BOSS_DIALOG_LINE, data => {
  audio.handleDialogLine(data)
  dialogLine.set(data)
})

socket.on(EVENTS.BOSS_VO, data => {
  audio.handleBossVo(data)
})

socket.on(EVENTS.ILLIDAN_PHASE_TRANSITION, data => {
  dialogLine.set(null)
  audio.handlePhaseTransition(data)
  game.activeRenderer?.onIllidanPhaseTransition?.(data)
  if (data.dialog) {
    setTimeout(() => {
      audio.handleDialogLine(data.dialog)
      dialogLine.set(data.dialog)
    }, 300)
  }
})

socket.on(EVENTS.ILLIDAN_WARGLAIVE_THROW, data => {
  game.activeRenderer?.onWarglaiveThrow?.(data)
})

socket.on(EVENTS.ILLIDAN_AURA_PULSE, data => {
  audio.handleAuraPulse(data)
  game.activeRenderer?.onIllidanAuraPulse?.(data)
})

// ── Level 4: Leviathan split events ───────────────────────────

socket.on(EVENTS.LEVIATHAN_DEATH, data => {
  audio.handleLeviathanDeath()
  game.activeRenderer?.onLeviathanDeath?.(data)
})

socket.on(EVENTS.LEVIATHAN_SPAWN, data => {
  game.activeRenderer?.onLeviathanSpawn?.(data)
})

// ── Level 2: Portal Beam events ────────────────────────────────

socket.on(EVENTS.PORTAL_BEAM_WARNING, data => {
  audio.handlePortalBeamWarning(data)
  game.activeRenderer?.onPortalBeamWarning?.(data)
})

socket.on(EVENTS.PORTAL_BEAM_DAMAGE, data => {
  audio.handlePortalBeamDamage(data)
  game.activeRenderer?.onPortalBeamDamage?.(data)
})

socket.on(EVENTS.PORTAL_BEAM_END, data => {
  audio.handlePortalBeamEnd(data)
  game.activeRenderer?.onPortalBeamEnd?.(data)
})

// ── Tutorial events ────────────────────────────────────────────

socket.on(EVENTS.TUTORIAL_STATE, data => {
  gameState.update(s => ({ ...s, tutorial: data?.active ? data : null }))
  game.activeRenderer?.onTutorialState?.(data)
})

// ── Quiz events ────────────────────────────────────────────────

socket.on(EVENTS.QUIZ_QUESTION, data => {
  quizState.set({ phase: 'answering', question: data, progress: null, results: null, upgrades: [] })
})

socket.on(EVENTS.QUIZ_PROGRESS, data => {
  quizState.update(s => ({ ...s, progress: data }))
})

socket.on(EVENTS.QUIZ_RESULTS, data => {
  quizState.update(s => ({ ...s, phase: 'results', results: data }))
})

socket.on(EVENTS.QUIZ_UPGRADE_CHOSEN, data => {
  quizState.update(s => ({ ...s, phase: 'upgrading', upgrades: [...s.upgrades, data] }))
})

socket.on(EVENTS.QUIZ_DONE, () => {
  quizState.update(s => ({ ...s, phase: 'done' }))
})
