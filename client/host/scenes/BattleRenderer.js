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

import { Container, Graphics, Text } from 'pixi.js'
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
    // Generic objective UI
    this._objPanel     = null
    this._objTitle     = null
    this._objText      = null
    this._objFill      = null
    this._objBarX      = 0
    this._objBarW      = 0

    // Boss HP bar (used when killBoss objective is present)
    this._bossHpFill    = null
    this._bossBarX      = 0
    this._bossBarW      = 0
    this._lastBossHpPct = -1

    // Level indicator
    this._levelLabel    = null

    this._lastObjVal    = -1
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
    const state = this.game.knownState

    // Update generic objective display
    if (this._objectives.length > 0) {
      const obj = this._objectives[0]  // primary objective

      if (obj.type === 'killCount') {
        const current = obj.current ?? 0
        const target  = obj.target  ?? 1
        if (current !== this._lastObjVal) {
          this._lastObjVal = current
          if (this._objText) this._objText.text = `${current} / ${target}`
          this._drawObjBar(current / target)
        }
      } else if (obj.type === 'survive') {
        const elapsed = obj.current ?? 0
        const total   = obj.durationMs ?? obj.target ?? 1
        const remaining = Math.max(0, total - elapsed)
        const secs = Math.ceil(remaining / 1000)
        if (secs !== this._lastObjVal) {
          this._lastObjVal = secs
          if (this._objText) this._objText.text = `${secs}s`
          this._drawObjBar(elapsed / total)
        }
      } else if (obj.type === 'surviveWaves') {
        const current = obj.current ?? 0
        const target  = obj.target  ?? 1
        if (current !== this._lastObjVal) {
          this._lastObjVal = current
          if (this._objText) this._objText.text = `${current} / ${target}`
          this._drawObjBar(current / target)
        }
      } else if (obj.type === 'destroyGates') {
        const current = obj.current ?? 0
        const target  = obj.target  ?? 1
        if (current !== this._lastObjVal) {
          this._lastObjVal = current
          if (this._objText) this._objText.text = `${current} / ${target}`
          this._drawObjBar(current / target)
        }
      } else if (obj.type === 'killAll') {
        const done = obj.current === 1
        const val  = done ? 1 : 0
        if (val !== this._lastObjVal) {
          this._lastObjVal = val
          if (this._objText) this._objText.text = done ? 'COMPLETE' : 'IN PROGRESS'
          this._drawObjBar(val)
        }
      } else if (obj.type === 'killBossProtectNPC') {
        const done = obj.current === 1
        const val  = done ? 1 : 0
        if (val !== this._lastObjVal) {
          this._lastObjVal = val
          if (this._objText) this._objText.text = done ? 'COMPLETE' : 'IN PROGRESS'
          this._drawObjBar(val)
        }
      }
    }

    // Boss HP bar (for killBoss objective)
    if (this._bossHpFill && state.boss) {
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
    const { width: W } = this.game.getScreenSize()
    const meta = this._levelMeta

    // Level indicator (top-right corner)
    if (meta) {
      this._levelLabel = new Text({
        text:  `Level ${(meta.levelIndex ?? 0) + 1} / ${meta.totalLevels ?? '?'}`,
        style: { fontFamily: 'Arial', fontSize: 13, fill: '#556677', align: 'right' },
      })
      this._levelLabel.anchor.set(1, 0)
      this._levelLabel.position.set(W - 12, 12)
      this._uiRoot.addChild(this._levelLabel)
    }

    // Build objective-specific UI
    const objectives = this._objectives
    if (!objectives.length) return

    const primary = objectives[0]

    if (primary.type === 'killBoss') {
      this._buildBossFightUI()
    } else {
      this._buildObjectiveUI(primary)
    }
  }

  _buildObjectiveUI(obj) {
    const { width: W } = this.game.getScreenSize()
    const PANEL_W = 260
    const PANEL_H = 68

    const bg = new Graphics()
    bg.rect(W / 2 - PANEL_W / 2, 8, PANEL_W, PANEL_H)
    bg.fill({ color: 0x000000, alpha: 0.65 })
    bg.stroke({ color: '#1e3a4a', width: 1 })
    this._uiRoot.addChild(bg)

    // Objective label
    let labelText = 'OBJECTIVE'
    if (obj.type === 'killCount') {
      labelText = obj.enemyTypes?.length
        ? `KILL ${obj.target} ${obj.enemyTypes.join(', ').toUpperCase()}`
        : 'WAVE PROGRESS'
    } else if (obj.type === 'survive') {
      labelText = 'SURVIVE'
    } else if (obj.type === 'surviveWaves') {
      labelText = 'SURVIVE THE WAVES'
    } else if (obj.type === 'destroyGates') {
      labelText = 'DESTROY THE GATES'
    } else if (obj.type === 'killAll') {
      labelText = 'DEFEAT ALL ENEMIES'
    } else if (obj.type === 'killBossProtectNPC') {
      labelText = 'PROTECT AKAMA'
    }

    const label = new Text({
      text:  labelText,
      style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: '#00d2ff', align: 'center' },
    })
    label.anchor.set(0.5, 0)
    label.position.set(W / 2, 16)
    this._uiRoot.addChild(label)

    // Counter / timer text
    let initialText = '0'
    if (obj.type === 'killCount') {
      initialText = `0 / ${obj.target ?? '?'}`
    } else if (obj.type === 'survive') {
      const secs = Math.ceil((obj.durationMs ?? obj.target ?? 0) / 1000)
      initialText = `${secs}s`
    } else if (obj.type === 'surviveWaves') {
      initialText = `0 / ${obj.target ?? '?'}`
    } else if (obj.type === 'destroyGates') {
      initialText = `0 / ${obj.target ?? '?'}`
    } else if (obj.type === 'killAll') {
      initialText = 'IN PROGRESS'
    } else if (obj.type === 'killBossProtectNPC') {
      initialText = 'IN PROGRESS'
    }

    this._objText = new Text({
      text:  initialText,
      style: { fontFamily: 'Arial', fontSize: 28, fontWeight: 'bold', fill: '#ffffff', align: 'center' },
    })
    this._objText.anchor.set(0.5, 0)
    this._objText.position.set(W / 2, 34)
    this._uiRoot.addChild(this._objText)

    // Progress bar
    const PBAR_W = 220
    const trackBg = new Graphics()
    trackBg.rect(W / 2 - PBAR_W / 2, 66, PBAR_W, 6)
    trackBg.fill('#1a1a1a')
    trackBg.stroke({ color: '#333333', width: 1 })
    this._uiRoot.addChild(trackBg)

    this._objFill  = new Graphics()
    this._objBarX  = W / 2 - PBAR_W / 2
    this._objBarW  = PBAR_W
    this._lastObjVal = -1
    this._uiRoot.addChild(this._objFill)
    this._drawObjBar(0)
  }

  _buildBossFightUI() {
    const { width: W } = this.game.getScreenSize()
    const state = this.game.knownState
    const bossName = state.boss?.name ?? this._levelMeta?.levelName ?? 'BOSS'

    const HBAR_W  = 420
    const PANEL_H = 44

    const bg = new Graphics()
    bg.rect(W / 2 - HBAR_W / 2 - 8, 8, HBAR_W + 16, PANEL_H)
    bg.fill({ color: 0x000000, alpha: 0.7 })
    bg.stroke({ color: '#3a0000', width: 1 })
    this._uiRoot.addChild(bg)

    const nameText = new Text({
      text:  bossName,
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

  _drawObjBar(pct) {
    if (!this._objFill) return
    this._objFill.clear()
    if (pct > 0) {
      this._objFill.rect(this._objBarX, 66, this._objBarW * Math.min(pct, 1), 6)
      this._objFill.fill(pct >= 1 ? '#f1c40f' : '#00d2ff')
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
