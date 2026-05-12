<script>
  import { onMount } from 'svelte'
  import { EVENTS } from '../../../shared/protocol.js'
  import { gameState } from '../stores/gameState.js'
  import HostButton from '../components/HostButton.svelte'

  let { socket, audio } = $props()

  const isLoading       = $derived($gameState.isLoading)
  const loadingProgress = $derived($gameState.loadingProgress)

  let qrEl = $state()
  let audioOpen = $state(false)
  let audioSettings = $state({ master: 85, music: 65, sfx: 85, voice: 90, muted: false })

  $effect(() => {
    const url = $gameState.networkUrl
    if (!url || !qrEl) return
    qrEl.innerHTML = ''
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrEl, {
        text:       url,
        width:      200,
        height:     200,
        colorDark:  '#000000',
        colorLight: '#ffffff',
      })
    }
  })

  onMount(() => {
    if (audio) {
      const s = audio.getSettings()
      audioSettings = {
        master: Math.round(s.master * 100),
        music:  Math.round(s.music  * 100),
        sfx:    Math.round(s.sfx    * 100),
        voice:  Math.round(s.voice  * 100),
        muted:  !!s.muted,
      }
    }
  })

  function handlePlay() {
    if (audio) audio.init()
    socket.emit(EVENTS.START_GAME)
  }

  function applyAudio() {
    if (!audio) return
    audio.applySettings({
      master: audioSettings.master / 100,
      music:  audioSettings.music  / 100,
      sfx:    audioSettings.sfx    / 100,
      voice:  audioSettings.voice  / 100,
      muted:  audioSettings.muted,
    })
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }
</script>

<div class="creation-screen">
  {#if isLoading}
    <div class="loading-view">
      <h1 class="game-title">RAID NIGHT</h1>
      <p class="game-subtitle">Bachelor Party Edition</p>
      <div class="progress-track">
        <div class="progress-fill" style="width: {Math.round(loadingProgress * 100)}%"></div>
      </div>
      <p class="loading-label">Loading assets… {Math.round(loadingProgress * 100)}%</p>
    </div>
  {:else}
    <div class="creation-inner">
      <div class="crest">
        <h1 class="game-title">RAID NIGHT</h1>
        <p class="game-subtitle">Bachelor Party Edition</p>
      </div>

      <div class="join-section">
        {#if $gameState.networkUrl}
          <p class="join-label">
            Join at <span class="join-url">{$gameState.networkUrl.replace(/^https?:\/\//, '')}</span>
          </p>
        {:else}
          <p class="join-label connecting">Fetching server address…</p>
        {/if}
        <div class="qr-frame" bind:this={qrEl}></div>
        <p class="qr-hint">Scan to open the controller on your phone</p>
      </div>

      <div class="play-area">
        <HostButton label="▶  PLAY" variant="large" onclick={handlePlay} />
      </div>

      <div class="footer-controls">
        <button class="util-btn" onclick={() => audioOpen = !audioOpen}>
          {audioOpen ? '▲' : '▼'} Audio Settings
        </button>
        <button class="util-btn" onclick={toggleFullscreen}>⛶ Fullscreen</button>
      </div>

      {#if audioOpen}
        <div class="audio-panel">
          <div class="audio-title">Audio Mix</div>
          {#each [['Master', 'master'], ['Music', 'music'], ['SFX', 'sfx'], ['Voice', 'voice']] as [label, key]}
            <label class="audio-row">
              <span>{label}</span>
              <input type="range" min="0" max="100" bind:value={audioSettings[key]}
                oninput={applyAudio} onchange={applyAudio} />
              <output>{audioSettings[key]}%</output>
            </label>
          {/each}
          <label class="audio-toggle">
            <input type="checkbox" bind:checked={audioSettings.muted} onchange={applyAudio} />
            <span>Mute all</span>
          </label>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .creation-screen {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at 50% 20%, rgba(200, 148, 40, 0.12) 0%, rgba(200, 148, 40, 0) 26%),
      radial-gradient(circle at 50% -6%, rgba(255, 200, 80, 0.07) 0%, rgba(255, 200, 80, 0) 32%),
      linear-gradient(180deg, #1E1208 0%, #120A04 52%, #080402 100%);
    overflow-y: auto;
  }

  .loading-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    width: min(480px, 88vw);
    text-align: center;
  }

  .progress-track {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--rn-gold);
    border-radius: 3px;
    transition: width 0.1s linear;
  }

  .loading-label {
    font-size: 13px;
    color: var(--rn-text-dim);
    letter-spacing: 0.5px;
  }

  .creation-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
    width: min(640px, 92vw);
    padding: 40px 24px;
  }

  /* Title */
  .crest { text-align: center; }

  .game-title {
    font-size: clamp(32px, 5vw, 56px);
    font-weight: 900;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: var(--rn-gold);
    text-shadow: 0 0 32px rgba(255, 209, 0, 0.35), 0 2px 6px rgba(0,0,0,0.6);
    line-height: 1.1;
  }

  .game-subtitle {
    font-size: 13px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--rn-text-secondary);
    margin-top: 6px;
  }

  /* Join section */
  .join-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .join-label {
    font-size: 14px;
    color: var(--rn-text-body);
    text-align: center;
  }
  .join-label.connecting { color: var(--rn-text-dim); font-style: italic; }

  .join-url {
    color: var(--rn-accent);
    font-weight: 700;
  }

  .qr-frame {
    background: #fff;
    padding: 10px;
    border-radius: var(--rn-radius-md);
    box-shadow: 0 8px 28px rgba(0,0,0,0.45);
    min-width: 220px;
    min-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .qr-hint {
    font-size: 12px;
    color: var(--rn-text-dim);
    text-align: center;
    letter-spacing: 0.4px;
  }

  /* Play */
  .play-area { width: 100%; max-width: 280px; }

  /* Footer controls */
  .footer-controls {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .util-btn {
    padding: 7px 14px;
    border-radius: var(--rn-radius-sm);
    border: 1px solid rgba(100, 72, 20, 0.40);
    background: rgba(26, 16, 8, 0.70);
    color: var(--rn-text-dim);
    font-size: 12px;
    cursor: pointer;
  }
  .util-btn:hover { color: var(--rn-text-body); border-color: var(--rn-border); }

  /* Audio panel */
  .audio-panel {
    width: 100%;
    max-width: 360px;
    padding: 14px 16px;
    border-radius: var(--rn-radius-md);
    border: 1px solid rgba(100, 72, 20, 0.35);
    background: rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .audio-title {
    font-size: 11px;
    letter-spacing: 1.1px;
    text-transform: uppercase;
    color: var(--rn-gold);
    font-weight: 700;
    margin-bottom: 2px;
  }

  .audio-row {
    display: grid;
    grid-template-columns: 52px 1fr 36px;
    gap: 8px;
    align-items: center;
    font-size: 12px;
    color: var(--rn-text-body);
  }

  .audio-row input[type=range] { width: 100%; accent-color: var(--rn-gold); }
  .audio-row output { text-align: right; color: var(--rn-text-dim); font-variant-numeric: tabular-nums; }

  .audio-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--rn-text-body);
    cursor: pointer;
  }
</style>
