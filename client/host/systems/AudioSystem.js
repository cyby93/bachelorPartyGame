/**
 * client/host/systems/AudioSystem.js
 * Procedural Web Audio API sound effects — no external assets required.
 * All sounds synthesized from oscillators + noise.
 */

export default class AudioSystem {
  constructor() {
    this._ctx = null
    this._masterGain = null
    this._enabled = true
  }

  /** Initialise audio context (must be called from a user gesture). */
  init() {
    if (this._ctx) return
    try {
      this._ctx = new (window.AudioContext ?? window.webkitAudioContext)()
      this._masterGain = this._ctx.createGain()
      this._masterGain.gain.value = 0.35
      this._masterGain.connect(this._ctx.destination)
    } catch {
      this._enabled = false
    }
  }

  toggle() { this._enabled = !this._enabled }

  // ── Sound effects ──────────────────────────────────────────────────────────

  /** Brief impact tick — player or enemy hit. */
  playHit(pitch = 1.0) {
    this._tone(220 * pitch, 'square', 0.12, 0.0, 0.08, 0.3)
  }

  /** Death thud — deeper, longer. */
  playDeath() {
    this._tone(80, 'sawtooth', 0.25, 0.01, 0.3, 0.6, -50)
    this._noise(0.12, 0.0, 0.2)
  }

  /** Boss ability — low growl. */
  playBossAbility() {
    this._tone(55, 'sawtooth', 0.3, 0.02, 0.25, 0.8, -30)
    this._tone(110, 'square',  0.15, 0.0, 0.1,  0.4)
  }

  /** Boss phase change — dramatic sting. */
  playBossPhase() {
    this._tone(110, 'sawtooth', 0.4, 0.0, 0.05, 0.5, -40)
    setTimeout(() => this._tone(165, 'sawtooth', 0.3, 0.0, 0.1, 0.5, -30), 120)
    setTimeout(() => this._tone(220, 'square',   0.25, 0.0, 0.2, 0.6, -20), 280)
  }

  /** Scene transition — ascending arpeggio. */
  playTransition() {
    [261.6, 329.6, 392, 523.2].forEach((hz, i) => {
      setTimeout(() => this._tone(hz, 'triangle', 0.2, 0.0, 0.1, 0.35), i * 90)
    })
  }

  /** Victory fanfare. */
  playVictory() {
    const notes = [392, 523.2, 659.3, 783.9, 659.3, 783.9]
    const times = [0, 80, 160, 240, 400, 480]
    notes.forEach((hz, i) => {
      setTimeout(() => this._tone(hz, 'triangle', 0.25, 0.02, 0.25, 0.5), times[i])
    })
  }

  /** Defeat sting. */
  playDefeat() {
    [440, 370, 294, 220].forEach((hz, i) => {
      setTimeout(() => this._tone(hz, 'sawtooth', 0.2, 0.0, 0.2, 0.5, -5), i * 140)
    })
  }

  /** Skill use — quick zap. */
  playSkillFire() {
    this._tone(440, 'square', 0.08, 0.0, 0.04, 0.12)
  }

  // ── Private synth helpers ─────────────────────────────────────────────────

  _tone(hz, type, vol, attack, sustain, release, bend = 0) {
    if (!this._enabled || !this._ctx) return

    const ctx  = this._ctx
    const now  = ctx.currentTime

    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type      = type
    osc.frequency.setValueAtTime(hz, now)
    if (bend !== 0) osc.frequency.linearRampToValueAtTime(hz + bend, now + sustain + release)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(vol, now + attack)
    gain.gain.setValueAtTime(vol, now + attack + sustain)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + sustain + release)

    osc.connect(gain)
    gain.connect(this._masterGain)

    osc.start(now)
    osc.stop(now + attack + sustain + release + 0.01)
  }

  _noise(vol, attack, release) {
    if (!this._enabled || !this._ctx) return

    const ctx        = this._ctx
    const bufferSize = ctx.sampleRate * (attack + release)
    const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data       = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

    const src  = ctx.createBufferSource()
    const gain = ctx.createGain()
    const now  = ctx.currentTime

    src.buffer = buffer
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(vol, now + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release)

    src.connect(gain)
    gain.connect(this._masterGain)
    src.start(now)
  }
}
