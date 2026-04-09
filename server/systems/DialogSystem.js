/**
 * server/systems/DialogSystem.js
 *
 * Plays a timed cinematic dialog sequence server-side.
 * Each line is emitted via a provided emit function, then the system
 * waits `delayAfter` ms before emitting the next line.
 *
 * While running, `isRunning()` returns true — callers should keep the boss
 * immune and suppress melee/abilities during this window.
 */

export default class DialogSystem {
  /**
   * @param {object}   opts
   * @param {Array}    opts.lines      — [{ speaker, text, delayAfter }]
   * @param {Function} opts.onComplete — called after the last line finishes
   */
  constructor({ lines, onComplete }) {
    this._lines      = lines ?? []
    this._onComplete = onComplete ?? (() => {})
    this._running    = false
    this._index      = 0
    this._timer      = null
  }

  /** Returns true while the dialog sequence is still playing. */
  isRunning() { return this._running }

  /**
   * Start the sequence.
   * @param {Function} emitFn — (eventName, payload) → void
   */
  start(emitFn) {
    if (this._running || this._lines.length === 0) {
      this._onComplete()
      return
    }
    this._running = true
    this._index   = 0
    this._emitFn  = emitFn
    this._playNext()
  }

  /** Cancel and clean up without calling onComplete. */
  destroy() {
    if (this._timer) clearTimeout(this._timer)
    this._running = false
  }

  _playNext() {
    if (this._index >= this._lines.length) {
      this._running = false
      this._onComplete()
      return
    }

    const line = this._lines[this._index++]
    this._emitFn('illidan:dialog_line', { speaker: line.speaker, text: line.text })

    const delay = line.delayAfter ?? 2500
    this._timer = setTimeout(() => this._playNext(), delay)
  }
}
