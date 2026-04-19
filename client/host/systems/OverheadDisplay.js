/**
 * client/host/systems/OverheadDisplay.js
 * Per-entity component managing cast bar, status icons, and damage numbers.
 *
 * Layout (bottom to top above entity):
 *   1. HP bar (existing, managed by sprite)
 *   2. Cast bar (shown only when casting)
 *   3. Status icon row (small colored circles with letters)
 */

import { Container, Graphics, Text } from 'pixi.js'
import VFXAssets from './VFXAssets.js'

// Status effect → icon letter + color mapping
const EFFECT_ICONS = {
  sprint:          { letter: 'S', color: 0x00ffff },
  speed:           { letter: 'S', color: 0x00ffff },
  bloodlust:       { letter: 'B', color: 0xff4444 },
  shield:          { letter: 'W', color: 0xffff00 },
  stealth:         { letter: 'I', color: 0x9966ff },
  invisible:       { letter: 'I', color: 0x9966ff },
  root:            { letter: 'R', color: 0x8b4513 },
  stun:            { letter: 'X', color: 0xff8800 },
  bear:            { letter: 'B', color: 0x8b4513 },
  damage_boost:    { letter: 'D', color: 0xff0000 },
  armor:           { letter: 'A', color: 0xcccccc },
  reduction:       { letter: 'A', color: 0xcccccc },
  // Illidan debuffs
  shear:           { letter: 'C', color: 0xff4400 },
  parasitic:       { letter: 'P', color: 0x9900cc },
  darkBarrage:     { letter: 'D', color: 0x330099 },
  agonizingFlames: { letter: 'F', color: 0xff8800 },
}

export default class OverheadDisplay {
  /**
   * @param {Container} entityContainer - the entity's main container
   * @param {object} config - { yOffset, showCastBar, showStatusIcons, showComboPips }
   */
  constructor(entityContainer, config = {}) {
    this._entity = entityContainer
    this._config = {
      yOffset: config.yOffset ?? -30,
      showCastBar: config.showCastBar ?? true,
      showStatusIcons: config.showStatusIcons ?? true,
      showComboPips: config.showComboPips ?? false,
    }

    this._container = new Container()
    entityContainer.addChild(this._container)

    // ── Cast bar ──────────────────────────────────────────────────
    this._castBarBg = null
    this._castBarFill = null
    this._castBarVisible = false

    if (this._config.showCastBar) {
      const BAR_W = 44
      const BAR_H = 4
      const barY = this._config.yOffset - 6

      this._castBarBg = new Graphics()
      this._castBarBg.rect(-BAR_W / 2, barY, BAR_W, BAR_H)
      this._castBarBg.fill({ color: 0x111111, alpha: 0.8 })
      this._castBarBg.stroke({ color: 0x666666, width: 0.5 })
      this._castBarBg.visible = false
      this._container.addChild(this._castBarBg)

      this._castBarFill = new Graphics()
      this._castBarFill.visible = false
      this._container.addChild(this._castBarFill)

      this._castBarW = BAR_W
      this._castBarY = barY
      this._castBarH = BAR_H
    }

    // ── Status icons ──────────────────────────────────────────────
    this._iconContainer = null
    this._currentIconKeys = []
    if (this._config.showStatusIcons) {
      this._iconContainer = new Container()
      this._iconContainer.position.set(0, this._config.yOffset - 18)
      this._container.addChild(this._iconContainer)
    }

    // ── Combo point bar (Rogue only) ──────────────────────────────
    this._comboBarGfx     = null
    this._lastComboPoints = -1
    this._lastComboMax    = -1
    if (this._config.showComboPips) {
      this._comboBarGfx = new Graphics()
      // Sit flush below the HP bar (yOffset is the HP bar's Y, bar height is 5px)
      const HP_BAR_H = 5
      this._comboBarGfx.position.set(0, this._config.yOffset + HP_BAR_H)
      this._container.addChild(this._comboBarGfx)
    }
  }

