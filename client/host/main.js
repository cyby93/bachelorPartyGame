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
import { LEVEL_SELECT_OPTIONS } from '../../shared/LevelConfig.js'
import HostGame       from './HostGame.js'
import AudioManager   from './systems/AudioManager.js'

// ── PixiJS game init (top-level await — supported in Vite ESM) ─────────────
const game  = new HostGame()
const audio = new AudioManager()
await game.init(document.getElementById('canvas-wrap'))

// ── Socket ─────────────────────────────────────────────────────────────────
const socket = io({ transports: ['websocket'] })
game.setSocket(socket)

// ── DOM refs ───────────────────────────────────────────────────────────────
const body           = document.body
const badge          = document.getElementById('conn-badge')
const serverIpEl     = document.getElementById('server-ip')
const playerListEl   = document.getElementById('player-list')
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

const SANDBOX_ENEMY_ACTIONS = [
  { label: 'Add Felguard', enemyType: 'felGuard' },
  { label: 'Add Harpooner', enemyType: 'coilskarHarpooner' },
  { label: 'Add Brute', enemyType: 'bonechewerBrute' },
  { label: 'Add Mystic', enemyType: 'ashtonghueMystic' },
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
const levelPanelEl   = document.getElementById('level-panel')
const gameplayLevelIndexEl = document.getElementById('gameplay-level-index')
const gameplayLevelNameEl = document.getElementById('gameplay-level-name')
const objectiveLabelEl = document.getElementById('gameplay-objective-label')
const objectiveValueEl = document.getElementById('gameplay-objective-value')
const shadeBuffCardEl  = document.getElementById('gameplay-shade-card')
const shadeHpValueEl   = document.getElementById('gameplay-shade-hp')
const shadeBuffTextEl  = document.getElementById('gameplay-shade-text')
const rosterEl         = document.getElementById('gameplay-roster')
const damageMeterEl    = document.getElementById('damage-meter-list')
const healingMeterEl   = document.getElementById('healing-meter-list')

let connectionHideTimer = null
let shellMode = 'menu'

function syncAudioControls() {
  const settings = audio.getSettings()
  if (audioMasterEl) audioMasterEl.value = String(Math.round(settings.master * 100))
  if (audioMusicEl) audioMusicEl.value = String(Math.round(settings.music * 100))
  if (audioSfxEl) audioSfxEl.value = String(Math.round(settings.sfx * 100))
  if (audioVoiceEl) audioVoiceEl.value = String(Math.round(settings.voice * 100))
  if (audioMuteEl) audioMuteEl.checked = !!settings.muted

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
  if (!activeSandbox) return

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

  if (sandboxStatusEl && !sandboxStatusEl.textContent) {
    sandboxStatusEl.textContent = 'Sandbox controls ready.'
    sandboxStatusEl.dataset.error = 'false'
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

// ── DOM helpers ────────────────────────────────────────────────────────────

function renderDOMPlayerList() {
  const players = Object.values(game.knownState.players).filter(p => !p.isHost)

  if (players.length === 0) {
    playerListEl.innerHTML = '<p id="waiting-msg">Waiting for raid members…</p>'
    if (startBtn.dataset.scene === 'lobby') startBtn.disabled = true
    return
  }

  const botCount = players.filter(p => p.isBot).length
  if (botCountEl) botCountEl.textContent = `${botCount} / 12 bots`

  playerListEl.innerHTML = players.map(p => {
    const color  = CLASSES[p.className]?.color ?? '#aaa'
    const botTag = p.isBot ? ' <span style="color:#555;font-size:10px">[BOT]</span>' : ''
    return `
      <div class="player-item" style="border-left-color:${color}">
        <span class="pname">${p.name}${botTag}</span>
        <span class="pclass" style="color:${color}">${p.className}</span>
      </div>`
  }).join('')

  if (startBtn.dataset.scene === 'lobby') startBtn.disabled = false
}

function clearLevelPanel() {
  if (levelPanelEl) levelPanelEl.hidden = true
  if (gameplayLevelIndexEl) gameplayLevelIndexEl.textContent = ''
  if (gameplayLevelNameEl) gameplayLevelNameEl.textContent = 'Current level'
  if (objectiveLabelEl) objectiveLabelEl.textContent = ''
  if (objectiveValueEl) objectiveValueEl.textContent = ''
  if (shadeBuffCardEl) shadeBuffCardEl.hidden = true
}

function renderGameplayRoster() {
  if (!rosterEl) return

  const players = Object.values(game.knownState.players)
    .filter(p => !p.isHost)
    .sort((a, b) => a.name.localeCompare(b.name))

  if (players.length === 0) {
    rosterEl.innerHTML = '<div class="empty-state">Waiting for raid members…</div>'
    return
  }

  rosterEl.innerHTML = players.map(player => {
    const color = CLASSES[player.className]?.color ?? '#ffffff'
    const maxHp = Math.max(1, player.maxHp ?? player.hp ?? 1)
    const hp = Math.max(0, Math.ceil(player.hp ?? 0))
    const hpPct = player.isDead ? 0 : Math.max(0, Math.min(1, hp / maxHp))
    const state = player.isDead ? 'Dead' : `${hp} / ${Math.ceil(maxHp)} HP`

    return `
      <div class="roster-row${player.isDead ? ' dead' : ''}">
        <div class="roster-main">
          <div class="roster-name" style="color:${color}">${player.name}</div>
          <div class="roster-hpbar"><div class="roster-hpfill" style="width:${hpPct * 100}%"></div></div>
        </div>
        <div class="roster-state">${state}</div>
      </div>`
  }).join('')
}

function renderMeterList(container, totals, rateSuffix, emptyText) {
  if (!container) return

  const players = Object.values(game.knownState.players).filter(p => !p.isHost)
  const stats = game.knownState.stats
  const elapsed = Math.max(1, (Date.now() - (stats?.startTime ?? Date.now())) / 1000)

  const rows = players
    .map(player => ({
      player,
      total: totals?.[player.id] ?? 0,
      rate: Math.round((totals?.[player.id] ?? 0) / elapsed),
    }))
    .sort((a, b) => b.total - a.total)

  if (rows.length === 0 || rows.every(row => row.total === 0)) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`
    return
  }

  container.innerHTML = rows.map(({ player, total, rate }) => {
    const color = CLASSES[player.className]?.color ?? '#ffffff'
    return `
      <div class="meter-row">
        <div class="meter-main">
          <div class="meter-name" style="color:${color}">${player.name}</div>
        </div>
        <div class="meter-value">${total.toLocaleString()} (${rate}/${rateSuffix})</div>
      </div>`
  }).join('')
}

function renderGameplaySidebar() {
  renderGameplayRoster()
  renderMeterList(damageMeterEl, game.knownState.stats?.damage, 's', 'No damage yet.')
  renderMeterList(healingMeterEl, game.knownState.stats?.heal, 's', 'No healing yet.')
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
    renderSandboxPanel()
    return
  }

  const summary = formatObjective(objectives?.[0] ?? null, game.knownState)
  if (levelPanelEl) levelPanelEl.hidden = false
  if (gameplayLevelIndexEl) {
    gameplayLevelIndexEl.textContent = meta?.debugSandbox
      ? 'Debug Sandbox'
      : `Level ${meta?.levelNumber ?? ((meta?.levelIndex ?? 0) + 1)} / ${meta?.totalLevels ?? '?'}`
  }
  if (gameplayLevelNameEl) gameplayLevelNameEl.textContent = meta?.levelName ?? 'Current level'
  if (objectiveLabelEl) objectiveLabelEl.textContent = summary.label || 'Current objective'
  if (objectiveValueEl) objectiveValueEl.textContent = summary.value || 'In progress'

  // Shade of Akama buff card (Level 4 Phase 1 only)
  const boss = game.knownState?.boss
  if (shadeBuffCardEl) {
    if (boss && boss.isImmune && !boss.isDead) {
      shadeBuffCardEl.hidden = false
      const hp = Math.ceil(boss.hp ?? 0)
      const dmgPct = Math.round(((boss.damageMult ?? 1) - 1) * 100)
      if (shadeHpValueEl) shadeHpValueEl.textContent = `${hp.toLocaleString()} HP`
      if (shadeBuffTextEl) shadeBuffTextEl.textContent = dmgPct > 0 ? `+${dmgPct}% Damage` : 'No buff yet'
    } else {
      shadeBuffCardEl.hidden = true
    }
  }

  renderSandboxPanel()
}

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
  game.switchScene(scene, meta)
  currentLevelMeta = meta
  audio.setScene(scene, meta)
  setSceneControls(scene)
  renderLevelPanel(scene, meta)
  renderDOMPlayerList()
  renderGameplaySidebar()
  renderSandboxPanel()
  audio.syncPlayerState(game.knownState.players)
})

socket.on(EVENTS.PLAYER_JOINED, player => {
  game.addPlayer(player)
  if (!player?.isHost) audio.handlePlayerJoined()
  renderDOMPlayerList()
  renderGameplaySidebar()
})

socket.on(EVENTS.PLAYER_LEFT, id => {
  game.removePlayer(id)
  renderDOMPlayerList()
  renderGameplaySidebar()
})

socket.on(EVENTS.STATE_DELTA, delta => {
  const before = Object.keys(game.knownState.players).length
  game.receiveState(delta)
  const after  = Object.keys(game.knownState.players).length
  if (after !== before) renderDOMPlayerList()
  renderGameplaySidebar()
  renderSandboxPanel()
  audio.syncPlayerState(game.knownState.players)

  // Update shade buff card live during Level 4 Phase 1
  if (shadeBuffCardEl && !shadeBuffCardEl.hidden) {
    const boss = game.knownState?.boss
    if (boss && boss.isImmune && !boss.isDead) {
      const hp = Math.ceil(boss.hp ?? 0)
      const dmgPct = Math.round(((boss.damageMult ?? 1) - 1) * 100)
      if (shadeHpValueEl) shadeHpValueEl.textContent = `${hp.toLocaleString()} HP`
      if (shadeBuffTextEl) shadeBuffTextEl.textContent = dmgPct > 0 ? `+${dmgPct}% Damage` : 'No buff yet'
    } else {
      shadeBuffCardEl.hidden = true
    }
  }
})

socket.on(EVENTS.SCENE_CHANGE, (data) => {
  const { scene, ...meta } = data
  game.switchScene(scene, meta)
  currentLevelMeta = meta
  audio.setScene(scene, meta)
  setSceneControls(scene)
  renderLevelPanel(scene, meta)
  renderGameplaySidebar()
  renderSandboxPanel()
})

socket.on(EVENTS.OBJECTIVE_UPDATE, ({ objectives }) => {
  game.updateObjectives(objectives)
  renderLevelPanel(startBtn.dataset.scene, currentLevelMeta ?? {}, objectives)
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
  game.activeRenderer?.onChannelInterrupted?.(data)
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
