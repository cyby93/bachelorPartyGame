<script>
  import { onMount, onDestroy } from 'svelte'
  import { io } from 'socket.io-client'
  import { EVENTS } from '../../shared/protocol.js'
  import { CLASSES } from '../../shared/ClassConfig.js'
  import JoinScreen   from './screens/JoinScreen.svelte'
  import LobbyScreen  from './screens/LobbyScreen.svelte'
  import GameScreen   from './screens/GameScreen.svelte'

  // ── Screens: 'join' | 'lobby' | 'game' | 'end'
  let screen = 'join'

  // ── Player state
  let myId        = null
  let playerName  = ''
  let className   = ''
  let maxHp       = 0
  let currentHp   = 0
  let isDead      = false
  let cooldowns   = [0, 0, 0, 0]  // expiresAt timestamps per skill slot

  // ── End state
  let endMessage  = ''

  // ── Socket
  let socket

  onMount(() => {
    socket = io()
    socket.on('connect', () => {
      myId = socket.id
      // Reconnect: if already past the join screen, re-register with the server
      if (screen !== 'join' && playerName && className) {
        socket.emit(EVENTS.JOIN, { name: playerName, className, isHost: false })
        maxHp     = CLASSES[className].hp
        currentHp = maxHp
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
      if (me.hp     != null) currentHp = me.hp
      if (me.isDead != null) isDead    = me.isDead
    })

    socket.on(EVENTS.COOLDOWN, data => {
      if (data.playerId !== myId) return
      cooldowns = cooldowns.map((v, i) => i === data.skillIndex ? data.expiresAt : v)
    })
  })

  onDestroy(() => { socket?.disconnect() })

  // ── Actions passed down to children

  function handleJoin({ detail: { name, cls } }) {
    playerName  = name
    className   = cls
    maxHp       = CLASSES[cls].hp
    currentHp   = maxHp

    socket.emit(EVENTS.JOIN, { name, className: cls, isHost: false })
    screen = 'lobby'
  }

  function handleMove({ detail: vec }) {
    socket.emit(EVENTS.INPUT_MOVE, vec)
  }

  function handleSkill({ detail: { index, vector, action } }) {
    socket.emit(EVENTS.INPUT_SKILL, { index, vector, action })
  }
</script>

<div class="app">
  {#if screen === 'join'}
    <JoinScreen on:join={handleJoin} />

  {:else if screen === 'lobby'}
    <LobbyScreen {playerName} {className} />

  {:else if screen === 'game'}
    <GameScreen
      {playerName}
      {className}
      {maxHp}
      {currentHp}
      {isDead}
      {cooldowns}
      on:move={handleMove}
      on:skill={handleSkill}
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
</style>
