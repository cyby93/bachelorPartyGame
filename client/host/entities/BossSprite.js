/**
 * client/host/entities/BossSprite.js
 * Visual representation of bosses.
 * Supports different boss types via the `bossName` parameter.
 */

import { Container, Graphics, Text } from 'pixi.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'
import OverheadDisplay from '../systems/OverheadDisplay.js'

const DEFAULT_R = GAME_CONFIG.BOSS_RADIUS
const BAR_W = 100

export default class BossSprite {
  constructor(bossName) {
    this.container = new Container()
    this._body     = new Container()
    this.container.addChild(this._body)

    this._bossName = bossName ?? 'Illidan Stormrage'
    this._radius   = DEFAULT_R
    this._wingTime = 0

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

    // Overhead display (damage numbers only)
    this.overhead = new OverheadDisplay(this.container, {
      yOffset: -this._radius - 26,
      showCastBar: false,
      showStatusIcons: false,
    })
  }

  _buildIllidan() {
    const R = this._radius

    // Body
    const body = new Graphics()
    body.circle(0, 0, R)
    body.fill('#8b0000')
    body.stroke({ color: '#ff2222', width: 3 })
    this._body.addChild(body)

    // Wings
    this._wings = new Graphics()
    this._wings.poly([-R * 0.4, -R, -R * 0.8, -R * 1.6, -R * 0.2, -R * 0.7])
    this._wings.fill({ color: '#4a0000', alpha: 0.9 })
    this._wings.poly([R * 0.4, -R, R * 0.8, -R * 1.6, R * 0.2, -R * 0.7])
    this._wings.fill({ color: '#4a0000', alpha: 0.9 })
    this._body.addChild(this._wings)

    // Eyes
    const eyes = new Graphics()
    eyes.circle(-R * 0.28, -R * 0.18, 6)
    eyes.fill('#00ff66')
    eyes.circle(R * 0.28, -R * 0.18, 6)
    eyes.fill('#00ff66')
    this._body.addChild(eyes)

    // Name
    const nameLabel = new Text({
      text:  'Illidan Stormrage',
      style: { fontFamily: 'Arial', fontSize: 14, fontWeight: 'bold', fill: '#ff4444', align: 'center' },
    })
    nameLabel.anchor.set(0.5, 1)
    nameLabel.position.set(0, -R - 10)
    this.container.addChild(nameLabel)
  }

  _buildShadeOfAkama() {
    const R = this._radius

    // Body — dark purple/shadow themed
    const body = new Graphics()
    body.circle(0, 0, R)
    body.fill('#2d1b4e')
    body.stroke({ color: '#6a3d9a', width: 3 })
    this._body.addChild(body)

    // Shadow wisps (inner detail)
    const wisps = new Graphics()
    wisps.circle(-R * 0.2, -R * 0.15, R * 0.18)
    wisps.fill({ color: '#1a0a30', alpha: 0.6 })
    wisps.circle(R * 0.15, R * 0.1, R * 0.15)
    wisps.fill({ color: '#1a0a30', alpha: 0.5 })
    this._body.addChild(wisps)

    // Eyes — ghostly white
    const eyes = new Graphics()
    eyes.circle(-R * 0.25, -R * 0.18, 5)
    eyes.fill('#ccccff')
    eyes.circle(R * 0.25, -R * 0.18, 5)
    eyes.fill('#ccccff')
    this._body.addChild(eyes)

    // No wings for Shade

    // Name
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

  update(state) {
    this.container.position.set(state.x, state.y)
    this._body.rotation = state.angle ?? 0

    // Update radius if provided and different
    if (state.radius && state.radius !== this._radius) {
      this._radius = state.radius
    }

    if (state.maxHp) this._updateHpBar(state.hp / state.maxHp)

    // Wing flutter animation (Illidan only)
    if (this._wings) {
      this._wingTime += 0.05
      this._wings.y = Math.sin(this._wingTime) * 5
    }
  }

  destroy() {
    this.overhead.destroy()
    this.container.destroy({ children: true })
  }
}
