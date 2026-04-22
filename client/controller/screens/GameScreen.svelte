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

  <div class="hud">
    <div class="hud-identity">
      <span class="hud-name" style="color: {classColor}">{playerName}</span>
      <span class="hud-class">{className}</span>
    </div>

    <div class="hud-status">
      {#if className === 'Rogue'}
        <div class="combo-pips" aria-label="Combo points">
          {#each [0,1,2,3,4] as i}
            <div class="pip" class:active={i < comboPoints}></div>
          {/each}
        </div>
      {/if}
      <span class="hud-note">Abilities stay on the right</span>
    </div>
  </div>

  <div class="controls">
    <div class="move-area">
      <div class="control-label move-label">Move</div>
      <MoveJoystick {onmove} />
    </div>

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
      <h2>You Died</h2>
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
    background:
      radial-gradient(circle at top, color-mix(in srgb, var(--class-color, #00d2ff) 14%, transparent) 0%, transparent 20%),
      linear-gradient(180deg, #162330 0%, #0e1822 100%);
  }

  .hud {
    min-height: 42px;
    background:
      linear-gradient(180deg, rgba(255, 214, 143, 0.05) 0%, rgba(255, 214, 143, 0) 28%),
      rgba(10, 16, 24, 0.74);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    gap: 12px;
    flex-shrink: 0;
    z-index: 10;
  }

  .hud-identity,
  .hud-status {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .hud-identity {
    flex: 1;
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

  .hud-class,
  .hud-note {
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #8da5bb;
    white-space: nowrap;
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

  .controls {
    flex: 1;
    display: flex;
    min-height: 0;
    padding: 6px;
    gap: 6px;
  }

  .move-area {
    flex: 1;
    min-width: 0;
    position: relative;
    border-radius: 18px;
    overflow: hidden;
    background:
      linear-gradient(180deg, rgba(255, 214, 143, 0.025) 0%, rgba(255, 214, 143, 0) 30%),
      linear-gradient(180deg, #16232f 0%, #101923 100%);
    border: 1px solid rgba(120, 150, 176, 0.12);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .control-label {
    position: absolute;
    top: 10px;
    left: 12px;
    z-index: 3;
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(173, 193, 209, 0.72);
    pointer-events: none;
  }

  .skill-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 6px;
    padding: 0;
  }

  .dead-overlay {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at center, rgba(110, 24, 24, 0.22) 0%, rgba(0, 0, 0, 0) 32%),
      rgba(0, 0, 0, 0.84);
    backdrop-filter: blur(4px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    z-index: 20;
    text-align: center;
    padding: 24px;
  }

  .dead-overlay h2 {
    color: #f08080;
    font-size: 28px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .dead-overlay p  {
    color: #b0bcc7;
    font-size: 14px;
    line-height: 1.4;
    max-width: 22ch;
  }

  @media (max-height: 430px) {
    .hud {
      min-height: 34px;
      padding: 0 10px;
    }

    .hud-name {
      font-size: 13px;
    }

    .hud-class,
    .hud-note {
      font-size: 9px;
    }

    .controls {
      padding: 4px;
      gap: 4px;
    }

    .move-area {
      border-radius: 14px;
    }

    .control-label {
      top: 8px;
      left: 10px;
      font-size: 9px;
    }

    .skill-grid {
      gap: 4px;
    }
  }
</style>
