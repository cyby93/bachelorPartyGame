/**
 * client/host/systems/VFXManager.js
 * Facade that owns all VFX subsystems.
 * Created by BattleRenderer in enter(), destroyed in exit().
 */

import ParticleSystem       from './ParticleSystem.js'
import OneShotEffectSystem  from './OneShotEffectSystem.js'
import GroundEffectSystem   from './GroundEffectSystem.js'
import AuraSystem           from './AuraSystem.js'
import FloatingTextPool     from './FloatingTextPool.js'

export default class VFXManager {
  /**
   * @param {object} layers - { bg, groundFx, entities, fx, ui }
   */
  constructor(layers) {
    this.particles = new ParticleSystem(layers.fx)
    this.oneShot   = new OneShotEffectSystem(layers.fx)
    this.ground    = new GroundEffectSystem(layers.groundFx)
    this.auras     = new AuraSystem()
    this.floatingText = new FloatingTextPool(layers.ui)
  }

  update(dt) {
    this.particles.update(dt)
    this.oneShot.update(dt)
    this.ground.update(dt)
    this.auras.update(dt)
    this.floatingText.update(dt)
  }

  /**
   * Dispatch VFX based on skill fired data from server.
   * @param {object} data - { playerId, skillName, type, subtype, x, y, angle, radius, range, color }
   */
  triggerSkillVFX(data) {
    const { type, subtype, x, y, angle, radius, range, color } = data

    switch (type) {
      case 'MELEE':
        this.oneShot.meleeArc(x, y, angle, range || 80, color)
        break

      case 'AOE':
        if (subtype === 'AOE_SELF' || !subtype) {
          this.oneShot.aoeFlash(x, y, radius || 100, color)
        } else if (subtype === 'AOE_LOBBED') {
          // Lobbed AOE flash will trigger on impact via projectile system
          // Show a small indicator at cast position
          this.oneShot.impactFlash(x, y, color)
        }
        break

      case 'DASH': {
        const dist = data.range || 200
        const toX = x + Math.cos(angle) * dist
        const toY = y + Math.sin(angle) * dist
        if (subtype === 'BACKWARDS') {
          this.oneShot.dashTrail(x, y, x - Math.cos(angle) * dist, y - Math.sin(angle) * dist, color)
        } else {
          this.oneShot.dashTrail(x, y, toX, toY, color)
        }
        break
      }

      case 'BUFF':
        // Aura rings are handled separately via state sync
        // Show a small flash at cast position for feedback
        this.oneShot.impactFlash(x, y, color)
        break

      case 'SHIELD':
        this.oneShot.impactFlash(x, y, color)
        break

      case 'CAST':
        // Cast start — small glow
        this.oneShot.impactFlash(x, y, color)
        break

      default:
        break
    }
  }

  /**
   * Trigger impact particles at position.
   */
  triggerImpact(x, y, color) {
    this.particles.hitSpark(x, y, color)
    this.oneShot.impactFlash(x, y, color)
  }

  /**
   * Trigger death burst at position.
   */
  triggerDeath(x, y, color) {
    this.particles.deathBurst(x, y, color)
  }

  /**
   * Spawn floating damage/heal number.
   */
  spawnDamageNumber(x, y, amount, type) {
    this.floatingText.spawn(x, y, amount, type)
  }

  destroy() {
    this.particles.destroy()
    this.oneShot.destroy()
    this.ground.destroy()
    this.auras.destroy()
    this.floatingText.destroy()
  }
}
