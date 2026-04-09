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
import { EVENTS }     from '../../shared/protocol.js'
import { CLASSES }    from '../../shared/ClassConfig.js'
import { CAMPAIGN }   from '../../shared/LevelConfig.js'
import HostGame       from './HostGame.js'
import AudioSystem    from './systems/AudioSystem.js'

// ── PixiJS game init (top-level await — supported in Vite ESM) ─────────────
const game  = new HostGame()
const audio = new AudioSystem()
await game.init(document.getElementById('canvas-wrap'))

// ── Socket ─────────────────────────────────────────────────────────────────
const socket = io({ transports: ['websocket'] })
game.setSocket(socket)
console.log(socket);

// ── DOM refs ───────────────────────────────────────────────────────────────
const badge          = document.getElementById('conn-badge')
const serverIpEl     = document.getElementById('server-ip')
const playerListEl   = document.getElementById('player-list')
const startBtn       = document.getElementById('start-btn')
const qrWrap         = document.getElementById('qr-code')
const fullscreenBtn  = document.getElementById('fullscreen-btn')
const levelSelector  = document.getElementById('level-selector')
const selectedLevelNameEl = document.getElementById('selected-level-name')
const prevLevelBtn   = document.getElementById('prev-level-btn')
const nextLevelBtn   = document.getElementById('next-level-btn')
const levelPanelEl   = document.getElementById('level-panel')
const levelIndexEl   = document.getElementById('level-index')
const currentLevelNameEl = document.getElementById('current-level-name')
const objectiveLabelEl = document.getElementById('objective-label')
const objectiveValueEl = document.getElementById('objective-value')

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

function updateLevelDisplay() {
  if (selectedLevelNameEl) selectedLevelNameEl.textContent = `Level ${selectedLevel + 1}: ${CAMPAIGN[selectedLevel]?.name ?? '?'}`
}

prevLevelBtn?.addEventListener('click', () => {
  selectedLevel = Math.max(0, selectedLevel - 1)
  updateLevelDisplay()
  socket.emit(EVENTS.SET_LEVEL, { levelIndex: selectedLevel })
})
nextLevelBtn?.addEventListener('click', () => {
  selectedLevel = Math.min(CAMPAIGN.length - 1, selectedLevel + 1)
  updateLevelDisplay()
  socket.emit(EVENTS.SET_LEVEL, { levelIndex: selectedLevel })
})

// ── DOM helpers ────────────────────────────────────────────────────────────

function renderDOMPlayerList() {
  const players = Object.values(game.knownState.players).filter(p => !p.isHost)

  if (players.length === 0) {
    playerListEl.innerHTML = '<p id="waiting-msg">Waiting for players…</p>'
    if (startBtn.dataset.scene === 'lobby') startBtn.disabled = true
    return
  }

  playerListEl.innerHTML = players.map(p => {
    const color = CLASSES[p.className]?.color ?? '#aaa'
    return `
      <div class="player-item" style="border-left-color:${color}">
        <span class="pname">${p.name}</span>
        <span class="pclass" style="color:${color}">${p.className}</span>
      </div>`
  }).join('')

  if (startBtn.dataset.scene === 'lobby') startBtn.disabled = false
}

function clearLevelPanel() {
  if (levelPanelEl) levelPanelEl.hidden = true
  if (levelIndexEl) levelIndexEl.textContent = ''
  if (currentLevelNameEl) currentLevelNameEl.textContent = ''
  if (objectiveLabelEl) objectiveLabelEl.textContent = ''
  if (objectiveValueEl) objectiveValueEl.textContent = ''
}

function formatObjective(objective, knownState) {
  if (!objective) return { label: '', value: '' }

  switch (objective.type) {
    case 'killCount': {
      const label = objective.enemyTypes?.length
        ? `Kill ${objective.target ?? '?'} ${objective.enemyTypes.join(', ')}`
        : 'Wave progress'
      return { label, value: `${objective.current ?? 0} / ${objective.target ?? '?'}` }
    }
    case 'survive': {
      const total = objective.durationMs ?? objective.target ?? 0
      const remaining = Math.max(0, total - (objective.current ?? 0))
      return { label: 'Survive', value: `${Math.ceil(remaining / 1000)}s remaining` }
    }
    case 'surviveWaves':
      return { label: 'Survive the waves', value: `${objective.current ?? 0} / ${objective.target ?? '?'}` }
    case 'destroyGates':
      return { label: 'Destroy the gates', value: `${objective.current ?? 0} / ${objective.target ?? '?'}` }
    case 'killAll':
      return { label: 'Defeat all enemies', value: objective.current === 1 ? 'Complete' : 'In progress' }
    case 'killBoss': {
      const boss = knownState?.boss
      if (boss) {
        const hp = Math.max(0, Math.ceil(boss.hp ?? 0))
        const maxHp = Math.max(1, Math.ceil(boss.maxHp ?? 1))
        return { label: boss.name ?? 'Boss', value: `${hp} / ${maxHp} HP` }
      }
      return { label: 'Defeat the boss', value: objective.current === 1 ? 'Complete' : 'In progress' }
    }
    case 'killBossProtectNPC': {
      const npc = (knownState?.npcs ?? []).find(entry => entry.id === objective.npcId)
      const npcState = npc ? `${Math.max(0, Math.ceil(npc.hp ?? 0))} HP` : 'Alive'
      return { label: 'Protect Akama', value: objective.current === 1 ? 'Complete' : npcState }
    }
    default:
      return { label: 'Objective', value: String(objective.current ?? '') }
  }
}

