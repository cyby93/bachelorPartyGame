/**
 * client/host/main.js
 * Host display entry point.
 *
 * Responsibilities:
 *  - Bootstrap PixiJS via HostGame
 *  - Manage the DOM sidebar (player list, QR code, start/restart button)
 *  - Wire all socket events to HostGame + DOM
 */

import { io }         from 'socket.io-client'
import { mount }      from 'svelte'
import { EVENTS }     from '../../shared/protocol.js'
import { LEVEL_SELECT_OPTIONS } from '../../shared/LevelConfig.js'
import HostGame       from './HostGame.js'
import AudioManager   from './systems/AudioManager.js'
import { gameState }  from './stores/gameState.js'
import GameplaySidebar from './components/GameplaySidebar.svelte'
import LobbyPlayerList from './components/LobbyPlayerList.svelte'

// ── PixiJS game init (top-level await — supported in Vite ESM) ─────────────
const game  = new HostGame()
const audio = new AudioManager()

// Show loading progress in the badge before the sprite-load blocks the thread
const _loadBadge = document.getElementById('conn-badge')
if (_loadBadge) {
  _loadBadge.textContent = 'Loading assets… 0%'
  _loadBadge.classList.add('visible', 'connecting')
}

await game.init(document.getElementById('canvas-wrap'), (progress) => {
  if (_loadBadge) _loadBadge.textContent = `Loading assets… ${Math.round(progress * 100)}%`
})

if (_loadBadge) {
  _loadBadge.textContent = 'Connecting…'
}

// ── Mount Svelte sidebar components ───────────────────────────────────────
mount(GameplaySidebar, { target: document.getElementById('gameplay-panel') })
mount(LobbyPlayerList, { target: document.getElementById('player-list') })

// ── Socket ─────────────────────────────────────────────────────────────────
const socket = io({ transports: ['websocket'] })
game.setSocket(socket)

// ── DOM refs ───────────────────────────────────────────────────────────────
const body           = document.body
const badge          = document.getElementById('conn-badge')
const serverIpEl     = document.getElementById('server-ip')
const startBtn       = document.getElementById('start-btn')
const qrWrap         = document.getElementById('qr-code')
const fullscreenBtn  = document.getElementById('fullscreen-btn')
const menuPlayBtn    = document.getElementById('menu-play-btn')
const selectedLevelNameEl = document.getElementById('selected-level-name')
const prevLevelBtn   = document.getElementById('prev-level-btn')
const nextLevelBtn   = document.getElementById('next-level-btn')
const quitCampaignBtn = document.getElementById('quit-campaign-btn')
const skipDialogChk  = document.getElementById('skip-dialog-chk')
const botAddBtn      = document.getElementById('bot-add-btn')
const botRemoveBtn   = document.getElementById('bot-remove-btn')
const botCountEl     = document.getElementById('bot-count')
const sidebar        = document.getElementById('sidebar')
const debugToggleBtn = document.getElementById('debug-toggle')
const upgradeSliders = document.querySelectorAll('.upgrade-slider')
const upgradeResetBtn = document.getElementById('upgrade-reset-btn')
const sandboxOverlayEl = document.getElementById('sandbox-overlay')
const sandboxActionsEl = document.getElementById('sandbox-overlay-actions')
const sandboxStatusEl = document.getElementById('sandbox-overlay-status')
const audioMasterEl = document.getElementById('audio-master')
const audioMusicEl  = document.getElementById('audio-music')
const audioSfxEl    = document.getElementById('audio-sfx')
const audioVoiceEl  = document.getElementById('audio-voice')
const audioMuteEl   = document.getElementById('audio-muted')

const menuAudioMasterEl = document.getElementById('menu-audio-master')
const menuAudioMusicEl  = document.getElementById('menu-audio-music')
const menuAudioSfxEl    = document.getElementById('menu-audio-sfx')
const menuAudioVoiceEl  = document.getElementById('menu-audio-voice')
const menuAudioMuteEl   = document.getElementById('menu-audio-muted')
const menuAudioBtn      = document.getElementById('menu-audio-btn')
const menuAudioPanel    = document.getElementById('menu-audio-panel')

