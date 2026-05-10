/**
 * server/TransitionRunner.js
 *
 * Executes a level transition step sequence asynchronously.
 * Each step runs to completion (or waits its duration) before the next begins.
 * Call abort() to cancel mid-sequence — safe to call even after completion.
 *
 * Supported step types:
 *   { type: 'delay', ms: number }               — pure timer, no side effects
 *   { type: 'vfx',   event: string, ms?: number } — emit named VFX event, optional wait
 */

import { EVENTS } from '../shared/protocol.js'

export default class TransitionRunner {
  constructor(io) {
    this.io        = io
    this._aborted  = false
  }

  async run(steps) {
    for (const step of steps ?? []) {
      if (this._aborted) break
      await this._execute(step)
    }
  }

  abort() { this._aborted = true }

  _execute(step) {
    switch (step.type) {
      case 'delay':
        return this._wait(step.ms ?? 1000)

      case 'vfx':
        this.io.emit(EVENTS.TRANSITION_VFX, { event: step.event })
        return step.ms ? this._wait(step.ms) : Promise.resolve()

      default:
        return Promise.resolve()
    }
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
