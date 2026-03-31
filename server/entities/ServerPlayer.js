import { GAME_CONFIG }            from '../../shared/GameConfig.js'
import { CLASSES, resolveClassName } from '../../shared/ClassConfig.js'
import { rebuildStats }            from '../systems/SkillSystem.js'

/**
 * ServerPlayer — authoritative player state.
 * Runs on the server only; the client receives serialised DTOs.
 */
export default class ServerPlayer {
  constructor(data) {
    this.id        = data.id
    this.name      = data.name
    this.className = data.className
    this.isHost    = data.isHost ?? false

    const classData  = CLASSES[this.className]
    this.maxHp       = classData.hp
    this.hp          = this.maxHp
    this.baseSpeed   = classData.speed   // px-units per frame at 60 FPS
    this.speed       = this.baseSpeed    // current (may be modified by effects)

    this.x     = data.x ?? GAME_CONFIG.CANVAS_WIDTH  / 2
    this.y     = data.y ?? GAME_CONFIG.CANVAS_HEIGHT / 2
    this.moveX = 0
    this.moveY = 0
    this.angle = 0

    this.isDead = false

    // Active timed effects
    this.activeEffects = []

    // Cast state (set by SkillSystem)
    this.activeCast   = null
    this.shieldActive = false
    this.shieldAngle  = 0          // radians — direction shield faces
    this.shieldArc    = 0          // radians — total arc width
    this.shieldSkillIndex = -1     // which skill slot holds the active shield

    // Derived stats (rebuilt by rebuildStats after every effect change)
    this.speedMult       = 1
    this.damageMult      = 1
    this.fireRateMult    = 1
    this.damageReduction = 0
    this.shieldAbsorb    = 0
    this.isRooted        = false
    this.isStunned       = false
    this.isInvisible     = false

    // Shadow values for delta detection
    this._prev = this._snapshot()
  }

  // ── Input ─────────────────────────────────────────────────────────────

  setMoveInput(x, y) {
    // Clamp and normalise to prevent cheating
    const len = Math.sqrt(x * x + y * y)
    if (len > 1) { x /= len; y /= len }
    this.moveX = x
    this.moveY = y
  }

  // ── Per-tick update ───────────────────────────────────────────────────

  update(dt) {
    if (this.isDead || this.isRooted || this.isStunned) return

    // Speed was originally tuned at 60 FPS (pixels per frame).
    // Multiply by 60 to convert to pixels-per-second, then scale by dt (seconds).
    const pps = this.speed * this.speedMult * 60
    this.x += this.moveX * pps * dt
    this.y += this.moveY * pps * dt

    // Boundary clamp
    const r = GAME_CONFIG.PLAYER_RADIUS
    this.x = Math.max(r, Math.min(GAME_CONFIG.CANVAS_WIDTH  - r, this.x))
    this.y = Math.max(r, Math.min(GAME_CONFIG.CANVAS_HEIGHT - r, this.y))

    // Facing direction
    if (this.moveX !== 0 || this.moveY !== 0) {
      this.angle = Math.atan2(this.moveY, this.moveX)
    }
  }

  // ── Combat ────────────────────────────────────────────────────────────

  /**
   * Apply damage, respecting shieldAbsorb.
   * @param {number} amount  Raw damage to apply
   * @param {number} minHp   HP floor — pass 1 to prevent death (e.g. lobby dummies)
   * @returns {number}  Actual HP damage dealt (0 if fully absorbed by shield)
   */
  takeDamage(amount, minHp = 0) {
    if (this.isDead) return 0
    let remaining = amount
    if (this.shieldAbsorb > 0) {
      const absorbed = Math.min(this.shieldAbsorb, remaining)
      this.shieldAbsorb -= absorbed
      remaining -= absorbed
      // Shield fully depleted — remove the effect immediately so the visual clears
      if (this.shieldAbsorb === 0) {
        this.activeEffects = this.activeEffects.filter(e => e.params?.shield == null)
      }
      if (remaining <= 0) return 0
    }
    const dealt = Math.round(remaining)
    this.hp = Math.max(minHp, this.hp - dealt)
    if (minHp === 0 && this.hp === 0) this.isDead = true
    return dealt
  }