const SANDBOX_ENEMY_ACTIONS = [
  { label: 'Felguard',       enemyType: 'felGuard' },
  { label: 'Harpooner',      enemyType: 'coilskarHarpooner' },
  { label: 'Brute',          enemyType: 'bonechewerBrute' },
  { label: 'Blade Fury',     enemyType: 'bonechewerBladeFury' },
  { label: 'Centurion',      enemyType: 'illidariCenturion' },
  { label: 'Mystic',         enemyType: 'ashtonghueMystic' },
  { label: 'Blood Prophet',  enemyType: 'bloodProphet' },
  { label: 'Serpent Guard',  enemyType: 'coilskarSerpentGuard' },
  { label: 'Ritual Channeler', enemyType: 'ritualChanneler' },
  { label: 'Gate Repairer',  enemyType: 'gateRepairer' },
  { label: 'Warlock',        enemyType: 'warlock' },
  { label: 'Leviathan',      enemyType: 'leviathan' },
  { label: 'Shadowfiend',    enemyType: 'shadowfiend' },
  { label: 'Shadow Demon',   enemyType: 'shadowDemon' },
  { label: 'Flame of Azzinoth', enemyType: 'flameOfAzzinoth' },
]

botAddBtn?.addEventListener('click', () => socket.emit(EVENTS.BOT_ADD, {}))
botRemoveBtn?.addEventListener('click', () => socket.emit(EVENTS.BOT_REMOVE))

// ── Debug panel toggle ─────────────────────────────────────────────────────
debugToggleBtn?.addEventListener('click', () => {
  const isDebug = sidebar.classList.toggle('debug-mode')
  debugToggleBtn.textContent = isDebug ? '🎮 Play' : '🛠 Debug'
})

// ── Upgrade debug sliders ──────────────────────────────────────────────────
upgradeSliders.forEach(slider => {
  const valEl = slider.nextElementSibling
  slider.addEventListener('change', () => {
    const skillIndex = parseInt(slider.dataset.slot, 10)
    const tier = parseInt(slider.value, 10)
    if (valEl) valEl.textContent = tier
    socket.emit(EVENTS.DEBUG_SET_SKILL_TIER, { skillIndex, tier })
  })
})

upgradeResetBtn?.addEventListener('click', () => {
  upgradeSliders.forEach(slider => {
    slider.value = 0
    const valEl = slider.nextElementSibling
    if (valEl) valEl.textContent = '0'
    socket.emit(EVENTS.DEBUG_SET_SKILL_TIER, { skillIndex: parseInt(slider.dataset.slot, 10), tier: 0 })
  })
})
let connectionHideTimer = null
let shellMode = 'menu'
let currentObjectives = null

function syncGameState() {
  gameState.set({
    players: game.knownState.players,
    stats: game.knownState.stats,
    boss: game.knownState.boss,
    objectives: currentObjectives,
    levelMeta: currentLevelMeta,
    npcs: game.knownState.npcs ?? [],
  })
}

function updateLobbyStartBtn() {
  const players = Object.values(game.knownState.players).filter(p => !p.isHost)
  if (botCountEl) botCountEl.textContent = `${players.filter(p => p.isBot).length} / 12 bots`
  if (startBtn.dataset.scene === 'lobby') startBtn.disabled = players.length === 0
}

function syncAudioControls() {
  const settings = audio.getSettings()
  if (audioMasterEl) audioMasterEl.value = String(Math.round(settings.master * 100))
  if (audioMusicEl) audioMusicEl.value = String(Math.round(settings.music * 100))
  if (audioSfxEl) audioSfxEl.value = String(Math.round(settings.sfx * 100))
  if (audioVoiceEl) audioVoiceEl.value = String(Math.round(settings.voice * 100))
  if (audioMuteEl) audioMuteEl.checked = !!settings.muted

  if (menuAudioMasterEl) menuAudioMasterEl.value = String(Math.round(settings.master * 100))
  if (menuAudioMusicEl)  menuAudioMusicEl.value  = String(Math.round(settings.music  * 100))
  if (menuAudioSfxEl)    menuAudioSfxEl.value    = String(Math.round(settings.sfx    * 100))
  if (menuAudioVoiceEl)  menuAudioVoiceEl.value  = String(Math.round(settings.voice  * 100))
  if (menuAudioMuteEl)   menuAudioMuteEl.checked = !!settings.muted

  updateAudioOutputLabels()
}

