/**
 * client/host/systems/OneShotEffectSystem.js
 * Short-lived visual effects on the fx layer: melee arcs, AOE flashes, dash trails, impact bursts.
 * Uses a simple pool of Graphics objects.
 */

import { Graphics } from 'pixi.js'

function parseColor(hex) {
  if (typeof hex === 'string') return parseInt(hex.replace('#', ''), 16)
  return hex ?? 0xffffff
}

export default class OneShotEffectSystem {
  constructor(layer) {
    this._layer = layer
    this._active = []    // { gfx, elapsed, duration, update(progress) }
    this._pool = []
  }

  /**
   * Melee arc sweep — 0.15s animated arc that fades.
   */
  meleeArc(x, y, facing, range, color) {
    const c = parseColor(color)
    const duration = 0.15
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1
    gfx.scale.set(1)

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        // Sweep expands from narrow to full arc
        const halfArc = (Math.PI / 4) * Math.min(1, progress * 2)
        gfx.moveTo(0, 0)
        gfx.arc(0, 0, range * (0.6 + 0.4 * progress), facing - halfArc, facing + halfArc)
        gfx.lineTo(0, 0)
        gfx.fill({ color: c, alpha: 0.4 * (1 - progress) })
        gfx.stroke({ color: 0xffffff, width: 2, alpha: 0.6 * (1 - progress) })
      }
    })
  }

  /**
   * AOE flash — 0.5s expanding ring that fades.
   */
  aoeFlash(x, y, radius, color) {
    const c = parseColor(color)
    const duration = 0.5
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1
    gfx.scale.set(1)

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        const r = radius * (0.3 + 0.7 * progress)
        // Inner burst — fades in first 40% of animation
        if (progress < 0.4) {
          const bp = progress / 0.4
          gfx.circle(0, 0, r * 0.5)
          gfx.fill({ color: c, alpha: 0.5 * (1 - bp) })
        }
        // Expanding ring
        gfx.circle(0, 0, r)
        gfx.fill({ color: c, alpha: 0.35 * (1 - progress) })
        gfx.circle(0, 0, r)
        gfx.stroke({ color: c, width: 4, alpha: 0.9 * (1 - progress) })
      }
    })
  }

  /**
   * Dash trail — 0.2s streaked line.
   */
  dashTrail(x1, y1, x2, y2, color) {
    const c = parseColor(color)
    const duration = 0.2
    const gfx = this._getGfx()
    gfx.position.set(0, 0)
    gfx.alpha = 1
    gfx.scale.set(1)

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        const alpha = 0.6 * (1 - progress)
        gfx.moveTo(x1, y1)
        gfx.lineTo(x2, y2)
        gfx.stroke({ color: c, width: 6 * (1 - progress * 0.5), alpha })
        // Bright core
        gfx.moveTo(x1, y1)
        gfx.lineTo(x2, y2)
        gfx.stroke({ color: 0xffffff, width: 2, alpha: alpha * 0.7 })
      }
    })
  }

  /**
   * Impact flash — 0.1s bright circle burst.
   */
  impactFlash(x, y, color) {
    const c = parseColor(color)
    const duration = 0.1
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1
    gfx.scale.set(1)

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        const r = 8 + 12 * progress
        gfx.circle(0, 0, r)
        gfx.fill({ color: 0xffffff, alpha: 0.8 * (1 - progress) })
        gfx.circle(0, 0, r * 0.6)
        gfx.fill({ color: c, alpha: 0.6 * (1 - progress) })
      }
    })
  }

  update(dt) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const fx = this._active[i]
      fx.elapsed += dt
      const progress = Math.min(1, fx.elapsed / fx.duration)

      if (progress >= 1) {
        fx.gfx.clear()
        fx.gfx.visible = false
        this._pool.push(fx.gfx)
        this._active.splice(i, 1)
        continue
      }

      fx.update(progress)
    }
  }

  destroy() {
    this._active.forEach(fx => { fx.gfx.destroy() })
    this._pool.forEach(gfx => gfx.destroy())
    this._active = []
    this._pool = []
  }

  _getGfx() {
    let gfx = this._pool.pop()
    if (!gfx) {
      gfx = new Graphics()
      this._layer.addChild(gfx)
    }
    gfx.clear()
    gfx.visible = true
    return gfx
  }
}
