<script>
  import { CLASSES } from '../../../shared/ClassConfig.js'

  let { playerName = '', className = '', onready } = $props()

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
    Warrior:     'Tank',         Paladin:     'Tank / Heal',
    Shaman:      'DPS / Heal',   Hunter:      'Ranged DPS',
    Priest:      'Healer',       Mage:        'Glass Cannon',
    Druid:       'Hybrid',       Rogue:       'Assassin',
    Warlock:     'DoT Caster',   DeathKnight: 'Melee Tank',
  }

  let cls        = $derived(CLASSES[className])
  let skills     = $derived(cls?.skills ?? [])
  let classColor = $derived(cls?.color ?? '#00d2ff')
</script>

<div class="lobby">
  <!-- Top bar: hero info + stats -->
  <div class="top-bar" style="--class-color: {classColor}">
    <img class="top-class-icon" src="/icons/classes/{CLASS_ICONS[className] ?? 'classicon_warrior'}.jpg" alt={className} />
    <div class="hero-info">
      <span class="hero-name" style="color: {classColor}">{playerName}</span>
      <span class="class-tag">{cls?.name ?? className} · {ROLES[className]}</span>
    </div>
    <div class="stats">
      <span>❤️ {cls?.hp ?? '—'} HP</span>
      <span>⚡ {cls?.speed ?? '—'}x Spd</span>
    </div>
  </div>

  <!-- Skills grid -->
  <div class="skills-grid">
    {#each skills as skill}
      <div class="skill-card">
        <span class="skill-icon">
          {#if skill.iconFile}
            <img src="/icons/abilities/{skill.iconFile}.jpg" alt={skill.name} class="skill-icon-img" />
          {:else}
            {skill.icon}
          {/if}
        </span>
        <div class="skill-info">
          <span class="skill-name">{skill.name}</span>
          <span class="skill-meta">{skill.inputType} · {(skill.cooldown / 1000).toFixed(1)}s CD</span>
        </div>
      </div>
    {/each}
  </div>

  <!-- Ready button -->
  <button type="button" class="ready-btn" onclick={() => onready?.()}>
    I GOT IT — LET'S GO!
  </button>
</div>

<style>
  .lobby {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 8px 10px;
    gap: 8px;
  }

  /* ── Top bar ── */
  .top-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 10px;
    border: 2px solid var(--class-color);
    background: color-mix(in srgb, var(--class-color) 10%, #0f1923);
    flex-shrink: 0;
  }

  .top-class-icon { width: 40px; height: 40px; object-fit: contain; display: block; flex-shrink: 0; }

  .hero-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .hero-name  { font-size: 15px; font-weight: bold; }
  .class-tag  { font-size: 11px; color: #7fa8c0; }

  .stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    font-size: 12px;
    color: #bbb;
    flex-shrink: 0;
  }

  /* ── Skills ── */
  .skills-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    min-height: 0;
  }

  .skill-card {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #16202a;
    border-radius: 8px;
    padding: 10px;
    min-width: 0;
  }

  .skill-icon  { font-size: 96px; line-height: 1; flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 96px; height: 96px; }
  .skill-icon-img { width: 96px; height: 96px; object-fit: contain; display: block; }
  .skill-info  { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .skill-name  { font-size: 12px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .skill-meta  { font-size: 10px; color: #7fa8c0; }

  /* ── Ready button ── */
  .ready-btn {
    width: 100%;
    padding: 12px;
    border-radius: 999px;
    border: none;
    font-size: 15px;
    font-weight: bold;
    letter-spacing: 1px;
    background: linear-gradient(135deg, #00d2ff, #0070a8);
    color: #fff;
    cursor: pointer;
    flex-shrink: 0;
  }

  .ready-btn:active { opacity: 0.85; }
</style>
