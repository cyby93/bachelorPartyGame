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
  'projectile_ichor':           'ichor',
}

// Spin speed (radians per frame at 60fps). Per-sprite tuning.
const SPIN_SPEED_MAP = {
  'projectile_avengers_shield': 0.14,
  'projectile_ichor':           0.04,  // slow, heavy wobble
}

// Scale the body sprite size down from radius*2. Values < 1 make the ball smaller.
const BODY_SCALE_MAP = {
  'projectile_penance': 0.88,
}

// How many trail history points to keep per style.
const TRAIL_LENGTH_MAP = {
  'divine': 8,
  'ichor':  7,
}

const DIVINE_COLORS = [0xfffbe0, 0xffeeaa, 0xffd966]
// Dark olive-green ichor palette: deep mossy greens + sickly yellow
const ICHOR_COLORS  = [0x3a5c1a, 0x4a7a22, 0x6b9e30, 0x8fbe42]

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
      } else if (this._trailStyle === 'ichor') {
        const dx   = newX - prevX
        const dy   = newY - prevY
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        this._spawnIchorDrips(prevX, prevY, dx / dist, dy / dist, now)
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

  _spawnIchorDrips(wx, wy, fwdX, fwdY, now) {
    // Drop a few slimy drips in a scattered blob behind the projectile
    const perpX = -fwdY
    const perpY =  fwdX
    for (let i = 0; i < 2; i++) {
      const side   = (Math.random() - 0.5) * this._radius * 1.8
      const behind = Math.random() * this._radius * 1.2
      this._particles.push({
        x:     wx - fwdX * behind + perpX * side,
        y:     wy - fwdY * behind + perpY * side,
        born:  now,
        life:  350 + Math.random() * 200,
        r:     1.0 + Math.random() * 2.5,
        color: ICHOR_COLORS[Math.floor(Math.random() * ICHOR_COLORS.length)],
      })
    }
  }

  _drawTrail(cx, cy, now) {
    this._trailGfx.clear()
    if (this._trailStyle === 'holy') {
      this._drawHolyTrail(cx, cy)
    } else if (this._trailStyle === 'divine') {
      this._drawDivineTrail(cx, cy, now)
    } else if (this._trailStyle === 'ichor') {
      this._drawIchorTrail(cx, cy, now)
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

  /**
   * Ichor trail: dark olive-green slimy drips.
   * Heavy and organic — wide gooey blobs that shrink slowly.
   */
  _drawIchorTrail(cx, cy, now) {
    const g = this._trailGfx
    for (let i = 0; i < this._trail.length; i++) {
      const pt    = this._trail[i]
      const t     = 1 - (i + 1) / (this._trailMax + 1)
      // Large outer drip — slimy spread
      const r = this._radius * (1.1 - i * 0.12)
      if (r <= 0) break

      const color = ICHOR_COLORS[i % ICHOR_COLORS.length]

      // Outer slimy bloom
      g.circle(pt.x - cx, pt.y - cy, r * 1.5)
      g.fill({ color: 0x2a4010, alpha: t * 0.18 })

      // Main blob
      g.circle(pt.x - cx, pt.y - cy, r)
      g.fill({ color, alpha: t * 0.55 })

      // Bright mucus highlight (tiny center dot)
      if (i === 0) {
        g.circle(pt.x - cx - r * 0.25, pt.y - cy - r * 0.25, r * 0.25)
        g.fill({ color: 0xc8f060, alpha: t * 0.35 })
      }
    }

    // Drip particles
    for (const p of this._particles) {
      const t = 1 - (now - p.born) / p.life
      g.circle(p.x - cx, p.y - cy, p.r * (0.5 + t * 0.5))
      g.fill({ color: p.color, alpha: t * 0.6 })
    }
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
