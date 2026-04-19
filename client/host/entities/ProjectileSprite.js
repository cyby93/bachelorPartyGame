/**
 * client/host/entities/ProjectileSprite.js
 * Visual for a single projectile with a fading trail.
 */

import { Container, Graphics, Sprite, Assets } from 'pixi.js'

const TRAIL_LENGTH = 5

// Maps spriteKey → trail style. Add entries as new ability sprites are created.
const TRAIL_STYLE_MAP = {
  'projectile_avengers_shield': 'holy',
  'projectile_penance':         'divine',
}

// Spin speed (radians per frame at 60fps). Per-sprite tuning.
const SPIN_SPEED_MAP = {
  'projectile_avengers_shield': 0.14,
}

// Scale the body sprite size down from radius*2. Values < 1 make the ball smaller.
const BODY_SCALE_MAP = {
  'projectile_penance': 0.88,
}

// How many trail history points to keep per style.
const TRAIL_LENGTH_MAP = {
  'divine': 8,
}

const DIVINE_COLORS = [0xfffbe0, 0xffeeaa, 0xffd966]

export default class ProjectileSprite {
  constructor(data) {
    this.id = data.id

    const colorNum = typeof data.color === 'string'
      ? parseInt(data.color.replace('#', ''), 16)
      : (data.color ?? 0xffff00)

    this._color       = colorNum
    this._radius      = data.radius ?? 8
    this._trailStyle  = TRAIL_STYLE_MAP[data.spriteKey] ?? 'default'
    this._spinSpeed   = SPIN_SPEED_MAP[data.spriteKey] ?? 0
    this._trailMax    = TRAIL_LENGTH_MAP[this._trailStyle] ?? TRAIL_LENGTH
    this._rotation    = 0
    this._particles   = []  // lingering holy sparkles: { x, y, born, life, r, color }

    this.container = new Container()

    this._trailGfx = new Graphics()
    this.container.addChild(this._trailGfx)

    const textureKey  = data.spriteKey ?? 'projectile_default'
    const bodyScale   = BODY_SCALE_MAP[textureKey] ?? 1
    this._body = new Sprite(Assets.get(textureKey))
    this._body.anchor.set(0.5)
    this._body.width  = this._radius * 2 * bodyScale
    this._body.height = this._radius * 2 * bodyScale
    this._body.tint   = textureKey === 'projectile_default' ? colorNum : 0xffffff
    this.container.addChild(this._body)

    this._trail = []
  }

  update(state) {
    const newX = state.x
    const newY = state.y
    const now  = Date.now()

    if (this.container.position.x !== 0 || this.container.position.y !== 0) {
      const prevX = this.container.position.x
      const prevY = this.container.position.y
      this._trail.unshift({ x: prevX, y: prevY })
      if (this._trail.length > this._trailMax) this._trail.length = this._trailMax

      if (this._trailStyle === 'divine') {
        // Tail offset: spawn behind the body in the direction opposite to travel
        const dx   = newX - prevX
        const dy   = newY - prevY
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const tailX = prevX - (dx / dist) * this._radius
        const tailY = prevY - (dy / dist) * this._radius
        this._spawnDivineParticles(tailX, tailY, dx / dist, dy / dist, now)
      }
    }

    // Age out dead particles
    if (this._particles.length > 0) {
      this._particles = this._particles.filter(p => now - p.born < p.life)
    }

    this.container.position.set(newX, newY)

    if (this._spinSpeed > 0) {
      this._rotation += this._spinSpeed
      this._body.rotation = this._rotation
    }

    this._drawTrail(newX, newY, now)
  }

  _spawnDivineParticles(wx, wy, fwdX, fwdY, now) {
    // Perpendicular axis for side-scatter (no forward scatter)
    const perpX = -fwdY
    const perpY =  fwdX
    for (let i = 0; i < 2; i++) {
      const side   = (Math.random() - 0.5) * this._radius * 1.2
      const behind = Math.random() * this._radius * 0.6
      this._particles.push({
        x:     wx - fwdX * behind + perpX * side,
        y:     wy - fwdY * behind + perpY * side,
        born:  now,
        life:  280 + Math.random() * 180,
        r:     0.8 + Math.random() * 1.4,
        color: DIVINE_COLORS[Math.floor(Math.random() * DIVINE_COLORS.length)],
      })
    }
  }

  _drawTrail(cx, cy, now) {
    this._trailGfx.clear()
    if (this._trailStyle === 'holy') {
      this._drawHolyTrail(cx, cy)
    } else if (this._trailStyle === 'divine') {
      this._drawDivineTrail(cx, cy, now)
    } else {
      this._drawDefaultTrail(cx, cy)
    }
  }

  _drawDefaultTrail(cx, cy) {
    const g = this._trailGfx
    for (let i = 0; i < this._trail.length; i++) {
      const pt    = this._trail[i]
      const alpha = 0.45 * (1 - (i + 1) / (TRAIL_LENGTH + 1))
      const r     = this._radius * (0.85 - i * 0.15)
      if (r <= 0) break
      g.circle(pt.x - cx, pt.y - cy, r)
      g.fill({ color: this._color, alpha })
    }
  }

  _drawHolyTrail(cx, cy) {
    const g = this._trailGfx
    for (let i = 0; i < this._trail.length; i++) {
      const pt = this._trail[i]
      const t  = 1 - (i + 1) / (TRAIL_LENGTH + 1)
      const r  = this._radius * (0.9 - i * 0.14)
      if (r <= 0) break

      // Outer bloom
      g.circle(pt.x - cx, pt.y - cy, r * 2.0)
      g.fill({ color: 0xffdd44, alpha: t * 0.08 })

      // Mid golden ring
      g.circle(pt.x - cx, pt.y - cy, r * 1.3)
      g.fill({ color: 0xffcc33, alpha: t * 0.20 })

      // White hot core
      g.circle(pt.x - cx, pt.y - cy, r * 0.5)
      g.fill({ color: 0xffffff, alpha: t * 0.40 })
    }
  }

  _drawDivineTrail(cx, cy, now) {
    const g = this._trailGfx

    // Core trail — tighter, slightly reduced glow
    for (let i = 0; i < this._trail.length; i++) {
      const pt = this._trail[i]
      const t  = 1 - (i + 1) / (this._trailMax + 1)
      const r  = this._radius * (0.85 - i * 0.09)
      if (r <= 0) break

      // Soft warm outer glow
      g.circle(pt.x - cx, pt.y - cy, r * 1.6)
      g.fill({ color: 0xffaa33, alpha: t * 0.08 })

      // Bright white-yellow core streak
      g.circle(pt.x - cx, pt.y - cy, r * 0.75)
      g.fill({ color: 0xfffbe0, alpha: t * 0.42 })
    }

    // Lingering holy sparkles
    for (const p of this._particles) {
      const t = 1 - (now - p.born) / p.life
      g.circle(p.x - cx, p.y - cy, p.r)
      g.fill({ color: p.color, alpha: t * 0.75 })
    }
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
