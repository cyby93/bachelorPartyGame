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

// Skill-specific color overrides (class colors are often wrong for dark/decay effects)
function _zoneColor(skillName, fallback) {
  if (skillName === 'Death and Decay') return '#33aa33'  // sickly green
  if (skillName === 'Consecration')    return '#ffcc00'  // holy gold
  return fallback
}

function _zoneFillAlpha(skillName) {
  if (skillName === 'Death and Decay') return 0.28
  if (skillName === 'Consecration')    return 0.22
  return 0.20
}

function _zoneBorderWidth(skillName) {
  if (skillName === 'Death and Decay') return 4
  if (skillName === 'Consecration')    return 3
  return 3
}

const AMBIENT_INTERVAL = 0.18  // seconds between ambient particle emits per zone

export default class GroundEffectSystem {
  constructor(layer, particles = null) {
    this._layer = layer
    this._particles = particles
    this._zones = new Map()  // id → { gfx, borderGfx, skillName, radius, x, y, color, emitAccum }
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
        // Skill-specific color overrides for better visual identity
        const skillColor = _zoneColor(z.skillName, z.color)
        const c = parseColor(skillColor)
        const fillAlpha = _zoneFillAlpha(z.skillName)

        const gfx = new Graphics()
        gfx.circle(0, 0, z.radius)
        gfx.fill({ color: c, alpha: fillAlpha })
        gfx.position.set(z.x, z.y)

        const borderGfx = new Graphics()
        borderGfx.position.set(z.x, z.y)

        this._layer.addChild(gfx)
        this._layer.addChild(borderGfx)

        zone = { gfx, borderGfx, color: c, radius: z.radius, skillName: z.skillName, x: z.x, y: z.y, emitAccum: 0 }
        this._zones.set(z.id, zone)
      }

      // Reposition every frame so followOwner zones (e.g. Bladestorm) track their owner
      if (zone.x !== z.x || zone.y !== z.y) {
        zone.x = z.x
        zone.y = z.y
        zone.gfx.position.set(z.x, z.y)
        zone.borderGfx.position.set(z.x, z.y)
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
      const pulse = 0.5 + 0.4 * Math.sin(this._time * 4)
      const borderWidth = _zoneBorderWidth(zone.skillName)
      zone.borderGfx.clear()
      zone.borderGfx.circle(0, 0, zone.radius)
      zone.borderGfx.stroke({ color: zone.color, width: borderWidth, alpha: pulse })
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

    if (!this._particles) return
    this._zones.forEach(zone => {
      const sn = zone.skillName
      if (sn !== 'Consecration' && sn !== 'Death and Decay') return
      zone.emitAccum += dt
      if (zone.emitAccum < AMBIENT_INTERVAL) return
      zone.emitAccum -= AMBIENT_INTERVAL
      if (sn === 'Consecration')    this._particles.consecrationAmbient(zone.x, zone.y, zone.radius)
      else                          this._particles.deathDecayAmbient(zone.x, zone.y, zone.radius)
    })
  }

  destroy() {
    this._zones.forEach(zone => {
      zone.gfx.destroy()
      zone.borderGfx.destroy()
    })
    this._zones.clear()
  }
}
