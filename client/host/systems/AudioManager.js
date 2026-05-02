import { GAME_CONFIG } from '../../../shared/GameConfig.js'
import {
  AUDIO_STORAGE_KEYS,
  AUDIO_STINGERS,
  AUDIO_DUCKING,
  SKILL_AUDIO_ONE_SHOTS,
  createDefaultAudioSettings,
  getDialogAudio,
  getLevelAudio,
  getOneShotAudio,
  getSourceSkillAudio,
  getSkillAudio,
  withResolvedAudioPaths,
} from '../../../shared/AudioConfig.js'

// Skills whose EFFECT_DAMAGE events (DOT ticks) should play no impact sound
const DOT_SILENT_SKILLS = new Set(['Corruption', 'Moonfire'])

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0))
}

function nowMs() {
  return performance?.now?.() ?? Date.now()
}

function createWebAudioContext() {
  const AudioCtor = window.AudioContext ?? window.webkitAudioContext
  return AudioCtor ? new AudioCtor() : null
}

export default class AudioManager {
  constructor() {
    this._ctx = null
    this._enabled = true
    this._buses = null
    this._settings = createDefaultAudioSettings()
    this._musicEl = null
    this._currentMusicKey = null
    this._currentLevelId = null
    this._musicDuck = 1
    this._lastDamageAt = 0
    this._lastDownedPlayers = new Set()
    this._throttle = {
      hit: 90,
      downed: 800,
    }
    this._lastDownedAt = 0
    this._channelPlayers = new Map()
    this._loopingSfx = new Map()
    this._sfxCache = new Map()
  }

  init() {
    if (GAME_CONFIG.DEV_DISABLE_AUDIO) { this._enabled = false; return }
    if (this._ctx || !this._enabled) return

    try {
      this._ctx = createWebAudioContext()
      if (!this._ctx) {
        this._enabled = false
        return
      }
      this._buses = this._createBusGraph(this._ctx)
      this._loadSettings()
      this._applySettings()
      this._primeSfxCache()
      this._resume()
    } catch {
      this._enabled = false
    }
  }

  setScene(scene, meta = {}) {
    if (!this._enabled) return

    const levelId = meta.levelId ?? this._currentLevelId
    this._currentLevelId = levelId ?? null

    const cfg = getLevelAudio(levelId, scene)
    if (cfg?.music) this._playMusic(withResolvedAudioPaths(cfg.music, 'music'))
    else if (scene === 'lobby') this._playMusic(withResolvedAudioPaths(getLevelAudio(null, 'lobby')?.music, 'music'))

    if (scene === 'battle' || scene === 'bossFight') {
      this.playTransition()
    } else if (scene === 'result') {
      this.playVictory()
    } else if (scene === 'gameover') {
      this.playDefeat()
    }
  }

  applySettings(nextSettings) {
    this._settings = {
      ...this._settings,
      ...nextSettings,
    }
    this._applySettings()
    this._persistSettings()
  }

  getSettings() {
    return { ...this._settings }
  }

  handleSkillFired(data) {
    const audio = getSkillAudio(data?.skillName, data?.type, data?.subtype)
    this._playNamedSfx(audio.cast, { family: audio.family, variation: data?.playerId })
  }

  handleSkillInterrupted(data) {
    if (!data?.playerId) return
    this._stopPlayerChannelAudio(data.playerId)
  }

  handleChannelInterrupted(data) {
    if (!data?.playerId) return
    this._stopPlayerChannelAudio(data.playerId)
  }

  handleEffectDamage(data) {
    if (!data) return
    if (DOT_SILENT_SKILLS.has(data.sourceSkill)) return
    const t = nowMs()
    if (t - this._lastDamageAt < this._throttle.hit) return
    this._lastDamageAt = t

    const sourceAudio = getSourceSkillAudio(data.sourceSkill) ?? getSkillAudio(data.sourceSkill)
    const key = data.type === 'heal'
      ? (sourceAudio?.impact ?? AUDIO_STINGERS.hitHeal.key)
      : (sourceAudio?.impact ?? AUDIO_STINGERS.hitDamage.key)
    this._playNamedSfx(key, { family: sourceAudio?.family ?? data.sourceSkill ?? 'combat_hit' })
  }

