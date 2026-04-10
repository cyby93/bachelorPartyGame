/**
 * client/host/scenes/ResultRenderer.js
 *
 * Full-screen overlay shown after victory or defeat.
 * Displays:  title, survivor list, MVP (damage), most deaths
 * The "RESTART GAME" button lives in the DOM sidebar (main.js handles it).
 */

import { Container, Graphics, Text } from 'pixi.js'
import { CLASSES }     from '../../../shared/ClassConfig.js'

export default class ResultRenderer {
  constructor(game, isVictory) {
    this.game           = game
    this.isVictory      = isVictory
    this._uiRoot        = new Container()
    this._cumulativeStats = null
  }

  /** Receives meta from HostGame.switchScene — picks up cumulativeStats from server. */
  setLevelMeta(meta) {
    this._cumulativeStats = meta?.cumulativeStats ?? null
    if (this._uiRoot.parent) this._buildScreen()
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
    const { width: W, height: H } = this.game.getScreenSize()
    const stats   = this._cumulativeStats
    const players = Object.values(this.game.knownState.players ?? {}).filter(p => !p.isHost)

    const alive  = players.filter(p => !p.isDead)
    const dead   = players.filter(p =>  p.isDead)
    const sorted = [...alive, ...dead]

    if (stats) {
      this._buildFullStatsTable(W, H, stats, sorted)
    } else {
      this._buildSimplePlayerList(W, H, sorted)
    }
  }

  _buildFullStatsTable(W, H, stats, sorted) {
    // Main stats panel: Name | Damage | Healing | Deaths | Resurrections
    const PANEL_W = Math.min(W - 40, 720)
    const ROW_H   = 22
    const PAD     = 10
    const HEADER_H = 20
    const panelH  = HEADER_H + sorted.length * ROW_H + PAD * 2
    const panelX  = W / 2 - PANEL_W / 2
    const panelY  = H / 2 - 50

    const bg = new Graphics()
    bg.rect(panelX, panelY, PANEL_W, panelH)
    bg.fill({ color: 0x080810, alpha: 0.92 })
    bg.stroke({ color: '#1e3a4a', width: 1 })
    this._uiRoot.addChild(bg)

    // Column positions (proportional within panel)
    const colName = panelX + PAD
    const colDmg  = panelX + PANEL_W * 0.38
    const colHeal = panelX + PANEL_W * 0.55
    const colDeath = panelX + PANEL_W * 0.72
    const colRez  = panelX + PANEL_W * 0.88

    const hdrStyle = { fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: '#7fa8c0' }
    const makeHdr = (txt, x, anchor = 0) => {
      const t = new Text({ text: txt, style: hdrStyle })
      t.anchor.set(anchor, 0)
      t.position.set(x, panelY + PAD)
      this._uiRoot.addChild(t)
    }
    makeHdr('PLAYER',       colName)
    makeHdr('DAMAGE',       colDmg,  0.5)
    makeHdr('HEALING',      colHeal, 0.5)
    makeHdr('DEATHS',       colDeath, 0.5)
    makeHdr('REVIVES',      colRez,  0.5)

    sorted.slice(0, 8).forEach((p, i) => {
      const y      = panelY + PAD + HEADER_H + i * ROW_H
      const cls    = CLASSES[p.className] ?? {}
      const color  = p.isDead ? '#663333' : (cls.color ?? '#ffffff')
      const status = p.isDead ? '💀' : '✅'
      const dmg    = (stats.damage?.[p.id] ?? 0).toLocaleString()
      const heal   = (stats.heal?.[p.id] ?? 0).toLocaleString()
      const deaths = String(stats.deaths?.[p.id] ?? 0)
      const rezzes = String(stats.resurrections?.[p.id] ?? 0)

      const nameT = new Text({ text: `${status} ${p.name}`, style: { fontFamily: 'Arial', fontSize: 14, fill: color } })
      nameT.position.set(colName, y)
      this._uiRoot.addChild(nameT)

      for (const [val, col, clr] of [
        [dmg,    colDmg,   '#ff9988'],
        [heal,   colHeal,  '#44ee99'],
        [deaths, colDeath, '#cc8866'],
        [rezzes, colRez,   '#88aaff'],
      ]) {
        const t = new Text({ text: val, style: { fontFamily: 'Arial', fontSize: 14, fill: clr } })
        t.anchor.set(0.5, 0)
        t.position.set(col, y)
        this._uiRoot.addChild(t)
      }
    })

    // Quiz summary (if any quiz was played)
    const quizStats = stats.quiz ?? {}
    const hasQuiz = Object.keys(quizStats).length > 0
    if (hasQuiz) {
      this._buildQuizSection(W, panelY + panelH + 10, sorted, quizStats)
    }
  }