  /**
   * Update cast bar progress. 0 = no cast, 0-1 = casting.
   * @param {number} progress - 0 to 1
   * @param {boolean} isChannel - true for channel abilities (green, right-to-left)
   */
  updateCastBar(progress, isChannel = false) {
    if (!this._castBarBg) return

    if (progress == null || progress <= 0 || progress >= 1) {
      if (this._castBarVisible) {
        this._castBarBg.visible = false
        this._castBarFill.visible = false
        this._castBarVisible = false
      }
      return
    }

    if (!this._castBarVisible) {
      this._castBarBg.visible = true
      this._castBarFill.visible = true
      this._castBarVisible = true
    }

    this._castBarFill.clear()
    if (isChannel) {
      // Channel: green, drains right-to-left (starts full, empties from right)
      const fillW = this._castBarW * (1 - progress)
      this._castBarFill.rect(
        -this._castBarW / 2, this._castBarY,
        fillW, this._castBarH
      )
      this._castBarFill.fill({ color: 0x00ff88, alpha: 0.9 })
    } else {
      const fillW = this._castBarW * progress
      // Cast: yellow, fills left-to-right
      this._castBarFill.rect(
        -this._castBarW / 2, this._castBarY,
        fillW, this._castBarH
      )
      this._castBarFill.fill({ color: 0xffcc00, alpha: 0.9 })
    }
  }

  /**
   * Set status icons from effect keys.
   * @param {Array<{src: string, params: object}>} effects
   */
  setStatusIcons(effects) {
    if (!this._iconContainer) return
    if (!effects || effects.length === 0) {
      if (this._currentIconKeys.length > 0) {
        this._iconContainer.removeChildren()
        this._currentIconKeys = []
      }
      return
    }

    // Derive icon keys from effects
    const keys = []
    for (const eff of effects) {
      const p = eff.params ?? {}
      if (p.speedMultiplier && p.speedMultiplier > 1) keys.push('speed')
      if (p.damageMultiplier && p.damageMultiplier > 1) keys.push('damage_boost')
      if (p.damageReduction) keys.push('reduction')
      // shield is now shown as a sprite overlay via AuraSystem — no status icon needed
      if (p.invisible) keys.push('invisible')
      if (p.rooted) keys.push('root')
      if (p.stunned) keys.push('stun')
      if (p.transformSprite === 'bear') keys.push('bear')
      // Illidan debuffs
      if (p.shear)           keys.push('shear')
      if (p.parasitic)       keys.push('parasitic')
      if (p.darkBarrage)     keys.push('darkBarrage')
      if (p.agonizingFlames) keys.push('agonizingFlames')
    }

    // Deduplicate
    const uniqueKeys = [...new Set(keys)]

    // Check if changed
    const keyStr = uniqueKeys.join(',')
    const prevStr = this._currentIconKeys.join(',')
    if (keyStr === prevStr) return

    this._currentIconKeys = uniqueKeys
    this._iconContainer.removeChildren()

    const spacing = 16
    const startX = -(uniqueKeys.length - 1) * spacing / 2

    uniqueKeys.forEach((key, i) => {
      const iconDef = EFFECT_ICONS[key]
      if (!iconDef) return
      const icon = VFXAssets.statusIcon(iconDef.letter, iconDef.color)
      icon.position.set(startX + i * spacing, 0)
      this._iconContainer.addChild(icon)
    })
  }

  /**
   * Render combo point bar for the Rogue.
   * Bar sits flush below the HP bar — same width, zero gap.
   * Fills 20% per combo point (5 pts = full).
   * @param {number} points  - current combo points (0–max)
   * @param {number} maxPts  - maximum combo points (default 5)
   */
  setComboPoints(points, maxPts = 5) {
    if (!this._comboBarGfx) return
    if (points === this._lastComboPoints && maxPts === this._lastComboMax) return
    this._lastComboPoints = points
    this._lastComboMax    = maxPts

    const BAR_W = 44   // must match HP bar width (PlayerSprite BAR_W)
    const BAR_H = 3

    this._comboBarGfx.clear()

    // Background
    this._comboBarGfx.rect(-BAR_W / 2, 0, BAR_W, BAR_H)
    this._comboBarGfx.fill({ color: 0x111111, alpha: 0.8 })

    // Fill
    if (points > 0) {
      const pct   = Math.min(1, points / maxPts)
      const fillW = BAR_W * pct
      this._comboBarGfx.rect(-BAR_W / 2, 0, fillW, BAR_H)
      this._comboBarGfx.fill({ color: 0xffdd00, alpha: 0.95 })
    }
  }

  update(dt) {
    // Nothing frame-specific needed currently
  }

  destroy() {
    this._container.destroy({ children: true })
  }
}
