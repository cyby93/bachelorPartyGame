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

  /** Compress remaining cooldown time for all 4 skill slots (called when haste buffs land mid-cooldown). */
  compressPlayer(playerId, factor) {
    if (!factor || factor <= 1) return
    const now = Date.now()
    for (let i = 0; i < 4; i++) {
      const key = `${playerId}:${i}`
      const exp = this._cd.get(key)
      if (exp == null) continue
      const remaining = exp - now
      if (remaining > 0)
        this._cd.set(key, now + Math.round(remaining / factor))
    }
  }

  /** Move all cooldown entries from oldId to newId (called on reconnect). */
  transferPlayer(oldId, newId) {
    for (let i = 0; i < 4; i++) {
      const key = `${oldId}:${i}`
      const exp = this._cd.get(key)
      if (exp != null) {
        this._cd.set(`${newId}:${i}`, exp)
        this._cd.delete(key)
      }
    }
  }

  /**
   * Absolute expiry timestamps for all 4 skill slots.
   * Returns [expiresAt0, expiresAt1, expiresAt2, expiresAt3] — 0 means not on cooldown.
   * Client checks Date.now() < value to determine if skill is locked.
   */
  playerExpiresAt(playerId) {
    const now = Date.now()
    const result = [0, 0, 0, 0]
    for (let i = 0; i < 4; i++) {
      const exp = this._cd.get(`${playerId}:${i}`)
      result[i] = (exp != null && exp > now) ? exp : 0
    }
    return result
  }
}
