/**
 * client/host/entities/ProjectileSprite.js
 * Visual for a single projectile with a fading trail.
 */

import { Assets, Container, Graphics, Sprite } from 'pixi.js'

const TRAIL_LENGTH = 5

// Per-spriteKey visual config. Add an entry here when creating a new ability sprite.
// trailStyle:    which trail renderer to use ('holy' | 'divine' | 'ichor' | 'fire' | 'wind' | 'none' | 'default')
// spinSpeed:     body rotation in radians/frame at 60fps (0 = no spin)
// bodyScale:     multiplier on radius*2 — values < 1 shrink the body
// trailLength:   history points kept; defaults to TRAIL_LENGTH (5) when omitted
// faceDirection: if true, body rotation tracks travel direction instead of spinning
// angleOffset:   added to travel angle to correct for sprite's rest orientation (radians)
//                PixelLab arrows rest at northeast (~-π/4), so offset = +π/4 aligns them
const PROJECTILE_CONFIG = {
  'projectile_avengers_shield':  { trailStyle: 'holy',      spinSpeed: 0.14 },
  'projectile_penance':          { trailStyle: 'divine',    bodyScale: 0.88, trailLength: 8 },
  'projectile_ichor':            { trailStyle: 'ichor',     spinSpeed: 0.04, trailLength: 7 },
  'projectile_fireball':         { trailStyle: 'fire',      spinSpeed: 0.06, bodyScale: 1.2, trailLength: 6 },
  'projectile_shadow_bolt':      { trailStyle: 'shadow',    faceDirection: true, angleOffset: 0, bodyScale: 1.3, trailLength: 12 },
  'projectile_shoot_arrow':      { trailStyle: 'wind',      bodyScale: 2.0, faceDirection: true, angleOffset: Math.PI / 4, trailLength: 10 },
  'projectile_aimed_shot':       { trailStyle: 'wind',      bodyScale: 2.2, faceDirection: true, angleOffset: Math.PI / 4, trailLength: 12 },
  'projectile_lightning_bolt':   { trailStyle: 'lightning', faceDirection: true, angleOffset: Math.PI / 4, bodyScale: 1.1, trailLength: 8 },
  'projectile_wrath':            { trailStyle: 'nature',    spinSpeed: 0.08, bodyScale: 1.1, trailLength: 7 },
}

const DIVINE_COLORS     = [0xfffbe0, 0xffeeaa, 0xffd966]
const ICHOR_COLORS      = [0x3a5c1a, 0x4a7a22, 0x6b9e30, 0x8fbe42]
const FIRE_COLORS       = [0xff2200, 0xff6600, 0xff9900, 0xffcc33, 0xffeeaa]
const SHADOW_COLORS     = [0x220033, 0x440066, 0x6600aa, 0x8800cc, 0xaa44ff]
const LIGHTNING_COLORS  = [0xffffff, 0xaaeeff, 0x44ddff, 0x88ccff]
const NATURE_COLORS     = [0x44ff44, 0x88ff44, 0xaaff66, 0xffee44, 0x66cc22]

export default class ProjectileSprite {
  constructor(data) {
    this.id = data.id

    const colorNum = typeof data.color === 'string'
      ? parseInt(data.color.replace('#', ''), 16)
      : (data.color ?? 0xffff00)

    const cfg = PROJECTILE_CONFIG[data.spriteKey] ?? {}

    this._color          = colorNum
    this._radius         = data.radius ?? 8
    this._trailStyle     = cfg.trailStyle    ?? 'default'
    this._spinSpeed      = cfg.spinSpeed     ?? 0
    this._trailMax       = cfg.trailLength   ?? TRAIL_LENGTH
    this._rotation       = 0
    this._faceDirection  = cfg.faceDirection ?? false
    this._angleOffset    = cfg.angleOffset   ?? 0
    this._hasPosition    = false
    this._facingSet      = false
    this._particles      = []  // lingering sparkles / drips: { x, y, born, life, r, color }

    this.container = new Container()

    this._trailGfx = new Graphics()
    this.container.addChild(this._trailGfx)

    const textureKey  = data.spriteKey ?? 'projectile_default'
    const bodyScale   = cfg.bodyScale ?? 1
    this._body = new Sprite(Assets.get(textureKey))
    this._body.anchor.set(0.5)
    this._body.width  = this._radius * 2 * bodyScale
    this._body.height = this._radius * 2 * bodyScale
    this._body.tint   = textureKey === 'projectile_default' ? colorNum : 0xffffff
    this.container.addChild(this._body)

    if (this._faceDirection && data.angle != null) {
      this._body.rotation = data.angle + this._angleOffset
      this._facingSet = true
    }

    this._trail = []
  }