function updateAudioOutputLabels() {
  ;[audioMasterEl, audioMusicEl, audioSfxEl, audioVoiceEl].forEach(el => {
    const output = el?.parentElement?.querySelector('output')
    if (output && el) output.textContent = `${el.value}%`
  })
}

function bindAudioControls() {
  const update = () => {
    audio.applySettings({
      master: (Number(audioMasterEl?.value ?? 85) || 0) / 100,
      music: (Number(audioMusicEl?.value ?? 65) || 0) / 100,
      sfx: (Number(audioSfxEl?.value ?? 85) || 0) / 100,
      voice: (Number(audioVoiceEl?.value ?? 90) || 0) / 100,
      muted: !!audioMuteEl?.checked,
    })
    updateAudioOutputLabels()
  }

  ;[audioMasterEl, audioMusicEl, audioSfxEl, audioVoiceEl].forEach(el => {
    el?.addEventListener('input', update)
    el?.addEventListener('change', update)
  })
  audioMuteEl?.addEventListener('change', update)
  syncAudioControls()
}

function bindMenuAudioControls() {
  const apply = () => {
    audio.applySettings({
      master: (Number(menuAudioMasterEl?.value ?? 85) || 0) / 100,
      music:  (Number(menuAudioMusicEl?.value  ?? 65) || 0) / 100,
      sfx:    (Number(menuAudioSfxEl?.value    ?? 85) || 0) / 100,
      voice:  (Number(menuAudioVoiceEl?.value  ?? 90) || 0) / 100,
      muted:  !!menuAudioMuteEl?.checked,
    })
    // mirror values back to the debug panel sliders
    if (audioMasterEl) audioMasterEl.value = menuAudioMasterEl?.value ?? audioMasterEl.value
    if (audioMusicEl)  audioMusicEl.value  = menuAudioMusicEl?.value  ?? audioMusicEl.value
    if (audioSfxEl)    audioSfxEl.value    = menuAudioSfxEl?.value    ?? audioSfxEl.value
    if (audioVoiceEl)  audioVoiceEl.value  = menuAudioVoiceEl?.value  ?? audioVoiceEl.value
    if (audioMuteEl)   audioMuteEl.checked = !!menuAudioMuteEl?.checked
    updateAudioOutputLabels()
  }
  ;[menuAudioMasterEl, menuAudioMusicEl, menuAudioSfxEl, menuAudioVoiceEl].forEach(el => {
    el?.addEventListener('input', apply)
    el?.addEventListener('change', apply)
  })
  menuAudioMuteEl?.addEventListener('change', apply)

  menuAudioBtn?.addEventListener('click', () => {
    const open = menuAudioPanel?.classList.toggle('open')
    if (menuAudioBtn) menuAudioBtn.classList.toggle('active', open)
  })
}

function setConnectionStatus(text, variant, autoHideMs = 0) {
  if (!badge) return

  if (connectionHideTimer) {
    clearTimeout(connectionHideTimer)
    connectionHideTimer = null
  }

  badge.textContent = text
  badge.classList.remove('connected', 'connecting')
  if (variant) badge.classList.add(variant)
  badge.classList.add('visible')

  if (autoHideMs > 0) {
    connectionHideTimer = setTimeout(() => {
      badge.classList.remove('visible')
      connectionHideTimer = null
    }, autoHideMs)
  }
}

function setShellMode(mode) {
  const previousMode = shellMode
  shellMode = mode
  body.dataset.shell = mode

  if (previousMode === 'menu' && mode !== 'menu') {
    requestAnimationFrame(() => game.resizeToContainer())
  }
}

