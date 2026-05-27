/**
 * server/systems/BotController.js
 * Bot player AI — simulates input for bot-controlled players.
 *
 * Reads player/enemy/objective state and writes to player input queues each tick.
 * All bot-specific AI logic lives here; GameServer delegates _tickBotAI to update().
 *
 * Usage:
 *   const botController = new BotController({ bots, players, inputQueues, enemies, getBoss,
 *     buildings, gates, getCurrentLevel, isDialogRunning, getScene })
 *   botController.update()   — call once per tick, before input queues are drained
 */

const MELEE_CLASSES  = new Set(['Warrior', 'Paladin', 'Rogue', 'DeathKnight'])
const HEALER_CLASSES = new Set(['Priest', 'Druid', 'Shaman'])

const BOT_PROFILE = {
  melee:  { preferred: 80,  tooClose: 50,  tooFar: 160 },
  ranged: { preferred: 280, tooClose: 180, tooFar: 420 },
  healer: { preferred: 350, tooClose: 200, tooFar: 550 },
}

const LOW_HP_THRESHOLD   = 0.30   // retreat to healer below this HP ratio
const HEAL_TRIGGER_RATIO = 0.85   // healers only cast HEAL_ALLY when target is below this ratio
const BLINK_THREAT_RANGE = 220    // px — Blink/Vanish/DASH only when enemy this close
const MELEE_THREAT_RANGE = 85     // px — interrupt channel suppression if enemy this close
const OBJECTIVE_WEIGHT   = 0.65   // fraction of non-healer bots that prefer objective movement

