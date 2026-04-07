<script>
  import { CLASS_NAMES, CLASSES } from '../../../shared/ClassConfig.js'

  let { onready } = $props()

  let className = $state(null)

  const CLASS_ICONS = {
    Warrior:     '⚔️',
    Paladin:     '🔨',
    Shaman:      '⚡',
    Hunter:      '🏹',
    Priest:      '✝️',
    Mage:        '🔥',
    Druid:       '🌿',
    Rogue:       '🗡️',
    Warlock:     '💀',
    DeathKnight: '💎',
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
</script>

<div class="select-screen">
  <div class="class-grid">
    {#each CLASS_NAMES as cls}
      {@const active = className === cls}
      <button
        class="class-card"
        class:active
        style="--class-color: {CLASSES[cls].color}"
        onclick={() => className = cls}
      >
        <span class="icon">{CLASS_ICONS[cls]}</span>
        <span class="cls-name">{CLASSES[cls].name}</span>
        <span class="role">{ROLES[cls]}</span>
      </button>
    {/each}
  </div>

  {#if className}
    <button class="ready-btn" onclick={ready}>READY</button>
  {/if}
</div>

<style>
  .select-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 8px;
  }

  .class-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: 1fr 1fr;
    gap: 8px;
  }

  .class-card {
    background: #16202a;
    border: 2px solid transparent;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    color: #fff;
    padding: 0;
  }

  .class-card.active {
    border-color: var(--class-color);
    background: color-mix(in srgb, var(--class-color) 15%, #16202a);
  }

  .class-card .icon     { font-size: 28px; line-height: 1; }
  .class-card .cls-name { font-size: 13px; font-weight: bold; }
  .class-card .role     { font-size: 10px; color: #7fa8c0; text-align: center; }

  .ready-btn {
    width: 100%;
    max-width: 300px;
    padding: 12px;
    border-radius: 8px;
    border: none;
    font-size: 16px;
    font-weight: bold;
    background: linear-gradient(135deg, #00d2ff, #0070a8);
    color: #fff;
    cursor: pointer;
    letter-spacing: 2px;
    align-self: center;
  }
</style>
