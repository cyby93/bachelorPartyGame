<script>
  import { io } from 'socket.io-client';
  import { onDestroy, onMount } from 'svelte';
  import { EVENTS } from '../../shared/protocol.js';
  import ControllerAudio from './ControllerAudio.js';
  import ClassSelectScreen from './screens/ClassSelectScreen.svelte';
  import GameScreen from './screens/GameScreen.svelte';
  import LobbyScreen from './screens/LobbyScreen.svelte';
  import NameScreen from './screens/NameScreen.svelte';
  import QuizAnswerScreen from './screens/QuizAnswerScreen.svelte';
  import QuizResultScreen from './screens/QuizResultScreen.svelte';
  import UpgradeSelectScreen from './screens/UpgradeSelectScreen.svelte';

  // ── Screens: 'name' | 'classSelect' | 'briefing' | 'lobby' | 'game' | 'levelComplete' | 'end' | 'quiz'
  let screen = $state('name')

  // ── Server scene — drives canReady (ready button only visible in 'lobby' JOIN state)
  let serverScene = $state('staging')

  // ── Overlay (swappable mid-game screen, e.g. quiz between levels)
  let overlayScreen = $state(null)   // null | 'quiz' | …
  let overlayData   = $state(null)

  // ── Pre-level quiz context — set from SCENE_CHANGE when preLevel === true.
  // Absent (false/0) for normal between-level quizzes.
  let quizPreLevel       = $state(false)
  let quizQuestionIndex  = $state(0)
  let quizTotalQuestions = $state(0)

  // ── Orientation
  let isPortrait = $state(false)

  // ── Player state
  let myId        = $state(null)
  let playerName  = $state(sessionStorage.getItem('playerName') ?? '')
  let className   = $state('')
  let isDowned      = $state(false)
  let fireRateMult  = $state(1)
  let cooldowns   = $state([0, 0, 0, 0])  // expiresAt timestamps per skill slot
  let lobbyReady  = $state(false)
  let tutorialEnabledSkills = $state(null)  // null = all enabled; array during tutorial

  // ── End state
  let endMessage  = $state('')

  // ── Rejoin message — shown on NameScreen after kick/reset/voluntary leave
  let rejoinMessage = $state('')

  // ── Screen Wake Lock — prevents phone from sleeping during play
  let wakeLock = null
  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return
    try { wakeLock = await navigator.wakeLock.request('screen') } catch (_) {}
  }

  // ── Socket (plain let — must NOT be Proxy-wrapped)
  let socket
  const controllerAudio = new ControllerAudio()

  // ── Socket event validation — lightweight guard, no external deps
  // Returns false and logs a warning if any required field is missing.
  function validate(eventName, data, requiredFields) {
    if (!data || requiredFields.some(f => data[f] === undefined)) {
      console.warn(`[socket] malformed ${eventName}:`, data)
      return false
    }
    return true
  }

  // ── Session token — scoped to the browser tab via sessionStorage.
  // Survives page refresh in the same tab so the server can reclaim the character.
  // A new tab gets no token → fresh join → prevents dual-connection.
  // crypto.randomUUID() requires iOS 15.4+ / Chrome 92+; fall back to getRandomValues for older devices.
  function generateUUID() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
  }
  if (!sessionStorage.getItem('sessionToken')) {
    sessionStorage.setItem('sessionToken', generateUUID())
  }

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
    requestWakeLock()
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') requestWakeLock()
    })

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

    // On every connect: send HANDSHAKE so server can route (reclaim vs. fresh join).
    // Client never decides whether it's reconnecting — server does.
    socket.on('connect', () => {
      socket.emit(EVENTS.HANDSHAKE, {
        token: sessionStorage.getItem('sessionToken') ?? null,
        name:  sessionStorage.getItem('playerName')  ?? null,
      })
    })

    // INIT — full state snapshot on join/reconnect.
    // `you` is a self-referential slice that tells this controller who it is
    // and which screen to land on. Always set myId from you.id, never from socket.id.
    socket.on(EVENTS.INIT, data => {
      if (!validate(EVENTS.INIT, data, ['players', 'you'])) return
      const you = data.you
      myId = you.id
      if (you.screen && you.screen !== 'name' && you.screen !== 'classSelect') {
        playerName  = you.name      ?? playerName
        className   = you.className ?? ''
        cooldowns   = you.cooldowns ?? [0, 0, 0, 0]
        lobbyReady  = you.ready ?? lobbyReady
        screen      = you.screen
      }
    })

    // FORCE_REJOIN — server sends this on kick, session reset, or to clear a stale token.
    socket.on(EVENTS.FORCE_REJOIN, data => {
      sessionStorage.removeItem('sessionToken')
      sessionStorage.setItem('sessionToken', generateUUID())
      // Name is kept — pre-fills the name field so player doesn't have to retype
      className     = ''
      myId          = null
      screen        = 'name'
      overlayScreen = null
      overlayData   = null
      if (data?.reason === 'kicked_by_host')  rejoinMessage = 'You were removed by the host.'
      else if (data?.reason === 'session_reset') rejoinMessage = 'The session was reset.'
      else rejoinMessage = ''
    })

    // skill:fired — VFX event consumed by the host renderer, not the controller.
    // Guard is here so any future controller-side feedback (e.g. haptics, hit flash)
    // has a validated entry point rather than raw unguarded data.
    socket.on(EVENTS.SKILL_FIRED, data => {
      if (!validate(EVENTS.SKILL_FIRED, data, ['skillName', 'type', 'x', 'y'])) return
      // No controller-side action today. Guard logged; future handlers go here.
    })

    socket.on(EVENTS.SCENE_CHANGE, data => {
      if (!validate(EVENTS.SCENE_CHANGE, data, ['scene'])) return
      const { scene, levelName, levelIndex, levelNumber, totalLevels, debugSandbox } = data
      serverScene = scene
      if (scene === 'battle' || scene === 'bossFight' || scene === 'trainingGrounds') {
        screen = 'game'
        overlayScreen = null
        overlayData = null
      } else if (scene === 'lobby') {
        // Only advance players who have already joined (myId set).
        // Players still on name/classSelect haven't spawned yet — leave them where they are.
        if (myId) screen = 'lobby'
        overlayScreen = null
        overlayData = null
      } else if (scene === 'quiz') {
        screen = 'quiz'
        overlayScreen = 'quizWaiting'
        overlayData = null
        quizPreLevel       = data.preLevel       ?? false
        quizQuestionIndex  = data.questionIndex  ?? 0
        quizTotalQuestions = data.totalQuestions ?? 0
      } else if (scene === 'levelComplete') {
        screen = 'levelComplete'
        endMessage = debugSandbox ? 'Debug sandbox complete!' : `Level ${levelNumber ?? ((levelIndex ?? 0) + 1)} complete!`
        overlayScreen = null
        overlayData = null
      } else if (scene === 'result') {
        screen = 'end'
        endMessage = '🏆 Victory! Waiting for restart…'
      } else if (scene === 'gameover') {
        screen = 'end'
        endMessage = '💀 Defeated. Waiting for restart…'
      }
    })

    socket.on(EVENTS.STATE_DELTA, delta => {
      if (!validate(EVENTS.STATE_DELTA, delta, ['tick', 'players'])) return
      if (!myId) return
      const me = delta.players?.[myId]
      if (!me) return
      const wasDowned = isDowned
      if (me.isDowned != null) isDowned = me.isDowned
      if (me.fireRateMult != null) fireRateMult = me.fireRateMult
      if (!wasDowned && isDowned) {
        controllerAudio.handlePlayerDown()
        navigator.vibrate?.([300, 100, 300])
      }
    })

    socket.on(EVENTS.COOLDOWN, data => {
      if (!validate(EVENTS.COOLDOWN, data, ['playerId', 'skillIndex', 'durationMs'])) return
      if (data.playerId !== myId) return
      cooldowns = cooldowns.map((v, i) => i === data.skillIndex ? Date.now() + data.durationMs : v)
    })

    socket.on(EVENTS.TUTORIAL_STATE, data => {
      tutorialEnabledSkills = data?.active ? data.enabledSkills : null
    })

    // ── Quiz events ─────────────────────────────────────────────────────
    socket.on(EVENTS.QUIZ_QUESTION, data => {
      if (!validate(EVENTS.QUIZ_QUESTION, data, ['question', 'options'])) return
      overlayScreen = 'quizAnswer'
      overlayData = data   // { question, options }
    })

    socket.on(EVENTS.QUIZ_RESULTS, data => {
      if (!validate(EVENTS.QUIZ_RESULTS, data, ['correctIndex', 'playerResults'])) return
      const myResult = data.playerResults?.[myId]
      const correctAnswer = overlayData?.options?.[data.correctIndex] ?? ''
      overlayScreen = 'quizResult'
      overlayData = { correct: !!myResult, correctAnswer }
      if (myResult) controllerAudio.handleLevelUp()
    })

    socket.on(EVENTS.QUIZ_UPGRADE_OPTIONS, data => {
      if (!validate(EVENTS.QUIZ_UPGRADE_OPTIONS, data, ['skills'])) return
      overlayScreen = 'upgradeSelect'
      overlayData = data   // { skills: [...] }
    })

    socket.on(EVENTS.QUIZ_DONE, () => {
      overlayScreen = 'quizDone'
      overlayData = null
    })
  })

  onDestroy(() => {
    socket?.disconnect()
    wakeLock?.release()
  })

  // ── Actions passed down to children

  function handleNameSubmit(name) {
    playerName = name
    sessionStorage.setItem('playerName', name)
    rejoinMessage = ''
    screen = 'classSelect'
    if (!document.fullscreenElement && !isIOS) toggleFullscreen()
  }

  function handleClassReady(cls) {
    className = cls
    controllerAudio.handleJoin()
    screen = 'joining'
    socket.emit(EVENTS.JOIN, {
      name:         playerName,
      className:    cls,
      isHost:       false,
      sessionToken: sessionStorage.getItem('sessionToken'),
    })
  }

  function handleChangeClass() {
    socket.emit(EVENTS.REJOIN)
    sessionStorage.removeItem('sessionToken')
    sessionStorage.setItem('sessionToken', generateUUID())
    className     = ''
    myId          = null
    screen        = 'classSelect'
    overlayScreen = null
    overlayData   = null
  }

  function handleVoluntaryRejoin() {
    socket.emit(EVENTS.REJOIN)
    sessionStorage.removeItem('sessionToken')
    sessionStorage.setItem('sessionToken', generateUUID())
    // Name is kept — pre-fills the name field so player doesn't have to retype
    className     = ''
    myId          = null
    screen        = 'name'
    overlayScreen = null
    overlayData   = null
    rejoinMessage = ''
  }

  function handleOverlayDone(result) {
    overlayScreen = null
    overlayData = null
  }

  function handleMove(vec) {
    socket.emit(EVENTS.INPUT_MOVE, vec)
  }

  function handleSkill({ index, vector, action }) {
    socket.emit(EVENTS.INPUT_SKILL, { index, vector, action })
  }

  function handleAim({ vector, selfZone }) {
    socket.emit(EVENTS.INPUT_AIM, { vector, selfZone: selfZone ?? false })
  }

  function handleHighlight() {
    socket.emit(EVENTS.INPUT_HIGHLIGHT)
  }

  function handleLobbyReady() {
    lobbyReady = true
    // If the player is still on the briefing screen when they hit ready,
    // advance to lobby so lobbyMode GameScreen can render immediately.
    if (screen === 'briefing') screen = 'lobby'
    socket.emit(EVENTS.PLAYER_READY)
  }

  function handleQuizAnswer(chosenIndex) {
    socket.emit(EVENTS.QUIZ_ANSWER, { chosenIndex })
  }

  function handleUpgrade(skillIndex) {
    socket.emit(EVENTS.QUIZ_UPGRADE, { skillIndex })
    overlayScreen = 'upgradeWaiting'
    overlayData = null
  }
