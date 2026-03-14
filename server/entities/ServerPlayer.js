import { GAME_CONFIG }            from '../../shared/GameConfig.js'
import { CLASSES, resolveClassName } from '../../shared/ClassConfig.js'

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

    // Active timed effects  (Phase 4)
    this.activeEffects = []

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
    if (this.isDead) return

    // Speed was originally tuned at 60 FPS (pixels per frame).
    // Multiply by 60 to convert to pixels-per-second, then scale by dt (seconds).
    const pps = this.speed * 60
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

  takeDamage(amount) {
    if (this.isDead) return
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp === 0) this.isDead = true
  }

  heal(amount) {
    if (this.isDead) return
    this.hp = Math.min(this.maxHp, this.hp + amount)
  }

  revive() {
    this.isDead = false
    this.hp     = Math.floor(this.maxHp * 0.4)
  }

  // ── Skill helpers ─────────────────────────────────────────────────────

  getSkillConfig(index) {
    return CLASSES[this.className]?.skills?.[index] ?? null
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
    const delta = { id: this.id }

    if (cur.x      !== prev.x)      delta.x      = cur.x
    if (cur.y      !== prev.y)      delta.y      = cur.y
    if (cur.angle  !== prev.angle)  delta.angle  = cur.angle
    if (cur.hp     !== prev.hp)     delta.hp     = cur.hp
    if (cur.isDead !== prev.isDead) delta.isDead = cur.isDead

    this._prev = cur
    return delta
  }

  _snapshot() {
    return {
      x:      Math.round(this.x),
      y:      Math.round(this.y),
      angle:  +this.angle.toFixed(3),
      hp:     Math.ceil(this.hp),
      isDead: this.isDead,
    }
  }
}
