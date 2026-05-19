<script>
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { EVENTS } from '../../../shared/protocol.js'
  import { gameState } from '../stores/gameState.js'
  import { audioStore } from '../stores/audioStore.js'
  import HostButton from '../components/HostButton.svelte'
  import GameplaySidebar from '../components/GameplaySidebar.svelte'
  import DebugOptions from '../components/DebugOptions.svelte'
  import { IS_PROD } from '../../../shared/BuildConfig.js'

  let { socket } = $props()

  const SANDBOX_ENEMY_ACTIONS = [
    { label: 'Felguard',       enemyType: 'felGuard' },
    { label: 'Harpooner',      enemyType: 'coilskarHarpooner' },
    { label: 'Brute',          enemyType: 'bonechewerBrute' },
    { label: 'Blade Fury',     enemyType: 'bonechewerBladeFury' },
    { label: 'Centurion',      enemyType: 'illidariCenturion' },
    { label: 'Mystic',         enemyType: 'ashtonghueMystic' },
    { label: 'Blood Prophet',  enemyType: 'bloodProphet' },
    { label: 'Serpent Guard',  enemyType: 'coilskarSerpentGuard' },
    { label: 'Ritual Channeler', enemyType: 'ritualChanneler' },
    { label: 'Gate Repairer',  enemyType: 'gateRepairer' },
    { label: 'Warlock',        enemyType: 'warlock' },
    { label: 'Leviathan',      enemyType: 'leviathan' },
    { label: 'Shadowfiend',    enemyType: 'shadowfiend' },
    { label: 'Shadow Demon',   enemyType: 'shadowDemon' },
    { label: 'Flame of Azzinoth', enemyType: 'flameOfAzzinoth' },
  ]

  const scene              = $derived($gameState.serverScene)
  const isCampaign         = $derived(['battle', 'bossFight', 'levelComplete', 'quiz'].includes(scene))
  const isTraining         = $derived(scene === 'trainingGrounds')
  const isSandbox          = $derived($gameState.levelMeta?.debugSandbox === true && (scene === 'battle' || scene === 'bossFight'))
  const isTutorialActive   = $derived($gameState.tutorial?.active === true)

  let sandboxStatus = $state('')
  let sandboxError = $state(false)

  function handleEnterRaid() {
    socket.emit(EVENTS.HOST_ENTER_RAID)
  }

  function handleStartTutorial() {
    socket.emit(EVENTS.TUTORIAL_START)
  }

  function handleQuitTutorial() {
    socket.emit(EVENTS.TUTORIAL_QUIT)
  }

  function handleQuit() {
    if (confirm('Quit the current campaign and return to the training grounds?')) {
      socket.emit(EVENTS.QUIT_CAMPAIGN)
    }
  }

  function handleSessionReset() {
    get(audioStore)?.playSimpleButton()
    if (confirm('Exit game? All players will be kicked.')) {
      socket.emit(EVENTS.SESSION_RESET)
    }
  }

  function spawnEnemy(enemyType) {
    socket.emit(EVENTS.DEBUG_SPAWN_ENEMY, { enemyType })
  }

  function clearEnemies() {
    socket.emit(EVENTS.DEBUG_CLEAR_ENEMIES)
    sandboxStatus = 'Cleared all enemies.'
    sandboxError = false
  }

  // Called from main.js via gameState or quizState to update sandbox status
  export function setSandboxStatus(msg, isError) {
    sandboxStatus = msg ?? ''
    sandboxError = !!isError
  }

  function toggleFullscreen() {
    get(audioStore)?.playSimpleButton()
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }
</script>

<div class="game-hud">
  <div class="sidebar-inner">
    {#if !IS_PROD}<DebugOptions {socket} />{/if}
    <GameplaySidebar />

    <div class="actions">
      {#if isTraining && !isTutorialActive}
        <HostButton label="Enter Raid"    variant="primary"   onclick={handleEnterRaid} />
        <HostButton label="Play Tutorial" variant="secondary" onclick={handleStartTutorial} />
      {/if}

      {#if isTraining && isTutorialActive}
        <HostButton label="Quit Tutorial" variant="danger" onclick={handleQuitTutorial} />
      {/if}


      {#if isCampaign}
        <HostButton label="Quit Campaign" variant="danger" onclick={handleQuit} />
      {/if}

      <div class="util-row">
        <button class="util-btn" onclick={toggleFullscreen}>⛶ Fullscreen</button>
        {#if isTraining}
          <button class="util-btn danger" onclick={handleSessionReset}>Exit Game</button>
        {/if}
      </div>
    </div>
  </div>
</div>

{#if isSandbox}
  <div id="sandbox-overlay">
    <div id="sandbox-overlay-title">Enemy Sandbox</div>
    <div id="sandbox-overlay-actions">
      {#each SANDBOX_ENEMY_ACTIONS as action}
        <button class="debug-btn" onclick={() => spawnEnemy(action.enemyType)}>{action.label}</button>
      {/each}
    </div>
    <div id="sandbox-overlay-footer">
      <div id="sandbox-overlay-status" data-error={sandboxError ? 'true' : 'false'}>{sandboxStatus}</div>
      <button id="sandbox-overlay-clear-btn" class="debug-btn" onclick={clearEnemies}>Remove All</button>
    </div>
  </div>
{/if}

<style>
  .game-hud {
    width: 260px;
    min-width: 260px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background:
      linear-gradient(180deg, rgba(80, 50, 10, 0.20) 0%, rgba(0, 0, 0, 0) 18%),
      linear-gradient(180deg, #1E1208 0%, #160C05 36%, #0E0804 100%);
    border-right: 1px solid rgba(120, 84, 28, 0.50);
    box-shadow: inset -1px 0 0 rgba(255, 210, 80, 0.06);
    box-sizing: border-box;
  }

  .sidebar-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px;
    gap: 12px;
    overflow-y: auto;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }

  .util-row {
    display: flex;
    align-items: stretch;
    gap: 6px;
    button {
      flex: 1;
    }
  }

  .util-btn {
    padding: 6px 10px;
    border-radius: var(--rn-radius-sm);
    border: 1px solid rgba(100, 72, 20, 0.40);
    background: rgba(26, 16, 8, 0.70);
    color: var(--rn-text-dim);
    font-size: 11px;
    cursor: pointer;
  }
  .util-btn:hover { color: var(--rn-text-body); border-color: var(--rn-border); }
  .util-btn.danger { color: #e05050; border-color: #5a1a1a; background: #2a0a0a; }
  .util-btn.danger:hover { color: #ff7070; border-color: #e05050; }

  :global(.debug-btn) {
    padding: 5px 10px;
    border-radius: var(--rn-radius-sm);
    border: 1px solid rgba(105, 204, 240, 0.30);
    background: rgba(105, 204, 240, 0.08);
    color: var(--rn-accent);
    font-size: 11px;
    cursor: pointer;
  }
  :global(.debug-btn:hover) {
    background: rgba(105, 204, 240, 0.15);
    border-color: var(--rn-accent);
  }
</style>
