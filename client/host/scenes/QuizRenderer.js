/**
 * client/host/scenes/QuizRenderer.js
 *
 * Full-screen overlay shown during the between-level quiz phase.
 * Phases: answering → results → upgrading
 */

import { Container, Graphics, Text } from 'pixi.js'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

export default class QuizRenderer {
  constructor(game, socket) {
    this.game    = game
    this.socket  = socket
    this._uiRoot = new Container()
    this._meta   = null

    // Quiz state (set via methods called from main.js)
    this._question  = null   // { question, options }
    this._progress  = null   // { answered, total }
    this._results   = null   // { correctIndex, correctCount, wrongCount }
    this._upgrades  = []     // [{ playerName, skillName }]
    this._phase     = 'waiting'  // 'answering' | 'results' | 'upgrading'
  }

  setLevelMeta(meta) {
    this._meta = meta
  }

  // ── Data setters (called from main.js socket handlers) ──────────────────

  setQuestion(data) {
    this._question = data
    this._progress = null
    this._results  = null
    this._upgrades = []
    this._phase    = 'answering'
    this._buildScreen()
  }

  setProgress(data) {
    this._progress = data
    this._buildScreen()
  }

  setResults(data) {
    this._results = data
    this._phase   = 'results'
    this._buildScreen()
  }

  addUpgradeChosen(data) {
    this._upgrades.push(data)
    this._phase = 'upgrading'
    this._buildScreen()
  }

  setUpgrading() {
    this._phase = 'upgrading'
    this._buildScreen()
  }

  setDone() {
    this._phase = 'done'
    this._buildScreen()
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

    // Dark overlay
    const overlay = new Graphics()
    overlay.rect(0, 0, W, H)
    overlay.fill({ color: 0x000000, alpha: 0.85 })
    this._uiRoot.addChild(overlay)

    if (this._phase === 'answering') {
      this._buildAnsweringPhase(W, H)
    } else if (this._phase === 'results') {
      this._buildResultsPhase(W, H)
    } else if (this._phase === 'upgrading') {
      this._buildUpgradingPhase(W, H)
    } else if (this._phase === 'done') {
      this._buildDonePhase(W, H)
    } else {
      this._buildWaiting(W, H)
    }
  }

  _buildAnsweringPhase(W, H) {
    if (!this._question) return

    // Title
    const title = new Text({
      text:  'QUIZ TIME!',
      style: { fontFamily: 'Arial', fontSize: 42, fontWeight: 'bold', fill: '#f39c12', align: 'center' },
    })
    title.anchor.set(0.5)
    title.position.set(W / 2, 60)
    this._uiRoot.addChild(title)

    // Question text
    const qText = new Text({
      text:  this._question.question,
      style: { fontFamily: 'Arial', fontSize: 30, fill: '#ecf0f1', align: 'center', wordWrap: true, wordWrapWidth: W * 0.8 },
    })
    qText.anchor.set(0.5)
    qText.position.set(W / 2, 140)
    this._uiRoot.addChild(qText)

    // Options
    const options = this._question.options
    const optionStartY = 220
    const optionH = 50
    const optionGap = 10
    const optionW = Math.min(600, W * 0.7)

    for (let i = 0; i < options.length; i++) {
      const y = optionStartY + i * (optionH + optionGap)

      const bg = new Graphics()
      bg.roundRect((W - optionW) / 2, y, optionW, optionH, 8)
      bg.fill({ color: 0x2c3e50 })
      this._uiRoot.addChild(bg)

      const label = new Text({
        text:  `${OPTION_LABELS[i]}.  ${options[i]}`,
        style: { fontFamily: 'Arial', fontSize: 22, fill: '#ecf0f1' },
      })
      label.anchor.set(0, 0.5)
      label.position.set((W - optionW) / 2 + 20, y + optionH / 2)
      this._uiRoot.addChild(label)
    }

    // Progress counter
    if (this._progress) {
      const prog = new Text({
        text:  `${this._progress.answered} / ${this._progress.total} players answered`,
        style: { fontFamily: 'Arial', fontSize: 20, fill: '#95a5a6', align: 'center' },
      })
      prog.anchor.set(0.5)
      prog.position.set(W / 2, H - 50)
      this._uiRoot.addChild(prog)
    } else {
      const hint = new Text({
        text:  'Players — answer on your phones!',
        style: { fontFamily: 'Arial', fontSize: 18, fill: '#7f8c8d', align: 'center' },
      })
      hint.anchor.set(0.5)
      hint.position.set(W / 2, H - 50)
      this._uiRoot.addChild(hint)
    }
  }

