/**
 * server/entities/TrainingDummy.js
 * Training dummies for the lobby practice area.
 * Never dies — HP is clamped to 1 and regenerates over time.
 */

import { GAME_CONFIG } from '../../shared/GameConfig.js'

const REGEN_RATE = 80   // HP per second

// Module-level counter for enemy-fired projectile IDs (string prefix avoids
// collision with SkillSystem's numeric projectile IDs)
let _epSeq = 0

// Find nearest living, non-host player
function _nearestPlayer(players, x, y) {
  let nearest  = null
  let bestDist = 300
  players.forEach(p => {
    if (p.isHost || p.isDead || p.isInvisible) return
    const d = Math.hypot(p.x - x, p.y - y)
    if (d < bestDist) { bestDist = d; nearest = p }
  })
  return nearest
}

export default class TrainingDummy {
  constructor({ id, x, y, dummyName } = {}) {
    this.arenaWidth  = GAME_CONFIG.CANVAS_WIDTH
    this.arenaHeight = GAME_CONFIG.CANVAS_HEIGHT
    this.id        = id ?? 'training-dummy'
    this.x         = x ?? this.arenaWidth / 2
    this.y         = y ?? this.arenaHeight / 4
    this.hp        = 500
    this.maxHp     = 500
    this.radius    = GAME_CONFIG.ENEMY_RADIUS
    this.isDead    = false
    this.isDummy   = true
    this.isPlayer  = false
    this.dummyName = dummyName ?? 'Idle'

    // Fields required by SkillSystem for status effects
    this.activeEffects = []
    this.isRooted      = false
    this.isStunned     = false
    this.isFeared      = false
    this.fearSource    = null
    this.pullTarget    = null
    this.speedMult     = 1

    this._lastContactDamage = 0
  }

  takeDamage(amount) {
    // Never reaches 0 — dummy cannot die
    this.hp = Math.max(1, this.hp - amount)
  }

  update(dt) {
    this.hp = Math.min(this.maxHp, this.hp + REGEN_RATE * dt)

    // Consume pull effects applied by player GRIP projectiles
    if (this.pullTarget) {
      const dx   = this.pullTarget.x - this.x
      const dy   = this.pullTarget.y - this.y
      const dist = Math.hypot(dx, dy)
      if (dist < 15) {
        this.x = this.pullTarget.x
        this.y = this.pullTarget.y
        this.pullTarget = null
      } else {
        const step = (this.pullTarget.speed ?? 600) * dt
        this.x += (dx / dist) * step
        this.y += (dy / dist) * step
      }
    }
  }

  toDTO() {
    return {
      id:        this.id,
      x:         Math.round(this.x),
      y:         Math.round(this.y),
      hp:        Math.round(this.hp),
      maxHp:     this.maxHp,
      isDummy:   true,
      dummyName: this.dummyName,
    }
  }

  setArenaSize(width, height) {
    this.arenaWidth = width
    this.arenaHeight = height
  }
}

/**
 * Stationary dummy that fires a slow projectile at the nearest player every 2.5s.
 * Use this to test shield and heal abilities.
 */
export class RangedDummy extends TrainingDummy {
  constructor({ id, x, y } = {}) {
    super({ id, x, y, dummyName: 'Ranged' })
    this._fireCooldown = 1.5   // initial delay before first shot (seconds)
  }

  update(dt, gs) {
    super.update(dt)   // regen HP + pull handling

    if (!gs) return

    this._fireCooldown -= dt
    if (this._fireCooldown > 0) return

    const target = _nearestPlayer(gs.players, this.x, this.y)
    if (!target) return

    this._fireCooldown = 2.5   // seconds between shots

    const dx   = target.x - this.x
    const dy   = target.y - this.y
    const dist = Math.hypot(dx, dy)
    if (dist === 0) return

    const speed  = 160   // px/s — slow, easy to dodge
    const projId = `ep-${++_epSeq}`

    gs.projectiles.set(projId, {
      id:           projId,
      x:            this.x,
      y:            this.y,
      vx:           (dx / dist) * speed,
      vy:           (dy / dist) * speed,
      radius:       10,
      range:        900,
      distTraveled: 0,
      ownerId:      this.id,
      damage:       12,
      effectType:   'DAMAGE',
      pierce:       false,
      hit:          new Set([this.id]),   // pre-exclude self
      color:        '#e67e22',   // orange — visually distinct from player projectiles
      isAlive:      true,
      isLobbed:     false,
      targetX:      0,
      targetY:      0,
      onImpact:     null,
      dot:          null,
      isEnemyProj:  true,        // tells SkillSystem to collide with players
    })
  }
}

