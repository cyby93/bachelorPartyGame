/**
 * client/host/entities/EnemySprite.js
 * Visual for a single enemy, styled by archetype type.
 *
 * BT enemies (felGuard, bonechewerBrute, etc.) use 8-directional animated
 * sprites identical in structure to player sprites.
 * Legacy placeholder enemies (grunt, brute, etc.) fall back to a single
 * static texture.
 */

import { Container, Graphics, Text, Sprite, Assets } from 'pixi.js'
import { GAME_CONFIG }    from '../../../shared/GameConfig.js'
import { ENEMY_TYPES }    from '../../../shared/EnemyTypeConfig.js'
import { DIRECTIONAL_ENEMIES, DIRECTIONAL_ENEMY_ANIMATIONS } from '../HostGame.js'
import OverheadDisplay     from '../systems/OverheadDisplay.js'

const DEFAULT_R = GAME_CONFIG.ENEMY_RADIUS

// Direction names ordered by angle sector (0=East, clockwise) — same as PlayerSprite
const DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']

function angleToDir(angle) {
  const TAU  = Math.PI * 2
  const norm = ((angle % TAU) + TAU) % TAU
  const idx  = Math.round(norm / (Math.PI / 4)) % 8
  return DIRS[idx]
}

// Static sprite keys for legacy placeholder enemies
const LEGACY_SPRITE_KEY = {
  grunt:           'enemy_grunt',
  brute:           'enemy_brute',
  archer:          'enemy_archer',
  charger:         'enemy_charger',
  healer:          'enemy_healer',
  gateRepairer:    'enemy_gaterepairer',
  leviathan:       'enemy_leviathan',
  warlock:         'enemy_warlock',
  flameOfAzzinoth: 'enemy_flameofazzinoth',
  shadowDemon:     'enemy_shadowdemon',
  shadowfiend:     'enemy_shadowfiend',
}

