/**
 * server/systems/BotController.js
 * Bot player AI — simulates input for bot-controlled players.
 *
 * Reads player/enemy state and writes to player input queues each tick.
 * All bot-specific AI logic lives here; GameServer delegates _tickBotAI to update().
 *
 * Usage:
 *   const botController = new BotController({ bots, players, inputQueues, enemies, getBoss })
 *   botController.update()   — call once per tick, before input queues are drained
 */

export default class BotController {
  /**
   * @param {object} deps
   * @param {Map}      deps.bots         botId → botState
   * @param {Map}      deps.players      socketId → ServerPlayer
   * @param {Map}      deps.inputQueues  socketId → Array<InputEvent>
   * @param {Map}      deps.enemies      id → ServerEnemy
   * @param {Function} deps.getBoss      () → ServerBoss | null
   */
  constructor({ bots, players, inputQueues, enemies, getBoss }) {
    this.bots        = bots
    this.players     = players
    this.inputQueues = inputQueues
    this.enemies     = enemies
    this.getBoss     = getBoss
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /** Populate input queues for all active bots. Call before the input drain step. */
  update() {
    if (this.bots.size === 0) return

    const MELEE_CLASSES  = new Set(['Warrior', 'Paladin', 'Rogue', 'DeathKnight'])
    const HEALER_CLASSES = new Set(['Priest', 'Druid', 'Shaman'])
    const BOT_PROFILE = {
      melee:  { preferred: 80,  tooClose: 50,  tooFar: 160 },
      ranged: { preferred: 280, tooClose: 180, tooFar: 420 },
      healer: { preferred: 350, tooClose: 200, tooFar: 550 },
    }

    const now  = Date.now()
    const boss = this.getBoss()

    this.bots.forEach((botState, botId) => {
      const player = this.players.get(botId)
      if (!player || player.isDead) return

      const queue = this.inputQueues.get(botId)
      if (!queue) return

      // Lazy-init per-bot state fields added after construction
      if (!botState.skillNextAllowed) botState.skillNextAllowed = {}
      if (botState.strafeDir   == null) botState.strafeDir      = Math.random() < 0.5 ? 1 : -1
      if (botState.strafeDirTimer == null) botState.strafeDirTimer = 0

      const isHealer = HEALER_CLASSES.has(player.className)
      const isMelee  = MELEE_CLASSES.has(player.className)
      const profile  = isHealer ? BOT_PROFILE.healer
                     : isMelee  ? BOT_PROFILE.melee
                     : BOT_PROFILE.ranged

      // ── Healer: find most-injured ally ──────────────────────────────────
      let healTarget = null
      if (isHealer) {
        let worstRatio = 1
        this.players.forEach(p => {
          if (p.id === botId || p.isDead || p.isHost) return
          const ratio = p.hp / p.maxHp
          if (ratio < worstRatio) { worstRatio = ratio; healTarget = p }
        })
      }

      // ── Low HP retreat ───────────────────────────────────────────────────
      const hpRatio = player.hp / player.maxHp
      if (hpRatio < 0.25) {
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
        return
      }

      // ── Find nearest enemy/boss ──────────────────────────────────────────
      let target = null, bestDist = Infinity
      this.enemies.forEach(e => {
        if (e.isDead) return
        const d = Math.hypot(e.x - player.x, e.y - player.y)
        if (d < bestDist) { bestDist = d; target = e }
      })
      if (!target && boss && !boss.isDead) {
        target = boss
        bestDist = Math.hypot(boss.x - player.x, boss.y - player.y)
      }

      if (target) {
        const dx = target.x - player.x
        const dy = target.y - player.y
        const len = bestDist || 1
        const nx = dx / len, ny = dy / len

        // ── Movement ──────────────────────────────────────────────────────
        if (isHealer) {
          // Stay near group center; flee if enemy gets too close
          if (bestDist < profile.tooClose) {
            queue.push({ type: 'move', x: -nx, y: -ny })
          } else {
            let cx = 0, cy = 0, count = 0
            this.players.forEach(p => {
              if (p.isHost || p.isDead) return
              cx += p.x; cy += p.y; count++
            })
            if (count > 0) {
              const gcx = cx / count - player.x
              const gcy = cy / count - player.y
              const gLen = Math.hypot(gcx, gcy) || 1
              queue.push({ type: 'move', x: gcx / gLen, y: gcy / gLen })
            }
          }
        } else if (bestDist < profile.tooClose) {
          queue.push({ type: 'move', x: -nx, y: -ny })
        } else if (bestDist > profile.tooFar) {
          queue.push({ type: 'move', x: nx, y: ny })
        } else if (bestDist > profile.preferred) {
          queue.push({ type: 'move', x: nx, y: ny })
        } else if (isMelee) {
          // Melee: strafe to stay unpredictable
          queue.push({ type: 'move', x: -ny, y: nx })
        } else {
          // Ranged: orbit with a flipping strafe direction
          if (--botState.strafeDirTimer <= 0) {
            if (Math.random() < 0.35) botState.strafeDir = -botState.strafeDir
            botState.strafeDirTimer = 30 + Math.floor(Math.random() * 30)
          }
          const sd = botState.strafeDir
          queue.push({ type: 'move', x: -ny * sd, y: nx * sd })
        }

        // ── Skill rotation with cast-time guard ───────────────────────────
        if (--botState.skillTimer <= 0) {
          botState.skillCursor = (botState.skillCursor + 1) % 4
          botState.skillTimer  = 3
        }

        const slot   = botState.skillCursor
        const config = player.getSkillConfig(slot)

        if (config && (botState.skillNextAllowed[slot] ?? 0) <= now) {
          const castDelay = config.castTime ?? 0
          if (castDelay > 0) botState.skillNextAllowed[slot] = now + castDelay

          // Healers aim HEAL_ALLY skills at the most-injured ally
          let aimVec = { x: nx, y: ny }
          if (isHealer && config.subtype === 'HEAL_ALLY' && healTarget) {
            const htx = healTarget.x - player.x
            const hty = healTarget.y - player.y
            const htLen = Math.hypot(htx, hty) || 1
            aimVec = { x: htx / htLen, y: hty / htLen }
          }

          queue.push({ type: 'skill', index: slot, vector: aimVec })
        }
      } else {
        // No targets — wander, change direction every ~2s (40 ticks at 20 Hz)
        if (--botState.wanderTimer <= 0) {
          botState.wanderAngle = Math.random() * Math.PI * 2
          botState.wanderTimer = 40 + Math.floor(Math.random() * 20)
        }
        queue.push({ type: 'move', x: Math.cos(botState.wanderAngle), y: Math.sin(botState.wanderAngle) })
      }
    })
  }
}
