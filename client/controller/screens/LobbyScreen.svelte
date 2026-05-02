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

  const INPUT_LABELS = {
    INSTANT: 'Tap',
    DIRECTIONAL: 'Aim and release',
    AIMED: 'Aim and release',
    TARGETED: 'Aim and release',
    SUSTAINED: 'Aim and hold',
  }

  const INPUT_HINTS = {
    INSTANT: 'Fires instantly from the button position.',
    DIRECTIONAL: 'Drag to set direction, then release to fire.',
    AIMED: 'Drag to aim, then release at the final angle.',
    TARGETED: 'Drag the button to line it up, then release.',
    SUSTAINED: 'Hold to maintain the effect, release to end it.',
  }

  let cls        = $derived(CLASSES[className])
  let skills     = $derived(cls?.skills ?? [])
  let classColor = $derived(cls?.color ?? '#00d2ff')
</script>

<div class="lobby" style="--class-color: {classColor}">
  <div class="briefing-head" style="--class-color: {classColor}">
    <div class="head-copy">
      <span class="kicker">Class Briefing</span>
      <h1>{cls?.name ?? className}</h1>
      <p>Learn the layout now, then keep your eyes on the TV.</p>
    </div>
    <div class="hero-chip">
      <img class="top-class-icon" src="/icons/classes/{CLASS_ICONS[className] ?? 'classicon_warrior'}.jpg" alt={className} />
      <div class="hero-info">
        <span class="hero-name" style="color: {classColor}">{playerName}</span>
        <span class="class-tag">{cls?.name ?? className} · {ROLES[className]}</span>
      </div>
    </div>
    <div class="stats">
      <span>❤️ {cls?.hp ?? '—'} HP</span>
      <span>⚡ {cls?.speed ?? '—'}x Spd</span>
    </div>
  </div>

  <div class="skills-grid">
    {#each skills as skill}
      <div class="skill-card" style="--class-color: {classColor}">
        <div class="skill-card-top">
          <span class="skill-icon">
            {#if skill.iconFile}
              <img src="/icons/abilities/{skill.iconFile}.jpg" alt={skill.name} class="skill-icon-img" />
            {:else}
              {skill.icon}
            {/if}
          </span>
          <div class="skill-info">
            <span class="skill-name">{skill.name}</span>
            <span class="skill-meta">{(skill.cooldown / 1000).toFixed(1)}s cooldown</span>
          </div>
        </div>

        <div class="skill-guidance">
          <span class="skill-input-type">{INPUT_LABELS[skill.inputType] ?? skill.inputType}</span>
          <span class="skill-hint">{INPUT_HINTS[skill.inputType] ?? 'Use this skill from the right-side grid.'}</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="ready-wrap">
    <div class="ready-copy">
      <span class="ready-kicker">Ready Check</span>
      <span class="ready-text">Button positions stay fixed in combat.</span>
    </div>
    <button type="button" class="ready-btn" onclick={() => onready?.()}>
      I GOT IT
    </button>
  </div>
</div>

<style>
  .lobby {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 10px;
    min-height: 0;
    overflow: hidden;
    background:
      radial-gradient(circle at top, color-mix(in srgb, var(--class-color, var(--rn-accent)) 16%, transparent) 0%, transparent 28%),
      var(--rn-gradient-bg);
  }

  .briefing-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 10px;
    align-items: center;
    padding: 14px;
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, var(--class-color) 30%, rgba(104, 130, 153, 0.24));
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--class-color) 12%, rgba(255, 214, 143, 0.03)) 0%, rgba(255, 214, 143, 0) 34%),
      var(--rn-gradient-surface);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 10px 22px rgba(0, 0, 0, 0.16);
  }

  .head-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .kicker,
  .ready-kicker {
    font-size: 10px;
    letter-spacing: 1.7px;
    text-transform: uppercase;
    color: var(--rn-text-label);
  }

  h1 {
    font-size: 24px;
    line-height: 1;
    color: var(--rn-text-bright);
  }

  .head-copy p,
  .ready-text {
    font-size: 12px;
    line-height: 1.45;
    color: var(--rn-text-secondary);
  }

  .hero-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .top-class-icon {
    width: 52px;
    height: 52px;
    object-fit: contain;
    display: block;
    flex-shrink: 0;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.18));
  }

  .hero-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .hero-name  {
    font-size: 15px;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .class-tag  {
    font-size: 11px;
    color: var(--rn-text-dim);
    white-space: nowrap;
  }

  .stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    font-size: 12px;
    color: var(--rn-text-body);
    flex-shrink: 0;
  }

  .skills-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    min-height: 0;
    overflow: hidden;
  }

  .skill-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--class-color) 10%, rgba(255, 214, 143, 0.03)) 0%, rgba(255, 214, 143, 0) 34%),
      var(--rn-gradient-surface);
    border-radius: 14px;
    padding: 10px;
    min-width: 0;
    border: 1px solid var(--rn-border-subtle);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .skill-card-top {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .skill-icon  {
    font-size: 88px;
    line-height: 1;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 88px;
    padding: 4px;
    border-radius: 12px;
    background: rgba(7, 13, 18, 0.38);
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  .skill-icon-img {
    width: 88px;
    height: 88px;
    object-fit: contain;
    display: block;
  }

  .skill-info  {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .skill-name  {
    font-size: 13px;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .skill-meta  {
    font-size: 11px;
    color: var(--rn-text-label);
  }

  .skill-guidance {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .skill-input-type {
    font-size: 12px;
    font-weight: 700;
    color: var(--class-color);
  }

  .skill-hint {
    font-size: 11px;
    line-height: 1.4;
    color: var(--rn-text-body);
  }

  .ready-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--rn-border-subtle);
    flex-shrink: 0;
  }

  .ready-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .ready-btn {
    min-width: 140px;
    padding: 14px 16px;
    border-radius: 12px;
    border: none;
    font-size: 15px;
    font-weight: bold;
    letter-spacing: 2px;
    background: var(--rn-gradient-cta);
    color: var(--rn-gold);
    cursor: pointer;
    flex-shrink: 0;
  }

  .ready-btn:active { opacity: 0.9; }

  @media (max-height: 430px) {
    .lobby {
      padding: 8px;
      gap: 6px;
    }

    .briefing-head {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      padding: 10px;
      border-radius: 12px;
    }

    .stats {
      grid-column: 2;
      grid-row: 1 / span 2;
      font-size: 11px;
      gap: 2px;
    }

    .head-copy {
      gap: 2px;
    }

    .kicker,
    .ready-kicker {
      font-size: 9px;
      letter-spacing: 1.4px;
    }

    h1 {
      font-size: 19px;
    }

    .head-copy p,
    .ready-text {
      font-size: 10px;
      line-height: 1.25;
    }

    .hero-chip {
      gap: 8px;
    }

    .top-class-icon {
      width: 38px;
      height: 38px;
    }

    .hero-name {
      font-size: 13px;
    }

    .class-tag {
      font-size: 10px;
    }

    .skills-grid {
      gap: 6px;
    }

    .skill-card {
      gap: 5px;
      padding: 8px;
      border-radius: 12px;
    }

    .skill-card-top {
      gap: 8px;
    }

    .skill-icon {
      width: 58px;
      height: 58px;
      font-size: 58px;
      border-radius: 10px;
    }

    .skill-icon-img {
      width: 58px;
      height: 58px;
    }

    .skill-name {
      font-size: 11px;
    }

    .skill-meta,
    .skill-input-type,
    .skill-hint {
      font-size: 10px;
      line-height: 1.2;
    }

    .ready-wrap {
      gap: 8px;
      padding: 8px 10px;
      border-radius: 12px;
    }

    .ready-btn {
      min-width: 110px;
      padding: 11px 12px;
      border-radius: 10px;
      font-size: 13px;
      letter-spacing: 1.2px;
      margin-left: auto;
    }
  }
</style>
