/**
 * client/host/entities/ProjectileSprite.js
 * Visual for a single projectile.
 * Phase 4 will expand this with particle trails and type-specific colours.
 */

import { Container, Graphics } from 'pixi.js'

export default class ProjectileSprite {
  constructor(data) {
    this.id = data.id

    this.container = new Container()

    const body = new Graphics()
    body.circle(0, 0, data.radius ?? 8)
    body.fill({ color: data.color ?? '#ffff00', alpha: 0.9 })
    body.stroke({ color: '#ffffff', width: 1, alpha: 0.5 })
    this.container.addChild(body)
  }

  update(state) {
    this.container.position.set(state.x, state.y)
    this.container.alpha = state.isAlive === false ? 0 : 1
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