  heal(amount) {
    if (this.isDead) return
    this.hp = Math.min(this.maxHp, this.hp + amount)
  }

  revive() {
    this.isDead = false
    this.hp     = Math.floor(this.maxHp * 0.4)
  }

  // ── Shield helpers ───────────────────────────────────────────────────

  /**
   * Returns true if an attack coming from (attackerX, attackerY) is blocked
   * by the player's active directional shield.
   */
  isShieldBlocking(attackerX, attackerY) {
    if (!this.shieldActive) return false
    const dx = attackerX - this.x
    const dy = attackerY - this.y
    const attackAngle = Math.atan2(dy, dx)
    let diff = Math.abs(attackAngle - this.shieldAngle)
    if (diff > Math.PI) diff = Math.PI * 2 - diff
    return diff <= this.shieldArc / 2
  }

  // ── Skill helpers ─────────────────────────────────────────────────────

  getSkillConfig(index) {
    return CLASSES[this.className]?.skills?.[index] ?? null
  }

  /** Rebuild derived stats — delegates to the shared helper. */
  rebuildStats() {
    rebuildStats(this)
  }

  // ── Serialisation ─────────────────────────────────────────────────────

  /** Full DTO — sent once on join. */
  toDTO() {
    return {
      id:        this.id,
      name:      this.name,
      className: this.className,
      isHost:    this.isHost,
      x:         Math.round(this.x),
      y:         Math.round(this.y),
      angle:     +this.angle.toFixed(3),
      hp:        Math.ceil(this.hp),
      maxHp:     this.maxHp,
      isDead:    this.isDead,
      speed:     this.speed,
    }
  }

  /**
   * Delta DTO — only includes fields that changed since last call.
   * Always includes `id` so the receiver knows which player to update.
   */
  toDeltaDTO() {
    const cur  = this._snapshot()
    const prev = this._prev
    const delta = { id: this.id, isDead: cur.isDead }

    if (cur.x      !== prev.x)      delta.x      = cur.x
    if (cur.y      !== prev.y)      delta.y      = cur.y
    if (cur.angle  !== prev.angle)  delta.angle  = cur.angle
    if (cur.hp     !== prev.hp)     delta.hp     = cur.hp

    // Visibility state change
    if (cur.isInvisible !== prev.isInvisible) delta.isInvisible = cur.isInvisible

    // Shield state
    if (cur.shieldActive !== prev.shieldActive) delta.shieldActive = cur.shieldActive
    if (cur.shieldActive) {
      delta.shieldAngle = cur.shieldAngle
      delta.shieldArc   = cur.shieldArc
    }

    // Cast progress (0-1), only if actively casting
    if (this.activeCast) {
      const elapsed = Date.now() - this.activeCast.startedAt
      delta.castProgress   = Math.min(1, elapsed / (this.activeCast.config.castTime ?? 1000))
      delta.isChanneling   = this.activeCast.config.type === 'CHANNEL'
      // Beam target for VFX
      if (this.activeCast.beamTargetId != null) {
        delta.beamTargetId = this.activeCast.beamTargetId
      }
    } else if (this._prev._wasCasting) {
      delta.castProgress = null   // explicitly clear — tells client to hide cast bar
      delta.isChanneling = false
      delta.beamTargetId = null   // clear beam
    }

    // Include compact effects summary when activeEffects changes
    const effectKeys = this.activeEffects.map(e => e.source)
    const prevEffectKeys = (this._prev._effectKeys ?? [])
    if (effectKeys.length !== prevEffectKeys.length || effectKeys.some((k, i) => k !== prevEffectKeys[i])) {
      delta.effects = this.activeEffects.map(e => ({ src: e.source, params: e.params }))
    }

    this._prev = cur
    this._prev._effectKeys = effectKeys
    this._prev._wasCasting = !!this.activeCast
    return delta
  }

  _snapshot() {
    return {
      x:           Math.round(this.x),
      y:           Math.round(this.y),
      angle:       +this.angle.toFixed(3),
      hp:          Math.ceil(this.hp),
      isDead:      this.isDead,
      isInvisible: this.isInvisible,
      shieldActive: this.shieldActive,
      shieldAngle: +this.shieldAngle.toFixed(3),
      shieldArc:   +this.shieldArc.toFixed(3),
    }
  }
}