  _buildResultsPhase(W, H) {
    if (!this._results || !this._question) return

    // Title
    const title = new Text({
      text:  'RESULTS',
      style: { fontFamily: 'Arial', fontSize: 42, fontWeight: 'bold', fill: '#f39c12', align: 'center' },
    })
    title.anchor.set(0.5)
    title.position.set(W / 2, 60)
    this._uiRoot.addChild(title)

    // Question (smaller)
    const qText = new Text({
      text:  this._question.question,
      style: { fontFamily: 'Arial', fontSize: 24, fill: '#bdc3c7', align: 'center', wordWrap: true, wordWrapWidth: W * 0.8 },
    })
    qText.anchor.set(0.5)
    qText.position.set(W / 2, 120)
    this._uiRoot.addChild(qText)

    // Options with correct highlighted
    const options = this._question.options
    const correctIdx = this._results.correctIndex
    const optionStartY = 180
    const optionH = 45
    const optionGap = 8
    const optionW = Math.min(600, W * 0.7)

    for (let i = 0; i < options.length; i++) {
      const y = optionStartY + i * (optionH + optionGap)
      const isCorrect = i === correctIdx
      const bg = new Graphics()
      bg.roundRect((W - optionW) / 2, y, optionW, optionH, 8)
      bg.fill({ color: isCorrect ? 0x27ae60 : 0x2c3e50 })
      this._uiRoot.addChild(bg)

      const label = new Text({
        text:  `${OPTION_LABELS[i]}.  ${options[i]}${isCorrect ? '  ✓' : ''}`,
        style: { fontFamily: 'Arial', fontSize: 20, fill: isCorrect ? '#ffffff' : '#7f8c8d' },
      })
      label.anchor.set(0, 0.5)
      label.position.set((W - optionW) / 2 + 20, y + optionH / 2)
      this._uiRoot.addChild(label)
    }

    // Score summary
    const summaryY = optionStartY + options.length * (optionH + optionGap) + 30
    const correctText = new Text({
      text:  `✓ ${this._results.correctCount} correct`,
      style: { fontFamily: 'Arial', fontSize: 28, fontWeight: 'bold', fill: '#2ecc71', align: 'center' },
    })
    correctText.anchor.set(1, 0.5)
    correctText.position.set(W / 2 - 20, summaryY)
    this._uiRoot.addChild(correctText)

    const wrongText = new Text({
      text:  `✗ ${this._results.wrongCount} wrong`,
      style: { fontFamily: 'Arial', fontSize: 28, fontWeight: 'bold', fill: '#e74c3c', align: 'center' },
    })
    wrongText.anchor.set(0, 0.5)
    wrongText.position.set(W / 2 + 20, summaryY)
    this._uiRoot.addChild(wrongText)
  }

  _buildUpgradingPhase(W, H) {
    // Title
    const title = new Text({
      text:  'CHOOSING UPGRADES...',
      style: { fontFamily: 'Arial', fontSize: 36, fontWeight: 'bold', fill: '#3498db', align: 'center' },
    })
    title.anchor.set(0.5)
    title.position.set(W / 2, 80)
    this._uiRoot.addChild(title)

    const subtitle = new Text({
      text:  'Players with correct answers are upgrading their abilities',
      style: { fontFamily: 'Arial', fontSize: 18, fill: '#95a5a6', align: 'center' },
    })
    subtitle.anchor.set(0.5)
    subtitle.position.set(W / 2, 130)
    this._uiRoot.addChild(subtitle)

    // List of upgrades chosen so far
    for (let i = 0; i < this._upgrades.length; i++) {
      const u = this._upgrades[i]
      const entry = new Text({
        text:  `${u.playerName} upgraded ${u.skillName}`,
        style: { fontFamily: 'Arial', fontSize: 20, fill: '#2ecc71' },
      })
      entry.anchor.set(0.5)
      entry.position.set(W / 2, 190 + i * 35)
      this._uiRoot.addChild(entry)
    }
  }

  _buildDonePhase(W, H) {
    // Show results summary + upgrades chosen
    const title = new Text({
      text:  'QUIZ COMPLETE',
      style: { fontFamily: 'Arial', fontSize: 42, fontWeight: 'bold', fill: '#f39c12', align: 'center' },
    })
    title.anchor.set(0.5)
    title.position.set(W / 2, 60)
    this._uiRoot.addChild(title)

    // Show correct/wrong if we have results
    if (this._results) {
      const summary = new Text({
        text:  `✓ ${this._results.correctCount} correct    ✗ ${this._results.wrongCount} wrong`,
        style: { fontFamily: 'Arial', fontSize: 26, fill: '#bdc3c7', align: 'center' },
      })
      summary.anchor.set(0.5)
      summary.position.set(W / 2, 120)
      this._uiRoot.addChild(summary)
    }

    // List upgrades
    if (this._upgrades.length > 0) {
      const upgradeTitle = new Text({
        text:  'Upgrades chosen:',
        style: { fontFamily: 'Arial', fontSize: 20, fill: '#3498db' },
      })
      upgradeTitle.anchor.set(0.5)
      upgradeTitle.position.set(W / 2, 175)
      this._uiRoot.addChild(upgradeTitle)

      for (let i = 0; i < this._upgrades.length; i++) {
        const u = this._upgrades[i]
        const entry = new Text({
          text:  `${u.playerName} → ${u.skillName}`,
          style: { fontFamily: 'Arial', fontSize: 20, fill: '#2ecc71' },
        })
        entry.anchor.set(0.5)
        entry.position.set(W / 2, 215 + i * 32)
        this._uiRoot.addChild(entry)
      }
    }

    // Hint
    const hint = new Text({
      text:  'Host — press  CONTINUE  to proceed',
      style: { fontFamily: 'Arial', fontSize: 15, fill: '#445566', align: 'center' },
    })
    hint.anchor.set(0.5, 1)
    hint.position.set(W / 2, H - 20)
    this._uiRoot.addChild(hint)
  }

  _buildWaiting(W, H) {
    const text = new Text({
      text:  'Preparing quiz...',
      style: { fontFamily: 'Arial', fontSize: 28, fill: '#95a5a6', align: 'center' },
    })
    text.anchor.set(0.5)
    text.position.set(W / 2, H / 2)
    this._uiRoot.addChild(text)
  }
}
