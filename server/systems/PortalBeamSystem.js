/**
 * server/systems/PortalBeamSystem.js
 * Portal Beam mechanic for Level 2 (The Siege).
 *
 * Every cycleMs:
 *  - Two random alive buildings are selected as beam endpoints.
 *  - A random mirror is chosen as the relay point.
 *  - A warningMs-long warning phase emits PORTAL_BEAM_WARNING to clients.
 *  - A damageMs-long damage phase emits PORTAL_BEAM_DAMAGE and hurts players
 *    inside either beam rectangle (building1→mirror, mirror→building2).
 *
 * Emit contract (for Thrall's renderer):
 *   PORTAL_BEAM_WARNING  { beamId, seg1: {x1,y1,x2,y2}, seg2: {x1,y1,x2,y2}, warningMs }
 *   PORTAL_BEAM_DAMAGE   { beamId, seg1: {x1,y1,x2,y2}, seg2: {x1,y1,x2,y2}, damageMs }
 *   PORTAL_BEAM_END      { beamId }
 */

import { GAME_CONFIG } from '../../shared/GameConfig.js'
import { EVENTS }      from '../../shared/protocol.js'

export default class PortalBeamSystem {
  /**
   * @param {object} config     – beamMechanic block from LevelConfig
   * @param {Array}  mirrors    – mirrors array: [{ id, position: { x, y } }]
   * @param {number} arenaWidth
   * @param {number} arenaHeight
   */
  constructor(config, mirrors, arenaWidth, arenaHeight) {
    this.config      = config
    this.mirrors     = mirrors ?? []
    this.arenaWidth  = arenaWidth
    this.arenaHeight = arenaHeight

    this._cycleMs    = config.cycleMs        ?? 10000
    this._warningMs  = config.warningMs      ?? 3000
    this._damageMs   = config.damageMs       ?? 2000
    this._dps        = config.damagePerSecond ?? 40
    this._beamWidth  = config.beamWidth      ?? 60

    this._lastCycleStart = Date.now()
    this._phase     = 'idle'   // 'idle' | 'warning' | 'active'
    this._beamSeq   = 0
    this._activeBeam = null    // { beamId, seg1, seg2, phaseStarted }
    this._lastDamageTick = 0
  }

  /**
   * Tick the portal beam system.
   * @param {number}    now       – Date.now()
   * @param {Map}       buildings – Map<id, ServerBuilding>
   * @param {Map}       players   – Map<id, ServerPlayer>
   * @param {function}  emitFn    – (event, data) => void
   * @param {function}  dealDmgFn – (player, amount) => void
   */
  tick(now, buildings, players, emitFn, dealDmgFn) {
    const elapsed = now - this._lastCycleStart

    if (this._phase === 'idle') {
      if (elapsed >= this._cycleMs) {
        this._startWarning(now, buildings, emitFn)
      }
      return
    }

    if (this._phase === 'warning') {
      const warnElapsed = now - this._activeBeam.phaseStarted
      if (warnElapsed >= this._warningMs) {
        this._startDamage(now, emitFn)
      }
      return
    }

    if (this._phase === 'active') {
      const activeElapsed = now - this._activeBeam.phaseStarted

      // Deal damage on each tick
      if (now - this._lastDamageTick >= 100) {   // 10 damage ticks/sec
        this._lastDamageTick = now
        const dtFraction = 0.1   // 100ms / 1000ms
        const dmgThisTick = Math.round(this._dps * dtFraction)
        if (dmgThisTick > 0) {
          this._hitPlayers(players, dmgThisTick, dealDmgFn)
        }
      }

      if (activeElapsed >= this._damageMs) {
        emitFn(EVENTS.PORTAL_BEAM_END, { beamId: this._activeBeam.beamId })
        this._phase          = 'idle'
        this._activeBeam     = null
        this._lastCycleStart = now
      }
    }
  }

  _startWarning(now, buildings, emitFn) {
    // Collect alive buildings
    const alive = []
    buildings.forEach(b => { if (!b.isDead) alive.push(b) })
    if (alive.length < 2 || this.mirrors.length === 0) {
      // Not enough targets — reset timer and skip
      this._lastCycleStart = now
      return
    }

    // Pick two distinct random buildings
    const shuffle = [...alive]
    for (let i = shuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffle[i], shuffle[j]] = [shuffle[j], shuffle[i]]
    }
    const b1 = shuffle[0]
    const b2 = shuffle[1]

    // Pick a random mirror
    const mirror = this.mirrors[Math.floor(Math.random() * this.mirrors.length)]
    const mx = mirror.position.x
    const my = mirror.position.y

    // Building center positions
    const b1cx = b1.x + (b1.width  ?? 60) / 2
    const b1cy = b1.y + (b1.height ?? 60) / 2
    const b2cx = b2.x + (b2.width  ?? 60) / 2
    const b2cy = b2.y + (b2.height ?? 60) / 2

    const beamId = ++this._beamSeq
    const seg1 = { x1: b1cx, y1: b1cy, x2: mx, y2: my }
    const seg2 = { x1: mx,   y1: my,   x2: b2cx, y2: b2cy }

    this._activeBeam = { beamId, seg1, seg2, phaseStarted: now }
    this._phase = 'warning'

    emitFn(EVENTS.PORTAL_BEAM_WARNING, { beamId, seg1, seg2, warningMs: this._warningMs })
  }

  _startDamage(now, emitFn) {
    this._activeBeam.phaseStarted = now
    this._lastDamageTick = now
    this._phase = 'active'

    emitFn(EVENTS.PORTAL_BEAM_DAMAGE, {
      beamId:   this._activeBeam.beamId,
      seg1:     this._activeBeam.seg1,
      seg2:     this._activeBeam.seg2,
      damageMs: this._damageMs,
    })
  }

  _hitPlayers(players, dmg, dealDmgFn) {
    if (!this._activeBeam) return
    const { seg1, seg2 } = this._activeBeam
    const hw = this._beamWidth / 2

    players.forEach(p => {
      if (p.isDead || p.isHost) return
      if (this._pointNearSegment(p.x, p.y, seg1.x1, seg1.y1, seg1.x2, seg1.y2, hw) ||
          this._pointNearSegment(p.x, p.y, seg2.x1, seg2.y1, seg2.x2, seg2.y2, hw)) {
        dealDmgFn(p, dmg)
      }
    })
  }

  /**
   * Returns true if point (px, py) is within `halfWidth` of the line segment
   * from (x1, y1) to (x2, y2).
   */
  _pointNearSegment(px, py, x1, y1, x2, y2, halfWidth) {
    const dx = x2 - x1
    const dy = y2 - y1
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.hypot(px - x1, py - y1) <= halfWidth

    // Project point onto segment
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq))
    const closestX = x1 + t * dx
    const closestY = y1 + t * dy
    return Math.hypot(px - closestX, py - closestY) <= halfWidth
  }
}
