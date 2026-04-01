/**
 * client/host/entities/PlayerSprite.js
 *
 * Visual representation of one player on the host canvas.
 *
 * Structure:
 *   container  (positioned at player world coords, NOT rotated)
 *   ├── body       (child Container — rotated to player.angle)
 *   │   ├── shapeGfx    (class-specific filled polygon/circle/square)
 *   │   └── frontDot    (small white dot pointing "forward")
 *   ├── nameText   (above shape, always upright)
 *   ├── hpBarBg    (background bar, drawn once)
 *   └── hpBarFill  (filled portion, redrawn on HP change)
 */

import { Container, Graphics, Text } from 'pixi.js'
import { CLASSES }     from '../../../shared/ClassConfig.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'
import OverheadDisplay from '../systems/OverheadDisplay.js'

const R     = GAME_CONFIG.PLAYER_RADIUS
const BAR_W = 44
const BAR_H = 5

// Visual shape by class role
const SHAPE = {
  Warrior:  'square',
  Paladin:  'square',
  Mage:     'circle',
  Priest:   'circle',
  Hunter:   'triangle',
  Rogue:    'triangle',
  Shaman:   'pentagon',
  Druid:    'pentagon',
}

export default class PlayerSprite {
  constructor(data) {
    this.id       = data.id
    this._data    = data
    this._classData = CLASSES[data.className] ?? CLASSES.Warrior

    // ── Containers ──────────────────────────────────────────────────────
    this.container = new Container()
    this._body     = new Container()   // rotated child
    this.container.addChild(this._body)

    // ── Shape ────────────────────────────────────────────────────────────
    this._shapeGfx = new Graphics()
    this._drawShape()
    this._body.addChild(this._shapeGfx)

    // Front dot (shows facing direction)
    const dot = new Graphics()
    dot.circle(R - 4, 0, 3)
    dot.fill('#ffffff')
    this._body.addChild(dot)

    // ── Name label ───────────────────────────────────────────────────────
    this._nameText = new Text({
      text:  data.name ?? '?',
      style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: '#ffffff', align: 'center' },
    })
    this._nameText.anchor.set(0.5, 1)
    this._nameText.position.set(0, -R - 5)
    this.container.addChild(this._nameText)

    // ── HP bar ────────────────────────────────────────────────────────────
    this._hpBg   = new Graphics()
    this._hpFill = new Graphics()

    // Background (drawn once — never changes)
    this._hpBg.rect(-BAR_W / 2, 0, BAR_W, BAR_H)
    this._hpBg.fill('#1a1a1a')
    this._hpBg.stroke({ color: '#ffffff', width: 0.5, alpha: 0.25 })
    this._hpBg.position.set(0, -R - 18)

    this._hpFill.position.set(0, -R - 18)

    this.container.addChild(this._hpBg)
    this.container.addChild(this._hpFill)

    this._maxHp  = data.maxHp ?? this._classData.hp
    this._lastHp = -1         // force first draw
    this._updateHpBar(data.hp ?? this._maxHp)

    // ── Hit flash ────────────────────────────────────────────────────────────
    this._flashGfx = new Graphics()
    this._flashGfx.circle(0, 0, R + 2)
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
    this._body.addChild(this._aimArrow)
    this._aimPulse = 0

    // ── Overhead display (cast bar + status icons) ──────────────────────────
    this.overhead = new OverheadDisplay(this.container, {
      yOffset: -R - 18,
      showCastBar: true,
      showStatusIcons: true,
    })
  }

  // ── Drawing helpers ────────────────────────────────────────────────────────

  _drawShape() {
    const g     = this._shapeGfx
    const color = this._classData.color   // CSS string, e.g. '#3498db'
    const shape = SHAPE[this._data.className] ?? 'pentagon'

    g.clear()

    switch (shape) {
      case 'square':
        g.rect(-R, -R, R * 2, R * 2)
        break

      case 'circle':
        g.circle(0, 0, R)
        break

      case 'triangle':
        g.poly([R, 0, -R, -R * 0.85, -R, R * 0.85])
        break

      case 'pentagon': {
        const pts = []
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2
          pts.push(Math.cos(a) * R, Math.sin(a) * R)
        }
        g.poly(pts)
        break
      }
    }

    g.fill({ color, alpha: 1 })
    g.stroke({ color: '#ffffff', width: 2, alpha: 0.85 })
  }

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
    const shieldRadius = R + 12
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
    const STEM_START = R + GAP
    const STEM_END   = R + 22
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

  // ── Per-frame update ───────────────────────────────────────────────────────

  /**
   * @param {object} state     - latest known server state for this player
   * @param {object} renderPos - interpolated { x, y }
   */
  update(state, renderPos, dt = 0) {
    this.container.position.set(renderPos.x, renderPos.y)
    this._body.rotation = state.angle ?? 0

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
