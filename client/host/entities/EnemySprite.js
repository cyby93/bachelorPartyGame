/**
 * client/host/entities/EnemySprite.js
 * Visual for a single enemy, styled by archetype type.
 *
 * Shape / colour lookup:
 *   grunt   → triangle (red)         — existing default
 *   brute   → large circle (purple)
 *   archer  → diamond (orange)
 *   charger → arrow (bright red)
 *   healer  → cross (green)
 */

import { Container, Graphics, Text } from 'pixi.js'
import { GAME_CONFIG }    from '../../../shared/GameConfig.js'
import { ENEMY_TYPES }    from '../../../shared/EnemyTypeConfig.js'
import OverheadDisplay     from '../systems/OverheadDisplay.js'

const DEFAULT_R = GAME_CONFIG.ENEMY_RADIUS

export default class EnemySprite {
  constructor(data) {
    this.id   = data.id
    this.type = data.type ?? 'grunt'

    const typeCfg = ENEMY_TYPES[this.type] ?? ENEMY_TYPES.grunt
    const R       = typeCfg.radius ?? DEFAULT_R
    const color   = typeCfg.color  ?? '#c0392b'
    const shape   = typeCfg.shape  ?? 'triangle'

    this.container = new Container()

    // Body — shape depends on enemy type
    const body = new Graphics()
    this._drawShape(body, shape, R, color)
    this.container.addChild(body)

    // HP pip (single thin bar)
    this._hpBg   = new Graphics()
    this._hpFill = new Graphics()

    this._hpBg.rect(-R, 0, R * 2, 3)
    this._hpBg.fill('#111111')
    this._hpBg.position.set(0, -R - 6)
    this._hpFill.position.set(0, -R - 6)

    this.container.addChild(this._hpBg)
    this.container.addChild(this._hpFill)

    this._R      = R
    this._color  = color
    this._maxHp  = data.maxHp ?? typeCfg.hp ?? 30
    this._lastHp = -1
    this._updateHpBar(data.hp ?? this._maxHp)

    // Overhead display (damage numbers only — no cast bar or status icons)
    this.overhead = new OverheadDisplay(this.container, {
      yOffset: -R - 6,
      showCastBar: false,
      showStatusIcons: false,
    })

    // Name label for training dummies (Idle / Ranged / Melee)
    if (data.dummyName) {
      const label = new Text({
        text:  data.dummyName,
        style: {
          fontFamily: 'Arial',
          fontSize:   12,
          fontWeight: 'bold',
          fill:       '#f1c40f',
          align:      'center',
        },
      })
      label.anchor.set(0.5, 1)
      label.position.set(0, -R - 18)
      this.container.addChild(label)
    }
  }

  _drawShape(gfx, shape, R, color) {
    const stroke = this._lighten(color)

    switch (shape) {
      case 'circle':
        gfx.circle(0, 0, R)
        gfx.fill(color)
        gfx.stroke({ color: stroke, width: 1 })
        break

      case 'diamond':
        gfx.poly([0, -R, R * 0.7, 0, 0, R, -R * 0.7, 0])
        gfx.fill(color)
        gfx.stroke({ color: stroke, width: 1 })
        break

      case 'arrow':
        gfx.poly([0, -R, R * 0.6, R * 0.5, 0, R * 0.2, -R * 0.6, R * 0.5])
        gfx.fill(color)
        gfx.stroke({ color: stroke, width: 1 })
        break

      case 'cross': {
        const arm = R * 0.35
        gfx.rect(-arm, -R * 0.8, arm * 2, R * 1.6)
        gfx.rect(-R * 0.8, -arm, R * 1.6, arm * 2)
        gfx.fill(color)
        gfx.stroke({ color: stroke, width: 1 })
        break
      }

      case 'triangle':
      default:
        gfx.poly([0, -R, R * 0.9, R * 0.8, -R * 0.9, R * 0.8])
        gfx.fill(color)
        gfx.stroke({ color: stroke, width: 1 })
        break
    }
  }

  /** Produce a lighter variant of a hex colour for stroke/outline. */
  _lighten(hex) {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, ((num >> 16) & 0xff) + 60)
    const g = Math.min(255, ((num >> 8) & 0xff) + 60)
    const b = Math.min(255, (num & 0xff) + 60)
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  }

  _updateHpBar(hp) {
    if (hp === this._lastHp) return
    this._lastHp = hp
    const R = this._R

    const pct = Math.max(0, hp / this._maxHp)
    this._hpFill.clear()
    if (pct > 0) {
      this._hpFill.rect(-R, 0, R * 2 * pct, 3)
      this._hpFill.fill(this._color)
    }
  }

  update(state) {
    this.container.position.set(state.x, state.y)
    if (state.hp != null) this._updateHpBar(state.hp)
  }

  destroy() {
    this.overhead.destroy()
    this.container.destroy({ children: true })
  }
}
