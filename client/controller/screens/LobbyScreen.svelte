<script>
  import { CLASSES } from '../../../shared/ClassConfig.js'

  let { playerName = '', className = '' } = $props()

  const CLASS_ICONS = {
    Warrior: '⚔️', Paladin: '🔨', Shaman: '⚡',  Hunter: '🏹',
    Priest:  '✝️', Mage:    '🔥', Druid:  '🌿',  Rogue:  '🗡️',
  }

  const ROLES = {
    Warrior: 'Tank',         Paladin: 'Tank / Heal',
    Shaman:  'DPS / Heal',   Hunter:  'Ranged DPS',
    Priest:  'Healer',       Mage:    'Glass Cannon',
    Druid:   'Hybrid',       Rogue:   'Assassin',
  }

  let cls        = $derived(CLASSES[className])
  let skills     = $derived(cls?.skills ?? [])
  let classColor = $derived(cls?.color ?? '#00d2ff')
</script>

<div class="lobby">
  <!-- Left column -->
  <div class="left-col">
    <div class="hero" style="--class-color: {classColor}">
      <span class="icon">{CLASS_ICONS[className] ?? '?'}</span>
      <h2>{playerName}</h2>
      <p class="class-tag">{className} · {ROLES[className]}</p>
    </div>

    <div class="stat-row">
      <span>❤️ {cls?.hp ?? '—'} HP</span>
      <span>⚡ {cls?.speed ?? '—'}x Speed</span>
    </div>

    <div class="waiting">
      <div class="spinner"></div>
      <p>Waiting for host…</p>
    </div>
  </div>

  <!-- Right column -->
  <div class="right-col">
    <p class="section-label">YOUR SKILLS</p>
    <div class="skills-section">
      {#each skills as skill, i}
        <div class="skill-row">
          <span class="skill-icon">{skill.icon}</span>
          <div class="skill-info">
            <span class="skill-name">{skill.name}</span>
            <span class="skill-type">{skill.inputType} · {(skill.cooldown / 1000).toFixed(1)}s CD</span>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .lobby {
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 12px;
    padding: 12px;
  }

  .left-col {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }

  .right-col {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
  }

  .hero {
    text-align: center;
    padding: 8px;
    border-radius: 10px;
    border: 2px solid var(--class-color);
    background: color-mix(in srgb, var(--class-color) 10%, #0f1923);
  }

  .hero .icon  { font-size: 28px; }
  .hero h2     { margin: 4px 0 2px; font-size: 16px; color: var(--class-color); }
  .hero .class-tag { font-size: 11px; color: #7fa8c0; }

  .stat-row {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: #bbb;
  }

  .section-label {
    font-size: 10px;
    letter-spacing: 2px;
    color: #555;
    margin: 0;
  }

  .skills-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-height: 0;
  }

  .skill-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #16202a;
    border-radius: 8px;
    padding: 8px 10px;
  }

  .skill-icon  { font-size: 18px; }

  .skill-info  { display: flex; flex-direction: column; gap: 2px; }
  .skill-name  { font-size: 13px; font-weight: bold; }
  .skill-type  { font-size: 11px; color: #7fa8c0; }

  .waiting {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #7fa8c0;
    font-size: 13px;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #1e3a4a;
    border-top-color: #00d2ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
