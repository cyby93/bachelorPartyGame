/**
 * client/host/scenes/TrainingGroundsRenderer.js
 *
 * Canvas display for the training grounds phase.
 * Full abilities active — players can attack training dummies to warm up.
 */

import { Text } from 'pixi.js'
import BaseRenderer from './BaseRenderer.js'

export default class TrainingGroundsRenderer extends BaseRenderer {

  // ── Hooks ──────────────────────────────────────────────────────────────────

  _onPlayerSync(p, sprite, pos, dt) {
    if (this.vfx && p.effects) {
      this.vfx.auras.sync(p.id, sprite.container, p.effects, this.game.getPlayerRadius())
    }
  }

  _onPlayerRemoved(id) {
    this.vfx?.auras.removeEntity(id)
  }

  _resetUIRefs() {
    this._countText = null
  }

  _updateUI(dt, activePlayerIds) {
    if (!this._countText) return
    const n = activePlayerIds.size
    this._countText.text = n === 0
      ? 'Waiting for raiders…'
      : `${n} raider${n !== 1 ? 's' : ''} warming up`
  }

  // ── UI builder ─────────────────────────────────────────────────────────────

  _buildUI() {
    const { width: W, height: H } = this.game.getScreenSize()

    const title = new Text({
      text:  'TRAINING GROUNDS',
      style: {
        fontFamily: 'Trebuchet MS',
        fontSize:   25,
        fontWeight: 'bold',
        fill:       '#7ac8e8',
        align:      'center',
        letterSpacing: 1,
      },
    })
    title.anchor.set(0.5, 0)
    title.position.set(W / 2, 14)
    this._uiRoot.addChild(title)

    this._countText = new Text({
      text:  'Waiting for raiders…',
      style: { fontFamily: 'Trebuchet MS', fontSize: 15, fill: '#6a98b8', align: 'center' },
    })
    this._countText.anchor.set(0.5, 0)
    this._countText.position.set(W / 2, 52)
    this._uiRoot.addChild(this._countText)

    const hint = new Text({
      text:  'Hit the dummies to warm up. All abilities active.',
      style: { fontFamily: 'Trebuchet MS', fontSize: 13, fill: '#4a7090', align: 'center' },
    })
    hint.anchor.set(0.5, 1)
    hint.position.set(W / 2, H - 14)
    this._uiRoot.addChild(hint)
  }
}