/**
 * Dummy that chases the nearest player and performs melee attacks at close range.
 * Use this to test melee combat and directional shields.
 */
export class MeleeDummy extends TrainingDummy {
  constructor({ id, x, y } = {}) {
    super({ id, x, y, dummyName: 'Melee' })
    this._attackCooldown = 1.5   // initial delay before first attack (seconds)
  }

  update(dt, gs) {
    super.update(dt)   // regen HP + pull handling

    if (!gs) return

    // Override pull: base update handles pullTarget movement; skip chase during pull
    if (this.pullTarget) return

    const target = _nearestPlayer(gs.players, this.x, this.y)
    if (!target) return

    const dx   = target.x - this.x
    const dy   = target.y - this.y
    const dist = Math.hypot(dx, dy)

    // Attack only when the player walks close enough — dummy stays stationary
    const ATTACK_RANGE = 60   // px center-to-center
    this._attackCooldown -= dt
    if (dist <= ATTACK_RANGE && this._attackCooldown <= 0) {
      this._attackCooldown = 1.5

      // Directional shield check — if the player's shield faces this dummy, block it
      if (target.isShieldBlocking(this.x, this.y)) {
        if (gs.io) gs.io.emit('effect:damage', { targetId: target.id, amount: 0, type: 'blocked', sourceSkill: null })
        return
      }

      // Deal damage — minHp=1 so players can never die in lobby
      const dealt = target.takeDamage(20, 1)
      if (gs.io) {
        gs.io.emit('effect:damage', { targetId: target.id, amount: dealt, type: 'damage', sourceSkill: null })
      }
    }
  }
}

/**
 * A training dummy that patrols between two points.
 * Responds to slow, root, fear, and pull effects like a real enemy.
 */
export class MovingDummy extends TrainingDummy {
  constructor({ id, pointA, pointB, speed }) {
    super({ id, x: pointA.x, y: pointA.y, dummyName: null })
    this._pointA = pointA
    this._pointB = pointB
    this._speed  = speed ?? 1.5
    this._target = this._pointB
  }

  update(dt) {
    // Regen HP + pull handling
    super.update(dt)

    // Pull overrides patrol (handled in super)
    if (this.pullTarget) return

    // Feared: flee from fear source
    if (this.isFeared && this.fearSource) {
      const dx = this.x - this.fearSource.x
      const dy = this.y - this.fearSource.y
      const dist = Math.hypot(dx, dy)
      if (dist > 2) {
        const pps = this._speed * (this.speedMult ?? 1) * 60
        this.x += (dx / dist) * pps * dt
        this.y += (dy / dist) * pps * dt
      }
      this._clamp()
      return
    }

    // Rooted or stunned: no patrol movement
    if (this.isRooted || this.isStunned) return

    // Patrol between A and B
    const dx = this._target.x - this.x
    const dy = this._target.y - this.y
    const dist = Math.hypot(dx, dy)

    if (dist < 5) {
      this._target = this._target === this._pointA ? this._pointB : this._pointA
      return
    }

    const pps = this._speed * (this.speedMult ?? 1) * 60
    this.x += (dx / dist) * pps * dt
    this.y += (dy / dist) * pps * dt
    this._clamp()
  }

  _clamp() {
    this.x = Math.max(this.radius, Math.min(this.arenaWidth  - this.radius, this.x))
    this.y = Math.max(this.radius, Math.min(this.arenaHeight - this.radius, this.y))
  }
}
