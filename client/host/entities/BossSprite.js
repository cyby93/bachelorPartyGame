/**
 * client/host/entities/BossSprite.js
 * Visual representation of bosses.
 * Receives the boss config object (ILLIDAN_CONFIG / SHADE_OF_AKAMA_CONFIG) so
 * sprite sizing, animation keys, and phase model swaps all come from config.
 */

import { Container, Graphics, Text, Sprite, Assets } from 'pixi.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'
import { DIRECTIONAL_BOSS_ANIMATIONS } from '../HostGame.js'
import OverheadDisplay from '../systems/OverheadDisplay.js'

const BAR_W = 100

const DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']

function angleToDir(angle) {
  const TAU  = Math.PI * 2
  const norm = ((angle % TAU) + TAU) % TAU
  const idx  = Math.round(norm / (Math.PI / 4)) % 8
  return DIRS[idx]
}

export default class BossSprite {
  constructor(bossConfig) {
    this.container = new Container()
    this._body     = new Container()
    this.container.addChild(this._body)

    this._config   = bossConfig
    this._bossName = bossConfig.name
    this._radius   = bossConfig.radius

    // Directional animation state
    this._bossType        = bossConfig.spriteType ?? 'illidan'
    this._animState       = 'idle'
    this._animFrame       = 0
    this._lastAnimFrame   = -1
    this._animTimer       = 0
    this._currentDir      = null
    this._lastRenderX     = null
    this._lastRenderY     = null
    this._walkLinger      = 0    // seconds remaining before falling back to idle
    this._transitionTimer = 0    // seconds remaining in one-shot phase transition animation

    if (this._bossName === 'Shade of Akama') {
      this._buildShadeOfAkama()
    } else {
      this._buildIllidan()
    }

    // ── HP bar ────────────────────────────────────────────────────────────
    const hpBg = new Graphics()
    hpBg.rect(-BAR_W / 2, 0, BAR_W, 8)
    hpBg.fill('#330000')
    hpBg.stroke({ color: '#ffffff', width: 0.5, alpha: 0.3 })
    hpBg.position.set(0, -this._radius - 26)

    this._hpFill = new Graphics()
    this._hpFill.position.set(0, -this._radius - 26)

    this.container.addChild(hpBg)
    this.container.addChild(this._hpFill)

    this._lastHpPct = -1
    this._updateHpBar(1.0)

    // Overhead display — cast bar enabled so players can see boss ability wind-ups
    this.overhead = new OverheadDisplay(this.container, {
      yOffset: -this._radius - 26,
      showCastBar: true,
      showStatusIcons: false,
    })

    if (GAME_CONFIG.DEBUG_HITBOXES) {
      const hb = new Graphics()
      if (bossConfig.hitboxShape === 'oval') {
        hb.ellipse(0, 0, this._radius / 2, this._radius)
      } else {
        hb.circle(0, 0, this._radius)
      }
      hb.stroke({ color: 0xff00ff, width: 2, alpha: 0.9 })
      this.container.addChild(hb)
    }
  }

  _buildIllidan() {
    const R = this._radius
    const sprite = new Sprite(Assets.get(`${this._bossType}_south`))
    sprite.anchor.set(0.5)
    sprite.width  = R * 4
    sprite.height = R * 4
    this._body.addChild(sprite)
  }

  _buildShadeOfAkama() {
    const R = this._radius

    const sprite = new Sprite(Assets.get('akama_south'))
    sprite.anchor.set(0.5)
    sprite.width  = R * 4
    sprite.height = R * 4
    sprite.tint   = 0x9b59b6  // purple hue — captured spirit effect
    sprite.alpha  = 0.65
    this._body.addChild(sprite)

    const nameLabel = new Text({
      text:  'Shade of Akama',
      style: { fontFamily: 'Arial', fontSize: 14, fontWeight: 'bold', fill: '#9b59b6', align: 'center' },
    })
    nameLabel.anchor.set(0.5, 1)
    nameLabel.position.set(0, -R - 10)
    this.container.addChild(nameLabel)
  }