  handleTargetedHit(data) {
    if (!data) return
    const sourceAudio = getSourceSkillAudio(data.sourceSkill) ?? getSkillAudio(data.sourceSkill)
    const key = sourceAudio?.impact ?? 'combat_targeted_hit'
    this._playNamedSfx(key, { family: sourceAudio?.family ?? data.effectType ?? 'targeted' })
  }

  handleDialogLine(data) {
    if (!data) return
    const dialog = getDialogAudio(data.speaker, data.text, data.voiceKey)
    this._duckForVoice(true)
    this._playVoice(dialog)
  }

  handleDialogClear() {
    this._duckForVoice(false)
  }

  handlePhaseTransition() {
    this._playNamedSfx(AUDIO_STINGERS.phaseTransition.key, { family: 'boss_phase' })
  }

  handleAuraPulse() {
    this._playNamedSfx('boss_aura_pulse', { family: 'boss_aura' })
  }

  handlePortalBeamWarning() {
    this._playNamedSfx('portal_beam_warning', { family: 'portal_beam' })
  }

  handlePortalBeamDamage() {
    this._playNamedSfx('portal_beam_damage', { family: 'portal_beam' })
  }

  handlePortalBeamEnd() {
    this._playNamedSfx('portal_beam_end', { family: 'portal_beam' })
  }

  handlePlayerJoined() {
    this._playNamedSfx(AUDIO_STINGERS.playerJoin.key, { family: 'ui_join' })
  }

  syncPlayerState(players = {}) {
    const activePlayerIds = new Set()
    const deadNow = new Set()
    for (const player of Object.values(players)) {
      if (!player?.id) continue
      activePlayerIds.add(player.id)

      const previous = this._channelPlayers.get(player.id) ?? { castSkill: null, isChanneling: false }
      const castSkill = player.castSkill ?? null
      const castProgress = player.castProgress
      const isChanneling = !!player.isChanneling

      if (castSkill && castProgress != null && previous.castSkill !== castSkill) {
        const skillAudio = getSkillAudio(castSkill)
        if (isChanneling) {
          if (skillAudio.cast) this._playNamedSfx(skillAudio.cast, { family: skillAudio.family, variation: player.id })
          if (skillAudio.channel) this._startLoopingSfx(player.id, skillAudio.channel, { volumeScale: 0.85 })
        } else {
          const startCue = skillAudio.precast ?? skillAudio.cast
          if (startCue) this._playNamedSfx(startCue, { family: skillAudio.family, variation: player.id })
        }
      }

      if ((!isChanneling || !castSkill || castProgress == null) && previous.isChanneling) {
        this._stopPlayerChannelAudio(player.id)
      }

      this._channelPlayers.set(player.id, { castSkill, isChanneling })

      if (!player || player.isHost || !player.isDead) continue
      deadNow.add(player.id)
      if (!this._lastDownedPlayers.has(player.id)) {
        const t = nowMs()
        if (t - this._lastDownedAt >= this._throttle.downed) {
          this._lastDownedAt = t
          this._playNamedSfx(AUDIO_STINGERS.playerDown.key, { family: 'ui_downed' })
        }
      }
    }

    for (const playerId of Array.from(this._channelPlayers.keys())) {
      if (!activePlayerIds.has(playerId)) this._stopPlayerChannelAudio(playerId)
    }

    this._lastDownedPlayers = deadNow
  }

  playTransition() {
    this._playArpeggio([261.6, 329.6, 392, 523.2], 'triangle', 0.18, 90)
  }

  playVictory() {
    this._playArpeggio([392, 523.2, 659.3, 783.9, 659.3, 783.9], 'triangle', 0.22, 80)
  }

  playDefeat() {
    this._playArpeggio([440, 370, 294, 220], 'sawtooth', 0.18, 140)
  }

