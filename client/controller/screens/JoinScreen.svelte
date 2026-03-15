<script>
  import { createEventDispatcher } from 'svelte'
  import { CLASS_NAMES, CLASSES } from '../../../shared/ClassConfig.js'

  const dispatch = createEventDispatcher()

  let name      = ''
  let className = CLASS_NAMES[0]

  const CLASS_ICONS = {
    Warrior: '⚔️',
    Paladin: '🔨',
    Shaman:  '⚡',
    Hunter:  '🏹',
    Priest:  '✝️',
    Mage:    '🔥',
    Druid:   '🌿',
    Rogue:   '🗡️',
  }

  const ROLES = {
    Warrior: 'Tank',
    Paladin: 'Tank / Heal',
    Shaman:  'DPS / Heal',
    Hunter:  'Ranged DPS',
    Priest:  'Healer',
    Mage:    'Glass Cannon',
    Druid:   'Hybrid',
    Rogue:   'Assassin',
  }

  function join() {
    const trimmed = name.trim() || 'Player'
    dispatch('join', { name: trimmed, cls: className })
  }
</script>

<div class="join">
  <h1>⚔️ RAID NIGHT</h1>
  <p class="sub">Enter your name and choose a class</p>

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

  <!-- Class grid -->
  <div class="class-grid">
    {#each CLASS_NAMES as cls}
      {@const active = className === cls}
      <button
        class="class-card"
        class:active
        style="--class-color: {CLASSES[cls].color}"
        on:click={() => className = cls}
      >
        <span class="icon">{CLASS_ICONS[cls]}</span>
        <span class="cls-name">{cls}</span>
        <span class="role">{ROLES[cls]}</span>
      </button>
    {/each}
  </div>

  <!-- Selected class stats -->
  <div class="stats">
    <span>❤️ {CLASSES[className].hp} HP</span>
    <span>⚡ {CLASSES[className].speed}x Speed</span>
  </div>

  <button class="join-btn" on:click={join}>JOIN GAME</button>
</div>

<style>
  .join {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px;
    gap: 14px;
    overflow-y: auto;
  }

  h1 {
    font-size: 26px;
    color: #00d2ff;
    letter-spacing: 2px;
    margin: 0;
  }

  .sub {
    font-size: 13px;
    color: #7fa8c0;
    margin: 0;
  }

  input {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #1e3a4a;
    background: #16202a;
    color: #fff;
    font-size: 16px;
  }

  .class-grid {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .class-card {
    background: #16202a;
    border: 2px solid transparent;
    border-radius: 10px;
    padding: 10px 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    color: #fff;
  }

  .class-card.active {
    border-color: var(--class-color);
    background: color-mix(in srgb, var(--class-color) 15%, #16202a);
  }

  .class-card .icon    { font-size: 22px; line-height: 1; }
  .class-card .cls-name { font-size: 13px; font-weight: bold; }
  .class-card .role    { font-size: 10px; color: #7fa8c0; text-align: center; }

  .stats {
    display: flex;
    gap: 20px;
    font-size: 13px;
    color: #aaa;
  }

  .join-btn {
    width: 100%;
    padding: 14px;
    border-radius: 8px;
    border: none;
    font-size: 18px;
    font-weight: bold;
    background: linear-gradient(135deg, #00d2ff, #0070a8);
    color: #fff;
    cursor: pointer;
    margin-top: auto;
  }
</style>