menuPlayBtn?.addEventListener('click', () => {
  audio.init()
  const serverScene = startBtn.dataset.scene ?? game.knownState.scene ?? 'lobby'
  setShellMode(serverScene === 'battle' || serverScene === 'bossFight' ? 'gameplay' : 'lobby')
})

bindAudioControls()
bindMenuAudioControls()

setConnectionStatus('Connecting...', 'connecting')

// ── Quit Campaign ──────────────────────────────────────────────────────────
quitCampaignBtn?.addEventListener('click', () => {
  if (confirm('Quit the current campaign and return to the lobby?')) {
    socket.emit(EVENTS.QUIT_CAMPAIGN)
  }
})

// ── Fullscreen ─────────────────────────────────────────────────────────────
fullscreenBtn?.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {})
  } else {
    document.exitFullscreen().catch(() => {})
  }
})
document.addEventListener('fullscreenchange', () => {
  if (fullscreenBtn) {
    fullscreenBtn.textContent = document.fullscreenElement ? '✕ Exit Fullscreen' : '⛶ Fullscreen'
  }
})

// ── Level selector (debug) ────────────────────────────────────────────────
let selectedLevel = 0
let currentLevelMeta = null

function isSandboxSelection(index = selectedLevel) {
  return LEVEL_SELECT_OPTIONS[index]?.debugSandbox === true
}

function renderSandboxPanel() {
  if (!sandboxOverlayEl || !sandboxActionsEl) return

  const scene = startBtn.dataset.scene ?? game.knownState.scene ?? 'lobby'
  const activeSandbox = currentLevelMeta?.debugSandbox === true && (scene === 'battle' || scene === 'bossFight')

  sandboxOverlayEl.hidden = !activeSandbox
  if (!activeSandbox) {
    sandboxActionsEl.innerHTML = ''
    return
  }

  // Build buttons once — rebuilding on every tick destroys them mid-click
  if (sandboxActionsEl.childElementCount === 0) {
    sandboxActionsEl.innerHTML = SANDBOX_ENEMY_ACTIONS.map(action => (
      `<button class="debug-btn" data-enemy-type="${action.enemyType}">${action.label}</button>`
    )).join('')

    sandboxActionsEl.querySelectorAll('[data-enemy-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        socket.emit(EVENTS.DEBUG_SPAWN_ENEMY, { enemyType: btn.dataset.enemyType })
      })
    })

    const clearBtn = document.getElementById('sandbox-overlay-clear-btn')
    if (clearBtn) clearBtn.disabled = false

    if (sandboxStatusEl) {
      sandboxStatusEl.textContent = 'Sandbox controls ready.'
      sandboxStatusEl.dataset.error = 'false'
    }
  }
}

function updateLevelDisplay() {
  const label = isSandboxSelection()
    ? `Debug: ${LEVEL_SELECT_OPTIONS[selectedLevel]?.name ?? '?'}`
    : `Level ${selectedLevel + 1}: ${LEVEL_SELECT_OPTIONS[selectedLevel]?.name ?? '?'}`
  if (selectedLevelNameEl) selectedLevelNameEl.textContent = label
  renderSandboxPanel()
}

function emitSetLevel() {
  socket.emit(EVENTS.SET_LEVEL, { levelIndex: selectedLevel, skipDialog: skipDialogChk?.checked ?? false })
}

prevLevelBtn?.addEventListener('click', () => {
  selectedLevel = Math.max(0, selectedLevel - 1)
  updateLevelDisplay()
  emitSetLevel()
})
nextLevelBtn?.addEventListener('click', () => {
  selectedLevel = Math.min(LEVEL_SELECT_OPTIONS.length - 1, selectedLevel + 1)
  updateLevelDisplay()
  emitSetLevel()
})
skipDialogChk?.addEventListener('change', () => {
  emitSetLevel()
})

document.getElementById('sandbox-overlay-clear-btn')?.addEventListener('click', () => {
  socket.emit(EVENTS.DEBUG_CLEAR_ENEMIES)
})

