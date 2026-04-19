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

  /** Frost Nova — ice particles radiate outward, zero gravity. */
  frostNovaBurst(x, y, radius) {
    this._burst(x, y, 0x44aaff, 16, radius / 0.42, 0.42, 2.5, { gravity: 0, colors: [0x44aaff, 0x88ffff, 0xffffff] })
  }

  /** Fear — violet particles erupt outward, slightly heavy. */
  fearBurst(x, y, radius) {
    this._burst(x, y, 0xaa44ff, 14, radius / 0.4, 0.4, 2, { gravity: 30, colors: [0x880099, 0xaa44ff, 0xcc88ff] })
  }

  /** Consecration — golden holy sparkles drift upward at cast origin. */
  consecrationSparkle(x, y) {
    this._burst(x, y, 0xffcc00, 14, 80, 0.6, 2, { gravity: -80, colors: [0xffcc00, 0xffffa0, 0xff9900] })
  }

  /** Bloodlust — dramatic red/orange storm burst. */
  bloodlustBurst(x, y) {
    this._burst(x, y, 0xff4400, 30, 350, 0.85, 3.5, { gravity: -30, colors: [0xff2200, 0xff6600, 0xffcc00, 0xffffff] })
  }

  /** Mass Resurrection — white soul particles float upward. */
  massResurrectionBurst(x, y) {
    this._burst(x, y, 0xffffff, 22, 120, 1.4, 3, { gravity: -150, colors: [0xffffff, 0xffffcc, 0xaaccff] })
  }

  /** Explosive Trap detonation — fire burst. */
  explosionBurst(x, y, radius) {
    this._burst(x, y, 0xff6600, 22, radius / 0.3, 0.4, 3, { gravity: -100, colors: [0xff2200, 0xff6600, 0xffcc00, 0xffffff] })
  }

  /** Tranquility channel start — nature sparkles float upward. */
  tranquilityBurst(x, y) {
    this._burst(x, y, 0x44ff88, 18, 100, 0.9, 2.5, { gravity: -90, colors: [0x44ff88, 0x22ddaa, 0xffffff, 0xaaffcc] })
  }

  /** Consecration ambient — 3 golden fire-like sparks scattered within zone. */
  consecrationAmbient(cx, cy, radius) {
    const colors = [0xffcc00, 0xff8800, 0xffffaa, 0xff4400]
    for (let i = 0; i < 3; i++) {
      if (this._particles.length >= MAX_PARTICLES) break
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * radius * 0.85
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r
      const color = colors[Math.floor(Math.random() * colors.length)]
      const life  = 0.5 + Math.random() * 0.4
      let p = this._pool.pop()
      if (p) {
        p.x = x; p.y = y
        p.vx = (Math.random() - 0.5) * 20
        p.vy = -(20 + Math.random() * 40)
        p.color = color; p.life = life; p.maxLife = life
        p.radius = 1.5 + Math.random() * 1.5; p.gravity = -30
      } else {
        p = { x, y, vx: (Math.random() - 0.5) * 20, vy: -(20 + Math.random() * 40), color, life, maxLife: life, radius: 1.5 + Math.random() * 1.5, gravity: -30 }
      }
      this._particles.push(p)
    }
  }

  /** Death and Decay ambient — 3 sickly red/green particles drift upward in zone. */
  deathDecayAmbient(cx, cy, radius) {
    const colors = [0xcc2200, 0x881100, 0xff4422, 0x994400]
    for (let i = 0; i < 3; i++) {
      if (this._particles.length >= MAX_PARTICLES) break
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * radius * 0.85
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r
      const color = colors[Math.floor(Math.random() * colors.length)]
      const life  = 0.6 + Math.random() * 0.5
      let p = this._pool.pop()
      if (p) {
        p.x = x; p.y = y
        p.vx = (Math.random() - 0.5) * 25
        p.vy = -(15 + Math.random() * 30)
        p.color = color; p.life = life; p.maxLife = life
        p.radius = 1.5 + Math.random() * 2; p.gravity = -15
      } else {
        p = { x, y, vx: (Math.random() - 0.5) * 25, vy: -(15 + Math.random() * 30), color, life, maxLife: life, radius: 1.5 + Math.random() * 2, gravity: -15 }
      }
      this._particles.push(p)
    }
  }

  /** Holy Nova radial burst — 20 sparkles fire outward to AOE boundary. */
  holyNovaBurst(x, y, radius) {
    const count  = 20
    const speed  = radius / 0.38
    const colors = [0xffdd44, 0xffffaa, 0xffffff, 0x88ffcc]

    for (let i = 0; i < count; i++) {
      if (this._particles.length >= MAX_PARTICLES) break

      const angle = (i / count) * Math.PI * 2
      const spd   = speed * (0.75 + Math.random() * 0.35)
      const color = colors[Math.floor(Math.random() * colors.length)]
      const life  = 0.42 * (0.8 + Math.random() * 0.3)

      let p = this._pool.pop()
      if (p) {
        p.x = x; p.y = y
        p.vx = Math.cos(angle) * spd
        p.vy = Math.sin(angle) * spd
        p.color = color
        p.life = life; p.maxLife = life
        p.radius = 2.5
        p.gravity = -20
      } else {
        p = { x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, color, life, maxLife: life, radius: 2.5, gravity: -20 }
      }

      this._particles.push(p)
    }
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
