<script>
  let { skills = [], onupgrade } = $props()
  let chosen = $state(false)

  // Mirror the controller grid layout: [SK2, SK4 / SK1, SK3]
  const GRID_ORDER = [1, 3, 0, 2]
  let orderedSkills = $derived(GRID_ORDER.map(idx => skills.find(s => s.skillIndex === idx)).filter(Boolean))

  const PATH_LABELS = {
    damage: 'Damage',
    cooldown: 'Cooldown',
    range: 'Range',
    radius: 'Radius',
    distance: 'Distance',
    duration: 'Duration',
    healAmount: 'Heal',
    castTime: 'Cast Time',
    arc: 'Arc',
    speed: 'Speed',
    tickRate: 'Tick Rate',
    pierce: 'Pierce',
    chain: 'Chain',
    maxChains: 'Chains',
    projectileCount: 'Projectiles',
    triggerRadius: 'Trigger Range',
    fearDuration: 'Fear Duration',
    damagePerTick: 'DPS',
    healPerTick: 'HPS',
    comboDamage: 'Combo Dmg',
    spreadAngle: 'Spread',
    'payload.damage': 'Damage',
    'payload.radius': 'AoE Radius',
    'payload.healAmount': 'Heal/tick',
    'payload.healPercent': 'Heal %',
    'payload.onImpact.damage': 'Impact Dmg',
    'payload.onImpact.radius': 'Impact Radius',
    'dot.damagePerTick': 'DoT DPS',
    'dot.duration': 'DoT Duration',
    'hot.healPerTick': 'HoT HPS',
    'hot.duration': 'HoT Duration',
    'effectParams.shield': 'Shield',
    'effectParams.duration': 'Effect Duration',
    'effectParams.speedMultiplier': 'Speed Mult',
    'effectParams.fireRateMultiplier': 'Haste',
    'effectParams.damageMultiplier': 'Dmg Mult',
    'effectParams.damageReduction': 'Dmg Reduction',
    'effectParams.shadowStrikeMultiplier': 'Ambush Mult',
    'petStats.damage': 'Pet Damage',
    'petStats.hp': 'Pet HP',
    'totemAbility.damage': 'Totem Dmg',
    'totemAbility.tickRate': 'Totem Rate',
    'trapEffect.damage': 'Trap Dmg',
    'trapEffect.radius': 'Trap Radius',
  }

  function formatPath(path) {
    return PATH_LABELS[path] || path.split('.').pop()
  }

  const TIME_PATHS = new Set(['cooldown', 'castTime', 'duration', 'effectParams.duration', 'dot.duration', 'hot.duration'])
  // For these paths a reduction is a buff, so negative delta should render green
  const LOWER_IS_BETTER = new Set(['cooldown', 'castTime'])

  function formatVal(v, path) {
    if (typeof v !== 'number') return String(v)
    if (TIME_PATHS.has(path)) return (v / 1000).toFixed(1) + 's'
    return Number.isInteger(v) ? String(v) : v.toFixed(2)
  }
</script>

<div class="upgrade-select">
  {#if !chosen}
    <p class="title">Upgrade an ability!</p>
    <div class="skill-list">
      {#each orderedSkills as skill}
        {@const canUpgrade = skill.preview != null}
        <button
          class="skill-card"
          class:maxed={!canUpgrade}
          disabled={!canUpgrade}
          onclick={() => { if (canUpgrade) { chosen = true; onupgrade?.(skill.skillIndex) } }}
        >
          {#if skill.iconFile}
            <img class="skill-img" src="/icons/abilities/{skill.iconFile}.jpg" alt={skill.name} />
          {:else}
            <span class="skill-img skill-img-fallback">{skill.icon}</span>
          {/if}
          <div class="skill-body">
            <div class="skill-header">
              <span class="tier">{skill.currentTier}/{skill.maxTier}</span>
            </div>
            {#if canUpgrade}
              {#if skill.preview.label}
                <span class="upgrade-label">{skill.preview.label}</span>
              {/if}
              <div class="changes">
                {#each skill.preview.changes as change}
                  {@const delta = change.to - change.from}
                  {@const sign = delta >= 0 ? '+' : ''}
                  {@const isGood = LOWER_IS_BETTER.has(change.path) ? delta <= 0 : delta >= 0}
                  <span class="change" class:positive={isGood} class:negative={!isGood}>
                    {formatPath(change.path)}: {formatVal(change.from, change.path)} → {formatVal(change.to, change.path)} ({sign}{formatVal(delta, change.path)})
                  </span>
                {/each}
              </div>
            {:else}
              <div class="changes"><span class="maxed-label">MAX</span></div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {:else}
    <p class="done">Upgrade chosen!</p>
    <p class="sublabel">Waiting for others...</p>
  {/if}
</div>

<style>
  .upgrade-select {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px;
    gap: 8px;
    overflow-y: auto;
  }

  .title {
    font-size: 18px;
    font-weight: bold;
    color: var(--rn-gold);
    margin: 0 0 4px;
  }

  .skill-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    width: 100%;
    max-width: 500px;
  }

  .skill-card {
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: flex-start;
    padding: 8px 10px;
    border-radius: var(--rn-radius-md);
    border: 2px solid var(--rn-bg-surface);
    background: var(--rn-bg-surface);
    color: var(--rn-text-bright);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s;
  }

  .skill-card:active:not(.maxed) {
    border-color: var(--rn-info);
  }

  .skill-card.maxed {
    opacity: 0.4;
    cursor: default;
  }

  .skill-img {
    width: 52px;
    height: 52px;
    border-radius: var(--rn-radius-sm);
    object-fit: cover;
    flex-shrink: 0;
  }

  .skill-img-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    background: rgba(255,255,255,0.05);
  }

  .skill-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .skill-header {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .tier { font-size: 11px; color: var(--rn-text-dim); flex-shrink: 0; }

  .upgrade-label {
    font-size: 10px;
    font-weight: bold;
    color: var(--rn-gold);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .changes {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
  }

  .change.positive { color: var(--rn-success); }
  .change.negative { color: var(--rn-danger); }

  .maxed-label {
    color: var(--rn-text-dim);
    font-weight: bold;
    font-size: 12px;
  }

  .done {
    font-size: 22px;
    color: var(--rn-success);
    font-weight: bold;
  }

  .sublabel {
    font-size: 14px;
    color: var(--rn-text-dimmer);
  }
</style>
