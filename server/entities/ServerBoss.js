/**
 * server/entities/ServerBoss.js
 * Server-side boss entity: Illidan Stormrage with phase-based AI.
 */

import { ILLIDAN_CONFIG }        from '../../shared/IllidanConfig.js'
import { SHADE_OF_AKAMA_CONFIG } from '../../shared/ShadeOfAkamaConfig.js'
import { DEFAULT_BOSS_RADIUS }   from '../../shared/BaseBossConfig.js'

function resolveConfig(configKey) {
  if (configKey === 'ILLIDAN')        return ILLIDAN_CONFIG
  if (configKey === 'SHADE_OF_AKAMA') return SHADE_OF_AKAMA_CONFIG
  return SHADE_OF_AKAMA_CONFIG
}

export default class ServerBoss {
  /**
   * @param {string} [configKey='ILLIDAN'] — 'ILLIDAN' | 'SHADE_OF_AKAMA'
   * @param {object} [overrides]           — { hpMult, damageMult, arenaWidth, arenaHeight }
   */
  constructor(configKey = 'ILLIDAN', overrides = {}) {
    const cfg = resolveConfig(configKey)
    const hpMult = overrides.hpMult ?? 1
    const damageMult = overrides.damageMult ?? 1

    this.name      = cfg.name
    this.maxHp     = Math.round(cfg.maxHp * hpMult)
    this.hp        = this.maxHp
    this._damageMult = damageMult
    this.radius      = cfg.radius ?? DEFAULT_BOSS_RADIUS
    this.hitboxShape = cfg.hitboxShape ?? 'oval'
    this.radiusX     = this.hitboxShape === 'oval' ? this.radius / 2 : this.radius
    this.radiusY     = this.radius
    this.arenaWidth = overrides.arenaWidth ?? GAME_CONFIG.CANVAS_WIDTH
    this.arenaHeight = overrides.arenaHeight ?? GAME_CONFIG.CANVAS_HEIGHT
    this.x         = this.arenaWidth / 2
    this.y         = this.arenaHeight / 2
    this.angle     = 0
    this.isDead    = false
    this.isImmune  = false
    this.activeCast = null  // { attack, castTime, startedAt } for cast-based abilities
    this.phase     = 1
    this.isPlayer  = false
    this.id        = 'boss'

    this._abilityCooldowns = {}
    this._phases        = cfg.phases ?? []
    this._abilities     = cfg.abilities ?? []
    this._phaseAbilities = cfg.phaseAbilities ?? null  // Illidan: per-phase ability sets
    this._config        = cfg
    this.baseSpeed      = cfg.speed
    this.speed          = this.baseSpeed

    // ── Enrage timer ──────────────────────────────────────────────────────
    this._fightStartTime  = Date.now()
    this._enrageActive    = false

    /**
     * Optional callback wired by GameServer for encounter-specific logic.
     * Called with (newPhase) whenever the phase changes.
     * @type {((phase: number) => void) | null}
     */
    this.onPhaseChange = null

    /**
     * Optional callback fired once when enrage triggers.
     * Wire in GameServer to emit a client event if needed.
     * @type {(() => void) | null}
     */
    this.onEnrage = null

    // Contact damage rate-limiter per player: Map<playerId, timestamp>
    // Stored externally on ServerPlayer as _lastBossContact
  }

  takeDamage(amount) {
    if (this.isDead || this.isImmune) return
    this.hp = Math.max(0, this.hp - amount)
    if (this.hp === 0) { this.isDead = true; return }
    this._updatePhase()
  }

  _updatePhase() {
    const pct = this.hp / this.maxHp
    for (let i = this._phases.length - 1; i >= 0; i--) {
      if (pct <= this._phases[i].threshold) {
        const newPhase = i + 1
        if (newPhase !== this.phase) {
          this.phase = newPhase
          this.speed = this._phases[i].speed
          console.log(`[Boss] Phase ${newPhase} — speed ${this.speed}`)
          this.onPhaseChange?.(newPhase)
        }
        break
      }
    }
  }

  /** Returns the abilities active for the current phase. */
  _getActiveAbilities() {
    if (this._phaseAbilities) {
      return this._phaseAbilities[this.phase] ?? []
    }
    return this._abilities
  }

