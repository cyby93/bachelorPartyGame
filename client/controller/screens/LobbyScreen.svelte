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
  <div class="hero" style="--class-color: {classColor}">
    <span class="icon">{CLASS_ICONS[className] ?? '?'}</span>
    <h2>{playerName}</h2>
    <p class="class-tag">{className} · {ROLES[className]}</p>
  </div>

  <div class="stat-row">
    <span>❤️ {cls?.hp ?? '—'} HP</span>
    <span>⚡ {cls?.speed ?? '—'}x Speed</span>
  </div>

  <div class="skills-section">
    <p class="section-label">YOUR SKILLS</p>
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

  <div class="waiting">
    <div class="spinner"></div>
    <p>Waiting for host to start…</p>
  </div>
</div>

<style>
  .lobby {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px;
    gap: 16px;
    overflow-y: auto;
  }

  .hero {
    text-align: center;
    padding: 16px;
    border-radius: 12px;
    border: 2px solid var(--class-color);
    background: color-mix(in srgb, var(--class-color) 10%, #0f1923);
    width: 100%;
  }

  .hero .icon { font-size: 36px; }
  .hero h2    { margin: 6px 0 2px; font-size: 20px; color: var(--class-color); }
  .hero .class-tag { font-size: 12px; color: #7fa8c0; }

  .stat-row {
    display: flex;
    gap: 24px;
    font-size: 14px;
    color: #bbb;
  }

  .skills-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-label {
    font-size: 10px;
    letter-spacing: 2px;
    color: #555;
    margin-bottom: 2px;
  }

  .skill-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #16202a;
    border-radius: 8px;
    padding: 10px 12px;
  }

  .skill-icon  { font-size: 22px; }

  .skill-info  { display: flex; flex-direction: column; gap: 2px; }
  .skill-name  { font-size: 14px; font-weight: bold; }
  .skill-type  { font-size: 11px; color: #7fa8c0; }

  .waiting {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: #7fa8c0;
    font-size: 14px;
  }

  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #1e3a4a;
    border-top-color: #00d2ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>
