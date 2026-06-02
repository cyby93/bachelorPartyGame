<script>
  import { ABILITY_DETAIL, ABILITY_LABEL } from "../../../shared/AbilityBriefing.js";
  import { CLASSES } from "../../../shared/ClassConfig.js";

  // Must match GameScreen.svelte GRID_ORDER so the briefing positions match combat
  const GRID_ORDER = [1, 3, 0, 2];

  let { playerName = "", className = "", canReady = false, onready, onchangeclass } = $props();

  const CLASS_ICONS = {
    Warrior: "classicon_warrior",
    Paladin: "classicon_paladin",
    Shaman: "classicon_shaman",
    Hunter: "classicon_hunter",
    Priest: "classicon_priest",
    Mage: "classicon_mage",
    Druid: "classicon_druid",
    Rogue: "classicon_rogue",
    Warlock: "classicon_warlock",
    DeathKnight: "classicon_deathknight",
  };

  const ROLES = {
    Warrior: "Tank / DPS",
    Paladin: "Tank / Heal / DPS",
    Shaman: "Healer",
    Hunter: "Ranged DPS",
    Priest: "Healer",
    Mage: "Caster DPS",
    Druid: "Healer",
    Rogue: "Melee DPS",
    Warlock: "Caster DPS",
    DeathKnight: "Tank / DPS",
  };

  let cls = $derived(CLASSES[className]);
  let skills = $derived(cls?.skills ?? []);
  let classColor = $derived(cls?.color ?? "#00d2ff");
  let ready = $state(false);

  function handleReady() {
    if (ready) return;
    ready = true;
    onready?.();
  }
</script>

