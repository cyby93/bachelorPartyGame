/**
 * client/host/entities/PlayerSprite.js
 *
 * Visual representation of one player on the host canvas.
 *
 * Structure:
 *   container  (positioned at player world coords, NOT rotated)
 *   ├── body       (child Container — rotated for non-directional classes only)
 *   │   └── shapeSprite  (class sprite; texture swapped per direction for directional classes)
 *   ├── aimArrow   (child Graphics — rotated to player.aimAngle)
 *   ├── nameText   (above shape, always upright)
 *   ├── hpBarBg    (background bar, drawn once)
 *   └── hpBarFill  (filled portion, redrawn on HP change)
 */

import { Container, Graphics, Text, Sprite, Assets } from 'pixi.js'
import { CLASSES }     from '../../../shared/ClassConfig.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'
import OverheadDisplay from '../systems/OverheadDisplay.js'
import { DIRECTIONAL_CLASSES, DIRECTIONAL_ANIMATIONS } from '../HostGame.js'

// Direction names ordered by angle sector (0=East, clockwise)
const DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']

function angleToDir(angle) {
  // angle: radians, 0=East, π/2=South (Pixi Y-down coordinate system)
  // Normalise to [0, 2π), then bin into 8 equal sectors
  const TAU  = Math.PI * 2
  const norm = ((angle % TAU) + TAU) % TAU
  const idx  = Math.round(norm / (Math.PI / 4)) % 8
  return DIRS[idx]
}

const R        = GAME_CONFIG.PLAYER_RADIUS    // still used for non-directional sprite size
const RX       = GAME_CONFIG.PLAYER_RADIUS_X  // oval hitbox horizontal semi-axis
const RY       = GAME_CONFIG.PLAYER_RADIUS_Y  // oval hitbox vertical semi-axis
const SPRITE_SIZE = 124                        // display size for all player sprites
const SPRITE_H    = SPRITE_SIZE / 2           // half-height for UI element positioning
const BAR_W = 44
const BAR_H = 5


export default class PlayerSprite {
  constructor(data) {
    this.id       = data.id
    this._data    = data
    this._classData = CLASSES[data.className] ?? CLASSES.Warrior

    // ── Containers ──────────────────────────────────────────────────────
    this.container = new Container()
    this._body     = new Container()   // rotated child
    this.container.addChild(this._body)

    // ── Shape sprite ─────────────────────────────────────────────────────────
    const className = (data.className ?? 'Warrior').toLowerCase()
    this._isDirectional = DIRECTIONAL_CLASSES.has(className)
    this._className     = className
    this._currentDir    = null   // track last direction to skip redundant texture swaps

    if (this._isDirectional) {
      // 8-directional art: start facing East, swap texture on direction change
      const tex = Assets.get(`player_${className}_east`)
      this._shapeSprite = new Sprite(tex)
    } else {
      // Legacy single sprite: continuously rotated to match player angle
      const tex = Assets.get(`player_${className}`)
      this._shapeSprite = new Sprite(tex)
    }
    this._shapeSprite.width  = SPRITE_SIZE
    this._shapeSprite.height = SPRITE_SIZE
    this._shapeSprite.anchor.set(0.5)
    this._body.addChild(this._shapeSprite)

    // ── Animation state (directional classes only) ────────────────────────────
    this._animCfg       = DIRECTIONAL_ANIMATIONS[className] ?? null
    this._animState     = 'idle'   // 'idle' | 'walk' | 'ability' | 'cast'
    this._animFrame     = 0
    this._lastAnimFrame = -1       // force first-frame texture load
    this._animTimer     = 0
    this._lastRenderPos = null     // set on first update; used for movement detection
    this._abilityTimer  = 0        // seconds remaining in one-shot ability animation

    // ── Name label ───────────────────────────────────────────────────────
    this._nameText = new Text({
      text:  data.name ?? '?',
      style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: '#ffffff', align: 'center' },
    })
    this._nameText.anchor.set(0.5, 1)
    this._nameText.position.set(0, -SPRITE_H - 5)
    this.container.addChild(this._nameText)

    // ── HP bar ────────────────────────────────────────────────────────────
    this._hpBg   = new Graphics()
    this._hpFill = new Graphics()

