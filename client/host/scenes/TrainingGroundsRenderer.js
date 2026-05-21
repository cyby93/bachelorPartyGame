/**
 * client/host/scenes/TrainingGroundsRenderer.js
 *
 * Canvas display for the training grounds phase.
 * Full abilities active — players can attack training dummies to warm up.
 */

import { Container, Graphics, Text } from 'pixi.js'
import BaseRenderer from './BaseRenderer.js'

const ZONE_HEIGHT = 72

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
    this._countText         = null
    this._phaseOverlay      = null
    this._lastTutorialPhase = 0
    this._zoneContainer     = null
    this._zoneTime          = 0
  }

  _onBeforeExit() {
    if (this._zoneContainer) {
      this._zoneContainer.destroy({ children: true })
      this._zoneContainer = null
    }
  }

  _updateUI(dt, activePlayerIds) {
    if (!this._countText) return
    const n = activePlayerIds.size
    this._countText.text = n === 0
      ? 'Waiting for raiders…'
      : `${n} raider${n !== 1 ? 's' : ''} warming up`

    this._zoneTime += dt
    const levelZoneState    = this.game.knownState.levelZoneState    ?? null
    const unlockedLevelCount = this.game.knownState.unlockedLevelCount ?? 1
    this._updateZones(levelZoneState, unlockedLevelCount)
  }

  // ── Zone selector rendering ────────────────────────────────────────────────

  /**
   * Build or tear down the zone container based on levelZoneState.
   * Called every frame from _updateUI — mutates existing Graphics/Text without
   * destroy/recreate once the container is built.
   */
  _updateZones(levelZoneState, unlockedLevelCount) {
    // Null state: scene exit — tear down zone container
    if (!levelZoneState) {
      if (this._zoneContainer) {
        this._zoneContainer.destroy({ children: true })
        this._zoneContainer = null
      }
      return
    }

    const arenaWidth = this.game.currentArena.width
    const zoneWidth  = arenaWidth / unlockedLevelCount

    // Build once when first non-null state arrives or count changes
    if (!this._zoneContainer || this._zoneContainer._zoneCount !== unlockedLevelCount) {
      if (this._zoneContainer) {
        this._zoneContainer.destroy({ children: true })
        this._zoneContainer = null
      }
      this._buildZoneContainer(unlockedLevelCount, zoneWidth)
    }

    // Mutate each zone to reflect current state
    const { counts, pendingIndex, countdownMs, committedIndex } = levelZoneState

    for (let i = 0; i < unlockedLevelCount; i++) {
      const zc           = this._zoneContainer.getChildAt(i)
      const fill         = zc._fill
      const border       = zc._border
      const label        = zc._label
      const countLabel   = zc._countLabel
      const progressBar  = zc._progressBar

      const playerCount  = counts?.[i] ?? 0
      const isCommitted  = committedIndex === i
      const isPending    = pendingIndex === i && committedIndex == null
      const anyCommitted = committedIndex != null
      const isOther      = anyCommitted && !isCommitted

      // ── Fill ──
      fill.clear()
      if (isCommitted) {
        fill.rect(0, 0, zoneWidth, ZONE_HEIGHT)
        fill.fill({ color: 0x332800, alpha: 0.55 })
      } else if (isPending) {
        fill.rect(0, 0, zoneWidth, ZONE_HEIGHT)
        fill.fill({ color: 0x1a3040, alpha: 0.5 })
      } else if (isOther) {
        fill.rect(0, 0, zoneWidth, ZONE_HEIGHT)
        fill.fill({ color: 0x1a2a3a, alpha: 0.15 })
      } else if (playerCount > 0) {
        fill.rect(0, 0, zoneWidth, ZONE_HEIGHT)
        fill.fill({ color: 0x1a2a3a, alpha: 0.5 })
      } else {
        fill.rect(0, 0, zoneWidth, ZONE_HEIGHT)
        fill.fill({ color: 0x1a2a3a, alpha: 0.35 })
      }

      // ── Border ──
      border.clear()
      if (isCommitted) {
        border.rect(0, 0, zoneWidth, ZONE_HEIGHT)
        border.stroke({ color: 0xf0c040, alpha: 1.0, width: 2 })
      } else if (isPending) {
        const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(this._zoneTime * (2 * Math.PI / 1.2)))
        border.rect(0, 0, zoneWidth, ZONE_HEIGHT)
        border.stroke({ color: 0x7ac8e8, alpha: pulse, width: 1 })
      } else if (isOther) {
        border.rect(0, 0, zoneWidth, ZONE_HEIGHT)
        border.stroke({ color: 0x4a7090, alpha: 0.25, width: 1 })
      } else if (playerCount > 0) {
        border.rect(0, 0, zoneWidth, ZONE_HEIGHT)
        border.stroke({ color: 0x4a7090, alpha: 0.8, width: 1 })
      } else {
        border.rect(0, 0, zoneWidth, ZONE_HEIGHT)
        border.stroke({ color: 0x4a7090, alpha: 0.5, width: 1 })
      }

      // ── Label ──
      if (isCommitted) {
        label.text  = `✓ LEVEL ${i + 1}`
        label.style.fill       = '#f0c040'
        label.style.fontWeight = 'bold'
        label.alpha = 1
      } else if (isOther) {
        label.text  = `LEVEL ${i + 1}`
        label.style.fill       = '#4a7090'
        label.style.fontWeight = 'normal'
        label.alpha = 0.4
      } else if (playerCount > 0) {
        label.text  = `LEVEL ${i + 1}`
        label.style.fill       = '#7ac8e8'
        label.style.fontWeight = 'normal'
        label.alpha = 1
      } else {
        label.text  = `LEVEL ${i + 1}`
        label.style.fill       = '#4a7090'
        label.style.fontWeight = 'normal'
        label.alpha = 1
      }

      // ── Player count ──
      if (playerCount > 0 && !isCommitted) {
        countLabel.text    = String(playerCount)
        countLabel.alpha   = isOther ? 0.4 : 1
        countLabel.visible = true
      } else {
        countLabel.visible = false
      }

      // ── Progress bar ──
      progressBar.clear()
      if (isPending && countdownMs != null) {
        const fillFraction = 1 - (countdownMs / 4000)
        const barWidth     = Math.max(0, Math.min(1, fillFraction)) * zoneWidth
        if (barWidth > 0) {
          progressBar.rect(0, ZONE_HEIGHT - 4, barWidth, 4)
          progressBar.fill({ color: 0x7ac8e8, alpha: 0.9 })
        }
      }
    }
  }

  /** Build the zone container with one child Container per zone. */
  _buildZoneContainer(count, zoneWidth) {
    const container = new Container()
    container._zoneCount = count

    for (let i = 0; i < count; i++) {
      const zc = new Container()
      zc.position.set(i * zoneWidth, 0)

      const fill = new Graphics()
      zc._fill = fill
      zc.addChild(fill)

      const border = new Graphics()
      zc._border = border
      zc.addChild(border)

      const label = new Text({
        text:  `LEVEL ${i + 1}`,
        style: {
          fontFamily: 'Trebuchet MS',
          fontSize:   13,
          fontWeight: 'normal',
          fill:       '#4a7090',
          align:      'center',
        },
      })
      label.anchor.set(0.5, 0.5)
      label.position.set(zoneWidth / 2, ZONE_HEIGHT / 2 - 8)
      zc._label = label
      zc.addChild(label)

      const countLabel = new Text({
        text:  '',
        style: {
          fontFamily: 'Trebuchet MS',
          fontSize:   16,
          fontWeight: 'bold',
          fill:       '#ffffff',
          align:      'center',
        },
      })
      countLabel.anchor.set(0.5, 0)
      countLabel.position.set(zoneWidth / 2, ZONE_HEIGHT / 2 + 4)
      countLabel.visible = false
      zc._countLabel = countLabel
      zc.addChild(countLabel)

      const progressBar = new Graphics()
      zc._progressBar = progressBar
      zc.addChild(progressBar)

      container.addChild(zc)
    }

    this.game.layers.bg.addChild(container)
    this._zoneContainer = container
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
