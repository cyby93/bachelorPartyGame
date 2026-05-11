/**
 * client/host/scenes/LobbyRenderer.js
 *
 * Canvas display for the lobby (gathering hall) phase.
 * Players can only move — no abilities. Warm visual atmosphere.
 * The DOM sidebar handles player list + QR code + action buttons.
 */

import { Text, Graphics } from 'pixi.js'
import BaseRenderer from './BaseRenderer.js'

export default class LobbyRenderer extends BaseRenderer {

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  enter() {
    super.enter()
    // Warm amber overlay over the dungeon background
    const { width: W, height: H } = this.game.currentArena
    this._bgOverlay = new Graphics()
    this._bgOverlay.rect(0, 0, W, H)
    this._bgOverlay.fill({ color: 0xc45e00, alpha: 0.13 })
    this.game.layers.bg.addChild(this._bgOverlay)
  }

  _onBeforeExit() {
    if (this._bgOverlay) {
      this.game.layers.bg.removeChild(this._bgOverlay)
      this._bgOverlay.destroy()
      this._bgOverlay = null
    }
  }

  // ── Hooks ──────────────────────────────────────────────────────────────────

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
      : `${n} raider${n !== 1 ? 's' : ''} in the gathering hall`
  }

  _resetUIRefs() {
    this._countText = null
    this._bgOverlay = null
  }

  // ── UI builder ─────────────────────────────────────────────────────────────

  _buildUI() {
    const { width: W, height: H } = this.game.getScreenSize()

    const title = new Text({
      text:  'GATHERING HALL',
      style: {
        fontFamily: 'Trebuchet MS',
        fontSize:   25,
        fontWeight: 'bold',
        fill:       '#e8c87a',
        align:      'center',
        letterSpacing: 1,
      },
    })
    title.anchor.set(0.5, 0)
    title.position.set(W / 2, 14)
    this._uiRoot.addChild(title)

    this._countText = new Text({
      text:  'Waiting for the raid to assemble…',
      style: { fontFamily: 'Trebuchet MS', fontSize: 15, fill: '#a8916b', align: 'center' },
    })
    this._countText.anchor.set(0.5, 0)
    this._countText.position.set(W / 2, 52)
    this._uiRoot.addChild(this._countText)

    const hint = new Text({
      text:  'Walk around while everyone joins. No abilities yet.',
      style: { fontFamily: 'Trebuchet MS', fontSize: 13, fill: '#7a6040', align: 'center' },
    })
    hint.anchor.set(0.5, 1)
    hint.position.set(W / 2, H - 14)
    this._uiRoot.addChild(hint)
  }
}
