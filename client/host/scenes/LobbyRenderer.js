/**
 * client/host/scenes/LobbyRenderer.js
 *
 * Canvas display for the lobby phase.
 * Shows all connected players wandering freely (skill practice).
 * The DOM sidebar handles player list + QR code + start button.
 */

import { Container, Graphics, Text } from 'pixi.js'
import { GAME_CONFIG }    from '../../../shared/GameConfig.js'
import PlayerSprite       from '../entities/PlayerSprite.js'
import EnemySprite        from '../entities/EnemySprite.js'
import ProjectileSprite   from '../entities/ProjectileSprite.js'
import VFXManager         from '../systems/VFXManager.js'

export default class LobbyRenderer {
  constructor(game) {
    this.game          = game
    this.playerSprites = new Map()   // id → PlayerSprite
    this.enemySprites  = new Map()   // id → EnemySprite
    this.projSprites   = new Map()   // id → ProjectileSprite

    // Root containers for this renderer's content
    this._entityRoot          = new Container()
    this._uiRoot              = new Container()
    this._projectileContainer = new Container()

    // Beam rendering graphics (flash beams + persistent channel beams)
    this._beamGfx    = new Graphics()
    this._flashBeams = []   // [{ x1, y1, x2, y2, color, expiresAt }]
    this._beamTime   = 0

    this.minionGfx      = new Map()   // minionId → Graphics (simple drawn shapes)

  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  enter() {
    this.game.layers.entities.addChild(this._entityRoot)
    this.game.layers.fx.addChild(this._projectileContainer)
    this.game.layers.ui.addChild(this._uiRoot)
    this.vfx = new VFXManager(this.game.layers)
    this.game.layers.fx.addChild(this._beamGfx)
    this._buildUI()
  }

  exit() {
    this.playerSprites.forEach(s => s.destroy())
    this.playerSprites.clear()

    this.enemySprites.forEach(s => s.destroy())
    this.enemySprites.clear()

    this.projSprites.forEach(s => s.destroy())
    this.projSprites.clear()

    if (this.vfx) { this.vfx.destroy(); this.vfx = null }
    this.game.layers.fx.removeChild(this._beamGfx)
    this._beamGfx.clear()
    this._flashBeams = []

    this.game.layers.entities.removeChild(this._entityRoot)
    this.game.layers.fx.removeChild(this._projectileContainer)
    this.game.layers.ui.removeChild(this._uiRoot)

    this._entityRoot.removeChildren()
    this._uiRoot.removeChildren()
    this._countText = null
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update(dt = 0.016) {
    const players    = this.game.knownState.players
    const activeIds  = new Set()

    Object.values(players).forEach(p => {
      if (p.isHost) return
      activeIds.add(p.id)

      // Create sprite on first appearance
      if (!this.playerSprites.has(p.id)) {
        const sprite = new PlayerSprite(p)
        this.playerSprites.set(p.id, sprite)
        this._entityRoot.addChild(sprite.container)
      }

      // Update with interpolated position
      const pos = this.game.getRenderPos(p)
      this.playerSprites.get(p.id).update(p, pos)
    })

    // Remove sprites for disconnected players
    this.playerSprites.forEach((sprite, id) => {
      if (!activeIds.has(id)) {
        this._entityRoot.removeChild(sprite.container)
        sprite.destroy()
        this.playerSprites.delete(id)
      }
    })

    // ── Update training dummy / enemies ────────────────────────────────────
    const activeEnemyIds = new Set((this.game.knownState.enemies ?? []).map(e => e.id))

    for (const e of (this.game.knownState.enemies ?? [])) {
      if (!this.enemySprites.has(e.id)) {
        const s = new EnemySprite(e)
        if (e.isDummy) s.container.tint = 0xf1c40f   // gold tint for training dummy
        this.enemySprites.set(e.id, s)
        this._entityRoot.addChild(s.container)
      }
      this.enemySprites.get(e.id).update(e)
    }

    this.enemySprites.forEach((s, id) => {
      if (!activeEnemyIds.has(id)) {
        this._entityRoot.removeChild(s.container)
        s.destroy()
        this.enemySprites.delete(id)
      }
    })

    // ── Update projectiles ─────────────────────────────────────────────────
    const activeProjIds = new Set((this.game.knownState.projectiles ?? []).map(p => p.id))

    for (const proj of (this.game.knownState.projectiles ?? [])) {
      if (!this.projSprites.has(proj.id)) {
        const s = new ProjectileSprite(proj)
        this.projSprites.set(proj.id, s)
        this._projectileContainer.addChild(s.container)
      }
      this.projSprites.get(proj.id).update(proj)
    }

    this.projSprites.forEach((s, id) => {
      if (!activeProjIds.has(id)) {
        this._projectileContainer.removeChild(s.container)
        s.destroy()
        this.projSprites.delete(id)
      }
    })

    // Draw persistent channel beams (Drain Life etc.) + timed flash beams
    this._beamTime = (this._beamTime + dt) % 10
    this._beamGfx.clear()
    Object.values(players).forEach(p => {
      if (p.isHost || p.isDead || !p.beamTargetId) return
      const srcSprite = this.playerSprites.get(p.id)
      if (!srcSprite) return
      let tx, ty
      const enemySprite = this.enemySprites.get(p.beamTargetId)
      if (enemySprite) { tx = enemySprite.container.x; ty = enemySprite.container.y }
      if (tx == null) return
      const sx = srcSprite.container.x
      const sy = srcSprite.container.y
      const t = this._beamTime
      const pulse = 0.55 + 0.2 * Math.sin(t * 8)
      this._beamGfx.moveTo(sx, sy)
      this._beamGfx.lineTo(tx, ty)
      this._beamGfx.stroke({ color: 0x00ff88, width: 6, alpha: 0.18 })
      this._beamGfx.moveTo(sx, sy)
      this._beamGfx.lineTo(tx, ty)
      this._beamGfx.stroke({ color: 0x00ff88, width: 2.5, alpha: pulse })
      this._beamGfx.moveTo(sx, sy)
      this._beamGfx.lineTo(tx, ty)
      this._beamGfx.stroke({ color: 0xffffff, width: 1, alpha: pulse * 0.55 })
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
    const now = Date.now()
    this._flashBeams = this._flashBeams.filter(b => b.expiresAt > now)
    this._flashBeams.forEach(b => {
      const c = parseInt(b.color.replace('#', ''), 16)
      this._beamGfx.moveTo(b.x1, b.y1)
      this._beamGfx.lineTo(b.x2, b.y2)
      this._beamGfx.stroke({ width: 2, color: c, alpha: 0.8 })
    })

    // Tick VFX animations
    this.vfx?.update(dt)

    // Update player count text
    if (this._countText) {
      const n = activeIds.size
      this._countText.text = n === 0
        ? 'Waiting for players to join…'
        : `${n} player${n !== 1 ? 's' : ''} connected — waiting to start`
    }
  }

  // ── Reactive hooks (called by HostGame) ───────────────────────────────────

  onPlayerAdded(p) {
    if (p.isHost || this.playerSprites.has(p.id)) return
    const sprite = new PlayerSprite(p)
    this.playerSprites.set(p.id, sprite)
    this._entityRoot.addChild(sprite.container)
  }

  onPlayerRemoved(id) {
    const sprite = this.playerSprites.get(id)
    if (!sprite) return
    this._entityRoot.removeChild(sprite.container)
    sprite.destroy()
    this.playerSprites.delete(id)
  }

  // ── VFX event handlers (called from main.js via socket events) ────────────

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
      }
    }

    if (x != null && y != null) {
      this.vfx.spawnDamageNumber(x, y - 20, amount, type)
    }
  }

  // ── Private UI builder ────────────────────────────────────────────────────

  _buildUI() {
    const { CANVAS_WIDTH: W, CANVAS_HEIGHT: H } = GAME_CONFIG

    // Title bar
    const title = new Text({
      text:  'LOBBY  —  Practice your skills!',
      style: {
        fontFamily: 'Arial',
        fontSize:   26,
        fontWeight: 'bold',
        fill:       '#00d2ff',
        align:      'center',
      },
    })
    title.anchor.set(0.5, 0)
    title.position.set(W / 2, 14)
    this._uiRoot.addChild(title)

    // Player count / status line
    this._countText = new Text({
      text:  'Waiting for players to join…',
      style: { fontFamily: 'Arial', fontSize: 15, fill: '#7fa8c0', align: 'center' },
    })
    this._countText.anchor.set(0.5, 0)
    this._countText.position.set(W / 2, 52)
    this._uiRoot.addChild(this._countText)

    // Bottom hint
    const hint = new Text({
      text:  'Move with the left joystick  ·  Aim skills with the right buttons',
      style: { fontFamily: 'Arial', fontSize: 13, fill: '#334455', align: 'center' },
    })
    hint.anchor.set(0.5, 1)
    hint.position.set(W / 2, H - 14)
    this._uiRoot.addChild(hint)
  }
}
