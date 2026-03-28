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
import HostGame       from './HostGame.js'
import AudioSystem    from './systems/AudioSystem.js'

// ── PixiJS game init (top-level await — supported in Vite ESM) ─────────────
const game  = new HostGame()
const audio = new AudioSystem()
await game.init(document.getElementById('canvas-wrap'))

// ── Socket ─────────────────────────────────────────────────────────────────
const socket = io()
console.log(socket);

// ── DOM refs ───────────────────────────────────────────────────────────────
const badge          = document.getElementById('conn-badge')
const serverIpEl     = document.getElementById('server-ip')
const playerListEl   = document.getElementById('player-list')
const startBtn       = document.getElementById('start-btn')
const qrWrap         = document.getElementById('qr-code')
const fullscreenBtn  = document.getElementById('fullscreen-btn')

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

function setSceneControls(scene) {
  startBtn.dataset.scene = scene

  if (scene === 'lobby') {
    startBtn.textContent = 'START GAME'
    startBtn.disabled    = Object.values(game.knownState.players).filter(p => !p.isHost).length === 0
    startBtn.style.display = ''
    startBtn.onclick     = () => socket.emit(EVENTS.START_GAME)
  } else if (scene === 'result' || scene === 'gameover') {
    startBtn.textContent   = 'RESTART GAME'
    startBtn.disabled      = false
    startBtn.style.display = ''
    startBtn.onclick       = () => socket.emit(EVENTS.RESTART_GAME)
  } else {
    // In-game: hide the button
    startBtn.style.display = 'none'
  }
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
  game.switchScene(state.scene ?? 'lobby')
  setSceneControls(state.scene ?? 'lobby')
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

socket.on(EVENTS.SCENE_CHANGE, ({ scene }) => {
  game.switchScene(scene)
  setSceneControls(scene)

  if (scene === 'trashMob' || scene === 'bossFight') audio.playTransition()
  else if (scene === 'result')  audio.playVictory()
  else if (scene === 'gameover') audio.playDefeat()
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
