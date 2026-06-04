import {
  AUDIO_DUCKING,
  AUDIO_ONE_SHOTS,
  AUDIO_STINGERS,
  AUDIO_STORAGE_KEYS,
  HIT_FLESH_KEYS,
  SFX_VOLUME_SCALES,
  SKILL_AUDIO_ONE_SHOTS,
  createDefaultAudioSettings,
  getDialogAudio,
  getLevelAudio,
  getOneShotAudio,
  getSkillAudio,
  getSourceSkillAudio,
  withResolvedAudioPaths,
} from '../../../shared/AudioConfig.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'

// Skills whose EFFECT_DAMAGE events (DOT ticks) should play no impact sound
const DOT_SILENT_SKILLS = new Set(['Corruption', 'Moonfire'])

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0))
}

function nowMs() {
  return performance?.now?.() ?? Date.now()
}

function sfxCategoryScale(key) {
  const m = String(key ?? '').match(/_([a-z]+)$/)
  return m ? (SFX_VOLUME_SCALES[m[1]] ?? 1) : 1
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
    this._sfxDuck = 1
    this._sfxDucked = false
    this._lastDamageAt = 0
    this._lastPlayerImpactAt = 0
    this._lastDownedPlayers = new Set()
    this._throttle = {
      hit: 90,
      downed: 800,
      skillCastFamilyMs: 200,
      skillCastMaxConcurrent: 4,
      skillCastWindowMs: 100,
    }
    this._lastDownedAt = 0
    this._skillFamilyThrottle = new Map()
    this._recentSkillFires = []
    this._channelPlayers = new Map()
    this._loopingSfx = new Map()
    this._sfxCache = new Map()
    this._activeVoiceEl = null
    this._reactiveVoiceEl = null
    this._voiceReleaseTimer = null
    this._fadingOutEl = null
    this._fadingOutTimer = null
    this._greetingMusicDuck = 1
    this._greetingDuckTimer = null
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

    this._stopLoopingSfx('portal_entrance')

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
    if (data?.type === 'PYLON_SPAWN')     { this._handlePylonSpawn();     return }
    if (data?.type === 'PYLON_CHARGING')  { this._handlePylonCharging();  return }
    if (data?.type === 'PYLON_IDLE')      { this._handlePylonIdle();      return }
    if (data?.type === 'PYLON_ACTIVATED') { this._handlePylonActivated(); return }
    if (data?.type === 'PYLON_EXPIRED')   { this._handlePylonExpired();   return }

    const audio = getSkillAudio(data?.skillName, data?.type, data?.subtype)
    const family = audio.family ?? 'generic'
    const t = nowMs()

    // Gate 1: per-family throttle — same sound family can't fire twice within the window
    const lastFamilyFire = this._skillFamilyThrottle.get(family) ?? 0
    if (t - lastFamilyFire < this._throttle.skillCastFamilyMs) return

    // Gate 2: global concurrent cap — at most N distinct skill cast sounds in the window.
    // Signature-tier skills bypass this entirely and don't consume a slot.
    if (audio.tier !== 'signature') {
      const windowStart = t - this._throttle.skillCastWindowMs
      while (this._recentSkillFires.length && this._recentSkillFires[0] < windowStart) {
        this._recentSkillFires.shift()
      }
      if (this._recentSkillFires.length >= this._throttle.skillCastMaxConcurrent) return
      this._recentSkillFires.push(t)
    }

    this._skillFamilyThrottle.set(family, t)
    this._playNamedSfx(audio.cast, { family, variation: data?.playerId })
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

    const enemyAudio = getSourceSkillAudio(data.sourceSkill)
    if (data.type !== 'heal' && enemyAudio) {
      if (t - this._lastDamageAt < this._throttle.hit) return
      this._lastDamageAt = t
      if (enemyAudio.family?.startsWith('sfx_boss_')) {
        this._playNamedSfx(enemyAudio.impact, { family: enemyAudio.family, volumeScale: 0.5 })
      } else {
        this._playNamedSfx(this._randomFleshHitKey(), { family: 'combat_hit', volumeScale: 0.5 })
      }
      return
    }
    if (data.type !== 'heal' && !data.sourceSkill) {
      if (t - this._lastDamageAt < this._throttle.hit) return
      this._lastDamageAt = t
      this._playNamedSfx('sfx_skill_shoot_bow_impact', { family: 'combat_projectile', volumeScale: 0.5 })
      return
    }
    if (t - this._lastPlayerImpactAt < this._throttle.hit) return
    this._lastPlayerImpactAt = t
    const sourceAudio = getSkillAudio(data.sourceSkill)
    const key = data.type === 'heal'
      ? (sourceAudio?.impact ?? AUDIO_STINGERS.hitHeal.key)
      : (sourceAudio?.impact ?? AUDIO_STINGERS.hitDamage.key)
    this._playNamedSfx(key, { family: sourceAudio?.family ?? data.sourceSkill ?? 'combat_hit' })
  }

  handleTargetedHit(data) {
    if (!data) return
    const enemyAudio = getSourceSkillAudio(data.sourceSkill)
    if (enemyAudio) {
      this._playNamedSfx(this._randomFleshHitKey(), { family: 'combat_hit' })
      return
    }
    const sourceAudio = getSkillAudio(data.sourceSkill)
    const key = sourceAudio?.impact ?? 'combat_targeted_hit'
    this._playNamedSfx(key, { family: sourceAudio?.family ?? data.effectType ?? 'targeted' })
  }

  handleDialogLine(data) {
    if (!data) return
    const dialog = getDialogAudio(data.speaker, data.text, data.voiceKey)
    this._duckForVoice(true, { duckSfx: true })
    this._playVoice(dialog)
  }

  handleDialogClear() {
    window.clearTimeout(this._voiceReleaseTimer)
    this._voiceReleaseTimer = null
    if (this._activeVoiceEl) {
      this._activeVoiceEl.pause()
      this._activeVoiceEl.currentTime = 0
      this._activeVoiceEl = null
    }
    this._duckForVoice(false)
  }

  handleBossVo(data) {
    if (!data?.voiceKey) return
    if (this._activeVoiceEl) return  // cinematic dialog takes priority
    if (this._reactiveVoiceEl) {
      this._reactiveVoiceEl.pause()
      this._reactiveVoiceEl = null
    }
    const src = `/assets/audio/voice/${data.voiceKey}.ogg`
    const busVolume = clamp01(this._settings.voice ?? this._settings.sfx)
    const el = new Audio(src)
    el.volume = clamp01(this._settings.master) * busVolume * 0.85
    el.muted = !!this._settings.muted
    el.preload = 'auto'
    this._reactiveVoiceEl = el
    el.addEventListener('ended', () => {
      if (this._reactiveVoiceEl === el) this._reactiveVoiceEl = null
    }, { once: true })
    el.play().catch(() => {
      if (this._reactiveVoiceEl === el) this._reactiveVoiceEl = null
    })
  }

  handleLeviathanDeath() {
    this._playNamedSfx('sfx_enemy_leviathan_death', { family: 'sfx_enemy_leviathan', volumeScale: 0.8 })
  }

  handlePhaseTransition() {
    this._playNamedSfx(AUDIO_STINGERS.phaseTransition.key, { family: 'boss_phase' })
  }

  handleAuraPulse() {
    this._playNamedSfx('boss_aura_pulse', { family: 'boss_aura' })
  }

  handlePortalEntranceLoop() {
    this._startLoopingSfx('portal_entrance', 'sfx_portal_entrance_loop', { volumeScale: 0.85 })
  }

  handlePortalEntranceLoopStop() {
    this._stopLoopingSfx('portal_entrance')
  }

  handlePortalEntranceEnd() {
    this._stopLoopingSfx('portal_entrance')
    this._playNamedSfx('sfx_portal_entrance_end')
  }

  handleBoulderSpawn() {
    this._stopLoopingSfx('boulder_loop')
    this._startLoopingSfx('boulder_charge', 'sfx_boulder_charge_up', { volumeScale: 0.75 })
  }

  handleBoulderRoll() {
    this._stopLoopingSfx('boulder_charge')
    this._startLoopingSfx('boulder_loop', 'sfx_boulder_loop', { volumeScale: 0.8 })
  }

  handleBoulderClear() {
    this._stopLoopingSfx('boulder_charge')
    this._stopLoopingSfx('boulder_loop')
  }

  handleGateDestroy() {
    this._playNamedSfx('sfx_gate_destroy', { family: 'sfx_gate', volumeScale: 0.9 })
  }

  handlePortalBeamWarning() {
    this._stopLoopingSfx('portal_beam')
    this._playNamedSfx('fx_portal_beam_start', { family: 'portal_beam' })
  }

  handlePortalBeamDamage() {
    this._startLoopingSfx('portal_beam', 'fx_portal_beam_loop', { volumeScale: 0.9 })
  }

  handlePortalBeamEnd() {
    this._stopLoopingSfx('portal_beam')
  }

  handlePlayerJoined() {
    this._playNamedSfx(AUDIO_STINGERS.playerJoin.key, { family: 'ui_join' })
  }

  handlePlayerGreeting() {
    if (!this._greetingBag || this._greetingBag.length === 0) {
      this._greetingBag = this._shuffle(Array.from({ length: 10 }, (_, i) => i + 1))
    }
    const n = this._greetingBag.pop()
    const src = `/assets/audio/voice/voice_player_greeting_${String(n).padStart(2, '0')}.ogg`
    this._playHtmlOneShot(src, 'voice', 0.9)

    // Duck music for 3.5s; each consecutive greeting resets the hold timer
    // so a rapid sequence of joins keeps the music ducked throughout.
    if (this._greetingDuckTimer) {
      clearTimeout(this._greetingDuckTimer)
    } else {
      this._greetingMusicDuck = 0.3
      this._applySettings()
    }
    this._greetingDuckTimer = setTimeout(() => {
      this._greetingDuckTimer = null
      this._greetingMusicDuck = 1
      this._applySettings()
    }, 4500)
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  syncPlayerState(players = {}) {
    const activePlayerIds = new Set()
    const deadNow = new Set()
    for (const player of Object.values(players)) {
      if (!player?.id) continue
      activePlayerIds.add(player.id)

      const previous = this._channelPlayers.get(player.id) ?? { castSkill: null, isChanneling: false, castSfxEl: null }
      const castSkill = player.castSkill ?? null
      const castProgress = player.castProgress
      const isChanneling = !!player.isChanneling

      let castSfxEl = previous.castSfxEl ?? null

      if (castSkill && castProgress != null && previous.castSkill !== castSkill) {
        const skillAudio = getSkillAudio(castSkill)
        if (isChanneling) {
          if (skillAudio.cast) this._playNamedSfx(skillAudio.cast, { family: skillAudio.family, variation: player.id })
          if (skillAudio.channel) this._startLoopingSfx(player.id, skillAudio.channel, { volumeScale: 0.85 })
          castSfxEl = null
        } else {
          const startCue = skillAudio.precast ?? skillAudio.cast
          castSfxEl = startCue ? this._playNamedSfx(startCue, { family: skillAudio.family, variation: player.id }) : null
        }
      }

      // Cast fired or cancelled: stop the cast SFX early if it's still playing
      if (previous.castSkill && !castSkill && !previous.isChanneling && castSfxEl) {
        castSfxEl.pause()
        castSfxEl.src = ''
        castSfxEl = null
      }

      if ((!isChanneling || !castSkill || castProgress == null) && previous.isChanneling) {
        this._stopPlayerChannelAudio(player.id)
        castSfxEl = null
      }

      this._channelPlayers.set(player.id, { castSkill, isChanneling, castSfxEl })

      if (!player || player.isHost || !player.isDowned) continue
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

  playTransition() {}

  playVictory() {}

  playDefeat() {}

  playPlayButton() {
    this._playNamedSfx('ui_play_button')
  }

  playSimpleButton() {
    this._playNamedSfx('ui_simple_button')
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
    this._buses.sfx.gain.value = clamp01(this._settings.sfx) * this._sfxDuck
    this._buses.voice.gain.value = clamp01(this._settings.voice)

    if (this._musicEl) {
      this._musicEl.muted = muted
      this._musicEl.volume = clamp01(this._settings.music) * clamp01(this._settings.master) * this._musicDuck * this._greetingMusicDuck
    }

    for (const entry of this._loopingSfx.values()) {
      const busVolume = clamp01(this._settings[entry.busName] ?? this._settings.sfx)
      const duckScale = entry.busName === 'sfx' ? this._sfxDuck : 1
      entry.el.muted = muted
      entry.el.volume = clamp01(this._settings.master) * busVolume * clamp01(entry.volumeScale) * duckScale
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
      this._fadeOutMusic(this._musicEl, 10000)
      this._musicEl = null
    }

    if (!definition?.src) return

    const audio = new Audio(definition.src)
    audio.loop = definition.loop !== false
    audio.preload = 'auto'
    audio.volume = clamp01(this._settings.music) * clamp01(this._settings.master) * this._musicDuck
    audio.muted = !!this._settings.muted
    if (definition.startTime) audio.currentTime = definition.startTime
    audio.play().catch(() => {})
    this._musicEl = audio
  }

  _fadeOutMusic(el, durationMs) {
    // Drop any in-progress fade so we never have two ghosts running
    if (this._fadingOutTimer) {
      clearInterval(this._fadingOutTimer)
      this._fadingOutTimer = null
    }
    if (this._fadingOutEl) {
      this._fadingOutEl.pause()
      this._fadingOutEl.src = ''
    }

    this._fadingOutEl = el
    const startVolume = el.volume
    const startTime = performance.now()

    this._fadingOutTimer = setInterval(() => {
      const progress = Math.min((performance.now() - startTime) / durationMs, 1)
      el.volume = startVolume * (1 - progress)

      if (progress >= 1) {
        clearInterval(this._fadingOutTimer)
        this._fadingOutTimer = null
        el.pause()
        el.src = ''
        this._fadingOutEl = null
      }
    }, 50)
  }

  _duckForVoice(active, { duckSfx = false } = {}) {
    if (!this._buses) return

    const sfxWasDucked = this._sfxDucked

    if (active && duckSfx) {
      this._sfxDuck   = AUDIO_DUCKING.voiceSfxDialogMultiplier
      this._sfxDucked = true
    }

    this._musicDuck = active ? AUDIO_DUCKING.voiceMusicMultiplier : 1
    this._applySettings()

    const now = this._ctx?.currentTime ?? 0
    const musicTarget = active
      ? clamp01(this._settings.music) * AUDIO_DUCKING.voiceMusicMultiplier
      : clamp01(this._settings.music)
    this._buses.music.gain.cancelScheduledValues(now)
    this._buses.music.gain.setValueAtTime(this._buses.music.gain.value, now)
    this._buses.music.gain.linearRampToValueAtTime(musicTarget, now + AUDIO_DUCKING.releaseMs / 1000)

    // Restore sfx bus smoothly when releasing a dialog duck
    if (!active && sfxWasDucked) {
      this._sfxDuck   = 1
      this._sfxDucked = false
      const sfxTarget = clamp01(this._settings.sfx)
      this._buses.sfx.gain.cancelScheduledValues(now)
      this._buses.sfx.gain.setValueAtTime(this._buses.sfx.gain.value, now)
      this._buses.sfx.gain.linearRampToValueAtTime(sfxTarget, now + AUDIO_DUCKING.releaseMs / 1000)
    }
  }

  _playVoice(dialog) {
    if (this._activeVoiceEl) {
      this._activeVoiceEl.pause()
      this._activeVoiceEl.currentTime = 0
      this._activeVoiceEl = null
    }
    if (!dialog?.src) return

    const busVolume = clamp01(this._settings.voice ?? this._settings.sfx)
    const el = new Audio(dialog.src)
    el.volume = clamp01(this._settings.master) * busVolume * 0.7
    el.muted   = !!this._settings.muted
    el.preload = 'auto'
    this._activeVoiceEl = el

    el.addEventListener('ended', () => {
      if (this._activeVoiceEl === el) {
        this._activeVoiceEl = null
        this._duckForVoice(false)
      }
    }, { once: true })

    el.play().catch(() => {
      if (this._activeVoiceEl === el) {
        this._activeVoiceEl = null
        this._duckForVoice(false)
      }
    })
  }

  _playNamedSfx(_key, options = {}) {
    const asset = options.src
      ? { key: _key, src: options.src }
      : withResolvedAudioPaths(getOneShotAudio(_key), options.bus === 'voice' ? 'voice' : 'sfx')

    if (asset?.src) {
      const volumeScale = options.volumeScale ?? sfxCategoryScale(_key)
      return this._playHtmlOneShot(asset.src, options.bus ?? 'sfx', volumeScale)
    }
    return null
  }

  _playHtmlOneShot(src, busName, volumeScale = 1) {
    const base = this._getCachedSfx(src)
    const el = base ? base.cloneNode() : new Audio(src)
    const busVolume = clamp01(this._settings[busName] ?? this._settings.sfx)
    const duckScale = busName === 'sfx' ? this._sfxDuck : 1
    el.volume = clamp01(this._settings.master) * busVolume * clamp01(volumeScale) * duckScale
    el.muted = !!this._settings.muted
    el.preload = 'auto'
    el.play().catch(() => {})
    return el
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

  _handlePylonSpawn() {
    this._stopLoopingSfx('pylon_active')
  }

  _handlePylonCharging() {
    this._startLoopingSfx('pylon_charge', 'sfx_holy_tower_loop', { volumeScale: 0.6 })
  }

  _handlePylonIdle() {
    this._stopLoopingSfx('pylon_charge')
  }

  _handlePylonActivated() {
    this._stopLoopingSfx('pylon_charge')
    this._startLoopingSfx('pylon_active', 'sfx_holy_tower_cast', { volumeScale: 0.7 })
  }

  _handlePylonExpired() {
    this._stopLoopingSfx('pylon_charge')
    this._stopLoopingSfx('pylon_active')
  }

  _stopPlayerChannelAudio(playerId) {
    this._stopLoopingSfx(playerId)
    this._channelPlayers.delete(playerId)
  }

  _primeSfxCache() {
    const allAssets = [
      ...Object.values(SKILL_AUDIO_ONE_SHOTS),
      ...Object.values(AUDIO_ONE_SHOTS),
      ...Object.values(AUDIO_STINGERS),
    ]
    for (const assetDef of allAssets) {
      if (!assetDef?.src) continue
      this._getCachedSfx(assetDef.src)
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

  debugResetAudio() {
    if (this._greetingDuckTimer) { clearTimeout(this._greetingDuckTimer); this._greetingDuckTimer = null }
    if (this._voiceReleaseTimer) { clearTimeout(this._voiceReleaseTimer); this._voiceReleaseTimer = null }

    if (this._fadingOutTimer) { clearInterval(this._fadingOutTimer); this._fadingOutTimer = null }
    if (this._fadingOutEl) { this._fadingOutEl.pause(); this._fadingOutEl.src = ''; this._fadingOutEl = null }

    if (this._activeVoiceEl) { this._activeVoiceEl.pause(); this._activeVoiceEl.src = ''; this._activeVoiceEl = null }
    if (this._reactiveVoiceEl) { this._reactiveVoiceEl.pause(); this._reactiveVoiceEl.src = ''; this._reactiveVoiceEl = null }

    this._sfxDuck = 1
    this._sfxDucked = false
    this._musicDuck = 1
    this._greetingMusicDuck = 1

    if (this._buses) {
      const now = this._ctx?.currentTime ?? 0
      for (const busName of ['master', 'music', 'sfx', 'voice']) {
        const node = this._buses[busName]
        if (!node) continue
        node.gain.cancelScheduledValues(now)
        node.gain.setValueAtTime(node.gain.value, now)
      }
    }

    this._resume()
    this._applySettings()

    if (this._musicEl && this._musicEl.paused) {
      this._musicEl.volume = clamp01(this._settings.music) * clamp01(this._settings.master) * this._musicDuck * this._greetingMusicDuck
      this._musicEl.muted = !!this._settings.muted
      this._musicEl.play().catch(() => {})
    }

    console.log('[AudioManager] debugResetAudio — duck state cleared, gains restored')
  }

  _randomFleshHitKey() {
    return HIT_FLESH_KEYS[Math.floor(Math.random() * HIT_FLESH_KEYS.length)]
  }

  _pitchFromFamily(family) {
    if (!family) return 1
    let hash = 0
    for (let i = 0; i < family.length; i++) hash = ((hash << 5) - hash + family.charCodeAt(i)) | 0
    return 0.8 + (Math.abs(hash) % 50) / 100
  }

}
