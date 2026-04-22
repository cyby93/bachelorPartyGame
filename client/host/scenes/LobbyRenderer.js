/**
 * client/host/scenes/LobbyRenderer.js
 *
 * Canvas display for the lobby phase.
 * Shows all connected players wandering freely (skill practice).
 * The DOM sidebar handles player list + QR code + start button.
 */

import { Text } from 'pixi.js'
import BaseRenderer    from './BaseRenderer.js'

export default class LobbyRenderer extends BaseRenderer {
  // constructor inherited — no lobby-specific state needed

  // ── Hooks ──────────────────────────────────────────────────────────────────

  _onEnemyCreated(enemy, sprite) {
    if (enemy.isDummy) sprite.container.tint = 0xf1c40f   // gold tint for training dummies
  }

  _onPlayerSync(p, sprite, pos, dt) {
    if (this.vfx && p.effects) {
      this.vfx.auras.sync(p.id, sprite.container, p.effects, this.game.getPlayerRadius())
    }
  }

  _onPlayerRemoved(id) {
    this.vfx?.auras.removeEntity(id)
  }

  _updateUI(dt, activePlayerIds) {
    if (!this._countText) return
    const n = activePlayerIds.size
    this._countText.text = n === 0
      ? 'Waiting for the raid to assemble…'
      : `${n} player${n !== 1 ? 's' : ''} in the staging room`
  }

  _resetUIRefs() {
    this._countText = null
  }

  // ── UI builder ─────────────────────────────────────────────────────────────

  _buildUI() {
    const { width: W, height: H } = this.game.getScreenSize()

    const title = new Text({
      text:  'STAGING ROOM',
      style: {
        fontFamily: 'Trebuchet MS',
        fontSize:   25,
        fontWeight: 'bold',
        fill:       '#d7b16f',
        align:      'center',
        letterSpacing: 1,
      },
    })
    title.anchor.set(0.5, 0)
    title.position.set(W / 2, 14)
    this._uiRoot.addChild(title)

    this._countText = new Text({
      text:  'Waiting for the raid to assemble…',
      style: { fontFamily: 'Trebuchet MS', fontSize: 15, fill: '#90a7bb', align: 'center' },
    })
    this._countText.anchor.set(0.5, 0)
    this._countText.position.set(W / 2, 52)
    this._uiRoot.addChild(this._countText)

    const hint = new Text({
      text:  'Warm up in the room while everyone joins.',
      style: { fontFamily: 'Trebuchet MS', fontSize: 13, fill: '#5f7385', align: 'center' },
    })
    hint.anchor.set(0.5, 1)
    hint.position.set(W / 2, H - 14)
    this._uiRoot.addChild(hint)
  }
}