function setSceneControls(scene) {
  startBtn.dataset.scene = scene

  if (scene === 'battle' || scene === 'bossFight') setShellMode('gameplay')
  else if (shellMode !== 'menu') setShellMode('lobby')

  if (scene === 'lobby') {
    startBtn.textContent = 'START GAME'
    startBtn.disabled    = Object.values(game.knownState.players).filter(p => !p.isHost).length === 0
    startBtn.style.display = ''
    startBtn.onclick     = () => socket.emit(EVENTS.START_GAME)
    updateLevelDisplay()
  } else if (scene === 'levelComplete') {
    startBtn.textContent   = 'CONTINUE'
    startBtn.disabled      = false
    startBtn.style.display = ''
    startBtn.onclick       = () => socket.emit(EVENTS.HOST_ADVANCE)
  } else if (scene === 'quiz') {
    // Hide button during quiz — host waits for players
    startBtn.style.display = 'none'
  } else if (scene === 'result' || scene === 'gameover') {
    startBtn.textContent   = 'RESTART GAME'
    startBtn.disabled      = false
    startBtn.style.display = ''
    startBtn.onclick       = () => socket.emit(EVENTS.RESTART_GAME)
  } else {
    // In-game: hide the button
    startBtn.style.display = 'none'
  }

  // Quit Campaign button: visible during an active campaign run
  const campaignScenes = ['battle', 'bossFight', 'levelComplete', 'quiz']
  if (quitCampaignBtn) {
    quitCampaignBtn.style.display = campaignScenes.includes(scene) ? '' : 'none'
  }
}

// ── Socket events ──────────────────────────────────────────────────────────

