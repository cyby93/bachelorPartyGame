import { GAME_CONFIG } from '../../shared/GameConfig.js'

const WALK_IN_FORMATION = [
  { xOffset:    0, yOffset:    0 },   // slot 0 — front/lead
  { xOffset:  -40, yOffset:  -50 },
  { xOffset:  -40, yOffset:   50 },
  { xOffset:  -80, yOffset: -100 },
  { xOffset:  -80, yOffset:  100 },
  { xOffset:  -80, yOffset:    0 },
  { xOffset: -120, yOffset: -150 },
  { xOffset: -120, yOffset:  150 },
  { xOffset: -120, yOffset:  -60 },
  { xOffset: -120, yOffset:   60 },
  { xOffset: -160, yOffset: -200 },
  { xOffset: -160, yOffset:  200 },
  { xOffset: -160, yOffset:    0 },   // slot 12 — rear center
]

const WALK_IN_SPAWN_X       = -60
const WALK_IN_ENTRY_X_RATIO = 0.15

/**
 * Drives scripted player movement over a fixed duration.
 * Used for the level walk-in (players enter from the left) and
 * walk-out (players exit to the right on level victory).
 *
 * tick() must be called AFTER p.update(dt) and wall collision resolution
 * each game tick, so that the cinematic positions overwrite boundary clamping.
 */
export default class CinematicMovementSystem {
  /**
   * @param {object}   opts
   * @param {Array}    opts.targets     — [{ player, startX, startY, targetX, targetY }]
   * @param {number}   opts.durationMs  — total movement duration in ms
   * @param {Function} opts.onComplete  — called once movement finishes
   */
  constructor({ targets, durationMs, onComplete }) {
    this._slots      = targets
    this._durationMs = durationMs
    this._elapsed    = 0
    this._active     = true
    this._onComplete = onComplete ?? (() => {})
  }

  /**
   * Builds walk-in targets and sets spawn positions on each player.
   * Players are placed at x = WALK_IN_SPAWN_X (off-screen left) with formation Y offsets.
   *
   * @param {Map}    players
   * @param {number} arenaWidth
   * @param {number} arenaHeight
   * @returns {Array} targets for the CinematicMovementSystem constructor
   */
  static buildWalkInTargets(players, arenaWidth, arenaHeight) {
    const entryX  = arenaWidth * WALK_IN_ENTRY_X_RATIO
    const centerY = arenaHeight / 2
    const pad     = GAME_CONFIG.PLAYER_RADIUS + 10

    const targets = []
    let slotIndex = 0

    for (const p of players.values()) {
      if (p.isHost) continue

      const slot    = WALK_IN_FORMATION[Math.min(slotIndex, WALK_IN_FORMATION.length - 1)]
      const targetX = entryX + slot.xOffset
      const targetY = Math.max(pad, Math.min(arenaHeight - pad, centerY + slot.yOffset))

      // Place player off-screen at formation Y — this is their visual spawn position
      p.x = WALK_IN_SPAWN_X
      p.y = targetY

      targets.push({ player: p, startX: WALK_IN_SPAWN_X, startY: targetY, targetX, targetY, facingAngle: 0 })
      slotIndex++
    }

    return targets
  }

  /**
   * Builds walk-out targets from current player positions.
   * Dead players are excluded — they remain on the ground.
   *
   * @param {Map}    players
   * @param {number} arenaWidth
   * @returns {Array} targets for the CinematicMovementSystem constructor
   */
  static buildWalkOutTargets(players, arenaWidth) {
    const exitX   = arenaWidth + 60
    const targets = []

    for (const p of players.values()) {
      if (p.isHost || p.isDead) continue
      targets.push({ player: p, startX: p.x, startY: p.y, targetX: exitX, targetY: p.y, facingAngle: 0 })
    }

    return targets
  }

  /** Advance movement. dt is in seconds. */
  tick(dt) {
    if (!this._active) return
    this._elapsed += dt * 1000
    const t = Math.min(this._elapsed / this._durationMs, 1)

    for (const slot of this._slots) {
      slot.player.x        = slot.startX + (slot.targetX - slot.startX) * t
      slot.player.y        = slot.startY + (slot.targetY - slot.startY) * t
      slot.player.angle    = slot.facingAngle
      slot.player.isAiming = false
    }

    if (t >= 1) {
      this._active = false
      this._onComplete()
    }
  }

  /** True while the movement is still in progress. */
  isActive() { return this._active }

  /** Cancel immediately and snap all players to their target positions. */
  destroy() {
    this._active = false
    for (const slot of this._slots) {
      slot.player.x = slot.targetX
      slot.player.y = slot.targetY
    }
  }
}
