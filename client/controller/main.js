/**
 * client/controller/main.js
 * Phase 1 — join flow, move joystick, skill buttons, HP + cooldown display.
 * Phase 3 will rewrite this as a Svelte component tree.
 */

import { io }       from 'socket.io-client'
import { EVENTS }   from '../../shared/protocol.js'
import { CLASSES }  from '../../shared/ClassConfig.js'

// ── Socket ─────────────────────────────────────────────────────────────────
const socket = io()

// ── Screen refs ────────────────────────────────────────────────────────────
const joinScreen = document.getElementById('join-screen')
const waitScreen = document.getElementById('wait-screen')
const gameScreen = document.getElementById('game-screen')
const deadOverlay = document.getElementById('dead-overlay')

const nameInput   = document.getElementById('name-input')
const classSelect = document.getElementById('class-select')
const joinBtn     = document.getElementById('join-btn')
const waitInfo    = document.getElementById('wait-class-info')

const hudName  = document.getElementById('hud-name')
const hudHp    = document.getElementById('hud-hp')
const skillGrid = document.getElementById('skill-grid')

// ── State ──────────────────────────────────────────────────────────────────
let myId        = null
let myClassName = null
let myMaxHp     = null
let moveJoystick = null

// Cooldown animation handles: skillIndex → requestAnimationFrame id
const cdFrames    = [null, null, null, null]
const cdExpiry    = [0, 0, 0, 0]

// ── Screen transitions ─────────────────────────────────────────────────────
function showScreen(id) {
  for (const el of [joinScreen, waitScreen, gameScreen]) {
    el.classList.toggle('active', el.id === id)
  }
}

// ── Join ───────────────────────────────────────────────────────────────────
joinBtn.addEventListener('click', () => {
  const name      = nameInput.value.trim() || 'Player'
  const className = classSelect.value

  myClassName = className
  myMaxHp     = CLASSES[className].hp

  socket.emit(EVENTS.JOIN, { name, className, isHost: false })

  // Build skill buttons while transitioning
  buildSkillGrid(className)

  hudName.textContent = name
  hudHp.textContent   = `HP: ${myMaxHp} / ${myMaxHp}`

  waitInfo.textContent = `${name} · ${className}`
  showScreen('wait-screen')
})

socket.on('connect', () => { myId = socket.id })

// ── Build skill grid ───────────────────────────────────────────────────────
function buildSkillGrid(className) {
  const skills = CLASSES[className]?.skills ?? []
  skillGrid.innerHTML = ''

  skills.forEach((skill, i) => {
    const btn = document.createElement('div')
    btn.className   = 'skill-btn'
    btn.id          = `skill-${i}`
    btn.dataset.idx = i
    btn.innerHTML   = `
      <span class="skill-icon">${skill.icon}</span>
      <span class="skill-name">${skill.name}</span>
      <div class="cd-overlay" id="cd-${i}"></div>`
    skillGrid.appendChild(btn)
  })

  setupSkillInput()
}