function renderLevelPanel(scene, meta, objectives = meta?.objectives) {
  const isCombatScene = scene === 'battle' || scene === 'bossFight'
  if (!isCombatScene) {
    clearLevelPanel()
    return
  }

  const summary = formatObjective(objectives?.[0] ?? null, game.knownState)
  if (levelPanelEl) levelPanelEl.hidden = false
  if (levelIndexEl) levelIndexEl.textContent = `Level ${(meta?.levelIndex ?? 0) + 1} / ${meta?.totalLevels ?? '?'}`
  if (currentLevelNameEl) currentLevelNameEl.textContent = meta?.levelName ?? 'Current level'
  if (objectiveLabelEl) objectiveLabelEl.textContent = summary.label || 'Objective'
  if (objectiveValueEl) objectiveValueEl.textContent = summary.value || 'In progress'
}

function setSceneControls(scene) {
  startBtn.dataset.scene = scene

  if (scene === 'lobby') {
    startBtn.textContent = 'START GAME'
    startBtn.disabled    = Object.values(game.knownState.players).filter(p => !p.isHost).length === 0
    startBtn.style.display = ''
    startBtn.onclick     = () => socket.emit(EVENTS.START_GAME)
    if (levelSelector) levelSelector.style.display = ''
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

  // Level selector only visible in lobby
  if (scene !== 'lobby' && levelSelector) levelSelector.style.display = 'none'
}

// ── Socket events ──────────────────────────────────────────────────────────

socket.on('connect', () => {
  badge.textContent = 'Connected'
  badge.classList.add('connected')
  audio.init()   // safe to call here — connect fires after a user interaction (page load)
    console.log('Connected')

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
  badge.textContent = 'Disconnected'
  badge.classList.remove('connected')
})

socket.on(EVENTS.INIT, state => {
    console.log('JSON.stringify(player)')

  game.receiveFullState(state)
  const scene = state.scene ?? 'lobby'
  const meta = {
    levelIndex: state.levelIndex,
    totalLevels: state.totalLevels,
    levelName: state.levelName,
    objectives: state.objectives,
    arenaWidth: state.arenaWidth,
    arenaHeight: state.arenaHeight,
    rooms: state.rooms,
    passages: state.passages,
  }
  game.switchScene(scene, meta)
  currentLevelMeta = meta
  setSceneControls(scene)
  renderLevelPanel(scene, meta)
  renderDOMPlayerList()
})

socket.on(EVENTS.PLAYER_JOINED, player => {
  console.log(JSON.stringify(player))
  game.addPlayer(player)
  renderDOMPlayerList()
})

socket.on(EVENTS.PLAYER_LEFT, id => {
  game.removePlayer(id)
  renderDOMPlayerList()
})

socket.on(EVENTS.STATE_DELTA, delta => {
  const before = Object.keys(game.knownState.players).length
  game.receiveState(delta)
  const after  = Object.keys(game.knownState.players).length
  if (after !== before) renderDOMPlayerList()
})

socket.on(EVENTS.SCENE_CHANGE, (data) => {
  const { scene, ...meta } = data
  game.switchScene(scene, meta)
  currentLevelMeta = meta
  setSceneControls(scene)
  renderLevelPanel(scene, meta)

  if (scene === 'battle' || scene === 'bossFight') audio.playTransition()
  else if (scene === 'result')  audio.playVictory()
  else if (scene === 'gameover') audio.playDefeat()
})

socket.on(EVENTS.OBJECTIVE_UPDATE, ({ objectives }) => {
  game.updateObjectives(objectives)
  renderLevelPanel(startBtn.dataset.scene, currentLevelMeta ?? {}, objectives)
})

socket.on(EVENTS.SET_LEVEL, ({ levelIndex, levelName }) => {
  selectedLevel = levelIndex
  updateLevelDisplay()
})

// ── VFX events ───────────────────────────────────────────────────────────

socket.on(EVENTS.SKILL_FIRED, data => {
  game.activeRenderer?.onSkillFired?.(data)
})

socket.on(EVENTS.EFFECT_DAMAGE, data => {
  game.activeRenderer?.onEffectDamage?.(data)
})

socket.on(EVENTS.TARGETED_HIT, data => {
  game.activeRenderer?.onTargetedHit?.(data)
})

socket.on(EVENTS.CHANNEL_INTERRUPTED, data => {
  game.activeRenderer?.onChannelInterrupted?.(data)
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