export default class BotController {
  /**
   * @param {object} deps
   * @param {Map}      deps.bots              botId → botState
   * @param {Map}      deps.players           socketId → ServerPlayer
   * @param {Map}      deps.inputQueues       socketId → Array<InputEvent>
   * @param {Map}      deps.enemies           id → ServerEnemy
   * @param {Function} deps.getBoss           () → ServerBoss | null
   * @param {Map}      deps.buildings         id → ServerBuilding  (optional)
   * @param {Map}      deps.gates             id → ServerGate      (optional)
   * @param {Function} deps.getCurrentLevel   () → level config | null
   * @param {Function} deps.isDialogRunning   () → bool
   * @param {Function} deps.getScene          () → scene name string
   */
  constructor({ bots, players, inputQueues, enemies, getBoss,
                buildings, gates, getCurrentLevel, isDialogRunning, getScene }) {
    this.bots            = bots
    this.players         = players
    this.inputQueues     = inputQueues
    this.enemies         = enemies
    this.getBoss         = getBoss
    this.buildings       = buildings       ?? new Map()
    this.gates           = gates           ?? new Map()
    this.getCurrentLevel = getCurrentLevel ?? (() => null)
    this.isDialogRunning = isDialogRunning ?? (() => false)
    this.getScene        = getScene        ?? (() => 'battle')
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /** Populate input queues for all active bots. Call before the input drain step. */
  update() {
    if (this.bots.size === 0) return

    const now           = Date.now()
    const boss          = this.getBoss()
    const scene         = this.getScene()
    const dialogRunning = this.isDialogRunning()
    const level         = this.getCurrentLevel()
    const objectives    = level?.objectives ?? []
    const hasBuildingObj = objectives.some(o => o.type === 'destroyBuildings')
    const hasGateObj     = objectives.some(o => o.type === 'destroyGates')

    // Pre-count downed allies once per tick (shared across all bots)
    let downedCount = 0
    this.players.forEach(p => { if (!p.isHost && p.isDowned) downedCount++ })

    this.bots.forEach((botState, botId) => {
      const player = this.players.get(botId)
      if (!player) return
      const queue = this.inputQueues.get(botId)
      if (!queue) return

      // ── Lazy-init per-bot state fields ───────────────────────────────────
      if (!botState.skillNextAllowed)   botState.skillNextAllowed = {}
      if (botState.strafeDir     == null) botState.strafeDir      = Math.random() < 0.5 ? 1 : -1
      if (botState.strafeDirTimer == null) botState.strafeDirTimer = 0
      if (botState.channelUntil  == null) botState.channelUntil   = 0
      // objectiveBias: stable per-bot value — ~65% of bots prioritise objectives over enemies
      if (botState.objectiveBias == null) botState.objectiveBias  = Math.random()

      // ── 1. Downed — crawl toward the nearest alive character ─────────────
      if (player.isDowned) {
        let nearX = null, nearY = null, nearDist = Infinity
        this.players.forEach(p => {
          if (p.id === botId || p.isDowned || p.isHost) return
          const d = Math.hypot(p.x - player.x, p.y - player.y)
          if (d < nearDist) { nearDist = d; nearX = p.x; nearY = p.y }
        })
        if (nearX !== null) {
          const dx = nearX - player.x, dy = nearY - player.y
          const len = Math.hypot(dx, dy) || 1
          queue.push({ type: 'move', x: dx / len, y: dy / len })
        }
        return
      }

      // ── 2. Idle — dialog playing or scene is non-combat ──────────────────
      if (dialogRunning || (scene !== 'battle' && scene !== 'bossFight')) {
        this._wander(botState, queue)
        return
      }

      const isHealer = HEALER_CLASSES.has(player.className)
      const isMelee  = MELEE_CLASSES.has(player.className)
      const profile  = isHealer ? BOT_PROFILE.healer
                     : isMelee  ? BOT_PROFILE.melee
                     : BOT_PROFILE.ranged

      // ── Find nearest living healer (for low-HP retreat) ──────────────────
      let healerX = null, healerY = null, healerDist = Infinity
      this.players.forEach(p => {
        if (p.id === botId || p.isDowned || p.isHost || !HEALER_CLASSES.has(p.className)) return
        const d = Math.hypot(p.x - player.x, p.y - player.y)
        if (d < healerDist) { healerDist = d; healerX = p.x; healerY = p.y }
      })

      // ── Find most-injured ally (healer skill targeting) ───────────────────
      let healTarget = null, worstRatio = 1
      if (isHealer) {
        this.players.forEach(p => {
          if (p.id === botId || p.isDowned || p.isHost) return
          const ratio = p.hp / p.maxHp
          if (ratio < worstRatio) { worstRatio = ratio; healTarget = p }
        })
      }

      // ── 3. Low HP — retreat toward a healer, or flee if none available ────
      const hpRatio = player.hp / player.maxHp
      if (hpRatio < LOW_HP_THRESHOLD) {
        if (!isHealer && healerX !== null && healerDist > 60) {
          const dx = healerX - player.x, dy = healerY - player.y
          const len = Math.hypot(dx, dy) || 1
          queue.push({ type: 'move', x: dx / len, y: dy / len })
        } else {
          this._fleeFromThreat(player, boss, queue)
        }
        return
      }

      // ── Find nearest enemy ────────────────────────────────────────────────
      let nearestEnemy = null, nearestEnemyDist = Infinity
      this.enemies.forEach(e => {
        if (e.isDead) return
        const d = Math.hypot(e.x - player.x, e.y - player.y)
        if (d < nearestEnemyDist) { nearestEnemyDist = d; nearestEnemy = e }
      })
      if (!nearestEnemy && boss && !boss.isDead) {
        nearestEnemy = boss
        nearestEnemyDist = Math.hypot(boss.x - player.x, boss.y - player.y)
      }

      // ── Find nearest objective target (building or active gate) ───────────
      let objTarget = null, objDist = Infinity
      if (hasBuildingObj) {
        this.buildings.forEach(b => {
          if (b.isDead) return
          const d = Math.hypot(b.x - player.x, b.y - player.y)
          if (d < objDist) { objDist = d; objTarget = b }
        })
      } else if (hasGateObj) {
        this.gates.forEach(g => {
          if (g.isDead || !g.isActive) return
          const d = Math.hypot(g.x - player.x, g.y - player.y)
          if (d < objDist) { objDist = d; objTarget = g }
        })
      }

      // ── Resolve targets ───────────────────────────────────────────────────
      // Movement target: healers always follow the group; DPS/ranged split by bias
      const preferObj  = !isHealer && !!objTarget && botState.objectiveBias < OBJECTIVE_WEIGHT
      const moveTarget = preferObj ? objTarget : (nearestEnemy ?? objTarget)
      // Skill target: aim skills at actual enemies first; fall back to objectives
      const skillTarget     = nearestEnemy ?? objTarget
      const skillTargetDist = nearestEnemy ? nearestEnemyDist : objDist

      if (!moveTarget && !skillTarget) {
        this._wander(botState, queue)
        return
      }

      // ── 4. Movement ───────────────────────────────────────────────────────
      const isChanneling = now < botState.channelUntil
      const underMelee   = nearestEnemyDist <= MELEE_THREAT_RANGE

      if (moveTarget && (!isChanneling || underMelee)) {
        const dx = moveTarget.x - player.x
        const dy = moveTarget.y - player.y
        const dist = Math.hypot(dx, dy) || 1
        const nx = dx / dist, ny = dy / dist

        if (isHealer) {
          // Flee if an enemy steps inside the healer's comfort zone; otherwise stay near group
          if (dist < profile.tooClose) {
            queue.push({ type: 'move', x: -nx, y: -ny })
          } else {
            let cx = 0, cy = 0, count = 0
            this.players.forEach(p => {
              if (p.isHost || p.isDowned) return
              cx += p.x; cy += p.y; count++
            })
            if (count > 0) {
              const gcx = cx / count - player.x, gcy = cy / count - player.y
              const gLen = Math.hypot(gcx, gcy) || 1
              queue.push({ type: 'move', x: gcx / gLen, y: gcy / gLen })
            }
          }
        } else if (dist < profile.tooClose) {
          queue.push({ type: 'move', x: -nx, y: -ny })
        } else if (dist > profile.tooFar) {
          queue.push({ type: 'move', x: nx, y: ny })
        } else if (dist > profile.preferred) {
          queue.push({ type: 'move', x: nx, y: ny })
        } else if (isMelee) {
          queue.push({ type: 'move', x: -ny, y: nx })
        } else {
          if (--botState.strafeDirTimer <= 0) {
            if (Math.random() < 0.35) botState.strafeDir = -botState.strafeDir
            botState.strafeDirTimer = 30 + Math.floor(Math.random() * 30)
          }
          const sd = botState.strafeDir
          queue.push({ type: 'move', x: -ny * sd, y: nx * sd })
        }
      }

      // ── 5. Skill selection ────────────────────────────────────────────────
      if (skillTarget && --botState.skillTimer <= 0) {
        botState.skillTimer = 2   // try a skill every 2 ticks (~10 Hz at 20 FPS)

        const sdx = skillTarget.x - player.x
        const sdy = skillTarget.y - player.y
        const sLen = Math.hypot(sdx, sdy) || 1
        const aimX = sdx / sLen, aimY = sdy / sLen

        for (let i = 0; i < 4; i++) {
          const slot   = (botState.skillCursor + i) % 4
          const config = player.getSkillConfig(slot)
          if (!config) continue
          if ((botState.skillNextAllowed[slot] ?? 0) > now) continue

          if (!this._isEligible(config, nearestEnemy, nearestEnemyDist, skillTargetDist,
                                  healTarget, worstRatio, downedCount)) continue

          let vec = { x: aimX, y: aimY }

          // HEAL_ALLY and healer BUFF/TARGETED → aim at most-injured ally
          if ((config.subtype === 'HEAL_ALLY' ||
               (config.type === 'BUFF' && config.subtype === 'TARGETED')) && healTarget) {
            const htx = healTarget.x - player.x, hty = healTarget.y - player.y
            const htLen = Math.hypot(htx, hty) || 1
            vec = { x: htx / htLen, y: hty / htLen }
          }

          // Blink → teleport away from the closest threat
          if (config.name === 'Blink' && nearestEnemy) {
            const ex = nearestEnemy.x - player.x, ey = nearestEnemy.y - player.y
            const eLen = Math.hypot(ex, ey) || 1
            vec = { x: -ex / eLen, y: -ey / eLen }
          }

          // Track when this slot is next usable (cast time + cooldown)
          const lockMs = (config.castTime ?? 0) + (config.cooldown ?? 0)
          if (lockMs > 0) botState.skillNextAllowed[slot] = now + lockMs

          // Suppress movement for the duration of CHANNEL skills
          if (config.type === 'CHANNEL') {
            botState.channelUntil = now + (config.castTime ?? 0)
          }

          queue.push({ type: 'skill', index: slot, vector: vec })
          botState.skillCursor = (slot + 1) % 4
          return   // one ability per check interval
        }
      }
    })
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Decide whether a skill is worth firing given the current game state.
   * Returns false to skip the slot and try the next one.
   */
  _isEligible(config, nearestEnemy, nearestEnemyDist, skillTargetDist,
               healTarget, worstRatio, downedCount) {
    const { type, subtype, name } = config

    // ── Named special cases ──────────────────────────────────────────────────
    if (name === 'Mass Resurrection') return downedCount > 0
    if (name === 'Blink')             return nearestEnemyDist <= BLINK_THREAT_RANGE

    // ── By subtype ───────────────────────────────────────────────────────────
    if (subtype === 'STEALTH')        return nearestEnemyDist <= BLINK_THREAT_RANGE
    if (subtype === 'HEAL_ALLY')      return !!healTarget && worstRatio < HEAL_TRIGGER_RATIO
    if (subtype === 'AOE_SELF')       return !!nearestEnemy && nearestEnemyDist <= (config.radius ?? 120) + 80

    // ── By type ──────────────────────────────────────────────────────────────
    if (type === 'TARGETED')          return !!nearestEnemy && skillTargetDist <= (config.range ?? 500)
    if (type === 'MELEE')             return !!nearestEnemy && nearestEnemyDist <= (config.range ?? 80) * 1.5
    if (type === 'DASH')              return nearestEnemyDist <= BLINK_THREAT_RANGE
    if (type === 'SHIELD')            return nearestEnemyDist <= 200

    if (type === 'BUFF') {
      if (subtype === 'TARGETED') return !!healTarget
      return !!nearestEnemy
    }

    if (type === 'CHANNEL') {
      if (!nearestEnemy) return false
      if (subtype === 'BEAM') return nearestEnemyDist <= (config.range ?? 700)
      // UNTARGETED (e.g. Tranquility) — cast when enemies are close OR allies need heals
      return nearestEnemyDist <= 450 || (!!healTarget && worstRatio < 0.75)
    }

    // PROJECTILE, CAST, SPAWN, AOE_ADJACENT, etc. — fire whenever there's a target
    return skillTargetDist < Infinity
  }

  /** Flee directly away from the nearest enemy/boss. */
  _fleeFromThreat(player, boss, queue) {
    let threatX = player.x, threatY = player.y, threatDist = Infinity
    this.enemies.forEach(e => {
      if (e.isDead) return
      const d = Math.hypot(e.x - player.x, e.y - player.y)
      if (d < threatDist) { threatDist = d; threatX = e.x; threatY = e.y }
    })
    if (boss && !boss.isDead) {
      const d = Math.hypot(boss.x - player.x, boss.y - player.y)
      if (d < threatDist) { threatX = boss.x; threatY = boss.y }
    }
    const fdx = player.x - threatX, fdy = player.y - threatY
    const flen = Math.hypot(fdx, fdy) || 1
    queue.push({ type: 'move', x: fdx / flen, y: fdy / flen })
  }

  /** Slow random drift — used when bots have nothing to do. */
  _wander(botState, queue) {
    if (--botState.wanderTimer <= 0) {
      botState.wanderAngle = Math.random() * Math.PI * 2
      botState.wanderTimer = 40 + Math.floor(Math.random() * 20)
    }
    queue.push({ type: 'move', x: Math.cos(botState.wanderAngle), y: Math.sin(botState.wanderAngle) })
  }
}
