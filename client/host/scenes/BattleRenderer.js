/**
 * client/host/scenes/BattleRenderer.js
 *
 * Canvas display for combat phases (trashMob and bossFight).
 *
 * - trashMob:  shows kill counter progress bar
 * - bossFight: shows boss HP bar
 *
 * Extends BaseRenderer — only contains battle-specific logic:
 *   boss, minion, tombstone rendering; hit sparks; aura sync; mode UI.
 */

import { Container, Graphics, Text } from 'pixi.js'
import { GAME_CONFIG }  from '../../../shared/GameConfig.js'
import { CLASSES }      from '../../../shared/ClassConfig.js'
import BossSprite       from '../entities/BossSprite.js'
import BaseRenderer     from './BaseRenderer.js'

const { CANVAS_WIDTH: W, CANVAS_HEIGHT: H } = GAME_CONFIG
const KILL_GOAL = GAME_CONFIG.ENEMY_KILL_GOAL

export default class BattleRenderer extends BaseRenderer {
  constructor(game, mode) {
    super(game)
    this.mode = mode   // 'trashMob' | 'bossFight'

    // Sub-containers in Z order: minions behind enemies behind boss; players on top
    this.minionContainer = new Container()
    this.enemyContainer  = new Container()
    this.bossContainer   = new Container()
    this._entityRoot.addChild(this.minionContainer, this.enemyContainer, this.bossContainer)

    this.bossSprite   = null
    this.tombstoneGfx = new Map()   // playerId → Graphics

    // Previous-frame HP tracking for hit sparks and death bursts
    this._prevPlayerHp = {}
  }

  // ── Container routing ──────────────────────────────────────────────────────

  /** Route enemy sprites into the dedicated sub-container (behind boss/players). */
  get _enemyContainer() { return this.enemyContainer }

  /** Route minion graphics into the dedicated sub-container (behind enemies). */
  get _minionContainer() { return this.minionContainer }

  // ── Lifecycle hooks ────────────────────────────────────────────────────────

  _onBeforeExit() {
    if (this.bossSprite) {
      this.bossSprite.destroy()
      this.bossSprite = null
    }
    this.tombstoneGfx.forEach(gfx => gfx.destroy())
    this.tombstoneGfx.clear()

    this._prevPlayerHp = {}
  }

  _resetUIRefs() {
    this._killText      = null
    this._killFill      = null
    this._killBarX      = 0
    this._killBarW      = 0
    this._bossHpFill    = null
    this._bossBarX      = 0
    this._bossBarW      = 0
    this._lastKills     = -1
    this._lastBossHpPct = -1
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
      this.vfx.auras.sync(p.id, sprite.container, p.effects, GAME_CONFIG.PLAYER_RADIUS)
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
    return null
  }

  // ── Extra per-frame sync: boss, minions, tombstones ────────────────────────

  _syncExtras(dt) {
    super._syncExtras(dt)   // syncs minions via base _syncMinions()

    const state = this.game.knownState

    // Boss
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

    // Tombstones
    const activeTombIds = new Set((state.tombstones ?? []).map(t => t.id))

    for (const tomb of (state.tombstones ?? [])) {
      if (!this.tombstoneGfx.has(tomb.id)) {
        const gfx = new Graphics()
        this.tombstoneGfx.set(tomb.id, gfx)
        this._uiRoot.addChild(gfx)
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
        this._uiRoot.removeChild(gfx)
        gfx.destroy()
        this.tombstoneGfx.delete(id)
      }
    })
  }

  // ── UI update ──────────────────────────────────────────────────────────────

  _updateUI(dt, activePlayerIds) {
    const state = this.game.knownState

    if (this.mode === 'trashMob' && this._killText) {
      const kills = state.killCount ?? 0
      if (kills !== this._lastKills) {
        this._lastKills = kills
        this._killText.text = `${kills} / ${KILL_GOAL}`
        this._drawKillBar(kills / KILL_GOAL)
      }
    }

    if (this.mode === 'bossFight' && this._bossHpFill && state.boss) {
      const pct = state.boss.hp / (state.boss.maxHp || 1)
      if (pct !== this._lastBossHpPct) {
        this._lastBossHpPct = pct
        this._drawBossHpFill(pct)
      }
    }
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
    if (this.mode === 'trashMob') this._buildTrashMobUI()
    else                          this._buildBossFightUI()
  }

  _buildTrashMobUI() {
    const PANEL_W = 260
    const PANEL_H = 68

    const bg = new Graphics()
    bg.rect(W / 2 - PANEL_W / 2, 8, PANEL_W, PANEL_H)
    bg.fill({ color: 0x000000, alpha: 0.65 })
    bg.stroke({ color: '#1e3a4a', width: 1 })
    this._uiRoot.addChild(bg)

    const label = new Text({
      text:  'WAVE PROGRESS',
      style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: '#00d2ff', align: 'center' },
    })
    label.anchor.set(0.5, 0)
    label.position.set(W / 2, 16)
    this._uiRoot.addChild(label)

    this._killText = new Text({
      text:  `0 / ${KILL_GOAL}`,
      style: { fontFamily: 'Arial', fontSize: 28, fontWeight: 'bold', fill: '#ffffff', align: 'center' },
    })
    this._killText.anchor.set(0.5, 0)
    this._killText.position.set(W / 2, 34)
    this._uiRoot.addChild(this._killText)

    const PBAR_W = 220
    const trackBg = new Graphics()
    trackBg.rect(W / 2 - PBAR_W / 2, 66, PBAR_W, 6)
    trackBg.fill('#1a1a1a')
    trackBg.stroke({ color: '#333333', width: 1 })
    this._uiRoot.addChild(trackBg)

    this._killFill  = new Graphics()
    this._killBarX  = W / 2 - PBAR_W / 2
    this._killBarW  = PBAR_W
    this._lastKills = -1
    this._uiRoot.addChild(this._killFill)
    this._drawKillBar(0)
  }

  _buildBossFightUI() {
    const HBAR_W  = 420
    const PANEL_H = 44

    const bg = new Graphics()
    bg.rect(W / 2 - HBAR_W / 2 - 8, 8, HBAR_W + 16, PANEL_H)
    bg.fill({ color: 0x000000, alpha: 0.7 })
    bg.stroke({ color: '#3a0000', width: 1 })
    this._uiRoot.addChild(bg)

    const nameText = new Text({
      text:  'Illidan Stormrage',
      style: { fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: '#ff4444', align: 'center' },
    })
    nameText.anchor.set(0.5, 0)
    nameText.position.set(W / 2, 12)
    this._uiRoot.addChild(nameText)

    const track = new Graphics()
    track.rect(W / 2 - HBAR_W / 2, 30, HBAR_W, 14)
    track.fill('#1a0000')
    track.stroke({ color: '#550000', width: 1 })
    this._uiRoot.addChild(track)

    this._bossHpFill    = new Graphics()
    this._bossBarX      = W / 2 - HBAR_W / 2
    this._bossBarW      = HBAR_W
    this._lastBossHpPct = -1
    this._uiRoot.addChild(this._bossHpFill)
    this._drawBossHpFill(1.0)
  }

  // ── Dynamic draw helpers ───────────────────────────────────────────────────

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
