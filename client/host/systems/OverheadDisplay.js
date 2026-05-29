/**
 * client/host/systems/OverheadDisplay.js
 * Per-entity component managing cast bar, combo pips, and cooldown bar.
 *
 * Layout (bottom to top above entity):
 *   1. HP bar (managed by PlayerSprite; frame animated for Regrowth)
 *   2. Cast bar (shown only when casting)
 *   3. Cooldown bar (one segment per skill with dotColor)
 *   4. Combo pip bar (Rogue only)
 */

import { Container, Graphics } from 'pixi.js'

export default class OverheadDisplay {
  /**
   * @param {Container} entityContainer - the entity's main container
   * @param {object} config - { yOffset, showCastBar, showComboPips, skills }
   *   skills: array from SkillDatabase for this class — dots are created for entries with dotColor
   */
  constructor(entityContainer, config = {}) {
    this._entity = entityContainer
    this._config = {
      yOffset: config.yOffset ?? -30,
      showCastBar: config.showCastBar ?? true,
      showComboPips: config.showComboPips ?? false,
      pipColor: config.pipColor ?? 0xffdd00,
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

    // ── Combo point bar (Rogue only) ──────────────────────────────
    this._comboBarGfx     = null
    this._lastComboPoints = -1
    this._lastComboMax    = -1
    const HP_BAR_H = 5
    const COMBO_H  = 3
    if (this._config.showComboPips) {
      this._comboBarGfx = new Graphics()
      // Same slot as the cast bar — no class has both
      this._comboBarGfx.position.set(0, this._config.yOffset - 6)
      this._container.addChild(this._comboBarGfx)
    }

    // ── Cooldown bar ──────────────────────────────────────────────
    // A single bar (same width as HP bar) divided into N equal segments,
    // one per skill with dotColor. Each segment fills on CD start and drains to empty.
    this._cdSegments = []   // [{ color, skillIndex, bgX, segW }] — layout info for redraw
    this._cdBarGfx   = null
    const skills    = config.skills ?? []
    const cdSlots   = skills
      .map((s, i) => ({ color: s.dotColor, skillIndex: i }))
      .filter(s => s.color != null)

    if (cdSlots.length > 0) {
      const BAR_W      = 44
      const SEG_H      = 4
      const SEG_GAP    = 1
      const barY       = this._config.yOffset + HP_BAR_H
      const segW       = (BAR_W - (cdSlots.length - 1) * SEG_GAP) / cdSlots.length

      this._cdBarGfx = new Graphics()
      this._cdBarGfx.position.set(-BAR_W / 2, barY)
      this._container.addChild(this._cdBarGfx)

      this._cdSegH = SEG_H
      this._cdSegW = segW
      this._cdSegGap = SEG_GAP

      for (let i = 0; i < cdSlots.length; i++) {
        const bgX = i * (segW + SEG_GAP)
        this._cdSegments.push({ color: cdSlots[i].color, skillIndex: cdSlots[i].skillIndex, bgX })
      }

      // Draw initial empty state (backgrounds only)
      this._drawCdBar({})
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
      // Channel: yellow, drains right-to-left (starts full, empties from right)
      const fillW = this._castBarW * (1 - progress)
      this._castBarFill.rect(
        -this._castBarW / 2, this._castBarY,
        fillW, this._castBarH
      )
      this._castBarFill.fill({ color: 0xffcc00, alpha: 0.9 })
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

    const BAR_W   = 44
    const PIP_H   = 3
    const PIP_GAP = 2
    const pipW    = (BAR_W - (maxPts - 1) * PIP_GAP) / maxPts

    this._comboBarGfx.clear()

    for (let i = 0; i < maxPts; i++) {
      const x = -BAR_W / 2 + i * (pipW + PIP_GAP)
      this._comboBarGfx.rect(x, 0, pipW, PIP_H)
      this._comboBarGfx.fill({ color: 0x111111, alpha: 0.8 })
      if (i < points) {
        this._comboBarGfx.rect(x, 0, pipW, PIP_H)
        this._comboBarGfx.fill({ color: this._config.pipColor, alpha: 0.95 })
      }
    }
  }

  /**
   * Update cooldown bar fills.
   * snapshot: { skillIndex: { remaining: ms, total: ms }, ... }
   */
  setCooldowns(snapshot) {
    if (!this._cdBarGfx) return
    this._drawCdBar(snapshot)
  }

  _drawCdBar(snapshot) {
    this._cdBarGfx.clear()
    for (const seg of this._cdSegments) {
      const cd  = snapshot[seg.skillIndex]
      const pct = cd && cd.total > 0 ? Math.min(1, cd.remaining / cd.total) : 0

      // Background
      this._cdBarGfx.rect(seg.bgX, 0, this._cdSegW, this._cdSegH)
      this._cdBarGfx.fill({ color: 0x111111, alpha: 0.6 })

      // Colored fill — drains left-to-right as cooldown expires
      if (pct > 0) {
        this._cdBarGfx.rect(seg.bgX, 0, this._cdSegW * pct, this._cdSegH)
        this._cdBarGfx.fill({ color: seg.color, alpha: 0.9 })
      }
    }
  }

  update(dt) {
    // Nothing frame-specific needed currently
  }

  destroy() {
    this._container.destroy({ children: true })
  }
}
