/**
 * server/systems/PortalBeamSystem.js
 * Portal Beam mechanic for Level 2 (The Siege).
 *
 * Every cycleMs:
 *  - Two random alive buildings are selected as beam endpoints.
 *  - Two random mirrors are chosen as relay points.
 *  - A warningMs-long warning phase emits PORTAL_BEAM_WARNING to clients.
 *  - A damageMs-long damage phase emits PORTAL_BEAM_DAMAGE and hurts players
 *    inside any beam rectangle along the routed path.
 *
 * Emit contract (for Thrall's renderer):
 *   PORTAL_BEAM_WARNING  { beamId, points: [{x,y}], warningMs }
 *   PORTAL_BEAM_DAMAGE   { beamId, points: [{x,y}], damageMs }
 *   PORTAL_BEAM_END      { beamId }
 */

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
    this._activeBeam = null    // { beamId, points, segments, phaseStarted }
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
    if (alive.length === 0 || this.mirrors.length < 2) {
      // Not enough targets — reset timer and skip
      this._lastCycleStart = now
      return
    }

    // Pick two distinct random mirrors
    const mirrorPool = [...this.mirrors]
    for (let i = mirrorPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[mirrorPool[i], mirrorPool[j]] = [mirrorPool[j], mirrorPool[i]]
    }
    const mirrorA = mirrorPool[0]
    const mirrorB = mirrorPool[1]

    // Determine anchor endpoints: two buildings when available, else building + mirror
    let anchor1, anchor2
    if (alive.length >= 2) {
      const shuffle = [...alive]
      for (let i = shuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffle[i], shuffle[j]] = [shuffle[j], shuffle[i]]
      }
      const b1 = shuffle[0]
      const b2 = shuffle[1]
      anchor1 = { x: b1.x + (b1.width ?? 60) / 2, y: b1.y + (b1.height ?? 60) / 2 }
      anchor2 = { x: b2.x + (b2.width ?? 60) / 2, y: b2.y + (b2.height ?? 60) / 2 }
    } else {
      // Only 1 building left — use the remaining mirror (mirrorPool[2]) as second anchor
      const b1 = alive[0]
      anchor1 = { x: b1.x + (b1.width ?? 60) / 2, y: b1.y + (b1.height ?? 60) / 2 }
      anchor2 = { x: mirrorPool[2]?.position.x ?? mirrorA.position.x, y: mirrorPool[2]?.position.y ?? mirrorA.position.y }
    }

    const beamId = ++this._beamSeq
    const points = [
      anchor1,
      { x: mirrorA.position.x, y: mirrorA.position.y },
      { x: mirrorB.position.x, y: mirrorB.position.y },
      anchor2,
    ]
    const segments = []
    for (let i = 0; i < points.length - 1; i++) {
      segments.push({
        x1: points[i].x,
        y1: points[i].y,
        x2: points[i + 1].x,
        y2: points[i + 1].y,
      })
    }

    this._activeBeam = { beamId, points, segments, phaseStarted: now }
    this._phase = 'warning'

    emitFn(EVENTS.PORTAL_BEAM_WARNING, { beamId, points, warningMs: this._warningMs })
  }

  _startDamage(now, emitFn) {
    this._activeBeam.phaseStarted = now
    this._lastDamageTick = now
    this._phase = 'active'

    emitFn(EVENTS.PORTAL_BEAM_DAMAGE, {
      beamId:   this._activeBeam.beamId,
      points:   this._activeBeam.points,
      damageMs: this._damageMs,
    })
  }

  _hitPlayers(players, dmg, dealDmgFn) {
    if (!this._activeBeam) return
    const { segments } = this._activeBeam
    const hw = this._beamWidth / 2

    players.forEach(p => {
      if (p.isDead || p.isHost) return
      if (segments.some(seg => this._pointNearSegment(p.x, p.y, seg.x1, seg.y1, seg.x2, seg.y2, hw))) {
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