</script>

{#if isPortrait && screen !== 'name'}
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

<div class="app">
  {#if screen === 'name'}
    <NameScreen onnext={handleNameSubmit} initialName={playerName} message={rejoinMessage} />

  {:else if screen === 'classSelect'}
    <ClassSelectScreen onready={handleClassReady} />

  {:else if screen === 'joining'}
    <div class="joining-screen">
      <span class="joining-class">{className}</span>
      <p class="joining-label">Joining the raid…</p>
      <div class="joining-spinner"></div>
    </div>

  {:else if screen === 'briefing'}
    <LobbyScreen
      {playerName}
      {className}
      canReady={serverScene === 'lobby'}
      onready={handleLobbyReady}
      onchangeclass={handleChangeClass}
    />

  {:else if screen === 'lobby'}
    {#if !lobbyReady}
      <LobbyScreen
        {playerName}
        {className}
        canReady={serverScene === 'lobby'}
        onready={handleLobbyReady}
        onchangeclass={handleChangeClass}
      />
    {:else}
      <GameScreen
        {playerName}
        {className}
        {isDowned}
        {cooldowns}
        {fireRateMult}
        lobbyMode={true}
        showFullscreenBtn={!isPortrait && !isIOS}
        {isFullscreen}
        {tutorialEnabledSkills}
        ontogglefullscreen={toggleFullscreen}
        onmove={handleMove}
        onskill={handleSkill}
        onaim={handleAim}
        onhighlight={handleHighlight}
      />
    {/if}

  {:else if screen === 'game'}
    <GameScreen
      {playerName}
      {className}
      {isDowned}
      {cooldowns}
      {fireRateMult}
      showFullscreenBtn={!isPortrait && !isIOS}
      {isFullscreen}
      {tutorialEnabledSkills}
      ontogglefullscreen={toggleFullscreen}
      onrejoin={handleVoluntaryRejoin}
      onmove={handleMove}
      onskill={handleSkill}
      onaim={handleAim}
      onhighlight={handleHighlight}
    />

  {:else if screen === 'quiz'}
    {#if overlayScreen === 'quizAnswer'}
      <QuizAnswerScreen
        options={overlayData?.options ?? []}
        preLevel={quizPreLevel}
        questionIndex={quizQuestionIndex}
        totalQuestions={quizTotalQuestions}
        onanswer={handleQuizAnswer}
      />
    {:else if overlayScreen === 'quizResult'}
      <QuizResultScreen
        correct={overlayData?.correct ?? false}
        correctAnswer={overlayData?.correctAnswer ?? ''}
      />
    {:else if overlayScreen === 'upgradeSelect'}
      <UpgradeSelectScreen
        skills={overlayData?.skills ?? []}
        onupgrade={handleUpgrade}
      />
    {:else if overlayScreen === 'upgradeWaiting'}
      <div class="end-screen">
        <p>Upgrade chosen!</p>
        <p class="sublabel">Waiting for others…</p>
      </div>
    {:else if overlayScreen === 'quizDone'}
      <div class="end-screen">
        <p>Quiz complete!</p>
        <p class="sublabel">Waiting for host to continue…</p>
      </div>
    {:else}
      <div class="end-screen">
        <p>Quiz time!</p>
        <p class="sublabel">Waiting for question…</p>
      </div>
    {/if}

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

  .joining-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px;
    background: var(--rn-gradient-bg);
  }

  .joining-class {
    font-size: 26px;
    font-weight: 700;
    color: var(--rn-text-bright);
  }

  .joining-label {
    font-size: 14px;
    color: var(--rn-text-label);
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .joining-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--rn-border);
    border-top-color: var(--rn-gold);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .end-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    color: var(--rn-text-dim);
    font-size: 18px;
    gap: 8px;
  }

  .sublabel {
    font-size: 14px;
    color: var(--rn-text-dimmer);
  }

  .rotate-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: var(--rn-bg-deep);
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
    color: var(--rn-text-body);
  }

  .rotate-overlay button {
    padding: 12px 24px;
    border-radius: var(--rn-radius-md);
    border: 1px solid var(--rn-border-btn);
    background: var(--rn-bg-surface);
    color: var(--rn-accent);
    font-size: 15px;
    cursor: pointer;
  }

  .ios-hint {
    font-size: 14px;
    color: var(--rn-text-body);
    max-width: 260px;
    text-align: center;
    line-height: 1.5;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
