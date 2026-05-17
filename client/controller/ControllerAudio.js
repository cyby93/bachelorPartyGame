import {
  AUDIO_STORAGE_KEYS,
  CONTROLLER_AUDIO,
  createDefaultControllerAudioSettings,
} from '../../shared/AudioConfig.js'

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0))
}

export default class ControllerAudio {
  constructor() {
    this._ctx = null
    this._enabled = true
    this._gain = null
    this._settings = createDefaultControllerAudioSettings()
    this._levelUpBuffer = null
    this._loadSettings()
  }

  init() {
    if (this._ctx || !this._enabled) return
    try {
      const AudioCtor = window.AudioContext ?? window.webkitAudioContext
      if (!AudioCtor) {
        this._enabled = false
        return
      }
      this._ctx = new AudioCtor()
      this._gain = this._ctx.createGain()
      this._gain.connect(this._ctx.destination)
      this._applySettings()
      this._ctx.resume().catch(() => {})
      this._preloadLevelUpBuffer()
    } catch {
      this._enabled = false
    }
  }

  _preloadLevelUpBuffer() {
    if (!this._ctx) return
    fetch(CONTROLLER_AUDIO.levelUp.src)
      .then(r => { if (!r.ok) throw new Error(); return r.arrayBuffer() })
      .then(ab => this._ctx.decodeAudioData(ab))
      .then(buf => { this._levelUpBuffer = buf })
      .catch(() => {})
  }

  handleJoin() {
    this.init()
    this._tone(660, 'triangle', 0.05, 0.01, 0.04, 0.09)
  }

  handlePlayerDown() {
    this.init()
    this._tone(220, 'sawtooth', 0.08, 0.0, 0.08, 0.18, -50)
  }

  handleLevelUp() {
    this.init()
    if (this._levelUpBuffer) {
      this._playBuffer(this._levelUpBuffer)
    } else {
      this._tone(523, 'triangle', 0.07, 0.01, 0.05, 0.10)
      setTimeout(() => this._tone(659, 'triangle', 0.07, 0.01, 0.05, 0.10), 110)
      setTimeout(() => this._tone(784, 'triangle', 0.10, 0.01, 0.10, 0.20), 220)
    }
  }

  _playBuffer(buffer) {
    if (!this._ctx || !this._gain) return
    const src = this._ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this._gain)
    src.start()
  }

  _loadSettings() {
    try {
      const raw = window.localStorage.getItem(AUDIO_STORAGE_KEYS.CONTROLLER_SETTINGS)
      if (!raw) return
      this._settings = createDefaultControllerAudioSettings(JSON.parse(raw))
    } catch {
      this._settings = createDefaultControllerAudioSettings()
    }
  }

  _applySettings() {
    if (!this._gain) return
    const volume = this._settings.muted ? 0 : clamp01(this._settings.master) * clamp01(this._settings.sfx)
    this._gain.gain.value = volume
  }

  _tone(hz, type, vol, attack, sustain, release, bend = 0) {
    if (!this._ctx || !this._gain || this._settings.muted) return
    const now = this._ctx.currentTime
    const osc = this._ctx.createOscillator()
    const gain = this._ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(hz, now)
    if (bend !== 0) osc.frequency.linearRampToValueAtTime(hz + bend, now + sustain + release)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(vol, now + attack + 0.001)
    gain.gain.setValueAtTime(vol, now + attack + sustain)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + sustain + release)

    osc.connect(gain)
    gain.connect(this._gain)
    osc.start(now)
    osc.stop(now + attack + sustain + release + 0.02)
  }
}