  update(dt, players) {
    if (this.isDead) return
    if (this.activeCast) return  // freeze in place while winding up an ability

    // Check enrage timer
    if (!this._enrageActive && this._config.enrageTimer) {
      if (Date.now() - this._fightStartTime >= this._config.enrageTimer) {
        this._enrageActive = true
        console.log('[Boss] ENRAGE — attack and cast speed doubled')
        this.onEnrage?.()
      }
    }

    // Chase nearest living non-host player
    let nearest = null
    let bestDist = Infinity
    players.forEach(p => {
      if (p.isHost || p.isDead || p.isInvisible) return
      const d = Math.hypot(p.x - this.x, p.y - this.y)
      if (d < bestDist) { bestDist = d; nearest = p }
    })
    if (!nearest) return

    const dx   = nearest.x - this.x
    const dy   = nearest.y - this.y
    const dist = Math.hypot(dx, dy)
    if (dist < 5) return

    const pps = this.speed * 60
    this.x += (dx / dist) * pps * dt
    this.y += (dy / dist) * pps * dt
    this.angle = Math.atan2(dy, dx)

    // Clamp
    this.x = Math.max(this.radius, Math.min(this.arenaWidth  - this.radius, this.x))
    this.y = Math.max(this.radius, Math.min(this.arenaHeight - this.radius, this.y))
  }

  /**
   * Returns array of attack objects this tick (applied by GameServer).
   * Each object: { type, damage, radius?, bossX, bossY, target }
   */
  updateAbilities(dt, players, now) {
    if (this.isDead) return []
    // Don't start new abilities while a cast is in progress
    if (this.activeCast) return []
    const attacks = []

    const attackSpeedMult = this._enrageActive ? (this._config.enrageAttackSpeedMult ?? 1) : 1
    const castSpeedMult   = this._enrageActive ? (this._config.enrageCastSpeedMult   ?? 1) : 1

    for (const ability of this._getActiveAbilities()) {
      const lastUsed = this._abilityCooldowns[ability.name] ?? 0
      if (now - lastUsed < ability.cooldown / attackSpeedMult) continue

      // Find nearest living non-host player
      let nearest = null
      let bestDist = Infinity
      players.forEach(p => {
        if (p.isHost || p.isDead || p.isInvisible) return
        const d = Math.hypot(p.x - this.x, p.y - this.y)
        if (d < bestDist) { bestDist = d; nearest = p }
      })
      if (!nearest) continue

      // Phase 2 abilities fire from outside the map — skip range check for them.
      // Other abilities keep a practical range gate so the boss doesn't use
      // abilities it can't meaningfully deliver (e.g. across a very large map).
      const skipRangeCheck = ['fireball', 'darkBarrage', 'eyeBeams'].includes(ability.type)
      if (!skipRangeCheck) {
        const activationRange = ability.type === 'beam' ? 350 : 600
        if (bestDist > activationRange) continue
      }

      this._abilityCooldowns[ability.name] = now

      // Cast-based abilities: store the pending attack, show cast bar
      if (ability.castTime) {
        this.activeCast = {
          attack: {
            ...ability,
            damage: Math.round((ability.damage ?? 0) * this._damageMult),
            bossX: this.x, bossY: this.y, target: nearest,
          },
          castTime:  ability.castTime / castSpeedMult,
          startedAt: now,
        }
        break  // only one ability at a time; cast is now pending
      }

      attacks.push({
        ...ability,
        damage: Math.round((ability.damage ?? 0) * this._damageMult),
        bossX: this.x, bossY: this.y, target: nearest,
      })
    }

    return attacks
  }

  /**
   * Advances any in-progress cast. Returns the completed attack object when
   * the cast time has elapsed, or null if still casting / nothing active.
   */
  tickCast(now) {
    if (!this.activeCast) return null
    const elapsed = now - this.activeCast.startedAt
    if (elapsed < this.activeCast.castTime) return null
    const attack = this.activeCast.attack
    this.activeCast = null
    return attack
  }

  toDTO() {
    const dto = {
      id:       'boss',
      name:     this.name,
      x:        Math.round(this.x),
      y:        Math.round(this.y),
      angle:    +this.angle.toFixed(3),
      hp:       Math.round(this.hp),
      maxHp:    Math.round(this.maxHp),
      radius:   this.radius,
      phase:      this.phase,
      isDead:     this.isDead,
      isImmune:   this.isImmune || undefined,
      damageMult: +this._damageMult.toFixed(2),
    }
    if (this.activeCast) {
      const elapsed = Date.now() - this.activeCast.startedAt
      dto.castProgress = Math.min(1, elapsed / this.activeCast.castTime)
      dto.castName     = this.activeCast.attack.name
    } else {
      dto.castProgress = null  // explicit null clears stale value in client knownState merge
    }
    return dto
  }
}
