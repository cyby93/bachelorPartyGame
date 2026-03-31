<script>
  import { CLASSES } from '../../../shared/ClassConfig.js'
  import MoveJoystick  from '../components/MoveJoystick.svelte'
  import SkillButton   from '../components/SkillButton.svelte'

  let { playerName = '', className = '', isDead = false, cooldowns = [0,0,0,0], comboPoints = 0, onmove, onskill, onaim } = $props()

  // Grid order: SK2 SK4 / SK1 SK3  (2×2, top row = skills 1,3; bottom = 0,2)
  // Per PLAN layout:
  //   [SK2]  [SK4]
  //   [SK1]  [SK3]
  // That maps to display indices: [1, 3, 0, 2]
  const GRID_ORDER = [1, 3, 0, 2]

  let skills     = $derived(CLASSES[className]?.skills ?? [])
  let classColor = $derived(CLASSES[className]?.color  ?? '#00d2ff')
</script>

<div class="game-screen">

  <!-- ── HUD bar ── -->
  <div class="hud">
    <span class="hud-name" style="color: {classColor}">{playerName}</span>
    {#if className === 'Rogue'}
      <div class="combo-pips">
        {#each [0,1,2,3,4] as i}
          <div class="pip" class:active={i < comboPoints}></div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ── Controls ── -->
  <div class="controls">
    <!-- Left: movement -->
    <div class="move-area">
      <MoveJoystick {onmove} />
    </div>

    <!-- Right: 2×2 skill grid -->
    <div class="skill-grid">
      {#each GRID_ORDER as skillIdx}
        <SkillButton
          skill={skills[skillIdx] ?? null}
          index={skillIdx}
          expiresAt={cooldowns[skillIdx] ?? 0}
          {onskill}
          {onaim}
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
    height: 36px;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 10px;
    flex-shrink: 0;
    z-index: 10;
  }

  .hud-name {
    font-size: 14px;
    font-weight: bold;
    white-space: nowrap;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 0 0 auto;
    max-width: 120px;
  }

  .combo-pips {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .pip {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #333;
    border: 1px solid #666;
    transition: background 0.1s, box-shadow 0.1s;
  }

  .pip.active {
    background: #ffcc00;
    box-shadow: 0 0 4px #ffcc00;
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