export default class EnemySprite {
  constructor(data) {
    this.id   = data.id
    this.type = data.type ?? 'grunt'

    const typeCfg     = ENEMY_TYPES[this.type] ?? ENEMY_TYPES.grunt
    const R           = typeCfg.radius    ?? DEFAULT_R
    const displaySize = typeCfg.spriteSize ?? R * 2
    const D           = displaySize / 2
    const color       = typeCfg.color ?? '#c0392b'

    this._isDirectional = DIRECTIONAL_ENEMIES.has(this.type)
    this._animCfg       = DIRECTIONAL_ENEMY_ANIMATIONS[this.type] ?? null
    this._animState     = 'idle'
    this._animFrame     = 0
    this._lastAnimFrame = -1
    this._animTimer     = 0
    this._currentDir    = null
    this._lastRenderX   = null
    this._lastRenderY   = null

    this.container = new Container()

    // Body sprite
    let initialTex
    if (this._isDirectional) {
      initialTex = Assets.get(`enemy_${this.type}_south`) ?? Assets.get(LEGACY_SPRITE_KEY[this.type] ?? 'enemy_grunt')
    } else {
      initialTex = Assets.get(LEGACY_SPRITE_KEY[this.type] ?? 'enemy_grunt')
    }
    this._body = new Sprite(initialTex)
    this._body.anchor.set(0.5)
    this._body.width  = displaySize
    this._body.height = displaySize
    this.container.addChild(this._body)

    // Shield arc (Serpent Guard) — hidden by default
    this._shieldGfx     = new Graphics()
    this._shieldGfx.alpha = 0
    this._shieldVisible   = false
    this.container.addChild(this._shieldGfx)

    // Berserk ring (Blade Fury) — hidden by default
    this._berserckGfx   = new Graphics()
    this._berserckGfx.alpha = 0
    this.container.addChild(this._berserckGfx)
    this._drawBerserckRing(typeCfg.berserckRadius ?? 65)

    // HP pip — fixed 30px wide, 4px tall
    const HP_W = 30, HP_H = 4
    this._hpBarW = HP_W
    this._hpBarH = HP_H
    this._hpBg   = new Graphics()
    this._hpFill = new Graphics()
    this._hpBg.rect(-HP_W / 2, 0, HP_W, HP_H)
    this._hpBg.fill('#111111')
    this._hpBg.position.set(0, -D - 6)
    this._hpFill.position.set(0, -D - 6)
    this.container.addChild(this._hpBg)
    this.container.addChild(this._hpFill)

    this._R           = R
    this._displaySize = displaySize
    this._color       = color
    this._maxHp       = data.maxHp ?? typeCfg.hp ?? 30
    this._lastHp      = -1
    this._updateHpBar(data.hp ?? this._maxHp)

    this.overhead = new OverheadDisplay(this.container, {
      yOffset: -D - 6,
      showCastBar: false,
      showStatusIcons: false,
    })

    if (data.dummyName) {
      const label = new Text({
        text:  data.dummyName,
        style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: '#f1c40f', align: 'center' },
      })
      label.anchor.set(0.5, 1)
      label.position.set(0, -D - 18)
      this.container.addChild(label)
    }
  }

  // ── Drawing helpers ────────────────────────────────────────────────────────

  _updateHpBar(hp) {
    if (hp === this._lastHp) return
    this._lastHp = hp
    const W   = this._hpBarW
    const H   = this._hpBarH
    const pct = Math.max(0, hp / this._maxHp)
    this._hpFill.clear()
    if (pct > 0) {
      this._hpFill.rect(-W / 2, 0, W * pct, H)
      this._hpFill.fill(this._color)
    }
  }

  _drawShieldArc(angle, arc) {
    const g    = this._shieldGfx
    const r    = this._displaySize / 2 + 6
    const half = arc / 2
    g.clear()
    g.moveTo(0, 0)
    g.arc(0, 0, r, angle - half, angle + half)
    g.lineTo(0, 0)
    g.fill({ color: 0x4db8e8, alpha: 0.2 })
    g.arc(0, 0, r, angle - half, angle + half)
    g.stroke({ color: 0x4db8e8, width: 3, alpha: 0.85 })
  }

  _drawBerserckRing(radius) {
    const g = this._berserckGfx
    g.clear()
    g.circle(0, 0, radius)
    g.stroke({ color: 0xff3300, width: 2, alpha: 0.7 })
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  update(state, dt = 0) {
    this.container.position.set(state.x, state.y)
    if (state.hp != null) this._updateHpBar(state.hp)

    // Directional + animated sprites
    if (this._isDirectional && this._animCfg) {
      const dir = angleToDir(state.angle ?? Math.PI / 2)

      // Resolve animation state from position delta
      const moved = this._lastRenderX !== null &&
        (Math.abs(state.x - this._lastRenderX) > 0.3 ||
         Math.abs(state.y - this._lastRenderY) > 0.3)
      const newState = moved ? 'walk' : 'idle'
      if (newState !== this._animState) {
        this._animState = newState
        this._animFrame = 0
        this._animTimer = 0
      }
      this._lastRenderX = state.x
      this._lastRenderY = state.y

      // Advance frame timer
      const cfg = this._animCfg[this._animState] ?? this._animCfg.idle
      this._animTimer += dt
      if (this._animTimer >= 1 / cfg.fps) {
        this._animTimer -= 1 / cfg.fps
        this._animFrame  = (this._animFrame + 1) % cfg.frames
      }

      // Swap texture on direction or frame change
      if (dir !== this._currentDir || this._animFrame !== this._lastAnimFrame) {
        const key = `enemy_${this.type}_${this._animState}_${dir}_${this._animFrame}`
        const tex = Assets.get(key)
        if (tex) {
          this._body.texture = tex
        } else {
          const fallback = Assets.get(`enemy_${this.type}_${dir}`)
          if (fallback) this._body.texture = fallback
        }
        this._currentDir    = dir
        this._lastAnimFrame = this._animFrame
      }
    }

    // Shield arc (Serpent Guard)
    if (state.shieldAngle != null) {
      const typeCfg  = ENEMY_TYPES[this.type]
      this._drawShieldArc(state.shieldAngle, typeCfg?.shieldArc ?? 2.094)
      this._shieldGfx.alpha = 1
      this._shieldVisible   = true
    } else if (this._shieldVisible) {
      this._shieldGfx.alpha = 0
      this._shieldVisible   = false
    }

    // Berserk ring (Blade Fury)
    this._berserckGfx.alpha = state.isBerserking ? 0.8 : 0
  }

  destroy() {
    this.overhead.destroy()
    this.container.destroy({ children: true })
  }
}
