/**
 * client/host/scenes/BattleRenderer.js
 *
 * Canvas display for all combat levels.
 *
 * Supports multiple objective types driven by level config:
 *   - killCount  → progress bar
 *   - survive    → countdown timer
 *   - killBoss   → boss HP bar
 *
 * Extends BaseRenderer — only contains battle-specific logic:
 *   boss, minion, tombstone rendering; hit sparks; aura sync; mode UI.
 */

import { Container, Graphics } from 'pixi.js'
import { GAME_CONFIG }  from '../../../shared/GameConfig.js'
import { CLASSES }      from '../../../shared/ClassConfig.js'
import BossSprite       from '../entities/BossSprite.js'
import BaseRenderer     from './BaseRenderer.js'

export default class BattleRenderer extends BaseRenderer {
  constructor(game, mode) {
    super(game)
    this.mode = mode   // 'battle' | 'bossFight'

    // Sub-containers in Z order: minions behind enemies behind boss; players on top
    this.minionContainer = new Container()
    this.enemyContainer  = new Container()
    this.bossContainer   = new Container()
    this._entityRoot.addChild(this.minionContainer, this.enemyContainer, this.bossContainer)

    this.bossSprite   = null
    this.tombstoneGfx = new Map()   // playerId → Graphics
    this.gateGfx      = new Map()   // gateId → Graphics

    // Previous-frame HP tracking for hit sparks and death bursts
    this._prevPlayerHp = {}

    // Level metadata (set from outside via setLevelMeta before enter, or via event)
    this._levelMeta = null

    // Objective progress received from server
    this._objectives = []
  }

  /** Called by HostGame before enter() to pass level-specific data. */
  setLevelMeta(meta) {
    this._levelMeta = meta
    this._objectives = meta?.objectives ?? []
  }

  /** Called each time the server sends OBJECTIVE_UPDATE. */
  updateObjectives(objectives) {
    this._objectives = objectives ?? []
  }

  // ── Container routing ──────────────────────────────────────────────────────

  get _enemyContainer() { return this.enemyContainer }
  get _minionContainer() { return this.minionContainer }

  // ── Lifecycle hooks ────────────────────────────────────────────────────────

  _onBeforeExit() {
    if (this.bossSprite) {
      this.bossSprite.destroy()
      this.bossSprite = null
    }
    this.tombstoneGfx.forEach(gfx => gfx.destroy())
    this.tombstoneGfx.clear()
    this.gateGfx.forEach(gfx => gfx.destroy())
    this.gateGfx.clear()

    this._prevPlayerHp = {}
    this._levelMeta = null
    this._objectives = []
  }

  _resetUIRefs() {
    // Battle status is rendered in the host DOM layout.
  }

  // ── Per-player hooks ───────────────────────────────────────────────────────

  _onPlayerSync(p, sprite, pos, dt) {
    const prevHp = this._prevPlayerHp[p.id]

    if (prevHp != null && p.hp < prevHp && !p.isDead) {
      const color = CLASSES[p.className]?.color ?? '#ffffff'
      this.vfx?.particles.hitSpark(pos.x, pos.y, color)
    }
    if (prevHp != null && prevHp > 0 && p.isDead) {
      const color = CLASSES[p.className]?.color ?? '#ffffff'
      this.vfx?.triggerDeath(pos.x, pos.y, color)
    }
    this._prevPlayerHp[p.id] = p.hp

    if (this.vfx && p.effects) {
      this.vfx.auras.sync(p.id, sprite.container, p.effects, this.game.getPlayerRadius())
    }
  }

  _onPlayerRemoved(id) {
    this.vfx?.auras.removeEntity(id)
  }

  // ── Enemy hooks ────────────────────────────────────────────────────────────

  _onEnemyRemoved(sprite, id) {
    const pos = sprite.container.position
    this.vfx?.triggerDeath(pos.x, pos.y, 0xc0392b)
  }

  // ── Position resolution overrides ─────────────────────────────────────────

  _resolveBeamTarget(targetId) {
    const base = super._resolveBeamTarget(targetId)
    if (base) return base
    if (targetId === 'boss' && this.bossSprite) {
      return { x: this.bossSprite.container.x, y: this.bossSprite.container.y }
    }
    // Gate targets
    const gate = (this.game.knownState.gates ?? []).find(g => g.id === targetId)
    if (gate && !gate.isDead) return { x: gate.x, y: gate.y }
    return null
  }

  _resolveTargetPosition(targetId) {
    const base = super._resolveTargetPosition(targetId)
    if (base) return base
    if (this.bossSprite) {
      const state = this.game.knownState
      if (state.boss && (state.boss.id === targetId || targetId === 'boss')) {
        return { x: this.bossSprite.container.x, y: this.bossSprite.container.y }
      }
    }
    // Gate targets
    const gate = (this.game.knownState.gates ?? []).find(g => g.id === targetId)
    if (gate && !gate.isDead) return { x: gate.x, y: gate.y }
    return null
  }

