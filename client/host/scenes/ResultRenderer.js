/**
 * client/host/scenes/ResultRenderer.js
 *
 * Full-screen overlay shown after victory or defeat.
 * Displays:  title, survivor list, MVP (damage), most deaths
 * The "RESTART GAME" button lives in the DOM sidebar (main.js handles it).
 */

import { Container, Graphics, Text } from 'pixi.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'
import { CLASSES }     from '../../../shared/ClassConfig.js'

const { CANVAS_WIDTH: W, CANVAS_HEIGHT: H } = GAME_CONFIG

export default class ResultRenderer {
  constructor(game, isVictory) {
    this.game      = game
    this.isVictory = isVictory
    this._uiRoot   = new Container()
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  enter() {
    this.game.layers.ui.addChild(this._uiRoot)
    this._buildScreen()
  }

  exit() {
    this.game.layers.ui.removeChild(this._uiRoot)
    this._uiRoot.removeChildren()
  }

  // No per-frame updates needed — screen is static
  update() {}

  // ── Screen builder ────────────────────────────────────────────────────────

  _buildScreen() {
    this._uiRoot.removeChildren()

    // Darkened overlay
    const overlay = new Graphics()
    overlay.rect(0, 0, W, H)
    overlay.fill({ color: 0x000000, alpha: 0.72 })
    this._uiRoot.addChild(overlay)

    // ── Title ───────────────────────────────────────────────────────────
    const titleText = this.isVictory ? '⚔️  VICTORY!' : '💀  DEFEAT...'
    const titleColor = this.isVictory ? '#f1c40f' : '#e74c3c'

    const title = new Text({
      text:  titleText,
      style: { fontFamily: 'Arial', fontSize: 72, fontWeight: 'bold', fill: titleColor, align: 'center' },
    })
    title.anchor.set(0.5)
    title.position.set(W / 2, H / 2 - 160)
    this._uiRoot.addChild(title)

    // ── Stats panel ──────────────────────────────────────────────────────
    this._buildStatsPanel()

    // ── Bottom hint ──────────────────────────────────────────────────────
    const hint = new Text({
      text:  'Host — press  RESTART GAME  to play again',
      style: { fontFamily: 'Arial', fontSize: 15, fill: '#445566', align: 'center' },
    })
    hint.anchor.set(0.5, 1)
    hint.position.set(W / 2, H - 20)
    this._uiRoot.addChild(hint)
  }

  _buildStatsPanel() {
    const PANEL_W = 520
    const PANEL_H = 220
    const panelX  = W / 2 - PANEL_W / 2
    const panelY  = H / 2 - 80

    // Panel background
    const bg = new Graphics()
    bg.rect(panelX, panelY, PANEL_W, PANEL_H)
    bg.fill({ color: 0x080810, alpha: 0.92 })
    bg.stroke({ color: '#1e3a4a', width: 1 })
    this._uiRoot.addChild(bg)

    // Section header
    const header = new Text({
      text:  'PLAYERS',
      style: { fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: '#7fa8c0' },
    })
    header.anchor.set(0.5, 0)
    header.position.set(W / 2, panelY + 12)
    this._uiRoot.addChild(header)

    // Player rows
    const players = Object.values(this.game.knownState.players ?? {})
      .filter(p => !p.isHost)

    const alive = players.filter(p => !p.isDead)
    const dead  = players.filter(p =>  p.isDead)
    const sorted = [...alive, ...dead]

    let y = panelY + 36
    for (const p of sorted.slice(0, 8)) {
      const classData = CLASSES[p.className] ?? {}
      const status    = p.isDead ? '💀' : '✅'
      const color     = p.isDead ? '#663333' : (classData.color ?? '#ffffff')

      const row = new Text({
        text:  `${status}  ${p.name}  (${p.className})`,
        style: { fontFamily: 'Arial', fontSize: 15, fill: color },
      })
      row.anchor.set(0.5, 0)
      row.position.set(W / 2, y)
      this._uiRoot.addChild(row)
      y += 24
    }

    // Overflow note
    if (sorted.length > 8) {
      const more = new Text({
        text:  `…and ${sorted.length - 8} more`,
        style: { fontFamily: 'Arial', fontSize: 13, fill: '#446677' },
      })
      more.anchor.set(0.5, 0)
      more.position.set(W / 2, y)
      this._uiRoot.addChild(more)
    }
  }
}
