/**
 * server/systems/BoulderSystem.js
 * Boulder rolling mechanic for Level 3 (The Black Temple Gates).
 *
 * Cycle (16s): rest 10s → spawn + charge 4s → roll 2s → rest …
 * Starts on rest so players have 10s before the first wave.
 *
 * Column grid per room is computed from (xStart, xEnd, columnWidth).
 * Right-room columns are locked until onGate1Destroyed() is called.
 *
 * Emit contract (for Thrall's client BoulderSystem):
 *   BOULDER_SPAWN  { boulders: [{id, roomId, columnX, y, direction, radius}], chargingMs }
 *   BOULDER_ROLL   { boulders: [{id, columnX, y, direction}] }
 *   BOULDER_CLEAR  { reason: 'cycle'|'gate1_death' }
 *   BOULDER_HIT    { boulderIds: [id], playerId }
 *
 * STATE_DELTA key: boulders → getBouldersDTO()
 */

import { EVENTS } from '../../shared/protocol.js'

export default class BoulderSystem {
  constructor(config, arenaHeight) {
    this._config      = config
    this._arenaHeight = arenaHeight

    this._chargingMs    = config.chargingMs    // 4000
    this._rollingMs     = config.rollingMs     // 2000
    this._restMs        = config.restMs        // 10000
    this._damage        = config.damage        // 80
    this._slowMult      = config.slowMultiplier  // 0.5
    this._slowMs        = config.slowDurationMs  // 4000
    this._boulderRadius = config.boulderRadius   // 28
    this._columnWidth   = config.columnWidth     // 60
    this._rooms         = config.rooms

    this._boulders    = []
    this._boulderSeq  = 0
    this._gate1Dead   = false

    this._phase        = 'rest'
    this._phaseStarted = Date.now()

    this._roomColumns  = this._buildColumnGrids()
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Called by GameServer._updateGates() the moment gate1 hp reaches 0. */
  onGate1Destroyed(emitFn) {
    this._gate1Dead = true
    if (this._boulders.length > 0) {
      this._boulders = []
      emitFn(EVENTS.BOULDER_CLEAR, { reason: 'gate1_death' })
    }
    this._phase        = 'rest'
    this._phaseStarted = Date.now()
  }

  /** Serialized snapshot included in STATE_DELTA and full-state INIT. */
  getBouldersDTO() {
    return this._boulders.map(b => ({
      id:             b.id,
      roomId:         b.roomId,
      columnX:        b.columnX,
      state:          b.state,
      chargeProgress: b.chargeProgress,
      y:              Math.round(b.y),
      direction:      b.direction,
      radius:         this._boulderRadius,
    }))
  }

  tick(now, players, emitFn, dealDmgFn, applySlowFn) {
    const elapsed = now - this._phaseStarted

    if (this._phase === 'rest') {
      if (elapsed >= this._restMs) this._startCharging(now, emitFn)
      return
    }

    if (this._phase === 'charging') {
      const progress = Math.min(1, elapsed / this._chargingMs)
      for (const b of this._boulders) b.chargeProgress = progress
      if (elapsed >= this._chargingMs) this._startRolling(now, emitFn)
      return
    }

    if (this._phase === 'rolling') {
      const speed = this._arenaHeight / this._rollingMs  // px/ms
      for (const b of this._boulders) {
        b.y = b.startY + b.direction * speed * elapsed
        this._checkHits(b, players, emitFn, dealDmgFn, applySlowFn, now)
      }
      if (elapsed >= this._rollingMs) this._endRolling(now, emitFn)
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _buildColumnGrids() {
    const grids = {}
    for (const room of this._rooms) {
      const width  = room.xEnd - room.xStart
      const count  = Math.floor(width / this._columnWidth)
      const margin = (width - count * this._columnWidth) / 2
      const centers = []
      for (let i = 0; i < count; i++) {
        centers.push(room.xStart + margin + i * this._columnWidth + this._columnWidth / 2)
      }
      grids[room.roomId] = {
        centers,
        count,
        boulderCount: Math.floor(count / 2),
      }
    }
    return grids
  }

  _startCharging(now, emitFn) {
    this._boulders = []
    const eligible = this._rooms.filter(r => !r.requiresGate1Dead || this._gate1Dead)

    for (const room of eligible) {
      const grid    = this._roomColumns[room.roomId]
      const picked  = this._pickColumns(grid.count, grid.boulderCount)
      const dirs    = this._balancedDirections(picked.length)

      for (let i = 0; i < picked.length; i++) {
        const direction = dirs[i]
        const startY    = direction === 1
          ? -this._boulderRadius
          : this._arenaHeight + this._boulderRadius

        this._boulders.push({
          id:             `boulder_${++this._boulderSeq}`,
          roomId:         room.roomId,
          columnX:        grid.centers[picked[i]],
          state:          'charging',
          chargeProgress: 0,
          y:              startY,
          startY,
          direction,
          _hitPlayers:    new Set(),
        })
      }
    }

    this._phase        = 'charging'
    this._phaseStarted = now

    emitFn(EVENTS.BOULDER_SPAWN, {
      boulders:   this._boulders.map(b => ({
        id: b.id, roomId: b.roomId, columnX: b.columnX,
        y: b.y, direction: b.direction, radius: this._boulderRadius,
      })),
      chargingMs: this._chargingMs,
    })
  }

  _startRolling(now, emitFn) {
    for (const b of this._boulders) {
      b.state          = 'rolling'
      b.chargeProgress = 1
    }
    this._phase        = 'rolling'
    this._phaseStarted = now

    emitFn(EVENTS.BOULDER_ROLL, {
      boulders: this._boulders.map(b => ({ id: b.id, columnX: b.columnX, y: b.y, direction: b.direction })),
    })
  }

  _endRolling(now, emitFn) {
    this._boulders     = []
    this._phase        = 'rest'
    this._phaseStarted = now
    emitFn(EVENTS.BOULDER_CLEAR, { reason: 'cycle' })
  }

  _checkHits(boulder, players, emitFn, dealDmgFn, applySlowFn, now) {
    players.forEach(player => {
      if (player.isDowned || player.isHost) return
      if (boulder._hitPlayers.has(player.id)) return
      const dist = Math.hypot(player.x - boulder.columnX, player.y - boulder.y)
      if (dist <= this._boulderRadius + (player.radius ?? 20)) {
        boulder._hitPlayers.add(player.id)
        dealDmgFn(player, this._damage)
        applySlowFn(player, this._slowMult, this._slowMs)
        emitFn(EVENTS.BOULDER_HIT, { boulderIds: [boulder.id], playerId: player.id })
      }
    })
  }

  /**
   * Pick boulderCount column indices from 0..columnCount-1.
   * Constraint: no 3 consecutive chosen indices.
   */
  _pickColumns(columnCount, boulderCount) {
    const indices = Array.from({ length: columnCount }, (_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }

    const chosen = new Set()
    for (const idx of indices) {
      if (chosen.size >= boulderCount) break
      const has = n => chosen.has(n)
      const wouldTriple =
        (has(idx - 1) && has(idx - 2)) ||
        (has(idx - 1) && has(idx + 1)) ||
        (has(idx + 1) && has(idx + 2))
      if (!wouldTriple) chosen.add(idx)
    }

    if (chosen.size < boulderCount) return this._pickColumns(columnCount, boulderCount)
    return [...chosen].sort((a, b) => a - b)
  }

  /** Returns a shuffled direction array balanced half top (+1) / half bottom (-1). */
  _balancedDirections(count) {
    const half = Math.floor(count / 2)
    const dirs = []
    for (let i = 0; i < half; i++) dirs.push(1)
    for (let i = half; i < count; i++) dirs.push(-1)
    if (count % 2 === 1) dirs[0] = Math.random() < 0.5 ? 1 : -1
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[dirs[i], dirs[j]] = [dirs[j], dirs[i]]
    }
    return dirs
  }
}
