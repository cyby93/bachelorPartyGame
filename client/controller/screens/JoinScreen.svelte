<script>
  import { CLASS_NAMES, CLASSES } from '../../../shared/ClassConfig.js'

  let { onjoin } = $props()

  let name      = $state('')
  let className = $state(CLASS_NAMES[0])

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

  function join() {
    const trimmed = name.trim() || 'Player'
    onjoin?.({ name: trimmed, cls: className })
  }
</script>

<div class="join">
  <!-- Left column -->
  <div class="left-col">
    <h1>⚔️ RAID NIGHT</h1>
    <input
      type="text"
      bind:value={name}
      placeholder="Your name"
      maxlength="15"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="words"
      spellcheck="false"
    />
    <div class="stats">
      <span>❤️ {CLASSES[className].hp} HP</span>
      <span>⚡ {CLASSES[className].speed}x Speed</span>
    </div>
    <button class="join-btn" onclick={join}>JOIN GAME</button>
  </div>

  <!-- Right column: class grid -->
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
</div>

<style>
  .join {
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 10px;
    padding: 12px;
  }

  .left-col {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  h1 {
    font-size: 20px;
    color: #00d2ff;
    letter-spacing: 2px;
    margin: 0;
  }

  input {
    width: 100%;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #1e3a4a;
    background: #16202a;
    color: #fff;
    font-size: 15px;
  }

  .stats {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #aaa;
  }

  .join-btn {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: none;
    font-size: 16px;
    font-weight: bold;
    background: linear-gradient(135deg, #00d2ff, #0070a8);
    color: #fff;
    cursor: pointer;
    margin-top: auto;
  }

  .class-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
    align-content: center;
  }

  .class-card {
    background: #16202a;
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 6px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    color: #fff;
  }

  .class-card.active {
    border-color: var(--class-color);
    background: color-mix(in srgb, var(--class-color) 15%, #16202a);
  }

  .class-card .icon     { font-size: 18px; line-height: 1; }
  .class-card .cls-name { font-size: 11px; font-weight: bold; }
  .class-card .role     { font-size: 9px; color: #7fa8c0; text-align: center; }
</style>