socket.on('connect', () => {
  setConnectionStatus('Connected', 'connected', 2000)
  audio.init()

  // Display the controller URL and generate QR code using the LAN IP
  fetch('/api/network-url')
    .then(r => r.json())
    .then(({ url }) => {
      serverIpEl.textContent = url.replace(/^https?:\/\//, '')
      if (typeof QRCode !== 'undefined') {
        qrWrap.innerHTML = ''
        new QRCode(qrWrap, {
          text:       url,
          width:      150,
          height:     150,
          colorDark:  '#000000',
          colorLight: '#ffffff',
        })
      }
    })
    .catch(() => {
      // Fallback to current origin if the API is unreachable
      const url = `${window.location.origin}/controller`
      serverIpEl.textContent = url.replace(/^https?:\/\//, '')
    })

  // Register as the host player
  socket.emit(EVENTS.JOIN, { name: 'Host Display', className: 'Warrior', isHost: true })
})

socket.on('disconnect', () => {
  setConnectionStatus('Disconnected', '', 0)
})

socket.on(EVENTS.INIT, state => {
  game.receiveFullState(state)
  const scene = state.scene ?? 'lobby'
  const meta = {
    levelId: state.levelId,
    levelIndex: state.levelIndex,
    levelNumber: state.levelNumber,
    totalLevels: state.totalLevels,
    levelName: state.levelName,
    debugSandbox: state.debugSandbox,
    objectives: state.objectives,
    arenaWidth: state.arenaWidth,
    arenaHeight: state.arenaHeight,
    rooms: state.rooms,
    passages: state.passages,
    mirrors: state.mirrors,
  }
  currentObjectives = state.objectives ?? null
  game.switchScene(scene, meta)
  currentLevelMeta = meta
  audio.setScene(scene, meta)
  setSceneControls(scene)
  updateLobbyStartBtn()
  syncGameState()
  renderSandboxPanel()
  audio.syncPlayerState(game.knownState.players)
})

socket.on(EVENTS.PLAYER_JOINED, player => {
  game.addPlayer(player)
  if (!player?.isHost) audio.handlePlayerJoined()
  updateLobbyStartBtn()
  syncGameState()
})

socket.on(EVENTS.PLAYER_LEFT, id => {
  game.removePlayer(id)
  updateLobbyStartBtn()
  syncGameState()
})

socket.on(EVENTS.STATE_DELTA, delta => {
  const before = Object.keys(game.knownState.players).length
  game.receiveState(delta)
  const after  = Object.keys(game.knownState.players).length
  if (after !== before) updateLobbyStartBtn()
  syncGameState()
  audio.syncPlayerState(game.knownState.players)
})

socket.on(EVENTS.SCENE_CHANGE, (data) => {
  const { scene, ...meta } = data
  currentObjectives = data.objectives ?? null
  game.switchScene(scene, meta)
  currentLevelMeta = meta
  audio.setScene(scene, meta)
  setSceneControls(scene)
  syncGameState()
  renderSandboxPanel()
})

socket.on(EVENTS.OBJECTIVE_UPDATE, ({ objectives }) => {
  game.updateObjectives(objectives)
  currentObjectives = objectives
  syncGameState()
})

socket.on(EVENTS.SET_LEVEL, ({ levelIndex, levelName, skipDialog }) => {
  selectedLevel = levelIndex
  updateLevelDisplay()
  if (skipDialogChk && skipDialog !== undefined) skipDialogChk.checked = skipDialog
})

socket.on(EVENTS.DEBUG_ACTION_RESULT, ({ message, isError }) => {
  if (!sandboxStatusEl) return
  sandboxStatusEl.textContent = message ?? ''
  sandboxStatusEl.dataset.error = isError ? 'true' : 'false'
})

// ── VFX events ───────────────────────────────────────────────────────────

socket.on(EVENTS.SKILL_FIRED, data => {
  audio.handleSkillFired(data)
  game.activeRenderer?.onSkillFired?.(data)
})

socket.on(EVENTS.EFFECT_DAMAGE, data => {
  audio.handleEffectDamage(data)
  game.activeRenderer?.onEffectDamage?.(data)
})

socket.on(EVENTS.TARGETED_HIT, data => {
  audio.handleTargetedHit(data)
  game.activeRenderer?.onTargetedHit?.(data)
})

socket.on(EVENTS.CHANNEL_INTERRUPTED, data => {
  audio.handleChannelInterrupted(data)
  game.activeRenderer?.onChannelInterrupted?.(data)
})

socket.on(EVENTS.SKILL_INTERRUPTED, data => {
  audio.handleSkillInterrupted(data)
})

// ── Illidan encounter events ──────────────────────────────────────────────

socket.on(EVENTS.BOSS_DIALOG_LINE, data => {
  audio.handleDialogLine(data)
  game.activeRenderer?.onIllidanDialogLine?.(data)
})

socket.on(EVENTS.ILLIDAN_PHASE_TRANSITION, data => {
  audio.handlePhaseTransition(data)
  game.activeRenderer?.onIllidanPhaseTransition?.(data)
})

socket.on(EVENTS.ILLIDAN_AURA_PULSE, data => {
  audio.handleAuraPulse(data)
  game.activeRenderer?.onIllidanAuraPulse?.(data)
})

// ── Level 2: Portal Beam events ──────────────────────────────────────────

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

// ── Quiz events ───────────────────────────────────────────────────────────

socket.on(EVENTS.QUIZ_QUESTION, data => {
  game.activeRenderer?.setQuestion?.(data)
})

socket.on(EVENTS.QUIZ_PROGRESS, data => {
  game.activeRenderer?.setProgress?.(data)
})

socket.on(EVENTS.QUIZ_RESULTS, data => {
  game.activeRenderer?.setResults?.(data)
})

socket.on(EVENTS.QUIZ_UPGRADE_CHOSEN, data => {
  game.activeRenderer?.addUpgradeChosen?.(data)
})

socket.on(EVENTS.QUIZ_DONE, () => {
  game.activeRenderer?.setDone?.()
  // Show CONTINUE button for host to dismiss quiz
  startBtn.textContent   = 'CONTINUE'
  startBtn.disabled      = false
  startBtn.style.display = ''
  startBtn.onclick       = () => socket.emit(EVENTS.HOST_ADVANCE)
})