  _buildQuizSection(W, topY, players, quizStats) {
    const PANEL_W = 360
    const ROW_H   = 20
    const PAD     = 10
    const HEADER_H = 20
    const panelH  = HEADER_H + players.length * ROW_H + PAD * 2
    const panelX  = W / 2 - PANEL_W / 2

    const bg = new Graphics()
    bg.rect(panelX, topY, PANEL_W, panelH)
    bg.fill({ color: 0x080810, alpha: 0.88 })
    bg.stroke({ color: '#1e3a4a', width: 1 })
    this._uiRoot.addChild(bg)

    const hdrStyle = { fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: '#7fa8c0' }
    const hdr = new Text({ text: 'QUIZ', style: hdrStyle })
    hdr.anchor.set(0.5, 0)
    hdr.position.set(W / 2, topY + PAD)
    this._uiRoot.addChild(hdr)

    const colName    = panelX + PAD
    const colCorrect = panelX + PANEL_W * 0.65
    const colWrong   = panelX + PANEL_W * 0.85

    const makeColHdr = (txt, x) => {
      const t = new Text({ text: txt, style: hdrStyle })
      t.anchor.set(0.5, 0)
      t.position.set(x, topY + PAD)
      this._uiRoot.addChild(t)
    }
    makeColHdr('CORRECT', colCorrect)
    makeColHdr('WRONG',   colWrong)

    players.slice(0, 8).forEach((p, i) => {
      const y    = topY + PAD + HEADER_H + i * ROW_H
      const cls  = CLASSES[p.className] ?? {}
      const color = p.isDead ? '#663333' : (cls.color ?? '#ffffff')
      const q    = quizStats[p.id] ?? { correct: 0, wrong: 0 }

      const nameT = new Text({ text: p.name, style: { fontFamily: 'Arial', fontSize: 13, fill: color } })
      nameT.position.set(colName, y)
      this._uiRoot.addChild(nameT)

      const corrT = new Text({ text: String(q.correct), style: { fontFamily: 'Arial', fontSize: 13, fill: '#44ee99' } })
      corrT.anchor.set(0.5, 0)
      corrT.position.set(colCorrect, y)
      this._uiRoot.addChild(corrT)

      const wrongT = new Text({ text: String(q.wrong), style: { fontFamily: 'Arial', fontSize: 13, fill: '#ff6655' } })
      wrongT.anchor.set(0.5, 0)
      wrongT.position.set(colWrong, y)
      this._uiRoot.addChild(wrongT)
    })
  }

  _buildSimplePlayerList(W, H, sorted) {
    const PANEL_W = 520
    const PANEL_H = Math.max(100, sorted.length * 24 + 60)
    const panelX  = W / 2 - PANEL_W / 2
    const panelY  = H / 2 - 80

    const bg = new Graphics()
    bg.rect(panelX, panelY, PANEL_W, PANEL_H)
    bg.fill({ color: 0x080810, alpha: 0.92 })
    bg.stroke({ color: '#1e3a4a', width: 1 })
    this._uiRoot.addChild(bg)

    const header = new Text({
      text:  'PLAYERS',
      style: { fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: '#7fa8c0' },
    })
    header.anchor.set(0.5, 0)
    header.position.set(W / 2, panelY + 12)
    this._uiRoot.addChild(header)

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
  }
}
