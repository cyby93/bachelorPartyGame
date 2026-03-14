/**
 * server/systems/CooldownSystem.js
 * Single source of truth for all skill cooldowns.
 * Lives exclusively on the server — controllers receive broadcast updates.
 */
export default class CooldownSystem {
  constructor() {
    // Key: `${playerId}:${skillIndex}` → expiry timestamp (ms)
    this._cd = new Map()
  }

  /** Start a cooldown for a player's skill. */
  start(playerId, skillIndex, durationMs) {
    this._cd.set(`${playerId}:${skillIndex}`, Date.now() + durationMs)
  }

  /** Returns true if the skill is currently on cooldown. */
  isOnCooldown(playerId, skillIndex) {
    const exp = this._cd.get(`${playerId}:${skillIndex}`)
    return exp != null && Date.now() < exp
  }

  /** Remaining cooldown in ms (0 if ready). */
  remaining(playerId, skillIndex) {
    const exp = this._cd.get(`${playerId}:${skillIndex}`)
    return exp == null ? 0 : Math.max(0, exp - Date.now())
  }

  /**
   * Snapshot of all 4 skill cooldown remaining times for one player.
   * Returned as { 0: ms, 1: ms, 2: ms, 3: ms }
   */
  playerSnapshot(playerId) {
    const result = {}
    for (let i = 0; i < 4; i++) {
      result[i] = this.remaining(playerId, i)
    }
    return result
  }

  /** Remove all cooldowns for a player (e.g. on death / class change). */
  clearPlayer(playerId) {
    for (let i = 0; i < 4; i++) {
      this._cd.delete(`${playerId}:${i}`)
    }
  }
}
