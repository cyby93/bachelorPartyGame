/**
 * client/host/entities/EnemySprite.js
 * Visual for a single enemy, styled by archetype type.
 *
 * BT enemies (felGuard, bonechewerBrute, etc.) use 8-directional animated
 * sprites identical in structure to player sprites.
 * Non-directional enemies fall back to a single static texture keyed in STATIC_SPRITE_KEY.
 */

import { Container, Graphics, Text, Sprite, Assets } from 'pixi.js'
import { GAME_CONFIG }    from '../../../shared/GameConfig.js'
import { ENEMY_TYPES }    from '../../../shared/EnemyTypeConfig.js'
import { DIRECTIONAL_ENEMIES, DIRECTIONAL_ENEMY_ANIMATIONS, DIRECTIONAL_STATIC_ENEMIES } from '../HostGame.js'
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

// Static sprite key per type, used when no directional animation exists
const STATIC_SPRITE_KEY = {
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
    this.type = data.type ?? 'felGuard'
    this.renderType = data.renderType ?? this.type

    const typeCfg     = ENEMY_TYPES[this.type] ?? ENEMY_TYPES.felGuard
    const R           = typeCfg.radius    ?? DEFAULT_R
    const genScale    = this.type === 'leviathan' ? Math.pow(0.75, data.generation ?? 0) : 1.5
    const displaySize = (typeCfg.spriteSize ?? R * 2) * genScale
    const D           = displaySize / 2
    const color       = typeCfg.color ?? '#c0392b'

    this._isDirectional       = DIRECTIONAL_ENEMIES.has(this.renderType)
    this._isDirectionalStatic = DIRECTIONAL_STATIC_ENEMIES.has(this.renderType)
    this._animCfg             = DIRECTIONAL_ENEMY_ANIMATIONS[this.renderType] ?? null
    this._animState          = 'idle'
    this._animFrame          = 0
    this._lastAnimFrame      = -1
    this._animTimer          = 0
    this._currentDir         = null
    this._lastRenderX        = null
    this._lastRenderY        = null
    this._attackTimer        = 0        // seconds remaining in one-shot attack animation
    this._currentAttackAbility = null   // ability key being played in 'attack' state
    this._forcedAnimation    = data.forcedAnimation ?? null

    this.container = new Container()

    // Body sprite
    let initialTex
    if (this._isDirectional || this._isDirectionalStatic) {
      initialTex = Assets.get(`enemy_${this.renderType}_south`) ?? Assets.get(STATIC_SPRITE_KEY[this.renderType] ?? `enemy_felguard_south`)
    } else {
      initialTex = Assets.get(STATIC_SPRITE_KEY[this.renderType] ?? `enemy_felguard_south`)
    }
    this._body = new Sprite(initialTex)
    this._body.anchor.set(0.5)
    this._body.width  = displaySize
    this._body.height = displaySize
    this.container.addChild(this._body)

    // Leviathan: persistent aura rings + pulse state
    if (this.type === 'leviathan') {
      this._leviathanPulseTime = 0
      this._bodyBaseScaleX     = this._body.scale.x
      this._bodyBaseScaleY     = this._body.scale.y

      // Outer glow ring (deep teal, slow pulse)
      this._leviathanAuraOuter = new Graphics()
      this._leviathanAuraOuter.circle(0, 0, D + 20)
      this._leviathanAuraOuter.stroke({ color: 0x1a9e8a, width: 3 })
      this.container.addChildAt(this._leviathanAuraOuter, 0)

      // Inner shimmer ring (bright teal, faster pulse)
      this._leviathanAuraInner = new Graphics()
      this._leviathanAuraInner.circle(0, 0, D + 8)
      this._leviathanAuraInner.stroke({ color: 0x2dd4bf, width: 2 })
      this.container.addChildAt(this._leviathanAuraInner, 0)
    }

    // Shield arc (Serpent Guard) — hidden by default
    this._shieldGfx     = new Graphics()
    this._shieldGfx.alpha = 0
    this._shieldVisible   = false
    this.container.addChild(this._shieldGfx)

    // Berserk ring (Blade Fury) — hidden by default
    this._berserkGfx   = new Graphics()
    this._berserkGfx.alpha = 0
    this.container.addChild(this._berserkGfx)
    this._drawBerserkRing(typeCfg.berserkRadius ?? 65)

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

    if (GAME_CONFIG.DEBUG_HITBOXES) {
      const hb = new Graphics()
      if (typeCfg.hitboxShape === 'circle') {
        hb.circle(0, 0, R)
      } else {
        hb.ellipse(0, 0, R / 2, R)
      }
      hb.stroke({ color: 0xff00ff, width: 1.5, alpha: 0.9 })
      this.container.addChild(hb)
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

  _drawBerserkRing(radius) {
    const g = this._berserkGfx
    g.clear()
    g.circle(0, 0, radius)
    g.stroke({ color: 0xff3300, width: 2, alpha: 0.7 })
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  update(state, dt = 0) {
    this.container.position.set(state.x, state.y)
    if (state.hp != null) this._updateHpBar(state.hp)
    this._forcedAnimation = state.forcedAnimation ?? this._forcedAnimation

    // Directional + animated sprites
    if (this._isDirectional && this._animCfg) {
      const dir = angleToDir(state.angle ?? Math.PI / 2)

      // Trigger one-shot attack animation (one-tick signal from server)
      if (state.attackingAbility) {
        const cfg = this._animCfg.skills?.[state.attackingAbility] ?? this._animCfg.skills?.attack
        if (cfg) {
          this._currentAttackAbility = state.attackingAbility
          this._animState  = 'attack'
          this._animFrame  = 0
          this._animTimer  = 0
          this._attackTimer = cfg.frames / cfg.fps
        }
      }

      // Resolve animation state from position delta (attack state is non-interruptible by movement)
      const moved = this._lastRenderX !== null &&
        (Math.abs(state.x - this._lastRenderX) > 0.3 ||
         Math.abs(state.y - this._lastRenderY) > 0.3)
      this._lastRenderX = state.x
      this._lastRenderY = state.y

      if (this._forcedAnimation && this._animCfg[this._forcedAnimation]) {
        if (this._animState !== this._forcedAnimation) {
          this._animState = this._forcedAnimation
          this._animFrame = 0
          this._animTimer = 0
        }
      } else if (this._animState === 'attack') {
        this._attackTimer -= dt
        if (this._attackTimer <= 0) {
          this._attackTimer = 0
          this._animState   = moved ? 'walk' : 'idle'
          this._animFrame   = 0
          this._animTimer   = 0
        }
      } else {
        const newState = moved ? 'walk' : 'idle'
        if (newState !== this._animState) {
          this._animState = newState
          this._animFrame = 0
          this._animTimer = 0
        }
      }

      // Advance frame timer — attack cfg lives in skills sub-map
      const cfg = this._animState === 'attack'
        ? (this._animCfg.skills?.[this._currentAttackAbility] ?? this._animCfg.skills?.attack ?? this._animCfg.idle)
        : (this._animCfg[this._animState] ?? this._animCfg.idle)
      this._animTimer += dt
      if (this._animTimer >= 1 / cfg.fps) {
        this._animTimer -= 1 / cfg.fps
        this._animFrame  = (this._animFrame + 1) % cfg.frames
      }

      // Swap texture on direction or frame change
      if (dir !== this._currentDir || this._animFrame !== this._lastAnimFrame) {
        const animNameForKey = this._animState === 'attack'
          ? (this._currentAttackAbility ?? 'attack')
          : this._animState
        const key = `enemy_${this.renderType}_${animNameForKey}_${dir}_${this._animFrame}`
        const tex = Assets.get(key)
        if (tex) {
          this._body.texture = tex
        } else {
          const fallback = Assets.get(`enemy_${this.renderType}_${dir}`)
          if (fallback) this._body.texture = fallback
        }
        this._currentDir    = dir
        this._lastAnimFrame = this._animFrame
      }
    }

    // Directional static facing (no animation frames) — Leviathan
    if (this._isDirectionalStatic) {
      const dir = angleToDir(state.angle ?? Math.PI / 2)
      if (dir !== this._currentDir) {
        const tex = Assets.get(`enemy_${this.renderType}_${dir}`)
        if (tex) this._body.texture = tex
        this._currentDir = dir
      }
    }

    // Leviathan: breathing scale pulse + aura ring pulse
    if (this.type === 'leviathan') {
      this._leviathanPulseTime += dt
      const t = this._leviathanPulseTime
      const pulse = 1 + 0.05 * Math.sin(t * 1.8)
      this._body.scale.set(this._bodyBaseScaleX * pulse, this._bodyBaseScaleY * pulse)
      this._leviathanAuraOuter.alpha = 0.30 + 0.18 * Math.sin(t * 1.2)
      this._leviathanAuraInner.alpha = 0.50 + 0.25 * Math.sin(t * 2.4 + 0.9)
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
    this._berserkGfx.alpha = state.isBerserking ? 0.8 : 0
  }

  destroy() {
    this.overhead.destroy()
    this.container.destroy({ children: true })
  }
}
