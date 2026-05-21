<script>
  import { EVENTS } from '../../../shared/protocol.js'
  import { CAMPAIGN, LEVEL_SELECT_OPTIONS } from '../../../shared/LevelConfig.js'
  import { gameState } from '../stores/gameState.js'

  let { socket } = $props()

  let debugOpen     = $state(false)
  let selectedLevel = $state(0)
  let skipDialog    = $state(false)
  let disableQuiz   = $state(false)
  let skillTiers    = $state([0, 0, 0, 0])
  let playerLevel      = $state(0)
  let unlockedLevels   = $state(1)

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
    socket.emit(EVENTS.SET_LEVEL, { levelIndex: selectedLevel, skipDialog, disableQuiz })
  }

  function handleBotAdd() {
    socket.emit(EVENTS.BOT_ADD, {})
  }

  function handleBotRemove() {
    socket.emit(EVENTS.BOT_REMOVE)
  }

  function onSkillTierChange(skillIndex) {
    socket.emit(EVENTS.DEBUG_SET_SKILL_TIER, { skillIndex, tier: skillTiers[skillIndex] })
  }

  function onPlayerLevelChange() {
    socket.emit(EVENTS.DEBUG_SET_PLAYER_LEVEL, { level: playerLevel })
  }

  function onUnlockedLevelsChange() {
    socket.emit(EVENTS.DEBUG_SET_UNLOCKED_LEVELS, { count: unlockedLevels })
  }

  function handleForceEnterRaid() {
    socket.emit(EVENTS.HOST_ENTER_RAID)
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
    <label class="skip-label">
      <input type="checkbox" bind:checked={disableQuiz} onchange={emitSetLevel} />
      Disable quiz feature
    </label>

    <h3 style="margin-top:10px">Player Level (quiz answers: {playerLevel})</h3>
    <div class="slider-row">
      <span class="slider-label">0</span>
      <input type="range" min="0" max="10" step="1"
        bind:value={playerLevel}
        oninput={onPlayerLevelChange}
        class="slider" />
      <span class="slider-label">10</span>
    </div>

    <h3 style="margin-top:10px">Ability Tiers (all players)</h3>
    {#each [0, 1, 2, 3] as si}
      <div class="slider-row">
        <span class="slider-label skill-label">Skill {si + 1}</span>
        <input type="range" min="0" max="3" step="1"
          bind:value={skillTiers[si]}
          oninput={() => onSkillTierChange(si)}
          class="slider" />
        <span class="slider-label">{skillTiers[si]}</span>
      </div>
    {/each}

    <h3 style="margin-top:10px">Bots ({botCount} / 12)</h3>
    <div class="bot-row">
      <button class="util-btn" onclick={handleBotAdd}>+ Add Bot</button>
      <button class="util-btn" onclick={handleBotRemove}>Remove All</button>
    </div>

    <h3 style="margin-top:10px">Campaign</h3>
    <div class="slider-row">
      <span class="slider-label">1</span>
      <input type="range" min="1" max={CAMPAIGN.length} step="1"
        bind:value={unlockedLevels}
        oninput={onUnlockedLevelsChange}
        class="slider" />
      <span class="slider-label">{unlockedLevels}</span>
    </div>
    <button class="util-btn force-raid-btn" onclick={handleForceEnterRaid}>⚡ Force Enter Raid</button>
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

  .slider-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .slider {
    flex: 1;
    accent-color: var(--rn-gold);
    cursor: pointer;
    height: 4px;
  }

  .slider-label {
    font-size: 10px;
    color: var(--rn-text-dim);
    min-width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .skill-label {
    min-width: 40px;
    text-align: left;
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

  .force-raid-btn {
    width: 100%;
    color: var(--rn-gold);
    border-color: rgba(180, 130, 30, 0.50);
  }
  .force-raid-btn:hover { color: #ffe080; border-color: var(--rn-gold); }
</style>
