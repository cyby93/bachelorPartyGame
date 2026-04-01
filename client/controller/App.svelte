<script>
  import { onMount, onDestroy } from 'svelte'
  import { io } from 'socket.io-client'
  import { EVENTS } from '../../shared/protocol.js'
  import JoinScreen   from './screens/JoinScreen.svelte'
  import GameScreen   from './screens/GameScreen.svelte'

  // ── Screens: 'join' | 'lobby' | 'game' | 'levelComplete' | 'end'
  let screen = $state('join')

  // ── Orientation
  let isPortrait = $state(false)

  // ── Player state
  let myId        = $state(null)
  let playerName  = $state('')
  let className   = $state('')
  let isDead      = $state(false)
  let cooldowns   = $state([0, 0, 0, 0])  // expiresAt timestamps per skill slot
  let comboPoints = $state(0)

  // ── End state
  let endMessage  = $state('')

  // ── Socket (plain let — must NOT be Proxy-wrapped)
  let socket

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isStandalone = !!window.navigator.standalone

  let isFullscreen = $state(false)

  function toggleFullscreen() {
    if (isIOS) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' })
        .then(() => screen.orientation?.lock('landscape').catch(() => {}))
        .catch(() => {})
    }
  }

  onMount(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    isPortrait = mq.matches
    mq.addEventListener('change', e => {
      isPortrait = e.matches
      if (!e.matches && !document.fullscreenElement) toggleFullscreen()
    })

    document.addEventListener('fullscreenchange', () => {
      isFullscreen = !!document.fullscreenElement
    })

    socket = io({ transports: ['websocket'] })
    socket.on('connect', () => {
      myId = socket.id
      // Reconnect: if already past the join screen, re-register with the server
      if (screen !== 'join' && playerName && className) {
        socket.emit(EVENTS.JOIN, { name: playerName, className, isHost: false })
      }
    })

    socket.on(EVENTS.SCENE_CHANGE, ({ scene, levelName, levelIndex, totalLevels }) => {
      if (scene === 'battle' || scene === 'bossFight') {
        screen = 'game'
      } else if (scene === 'lobby') {
        screen = 'lobby'
      } else if (scene === 'levelComplete') {
        screen = 'levelComplete'
        endMessage = `Level ${(levelIndex ?? 0) + 1} complete!`
      } else if (scene === 'result') {
        screen = 'end'
        endMessage = '🏆 Victory! Waiting for restart…'
      } else if (scene === 'gameover') {
        screen = 'end'
        endMessage = '💀 Defeated. Waiting for restart…'
      }
    })

    socket.on(EVENTS.STATE_DELTA, delta => {
      if (!myId) return
      const me = delta.players?.[myId]
      if (!me) return
      if (me.isDead != null) isDead = me.isDead
    })

    socket.on(EVENTS.COOLDOWN, data => {
      if (data.playerId !== myId) return
      cooldowns = cooldowns.map((v, i) => i === data.skillIndex ? Date.now() + data.durationMs : v)
    })

    socket.on(EVENTS.COMBO_POINTS, data => {
      if (data.playerId !== myId) return
      comboPoints = data.points
    })
  })

  onDestroy(() => { socket?.disconnect() })

  // ── Actions passed down to children

  function handleJoin({ name, cls }) {
    playerName = name
    className  = cls

    socket.emit(EVENTS.JOIN, { name, className: cls, isHost: false })
    screen = 'lobby'
  }

  function handleMove(vec) {
    socket.emit(EVENTS.INPUT_MOVE, vec)
  }

  function handleSkill({ index, vector, action }) {
    socket.emit(EVENTS.INPUT_SKILL, { index, vector, action })
  }

  function handleAim({ vector }) {
    socket.emit(EVENTS.INPUT_AIM, { vector })
  }
</script>

{#if isPortrait}
  <div class="rotate-overlay">
    <span class="rotate-icon">⟳</span>
    <p>Rotate your phone to landscape</p>
    {#if isIOS && !isStandalone}
      <p class="ios-hint">For fullscreen: tap <strong>Share ⬆</strong> → <strong>Add to Home Screen</strong>, then reopen from your home screen</p>
    {:else if !isIOS}
      <button onclick={toggleFullscreen}>{isFullscreen ? 'Exit fullscreen' : 'Tap to go fullscreen'}</button>
    {/if}
  </div>
{/if}

{#if !isPortrait && !isIOS}
  <button class="fullscreen-btn" onclick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
    {isFullscreen ? '⤡' : '⤢'}
  </button>
{/if}

<div class="app">
  {#if screen === 'join'}
    <JoinScreen onjoin={handleJoin} />

  {:else if screen === 'lobby' || screen === 'game'}
    <GameScreen
      {playerName}
      {className}
      {isDead}
      {cooldowns}
      {comboPoints}
      onmove={handleMove}
      onskill={handleSkill}
      onaim={handleAim}
    />

  {:else if screen === 'levelComplete'}
    <div class="end-screen">
      <p>{endMessage}</p>
      <p class="sublabel">Waiting for host to continue…</p>
    </div>

  {:else if screen === 'end'}
    <div class="end-screen">
      <p>{endMessage}</p>
    </div>
  {/if}
</div>

<style>
  .app {
    width: 100%;
    height: 100%;
  }

  .end-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    color: #7fa8c0;
    font-size: 18px;
    gap: 8px;
  }

  .sublabel {
    font-size: 14px;
    color: #556677;
  }

  .rotate-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #0f1923;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #fff;
    text-align: center;
    padding: 24px;
  }

  .rotate-icon {
    font-size: 64px;
    display: block;
    animation: spin 2s linear infinite;
  }

  .rotate-overlay p {
    font-size: 18px;
    color: #aad4e8;
  }

  .rotate-overlay button {
    padding: 12px 24px;
    border-radius: 8px;
    border: 1px solid #1e3a4a;
    background: #16202a;
    color: #00d2ff;
    font-size: 15px;
    cursor: pointer;
  }

  .ios-hint {
    font-size: 14px;
    color: #aad4e8;
    max-width: 260px;
    text-align: center;
    line-height: 1.5;
  }

  /* Floating fullscreen toggle — landscape only */
  .fullscreen-btn {
    position: fixed;
    top: 8px;
    right: 8px;
    z-index: 9998;
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 6px;
    border: 1px solid #1e3a4a;
    background: rgba(22, 32, 42, 0.75);
    color: #00d2ff;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.5;
  }
  .fullscreen-btn:active { opacity: 1; }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
