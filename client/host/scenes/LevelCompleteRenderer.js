/**
 * client/host/scenes/LevelCompleteRenderer.js
 *
 * Full-screen overlay shown between levels.
 * Displays: "LEVEL X COMPLETE", level name, and waits for host to advance.
 * The "CONTINUE" button emits HOST_ADVANCE via the socket passed in.
 */

import { Container, Graphics, Text } from 'pixi.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'

const { CANVAS_WIDTH: W, CANVAS_HEIGHT: H } = GAME_CONFIG

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

  // ── Screen builder ────────────────────────────────────────────────────────

  _buildScreen() {
    this._uiRoot.removeChildren()

    // Darkened overlay
    const overlay = new Graphics()
    overlay.rect(0, 0, W, H)
    overlay.fill({ color: 0x000000, alpha: 0.78 })
    this._uiRoot.addChild(overlay)

    // Level complete title
    const levelNum = (this._meta?.levelIndex ?? 0) + 1
    const totalLevels = this._meta?.totalLevels ?? '?'

    const title = new Text({
      text:  `LEVEL ${levelNum} COMPLETE!`,
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
      text:  `${levelNum} / ${totalLevels} levels completed`,
      style: { fontFamily: 'Arial', fontSize: 16, fill: '#556677', align: 'center' },
    })
    progress.anchor.set(0.5)
    progress.position.set(W / 2, H / 2 - 20)
    this._uiRoot.addChild(progress)

    // Hint for host
    const hint = new Text({
      text:  'Host — press  CONTINUE  to advance to the next level',
      style: { fontFamily: 'Arial', fontSize: 15, fill: '#445566', align: 'center' },
    })
    hint.anchor.set(0.5, 1)
    hint.position.set(W / 2, H - 20)
    this._uiRoot.addChild(hint)
  }
}
