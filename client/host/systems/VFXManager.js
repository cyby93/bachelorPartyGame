/**
 * client/host/systems/VFXManager.js
 * Facade that owns all VFX subsystems.
 * Created by BattleRenderer in enter(), destroyed in exit().
 */

import { Graphics }         from 'pixi.js'
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

    this._fxLayer    = layers.fx
    this._bladestorms = []   // { gfx, born, duration, angle, getPos }

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
    const ft = this.floatingText

    // ── Named-skill handlers (highest priority) ──────────────────────────────
    const skills = [
      ['Holy Nova',           (d) => { os.holyNovaRing(d.x, d.y, d.radius || 100); ps.holyNovaBurst(d.x, d.y, d.radius || 100); os.impactFlash(d.x, d.y, d.color) }],
      ['Frost Nova',          (d) => { os.frostNovaRing(d.x, d.y, d.radius || 100); ps.frostNovaBurst(d.x, d.y, d.radius || 100); os.impactFlash(d.x, d.y, d.color) }],
      ['Fear',                (d) => { os.fearRing(d.x, d.y, d.radius || 100); ps.fearBurst(d.x, d.y, d.radius || 100) }],
      ['Consecration',        (d) => { os.consecrationBurst(d.x, d.y, d.radius || 100); ps.consecrationSparkle(d.x, d.y); os.impactFlash(d.x, d.y, d.color) }],
      ['Bloodlust',           (d) => { os.bloodlustWave(d.x, d.y); ps.bloodlustBurst(d.x, d.y); os.impactFlash(d.x, d.y, d.color) }],
      ['Mass Resurrection',   (d) => { os.massResurrectionRing(d.x, d.y); ps.massResurrectionBurst(d.x, d.y) }],
      ['Tranquility',         (d) => { os.tranquilityField(d.x, d.y, d.radius || 700); ps.tranquilityBurst(d.x, d.y) }],
      ['Icebound Fortitude',  (d) => { os.iceboundFortitude(d.x, d.y); ps.iceShards(d.x, d.y) }],
      // Bladestorm: persistent visual attached via attachBladestorm — fire cast flash only
      ['Bladestorm',          (d) => { os.aoeFlash(d.x, d.y, d.radius || 70, d.color) }],
      ['Blink', (d) => {
        if (d.srcX != null) {
          os.aoeFlash(d.srcX, d.srcY, 35, d.color)
          ps.blinkVanish(d.srcX, d.srcY)
        }
        os.aoeFlash(d.x, d.y, 35, d.color)
        ps.blinkArrive(d.x, d.y)
      }],
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
      if (d.subtype === 'WARLOCK_CHANNEL') {
        const count = d.warlockCount ?? 1
        for (let i = 0; i < count; i++) {
          ft.spawn(
            d.x + (Math.random() - 0.5) * 50,
            d.y - 20 + (Math.random() - 0.5) * 30,
            0,
            'warlockBuff'
          )
        }
        return
      }
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
    this._tickBladestorms(dt)
  }

  /**
   * Attach a spinning Bladestorm visual to a player container for the skill duration.
   * @param {Function} getPos  — () => { x, y } in world space
   * @param {number}   duration — ms the storm lasts
   */
  attachBladestorm(getPos, duration, radius) {
    const gfx = new Graphics()
    this._fxLayer.addChild(gfx)
    this._bladestorms.push({ gfx, born: Date.now(), duration, radius, angle: 0, getPos })
  }

  _tickBladestorms(dt) {
    const now = Date.now()
    for (let i = this._bladestorms.length - 1; i >= 0; i--) {
      const b = this._bladestorms[i]
      const age = now - b.born
      if (age >= b.duration) {
        b.gfx.destroy()
        this._bladestorms.splice(i, 1)
        continue
      }

      b.angle += dt * Math.PI * 3.5   // ~1.75 full rotations per second

      const { x, y } = b.getPos()
      const alpha = age < 200
        ? age / 200
        : age > b.duration - 400
          ? (b.duration - age) / 400
          : 1.0

      const r = b.radius
      const r1 = r * 0.45   // blade root — just outside player body
      const r2 = r * 1.25   // blade tip — extends past hit zone edge so damage range is clearly covered
      const crossLen = r * 0.20

      b.gfx.clear()
      b.gfx.position.set(x, y)

      for (let j = 0; j < 6; j++) {
        const a  = b.angle + j * (Math.PI / 3)
        const x1 = Math.cos(a) * r1, y1 = Math.sin(a) * r1
        const x2 = Math.cos(a) * r2, y2 = Math.sin(a) * r2

        b.gfx.moveTo(x1, y1)
        b.gfx.lineTo(x2, y2)
        b.gfx.stroke({ color: 0xff3300, width: 4, alpha: 0.85 * alpha })

        const perp = a + Math.PI / 5
        const mx = Math.cos(a) * ((r1 + r2) / 2)
        const my = Math.sin(a) * ((r1 + r2) / 2)
        b.gfx.moveTo(mx - Math.cos(perp) * crossLen, my - Math.sin(perp) * crossLen)
        b.gfx.lineTo(mx + Math.cos(perp) * crossLen, my + Math.sin(perp) * crossLen)
        b.gfx.stroke({ color: 0xff7700, width: 2, alpha: 0.65 * alpha })
      }

      const ringR = r * 1.0
      b.gfx.circle(0, 0, ringR)
      b.gfx.stroke({ color: 0xcc2200, width: 2, alpha: 0.35 * alpha })
      b.gfx.circle(0, 0, ringR)
      b.gfx.fill({ color: 0xff4400, alpha: 0.06 * alpha })
    }
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
    for (const b of this._bladestorms) b.gfx.destroy()
    this._bladestorms.length = 0
    this.particles.destroy()
    this.oneShot.destroy()
    this.ground.destroy()
    this.auras.destroy()
    this.floatingText.destroy()
  }
}
