<script>
  import { CLASS_NAMES, CLASSES } from '../../../shared/ClassConfig.js'

  let { onready } = $props()

  let className = $state(null)

  const CLASS_ICONS = {
    Warrior:     'classicon_warrior',
    Paladin:     'classicon_paladin',
    Shaman:      'classicon_shaman',
    Hunter:      'classicon_hunter',
    Priest:      'classicon_priest',
    Mage:        'classicon_mage',
    Druid:       'classicon_druid',
    Rogue:       'classicon_rogue',
    Warlock:     'classicon_warlock',
    DeathKnight: 'classicon_deathknight',
  }

  const ROLES = {
    Warrior:     'Tank',
    Paladin:     'Tank / Heal',
    Shaman:      'DPS / Heal',
    Hunter:      'Ranged DPS',
    Priest:      'Healer',
    Mage:        'Glass Cannon',
    Druid:       'Hybrid',
    Rogue:       'Assassin',
    Warlock:     'DoT Caster',
    DeathKnight: 'Melee Tank',
  }

  function ready() {
    if (className) onready?.(className)
  }

  let selectedClass = $derived(className ? CLASSES[className] : null)
</script>

<div class="select-screen">
  <div class="screen-head">
    <span class="kicker">Choose Your Class</span>
    <h1>Build Your Raid Role</h1>
    <p>Pick the class that fits your style. You will get a full ability briefing before the run starts.</p>
  </div>

  <div class="class-grid">
    {#each CLASS_NAMES as cls}
      {@const active = className === cls}
      <button
        class="class-card"
        class:active
        style="--class-color: {CLASSES[cls].color}"
        onclick={() => className = cls}
      >
        <img class="class-icon" src="/icons/classes/{CLASS_ICONS[cls]}.jpg" alt={cls} />
        <span class="cls-name">{CLASSES[cls].name}</span>
        <span class="role">{ROLES[cls]}</span>
      </button>
    {/each}
  </div>

  {#if className}
    <div class="selection-bar" style="--class-color: {selectedClass?.color ?? '#00d2ff'}">
      <div class="selection-copy">
        <span class="selection-label">Selected</span>
        <span class="selection-name">{selectedClass?.name}</span>
        <span class="selection-role">{ROLES[className]}</span>
      </div>
      <button class="ready-btn" onclick={ready}>CONTINUE</button>
    </div>
  {/if}
</div>

<style>
  .select-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 14px;
    gap: 12px;
    min-height: 0;
    overflow: hidden;
    background:
      radial-gradient(circle at top, rgba(104, 149, 194, 0.18) 0%, rgba(104, 149, 194, 0) 26%),
      linear-gradient(180deg, #172330 0%, #101924 100%);
  }

  .screen-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: center;
    padding: 6px 10px 2px;
  }

  .kicker {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8fa6bb;
  }

  h1 {
    font-size: 28px;
    line-height: 1;
    color: #f4fbff;
  }

  p {
    font-size: 13px;
    line-height: 1.45;
    color: #99b1c4;
  }

  .class-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: 1fr 1fr;
    gap: 10px;
    min-height: 0;
  }

  .class-card {
    position: relative;
    background:
      linear-gradient(180deg, rgba(255, 214, 143, 0.035) 0%, rgba(255, 214, 143, 0) 30%),
      linear-gradient(180deg, #1a2734 0%, #121b24 100%);
    border: 1px solid rgba(104, 130, 153, 0.28);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s, background 0.15s, box-shadow 0.15s;
    color: #fff;
    padding: 8px 6px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .class-card.active {
    border-color: var(--class-color);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--class-color) 18%, rgba(255, 214, 143, 0.04)) 0%, rgba(255, 214, 143, 0) 30%),
      color-mix(in srgb, var(--class-color) 16%, #121b24);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--class-color) 28%, transparent),
      0 10px 18px rgba(0, 0, 0, 0.2);
    transform: translateY(-1px);
  }

  .class-card .class-icon {
    width: 48px;
    height: 48px;
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.2));
  }

  .class-card .cls-name {
    font-size: 13px;
    font-weight: bold;
    text-align: center;
  }

  .class-card .role {
    font-size: 10px;
    color: #8ca4b9;
    text-align: center;
    line-height: 1.3;
  }

  .selection-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 14px;
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, var(--class-color) 42%, rgba(104, 130, 153, 0.18));
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--class-color) 14%, rgba(255, 214, 143, 0.03)) 0%, rgba(255, 214, 143, 0) 34%),
      linear-gradient(180deg, #18222d 0%, #101822 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .selection-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .selection-label {
    font-size: 10px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: #8ea6bc;
  }

  .selection-name {
    font-size: 18px;
    font-weight: 700;
    color: var(--class-color);
  }

  .selection-role {
    font-size: 12px;
    color: #c4d2dd;
  }

  .ready-btn {
    min-width: 148px;
    padding: 14px 18px;
    border-radius: 12px;
    border: none;
    font-size: 15px;
    font-weight: bold;
    background: linear-gradient(135deg, #1ea6d7, #0f6994);
    color: #fff;
    cursor: pointer;
    letter-spacing: 2px;
  }

  @media (max-height: 430px) {
    .select-screen {
      padding: 10px;
      gap: 8px;
    }

    .screen-head {
      gap: 2px;
      padding: 0 6px;
    }

    .kicker {
      font-size: 10px;
    }

    h1 {
      font-size: 22px;
    }

    p {
      font-size: 11px;
      line-height: 1.3;
    }

    .class-grid {
      gap: 6px;
    }

    .class-card {
      gap: 4px;
      padding: 6px 4px;
      border-radius: 12px;
    }

    .class-card .class-icon {
      width: 34px;
      height: 34px;
    }

    .class-card .cls-name {
      font-size: 11px;
    }

    .class-card .role {
      font-size: 9px;
      line-height: 1.15;
    }

    .selection-bar {
      gap: 8px;
      padding: 9px 10px;
      border-radius: 12px;
    }

    .selection-label {
      font-size: 9px;
    }

    .selection-name {
      font-size: 15px;
    }

    .selection-role {
      font-size: 11px;
    }

    .ready-btn {
      min-width: 120px;
      padding: 11px 14px;
      border-radius: 10px;
      font-size: 13px;
      letter-spacing: 1.5px;
    }
  }
</style>