    // Background (drawn once — never changes)
    this._hpBg.rect(-BAR_W / 2, 0, BAR_W, BAR_H)
    this._hpBg.fill('#1a1a1a')
    this._hpBg.stroke({ color: '#ffffff', width: 0.5, alpha: 0.25 })
    this._hpBg.position.set(0, -SPRITE_H - 18)

    this._hpFill.position.set(0, -SPRITE_H - 18)

    this.container.addChild(this._hpBg)
    this.container.addChild(this._hpFill)

    this._maxHp  = data.maxHp ?? this._classData.hp
    this._lastHp = -1         // force first draw
    this._updateHpBar(data.hp ?? this._maxHp)

    // ── Hit flash ────────────────────────────────────────────────────────────
    this._flashGfx = new Graphics()
    this._flashGfx.ellipse(0, 0, RX + 2, RY + 2)
    this._flashGfx.fill({ color: 0xffffff, alpha: 1 })
    this._flashGfx.alpha = 0
    this._body.addChild(this._flashGfx)
    this._flashTimer = 0   // seconds remaining

    // ── Shield arc ────────────────────────────────────────────────────────
    this._shieldGfx = new Graphics()
    this._shieldGfx.alpha = 0   // hidden by default
    this.container.addChild(this._shieldGfx)
    this._shieldVisible = false

    // ── Aim arrow ─────────────────────────────────────────────────────────
    this._aimArrow = new Graphics()
    this._aimArrow.alpha = 0
    this._drawAimArrow()
    this.container.addChild(this._aimArrow)
    this._aimPulse = 0

