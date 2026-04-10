/**
 * client/host/entities/ProjectileSprite.js
 * Visual for a single projectile with a fading trail.
 */

import { Container, Graphics, Sprite, Assets } from 'pixi.js'

const TRAIL_LENGTH = 4

export default class ProjectileSprite {
  constructor(data) {
    this.id = data.id

    // Parse color to number once
    const colorNum = typeof data.color === 'string'
      ? parseInt(data.color.replace('#', ''), 16)
      : (data.color ?? 0xffff00)

    this._color  = colorNum
    this._radius = data.radius ?? 8

    this.container = new Container()

    // Trail Graphics (drawn behind the body)
    this._trailGfx = new Graphics()
    this.container.addChild(this._trailGfx)

    // Body — tinted sprite so per-projectile color is preserved
    const body = new Sprite(Assets.get('projectile_default'))
    body.anchor.set(0.5)
    body.width  = this._radius * 2
    body.height = this._radius * 2
    body.tint   = colorNum
    this.container.addChild(body)

    // Previous world positions for trail
    this._trail = []  // [{ x, y }, ...]
  }

  update(state) {
    const newX = state.x
    const newY = state.y

    // Save previous world position before moving
    if (this.container.position.x !== 0 || this.container.position.y !== 0) {
      this._trail.unshift({ x: this.container.position.x, y: this.container.position.y })
      if (this._trail.length > TRAIL_LENGTH) this._trail.length = TRAIL_LENGTH
    }

    this.container.position.set(newX, newY)
    this._drawTrail(newX, newY)
  }

  _drawTrail(cx, cy) {
    const g = this._trailGfx
    g.clear()
    for (let i = 0; i < this._trail.length; i++) {
      const pt    = this._trail[i]
      const alpha = 0.45 * (1 - (i + 1) / (TRAIL_LENGTH + 1))
      const r     = this._radius * (0.85 - i * 0.18)
      if (r <= 0) break
      // Trail positions are in world space; container is already at (cx, cy)
      g.circle(pt.x - cx, pt.y - cy, r)
      g.fill({ color: this._color, alpha })
    }
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
