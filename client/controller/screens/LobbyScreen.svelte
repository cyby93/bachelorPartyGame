<script>
  import { CLASSES } from '../../../shared/ClassConfig.js'

  // Must match GameScreen.svelte GRID_ORDER so the briefing positions match combat
  const GRID_ORDER = [1, 3, 0, 2]

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
      <img class="top-class-icon" src="/icons/classes/{CLASS_ICONS[className] ?? 'classicon_warrior'}.jpg" alt={className} />
      <div>
        <h1>{cls?.name ?? className}</h1>
        <p>Learn the layout now, then keep your eyes on the TV.</p>
      </div>
    </div>
    <div class="hero-chip">
      <div class="hero-info">
        <span class="hero-name" style="color: {classColor}">{playerName}</span>
        <span class="class-tag">{cls?.name ?? className} · {ROLES[className]}</span>
      </div>
    </div>
    <div class="stats">
      <span>❤️ {cls?.hp ?? '—'} HP</span>
      <span>⚡ {cls?.speed ?? '—'}x Spd</span>
    </div>
    <button type="button" class="ready-btn" onclick={() => onready?.()}>
      I GOT IT
    </button>
  </div>

  <div class="skills-grid">
    {#each GRID_ORDER as skillIdx}
      {@const skill = skills[skillIdx]}
      <div class="skill-card" style="--class-color: {classColor}">
        <span class="skill-icon">
          {#if skill.iconFile}
            <img src="/icons/abilities/{skill.iconFile}.jpg" alt={skill.name} class="skill-icon-img" />
          {:else}
            {skill.icon}
          {/if}
        </span>
        <div class="skill-details">
            <span class="skill-name">{skill.name}</span>
            {#if skill.cooldown > 0}
              <span class="skill-meta">{(skill.cooldown / 1000).toFixed(1)}s cooldown</span>
            {/if}
            <span class="skill-input-type">{INPUT_LABELS[skill.inputType] ?? skill.inputType}</span>
            <span class="skill-hint">{INPUT_HINTS[skill.inputType] ?? 'Use this skill from the right-side grid.'}</span>
        </div>
      </div>
    {/each}
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
    grid-template-columns: 2fr 1fr 1fr 2fr;
    gap: 10px;
    align-items: center;
    padding: 14px;
    border-radius: var(--rn-radius-lg);
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
    align-items: center;
    gap: 8px;
  }

  h1 {
    font-size: 24px;
    line-height: 1;
    color: var(--rn-text-bright);
  }

  .head-copy p {
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
    flex-direction: row;
    align-items: center;
    gap: 10px;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--class-color) 10%, rgba(255, 214, 143, 0.03)) 0%, rgba(255, 214, 143, 0) 34%),
      var(--rn-gradient-surface);
    border-radius: var(--rn-radius-lg);
    padding: 10px;
    min-width: 0;
    border: 1px solid var(--rn-border-subtle);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .skill-icon  {
    font-size: 52px;
    line-height: 1;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3px;
    border-radius: var(--rn-radius-md);
    background: rgba(7, 13, 18, 0.38);
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  .skill-icon-img {
    object-fit: contain;
    display: block;
  }

  .skill-details {
    display: flex;
    flex-direction: column;
    gap: 4px 8px;
    min-width: 0;
    flex: 1;
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

  .ready-btn {
    min-width: 100px;
    padding: 12px 14px;
    border-radius: var(--rn-radius-md);
    border: none;
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 2px;
    background: var(--rn-gradient-cta);
    color: var(--rn-gold);
    cursor: pointer;
    flex-shrink: 0;
    align-self: stretch;
  }

  .ready-btn:active { opacity: 0.9; }

  @media (max-height: 430px) {
    .lobby {
      padding: 8px;
      gap: 6px;
    }

    .briefing-head {
      gap: 8px;
      padding: 10px;
      border-radius: var(--rn-radius-md);
    }

    .stats {
      font-size: 11px;
      gap: 2px;
    }

    h1 {
      font-size: 19px;
    }

    .head-copy p {
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

    .skill-name {
      font-size: 11px;
    }

    .skill-meta,
    .skill-input-type,
    .skill-hint {
      font-size: 10px;
      line-height: 1.2;
    }

    .ready-btn {
      min-width: 84px;
      padding: 10px 10px;
      font-size: 12px;
      letter-spacing: 1.2px;
    }
  }
</style>