<div class="lobby" style="--class-color: {classColor}">
  <div class="briefing-head" style="--class-color: {classColor}">
    <div class="head-copy">
      <img
        class="top-class-icon"
        src="/icons/classes/{CLASS_ICONS[className] ?? 'classicon_warrior'}.jpg"
        alt={className}
      />
      <div>
        <h1>{cls?.name ?? className}</h1>
      </div>
    </div>
    <div class="hero-chip">
      <div class="hero-info">
        <span class="hero-name" style="color: {classColor}">{playerName}</span>
        <span class="class-tag"
          >{ROLES[className]}</span
        >
      </div>
    </div>
    <div class="stats">
      <span>{cls?.hp ?? "—"} ❤️</span>
      <span>{cls?.speed ?? "—"}x⚡</span>
    </div>
    <div class="head-actions">
      {#if !ready && onchangeclass}
        <button type="button" class="change-btn" onclick={onchangeclass}>
          Change class
        </button>
      {/if}
      {#if canReady}
        <button
          type="button"
          class="ready-btn"
          onclick={handleReady}
          disabled={ready}
        >
          {ready ? "READY ✓" : "I am ready"}
        </button>
      {:else}
        <div class="waiting-pill">Waiting for host…</div>
      {/if}
    </div>
  </div>

  <div class="skills-grid">
    {#each GRID_ORDER as skillIdx}
      {@const skill = skills[skillIdx]}
      {#if skill}
        <div class="skill-card" style="--class-color: {classColor}">
          <span class="skill-icon">
            {#if skill.iconFile}
              <img
                src="/icons/abilities/{skill.iconFile}.jpg"
                alt={skill.name}
                class="skill-icon-img"
              />
            {:else}
              {skill.icon}
            {/if}
          </span>
          <div class="skill-details">
            <span class="skill-name">{skill.name}</span>
            {#if skill.cooldown > 0}
              <span class="skill-meta"
                >{(skill.cooldown / 1000).toFixed(1)}s cooldown</span
              >
            {/if}
            <span class="skill-input-type">
              {ABILITY_LABEL[skill.name] ?? skill.inputType}
            </span>
            {#if ABILITY_DETAIL[skill.name]}
              <span class="skill-detail">{ABILITY_DETAIL[skill.name]}</span>
            {/if}
          </div>
        </div>
      {/if}
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
    font-size: var(--rn-fs-lobby);
    background: radial-gradient(
        circle at top,
        color-mix(
            in srgb,
            var(--class-color, var(--rn-accent)) 16%,
            transparent
          )
          0%,
        transparent 28%
      ),
      var(--rn-gradient-bg);
  }

  .briefing-head {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 2fr;
    gap: 10px;
    align-items: center;
    padding: 14px;
    border-radius: var(--rn-radius-lg);
    border: 1px solid
      color-mix(in srgb, var(--class-color) 30%, rgba(104, 130, 153, 0.24));
    background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--class-color) 12%, rgba(255, 214, 143, 0.03)) 0%,
        rgba(255, 214, 143, 0) 34%
      ),
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

  /* h1 {
    font-size: 1.5em;
    line-height: 1;
    color: var(--rn-text-bright);
  } */

  .head-copy h1 {
    font-size: 2em;
    font-family: 'Morpheus', 'Trebuchet MS', sans-serif;
    letter-spacing: 2px;
    color: var(--class-color);
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

  .hero-name {
    font-size: 1em;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .class-tag {
    font-size: 0.75em;
    color: var(--rn-text-dim);
    white-space: nowrap;
  }

  .stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    font-size: 1em;
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
    background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--class-color) 10%, rgba(255, 214, 143, 0.03)) 0%,
        rgba(255, 214, 143, 0) 34%
      ),
      var(--rn-gradient-surface);
    border-radius: var(--rn-radius-lg);
    padding: 10px;
    min-width: 0;
    border: 1px solid var(--rn-border-subtle);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  /* section wrapper — sets emoji icon size relative to .lobby base */
  .skill-icon {
    font-size: 3.25em;
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

  /* section wrapper — children use em relative to this 1.5em base */
  .skill-details {
    font-size: 1.3em;
    display: flex;
    flex-direction: column;
    gap: 4px 8px;
    min-width: 0;
    flex: 1;
  }

  .skill-name {
    font-size: 1em;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .skill-meta {
    font-size: 0.6em;
    color: var(--rn-text-label);
  }

  .skill-input-type {
    font-size: 0.75em;
    font-weight: 700;
    color: var(--class-color);
  }

  .skill-detail {
    font-size: 0.6em;
    line-height: 1.45;
    color: var(--rn-text-secondary);
    margin-top: 2px;
  }

  .head-actions {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 6px;
    flex-shrink: 0;
  }

  .head-actions > * {
    flex: 1;
  }

  .ready-btn {
    min-width: 100px;
    padding: 12px 14px;
    border-radius: var(--rn-radius-md);
    border: none;
    font-size: 1.125em;
    font-weight: bold;
    letter-spacing: 2px;
    background: var(--rn-gradient-cta);
    color: var(--rn-gold);
    cursor: pointer;
  }

  .change-btn {
    padding: 12px 14px;
    border-radius: var(--rn-radius-md);
    border: 1px solid var(--rn-border);
    background: transparent;
    color: var(--rn-text-dim);
    font-size: 0.69em;
    letter-spacing: 1px;
    cursor: pointer;
    text-align: center;
  }

  .change-btn:hover {
    border-color: var(--rn-border-btn);
    color: var(--rn-text-body);
  }

  .waiting-pill {
    min-width: 100px;
    padding: 12px 14px;
    border-radius: var(--rn-radius-md);
    border: 1px solid rgba(100, 72, 20, 0.35);
    background: var(--rn-gradient-surface);
    color: var(--rn-text-dim);
    font-size: 0.75em;
    font-weight: 600;
    letter-spacing: 1px;
    text-align: center;
    flex-shrink: 0;
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ready-btn:active {
    opacity: 0.9;
  }
  .ready-btn:disabled {
    background: var(--rn-gradient-surface);
    color: #4caf50;
    border: 1px solid rgba(76, 175, 80, 0.4);
    cursor: default;
    opacity: 1;
  }

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
      font-size: 1em;
      gap: 2px;
    }

  .head-copy h1 {
    font-size: 1.5em;
    font-family: 'Morpheus', 'Trebuchet MS', sans-serif;
    letter-spacing: 2px;
    color: var(--class-color);
  }

    .hero-chip {
      gap: 8px;
    }

    .top-class-icon {
      width: 38px;
      height: 38px;
    }

    .hero-name {
      font-size: 1em;
    }

    .class-tag {
      font-size: 0.8em;
    }

    .skills-grid {
      gap: 6px;
    }

    .skill-details {
      font-size: 1em;
    }

    .skill-meta,
    .skill-input-type,
    .skill-detail {
      line-height: 1.1;
    }
    .skill-detail {
      font-size: 0.8em;
      line-height: 1.2;
    }

    .ready-btn {
      min-width: 84px;
      padding: 10px 10px;
      font-size: 1em;
      letter-spacing: 1.2px;
    }

    .change-btn {
      font-size: 0.875em;
      padding: 10px 10px;
    }
  }
</style>
