/**
 * client/host/systems/AuraSystem.js
 * Entity-attached ring visuals for active buffs/debuffs.
 * Rings pulse gently; invisible effect sets entity alpha instead.
 */

import { Graphics } from 'pixi.js'

function parseColor(hex) {
  if (typeof hex === 'string') return parseInt(hex.replace('#', ''), 16)
  return hex ?? 0xffffff
}

// Effect source pattern → aura ring color
const AURA_COLORS = {
  speed:        0x00ffff,
  damage_boost: 0xff4444,
  reduction:    0xffff00,
  shield:       0xffcc00,
  bear:         0x8b4513,
  default:      0xaaaaaa,
}

function getAuraColor(params) {
  if (!params) return AURA_COLORS.default
  if (params.speedMultiplier && params.speedMultiplier > 1) return AURA_COLORS.speed
  if (params.damageMultiplier && params.damageMultiplier > 1) return AURA_COLORS.damage_boost
  if (params.damageReduction) return AURA_COLORS.reduction
  if (params.shield) return AURA_COLORS.shield
  if (params.transformSprite === 'bear') return AURA_COLORS.bear
  return AURA_COLORS.default
}

export default class AuraSystem {
  constructor() {
    this._entityAuras = new Map()  // entityId → { rings: Map<key, Graphics>, container }
    this._time = 0
  }

  /**
   * Sync aura rings for one entity.
   * @param {string} entityId
   * @param {Container} entityContainer
   * @param {Array<{src, params}>} effects - active effects from server
   * @param {number} baseRadius - entity collision radius for ring sizing
   */
  sync(entityId, entityContainer, effects, baseRadius = 20) {
    if (!this._entityAuras.has(entityId)) {
      this._entityAuras.set(entityId, { rings: new Map(), container: entityContainer })
    }

    const entry = this._entityAuras.get(entityId)
    entry.container = entityContainer

    // Filter to effects that should show aura rings (buffs only, not debuffs on enemies)
    const auraEffects = (effects ?? []).filter(e => {
      const p = e.params ?? {}
      // Show ring for speed buffs, damage buffs, damage reduction, shields, transforms
      return p.speedMultiplier || p.damageMultiplier || p.damageReduction || p.shield || p.transformSprite
    })

    // Handle invisible: set entity alpha instead of ring
    const hasInvisible = (effects ?? []).some(e => e.params?.invisible)
    entityContainer.alpha = hasInvisible ? 0.3 : (entityContainer._baseAlpha ?? 1.0)

    // Build desired ring keys
    const desiredKeys = new Set()
    for (const eff of auraEffects) {
      desiredKeys.add(eff.src)
    }

    // Remove rings no longer needed
    entry.rings.forEach((ring, key) => {
      if (!desiredKeys.has(key)) {
        entityContainer.removeChild(ring)
        ring.destroy()
        entry.rings.delete(key)
      }
    })

    // Add new rings
    for (const eff of auraEffects) {
      if (entry.rings.has(eff.src)) continue
      const color = getAuraColor(eff.params)
      const ring = new Graphics()
      ring.circle(0, 0, baseRadius + 6)
      ring.stroke({ color, width: 2, alpha: 0.5 })
      entityContainer.addChild(ring)
      entry.rings.set(eff.src, ring)
    }
  }

  update(dt) {
    this._time += dt
    const pulseAlpha = 0.35 + 0.25 * Math.sin(this._time * 3)

    this._entityAuras.forEach(entry => {
      entry.rings.forEach(ring => {
        ring.alpha = pulseAlpha
      })
    })
  }

  /**
   * Remove all auras for an entity.
   */
  removeEntity(entityId) {
    const entry = this._entityAuras.get(entityId)
    if (!entry) return
    entry.rings.forEach(ring => ring.destroy())
    this._entityAuras.delete(entityId)
  }

  destroy() {
    this._entityAuras.forEach(entry => {
      entry.rings.forEach(ring => ring.destroy())
    })
    this._entityAuras.clear()
  }
}
