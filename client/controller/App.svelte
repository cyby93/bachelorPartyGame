<script>
  import { onMount, onDestroy } from 'svelte'
  import { io } from 'socket.io-client'
  import { EVENTS } from '../../shared/protocol.js'
  import JoinScreen   from './screens/JoinScreen.svelte'
  import GameScreen   from './screens/GameScreen.svelte'

  // ── Screens: 'join' | 'lobby' | 'game' | 'end'
  let screen = $state('join')

  // ── Orientation
  let isPortrait = $state(false)

  // ── Player state
  let myId        = $state(null)
  let playerName  = $state('')
  let className   = $state('')
  let isDead      = $state(false)
  let cooldowns   = $state([0, 0, 0, 0])  // expiresAt timestamps per skill slot

  // ── End state
  let endMessage  = $state('')

  // ── Socket (plain let — must NOT be Proxy-wrapped)
  let socket

  function enterFullscreenLandscape() {
    document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation?.lock('landscape').catch(() => {}))
      .catch(() => {})
  }

  onMount(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    isPortrait = mq.matches
    mq.addEventListener('change', e => {
      isPortrait = e.matches
      if (!e.matches) enterFullscreenLandscape()
    })

    socket = io()
    socket.on('connect', () => {
      myId = socket.id
      // Reconnect: if already past the join screen, re-register with the server
      if (screen !== 'join' && playerName && className) {
        socket.emit(EVENTS.JOIN, { name: playerName, className, isHost: false })
      }
    })

    socket.on(EVENTS.SCENE_CHANGE, ({ scene }) => {
      if (scene === 'trashMob' || scene === 'bossFight') {
        screen = 'game'
      } else if (scene === 'lobby') {
        screen = 'lobby'
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
      cooldowns = cooldowns.map((v, i) => i === data.skillIndex ? data.expiresAt : v)
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
    <button onclick={enterFullscreenLandscape}>Tap to go fullscreen</button>
  </div>
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
      onmove={handleMove}
      onskill={handleSkill}
      onaim={handleAim}
    />

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
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    color: #7fa8c0;
    font-size: 18px;
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

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