  // ── Extra per-frame sync: boss, minions, tombstones ────────────────────────

  _syncExtras(dt) {
    super._syncExtras(dt)

    const state = this.game.knownState

    // Boss
    if (state.boss && !state.boss.isDead) {
      if (!this.bossSprite) {
        this.bossSprite = new BossSprite()
        this.bossContainer.addChild(this.bossSprite.container)
      }
      this.bossSprite.update(state.boss)
    }
    if (state.boss?.isDead && this.bossSprite) {
      this.bossContainer.removeChild(this.bossSprite.container)
      this.bossSprite.destroy()
      this.bossSprite = null
    }

    // Tombstones
    const activeTombIds = new Set((state.tombstones ?? []).map(t => t.id))

    for (const tomb of (state.tombstones ?? [])) {
      if (!this.tombstoneGfx.has(tomb.id)) {
        const gfx = new Graphics()
        this.tombstoneGfx.set(tomb.id, gfx)
        this._entityRoot.addChild(gfx)
      }
      const gfx = this.tombstoneGfx.get(tomb.id)
      gfx.clear()
      gfx.rect(tomb.x - 3, tomb.y - 20, 6, 24)
      gfx.rect(tomb.x - 10, tomb.y - 14, 20, 6)
      gfx.fill({ color: 0x888888, alpha: 0.8 })
      if (tomb.progress > 0) {
        gfx.arc(tomb.x, tomb.y + 14, 14, -Math.PI / 2, -Math.PI / 2 + tomb.progress * Math.PI * 2)
        gfx.stroke({ color: 0x00ff88, width: 3 })
      }
    }

    this.tombstoneGfx.forEach((gfx, id) => {
      if (!activeTombIds.has(id)) {
        this._entityRoot.removeChild(gfx)
        gfx.destroy()
        this.tombstoneGfx.delete(id)
      }
    })

    // Gates
    const gates = state.gates ?? []
    const activeGateIds = new Set(gates.map(g => g.id))

    for (const gate of gates) {
      if (gate.isDead) {
        // Remove destroyed gates
        if (this.gateGfx.has(gate.id)) {
          this._entityRoot.removeChild(this.gateGfx.get(gate.id))
          this.gateGfx.get(gate.id).destroy()
          this.gateGfx.delete(gate.id)
        }
        continue
      }

      if (!this.gateGfx.has(gate.id)) {
        const gfx = new Graphics()
        this.gateGfx.set(gate.id, gfx)
        this._entityRoot.addChild(gfx)
      }

      const gfx = this.gateGfx.get(gate.id)
      const r = gate.radius ?? 24
      const hpPct = gate.hp / (gate.maxHp || 1)

      gfx.clear()

      // Gate body — glowing circle
      const bodyColor = gate.isActive ? 0xff4444 : 0x666666
      gfx.circle(gate.x, gate.y, r)
      gfx.fill({ color: bodyColor, alpha: 0.7 })
      gfx.circle(gate.x, gate.y, r)
      gfx.stroke({ color: gate.isActive ? 0xff8888 : 0x999999, width: 3 })

      // HP bar above gate
      const barW = r * 2.5
      const barH = 5
      const barX = gate.x - barW / 2
      const barY = gate.y - r - 12
      gfx.rect(barX, barY, barW, barH)
      gfx.fill({ color: 0x111111, alpha: 0.8 })
      if (hpPct > 0) {
        const hpColor = hpPct > 0.5 ? 0xe74c3c : hpPct > 0.25 ? 0xe67e22 : 0xc0392b
        gfx.rect(barX, barY, barW * hpPct, barH)
        gfx.fill(hpColor)
      }
      gfx.rect(barX, barY, barW, barH)
      gfx.stroke({ color: 0x333333, width: 1 })
    }

    // Remove stale gate graphics
    this.gateGfx.forEach((gfx, id) => {
      if (!activeGateIds.has(id)) {
        this._entityRoot.removeChild(gfx)
        gfx.destroy()
        this.gateGfx.delete(id)
      }
    })
  }

  // ── UI update ──────────────────────────────────────────────────────────────

  _updateUI(dt, activePlayerIds) {
    // Battle status is handled outside the canvas.
  }

  // ── Event handler override ─────────────────────────────────────────────────

  onChannelInterrupted(data) {
    const sprite = this.playerSprites.get(data.playerId)
    if (sprite && this.vfx) {
      const { x, y } = sprite.container
      this.vfx.triggerImpact(x, y, '#ff4444')
    }
  }

  // ── UI construction ────────────────────────────────────────────────────────

  _buildUI() {
    this._uiRoot.removeChildren()
  }
}
