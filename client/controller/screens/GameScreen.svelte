<script>
  import { CLASSES } from '../../../shared/ClassConfig.js';
  import MoveJoystick from '../components/MoveJoystick.svelte';
  import SkillButton from '../components/SkillButton.svelte';

  let { playerName = '', className = '', isDowned = false, cooldowns = [0,0,0,0], lobbyMode = false, isFullscreen = false, showFullscreenBtn = false, ontogglefullscreen, onrejoin, onmove, onskill, onaim, onhighlight } = $props()

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
      {#if showFullscreenBtn}
        <button class="hud-btn hud-fs-btn" onclick={ontogglefullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
          {isFullscreen ? '⤡' : '⤢'}
        </button>
      {/if}
      {#if onrejoin && !lobbyMode}
        <button class="hud-btn hud-leave-btn" onclick={onrejoin}>✕ Leave</button>
      {/if}
      <button class="find-me-btn" onclick={() => onhighlight?.()} aria-label="Find me">
        &#x25CE;
      </button>
    </div>
  </div>

  <div class="controls">
    <div class="move-area">
      <div class="control-label move-label">Move</div>
      <MoveJoystick {onmove} />
    </div>

    {#if !lobbyMode}
      <div class="skill-grid-wrapper">
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

        <!-- ── Downed overlay — only covers the skill grid, joystick stays accessible ── -->
        {#if isDowned}
          <div class="downed-overlay">
            <h2>You Are Downed</h2>
            <p>Crawl near an ally to be revived.</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>

</div>

<style>
  .game-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    background:
      radial-gradient(circle at top, color-mix(in srgb, var(--class-color, var(--rn-accent)) 14%, transparent) 0%, transparent 20%),
      linear-gradient(180deg, #1C1008 0%, #0D0802 100%);
  }

  .hud {
    min-height: 42px;
    background: rgba(14, 8, 4, 0.74);
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

  .hud-class {
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--rn-text-label);
    white-space: nowrap;
  }

  .find-me-btn {
    width: 100px;
    background: transparent;
    border: 1px solid rgba(255, 215, 0, 0.4);
    border-radius: 6px;
    color: #ffd700;
    font-size: 16px;
    line-height: 1;
    padding: 3px 7px;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .find-me-btn:active {
    background: rgba(255, 215, 0, 0.15);
  }

  .hud-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--rn-radius-sm);
    color: var(--rn-text-dim);
    font-size: 13px;
    padding: 3px 7px;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .hud-btn:active { background: rgba(255, 255, 255, 0.08); }

  .hud-fs-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    color: var(--rn-accent);
    border-color: rgba(105, 204, 240, 0.3);
    opacity: 0.65;
  }
  .hud-fs-btn:active { opacity: 1; }

  .hud-leave-btn {
    font-size: 11px;
    opacity: 0.45;
    padding: 3px 8px;
  }
  .hud-leave-btn:active { opacity: 1; color: var(--rn-danger-dim); }

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
    border-radius: var(--rn-radius-xl);
    overflow: hidden;
    background: linear-gradient(180deg, #1C1208 0%, #120A04 100%);
    border: 1px solid var(--rn-border-subtle);
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

  .skill-grid-wrapper {
    flex: 1;
    position: relative;
  }

  .skill-grid {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 6px;
    padding: 0;
  }

  .downed-overlay {
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
    border-radius: var(--rn-radius-xl);
  }

  .downed-overlay h2 {
    color: var(--rn-danger-dim);
    font-size: 22px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .downed-overlay p  {
    color: var(--rn-text-body);
    font-size: 13px;
    line-height: 1.4;
    max-width: 18ch;
  }

  @media (max-height: 430px) {
    .hud {
      min-height: 34px;
      padding: 0 10px;
    }

    .hud-name {
      font-size: 13px;
    }

    .hud-class {
      font-size: 9px;
    }

    .controls {
      padding: 4px;
      gap: 4px;
    }

    .move-area {
      border-radius: var(--rn-radius-lg);
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
