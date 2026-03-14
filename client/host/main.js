/**
 * client/host/main.js
 * Phase 1 — server connection, player list, protocol smoke-test.
 * Phase 2 will replace the canvas placeholder with a full PixiJS renderer.
 */

import { io }     from 'socket.io-client'
import { EVENTS } from '../../shared/protocol.js'
import { CLASSES } from '../../shared/ClassConfig.js'

// ── Socket connection ──────────────────────────────────────────────────────
const socket = io()

// ── DOM refs ───────────────────────────────────────────────────────────────
const badge      = document.getElementById('conn-badge')
const serverIpEl = document.getElementById('server-ip')
const playerList = document.getElementById('player-list')
const waitingMsg = document.getElementById('waiting-msg')
const startBtn   = document.getElementById('start-btn')
const qrWrap     = document.getElementById('qr-code')
const canvas     = document.getElementById('game-canvas')
const ctx        = canvas.getContext('2d')

// ── Canvas placeholder (Phase 2 will swap this for PixiJS) ────────────────
canvas.width  = 1024
canvas.height = 768

function drawPlaceholder(playerCount) {
  ctx.fillStyle = '#0a1018'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  for (let x = 0; x < canvas.width;  x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke() }
  for (let y = 0; y < canvas.height; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);  ctx.stroke() }

  ctx.textAlign    = 'center'
  ctx.fillStyle    = 'rgba(0, 210, 255, 0.15)'
  ctx.font         = 'bold 48px Arial'
  ctx.fillText('RAID NIGHT', canvas.width / 2, canvas.height / 2 - 20)
  ctx.font         = '18px Arial'
  ctx.fillStyle    = 'rgba(255,255,255,0.2)'
  ctx.fillText(`${playerCount} player${playerCount !== 1 ? 's' : ''} connected — waiting to start`, canvas.width / 2, canvas.height / 2 + 24)
}

// ── Local state ────────────────────────────────────────────────────────────
const players = new Map()   // id → DTO

function renderPlayerList() {
  const list = Array.from(players.values()).filter(p => !p.isHost)

  if (list.length === 0) {
    playerList.innerHTML = '<p id="waiting-msg">Waiting for players…</p>'
    startBtn.disabled = true
  } else {
    playerList.innerHTML = list.map(p => {
      const color = CLASSES[p.className]?.color ?? '#fff'
      return `
        <div class="player-item" style="border-left-color:${color}">
          <span class="pname">${p.name}</span>
          <span class="pclass" style="color:${color}">${p.className}</span>
        </div>`
    }).join('')
    startBtn.disabled = false
  }

  drawPlaceholder(list.length)
}

// ── Socket events ──────────────────────────────────────────────────────────
socket.on('connect', () => {
  badge.textContent = 'Connected'
  badge.classList.add('connected')

  const origin   = window.location.origin
  const controllerUrl = origin + '/controller'

  // Display join URL
  serverIpEl.textContent = controllerUrl.replace(/^https?:\/\//, '')

  // QR code
  qrWrap.innerHTML = ''
  if (typeof QRCode !== 'undefined') {
    new QRCode(qrWrap, { text: controllerUrl, width: 150, height: 150, colorDark: '#000', colorLight: '#fff' })
  }

  // Join as host
  socket.emit(EVENTS.JOIN, { name: 'Host Display', className: 'Warrior', isHost: true })
})

socket.on('disconnect', () => {
  badge.textContent = 'Disconnected'
  badge.classList.remove('connected')
})

socket.on(EVENTS.INIT, state => {
  players.clear()
  Object.values(state.players).forEach(p => players.set(p.id, p))
  renderPlayerList()
})

socket.on(EVENTS.PLAYER_JOINED, player => {
  players.set(player.id, player)
  renderPlayerList()
})

socket.on(EVENTS.PLAYER_LEFT, id => {
  players.delete(id)
  renderPlayerList()
})

socket.on(EVENTS.STATE_DELTA, delta => {
  // Merge delta into local player map
  Object.values(delta.players ?? {}).forEach(d => {
    const existing = players.get(d.id)
    if (existing) Object.assign(existing, d)
  })
  // Phase 2: pass state to PixiJS renderer here
})

socket.on(EVENTS.SCENE_CHANGE, ({ scene }) => {
  console.log('[host] scene →', scene)
  // Phase 2: trigger scene transition in PixiJS renderer
})

// ── Host controls ──────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
  socket.emit(EVENTS.START_GAME)
})

// Initial draw
drawPlaceholder(0)
