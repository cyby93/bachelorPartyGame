/**
 * server/systems/ClosingCinematicSystem.js
 *
 * Post-boss cinematic for Level 6 (Illidan defeated).
 * Replaces the normal _onLevelComplete() flow with an 8-stage scripted sequence.
 *
 * Stages: gather → items_visible → key_use → bride_walk_out → ring_wait
 *         → ring_moment → dancing → complete
 *
 * Single-player condensed path: gather → dancing (interactive item/bride phases skipped).
 *
 * tick(dt, now) must be called by GameServer every server tick.
 * Call destroy() on scene teardown.
 */

import { EVENTS } from '../../shared/protocol.js'
import CinematicMovementSystem from './CinematicMovementSystem.js'

const STAGE = Object.freeze({
  GATHER:          'gather',
  ITEMS_VISIBLE:   'items_visible',
  KEY_USE:         'key_use',
  BRIDE_WALK_OUT:  'bride_walk_out',
  RING_WAIT:       'ring_wait',
  RING_MOMENT:     'ring_moment',
  DANCING:         'dancing',
  COMPLETE:        'complete',
})

export default class ClosingCinematicSystem {
  constructor({ io, players, boss, arenaWidth, arenaHeight, config, onComplete }) {
    this.io          = io
    this.players     = players
    this.boss        = boss
    this.arenaWidth  = arenaWidth
    this.arenaHeight = arenaHeight
    this.config      = config
    this._onComplete = onComplete

    this._stage              = STAGE.GATHER
    this._pickups            = []
    this._pickupIdSeq        = 0
    this._bride              = null
    this._danceElapsed       = 0
    this._dancingPlayerIds   = new Set()
    this._gatherStartedAt    = Date.now()
    this._ringHolderPlayerId = null
    this._guidanceTarget     = null
    this._guidanceHolderId   = null
    this._cinematicMovement  = null

    // Pending timeouts — tracked for destroy()
    this._gatherTimeout      = null
    this._brideTimeout       = null
    this._ringTimeout        = null
    this._danceStartTimeout  = null

    // Count non-host players
    let playerCount = 0
    this.players.forEach(p => { if (!p.isHost) playerCount++ })
    this._isSinglePlayer = playerCount === 1

    // Resolve ring holder by normalised name (null = unconstrained)
    if (config.ringHolderName) {
      const nameNorm = config.ringHolderName.toLowerCase()
      this.players.forEach(p => {
        if (!p.isHost && p.name.toLowerCase() === nameNorm) {
          this._ringHolderPlayerId = p.id
        }
      })
    }

    // Init cinematic state on players
    this.players.forEach(p => {
      if (p.isHost) return
      p.isDancing = false
      p.heldItem  = null
    })

    this.io.emit(EVENTS.ILLIDAN_CLOSING_CINEMATIC_START, {
      bossX:        Math.round(boss.x),
      bossY:        Math.round(boss.y),
      gatherRadius: config.gatherRadius,
    })

    this._startGatherMovement()
    this._gatherTimeout = setTimeout(() => this._advanceFromGather(), config.gatherDurationMs)
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  tick(dt, now) {
    if (this._cinematicMovement?.isActive()) this._cinematicMovement.tick(dt)

    switch (this._stage) {
      case STAGE.ITEMS_VISIBLE: this._tickPickups();      break
      case STAGE.KEY_USE:       this._tickKeyUse();       break
      case STAGE.RING_WAIT:     this._tickRingWait();     break
      case STAGE.DANCING:       this._tickDancing(dt);    break
    }
  }

  getDTO() {
    return {
      stage:            this._stage,
      gatherStartedAt:  this._gatherStartedAt,
      pickups:          this._pickups.map(p => ({
        id:         p.id,
        type:       p.type,
        x:          p.x,
        y:          p.y,
        isPickedUp: p.isPickedUp,
        pickedUpBy: p.holderId ?? null,
      })),
      bride:            this._bride ? this._getBrideDTO() : null,
      dancingPlayerIds: [...this._dancingPlayerIds],
      guidanceTarget:   this._guidanceTarget,
      guidanceHolderId: this._guidanceHolderId,
    }
  }

  destroy() {
    if (this._gatherTimeout)     clearTimeout(this._gatherTimeout)
    if (this._brideTimeout)      clearTimeout(this._brideTimeout)
    if (this._ringTimeout)       clearTimeout(this._ringTimeout)
    if (this._danceStartTimeout) clearTimeout(this._danceStartTimeout)
    this._cinematicMovement?.destroy()
    this.players.forEach(p => {
      if (p.isHost) return
      p.isDancing = false
      p.heldItem  = null
    })
  }

  // ── Gather phase ─────────────────────────────────────────────────────────────

  _startGatherMovement() {
    const living = []
    this.players.forEach(p => { if (!p.isHost) living.push(p) })
    if (!living.length) return

    const gatherR = this.config.gatherRadius * 0.6
    const targets = living.map((p, i) => {
      const angle = (i / living.length) * Math.PI * 2
      const tx = Math.max(50, Math.min(this.arenaWidth  - 50, this.boss.x + Math.cos(angle) * gatherR))
      const ty = Math.max(50, Math.min(this.arenaHeight - 50, this.boss.y + Math.sin(angle) * gatherR))
      return {
        player:      p,
        startX:      p.x,
        startY:      p.y,
        targetX:     tx,
        targetY:     ty,
        facingAngle: Math.atan2(this.boss.y - p.y, this.boss.x - p.x),
      }
    })

    this._cinematicMovement = new CinematicMovementSystem({
      targets,
      durationMs:  this.config.gatherDurationMs,
      onComplete:  () => {},
    })
  }

  _advanceFromGather() {
    this._gatherTimeout = null
    if (this._stage !== STAGE.GATHER) return
    this._cinematicMovement = null

    this._stage = STAGE.ITEMS_VISIBLE

    const bx = this.boss.x
    const by = this.boss.y
    const rd = this.config.itemDropOffsets.ring
    const kd = this.config.itemDropOffsets.key

    this._pickups = [
      { id: ++this._pickupIdSeq, type: 'ring', x: Math.round(bx + rd.x), y: Math.round(by + rd.y), isPickedUp: false, holderId: null },
      { id: ++this._pickupIdSeq, type: 'key',  x: Math.round(bx + kd.x), y: Math.round(by + kd.y), isPickedUp: false, holderId: null },
    ]

    const cell = this.config.cellPosition
    this.io.emit(EVENTS.CLOSING_CELL_SPAWN, {
      x: cell.x, y: cell.y,
      width:  this.config.cellSize.width,
      height: this.config.cellSize.height,
    })

    this.io.emit(EVENTS.CLOSING_ITEMS_SPAWNED, {
      items: this._pickups.map(p => ({ id: p.id, type: p.type, x: p.x, y: p.y })),
    })
  }

  // ── Items pickup phase ───────────────────────────────────────────────────────

  _tickPickups() {
    for (const pickup of this._pickups) {
      if (pickup.isPickedUp) continue
      this.players.forEach(p => {
        if (p.isHost || pickup.isPickedUp) return
        if (Math.hypot(p.x - pickup.x, p.y - pickup.y) > this.config.pickupRadius) return
        if (pickup.type === 'ring' && this._ringHolderPlayerId !== null && p.id !== this._ringHolderPlayerId) return

        pickup.isPickedUp = true
        pickup.holderId   = p.id
        p.heldItem        = pickup.type

        this.io.emit(EVENTS.CLOSING_ITEM_PICKUP, { itemId: pickup.id, playerId: p.id, itemType: pickup.type })
      })
    }

    if (this._pickups.every(p => p.isPickedUp)) this._advanceToKeyUse()
  }

  // ── Key use phase ────────────────────────────────────────────────────────────

  _advanceToKeyUse() {
    this._stage             = STAGE.KEY_USE
    const keyPickup         = this._pickups.find(p => p.type === 'key')
    this._guidanceHolderId  = keyPickup?.holderId ?? null
    this._guidanceTarget    = { x: this.config.cellPosition.x, y: this.config.cellPosition.y }
  }

  _tickKeyUse() {
    const keyPickup = this._pickups.find(p => p.type === 'key')
    if (!keyPickup?.holderId) return
    const holder = this.players.get(keyPickup.holderId)
    if (!holder) return
    const cell = this.config.cellPosition
    if (Math.hypot(holder.x - cell.x, holder.y - cell.y) <= this.config.cellTriggerRadius) {
      this._advanceToBrideWalkOut(keyPickup.holderId)
    }
  }

  // ── Bride walk-out phase ─────────────────────────────────────────────────────

  _advanceToBrideWalkOut(keyHolderId) {
    this._stage            = STAGE.BRIDE_WALK_OUT
    this._guidanceTarget   = null
    this._guidanceHolderId = null

    const cell = this.config.cellPosition
    const exit = this.config.brideExitPosition
    const now  = Date.now()

    this.io.emit(EVENTS.CLOSING_CELL_OPEN, { keyHolderId })

    this._bride = {
      startX:       cell.x,
      startY:       cell.y,
      x:            cell.x,
      y:            cell.y,
      targetX:      exit.x,
      targetY:      exit.y,
      walkStartMs:  now,
      walkDurationMs: this.config.brideWalkDurationMs,
      state:        'walking',
    }

    this.io.emit(EVENTS.CLOSING_BRIDE_WALK_OUT, {
      startX:    cell.x,
      startY:    cell.y,
      targetX:   exit.x,
      targetY:   exit.y,
      durationMs: this.config.brideWalkDurationMs,
    })

    this._brideTimeout = setTimeout(() => this._advanceToRingWait(), this.config.brideWalkDurationMs)
  }

  // ── Ring wait phase ──────────────────────────────────────────────────────────

  _advanceToRingWait() {
    this._brideTimeout = null
    if (this._stage !== STAGE.BRIDE_WALK_OUT) return
    this._stage = STAGE.RING_WAIT

    if (this._bride) {
      this._bride.state = 'waiting'
      this._bride.x     = this.config.brideExitPosition.x
      this._bride.y     = this.config.brideExitPosition.y
    }

    const ringPickup        = this._pickups.find(p => p.type === 'ring')
    this._guidanceHolderId  = ringPickup?.holderId ?? null
    this._guidanceTarget    = { x: this.config.brideExitPosition.x, y: this.config.brideExitPosition.y }
  }

  _tickRingWait() {
    const ringPickup = this._pickups.find(p => p.type === 'ring')
    if (!ringPickup?.holderId) return
    const holder = this.players.get(ringPickup.holderId)
    if (!holder) return
    const bride = this.config.brideExitPosition
    if (Math.hypot(holder.x - bride.x, holder.y - bride.y) <= this.config.ringTriggerRadius) {
      this._advanceToRingMoment(ringPickup.holderId)
    }
  }

  // ── Ring moment phase ────────────────────────────────────────────────────────

  _advanceToRingMoment(ringHolderId) {
    this._stage            = STAGE.RING_MOMENT
    this._guidanceTarget   = null
    this._guidanceHolderId = null

    if (this._bride) this._bride.state = 'ceremony'

    this.io.emit(EVENTS.CLOSING_RING_MOMENT, {
      ringHolderId,
      brideX: this.config.brideExitPosition.x,
      brideY: this.config.brideExitPosition.y,
    })

    this._ringTimeout = setTimeout(() => {
      this._ringTimeout = null

      const holder = this.players.get(ringHolderId)
      if (holder) {
        holder.isDancing = true
        holder.angle     = Math.PI / 2
        this._dancingPlayerIds.add(ringHolderId)
      }
      if (this._bride) this._bride.state = 'dancing'

      this.io.emit(EVENTS.CLOSING_DANCE_START, { playerIds: [ringHolderId] })

      this._danceStartTimeout = setTimeout(() => {
        this._danceStartTimeout = null
        this._startDanceAll()
      }, this.config.allDanceTriggerDelayMs)
    }, this.config.ringMomentDurationMs)
  }

  // ── Dance phase ──────────────────────────────────────────────────────────────

  _startDanceAll() {
    this._stage = STAGE.DANCING

    const allIds = []
    this.players.forEach(p => {
      if (p.isHost) return
      p.isDancing = true
      p.angle     = Math.PI / 2
      this._dancingPlayerIds.add(p.id)
      allIds.push(p.id)
    })

    this.io.emit(EVENTS.CLOSING_ALL_DANCE, { playerIds: allIds })
  }

  _tickDancing(dt) {
    let allDancing = true
    this.players.forEach(p => { if (!p.isHost && !p.isDancing) allDancing = false })

    if (allDancing) {
      this._danceElapsed += dt * 1000
      if (this._danceElapsed >= this.config.danceCompleteDurationMs) {
        this._stage = STAGE.COMPLETE
        this._onComplete()
      }
    }
  }

  // ── DTO helpers ──────────────────────────────────────────────────────────────

  _getBrideDTO() {
    const bride = this._bride
    const now   = Date.now()

    let x = bride.x
    let y = bride.y

    if (bride.state === 'walking') {
      const raw  = (now - bride.walkStartMs) / bride.walkDurationMs
      const t    = Math.min(1, raw)
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      x = bride.startX + (bride.targetX - bride.startX) * ease
      y = bride.startY + (bride.targetY - bride.startY) * ease
    }

    return { x: Math.round(x), y: Math.round(y), state: bride.state }
  }
}
