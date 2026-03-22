/**
 * client/host/systems/GroundEffectSystem.js
 * Persistent AOE zones on the groundFx layer.
 * Synced to server-broadcast aoeZones array.
 */

import { Graphics } from 'pixi.js'

function parseColor(hex) {
  if (typeof hex === 'string') return parseInt(hex.replace('#', ''), 16)
  return hex ?? 0xffffff
}

export default class GroundEffectSystem {
  constructor(layer) {
    this._layer = layer
    this._zones = new Map()  // id → { gfx, borderGfx, data }
    this._time = 0
  }

  /**
   * Sync to server zone list. Creates new, updates existing, removes expired.
   * @param {Array} serverZones - [{ id, x, y, radius, color, remaining, duration }]
   */
  sync(serverZones) {
    if (!serverZones) return

    const activeIds = new Set()

    for (const z of serverZones) {
      activeIds.add(z.id)
      let zone = this._zones.get(z.id)

      if (!zone) {
        // Create new zone
        const c = parseColor(z.color)
        const gfx = new Graphics()
        gfx.circle(0, 0, z.radius)
        gfx.fill({ color: c, alpha: 0.12 })
        gfx.position.set(z.x, z.y)

        const borderGfx = new Graphics()
        borderGfx.position.set(z.x, z.y)

        this._layer.addChild(gfx)
        this._layer.addChild(borderGfx)

        zone = { gfx, borderGfx, color: c, radius: z.radius }
        this._zones.set(z.id, zone)
      }

      // Update — fade out in last 500ms
      const fadeStart = 500
      if (z.remaining < fadeStart) {
        const fadePct = z.remaining / fadeStart
        zone.gfx.alpha = fadePct
        zone.borderGfx.alpha = fadePct
      } else {
        zone.gfx.alpha = 1
        zone.borderGfx.alpha = 1
      }

      // Pulse the border ring
      const pulse = 0.4 + 0.3 * Math.sin(this._time * 4)
      zone.borderGfx.clear()
      zone.borderGfx.circle(0, 0, zone.radius)
      zone.borderGfx.stroke({ color: zone.color, width: 2, alpha: pulse })
    }

    // Remove expired zones
    this._zones.forEach((zone, id) => {
      if (!activeIds.has(id)) {
        this._layer.removeChild(zone.gfx)
        this._layer.removeChild(zone.borderGfx)
        zone.gfx.destroy()
        zone.borderGfx.destroy()
        this._zones.delete(id)
      }
    })
  }

  update(dt) {
    this._time += dt
  }

  destroy() {
    this._zones.forEach(zone => {
      zone.gfx.destroy()
      zone.borderGfx.destroy()
    })
    this._zones.clear()
  }
}
