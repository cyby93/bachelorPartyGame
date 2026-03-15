<script>
  import { createEventDispatcher } from 'svelte'
  import { CLASSES } from '../../../shared/ClassConfig.js'
  import MoveJoystick  from '../components/MoveJoystick.svelte'
  import SkillButton   from '../components/SkillButton.svelte'

  export let playerName = ''
  export let className  = ''
  export let maxHp      = 0
  export let currentHp  = 0
  export let isDead     = false
  export let cooldowns  = [0, 0, 0, 0]

  const dispatch = createEventDispatcher()

  // Grid order: SK2 SK4 / SK1 SK3  (2×2, top row = skills 1,3; bottom = 0,2)
  // Per PLAN layout:
  //   [SK2]  [SK4]
  //   [SK1]  [SK3]
  // That maps to display indices: [1, 3, 0, 2]
  const GRID_ORDER = [1, 3, 0, 2]

  $: skills     = CLASSES[className]?.skills ?? []
  $: classColor = CLASSES[className]?.color  ?? '#00d2ff'
  $: hpPct      = maxHp > 0 ? Math.max(0, currentHp / maxHp) : 0

  $: hpColor = hpPct > 0.5 ? '#2ecc71'
             : hpPct > 0.25 ? '#f39c12'
             : '#e74c3c'
</script>

<div class="game-screen">

  <!-- ── HUD bar ── -->
  <div class="hud">
    <span class="hud-name" style="color: {classColor}">{playerName}</span>
    <div class="hp-bar-wrap">
      <div class="hp-bar" style="width: {hpPct * 100}%; background: {hpColor}"></div>
    </div>
    <span class="hp-text" style="color: {hpColor}">{currentHp}/{maxHp}</span>
  </div>

  <!-- ── Controls ── -->
  <div class="controls">
    <!-- Left: movement -->
    <div class="move-area">
      <MoveJoystick on:move={e => dispatch('move', e.detail)} />
    </div>

    <!-- Right: 2×2 skill grid -->
    <div class="skill-grid">
      {#each GRID_ORDER as skillIdx}
        <SkillButton
          skill={skills[skillIdx] ?? null}
          index={skillIdx}
          expiresAt={cooldowns[skillIdx] ?? 0}
          on:skill={e => dispatch('skill', e.detail)}
        />
      {/each}
    </div>
  </div>

  <!-- ── Dead overlay ── -->
  {#if isDead}
    <div class="dead-overlay">
      <h2>💀 YOU DIED</h2>
      <p>Stand near an ally to be revived.</p>
    </div>
  {/if}

</div>

<style>
  .game-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* ── HUD ── */
  .hud {
    height: 48px;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 10px;
    flex-shrink: 0;
    z-index: 10;
  }

  .hud-name {
    font-size: 13px;
    font-weight: bold;
    white-space: nowrap;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 0 0 auto;
    max-width: 90px;
  }

  .hp-bar-wrap {
    flex: 1;
    height: 10px;
    background: #1e2a32;
    border-radius: 5px;
    overflow: hidden;
  }

  .hp-bar {
    height: 100%;
    border-radius: 5px;
    transition: width 0.1s linear, background 0.2s;
  }

  .hp-text {
    font-size: 12px;
    font-weight: bold;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  /* ── Controls ── */
  .controls {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  .move-area {
    flex: 1;
    min-width: 0;
  }

  .skill-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 2px;
    background: #000;
  }

  /* ── Dead overlay ── */
  .dead-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.80);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    z-index: 20;
    text-align: center;
    padding: 24px;
  }

  .dead-overlay h2 { color: #e74c3c; font-size: 24px; }
  .dead-overlay p  { color: #aaa; font-size: 14px; }
</style>
