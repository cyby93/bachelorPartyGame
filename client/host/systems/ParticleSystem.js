/**
 * client/host/systems/ParticleSystem.js
 * Lightweight CPU particle system with object pooling.
 * Hit sparks, death bursts, and themed emitters (frost, fire, holy).
 * Draws every frame onto a single Graphics object (no sprite allocation).
 */

import { Graphics } from 'pixi.js'

const MAX_PARTICLES = 300

export default class ParticleSystem {
  constructor(layer) {
    this._particles = []
    this._pool = []       // free list for recycled particle data objects
    this._gfx = new Graphics()
    layer.addChild(this._gfx)
  }

  // ── Public emitters ────────────────────────────────────────────────────────

  /** Small directional spark — call on hit. */
  hitSpark(x, y, colorHex) {
    this._burst(x, y, colorHex, 6, 120, 0.22, 2)
  }

  /** Large omnidirectional burst — call on death. */
  deathBurst(x, y, colorHex) {
    this._burst(x, y, colorHex, 18, 200, 0.6, 4)
  }

  /** Frost particles — blue/white, slower, no gravity. */
  frostParticles(x, y) {
    this._burst(x, y, 0x88ccff, 8, 60, 0.5, 3, { gravity: 0, colors: [0x88ccff, 0xaaeeff, 0xffffff] })
  }

  /** Fire particles — red/orange/yellow, upward drift. */
  fireParticles(x, y) {
    this._burst(x, y, 0xff6600, 10, 80, 0.4, 3, { gravity: -100, colors: [0xff2200, 0xff6600, 0xffcc00] })
  }

  /** Holy glow — golden particles, float upward gently. */
  holyGlow(x, y) {
    this._burst(x, y, 0xffdd44, 6, 40, 0.6, 2.5, { gravity: -50, colors: [0xffdd44, 0xffffaa, 0xffffff] })
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  update(dt) {
    const g = this._gfx
    g.clear()
    if (this._particles.length === 0) return

    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i]
      p.life -= dt
      if (p.life <= 0) {
        this._pool.push(this._particles[i])
        this._particles.splice(i, 1)
        continue
      }

      p.x  += p.vx * dt
      p.y  += p.vy * dt
      p.vy += p.gravity * dt

      const alpha = Math.max(0, p.life / p.maxLife) * 0.9
      const r     = p.radius * (0.4 + 0.6 * (p.life / p.maxLife))

      g.circle(p.x, p.y, r)
      g.fill({ color: p.color, alpha })
    }
  }

  destroy() {
    this._gfx.destroy()
    this._particles = []
    this._pool = []
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _burst(x, y, colorHex, count, speed, life, radius, opts = {}) {
    const gravity = opts.gravity ?? 180
    const colors = opts.colors ?? null

    // Convert CSS color string to number for PixiJS
    const baseColor = typeof colorHex === 'string'
      ? parseInt(colorHex.replace('#', ''), 16)
      : (colorHex ?? 0xffffff)

    for (let i = 0; i < count; i++) {
      if (this._particles.length >= MAX_PARTICLES) break

      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
      const spd   = speed * (0.6 + Math.random() * 0.6)
      const color = colors ? colors[Math.floor(Math.random() * colors.length)] : baseColor

      let p = this._pool.pop()
      if (p) {
        // Reuse pooled object
        p.x = x; p.y = y
        p.vx = Math.cos(angle) * spd
        p.vy = Math.sin(angle) * spd - 30
        p.color = color
        p.life = life
        p.maxLife = life
        p.radius = radius
        p.gravity = gravity
      } else {
        p = {
          x, y,
          vx:      Math.cos(angle) * spd,
          vy:      Math.sin(angle) * spd - 30,
          color,
          life,
          maxLife: life,
          radius,
          gravity,
        }
      }

      this._particles.push(p)
    }
  }
}
