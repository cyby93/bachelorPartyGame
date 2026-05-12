<script>
  import { EVENTS } from '../../../shared/protocol.js'
  import { LEVEL_SELECT_OPTIONS } from '../../../shared/LevelConfig.js'
  import { gameState } from '../stores/gameState.js'

  let { socket } = $props()

  let debugOpen     = $state(false)
  let selectedLevel = $state(0)
  let skipDialog    = $state(false)

  const botCount = $derived(Object.values($gameState.players).filter(p => p.isBot).length)

  const levelLabel = $derived(
    LEVEL_SELECT_OPTIONS[selectedLevel]?.debugSandbox
      ? `Debug: ${LEVEL_SELECT_OPTIONS[selectedLevel]?.name ?? '?'}`
      : `Level ${selectedLevel + 1}: ${LEVEL_SELECT_OPTIONS[selectedLevel]?.name ?? '?'}`
  )

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

  function handleBotAdd() {
    socket.emit(EVENTS.BOT_ADD, {})
  }

  function handleBotRemove() {
    socket.emit(EVENTS.BOT_REMOVE)
  }
</script>

<button class="debug-toggle util-btn" onclick={() => debugOpen = !debugOpen}>
  {debugOpen ? '🎮 Play Mode' : '🛠 Debug'}
</button>

{#if debugOpen}
  <div class="debug-section card">
    <h3>Level Select</h3>
    <div class="level-row">
      <button class="nav-btn" onclick={prevLevel}>◀</button>
      <span class="level-name">{levelLabel}</span>
      <button class="nav-btn" onclick={nextLevel}>▶</button>
    </div>
    <label class="skip-label">
      <input type="checkbox" bind:checked={skipDialog} onchange={emitSetLevel} />
      Skip opening dialog
    </label>

    <h3 style="margin-top:10px">Bots ({botCount} / 12)</h3>
    <div class="bot-row">
      <button class="util-btn" onclick={handleBotAdd}>+ Add Bot</button>
      <button class="util-btn" onclick={handleBotRemove}>Remove All</button>
    </div>
  </div>
{/if}

<style>
  .debug-toggle { flex-shrink: 0; }

  .card {
    background: #1A1008;
    border: 1px solid rgba(148, 106, 32, 0.38);
    border-radius: var(--rn-radius-md);
    padding: 12px;
  }

  .debug-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  h3 {
    font-size: 11px;
    color: var(--rn-text-dim);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }

  .level-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  .level-name {
    flex: 1;
    font-size: 11px;
    color: var(--rn-text-body);
    text-align: center;
    min-width: 0;
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

  .bot-row {
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
</style>
