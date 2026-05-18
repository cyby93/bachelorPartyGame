/**
 * client/host/scenes/TrainingGroundsRenderer.js
 *
 * Canvas display for the training grounds phase.
 * Full abilities active — players can attack training dummies to warm up.
 */

import { Container, Graphics, Text } from 'pixi.js'
import BaseRenderer from './BaseRenderer.js'

const PHASE_INSTRUCTIONS = [
  '',
  'Move your joystick to get started',
  'Use your 1st ability 3 times',
  'Use your 2nd ability 3 times',
  'Use your 3rd ability 3 times',
  'Use your 4th ability 3 times',
]

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
    this._countText       = null
    this._phaseOverlay    = null
    this._lastTutorialPhase = 0
  }

  _updateUI(dt, activePlayerIds) {
    if (!this._countText) return
    const n = activePlayerIds.size
    this._countText.text = n === 0
      ? 'Waiting for raiders…'
      : `${n} raider${n !== 1 ? 's' : ''} warming up`
  }

  // ── Tutorial phase overlay ─────────────────────────────────────────────────

  onTutorialState(data) {
    const phase = data?.phase ?? 0

    if (!data?.active) {
      this._lastTutorialPhase = 0
      return
    }

    if (phase === this._lastTutorialPhase) return
    this._lastTutorialPhase = phase

    this._showPhaseOverlay(phase, data.phaseName)
  }

  _showPhaseOverlay(phase, phaseName) {
    if (!this._uiRoot) return

    // Remove any existing overlay
    if (this._phaseOverlay) {
      this._uiRoot.removeChild(this._phaseOverlay)
      this._phaseOverlay.destroy({ children: true })
      this._phaseOverlay = null
    }

    const { width: W, height: H } = this.game.getScreenSize()

    const PANEL_W   = 360
    const PANEL_H   = 110
    const PANEL_X   = (W - PANEL_W) / 2
    const PANEL_Y   = H * 0.22
    const CORNER_R  = 14

    const container = new Container()
    container.position.set(PANEL_X, PANEL_Y)

    // Background panel
    const bg = new Graphics()
    bg.roundRect(0, 0, PANEL_W, PANEL_H, CORNER_R)
    bg.fill({ color: 0x060402, alpha: 0.88 })
    bg.roundRect(0, 0, PANEL_W, PANEL_H, CORNER_R)
    bg.stroke({ color: 0x7ac8e8, alpha: 0.35, width: 1 })
    container.addChild(bg)

    // Phase counter label
    const labelText = new Text({
      text: `PHASE ${phase} / 5`,
      style: {
        fontFamily:    'Trebuchet MS',
        fontSize:      12,
        fontWeight:    'bold',
        fill:          '#7ac8e8',
        letterSpacing: 2,
        align:         'center',
      },
    })
    labelText.anchor.set(0.5, 0)
    labelText.position.set(PANEL_W / 2, 14)
    container.addChild(labelText)

    // Phase name (large)
    const nameText = new Text({
      text: (phaseName ?? '').toUpperCase(),
      style: {
        fontFamily: 'Trebuchet MS',
        fontSize:   28,
        fontWeight: 'bold',
        fill:       '#e8d8a0',
        align:      'center',
      },
    })
    nameText.anchor.set(0.5, 0)
    nameText.position.set(PANEL_W / 2, 32)
    container.addChild(nameText)

    // Instruction text
    const instrText = new Text({
      text: PHASE_INSTRUCTIONS[phase] ?? '',
      style: {
        fontFamily: 'Trebuchet MS',
        fontSize:   14,
        fill:       '#8aabbf',
        align:      'center',
      },
    })
    instrText.anchor.set(0.5, 1)
    instrText.position.set(PANEL_W / 2, PANEL_H - 14)
    container.addChild(instrText)

    container.alpha = 0
    this._uiRoot.addChild(container)
    this._phaseOverlay = container

    // Animate: fade in 300ms → hold 2500ms → fade out 500ms
    const FADE_IN  = 300
    const HOLD     = 2500
    const FADE_OUT = 500
    const total    = FADE_IN + HOLD + FADE_OUT
    const startTime = Date.now()

    const animate = () => {
      if (!this._phaseOverlay || this._phaseOverlay !== container) return
      const elapsed = Date.now() - startTime

      if (elapsed < FADE_IN) {
        container.alpha = elapsed / FADE_IN
        requestAnimationFrame(animate)
      } else if (elapsed < FADE_IN + HOLD) {
        container.alpha = 1
        requestAnimationFrame(animate)
      } else if (elapsed < total) {
        container.alpha = 1 - (elapsed - FADE_IN - HOLD) / FADE_OUT
        requestAnimationFrame(animate)
      } else {
        container.alpha = 0
        if (this._phaseOverlay === container) {
          this._uiRoot?.removeChild(container)
          container.destroy({ children: true })
          this._phaseOverlay = null
        }
      }
    }
    requestAnimationFrame(animate)
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
