/**
 * client/host/scenes/BattleRenderer.js
 *
 * Canvas display for combat phases (trashMob and bossFight).
 *
 * - trashMob:  shows kill counter progress bar
 * - bossFight: shows boss HP bar
 *
 * Integrates VFXManager for all visual effects:
 *   particles, one-shot effects, ground zones, auras, floating text
 */

import { Container, Graphics, Text } from 'pixi.js'
import { GAME_CONFIG }   from '../../../shared/GameConfig.js'
import { CLASSES }       from '../../../shared/ClassConfig.js'
import PlayerSprite      from '../entities/PlayerSprite.js'
import EnemySprite       from '../entities/EnemySprite.js'
import BossSprite        from '../entities/BossSprite.js'
import ProjectileSprite  from '../entities/ProjectileSprite.js'
import VFXManager        from '../systems/VFXManager.js'

const { CANVAS_WIDTH: W, CANVAS_HEIGHT: H } = GAME_CONFIG
const KILL_GOAL = GAME_CONFIG.ENEMY_KILL_GOAL

export default class BattleRenderer {
  constructor(game, mode) {
    this.game          = game
    this.mode          = mode    // 'trashMob' | 'bossFight'
    this.playerSprites = new Map()

    // Root containers owned by this renderer
    this._entityRoot         = new Container()
    this._uiRoot             = new Container()

    // Sub-containers in Z order: enemies behind boss behind players
    this.enemyContainer      = new Container()
    this.bossContainer       = new Container()
    this.projectileContainer = new Container()    // lives in fx layer

    // Sprite pools
    this.enemySprites   = new Map()   // id → EnemySprite
    this.projSprites    = new Map()   // id → ProjectileSprite
    this.bossSprite     = null
    this.tombstoneGfx   = new Map()   // playerId → Graphics
    this.minionGfx      = new Map()   // minionId → Graphics (simple drawn shapes)

    // VFX manager (created in enter())
    this.vfx = null

    // Beam rendering graphics (for Drain Life etc.)
    this._beamGfx  = new Graphics()
    this._flashBeams = []   // [{ x1, y1, x2, y2, color, expiresAt }]
    this._beamTime = 0      // running time for beam animation

    // Previous-frame tracking for event detection
    this._prevPlayerHp  = {}   // id → hp
    this._prevEnemyIds  = new Set()
    this._prevBossPhase = 1
    this._prevBossHp    = Infinity

    this.minionContainer = new Container()

    // Add entity sub-containers in Z order: minions behind enemies behind boss behind players
    this._entityRoot.addChild(this.minionContainer, this.enemyContainer, this.bossContainer)
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  enter() {
    this.game.layers.entities.addChild(this._entityRoot)
    this.game.layers.fx.addChild(this.projectileContainer)
    this.game.layers.ui.addChild(this._uiRoot)

    this.vfx = new VFXManager(this.game.layers)
    this.game.layers.fx.addChild(this._beamGfx)
    this._buildUI()
  }

  exit() {
    this.playerSprites.forEach(s => s.destroy())
    this.playerSprites.clear()

    // Destroy enemy sprites
    this.enemySprites.forEach(s => s.destroy())
    this.enemySprites.clear()

    // Destroy projectile sprites
    this.projSprites.forEach(s => s.destroy())
    this.projSprites.clear()

    // Destroy boss sprite
    if (this.bossSprite) {
      this.bossSprite.destroy()
      this.bossSprite = null
    }

    // Destroy minion graphics
    this.minionGfx.forEach(gfx => gfx.destroy({ children: true }))
    this.minionGfx.clear()

    // Destroy tombstones
    this.tombstoneGfx.forEach(gfx => gfx.destroy())
    this.tombstoneGfx.clear()

    if (this.vfx) { this.vfx.destroy(); this.vfx = null }
    this.game.layers.fx.removeChild(this._beamGfx)
    this._beamGfx.clear()
    this._flashBeams = []
    this._prevPlayerHp  = {}
    this._prevEnemyIds  = new Set()
    this._prevBossPhase = 1
    this._prevBossHp    = Infinity

    this.game.layers.entities.removeChild(this._entityRoot)
    this.game.layers.fx.removeChild(this.projectileContainer)
    this.game.layers.ui.removeChild(this._uiRoot)

    this._entityRoot.removeChildren()
    this._uiRoot.removeChildren()

    // Re-add sub-containers (they were removed by removeChildren above)
    this._entityRoot.addChild(this.minionContainer, this.enemyContainer, this.bossContainer)

    this._killText      = null
    this._killFill      = null
    this._bossHpFill    = null
    this._lastKills     = -1
    this._lastBossHpPct = -1
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(dt = 0.016) {
    const state     = this.game.knownState
    const activeIds = new Set()

    // Update players + detect HP changes for hit sparks
    Object.values(state.players).forEach(p => {
      if (p.isHost) return
      activeIds.add(p.id)

      if (!this.playerSprites.has(p.id)) {
        const sprite = new PlayerSprite(p)
        this.playerSprites.set(p.id, sprite)
        this._entityRoot.addChild(sprite.container)
      }

      const pos = this.game.getRenderPos(p)
      const sprite = this.playerSprites.get(p.id)
      sprite.update(p, pos, dt)

      // Hit spark when player HP drops
      const prevHp = this._prevPlayerHp[p.id]
      if (prevHp != null && p.hp < prevHp && !p.isDead) {
        const color = CLASSES[p.className]?.color ?? '#ffffff'
        this.vfx?.particles.hitSpark(pos.x, pos.y, color)
      }
      // Death burst when player just died
      if (prevHp != null && prevHp > 0 && p.isDead) {
        const color = CLASSES[p.className]?.color ?? '#ffffff'
        this.vfx?.triggerDeath(pos.x, pos.y, color)
      }
      this._prevPlayerHp[p.id] = p.hp

      // Sync auras for this player
      if (this.vfx && p.effects) {
        this.vfx.auras.sync(p.id, sprite.container, p.effects, GAME_CONFIG.PLAYER_RADIUS)
      }
    })

    // Remove gone players
    this.playerSprites.forEach((sprite, id) => {
      if (!activeIds.has(id)) {
        this.vfx?.auras.removeEntity(id)
        this._entityRoot.removeChild(sprite.container)
        sprite.destroy()
        this.playerSprites.delete(id)
      }
    })

    // ── Update enemies (trashMob only) ─────────────────────────────────────
    if (this.mode === 'trashMob') {
      const activeEnemyIds = new Set((state.enemies ?? []).map(e => e.id))

      for (const e of (state.enemies ?? [])) {
        if (!this.enemySprites.has(e.id)) {
          const s = new EnemySprite(e)
          this.enemySprites.set(e.id, s)
          this.enemyContainer.addChild(s.container)
        }
        this.enemySprites.get(e.id).update(e)
      }

      this.enemySprites.forEach((s, id) => {
        if (!activeEnemyIds.has(id)) {
          // Enemy just died — burst at last known position
          const pos = s.container.position
          this.vfx?.triggerDeath(pos.x, pos.y, 0xc0392b)
          this.enemyContainer.removeChild(s.container)
          s.destroy()
          this.enemySprites.delete(id)
        }
      })
    }

    // ── Update boss (bossFight only) ────────────────────────────────────────
    if (this.mode === 'bossFight' && state.boss) {
      if (!this.bossSprite) {
        this.bossSprite = new BossSprite()
        this.bossContainer.addChild(this.bossSprite.container)
      }
      this.bossSprite.update(state.boss)

      if (state.boss.isDead && this.bossSprite) {
        this.bossContainer.removeChild(this.bossSprite.container)
        this.bossSprite.destroy()
        this.bossSprite = null
      }
    }

    // ── Update minions ───────────────────────────────────────────────────────
    const activeMinionIds = new Set((state.minions ?? []).map(m => m.id))

    for (const m of (state.minions ?? [])) {
      if (!this.minionGfx.has(m.id)) {
        const gfx = this._createMinionGfx(m)
        this.minionGfx.set(m.id, gfx)
        this.minionContainer.addChild(gfx)
      }
      this._updateMinionGfx(this.minionGfx.get(m.id), m)
    }

    this.minionGfx.forEach((gfx, id) => {
      if (!activeMinionIds.has(id)) {
        this.minionContainer.removeChild(gfx)
        gfx.destroy({ children: true })
        this.minionGfx.delete(id)
      }
    })

    // ── Update projectiles (both modes) ─────────────────────────────────────
    const activeProjIds = new Set((state.projectiles ?? []).map(p => p.id))

    for (const proj of (state.projectiles ?? [])) {
      if (!this.projSprites.has(proj.id)) {
        const s = new ProjectileSprite(proj)
        this.projSprites.set(proj.id, s)
        this.projectileContainer.addChild(s.container)
      }
      this.projSprites.get(proj.id).update(proj)
    }

    this.projSprites.forEach((s, id) => {
      if (!activeProjIds.has(id)) {
        this.projectileContainer.removeChild(s.container)
        s.destroy()
        this.projSprites.delete(id)
      }
    })

    // ── Update tombstones ───────────────────────────────────────────────────
    const activeTombIds = new Set((state.tombstones ?? []).map(t => t.id))

    for (const tomb of (state.tombstones ?? [])) {
      if (!this.tombstoneGfx.has(tomb.id)) {
        const gfx = new Graphics()
        this.tombstoneGfx.set(tomb.id, gfx)
        this._uiRoot.addChild(gfx)
      }
      const gfx = this.tombstoneGfx.get(tomb.id)
      gfx.clear()
      // Tombstone cross
      gfx.rect(tomb.x - 3, tomb.y - 20, 6, 24)
      gfx.rect(tomb.x - 10, tomb.y - 14, 20, 6)
      gfx.fill({ color: 0x888888, alpha: 0.8 })
      // Revive progress ring
      if (tomb.progress > 0) {
        gfx.arc(tomb.x, tomb.y + 14, 14, -Math.PI / 2, -Math.PI / 2 + tomb.progress * Math.PI * 2)
        gfx.stroke({ color: 0x00ff88, width: 3 })
      }
    }

    this.tombstoneGfx.forEach((gfx, id) => {
      if (!activeTombIds.has(id)) {
        this._uiRoot.removeChild(gfx)
        gfx.destroy()
        this.tombstoneGfx.delete(id)
      }
    })

    // ── Draw beam effects (Drain Life etc.) ──────────────────────────────────
    this._beamTime = (this._beamTime + dt) % 10
    this._beamGfx.clear()
    Object.values(state.players).forEach(p => {
      if (p.isHost || p.isDead || !p.beamTargetId) return
      const srcSprite = this.playerSprites.get(p.id)
      if (!srcSprite) return

      // Find target position
      let tx, ty
      const enemySprite = this.enemySprites.get(p.beamTargetId)
      if (enemySprite) {
        tx = enemySprite.container.x
        ty = enemySprite.container.y
      } else if (p.beamTargetId === 'boss' && this.bossSprite) {
        tx = this.bossSprite.container.x
        ty = this.bossSprite.container.y
      }
      if (tx == null) return

      const sx = srcSprite.container.x
      const sy = srcSprite.container.y
      const t = this._beamTime
      const pulse = 0.55 + 0.2 * Math.sin(t * 8)

      // Outer green glow
      this._beamGfx.moveTo(sx, sy)
      this._beamGfx.lineTo(tx, ty)
      this._beamGfx.stroke({ color: 0x00ff88, width: 6, alpha: 0.18 })

      // Core green beam
      this._beamGfx.moveTo(sx, sy)
      this._beamGfx.lineTo(tx, ty)
      this._beamGfx.stroke({ color: 0x00ff88, width: 2.5, alpha: pulse })

      // Bright white core
      this._beamGfx.moveTo(sx, sy)
      this._beamGfx.lineTo(tx, ty)
      this._beamGfx.stroke({ color: 0xffffff, width: 1, alpha: pulse * 0.55 })

      // Flowing dots from target to caster (life being drained)
      const dx = sx - tx
      const dy = sy - ty
      for (let i = 0; i < 5; i++) {
        const frac = ((i / 5) + t * 0.35) % 1
        const px = tx + dx * frac
        const py = ty + dy * frac
        const a = Math.sin(frac * Math.PI) * 0.85
        this._beamGfx.circle(px, py, 3)
        this._beamGfx.fill({ color: 0x00ff88, alpha: a })
      }
    })

    // Draw timed flash beams (chain heals, targeted hits)
    const now = Date.now()
    this._flashBeams = this._flashBeams.filter(b => b.expiresAt > now)
    this._flashBeams.forEach(b => {
      const c = parseInt(b.color.replace('#', ''), 16)
      this._beamGfx.moveTo(b.x1, b.y1)
      this._beamGfx.lineTo(b.x2, b.y2)
      this._beamGfx.stroke({ width: 2, color: c, alpha: 0.8 })
    })

    // ── Sync ground effect zones ────────────────────────────────────────────
    this.vfx?.ground.sync(state.aoeZones)

    // ── Tick VFX ────────────────────────────────────────────────────────────
    this.vfx?.update(dt)

    // Trash mob: update kill counter
    if (this.mode === 'trashMob' && this._killText) {
      const kills = state.killCount ?? 0
      if (kills !== this._lastKills) {
        this._lastKills = kills
        this._killText.text = `${kills} / ${KILL_GOAL}`
        this._drawKillBar(kills / KILL_GOAL)
      }
    }

    // Boss fight: update boss HP bar
    if (this.mode === 'bossFight' && this._bossHpFill && state.boss) {
      const pct = state.boss.hp / (state.boss.maxHp || 1)
      if (pct !== this._lastBossHpPct) {
        this._lastBossHpPct = pct
        this._drawBossHpFill(pct)
      }
    }
  }

  // ── Event handlers (called from main.js via socket events) ───────────────

  /**
   * Handle skill:fired event — trigger VFX at skill position.
   */
  onSkillFired(data) {
    this.vfx?.triggerSkillVFX(data)
  }

  /**
   * Handle effect:damage event — spawn floating damage/heal number.
   */
  onEffectDamage(data) {
    if (!this.vfx) return
    const { targetId, amount, type } = data

    // Find target position from known sprites
    let x, y
    const playerSprite = this.playerSprites.get(targetId)
    if (playerSprite) {
      x = playerSprite.container.x
      y = playerSprite.container.y
    } else {
      const enemySprite = this.enemySprites.get(targetId)
      if (enemySprite) {
        x = enemySprite.container.x
        y = enemySprite.container.y
      } else if (this.bossSprite) {
        // Check boss
        const state = this.game.knownState
        if (state.boss && (state.boss.id === targetId || targetId === 'boss')) {
          x = this.bossSprite.container.x
          y = this.bossSprite.container.y
        }
      }
    }

    if (x != null && y != null) {
      this.vfx.spawnDamageNumber(x, y - 20, amount, type)
    }
  }

  onTargetedHit(data) {
    if (!this.vfx) return
    const { casterX, casterY, targetX, targetY, effectType, color } = data
    // Register flash beam — rendered each frame in update() until expiry
    this._flashBeams.push({
      x1: casterX, y1: casterY,
      x2: targetX, y2: targetY,
      color: color ?? '#ffffff',
      expiresAt: Date.now() + 300,
    })
    // Impact flash at target
    const impactColor = effectType === 'heal' ? '#44ff44' : color
    this.vfx.triggerImpact(targetX, targetY, impactColor)
  }

  onChannelInterrupted(data) {
    const playerSprite = this.playerSprites.get(data.playerId)
    if (playerSprite && this.vfx) {
      const { x, y } = playerSprite.container
      this.vfx.triggerImpact(x, y, '#ff4444')
    }
  }

  // ── Reactive hooks ────────────────────────────────────────────────────────

  onPlayerAdded(p) {
    if (p.isHost || this.playerSprites.has(p.id)) return
    const sprite = new PlayerSprite(p)
    this.playerSprites.set(p.id, sprite)
    this._entityRoot.addChild(sprite.container)
  }

  onPlayerRemoved(id) {
    const sprite = this.playerSprites.get(id)
    if (!sprite) return
    this.vfx?.auras.removeEntity(id)
    this._entityRoot.removeChild(sprite.container)
    sprite.destroy()
    this.playerSprites.delete(id)
  }

  // ── Minion rendering ─────────────────────────────────────────────────────

  /** Build a Container with static shape + optional dynamic HP bar. */
  _createMinionGfx(m) {
    const root  = new Container()
    const color = m.color ?? '#ffffff'

    if (m.minionType === 'TOTEM') {
      // Pole
      const pole = new Graphics()
      pole.rect(-3, -6, 6, 18)
      pole.fill(color)
      root.addChild(pole)

      // Head circle
      const head = new Graphics()
      head.circle(0, -15, 9)
      head.fill(color)
      head.stroke({ color: '#ffffff', width: 2, alpha: 0.7 })
      root.addChild(head)

      // Eye dot
      const eye = new Graphics()
      eye.circle(0, -15, 4)
      eye.fill('#ffffff')
      root.addChild(eye)

      // Base
      const base = new Graphics()
      base.rect(-8, 12, 16, 4)
      base.fill({ color: '#ffffff', alpha: 0.3 })
      root.addChild(base)

    } else if (m.minionType === 'TRAP') {
      // Diamond body
      const diamond = new Graphics()
      diamond.poly([0, -13, 13, 0, 0, 13, -13, 0])
      diamond.fill({ color, alpha: 0.5 })
      diamond.stroke({ color: '#ffdd00', width: 2.5 })
      root.addChild(diamond)

      // X lines — two separate Graphics so each line strokes independently
      const line1 = new Graphics()
      line1.moveTo(-7, -7)
      line1.lineTo(7, 7)
      line1.stroke({ color: '#ffdd00', width: 2 })
      root.addChild(line1)

      const line2 = new Graphics()
      line2.moveTo(7, -7)
      line2.lineTo(-7, 7)
      line2.stroke({ color: '#ffdd00', width: 2 })
      root.addChild(line2)

      // Center dot
      const dot = new Graphics()
      dot.circle(0, 0, 3)
      dot.fill('#ffdd00')
      root.addChild(dot)

    } else if (m.minionType === 'PET') {
      // Body
      const body = new Graphics()
      body.circle(0, 2, 11)
      body.fill(color)
      body.stroke({ color: '#ffffff', width: 2, alpha: 0.6 })
      root.addChild(body)

      // Left ear
      const earL = new Graphics()
      earL.poly([-9, -5, -4, -14, -1, -5])
      earL.fill(color)
      earL.stroke({ color: '#ffffff', width: 1.5, alpha: 0.4 })
      root.addChild(earL)

      // Right ear
      const earR = new Graphics()
      earR.poly([9, -5, 4, -14, 1, -5])
      earR.fill(color)
      earR.stroke({ color: '#ffffff', width: 1.5, alpha: 0.4 })
      root.addChild(earR)

      // HP bar bg
      const hpBg = new Graphics()
      hpBg.rect(-12, 16, 24, 4)
      hpBg.fill('#111111')
      root.addChild(hpBg)

      // HP bar fill (dynamic)
      const hpFill = new Graphics()
      root.addChild(hpFill)
      root._hpFill = hpFill
      root._maxHp  = m.maxHp
      root._lastHp = -1
    }

    root._minionType = m.minionType
    root.position.set(m.x, m.y)
    return root
  }

  _updateMinionGfx(root, m) {
    root.position.set(m.x, m.y)

    // PET: update HP bar only when HP changes
    if (root._minionType === 'PET' && root._hpFill && m.hp !== root._lastHp) {
      root._lastHp = m.hp
      const pct = Math.max(0, m.hp / (root._maxHp || 1))
      root._hpFill.clear()
      if (pct > 0) {
        const fillColor = pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa00 : 0xff4444
        root._hpFill.rect(-12, 16, 24 * pct, 4)
        root._hpFill.fill({ color: fillColor, alpha: 0.95 })
      }
    }
  }

  // ── UI construction ───────────────────────────────────────────────────────

  _buildUI() {
    if (this.mode === 'trashMob') this._buildTrashMobUI()
    else                          this._buildBossFightUI()
  }

  _buildTrashMobUI() {
    const PANEL_W = 260
    const PANEL_H = 68

    // Panel background
    const bg = new Graphics()
    bg.rect(W / 2 - PANEL_W / 2, 8, PANEL_W, PANEL_H)
    bg.fill({ color: 0x000000, alpha: 0.65 })
    bg.stroke({ color: '#1e3a4a', width: 1 })
    this._uiRoot.addChild(bg)

    // "WAVE PROGRESS" label
    const label = new Text({
      text:  'WAVE PROGRESS',
      style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: '#00d2ff', align: 'center' },
    })
    label.anchor.set(0.5, 0)
    label.position.set(W / 2, 16)
    this._uiRoot.addChild(label)

    // Kill counter number
    this._killText = new Text({
      text:  `0 / ${KILL_GOAL}`,
      style: { fontFamily: 'Arial', fontSize: 28, fontWeight: 'bold', fill: '#ffffff', align: 'center' },
    })
    this._killText.anchor.set(0.5, 0)
    this._killText.position.set(W / 2, 34)
    this._uiRoot.addChild(this._killText)

    // Progress bar track
    const PBAR_W = 220
    const trackBg = new Graphics()
    trackBg.rect(W / 2 - PBAR_W / 2, 66, PBAR_W, 6)
    trackBg.fill('#1a1a1a')
    trackBg.stroke({ color: '#333333', width: 1 })
    this._uiRoot.addChild(trackBg)

    // Progress bar fill
    this._killFill     = new Graphics()
    this._killBarX     = W / 2 - PBAR_W / 2
    this._killBarW     = PBAR_W
    this._lastKills    = -1
    this._uiRoot.addChild(this._killFill)
    this._drawKillBar(0)
  }

  _buildBossFightUI() {
    const HBAR_W = 420
    const PANEL_H = 44

    // Panel
    const bg = new Graphics()
    bg.rect(W / 2 - HBAR_W / 2 - 8, 8, HBAR_W + 16, PANEL_H)
    bg.fill({ color: 0x000000, alpha: 0.7 })
    bg.stroke({ color: '#3a0000', width: 1 })
    this._uiRoot.addChild(bg)

    // Boss name
    const nameText = new Text({
      text:  'Illidan Stormrage',
      style: { fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: '#ff4444', align: 'center' },
    })
    nameText.anchor.set(0.5, 0)
    nameText.position.set(W / 2, 12)
    this._uiRoot.addChild(nameText)

    // HP bar track
    const track = new Graphics()
    track.rect(W / 2 - HBAR_W / 2, 30, HBAR_W, 14)
    track.fill('#1a0000')
    track.stroke({ color: '#550000', width: 1 })
    this._uiRoot.addChild(track)

    // HP bar fill
    this._bossHpFill    = new Graphics()
    this._bossBarX      = W / 2 - HBAR_W / 2
    this._bossBarW      = HBAR_W
    this._lastBossHpPct = -1
    this._uiRoot.addChild(this._bossHpFill)
    this._drawBossHpFill(1.0)
  }

  // ── Dynamic draw helpers ──────────────────────────────────────────────────

  _drawKillBar(pct) {
    if (!this._killFill) return
    this._killFill.clear()
    if (pct > 0) {
      this._killFill.rect(this._killBarX, 66, this._killBarW * pct, 6)
      this._killFill.fill(pct >= 1 ? '#f1c40f' : '#00d2ff')
    }
  }

  _drawBossHpFill(pct) {
    if (!this._bossHpFill) return
    this._bossHpFill.clear()
    if (pct > 0) {
      const color = pct > 0.6 ? '#e74c3c' : pct > 0.3 ? '#e67e22' : '#c0392b'
      this._bossHpFill.rect(this._bossBarX, 30, this._bossBarW * pct, 14)
      this._bossHpFill.fill(color)
    }
  }
}
