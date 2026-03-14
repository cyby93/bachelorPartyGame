/**
 * client/host/scenes/BattleRenderer.js
 *
 * Canvas display for combat phases (trashMob and bossFight).
 *
 * - trashMob:  shows kill counter progress bar
 * - bossFight: shows boss HP bar
 *
 * Enemy, boss, and projectile sprite pools are wired up here as empty
 * containers; Phase 4 (skills) and Phase 5 (content) will populate them.
 */

import { Container, Graphics, Text } from 'pixi.js'
import { GAME_CONFIG }  from '../../../shared/GameConfig.js'
import PlayerSprite     from '../entities/PlayerSprite.js'

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

    // Sub-containers for future entity types (Phase 5)
    this.enemyContainer      = new Container()
    this.bossContainer       = new Container()
    this.projectileContainer = new Container()    // lives in fx layer

    // Add entity sub-containers in Z order: enemies behind boss behind players
    this._entityRoot.addChild(this.enemyContainer, this.bossContainer)
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  enter() {
    this.game.layers.entities.addChild(this._entityRoot)
    this.game.layers.fx.addChild(this.projectileContainer)
    this.game.layers.ui.addChild(this._uiRoot)

    this._buildUI()
  }

  exit() {
    this.playerSprites.forEach(s => s.destroy())
    this.playerSprites.clear()

    this.game.layers.entities.removeChild(this._entityRoot)
    this.game.layers.fx.removeChild(this.projectileContainer)
    this.game.layers.ui.removeChild(this._uiRoot)

    this._entityRoot.removeChildren()
    this._uiRoot.removeChildren()

    // Re-add sub-containers (they were removed by removeChildren above)
    this._entityRoot.addChild(this.enemyContainer, this.bossContainer)

    this._killText     = null
    this._killFill     = null
    this._bossHpFill   = null
    this._lastKills    = -1
    this._lastBossHpPct = -1
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update() {
    const state     = this.game.knownState
    const activeIds = new Set()

    // Update players
    Object.values(state.players).forEach(p => {
      if (p.isHost) return
      activeIds.add(p.id)

      if (!this.playerSprites.has(p.id)) {
        const sprite = new PlayerSprite(p)
        this.playerSprites.set(p.id, sprite)
        this._entityRoot.addChild(sprite.container)
      }

      const pos = this.game.getRenderPos(p)
      this.playerSprites.get(p.id).update(p, pos)
    })

    // Remove gone players
    this.playerSprites.forEach((sprite, id) => {
      if (!activeIds.has(id)) {
        this._entityRoot.removeChild(sprite.container)
        sprite.destroy()
        this.playerSprites.delete(id)
      }
    })

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
    this._entityRoot.removeChild(sprite.container)
    sprite.destroy()
    this.playerSprites.delete(id)
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
