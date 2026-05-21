/**
 * client/host/scenes/TrainingGroundsRenderer.js
 *
 * Canvas display for the training grounds phase.
 * Full abilities active — players can attack training dummies to warm up.
 */

import { Assets, Container, Graphics, Sprite, Text } from 'pixi.js'
import BaseRenderer from './BaseRenderer.js'

const ZONE_HEIGHT = 110  // matches server: 30px container offset + 80px sprite
const PORTAL_W    = 80   // sprite width
const PORTAL_H    = 80   // sprite height
const GLOW_CY     = 32   // y-center of portal opening within sprite
const GLOW_RX     = 28   // glow ellipse half-width
const GLOW_RY     = 22   // glow ellipse half-height

const LEVEL_PORTAL_COLORS = [
  0x2255cc,  // L1 The Courtyard      — Arcane blue
  0xcc5511,  // L2 The Siege          — War fire orange
  0x22aa33,  // L3 Black Temple Gates — Fel green
  0x009988,  // L4 Serpentshrine      — Naga teal
  0x7722bb,  // L5 The Refectory      — Shadow violet
  0x330066,  // L6 Illidan's Sanctum  — Void purple
  0x555555,  // Fallback
]

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

    const arenaWidth  = this.game.currentArena.width
    const totalPortals = levelZoneState.counts.length
    const zoneWidth   = arenaWidth / totalPortals

    // Build once on first non-null state (total portal count never changes mid-session)
    if (!this._zoneContainer) {
      this._buildZoneContainer(totalPortals, zoneWidth)
    }

    // Mutate each zone to reflect current state
    const { counts, pendingIndex, countdownMs, committedIndex } = levelZoneState

    for (let i = 0; i < totalPortals; i++) {
      const zc         = this._zoneContainer.getChildAt(i)
      const label      = zc._label
      const countLabel = zc._countLabel

      const isLocked     = i >= unlockedLevelCount
      const playerCount  = counts?.[i] ?? 0
      const isCommitted  = committedIndex === i
      const isPending    = pendingIndex === i && committedIndex == null
      const anyCommitted = committedIndex != null
      const isOther      = anyCommitted && !isCommitted

      const levelColor = LEVEL_PORTAL_COLORS[Math.min(i, LEVEL_PORTAL_COLORS.length - 1)]
      const spriteX    = zoneWidth / 2
      const spriteLeft = spriteX - PORTAL_W / 2

      // ── Locked portal — dim and no interaction ──
      if (isLocked) {
        const portal = zc._portalSprite
        if (portal) { portal.alpha = 0.40; portal.tint = 0x666666 }
        zc._glowGfx.clear()
        zc._runeGfx.clear()
        zc._groundGfx.clear()
        label.text       = `LEVEL ${i + 1}`
        label.style.fill = '#2a3a44'
        label.alpha      = 0.6
        countLabel.visible = false
        continue
      }

      // ── Portal sprite ──
      const portal = zc._portalSprite
      if (portal) {
        if (isCommitted) {
          portal.alpha = 1.0
          portal.tint  = 0xf0c040
        } else if (isOther) {
          portal.alpha = 0.18
          portal.tint  = 0x888888
        } else if (isPending || playerCount > 0) {
          portal.alpha = 1.0
          portal.tint  = 0xffffff
        } else {
          portal.alpha = 0.45
          portal.tint  = 0xffffff
        }
      }

      // ── Glow overlay ──
      const glow = zc._glowGfx
      glow.clear()
      if (!isOther) {
        let glowAlpha = 0
        let glowColor = levelColor
        if (isCommitted) {
          glowAlpha = 0.75
          glowColor = 0xf0c040
        } else if (isPending) {
          glowAlpha = 0.42 + 0.3 * Math.sin(this._zoneTime * (2 * Math.PI / 1.0))
          glowColor = levelColor
        } else if (playerCount > 0) {
          glowAlpha = 0.28
        }
        if (glowAlpha > 0) {
          glow.ellipse(spriteX, GLOW_CY, GLOW_RX, GLOW_RY)
          glow.fill({ color: glowColor, alpha: glowAlpha })
          glow.ellipse(spriteX, GLOW_CY, GLOW_RX * 0.45, GLOW_RY * 0.45)
          glow.fill({ color: 0xffffff, alpha: glowAlpha * 0.22 })
        }
      }

      // ── Rune dots (3 per pillar, sequential during countdown) ──
      const runes = zc._runeGfx
      runes.clear()
      if (!isOther) {
        let litCount
        if (isCommitted) {
          litCount = 6
        } else if (isPending && countdownMs != null) {
          litCount = Math.floor((1 - countdownMs / 4000) * 6)
        } else if (playerCount > 0) {
          litCount = 3
        } else {
          litCount = 0
        }

        // Rune order: left-top, right-top, left-mid, right-mid, left-bot, right-bot
        const runePos = [
          [spriteLeft + 10, 20], [spriteLeft + PORTAL_W - 10, 20],
          [spriteLeft + 10, 36], [spriteLeft + PORTAL_W - 10, 36],
          [spriteLeft + 10, 52], [spriteLeft + PORTAL_W - 10, 52],
        ]
        for (let r = 0; r < 6; r++) {
          const [rx, ry]   = runePos[r]
          const lit        = r < litCount
          const runeColor  = isCommitted ? 0xf0c040 : levelColor
          const runeAlpha  = lit ? (isCommitted ? 1.0 : 0.85) : 0.13
          runes.circle(rx, ry, 2.5)
          runes.fill({ color: runeColor, alpha: runeAlpha })
        }
      }

      // ── Ground boundary line ──
      const ground = zc._groundGfx
      ground.clear()
      if (!isOther) {
        const lineAlpha = isCommitted ? 0.9 : (isPending ? 0.7 : (playerCount > 0 ? 0.5 : 0.18))
        const lineColor = isCommitted ? 0xf0c040 : levelColor
        ground.rect(spriteLeft, PORTAL_H - 2, PORTAL_W, 2)
        ground.fill({ color: lineColor, alpha: lineAlpha })
      }

      // ── Label ──
      if (isCommitted) {
        label.text       = `✓ LEVEL ${i + 1}`
        label.style.fill = '#f0c040'
        label.alpha      = 1.0
      } else if (isOther) {
        label.text       = `LEVEL ${i + 1}`
        label.style.fill = '#445566'
        label.alpha      = 0.35
      } else {
        label.text       = `LEVEL ${i + 1}`
        label.style.fill = '#7ac8e8'
        label.alpha      = 1.0
      }

      // ── Player count ──
      if (playerCount > 0 && !isCommitted) {
        countLabel.text    = String(playerCount)
        countLabel.alpha   = isOther ? 0.4 : 1
        countLabel.visible = true
      } else {
        countLabel.visible = false
      }
    }
  }

  /** Build the zone container with one portal archway per zone. */
  _buildZoneContainer(count, zoneWidth) {
    const container = new Container()
    container._zoneCount = count

    for (let i = 0; i < count; i++) {
      const zc = new Container()
      zc.position.set(i * zoneWidth, 0)

      // Portal archway sprite (centered horizontally in zone)
      const tex    = Assets.get(`portal_gate_${i + 1}`)
      const portal = tex ? new Sprite(tex) : null
      if (portal) {
        portal.width  = PORTAL_W
        portal.height = PORTAL_H
        portal.anchor.set(0.5, 0)
        portal.position.set(zoneWidth / 2, 0)
      }
      zc._portalSprite = portal
      if (portal) zc.addChild(portal)

      // Animated glow overlay on portal opening (per-frame)
      const glowGfx = new Graphics()
      zc._glowGfx = glowGfx
      zc.addChild(glowGfx)

      // Rune dots on pillars (per-frame)
      const runeGfx = new Graphics()
      zc._runeGfx = runeGfx
      zc.addChild(runeGfx)

      // Ground boundary line (per-frame)
      const groundGfx = new Graphics()
      zc._groundGfx = groundGfx
      zc.addChild(groundGfx)

      // Level name label below portal
      const label = new Text({
        text:  `LEVEL ${i + 1}`,
        style: {
          fontFamily:    'Trebuchet MS',
          fontSize:      11,
          fontWeight:    'bold',
          fill:          '#7ac8e8',
          align:         'center',
          letterSpacing: 1,
        },
      })
      label.anchor.set(0.5, 0)
      label.position.set(zoneWidth / 2, PORTAL_H + 2)
      zc._label = label
      zc.addChild(label)

      // Player count inside portal opening
      const countLabel = new Text({
        text:  '',
        style: {
          fontFamily: 'Trebuchet MS',
          fontSize:   14,
          fontWeight: 'bold',
          fill:       '#ffffff',
          align:      'center',
        },
      })
      countLabel.anchor.set(0.5, 0.5)
      countLabel.position.set(zoneWidth / 2, GLOW_CY + 8)
      countLabel.visible = false
      zc._countLabel = countLabel
      zc.addChild(countLabel)

      container.addChild(zc)
    }

    container.y = 30
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
