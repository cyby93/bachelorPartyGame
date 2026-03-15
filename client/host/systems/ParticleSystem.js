/**
 * client/host/systems/ParticleSystem.js
 * Lightweight CPU particle system — hit sparks and death bursts.
 * Draws every frame onto a single Graphics object (no sprite allocation).
 */

import { Graphics } from 'pixi.js'

export default class ParticleSystem {
  constructor(layer) {
    this._particles = []
    this._gfx = new Graphics()
    layer.addChild(this._gfx)
  }

  // ── Public emitters ────────────────────────────────────────────────────────

  /** Small directional spark — call on hit. */
  hitSpark(x, y, colorHex) {
    this._burst(x, y, colorHex, 5, 100, 0.22, 2)
  }

  /** Large omnidirectional burst — call on death. */
  deathBurst(x, y, colorHex) {
    this._burst(x, y, colorHex, 14, 180, 0.55, 4)
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  update(dt) {
    const g = this._gfx
    g.clear()
    if (this._particles.length === 0) return

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]
      p.life -= dt
      if (p.life <= 0) { this._particles.splice(i, 1); continue }

      p.x  += p.vx * dt
      p.y  += p.vy * dt
      p.vy += 180 * dt   // gravity

      const alpha = Math.max(0, p.life / p.maxLife) * 0.9
      const r     = p.radius * (0.4 + 0.6 * (p.life / p.maxLife))

      g.circle(p.x, p.y, r)
      g.fill({ color: p.color, alpha })
    }
  }

  destroy() {
    this._gfx.destroy()
    this._particles = []
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _burst(x, y, colorHex, count, speed, life, radius) {
    // Convert CSS color string to number for PixiJS
    const color = typeof colorHex === 'string'
      ? parseInt(colorHex.replace('#', ''), 16)
      : (colorHex ?? 0xffffff)

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
      const spd   = speed * (0.6 + Math.random() * 0.6)
      this._particles.push({
        x, y,
        vx:      Math.cos(angle) * spd,
        vy:      Math.sin(angle) * spd - 30,   // slight upward bias
        color,
        life,
        maxLife: life,
        radius,
      })
    }
  }
}