    // ── Overhead display (cast bar + status icons) ──────────────────────────
    this.overhead = new OverheadDisplay(this.container, {
      yOffset: -SPRITE_H - 18,
      showCastBar: true,
      showStatusIcons: true,
    })
  }

  // ── Drawing helpers ────────────────────────────────────────────────────────

  _updateHpBar(hp) {
    if (hp === this._lastHp) return
    this._lastHp = hp

    const pct   = Math.max(0, hp / this._maxHp)
    const color = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c'

    this._hpFill.clear()
    if (pct > 0) {
      this._hpFill.rect(-BAR_W / 2, 0, BAR_W * pct, BAR_H)
      this._hpFill.fill(color)
    }
  }

  // ── Shield arc drawing ─────────────────────────────────────────────────────

  _drawShieldArc(angle, arc) {
    const g = this._shieldGfx
    const shieldRadius = SPRITE_H + 8
    const halfArc = arc / 2

    g.clear()

    // Semi-transparent filled arc
    g.moveTo(0, 0)
    g.arc(0, 0, shieldRadius, angle - halfArc, angle + halfArc)
    g.lineTo(0, 0)
    g.fill({ color: 0x00d2ff, alpha: 0.2 })

    // Bright arc outline
    g.arc(0, 0, shieldRadius, angle - halfArc, angle + halfArc)
    g.stroke({ color: 0x00d2ff, width: 3, alpha: 0.8 })
  }

  // ── Aim arrow drawing ─────────────────────────────────────────────────────

  _drawAimArrow() {
    const g = this._aimArrow
    g.clear()

    const GAP        = 6
    const STEM_START = SPRITE_H + GAP
    const STEM_END   = SPRITE_H + 22
    const STEM_H     = 3
    const HEAD_W     = 10
    const HEAD_H     = 9

    // Stem
    g.rect(STEM_START, -STEM_H / 2, STEM_END - STEM_START, STEM_H)
    g.fill({ color: 0xffffff, alpha: 0.9 })

    // Arrowhead triangle — tip points right (= player forward in local space)
    g.poly([
      STEM_END + HEAD_W, 0,
      STEM_END,          -HEAD_H,
      STEM_END,           HEAD_H,
    ])
    g.fill({ color: 0xffffff, alpha: 0.9 })
  }

  // ── Ability animation trigger ─────────────────────────────────────────────

  /**
   * Play the one-shot 'ability' animation once, then return to idle/walk.
   * No-op if the class has no 'ability' animation config.
   */
  triggerAbilityAnim() {
    const cfg = this._animCfg?.ability
    if (!cfg) return
    this._animState    = 'ability'
    this._animFrame    = 0
    this._animTimer    = 0
    this._abilityTimer = cfg.frames / cfg.fps
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  /**
   * @param {object} state     - latest known server state for this player
   * @param {object} renderPos - interpolated { x, y }
   */
  update(state, renderPos, dt = 0) {
    this.container.position.set(renderPos.x, renderPos.y)

    if (this._isDirectional) {
      const dir = angleToDir(state.angle ?? 0)

      if (this._animCfg) {
        // ── Animated directional sprite ──────────────────────────────────────
        // 1. Resolve animation state (cast > ability > walk > idle)
        const moved = this._lastRenderPos !== null &&
          (Math.abs(renderPos.x - this._lastRenderPos.x) > 0.3 ||
           Math.abs(renderPos.y - this._lastRenderPos.y) > 0.3)

        const isCasting = state.castProgress != null
        if (isCasting && this._animCfg?.cast) {
          if (this._animState !== 'cast') {
            this._animState = 'cast'
            this._animFrame = 0
            this._animTimer = 0
          }
          this._abilityTimer = 0
        } else if (this._abilityTimer > 0) {
          this._abilityTimer -= dt
          if (this._abilityTimer <= 0) {
            this._abilityTimer = 0
            this._animState = moved ? 'walk' : 'idle'
            this._animFrame = 0
            this._animTimer = 0
          }
        } else {
          const newState = moved ? 'walk' : 'idle'
          if (newState !== this._animState) {
            this._animState = newState
            this._animFrame = 0
            this._animTimer = 0
          }
        }

        // 2. Advance frame timer
        const cfg = this._animCfg[this._animState] ?? this._animCfg.idle
        this._animTimer += dt
        const frameDuration = 1 / cfg.fps
        if (this._animTimer >= frameDuration) {
          this._animTimer -= frameDuration
          this._animFrame  = (this._animFrame + 1) % cfg.frames
        }

        // 3. Swap texture when direction or frame changes
        if (dir !== this._currentDir || this._animFrame !== this._lastAnimFrame) {
          const key = `player_${this._className}_${this._animState}_${dir}_${this._animFrame}`
          const tex = Assets.get(key)
          if (tex) {
            this._shapeSprite.texture = tex
          } else {
            // Animation not loaded yet — fall back to static directional sprite
            const fallback = Assets.get(`player_${this._className}_${dir}`)
            if (fallback) this._shapeSprite.texture = fallback
          }
          this._currentDir    = dir
          this._lastAnimFrame = this._animFrame
        }

        this._lastRenderPos = { x: renderPos.x, y: renderPos.y }

      } else {
        // ── Static directional sprite (no animation config yet) ───────────────
        if (dir !== this._currentDir) {
          this._currentDir = dir
          this._shapeSprite.texture = Assets.get(`player_${this._className}_${dir}`)
        }
      }

      // Do NOT rotate the body — direction is encoded in the art
    } else {
      this._body.rotation = state.angle ?? 0
    }

    if (state.hp != null) {
      // Trigger flash when HP drops
      if (state.hp < this._lastHp && this._lastHp !== -1) {
        this._flashTimer = 0.1
      }
      this._updateHpBar(state.hp)
    }

    // Tick flash
    if (this._flashTimer > 0) {
      this._flashTimer = Math.max(0, this._flashTimer - dt)
      this._flashGfx.alpha = this._flashTimer / 0.1
    } else {
      this._flashGfx.alpha = 0
    }

    // Dead: fade out
    this.container.alpha = state.isDead ? 0.2 : 1.0

    // Shield arc
    const shieldOn = !!state.shieldActive
    if (shieldOn) {
      this._drawShieldArc(state.shieldAngle ?? 0, state.shieldArc ?? Math.PI / 2)
      this._shieldGfx.alpha = 1
    } else if (this._shieldVisible) {
      this._shieldGfx.alpha = 0
    }
    this._shieldVisible = shieldOn

    // Aim arrow
    if (state.isAiming) {
      this._aimArrow.rotation = state.aimAngle ?? state.angle ?? 0
      this._aimPulse += dt
      this._aimArrow.alpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(this._aimPulse * Math.PI * 2 / 0.6))
    } else {
      this._aimPulse = 0
      this._aimArrow.alpha = 0
    }

    // Update overhead display
    this.overhead.updateCastBar(state.castProgress ?? 0, state.isChanneling ?? false)
    if (state.effects) {
      this.overhead.setStatusIcons(state.effects)
    }
    this.overhead.update(dt)
  }

  destroy() {
    this.overhead.destroy()
    this.container.destroy({ children: true })
  }
}
