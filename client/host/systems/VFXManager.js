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
   * @param {object} layers - { bg, groundFx, entities, fx, ui, worldUi }
   */
  constructor(layers) {
    this.particles = new ParticleSystem(layers.fx)
    this.oneShot   = new OneShotEffectSystem(layers.fx)
    this.ground    = new GroundEffectSystem(layers.groundFx, this.particles)
    this.auras     = new AuraSystem()
    this.floatingText = new FloatingTextPool(layers.worldUi)

    this._skillHandlers = new Map()
    this._typeHandlers  = new Map()
    this._buildHandlers()
  }

  // ── Handler registration ─────────────────────────────────────────────────────

  /**
   * Register a VFX handler for a specific skill name.
   * Called at boot for built-in skills; can also be called at runtime to extend.
   * skillName-based handlers take priority over type-based fallbacks.
   */
  registerSkillVFX(skillName, handler) {
    this._skillHandlers.set(skillName, handler)
  }

  _buildHandlers() {
    const os = this.oneShot
    const ps = this.particles

    // ── Named-skill handlers (highest priority) ──────────────────────────────
    const skills = [
      ['Holy Nova',         (d) => { os.holyNovaRing(d.x, d.y, d.radius || 100); ps.holyNovaBurst(d.x, d.y, d.radius || 100); os.impactFlash(d.x, d.y, d.color) }],
      ['Frost Nova',        (d) => { os.frostNovaRing(d.x, d.y, d.radius || 100); ps.frostNovaBurst(d.x, d.y, d.radius || 100); os.impactFlash(d.x, d.y, d.color) }],
      ['Fear',              (d) => { os.fearRing(d.x, d.y, d.radius || 100); ps.fearBurst(d.x, d.y, d.radius || 100) }],
      ['Consecration',      (d) => { os.consecrationBurst(d.x, d.y, d.radius || 100); ps.consecrationSparkle(d.x, d.y); os.impactFlash(d.x, d.y, d.color) }],
      ['Bloodlust',         (d) => { os.bloodlustWave(d.x, d.y); ps.bloodlustBurst(d.x, d.y); os.impactFlash(d.x, d.y, d.color) }],
      ['Mass Resurrection', (d) => { os.massResurrectionRing(d.x, d.y); ps.massResurrectionBurst(d.x, d.y) }],
      ['Tranquility',       (d) => { os.tranquilityField(d.x, d.y, d.radius || 700); ps.tranquilityBurst(d.x, d.y) }],
    ]
    for (const [name, fn] of skills) this._skillHandlers.set(name, fn)

    // ── Type-based fallbacks ─────────────────────────────────────────────────
    this._typeHandlers.set('MELEE', (d) => {
      os.meleeArc(d.x, d.y, d.angle, d.range || 80, d.color)
    })
    this._typeHandlers.set('AOE', (d) => {
      if (d.subtype === 'AOE_LOBBED') { os.impactFlash(d.x, d.y, d.color); return }
      os.aoeFlash(d.x, d.y, d.radius || 100, d.color)
      ps.hitSpark(d.x, d.y, d.color)
    })
    this._typeHandlers.set('DASH', (d) => {
      const dist = d.range || 200
      if (d.subtype === 'BACKWARDS') {
        os.dashTrail(d.x, d.y, d.x - Math.cos(d.angle) * dist, d.y - Math.sin(d.angle) * dist, d.color)
      } else {
        os.dashTrail(d.x, d.y, d.x + Math.cos(d.angle) * dist, d.y + Math.sin(d.angle) * dist, d.color)
      }
    })
    this._typeHandlers.set('BUFF', (d) => {
      if (d.subtype === 'BLOOD_PROPHET') { os.bloodProphetBuff(d.x, d.y, d.radius || 180); return }
      os.impactFlash(d.x, d.y, d.color)
    })
    this._typeHandlers.set('TELEPORT', (d) => {
      if (d.subtype === 'BLOOD_PROPHET') os.bloodProphetTeleport(d.x, d.y)
    })
    this._typeHandlers.set('ENEMY_HEAL', (d) => os.enemyHealPulse(d.x, d.y, d.radius || 300))
    this._typeHandlers.set('SHIELD',    (d) => os.impactFlash(d.x, d.y, d.color))
    this._typeHandlers.set('CAST',      (d) => os.impactFlash(d.x, d.y, d.color))
    this._typeHandlers.set('CHANNEL',   (d) => os.impactFlash(d.x, d.y, d.color))
    this._typeHandlers.set('TARGETED',  (d) => os.impactFlash(d.x, d.y, d.color))
    this._typeHandlers.set('EXPLOSION', (d) => {
      os.explosionBurst(d.x, d.y, d.radius || 120)
      ps.explosionBurst(d.x, d.y, d.radius || 120)
      os.impactFlash(d.x, d.y, d.color)
    })
    this._typeHandlers.set('SPAWN', (d) => {
      os.impactFlash(d.x, d.y, d.color)
      ps.hitSpark(d.x, d.y, d.color)
    })
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  update(dt) {
    this.particles.update(dt)
    this.oneShot.update(dt)
    this.ground.update(dt)
    this.auras.update(dt)
    this.floatingText.update(dt)
  }

  /**
   * Dispatch VFX based on skill fired data from server.
   * Named-skill handlers take priority; falls back to type-based handler.
   * @param {object} data - { playerId, skillName, type, subtype, x, y, angle, radius, range, color }
   */
  triggerSkillVFX(data) {
    const handler = this._skillHandlers.get(data.skillName) ?? this._typeHandlers.get(data.type)
    handler?.(data)
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
