class AudioManager {
  constructor() {
    if (AudioManager.instance) {
      return AudioManager.instance;
    }
    this.audioContext = null;
    this.sounds = {};
    this.music = null;
    this.initialized = false;
    this.masterVolume = 0.7;
    AudioManager.instance = this;
  }

  init() {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      console.log('AudioManager initialized');
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  async preload(soundMap) {
    if (!this.initialized) {
      console.warn('AudioManager not initialized. Call init() first.');
      return;
    }
    for (const [key, url] of Object.entries(soundMap)) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.sounds[key] = audioBuffer;
        console.log(`Loaded sound: ${key}`);
      } catch (e) {
        console.warn(`Failed to load sound: ${key}`, e);
      }
    }
  }

  play(key, volume = 1.0) {
    if (!this.initialized || !this.sounds[key]) {
      return;
    }
    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      source.buffer = this.sounds[key];
      gainNode.gain.value = volume * this.masterVolume;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);
    } catch (e) {
      console.warn(`Failed to play sound: ${key}`, e);
    }
  }

  playMusic(key, volume = 0.5) {
    if (!this.initialized || !this.sounds[key]) {
      return;
    }
    this.stopMusic();
    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      source.buffer = this.sounds[key];
      source.loop = true;
      gainNode.gain.value = volume * this.masterVolume;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);
      this.music = source;
    } catch (e) {
      console.warn(`Failed to play music: ${key}`, e);
    }
  }

  stopMusic() {
    if (this.music) {
      try {
        this.music.stop();
      } catch (e) {}
      this.music = null;
    }
  }

  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }
}

export default new AudioManager();
