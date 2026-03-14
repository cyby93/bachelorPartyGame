/**
 * client/host/main.js
 * Host display entry point.
 *
 * Responsibilities:
 *  - Bootstrap PixiJS via HostGame
 *  - Manage the DOM sidebar (player list, QR code, start/restart button)
 *  - Wire all socket events to HostGame + DOM
 */

import { io }      from 'socket.io-client'
import { EVENTS }  from '../../shared/protocol.js'
import { CLASSES } from '../../shared/ClassConfig.js'
import HostGame    from './HostGame.js'

// ── PixiJS game init (top-level await — supported in Vite ESM) ─────────────
const game = new HostGame()
await game.init(document.getElementById('canvas-wrap'))

// ── Socket ─────────────────────────────────────────────────────────────────
const socket = io()

// ── DOM refs ───────────────────────────────────────────────────────────────
const badge        = document.getElementById('conn-badge')
const serverIpEl   = document.getElementById('server-ip')
const playerListEl = document.getElementById('player-list')
const startBtn     = document.getElementById('start-btn')
const qrWrap       = document.getElementById('qr-code')

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

  // Display the controller URL and generate QR code
  const controllerUrl = `${window.location.origin}/controller`
  serverIpEl.textContent = controllerUrl.replace(/^https?:\/\//, '')

  if (typeof QRCode !== 'undefined') {
    qrWrap.innerHTML = ''
    new QRCode(qrWrap, {
      text:       controllerUrl,
      width:      150,
      height:     150,
      colorDark:  '#000000',
      colorLight: '#ffffff',
    })
  }

  // Register as the host player
  socket.emit(EVENTS.JOIN, { name: 'Host Display', className: 'Warrior', isHost: true })
})

socket.on('disconnect', () => {
  badge.textContent = 'Disconnected'
  badge.classList.remove('connected')
})

socket.on(EVENTS.INIT, state => {
  game.receiveFullState(state)
  game.switchScene(state.scene ?? 'lobby')
  setSceneControls(state.scene ?? 'lobby')
  renderDOMPlayerList()
})

socket.on(EVENTS.PLAYER_JOINED, player => {
  game.addPlayer(player)
  renderDOMPlayerList()
})

socket.on(EVENTS.PLAYER_LEFT, id => {
  game.removePlayer(id)
  renderDOMPlayerList()
})

socket.on(EVENTS.STATE_DELTA, delta => {
  game.receiveState(delta)
})

socket.on(EVENTS.SCENE_CHANGE, ({ scene }) => {
  game.switchScene(scene)
  setSceneControls(scene)
})
