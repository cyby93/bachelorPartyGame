<script>
  import { onDestroy, onMount, untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import { CLASSES } from '../../../shared/ClassConfig.js';
  import { EVENTS } from '../../../shared/protocol.js';
  import HostButton from '../components/HostButton.svelte';
  import { gameState } from '../stores/gameState.js';

  let { socket, audio } = $props()

  const isLoading       = $derived($gameState.isLoading)
  const loadingProgress = $derived($gameState.loadingProgress)

  // 'loading' → 'waiting' (assets done, waiting for click) → 'ready' (show lobby)
  let loadPhase = $state('loading')

  $effect(() => {
    if (!isLoading && loadPhase === 'loading') {
      loadPhase = 'waiting'
    }
  })

  function advance() {
    if (loadPhase !== 'waiting') return
    loadPhase = 'ready'
    if (audio) {
      audio.init()
      audio.setScene('staging')
    }
  }

  function onKeyDown(e) {
    if (loadPhase === 'waiting') advance()
  }

  onMount(() => {
    window.addEventListener('keydown', onKeyDown)
  })

  onDestroy(() => {
    window.removeEventListener('keydown', onKeyDown)
  })

  let isLeaving = $state(false)

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
    if (isLeaving) return
    isLeaving = true
    if (audio) audio.playPlayButton()
    setTimeout(() => socket.emit(EVENTS.START_GAME), 2000)
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

  const EDGE_SLOTS = [
    { edge: 'left',   pct: 28 },
    { edge: 'right',  pct: 28 },
    { edge: 'left',   pct: 52 },
    { edge: 'right',  pct: 52 },
    { edge: 'left',   pct: 76 },
    { edge: 'right',  pct: 76 },
    { edge: 'top',    pct: 25 },
    { edge: 'bottom', pct: 25 },
    { edge: 'top',    pct: 75 },
    { edge: 'bottom', pct: 75 },
    { edge: 'left',   pct: 14 },
    { edge: 'right',  pct: 14 },
    { edge: 'top',    pct: 50 },
  ]

  const joinedGuests = $derived(
    Object.values($gameState.players).filter(p => !p.isHost && !p.isBot)
  )

  // Joined entries override waiting entries when the same id is in both lists
  // (the brief overlap window while the server sends PLAYER_JOINED then WAITING_PLAYERS).
  const guestLookup = $derived(
    new Map([
      ...($gameState.waitingPlayers ?? []).map(w => [w.id, { id: w.id, name: w.name, color: '#888888',                                    pending: true  }]),
      ...joinedGuests.map(p =>                          [p.id, { id: p.id, name: p.name, color: CLASSES[p.className]?.color ?? '#888888', pending: false }]),
    ])
  )

  // Stable insertion-order list of ids — a player's position never changes once assigned.
  let guestOrder = $state([])

  $effect(() => {
    const joinedIds  = joinedGuests.map(p => p.id)
    const waitingIds = ($gameState.waitingPlayers ?? []).map(w => w.id)
    const allIds     = new Set([...joinedIds, ...waitingIds])

    const current = untrack(() => guestOrder)
    const next    = current.filter(id => allIds.has(id))
    for (const id of [...waitingIds, ...joinedIds]) {
      if (!next.includes(id)) next.push(id)
    }
    guestOrder = next
  })

  const pillEntries = $derived(
    guestOrder
      .filter(id => guestLookup.has(id))
      .slice(0, EDGE_SLOTS.length)
      .map((id, i) => ({ ...guestLookup.get(id), slot: EDGE_SLOTS[i], delay: `${(i * 0.37).toFixed(2)}s` }))
  )

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="creation-screen" onclick={loadPhase === 'waiting' ? advance : null}>
  {#if loadPhase !== 'ready'}
    <div class="loading-view" out:fade={{ duration: 2000 }}>
      <h1 class="game-title">RAID NIGHT</h1>
      <p class="game-subtitle">Bachelor Party Edition</p>
      <div class="progress-track">
        <div class="progress-fill" style="width: {loadPhase === 'loading' ? Math.round(loadingProgress * 100) : 100}%"></div>
      </div>
      {#if loadPhase === 'waiting'}
        <p class="click-to-continue">Click anywhere to continue…</p>
      {:else}
        <p class="loading-label">Loading assets… {Math.round(loadingProgress * 100)}%</p>
      {/if}
    </div>
  {:else}
    <div class="creation-inner" class:is-leaving={isLeaving} in:fade={{ duration: 1200, delay: 2000 }}>
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
        <HostButton label="Play" variant="large" sound={false} onclick={handlePlay} />
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

  {#if loadPhase === 'ready'}
    {#each pillEntries as { id, name, slot, color, delay, pending } (id)}
      <div
        class="edge-anchor"
        class:is-leaving={isLeaving}
        data-edge={slot.edge}
        style="--pos: {slot.pct}%; --delay: {delay};"
        in:fade={{ duration: 700 }}
      >
        <div class="edge-pill" class:edge-pill--pending={pending} style="--cls-color: {color};">
          {name}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .creation-screen {
    position: fixed;
    inset: 0;
    z-index: 50;
    background:
      radial-gradient(circle at 50% 20%, rgba(200, 148, 40, 0.12) 0%, rgba(200, 148, 40, 0) 26%),
      radial-gradient(circle at 50% -6%, rgba(255, 200, 80, 0.07) 0%, rgba(255, 200, 80, 0) 32%),
      linear-gradient(180deg, #1E1208 0%, #120A04 52%, #080402 100%);
  }

  .loading-view {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
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

  .click-to-continue {
    font-size: 14px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--rn-gold);
    animation: ctc-pulse 1.6s ease-in-out infinite;
    cursor: pointer;
    user-select: none;
  }

  @keyframes ctc-pulse {
    0%, 100% { opacity: 0.25; }
    50%       { opacity: 1; }
  }

  .creation-inner {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
    width: min(640px, 92vw);
    padding: 40px 24px;
    max-height: 100dvh;
    overflow-y: auto;
    transition: opacity 2s ease-in-out;
  }

  .creation-inner.is-leaving {
    opacity: 0;
    pointer-events: none;
  }

  /* Title */
  .crest { text-align: center; }

  .game-title {
    font-family: 'LifeCraft', 'Trebuchet MS', sans-serif;
    font-size: clamp(32px, 10vw, 86px);
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

  /* --- Player edge ring --- */
  .edge-anchor {
    position: fixed;
    pointer-events: none;
    z-index: 60;
    transition: opacity 2s ease-in-out;
  }
  .edge-anchor.is-leaving { opacity: 0; }

  .edge-anchor[data-edge="left"]   { left: -100px;   top: var(--pos); transform: translateY(-50%); }
  .edge-anchor[data-edge="right"]  { right: -100px;  top: var(--pos); transform: translateY(-50%); }
  .edge-anchor[data-edge="top"]    { top: -30px;    left: var(--pos); transform: translateX(-50%); }
  .edge-anchor[data-edge="bottom"] { bottom: -30px; left: var(--pos); transform: translateX(-50%); }

  .edge-pill {
    padding: 100px 184px;
    background: radial-gradient(ellipse at center,
      color-mix(in srgb, var(--cls-color) 26%, transparent) 0%,
      color-mix(in srgb, var(--cls-color) 10%, transparent) 48%,
      transparent 72%
    );
    border: none;
    color: var(--cls-color);
    font-family: 'Morpheus', 'Trebuchet MS', sans-serif;
    font-size: 22px;
    font-weight: normal;
    letter-spacing: 2px;
    text-transform: uppercase;
    white-space: nowrap;
    text-shadow: 0 0 14px color-mix(in srgb, var(--cls-color) 55%, transparent);
    animation: pill-float 3.4s ease-in-out infinite alternate;
    animation-delay: var(--delay);
  }

  .edge-pill--pending {
    opacity: 0.55;
    filter: grayscale(0.4);
  }

  @keyframes pill-float {
    from { transform: translateY(0);    }
    to   { transform: translateY(-15px); }
  }
</style>