  _createBusGraph(ctx) {
    const master = ctx.createGain()
    const music = ctx.createGain()
    const sfx = ctx.createGain()
    const voice = ctx.createGain()

    music.connect(master)
    sfx.connect(master)
    voice.connect(master)
    master.connect(ctx.destination)

    return { master, music, sfx, voice }
  }

  _loadSettings() {
    try {
      const raw = window.localStorage.getItem(AUDIO_STORAGE_KEYS.HOST_SETTINGS)
      if (!raw) return
      this._settings = createDefaultAudioSettings(JSON.parse(raw))
    } catch {
      this._settings = createDefaultAudioSettings()
    }
  }

  _persistSettings() {
    try {
      window.localStorage.setItem(AUDIO_STORAGE_KEYS.HOST_SETTINGS, JSON.stringify(this._settings))
    } catch {}
  }

  _applySettings() {
    if (!this._buses) return

    const muted = !!this._settings.muted
    this._buses.master.gain.value = muted ? 0 : clamp01(this._settings.master)
    this._buses.music.gain.value = clamp01(this._settings.music)
    this._buses.sfx.gain.value = clamp01(this._settings.sfx)
    this._buses.voice.gain.value = clamp01(this._settings.voice)

    if (this._musicEl) {
      this._musicEl.muted = muted
      this._musicEl.volume = clamp01(this._settings.music) * clamp01(this._settings.master) * this._musicDuck
    }

    for (const entry of this._loopingSfx.values()) {
      const busVolume = clamp01(this._settings[entry.busName] ?? this._settings.sfx)
      entry.el.muted = muted
      entry.el.volume = clamp01(this._settings.master) * busVolume * clamp01(entry.volumeScale)
    }
  }

  _resume() {
    const promise = this._ctx?.resume?.()
    promise?.catch?.(() => {})
  }

  _playMusic(definition) {
    const nextKey = definition?.key ?? null
    if (this._currentMusicKey === nextKey) return

    this._currentMusicKey = nextKey

    if (this._musicEl) {
      this._musicEl.pause()
      this._musicEl.src = ''
      this._musicEl = null
    }

    if (!definition?.src) return

    const audio = new Audio(definition.src)
    audio.loop = definition.loop !== false
    audio.preload = 'auto'
    audio.volume = clamp01(this._settings.music) * clamp01(this._settings.master) * this._musicDuck
    audio.muted = !!this._settings.muted
    audio.play().catch(() => {})
    this._musicEl = audio
  }

  _duckForVoice(active) {
    if (!this._buses) return
    this._musicDuck = active ? AUDIO_DUCKING.voiceMusicMultiplier : 1
    this._applySettings()
    const target = active ? clamp01(this._settings.music) * AUDIO_DUCKING.voiceMusicMultiplier : clamp01(this._settings.music)
    const now = this._ctx?.currentTime ?? 0
    this._buses.music.gain.cancelScheduledValues(now)
    this._buses.music.gain.setValueAtTime(this._buses.music.gain.value, now)
    this._buses.music.gain.linearRampToValueAtTime(target, now + (AUDIO_DUCKING.releaseMs / 1000))
  }

  _playVoice(dialog) {
    this._playNamedSfx(dialog.voiceKey, { bus: 'voice', volumeScale: 0.7, fallbackPitch: 0.85, src: dialog.src })
    window.clearTimeout(this._voiceReleaseTimer)
    this._voiceReleaseTimer = window.setTimeout(() => this.handleDialogClear(), 1800)
  }

  _playNamedSfx(_key, options = {}) {
    const asset = options.src
      ? { key: _key, src: options.src }
      : withResolvedAudioPaths(getOneShotAudio(_key), options.bus === 'voice' ? 'voice' : 'sfx')

    if (asset?.src) {
      this._playHtmlOneShot(asset.src, options.bus ?? 'sfx', options.volumeScale ?? 1)
      return
    }

    const bus = options.bus ?? 'sfx'
    const pitch = options.fallbackPitch ?? this._pitchFromFamily(options.family)
    this._tone(220 * pitch, 'square', 0.08 * (options.volumeScale ?? 1), 0, 0.05, 0.09, 18, bus)
  }

