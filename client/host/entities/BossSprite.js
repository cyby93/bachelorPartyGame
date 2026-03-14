/**
 * client/host/entities/BossSprite.js
 * Visual representation of the boss (Illidan Stormrage).
 * Phase 5 can enhance this with animations and more detail.
 */

import { Container, Graphics, Text } from 'pixi.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'

const R     = GAME_CONFIG.BOSS_RADIUS
const BAR_W = 100

export default class BossSprite {
  constructor() {
    this.container = new Container()
    this._body     = new Container()
    this.container.addChild(this._body)

    // ── Body ─────────────────────────────────────────────────────────────
    const body = new Graphics()
    body.circle(0, 0, R)
    body.fill('#8b0000')
    body.stroke({ color: '#ff2222', width: 3 })
    this._body.addChild(body)

    // ── Wings ─────────────────────────────────────────────────────────────
    this._wings = new Graphics()
    // Left wing
    this._wings.poly([-R * 0.4, -R, -R * 0.8, -R * 1.6, -R * 0.2, -R * 0.7])
    this._wings.fill({ color: '#4a0000', alpha: 0.9 })
    // Right wing
    this._wings.poly([R * 0.4, -R, R * 0.8, -R * 1.6, R * 0.2, -R * 0.7])
    this._wings.fill({ color: '#4a0000', alpha: 0.9 })
    this._body.addChild(this._wings)

    // ── Eyes ─────────────────────────────────────────────────────────────
    const eyes = new Graphics()
    eyes.circle(-R * 0.28, -R * 0.18, 6)
    eyes.fill('#00ff66')
    eyes.circle(R * 0.28, -R * 0.18, 6)
    eyes.fill('#00ff66')
    this._body.addChild(eyes)

    // ── Name ─────────────────────────────────────────────────────────────
    const nameLabel = new Text({
      text:  'Illidan Stormrage',
      style: { fontFamily: 'Arial', fontSize: 14, fontWeight: 'bold', fill: '#ff4444', align: 'center' },
    })
    nameLabel.anchor.set(0.5, 1)
    nameLabel.position.set(0, -R - 10)
    this.container.addChild(nameLabel)

    // ── HP bar ────────────────────────────────────────────────────────────
    const hpBg = new Graphics()
    hpBg.rect(-BAR_W / 2, 0, BAR_W, 8)
    hpBg.fill('#330000')
    hpBg.stroke({ color: '#ffffff', width: 0.5, alpha: 0.3 })
    hpBg.position.set(0, -R - 26)

    this._hpFill = new Graphics()
    this._hpFill.position.set(0, -R - 26)

    this.container.addChild(hpBg)
    this.container.addChild(this._hpFill)

    this._lastHpPct = -1
    this._wingTime  = 0
    this._updateHpBar(1.0)
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

  update(state) {
    this.container.position.set(state.x, state.y)
    this._body.rotation = state.angle ?? 0

    if (state.maxHp) this._updateHpBar(state.hp / state.maxHp)

    // Simple wing flutter animation
    this._wingTime += 0.05
    this._wings.y = Math.sin(this._wingTime) * 5
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
