<script>
  import { onMount } from 'svelte'
  import { EVENTS } from '../../../shared/protocol.js'
  import { LEVEL_SELECT_OPTIONS } from '../../../shared/LevelConfig.js'
  import { gameState } from '../stores/gameState.js'
  import { quizState } from '../stores/quizState.js'
  import HostButton from '../components/HostButton.svelte'
  import GameplaySidebar from '../components/GameplaySidebar.svelte'

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

  const scene        = $derived($gameState.serverScene)
  const isCampaign   = $derived(['battle', 'bossFight', 'levelComplete', 'quiz'].includes(scene))
  const isTraining   = $derived(scene === 'trainingGrounds')
  const isLevelComplete = $derived(scene === 'levelComplete')
  const isQuizDone   = $derived($quizState.phase === 'done')
  const isResult     = $derived(scene === 'result' || scene === 'gameover')
  const isSandbox    = $derived($gameState.levelMeta?.debugSandbox === true && (scene === 'battle' || scene === 'bossFight'))

  let selectedLevel = $state(0)
  let skipDialog = $state(false)
  let sandboxStatus = $state('')
  let sandboxError = $state(false)
  let debugOpen = $state(false)

  function handleEnterRaid() {
    socket.emit(EVENTS.HOST_ENTER_RAID)
  }

  function handleContinue() {
    socket.emit(EVENTS.HOST_ADVANCE)
  }

  function handleRestart() {
    socket.emit(EVENTS.RESTART_GAME)
  }

  function handleQuit() {
    if (confirm('Quit the current campaign and return to the training grounds?')) {
      socket.emit(EVENTS.QUIT_CAMPAIGN)
    }
  }

  function handleSessionReset() {
    if (confirm('Exit game? All players will be kicked.')) {
      socket.emit(EVENTS.SESSION_RESET)
    }
  }

  function prevLevel() {
    selectedLevel = Math.max(0, selectedLevel - 1)
    emitSetLevel()
  }

  function nextLevel() {
    selectedLevel = Math.min(LEVEL_SELECT_OPTIONS.length - 1, selectedLevel + 1)
    emitSetLevel()
  }

  function emitSetLevel() {
    socket.emit(EVENTS.SET_LEVEL, { levelIndex: selectedLevel, skipDialog })
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

  function levelLabel(index) {
    const opt = LEVEL_SELECT_OPTIONS[index]
    return opt?.debugSandbox ? `Debug: ${opt.name ?? '?'}` : `Level ${index + 1}: ${opt?.name ?? '?'}`
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }
</script>

<div class="game-hud">
  <div class="sidebar-inner">
    <GameplaySidebar />

    <div class="actions">
      {#if isTraining}
        <HostButton label="Enter Raid" variant="primary" onclick={handleEnterRaid} />

        <div class="level-row">
          <button class="nav-btn" onclick={prevLevel}>◀</button>
          <span class="level-name">{levelLabel(selectedLevel)}</span>
          <button class="nav-btn" onclick={nextLevel}>▶</button>
        </div>
        <label class="skip-label">
          <input type="checkbox" bind:checked={skipDialog} onchange={emitSetLevel} />
          Skip dialog
        </label>
      {/if}

      {#if isLevelComplete || isQuizDone}
        <HostButton label="Continue" variant="primary" onclick={handleContinue} />
      {/if}

      {#if isResult}
        <HostButton label="Restart Raid" variant="primary" onclick={handleRestart} />
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

  .level-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .level-name {
    flex: 1;
    font-size: 11px;
    color: var(--rn-text-body);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-btn {
    padding: 3px 8px;
    border-radius: var(--rn-radius-sm);
    border: 1px solid var(--rn-border-btn);
    background: rgba(26, 16, 8, 0.70);
    color: var(--rn-text-body);
    cursor: pointer;
    font-size: 11px;
    flex-shrink: 0;
  }
  .nav-btn:hover { color: var(--rn-gold); }

  .skip-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--rn-text-dim);
    cursor: pointer;
  }

  .util-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
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