  update(state) {
    const newX = state.x
    const newY = state.y
    const now  = Date.now()

    if (this._hasPosition) {
      const prevX = this.container.position.x
      const prevY = this.container.position.y
      this._trail.unshift({ x: prevX, y: prevY })
      if (this._trail.length > this._trailMax) this._trail.length = this._trailMax

      const dx      = newX - prevX
      const dy      = newY - prevY
      const rawDist = Math.sqrt(dx * dx + dy * dy)
      const dist    = rawDist || 1

      if (this._faceDirection && !this._facingSet && rawDist > 0.05) {
        this._body.rotation = Math.atan2(dy, dx) + this._angleOffset
        this._facingSet = true
      }

      if (this._trailStyle === 'divine') {
        const tailX = prevX - (dx / dist) * this._radius
        const tailY = prevY - (dy / dist) * this._radius
        this._spawnDivineParticles(tailX, tailY, dx / dist, dy / dist, now)
      } else if (this._trailStyle === 'ichor') {
        this._spawnIchorDrips(prevX, prevY, dx / dist, dy / dist, now)
      } else if (this._trailStyle === 'fire') {
        this._spawnFireEmbers(prevX, prevY, dx / dist, dy / dist, now)
      } else if (this._trailStyle === 'shadow') {
        this._spawnShadowTendrils(prevX, prevY, dx / dist, dy / dist, now)
      } else if (this._trailStyle === 'lightning') {
        this._spawnLightningArcs(prevX, prevY, dx / dist, dy / dist, now)
      } else if (this._trailStyle === 'nature') {
        this._spawnNatureSpores(prevX, prevY, dx / dist, dy / dist, now)
      }
    }

    // Age out dead particles
    if (this._particles.length > 0) {
      this._particles = this._particles.filter(p => now - p.born < p.life)
    }

    this.container.position.set(newX, newY)
    this._hasPosition = true

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

  _spawnFireEmbers(wx, wy, fwdX, fwdY, now) {
    const perpX = -fwdY
    const perpY =  fwdX
    for (let i = 0; i < 2; i++) {
      const side   = (Math.random() - 0.5) * this._radius * 2.0
      const behind = Math.random() * this._radius * 1.0
      this._particles.push({
        x:     wx - fwdX * behind + perpX * side,
        y:     wy - fwdY * behind + perpY * side,
        born:  now,
        life:  200 + Math.random() * 200,
        r:     0.6 + Math.random() * 1.8,
        color: FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)],
      })
    }
  }

  _drawTrail(cx, cy, now) {
    this._trailGfx.clear()
    if (this._trailStyle === 'none')      return
    if (this._trailStyle === 'holy')      { this._drawHolyTrail(cx, cy);             return }
    if (this._trailStyle === 'divine')    { this._drawDivineTrail(cx, cy, now);       return }
    if (this._trailStyle === 'ichor')     { this._drawIchorTrail(cx, cy, now);        return }
    if (this._trailStyle === 'fire')      { this._drawFireTrail(cx, cy, now);         return }
    if (this._trailStyle === 'shadow')    { this._drawShadowTrail(cx, cy, now);       return }
    if (this._trailStyle === 'lightning') { this._drawLightningTrail(cx, cy, now);    return }
    if (this._trailStyle === 'nature')    { this._drawNatureTrail(cx, cy, now);       return }
    if (this._trailStyle === 'wind')      { this._drawWindTrail(cx, cy);              return }
    this._drawDefaultTrail(cx, cy)
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

  // Returns an array of { rx, ry, t } — positions along the trail interpolated at `step`
  // intervals, in newest-first order. rx/ry are relative to the container origin (cx, cy).
  _interpolateTrail(cx, cy, step) {
    const src  = [{ x: cx, y: cy }, ...this._trail]
    const pts  = []
    const nSrc = src.length
    for (let i = 0; i < nSrc - 1; i++) {
      const a  = src[i]
      const b  = src[i + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d  = Math.sqrt(dx * dx + dy * dy) || 1
      const n  = Math.max(1, Math.ceil(d / step))
      for (let s = 0; s < n; s++) {
        const frac = s / n
        pts.push({
          rx: (a.x + dx * frac) - cx,
          ry: (a.y + dy * frac) - cy,
          t:  1 - (i + frac) / (nSrc - 1),
        })
      }
    }
    return pts
  }

  _drawHolyTrail(cx, cy) {
    const g   = this._trailGfx
    const r   = this._radius * 0.7
    const pts = this._interpolateTrail(cx, cy, r)
    for (let i = pts.length - 1; i >= 0; i--) {
      const { rx, ry, t } = pts[i]
      g.circle(rx, ry, r * 2.0)
      g.fill({ color: 0xffdd44, alpha: t * 0.08 })
      g.circle(rx, ry, r * 1.3)
      g.fill({ color: 0xffcc33, alpha: t * 0.20 })
      g.circle(rx, ry, r * 0.5)
      g.fill({ color: 0xffffff, alpha: t * 0.40 })
    }
  }

  _drawDivineTrail(cx, cy, now) {
    const g   = this._trailGfx
    const r   = this._radius * 0.4
    const pts = this._interpolateTrail(cx, cy, r)
    for (let i = pts.length - 1; i >= 0; i--) {
      const { rx, ry, t } = pts[i]
      g.circle(rx, ry, r * 1.6)
      g.fill({ color: 0xffaa33, alpha: t * 0.08 })
      g.circle(rx, ry, r * 0.75)
      g.fill({ color: 0xfffbe0, alpha: t * 0.42 })
    }
    for (const p of this._particles) {
      const t = 1 - (now - p.born) / p.life
      g.circle(p.x - cx, p.y - cy, p.r)
      g.fill({ color: p.color, alpha: t * 0.75 })
    }
  }

  _drawIchorTrail(cx, cy, now) {
    const g   = this._trailGfx
    const r   = this._radius * 1.1
    const pts = this._interpolateTrail(cx, cy, r)
    for (let i = pts.length - 1; i >= 0; i--) {
      const { rx, ry, t } = pts[i]
      const color = ICHOR_COLORS[Math.floor((1 - t) * ICHOR_COLORS.length) % ICHOR_COLORS.length]
      g.circle(rx, ry, r * 1.5)
      g.fill({ color: 0x2a4010, alpha: t * 0.18 })
      g.circle(rx, ry, r)
      g.fill({ color, alpha: t * 0.55 })
    }
    for (const p of this._particles) {
      const t = 1 - (now - p.born) / p.life
      g.circle(p.x - cx, p.y - cy, p.r * (0.5 + t * 0.5))
      g.fill({ color: p.color, alpha: t * 0.6 })
    }
  }

  _drawFireTrail(cx, cy, now) {
    const g   = this._trailGfx
    const r   = this._radius * 0.7
    const pts = this._interpolateTrail(cx, cy, r)
    for (let i = pts.length - 1; i >= 0; i--) {
      const { rx, ry, t } = pts[i]
      g.circle(rx, ry, r * 1.8)
      g.fill({ color: 0xff4400, alpha: t * 0.09 })
      g.circle(rx, ry, r * 1.1)
      g.fill({ color: 0xff7700, alpha: t * 0.22 })
      g.circle(rx, ry, r * 0.45)
      g.fill({ color: 0xffee88, alpha: t * 0.50 })
    }
    for (const p of this._particles) {
      const t = 1 - (now - p.born) / p.life
      g.circle(p.x - cx, p.y - cy, p.r * t)
      g.fill({ color: p.color, alpha: t * 0.70 })
    }
  }

  _spawnShadowTendrils(wx, wy, fwdX, fwdY, now) {
    const perpX = -fwdY
    const perpY =  fwdX
    for (let i = 0; i < 2; i++) {
      const side   = (Math.random() - 0.5) * this._radius * 1.6
      const behind = Math.random() * this._radius * 1.2
      this._particles.push({
        x:     wx - fwdX * behind + perpX * side,
        y:     wy - fwdY * behind + perpY * side,
        born:  now,
        life:  250 + Math.random() * 200,
        r:     0.7 + Math.random() * 1.6,
        color: SHADOW_COLORS[Math.floor(Math.random() * SHADOW_COLORS.length)],
      })
    }
  }

  _drawShadowTrail(cx, cy, now) {
    const g   = this._trailGfx
    const r   = this._radius * 0.6
    const pts = this._interpolateTrail(cx, cy, r)
    for (let i = pts.length - 1; i >= 0; i--) {
      const { rx, ry, t } = pts[i]
      g.circle(rx, ry, r * 2.8)
      g.fill({ color: 0x110022, alpha: t * 0.06 })
      g.circle(rx, ry, r * 1.6)
      g.fill({ color: 0x5500aa, alpha: t * 0.16 })
      g.circle(rx, ry, r * 0.8)
      g.fill({ color: 0x9933ff, alpha: t * 0.28 })
    }

    // Drifting shadow motes
    for (const p of this._particles) {
      const t = 1 - (now - p.born) / p.life
      g.circle(p.x - cx, p.y - cy, p.r * t)
      g.fill({ color: p.color, alpha: t * 0.65 })
    }
  }

  _spawnLightningArcs(wx, wy, fwdX, fwdY, now) {
    const perpX = -fwdY
    const perpY =  fwdX
    for (let i = 0; i < 3; i++) {
      const side   = (Math.random() - 0.5) * this._radius * 2.5
      const behind = Math.random() * this._radius * 1.0
      this._particles.push({
        x:     wx - fwdX * behind + perpX * side,
        y:     wy - fwdY * behind + perpY * side,
        born:  now,
        life:  80 + Math.random() * 100,
        r:     0.5 + Math.random() * 1.2,
        color: LIGHTNING_COLORS[Math.floor(Math.random() * LIGHTNING_COLORS.length)],
      })
    }
  }

  _spawnNatureSpores(wx, wy, fwdX, fwdY, now) {
    const perpX = -fwdY
    const perpY =  fwdX
    for (let i = 0; i < 2; i++) {
      const side   = (Math.random() - 0.5) * this._radius * 1.6
      const behind = Math.random() * this._radius * 0.8
      this._particles.push({
        x:     wx - fwdX * behind + perpX * side,
        y:     wy - fwdY * behind + perpY * side,
        born:  now,
        life:  250 + Math.random() * 200,
        r:     0.8 + Math.random() * 1.6,
        color: NATURE_COLORS[Math.floor(Math.random() * NATURE_COLORS.length)],
      })
    }
  }

  _drawLightningTrail(cx, cy, now) {
    const g   = this._trailGfx
    const r   = this._radius * 0.7
    const pts = this._interpolateTrail(cx, cy, r)
    for (let i = pts.length - 1; i >= 0; i--) {
      const { rx, ry, t } = pts[i]
      g.circle(rx, ry, r * 2.2)
      g.fill({ color: 0x002244, alpha: t * 0.07 })
      g.circle(rx, ry, r * 1.2)
      g.fill({ color: 0x44aaff, alpha: t * 0.22 })
      g.circle(rx, ry, r * 0.5)
      g.fill({ color: 0xffffff, alpha: t * 0.60 })
    }
    for (const p of this._particles) {
      const t = 1 - (now - p.born) / p.life
      g.circle(p.x - cx, p.y - cy, p.r)
      g.fill({ color: p.color, alpha: t * 0.90 })
    }
  }

  _drawNatureTrail(cx, cy, now) {
    const g   = this._trailGfx
    const r   = this._radius * 0.85
    const pts = this._interpolateTrail(cx, cy, r)
    for (let i = pts.length - 1; i >= 0; i--) {
      const { rx, ry, t } = pts[i]
      g.circle(rx, ry, r * 1.8)
      g.fill({ color: 0x003300, alpha: t * 0.07 })
      g.circle(rx, ry, r * 1.0)
      g.fill({ color: 0x44bb22, alpha: t * 0.24 })
      g.circle(rx, ry, r * 0.45)
      g.fill({ color: 0xeeff88, alpha: t * 0.50 })
    }
    for (const p of this._particles) {
      const t = 1 - (now - p.born) / p.life
      g.circle(p.x - cx, p.y - cy, p.r * (0.5 + t * 0.5))
      g.fill({ color: p.color, alpha: t * 0.65 })
    }
  }

  _drawWindTrail(cx, cy) {
    const g   = this._trailGfx
    const r   = this._radius * 0.4
    const pts = this._interpolateTrail(cx, cy, r * 1.5)
    for (let i = pts.length - 1; i >= 0; i--) {
      const { rx, ry, t } = pts[i]
      g.circle(rx, ry, r * 1.4)
      g.fill({ color: 0x99ccff, alpha: t * 0.10 })
      g.circle(rx, ry, r * 1.0)
      g.fill({ color: 0xffffff, alpha: t * 0.30 })
    }
  }

  detach() {
    this._body.visible = false
    this._detached   = true
    this._detachedAt = Date.now()
  }

  updateDetached() {
    const now     = Date.now()
    const elapsed = now - this._detachedAt
    this._particles = this._particles.filter(p => now - p.born < p.life)
    const fade = Math.max(0, 1 - elapsed / 400)
    this._trailGfx.alpha = fade
    if (fade > 0 || this._particles.length > 0) {
      this._drawTrail(this.container.position.x, this.container.position.y, now)
      return false
    }
    return true
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