// ── Skill input ────────────────────────────────────────────────────────────
function setupSkillInput() {
  const skills = CLASSES[myClassName]?.skills ?? []

  skills.forEach((skill, i) => {
    const btn = document.getElementById(`skill-${i}`)
    if (!btn) return

    const inputType = skill.inputType

    if (inputType === 'INSTANT') {
      // Single tap — fire immediately on touchstart
      btn.addEventListener('touchstart', e => {
        e.preventDefault()
        fireSkill(i, { x: 1, y: 0 })
      }, { passive: false })

    } else if (inputType === 'DIRECTIONAL' || inputType === 'TARGETED') {
      // Drag joystick on the button — release fires with that direction/position
      let joystick = null
      let lastVector = { x: 1, y: 0 }

      btn.addEventListener('touchstart', e => {
        e.preventDefault()
        if (joystick) { joystick.destroy(); joystick = null }

        joystick = nipplejs.create({
          zone:  btn,
          mode:  'dynamic',
          color: 'rgba(255,255,255,0.6)',
          size:  80,
        })

        joystick.on('move', (_, data) => {
          if (data.vector) {
            lastVector = { x: data.vector.x, y: -data.vector.y }
            // Normalise
            const mag = Math.sqrt(lastVector.x ** 2 + lastVector.y ** 2)
            if (mag > 0) { lastVector.x /= mag; lastVector.y /= mag }
          }
        })

        joystick.on('end', (_, data) => {
          joystick.destroy(); joystick = null
          // Only fire if the drag left the deadzone
          if (data && data.distance > 10) {
            fireSkill(i, lastVector)
          }
        })
      }, { passive: false })

    } else if (inputType === 'SUSTAINED') {
      // Hold to activate, release to deactivate
      btn.addEventListener('touchstart', e => {
        e.preventDefault()
        socket.emit(EVENTS.INPUT_SKILL, { index: i, vector: { x: 1, y: 0 }, action: 'START' })
      }, { passive: false })
      btn.addEventListener('touchend', e => {
        e.preventDefault()
        socket.emit(EVENTS.INPUT_SKILL, { index: i, vector: { x: 1, y: 0 }, action: 'END' })
      }, { passive: false })
    }
  })
}

function fireSkill(index, vector) {
  if (cdExpiry[index] > Date.now()) return   // locally gated (server is authoritative)
  socket.emit(EVENTS.INPUT_SKILL, { index, vector })
}

// ── Move joystick ──────────────────────────────────────────────────────────
function setupMoveJoystick() {
  const zone = document.getElementById('move-zone')
  moveJoystick = nipplejs.create({ zone, mode: 'dynamic', color: 'rgba(255,255,255,0.4)', size: 100 })

  moveJoystick.on('move', (_, data) => {
    if (data.vector) {
      socket.emit(EVENTS.INPUT_MOVE, { x: data.vector.x, y: -data.vector.y })
    }
  })
  moveJoystick.on('end', () => {
    socket.emit(EVENTS.INPUT_MOVE, { x: 0, y: 0 })
  })
}

// ── Cooldown animation ─────────────────────────────────────────────────────
function startCooldownAnim(index, expiresAt) {
  cdExpiry[index] = expiresAt
  const btn     = document.getElementById(`skill-${index}`)
  const overlay = document.getElementById(`cd-${index}`)
  if (!btn || !overlay) return

  const total = expiresAt - Date.now()
  btn.classList.add('on-cd')

  const tick = () => {
    const remaining = expiresAt - Date.now()
    if (remaining <= 0) {
      overlay.style.height = '0%'
      btn.classList.remove('on-cd')
      cdFrames[index] = null
      return
    }
    overlay.style.height = `${(remaining / total) * 100}%`
    cdFrames[index] = requestAnimationFrame(tick)
  }

  if (cdFrames[index]) cancelAnimationFrame(cdFrames[index])
  cdFrames[index] = requestAnimationFrame(tick)
}

// ── Socket events ──────────────────────────────────────────────────────────
socket.on(EVENTS.SCENE_CHANGE, ({ scene }) => {
  if (scene === 'trashMob' || scene === 'bossFight') {
    showScreen('game-screen')
    setupMoveJoystick()
  } else if (scene === 'lobby') {
    showScreen('wait-screen')
  } else if (scene === 'result' || scene === 'gameover') {
    showScreen('wait-screen')
    waitInfo.textContent = scene === 'result' ? '🏆 Game over — waiting for restart' : '💀 Defeated — waiting for restart'
  }
})

socket.on(EVENTS.STATE_DELTA, delta => {
  if (!myId) return
  const me = delta.players?.[myId]
  if (!me) return

  if (me.hp      != null) hudHp.textContent = `HP: ${me.hp} / ${myMaxHp}`
  if (me.isDead  != null) deadOverlay.classList.toggle('visible', me.isDead)
})

socket.on(EVENTS.COOLDOWN, data => {
  if (data.playerId !== myId) return
  startCooldownAnim(data.skillIndex, data.expiresAt)
})

// Prevent browser scroll / zoom on the controller page
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false })
