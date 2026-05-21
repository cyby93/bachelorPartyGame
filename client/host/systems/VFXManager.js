/**
 * client/host/systems/VFXManager.js
 * Facade that owns all VFX subsystems.
 * Created by BattleRenderer in enter(), destroyed in exit().
 */

import { Graphics, Sprite } from 'pixi.js'
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

    this._fxLayer          = layers.fx
    this._bladestorms      = []         // { gfx, born, duration, angle, getPos }
    this._bloodlustSpirits = []         // { sprite, born, duration, startX, startY }
    this._bloodlustAuras   = new Map()  // playerId → { getPos, timer }

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
      ['Tranquility',         (d) => { os.tranquilityField(d.x, d.y, d.radius || 700, () => ps.tranquilityAmbient(d.x, d.y, d.radius || 700)); ps.tranquilityBurst(d.x, d.y) }],
      ['Icebound Fortitude',  (d) => { os.iceboundFortitude(d.x, d.y); ps.iceShards(d.x, d.y) }],
      // Thunder Clap: instant full-radius stamp (Frost Nova pattern) — earth shockwave aesthetic
      ['Thunder Clap',        (d) => { os.thunderClapRing(d.x, d.y, d.radius || 120); ps.hitSpark(d.x, d.y, d.color || '#ffcc00') }],
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
      // ── Splash-damage abilities: AOE ring shows impact radius clearly ─────────
      ['Agonizing Flames', (d) => {
        os.fireNovaRing(d.x, d.y, d.radius || 120)
        ps.hitSpark(d.x, d.y, d.color || '#ff6600')
        os.impactFlash(d.x, d.y, d.color || '#ff8800')
      }],
      ['Pyroblast',        (d) => {
        os.explosionBurst(d.x, d.y, d.radius || 140)
        os.fireNovaRing(d.x, d.y, d.radius || 140)
        ps.hitSpark(d.x, d.y, d.color || '#ff8800')
      }],
      ['Shadow Blast',     (d) => {
        os.shadowNovaRing(d.x, d.y, d.radius || 120)
        ps.hitSpark(d.x, d.y, d.color || '#8800cc')
        os.impactFlash(d.x, d.y, d.color || '#8800cc')
      }],
    ]
    for (const [name, fn] of skills) this._skillHandlers.set(name, fn)

    // ── Type-based fallbacks ─────────────────────────────────────────────────
    this._typeHandlers.set('MELEE', (d) => {
      if (d.width != null) {
        os.meleeRect(d.x, d.y, d.angle, d.range || 160, d.width, d.color)
      } else {
        os.meleeArc(d.x, d.y, d.angle, d.range || 80, d.color)
      }
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
    this._tickBloodlustAuras(dt)
    this._tickBloodlustSpirits()
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

      const pos = b.getPos()
      if (!pos) {
        b.gfx.destroy()
        this._bladestorms.splice(i, 1)
        continue
      }
      const { x, y } = pos
      const alpha = age < 200
        ? age / 200
        : age > b.duration - 400
          ? (b.duration - age) / 400
          : 1.0

      const r        = b.radius
      const rHandle  = r * 0.28    // pommel end
      const rGuard   = r * 0.50    // crossguard position
      const rRoot    = r * 0.52    // blade root (just past guard)
      const rTip     = r * 1.22    // blade tip
      const bladeHW  = r * 0.065   // blade half-width at root
      const guardLen = r * 0.14    // crossguard half-length

      b.gfx.clear()
      b.gfx.position.set(x, y)

      for (let j = 0; j < 6; j++) {
        const a  = b.angle + j * (Math.PI / 3)
        const ca = Math.cos(a), sa = Math.sin(a)
        // perpendicular axis (blade width direction)
        const px = -sa, py = ca

        // ── Handle ────────────────────────────────────────────────────────
        b.gfx.moveTo(ca * rHandle, sa * rHandle)
        b.gfx.lineTo(ca * rGuard,  sa * rGuard)
        b.gfx.stroke({ color: 0x8b6340, width: 3.5, alpha: 0.9 * alpha })

        // ── Crossguard ────────────────────────────────────────────────────
        b.gfx.moveTo(ca * rGuard + px * guardLen, sa * rGuard + py * guardLen)
        b.gfx.lineTo(ca * rGuard - px * guardLen, sa * rGuard - py * guardLen)
        b.gfx.stroke({ color: 0xccaa55, width: 3, alpha: 0.95 * alpha })

        // ── Blade (tapered triangle) ──────────────────────────────────────
        const bRx = ca * rRoot, bRy = sa * rRoot
        const bTx = ca * rTip,  bTy = sa * rTip
        const sxL = px * bladeHW, syL = py * bladeHW

        // Blade fill — steel blue-white
        b.gfx.moveTo(bRx + sxL, bRy + syL)
        b.gfx.lineTo(bRx - sxL, bRy - syL)
        b.gfx.lineTo(bTx, bTy)
        b.gfx.closePath()
        b.gfx.fill({ color: 0xddeeff, alpha: 0.88 * alpha })

        // Bright edge highlight along one side
        b.gfx.moveTo(bRx + sxL, bRy + syL)
        b.gfx.lineTo(bTx, bTy)
        b.gfx.stroke({ color: 0xffffff, width: 1.5, alpha: 0.75 * alpha })
      }
    }
  }

  /**
   * Fire spirit-roar effect when a player receives Bloodlust.
   * Clones the player's current sprite texture, tints it red, and expands it outward as it fades.
   * @param {number}  x        world x of the player
   * @param {number}  y        world y of the player
   * @param {Texture} texture  current texture of the player's body sprite
   */
  triggerBloodlustReceive(x, y, texture) {
    if (!texture) return
    const s = new Sprite(texture)
    s.anchor.set(0.5)
    s.width  = 124
    s.height = 124
    s.tint   = 0xff2200
    s.position.set(x, y)
    s.alpha  = 0.80
    this._fxLayer.addChild(s)
    this._bloodlustSpirits.push({ sprite: s, born: Date.now(), duration: 650 })
  }

  /**
   * Start tracking a player for periodic Bloodlust spirit pulses.
   * @param {string}   playerId
   * @param {Function} getPos     — () => { x, y } | null
   * @param {Function} getTexture — () => Texture | null  (current body sprite texture)
   */
  attachBloodlustAura(playerId, getPos, getTexture) {
    this._bloodlustAuras.set(playerId, { getPos, getTexture, timer: 1.0 })
  }

  /** Stop tracking a player's Bloodlust aura. */
  detachBloodlustAura(playerId) {
    this._bloodlustAuras.delete(playerId)
  }

  _tickBloodlustAuras(dt) {
    for (const entry of this._bloodlustAuras.values()) {
      entry.timer += dt
      if (entry.timer >= 1.1) {
        entry.timer = 0
        const pos     = entry.getPos()
        const texture = entry.getTexture?.()
        if (pos && texture) this._spawnBloodlustPulse(pos.x, pos.y, texture)
      }
    }
  }

  /** Weaker repeating spirit flash — same sprite clone but lower alpha and less scale. */
  _spawnBloodlustPulse(x, y, texture) {
    const s = new Sprite(texture)
    s.anchor.set(0.5)
    s.width  = 124
    s.height = 124
    s.tint   = 0xff2200
    s.position.set(x, y)
    s.alpha  = 0.45
    this._fxLayer.addChild(s)
    this._bloodlustSpirits.push({ sprite: s, born: Date.now(), duration: 700, isPulse: true })
  }

  _tickBloodlustSpirits() {
    const now = Date.now()
    for (let i = this._bloodlustSpirits.length - 1; i >= 0; i--) {
      const b = this._bloodlustSpirits[i]
      const t = (now - b.born) / b.duration
      if (t >= 1) {
        b.sprite.destroy()
        this._bloodlustSpirits.splice(i, 1)
        continue
      }
      const ease     = 1 - Math.pow(1 - t, 2)
      const maxScale = b.isPulse ? 1.6 : 2.4
      const startA   = b.isPulse ? 0.45 : 0.80
      b.sprite.scale.set(1 + ease * (maxScale - 1))
      b.sprite.alpha = startA * (1 - t)
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
    for (const b of this._bloodlustSpirits) b.sprite.destroy()
    this._bloodlustSpirits.length = 0
    this._bloodlustAuras.clear()
    this.particles.destroy()
    this.oneShot.destroy()
    this.ground.destroy()
    this.auras.destroy()
    this.floatingText.destroy()
  }
}