  _playHtmlOneShot(src, busName, volumeScale = 1) {
    const base = this._getCachedSfx(src)
    const el = base ? base.cloneNode() : new Audio(src)
    const busVolume = clamp01(this._settings[busName] ?? this._settings.sfx)
    el.volume = clamp01(this._settings.master) * busVolume * clamp01(volumeScale)
    el.muted = !!this._settings.muted
    el.preload = 'auto'
    el.play().catch(() => {
      const family = busName === 'voice' ? 'voice_fallback' : 'sfx_fallback'
      const fallbackPitch = busName === 'voice' ? 0.85 : undefined
      this._tone(220 * (fallbackPitch ?? this._pitchFromFamily(family)), 'square', 0.08 * volumeScale, 0, 0.05, 0.09, 18, busName)
    })
  }

  _startLoopingSfx(loopId, key, options = {}) {
    this._stopLoopingSfx(loopId)

    const asset = withResolvedAudioPaths(getOneShotAudio(key), options.bus === 'voice' ? 'voice' : 'sfx')
    if (!asset?.src) return

    const el = new Audio(asset.src)
    const busName = options.bus ?? 'sfx'
    const busVolume = clamp01(this._settings[busName] ?? this._settings.sfx)
    el.loop = true
    el.volume = clamp01(this._settings.master) * busVolume * clamp01(options.volumeScale ?? 1)
    el.muted = !!this._settings.muted
    el.preload = 'auto'
    el.play().catch(() => {})
    this._loopingSfx.set(loopId, { el, busName, volumeScale: options.volumeScale ?? 1 })
  }

  _stopLoopingSfx(loopId) {
    const entry = this._loopingSfx.get(loopId)
    if (!entry) return
    entry.el.pause()
    entry.el.src = ''
    this._loopingSfx.delete(loopId)
  }

  _stopPlayerChannelAudio(playerId) {
    this._stopLoopingSfx(playerId)
    this._channelPlayers.delete(playerId)
  }

  _primeSfxCache() {
    for (const assetDef of Object.values(SKILL_AUDIO_ONE_SHOTS)) {
      const asset = withResolvedAudioPaths(assetDef, 'sfx')
      if (!asset?.src) continue
      this._getCachedSfx(asset.src)
    }
  }

  _getCachedSfx(src) {
    if (!src) return null
    let audio = this._sfxCache.get(src)
    if (audio) return audio

    audio = new Audio(src)
    audio.preload = 'auto'
    audio.load()
    this._sfxCache.set(src, audio)
    return audio
  }

  _pitchFromFamily(family) {
    if (!family) return 1
    let hash = 0
    for (let i = 0; i < family.length; i++) hash = ((hash << 5) - hash + family.charCodeAt(i)) | 0
    return 0.8 + (Math.abs(hash) % 50) / 100
  }

  _playArpeggio(notes, type, volume, intervalMs) {
    notes.forEach((hz, i) => {
      window.setTimeout(() => this._tone(hz, type, volume, 0, 0.1, 0.18, 0, 'sfx'), i * intervalMs)
    })
  }

  _tone(hz, type, vol, attack, sustain, release, bend = 0, busName = 'sfx') {
    if (!this._ctx || !this._buses || this._settings.muted) return

    const ctx = this._ctx
    const bus = this._buses[busName] ?? this._buses.sfx
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(hz, now)
    if (bend !== 0) {
      osc.frequency.linearRampToValueAtTime(hz + bend, now + sustain + release)
    }

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(vol, now + attack + 0.001)
    gain.gain.setValueAtTime(vol, now + attack + sustain)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + sustain + release)

    osc.connect(gain)
    gain.connect(bus)
    osc.start(now)
    osc.stop(now + attack + sustain + release + 0.02)
  }
}
