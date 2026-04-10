/**
 * client/host/entities/BossSprite.js
 * Visual representation of bosses.
 * Supports different boss types via the `bossName` parameter.
 */

import { Container, Graphics, Text, Sprite, Assets } from 'pixi.js'
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

    // Sprite: 120×220 PNG, body center is the PNG center → anchor(0.5,0.5)
    // Width = R*2 (body diameter), height = 220 (wings extend upward beyond body)
    const sprite = new Sprite(Assets.get('boss_illidan'))
    sprite.anchor.set(0.5)
    sprite.width  = R * 2   // 120px — body diameter
    sprite.height = 220      // full height including wings above body
    this._body.addChild(sprite)

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

    // Sprite: 120×120 PNG, body center is PNG center → anchor(0.5,0.5)
    const sprite = new Sprite(Assets.get('boss_akama'))
    sprite.anchor.set(0.5)
    sprite.width  = R * 2   // 120px
    sprite.height = R * 2   // 120px
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

  update(state) {
    this.container.position.set(state.x, state.y)
    this._body.rotation = state.angle ?? 0

    // Update radius if provided and different
    if (state.radius && state.radius !== this._radius) {
      this._radius = state.radius
    }

    if (state.maxHp) this._updateHpBar(state.hp / state.maxHp)
  }

  destroy() {
    this.overhead.destroy()
    this.container.destroy({ children: true })
  }
}