  _updateHpBar(pct) {
    if (pct === this._lastHpPct) return
    this._lastHpPct = pct

    this._hpFill.clear()
    if (pct > 0) {
      const color = pct > 0.6 ? '#e74c3c' : pct > 0.3 ? '#ff6600' : '#ff0000'
      this._hpFill.rect(-BAR_W / 2, 0, BAR_W * pct, 8)
      this._hpFill.fill(color)
    }
  }

  /**
   * Trigger a one-shot phase transition animation for `freezeDuration` seconds.
   * The boss will stay locked in the 'transition' state for that window.
   * No-op if the current boss type has no 'transition' animation config.
   * @param {number} freezeDuration  milliseconds (from ILLIDAN_PHASE_TRANSITION payload)
   */
  triggerPhaseTransition(freezeDuration) {
    const animCfg = DIRECTIONAL_BOSS_ANIMATIONS[this._bossType]
    if (!animCfg?.transition) return
    this._transitionTimer = (freezeDuration ?? 3000) / 1000
    this._animState  = 'transition'
    this._animFrame  = 0
    this._animTimer  = 0
    this._currentDir = null
  }

  update(state, dt = 0) {
    this.container.position.set(state.x, state.y)

    if (state.radius && state.radius !== this._radius) {
      this._radius = state.radius
    }

    if (state.maxHp) this._updateHpBar(state.hp / state.maxHp)

    this.overhead.updateCastBar(state.castProgress ?? 0)

    // Phase model swap — driven by config.phaseModels if defined
    const phaseModels = this._config.phaseModels
    if (phaseModels) {
      const modelForPhase = phaseModels[state.phase]
      if (modelForPhase && modelForPhase !== this._bossType) {
        this._bossType   = modelForPhase
        // Don't reset animState here — triggerPhaseTransition() may have already set it
        this._animFrame  = 0
        this._animTimer  = 0
        this._currentDir = null
      }
    }

    const animCfg = DIRECTIONAL_BOSS_ANIMATIONS[this._bossType]
    if (!animCfg) return

    const dir = angleToDir(state.angle ?? Math.PI / 2)

    // Tick transition timer — locks all other animation during phase freeze window
    if (this._transitionTimer > 0) {
      this._transitionTimer = Math.max(0, this._transitionTimer - dt)
      if (this._transitionTimer === 0) {
        this._animState  = 'idle'
        this._animFrame  = 0
        this._animTimer  = 0
      }
    }

    if (this._animState !== 'transition') {
      const moved = this._lastRenderX !== null &&
        (Math.abs(state.x - this._lastRenderX) > 0.3 ||
         Math.abs(state.y - this._lastRenderY) > 0.3)
      if (moved) this._walkLinger = 0.15
      else        this._walkLinger = Math.max(0, this._walkLinger - dt)

      const newState = this._walkLinger > 0 ? 'walk' : 'idle'
      if (newState !== this._animState) {
        this._animState = newState
        this._animFrame = 0
        this._animTimer = 0
      }
    }
    this._lastRenderX = state.x
    this._lastRenderY = state.y

    const cfg = animCfg[this._animState] ?? animCfg.idle
    this._animTimer += dt
    if (this._animTimer >= 1 / cfg.fps) {
      this._animTimer -= 1 / cfg.fps
      if (this._animState === 'transition') {
        this._animFrame = Math.min(this._animFrame + 1, cfg.frames - 1)
      } else {
        this._animFrame = (this._animFrame + 1) % cfg.frames
      }
    }

    if (dir !== this._currentDir || this._animFrame !== this._lastAnimFrame) {
      const key = `${this._bossType}_${this._animState}_${dir}_${this._animFrame}`
      const tex = Assets.get(key)
      if (tex) {
        this._body.children[0].texture = tex
      } else {
        const fallback = Assets.get(`${this._bossType}_${dir}`)
        if (fallback) this._body.children[0].texture = fallback
      }
      this._currentDir    = dir
      this._lastAnimFrame = this._animFrame
    }
  }

  destroy() {
    this.overhead.destroy()
    this.container.destroy({ children: true })
  }
}
