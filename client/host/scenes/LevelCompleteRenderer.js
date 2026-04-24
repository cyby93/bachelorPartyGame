/**
 * client/host/scenes/LevelCompleteRenderer.js
 *
 * Full-screen overlay shown between levels.
 * Displays: "LEVEL X COMPLETE", level name, and waits for host to advance.
 * The "CONTINUE" button emits HOST_ADVANCE via the socket passed in.
 */

import { Container, Graphics, Text } from 'pixi.js'
import { CLASSES } from '../../../shared/ClassConfig.js'

export default class LevelCompleteRenderer {
  /**
   * @param {object} game   – HostGame instance
   * @param {object} socket – Socket.io client (for emitting HOST_ADVANCE)
   */
  constructor(game, socket) {
    this.game    = game
    this.socket  = socket
    this._uiRoot = new Container()

    // Set externally before enter()
    this._meta   = null
  }

  /** Called by HostGame before enter() to pass level results. */
  setLevelMeta(meta) {
    this._meta = meta
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

  update() {}

  resize() {
    this._buildScreen()
  }

  // ── Screen builder ────────────────────────────────────────────────────────

  _buildScreen() {
    const { width: W, height: H } = this.game.getScreenSize()
    this._uiRoot.removeChildren()

    // Darkened overlay
    const overlay = new Graphics()
    overlay.rect(0, 0, W, H)
    overlay.fill({ color: 0x000000, alpha: 0.78 })
    this._uiRoot.addChild(overlay)

    // Level complete title
    const levelNum = this._meta?.levelNumber ?? ((this._meta?.levelIndex ?? 0) + 1)
    const totalLevels = this._meta?.totalLevels ?? '?'
    const isDebugSandbox = this._meta?.debugSandbox === true

    const title = new Text({
      text:  isDebugSandbox ? 'SANDBOX COMPLETE!' : `LEVEL ${levelNum} COMPLETE!`,
      style: { fontFamily: 'Arial', fontSize: 56, fontWeight: 'bold', fill: '#f1c40f', align: 'center' },
    })
    title.anchor.set(0.5)
    title.position.set(W / 2, H / 2 - 120)
    this._uiRoot.addChild(title)

    // Level name
    const levelName = this._meta?.levelName ?? ''
    if (levelName) {
      const nameText = new Text({
        text:  levelName,
        style: { fontFamily: 'Arial', fontSize: 22, fill: '#7fa8c0', align: 'center' },
      })
      nameText.anchor.set(0.5)
      nameText.position.set(W / 2, H / 2 - 60)
      this._uiRoot.addChild(nameText)
    }

    // Progress indicator
    const progress = new Text({
      text:  isDebugSandbox ? 'Debug encounter finished' : `${levelNum} / ${totalLevels} levels completed`,
      style: { fontFamily: 'Arial', fontSize: 16, fill: '#556677', align: 'center' },
    })
    progress.anchor.set(0.5)
    progress.position.set(W / 2, H / 2 - 20)
    this._uiRoot.addChild(progress)

    // Stats table (damage + healing per player)
    const stats = this._meta?.stats
    if (stats) {
      this._buildStatsTable(W, H, stats)
    }

    // Hint for host
    const hint = new Text({
      text:  'Host — press  CONTINUE  to advance to the next level',
      style: { fontFamily: 'Arial', fontSize: 15, fill: '#445566', align: 'center' },
    })
    hint.anchor.set(0.5, 1)
    hint.position.set(W / 2, H - 20)
    this._uiRoot.addChild(hint)
  }

  _buildStatsTable(W, H, stats) {
    const players = Object.values(this.game.knownState.players ?? {}).filter(p => !p.isHost)
    if (players.length === 0) return

    const PANEL_W = 500
    const ROW_H   = 22
    const PAD     = 12
    const HEADER_H = 22
    const panelH  = HEADER_H + players.length * ROW_H + PAD * 2
    const panelX  = W / 2 - PANEL_W / 2
    const panelY  = H / 2 + 20

    const bg = new Graphics()
    bg.rect(panelX, panelY, PANEL_W, panelH)
    bg.fill({ color: 0x080810, alpha: 0.88 })
    bg.stroke({ color: '#1e3a4a', width: 1 })
    this._uiRoot.addChild(bg)

    // Column headers
    const colName = panelX + PAD
    const colDmg  = panelX + PANEL_W * 0.5
    const colHeal = panelX + PANEL_W * 0.75

    const hdrStyle = { fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: '#7fa8c0' }
    const makeHdr = (txt, x, anchor = 0) => {
      const t = new Text({ text: txt, style: hdrStyle })
      t.anchor.set(anchor, 0)
      t.position.set(x, panelY + PAD)
      this._uiRoot.addChild(t)
    }
    makeHdr('PLAYER', colName)
    makeHdr('DAMAGE', colDmg, 0.5)
    makeHdr('HEALING', colHeal, 0.5)

    const sorted = [...players].sort(
      (a, b) => (stats.damage?.[b.id] ?? 0) - (stats.damage?.[a.id] ?? 0)
    )

    sorted.forEach((p, i) => {
      const y     = panelY + PAD + HEADER_H + i * ROW_H
      const color = CLASSES[p.className]?.color ?? '#ffffff'
      const dmg   = (stats.damage?.[p.id] ?? 0).toLocaleString()
      const heal  = (stats.heal?.[p.id] ?? 0).toLocaleString()

      const nameT = new Text({ text: p.name, style: { fontFamily: 'Arial', fontSize: 14, fill: color } })
      nameT.position.set(colName, y)
      this._uiRoot.addChild(nameT)

      const dmgT = new Text({ text: dmg, style: { fontFamily: 'Arial', fontSize: 14, fill: '#ff9988' } })
      dmgT.anchor.set(0.5, 0)
      dmgT.position.set(colDmg, y)
      this._uiRoot.addChild(dmgT)

      const healT = new Text({ text: heal, style: { fontFamily: 'Arial', fontSize: 14, fill: '#44ee99' } })
      healT.anchor.set(0.5, 0)
      healT.position.set(colHeal, y)
      this._uiRoot.addChild(healT)
    })
  }
}
