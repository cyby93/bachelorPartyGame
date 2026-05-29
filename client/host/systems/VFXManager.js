/**
 * client/host/systems/VFXManager.js
 * Facade that owns all VFX subsystems.
 * Created by BattleRenderer in enter(), destroyed in exit().
 */

import { Assets, Container, Graphics, Sprite } from 'pixi.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'
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
    this._bladestorms      = []         // { container, swords, born, duration, radius, angle, getPos }
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
      // Cleave: rotational sweep that exactly traces the 180° hitbox cone
      ['Cleave', (d) => {
        const halfAngle = (d.skillAngle ?? Math.PI) / 2
        os.cleaveWipe(d.x, d.y, d.angle, halfAngle, d.range || 70)
        ps.hitSpark(d.x, d.y, d.color || '#ff4400')
      }],
      // Hammer of Light: instant golden stamp that exactly traces the 90° hitbox cone
      ['Hammer of Light', (d) => {
        const halfAngle = (d.skillAngle ?? Math.PI / 2) / 2
        os.hammerStamp(d.x, d.y, d.angle, halfAngle, d.range || 70)
        ps.hitSpark(d.x, d.y, d.color || '#ffd700')
      }],
      // Bladestorm: persistent visual handled entirely by attachBladestorm in BaseRenderer — no cast flash
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
      if (d.skillName === 'Freezing Trap') {
        os.freezingTrapBurst(d.x, d.y, d.radius || 120)
        ps.iceShards(d.x, d.y)
      } else {
        os.explosionBurst(d.x, d.y, d.radius || 120)
        ps.explosionBurst(d.x, d.y, d.radius || 120)
      }
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
   * Attach a spinning Bladestorm visual to a player/enemy for the skill duration.
   * @param {Function} getPos      — () => { x, y } in world space
   * @param {number}   duration    — ms the storm lasts
   * @param {number}   radius      — orbit radius in px
   * @param {string}   [texKey]    — texture asset key (default: 'bladestorm_sword')
   * @param {number}   [tint]      — blade tint color (default: 0x99bbff silver-blue)
   */
  attachBladestorm(getPos, duration, radius, texKey = 'bladestorm_sword', tint = 0x99bbff) {
    const SWORD_COUNT = 5
    const TRAIL_LEN   = 8
    const BLADE_H     = 14   // thin axis of the stretched sword sprite

    const texture   = Assets.get(texKey) ?? Assets.get('bladestorm_sword')
    const container = new Container()
    this._fxLayer.addChild(container)

    const swords = Array.from({ length: SWORD_COUNT }, () => {
      const trails = Array.from({ length: TRAIL_LEN }, () => {
        const t = new Sprite(texture)
        t.anchor.set(0.5)
        t.tint   = tint
        t.alpha  = 0
        container.addChild(t)
        return t
      })
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      container.addChild(sprite)
      return { sprite, trails, history: [] }
    })

    if (GAME_CONFIG.DEBUG_HITBOXES) {
      const debugGfx = new Graphics()
      debugGfx.circle(0, 0, radius)
      debugGfx.stroke({ color: 0x00ffff, width: 1.5, alpha: 0.7 })
      container.addChild(debugGfx)
    }

    this._bladestorms.push({ container, swords, born: Date.now(), duration, radius, angle: 0, getPos })
  }

  _tickBladestorms(dt) {
    const SWORD_COUNT = 5
    const TRAIL_LEN   = 8
    const BLADE_H     = 14   // thin axis px (constant regardless of radius)
    const ROT_SPEED   = Math.PI * 3.5   // rad/s
    const TRAIL_ALPHA = 0.38
    const now = Date.now()

    for (let i = this._bladestorms.length - 1; i >= 0; i--) {
      const b   = this._bladestorms[i]
      const age = now - b.born

      if (age >= b.duration) {
        b.container.destroy({ children: true })
        this._bladestorms.splice(i, 1)
        continue
      }

      const pos = b.getPos()
      if (!pos) {
        b.container.destroy({ children: true })
        this._bladestorms.splice(i, 1)
        continue
      }

      b.angle += dt * ROT_SPEED
      b.container.position.set(pos.x, pos.y)

      const alpha = age < 200
        ? age / 200
        : age > b.duration - 400
          ? (b.duration - age) / 400
          : 1.0

      const r = b.radius

      for (let j = 0; j < SWORD_COUNT; j++) {
        const sw = b.swords[j]
        const a  = b.angle + j * (2 * Math.PI / SWORD_COUNT)
        // Sword spans center → radius: position at midpoint, width = r fills the radial axis
        const sx = Math.cos(a) * r * 0.5
        const sy = Math.sin(a) * r * 0.5

        sw.history.push({ x: sx, y: sy, angle: a })
        if (sw.history.length > TRAIL_LEN) sw.history.shift()

        sw.sprite.position.set(sx, sy)
        sw.sprite.rotation = a
        sw.sprite.width    = r
        sw.sprite.height   = BLADE_H
        sw.sprite.alpha    = alpha

        for (let t = 0; t < TRAIL_LEN; t++) {
          const ts  = sw.trails[t]
          const idx = sw.history.length - 1 - t
          if (idx < 0) { ts.alpha = 0; continue }
          const h = sw.history[idx]
          ts.position.set(h.x, h.y)
          ts.rotation = h.angle
          ts.width    = r
          ts.height   = BLADE_H
          ts.alpha    = ((TRAIL_LEN - t) / TRAIL_LEN) * TRAIL_ALPHA * alpha
        }
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
    for (const b of this._bladestorms) b.container.destroy({ children: true })
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
