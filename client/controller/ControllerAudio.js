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
    this._buttonBuffer = null
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
      this._preloadButtonBuffer()
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

  _preloadButtonBuffer() {
    if (!this._ctx) return
    fetch('/assets/audio/sfx/UserInterface/simple_button.ogg')
      .then(r => { if (!r.ok) throw new Error(); return r.arrayBuffer() })
      .then(ab => this._ctx.decodeAudioData(ab))
      .then(buf => { this._buttonBuffer = buf })
      .catch(() => {})
  }

  handleButton() {
    this.init()
    if (this._buttonBuffer) this._playBuffer(this._buttonBuffer)
  }

  handlePlayerDown() {}

  handleLevelUp() {
    this.init()
    if (this._levelUpBuffer) this._playBuffer(this._levelUpBuffer)
  }

  _playBuffer(buffer) {
    if (!this._ctx || !this._gain) return
    const play = () => {
      const src = this._ctx.createBufferSource()
      src.buffer = buffer
      src.connect(this._gain)
      src.start()
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().then(play).catch(() => {})
    } else {
      play()
    }
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
}
