/**
 * client/host/scenes/BaseRenderer.js
 *
 * Base class for all host canvas scene renderers (Template Method pattern).
 *
 * `enter`, `exit`, and `update` are fully implemented here. They call
 * protected hooks at well-defined points that subclasses override to add
 * scene-specific behaviour without duplicating shared infrastructure.
 *
 * Lifecycle contract (called by HostGame):
 *   enter()    — mount containers, create VFX, build UI via _buildUI()
 *   exit()     — teardown sprites/VFX, unmount containers
 *   update(dt) — per-frame entity sync + render pipeline
 *
 * Event handlers (called by main.js via HostGame.activeRenderer):
 *   onSkillFired(data)
 *   onEffectDamage(data)
 *   onTargetedHit(data)
 *   onChannelInterrupted(data)  [no-op in base]
 *   onPlayerAdded(p)
 *   onPlayerRemoved(id)
 */

import { Container, Graphics } from 'pixi.js'
import PlayerSprite     from '../entities/PlayerSprite.js'
import EnemySprite      from '../entities/EnemySprite.js'
import ProjectileSprite from '../entities/ProjectileSprite.js'
import VFXManager       from '../systems/VFXManager.js'

export default class BaseRenderer {
  constructor(game) {
    this.game          = game
    this.playerSprites = new Map()   // id → PlayerSprite
    this.enemySprites  = new Map()   // id → EnemySprite
    this.projSprites   = new Map()   // id → ProjectileSprite

    this._entityRoot          = new Container()
    this._uiRoot              = new Container()
    this._projectileContainer = new Container()

    this._beamGfx    = new Graphics()
    this._flashBeams = []   // [{ x1, y1, x2, y2, color, expiresAt }]
    this._beamTime   = 0

    this.minionGfx = new Map()   // minionId → Container (drawn shapes)

    this.vfx = null
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  enter() {
    this.game.layers.entities.addChild(this._entityRoot)
    this.game.layers.fx.addChild(this._projectileContainer)
    this.game.layers.ui.addChild(this._uiRoot)
    this.vfx = new VFXManager(this.game.layers)
    this.game.layers.fx.addChild(this._beamGfx)
    this._buildUI()
  }

  resize() {
    this._uiRoot.removeChildren()
    this._resetUIRefs()
    this._buildUI()
  }

  exit() {
    this._onBeforeExit()

    this.playerSprites.forEach(s => s.destroy())
    this.playerSprites.clear()

    this.enemySprites.forEach(s => s.destroy())
    this.enemySprites.clear()

    this.projSprites.forEach(s => s.destroy())
    this.projSprites.clear()

    this.minionGfx.forEach(gfx => gfx.destroy({ children: true }))
    this.minionGfx.clear()

    if (this.vfx) { this.vfx.destroy(); this.vfx = null }
    this.game.layers.fx.removeChild(this._beamGfx)
    this._beamGfx.clear()
    this._flashBeams = []

    this.game.layers.entities.removeChild(this._entityRoot)
    this.game.layers.fx.removeChild(this._projectileContainer)
    this.game.layers.ui.removeChild(this._uiRoot)

    this._uiRoot.removeChildren()

    this._resetUIRefs()
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  update(dt = 0.016) {
    const activeIds = this._syncPlayers(dt)
    this._syncEnemies()
    this._syncProjectiles()
    this._syncExtras(dt)
    this._renderBeams(dt)
    this._updateVFX(dt)
    this._updateUI(dt, activeIds)
  }

  // ── Sync helpers ───────────────────────────────────────────────────────────

  _syncPlayers(dt) {
    const players   = this.game.knownState.players
    const activeIds = new Set()

    Object.values(players).forEach(p => {
      if (p.isHost) return
      activeIds.add(p.id)

      if (!this.playerSprites.has(p.id)) {
        const sprite = new PlayerSprite(p)
        this.playerSprites.set(p.id, sprite)
        this._entityRoot.addChild(sprite.container)
      }

      const pos    = this.game.getRenderPos(p)
      const sprite = this.playerSprites.get(p.id)
      sprite.update(p, pos, dt)
      this._onPlayerSync(p, sprite, pos, dt)
    })

    this.playerSprites.forEach((sprite, id) => {
      if (!activeIds.has(id)) {
        this._onPlayerRemoved(id)
        this._entityRoot.removeChild(sprite.container)
        sprite.destroy()
        this.playerSprites.delete(id)
      }
    })

    return activeIds
  }

  _syncEnemies() {
    const enemies   = this.game.knownState.enemies ?? []
    const activeIds = new Set(enemies.map(e => e.id))

    for (const e of enemies) {
      if (!this.enemySprites.has(e.id)) {
        const s = new EnemySprite(e)
        this.enemySprites.set(e.id, s)
        this._enemyContainer.addChild(s.container)
        this._onEnemyCreated(e, s)
      }
      this.enemySprites.get(e.id).update(e)
    }

    this.enemySprites.forEach((s, id) => {
      if (!activeIds.has(id)) {
        this._onEnemyRemoved(s, id)
        this._enemyContainer.removeChild(s.container)
        s.destroy()
        this.enemySprites.delete(id)
      }
    })
  }

  _syncProjectiles() {
    const projectiles = this.game.knownState.projectiles ?? []
    const activeIds   = new Set(projectiles.map(p => p.id))

    for (const proj of projectiles) {
      if (!this.projSprites.has(proj.id)) {
        const s = new ProjectileSprite(proj)
        this.projSprites.set(proj.id, s)
        this._projectileContainer.addChild(s.container)
      }
      this.projSprites.get(proj.id).update(proj)
    }

    this.projSprites.forEach((s, id) => {
      if (!activeIds.has(id)) {
        this._projectileContainer.removeChild(s.container)
        s.destroy()
        this.projSprites.delete(id)
      }
    })
  }

  _renderBeams(dt) {
    const state = this.game.knownState
    this._beamTime = (this._beamTime + dt) % 10
    this._beamGfx.clear()

    Object.values(state.players).forEach(p => {
      if (p.isHost || p.isDead || !p.beamTargetId) return
      const srcSprite = this.playerSprites.get(p.id)
      if (!srcSprite) return

      const target = this._resolveBeamTarget(p.beamTargetId)
      if (!target) return

      const { x: tx, y: ty } = target
      const sx    = srcSprite.container.x
      const sy    = srcSprite.container.y
      const t     = this._beamTime
      const pulse = 0.55 + 0.2 * Math.sin(t * 8)

      // Outer glow
      this._beamGfx.moveTo(sx, sy)
      this._beamGfx.lineTo(tx, ty)
      this._beamGfx.stroke({ color: 0x00ff88, width: 6, alpha: 0.18 })

      // Core beam
      this._beamGfx.moveTo(sx, sy)
      this._beamGfx.lineTo(tx, ty)
      this._beamGfx.stroke({ color: 0x00ff88, width: 2.5, alpha: pulse })

      // White core
      this._beamGfx.moveTo(sx, sy)
      this._beamGfx.lineTo(tx, ty)
      this._beamGfx.stroke({ color: 0xffffff, width: 1, alpha: pulse * 0.55 })

      // Flowing dots (life being drained — travels from target to caster)
      const dx = sx - tx
      const dy = sy - ty
      for (let i = 0; i < 5; i++) {
        const frac = ((i / 5) + t * 0.35) % 1
        const px   = tx + dx * frac
        const py   = ty + dy * frac
        const a    = Math.sin(frac * Math.PI) * 0.85
        this._beamGfx.circle(px, py, 3)
        this._beamGfx.fill({ color: 0x00ff88, alpha: a })
      }
    })

    // Flash beams (chain heals, targeted hits) — fade after 300 ms
    const now = Date.now()
    this._flashBeams = this._flashBeams.filter(b => b.expiresAt > now)
    this._flashBeams.forEach(b => {
      const c = parseInt(b.color.replace('#', ''), 16)
      this._beamGfx.moveTo(b.x1, b.y1)
      this._beamGfx.lineTo(b.x2, b.y2)
      this._beamGfx.stroke({ width: 2, color: c, alpha: 0.8 })
    })
  }

  _syncMinions() {
    const minions   = this.game.knownState.minions ?? []
    const activeIds = new Set(minions.map(m => m.id))

    for (const m of minions) {
      if (!this.minionGfx.has(m.id)) {
        const gfx = this._createMinionGfx(m)
        this.minionGfx.set(m.id, gfx)
        this._minionContainer.addChild(gfx)
      }
      this._updateMinionGfx(this.minionGfx.get(m.id), m)
    }

    this.minionGfx.forEach((gfx, id) => {
      if (!activeIds.has(id)) {
        this._minionContainer.removeChild(gfx)
        gfx.destroy({ children: true })
        this.minionGfx.delete(id)
      }
    })
  }

  _updateVFX(dt) {
    const state = this.game.knownState
    this.vfx?.ground.sync(state.aoeZones ?? [])
    this.vfx?.update(dt)
  }

  // ── Protected hooks (override in subclasses, no super call needed) ─────────

  /** @abstract — must be overridden to build scene UI elements into _uiRoot. */
  _buildUI() { throw new Error(`${this.constructor.name} must implement _buildUI()`) }

  /** Called at the start of exit(), before base teardown. Override for subclass-owned sprite cleanup. */
  _onBeforeExit() {}

  /** Called at the end of exit(). Override to null UI ref fields. */
  _resetUIRefs() {}

  /**
   * Called once per active player per frame, after sprite.update().
   * Override for hit sparks, death bursts, aura sync, etc.
   * @param {object} p — server player state
   * @param {PlayerSprite} sprite
   * @param {{ x: number, y: number }} pos — interpolated render position
   * @param {number} dt
   */
  _onPlayerSync(p, sprite, pos, dt) {}

  /**
   * Called when a player sprite is being destroyed (disconnect or fell out of state).
   * Override for aura cleanup, prevHp cleanup, etc.
   * @param {string} id
   */
  _onPlayerRemoved(id) {}

  /**
   * Called after a new EnemySprite is created and added to _enemyContainer.
   * Override to apply tints or other initial state (e.g. isDummy gold tint).
   * @param {object} enemy — server enemy state
   * @param {EnemySprite} sprite
   */
  _onEnemyCreated(enemy, sprite) {}

  /**
   * Called before an EnemySprite is destroyed (it left the server state).
   * Override for death VFX at last known position.
   * @param {EnemySprite} sprite
   * @param {string} id
   */
  _onEnemyRemoved(sprite, id) {}

  /**
   * Called from update() after _syncProjectiles(), before _renderBeams().
   * Default syncs minions via _syncMinions(). Override (calling super) to add
   * scene-specific sync (boss, tombstones, etc.).
   * @param {number} dt
   */
  _syncExtras(dt) {
    this._syncMinions()
  }

  /**
   * Called at the end of update() for scene-specific UI updates.
   * @param {number} dt
   * @param {Set<string>} activePlayerIds — IDs of non-host players currently in state
   */
  _updateUI(dt, activePlayerIds) {}

  /**
   * Resolve world coordinates for a channel beam target ID.
   * Override to add additional target types (e.g. boss).
   * @param {string} targetId
   * @returns {{ x: number, y: number } | null}
   */
  _resolveBeamTarget(targetId) {
    const s = this.enemySprites.get(targetId)
    return s ? { x: s.container.x, y: s.container.y } : null
  }

  /**
   * Resolve world coordinates for any entity by ID (used for damage numbers, etc.).
   * Override to add additional entity types (e.g. boss).
   * @param {string} targetId
   * @returns {{ x: number, y: number } | null}
   */
  _resolveTargetPosition(targetId) {
    const ps = this.playerSprites.get(targetId)
    if (ps) return { x: ps.container.x, y: ps.container.y }
    const es = this.enemySprites.get(targetId)
    if (es) return { x: es.container.x, y: es.container.y }
    return null
  }

  /**
   * The Container where new EnemySprites are added.
   * Override to route enemies into a sub-container (e.g. BattleRenderer.enemyContainer).
   * @returns {Container}
   */
  get _enemyContainer() { return this._entityRoot }

  /**
   * The Container where new minion Graphics are added.
   * Override to route minions into a sub-container (e.g. BattleRenderer.minionContainer).
   * @returns {Container}
   */
  get _minionContainer() { return this._entityRoot }

  /** Build a Container with drawn shapes for a minion. Subclasses may override for custom visuals. */
  _createMinionGfx(m) {
    const root  = new Container()
    const color = m.color ?? '#ffffff'

    if (m.minionType === 'TOTEM') {
      const pole = new Graphics()
      pole.rect(-3, -6, 6, 18)
      pole.fill(color)
      root.addChild(pole)

      const head = new Graphics()
      head.circle(0, -15, 9)
      head.fill(color)
      head.stroke({ color: '#ffffff', width: 2, alpha: 0.7 })
      root.addChild(head)

      const eye = new Graphics()
      eye.circle(0, -15, 4)
      eye.fill('#ffffff')
      root.addChild(eye)

      const base = new Graphics()
      base.rect(-8, 12, 16, 4)
      base.fill({ color: '#ffffff', alpha: 0.3 })
      root.addChild(base)

    } else if (m.minionType === 'TRAP') {
      const diamond = new Graphics()
      diamond.poly([0, -13, 13, 0, 0, 13, -13, 0])
      diamond.fill({ color, alpha: 0.5 })
      diamond.stroke({ color: '#ffdd00', width: 2.5 })
      root.addChild(diamond)

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

      const dot = new Graphics()
      dot.circle(0, 0, 3)
      dot.fill('#ffdd00')
      root.addChild(dot)

    } else if (m.minionType === 'PET') {
      const body = new Graphics()
      body.circle(0, 2, 11)
      body.fill(color)
      body.stroke({ color: '#ffffff', width: 2, alpha: 0.6 })
      root.addChild(body)

      const earL = new Graphics()
      earL.poly([-9, -5, -4, -14, -1, -5])
      earL.fill(color)
      earL.stroke({ color: '#ffffff', width: 1.5, alpha: 0.4 })
      root.addChild(earL)

      const earR = new Graphics()
      earR.poly([9, -5, 4, -14, 1, -5])
      earR.fill(color)
      earR.stroke({ color: '#ffffff', width: 1.5, alpha: 0.4 })
      root.addChild(earR)

      const hpBg = new Graphics()
      hpBg.rect(-12, 16, 24, 4)
      hpBg.fill('#111111')
      root.addChild(hpBg)

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

  // ── Event handlers (called from main.js via HostGame.activeRenderer) ───────

  onSkillFired(data) {
    this.vfx?.triggerSkillVFX(data)
  }

  onTargetedHit(data) {
    if (!this.vfx) return
    const { casterX, casterY, targetX, targetY, effectType, color } = data
    this._flashBeams.push({
      x1: casterX, y1: casterY,
      x2: targetX, y2: targetY,
      color: color ?? '#ffffff',
      expiresAt: Date.now() + 300,
    })
    const impactColor = effectType === 'heal' ? '#44ff44' : color
    this.vfx.triggerImpact(targetX, targetY, impactColor)
  }

  onEffectDamage(data) {
    if (!this.vfx) return
    const { targetId, amount, type } = data
    const pos = this._resolveTargetPosition(targetId)
    if (!pos) return
    this.vfx.spawnDamageNumber(pos.x, pos.y - 20, amount, type)
    // Add impact sparks for direct damage hits (AOE, melee, etc. that emit effect:damage)
    if (type === 'damage' && amount > 0) {
      this.vfx.particles.hitSpark(pos.x, pos.y, '#ff8844')
    }
  }

  /** No-op in base — override in renderers that support channel interruption. */
  onChannelInterrupted(data) {}

  onPlayerAdded(p) {
    if (p.isHost || this.playerSprites.has(p.id)) return
    const sprite = new PlayerSprite(p)
    this.playerSprites.set(p.id, sprite)
    this._entityRoot.addChild(sprite.container)
  }

  onPlayerRemoved(id) {
    const sprite = this.playerSprites.get(id)
    if (!sprite) return
    this._onPlayerRemoved(id)
    this._entityRoot.removeChild(sprite.container)
    sprite.destroy()
    this.playerSprites.delete(id)
  }
}
