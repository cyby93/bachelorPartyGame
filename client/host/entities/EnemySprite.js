/**
 * client/host/entities/EnemySprite.js
 * Visual for a single trash-mob enemy.
 * Phase 5 will expand this with proper variety and animations.
 */

import { Container, Graphics } from 'pixi.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'
import OverheadDisplay from '../systems/OverheadDisplay.js'

const R = GAME_CONFIG.ENEMY_RADIUS

export default class EnemySprite {
  constructor(data) {
    this.id = data.id

    this.container = new Container()

    // Body — small downward-pointing triangle
    const body = new Graphics()
    body.poly([0, -R, R * 0.9, R * 0.8, -R * 0.9, R * 0.8])
    body.fill('#c0392b')
    body.stroke({ color: '#ff6b6b', width: 1 })
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

    this._maxHp  = data.maxHp ?? 30
    this._lastHp = -1
    this._updateHpBar(data.hp ?? this._maxHp)

    // Overhead display (damage numbers only — no cast bar or status icons)
    this.overhead = new OverheadDisplay(this.container, {
      yOffset: -R - 6,
      showCastBar: false,
      showStatusIcons: false,
    })
  }

  _updateHpBar(hp) {
    if (hp === this._lastHp) return
    this._lastHp = hp

    const pct = Math.max(0, hp / this._maxHp)
    this._hpFill.clear()
    if (pct > 0) {
      this._hpFill.rect(-R, 0, R * 2 * pct, 3)
      this._hpFill.fill('#e74c3c')
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
