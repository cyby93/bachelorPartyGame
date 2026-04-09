<script>
  let { skills = [], onupgrade } = $props()
  let chosen = $state(false)

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

  function formatVal(v) {
    if (typeof v !== 'number') return String(v)
    return Number.isInteger(v) ? String(v) : v.toFixed(2)
  }
</script>

<div class="upgrade-select">
  {#if !chosen}
    <p class="title">Upgrade an ability!</p>
    <div class="skill-list">
      {#each skills as skill}
        {@const canUpgrade = skill.preview != null}
        <button
          class="skill-card"
          class:maxed={!canUpgrade}
          disabled={!canUpgrade}
          onclick={() => { if (canUpgrade) { chosen = true; onupgrade?.(skill.skillIndex) } }}
        >
          <div class="skill-header">
            <span class="icon">{skill.icon}</span>
            <span class="name">{skill.name}</span>
            <span class="tier">{skill.currentTier}/{skill.maxTier}</span>
          </div>
          {#if canUpgrade}
            <div class="changes">
              {#each skill.preview.changes as change}
                {@const delta = change.to - change.from}
                {@const sign = delta >= 0 ? '+' : ''}
                <span class="change" class:positive={delta >= 0} class:negative={delta < 0}>
                  {formatPath(change.path)}: {formatVal(change.from)} → {formatVal(change.to)} ({sign}{formatVal(delta)})
                </span>
              {/each}
            </div>
          {:else}
            <div class="changes"><span class="maxed-label">MAX</span></div>
          {/if}
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
    color: #3498db;
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
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 2px solid #2c3e50;
    background: #1a2533;
    color: #ecf0f1;
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s;
  }

  .skill-card:active:not(.maxed) {
    border-color: #3498db;
  }

  .skill-card.maxed {
    opacity: 0.4;
    cursor: default;
  }

  .skill-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .icon { font-size: 18px; }
  .name { font-weight: bold; flex: 1; }
  .tier { font-size: 11px; color: #7f8c8d; }

  .changes {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
  }

  .change.positive { color: #2ecc71; }
  .change.negative { color: #e74c3c; }

  .maxed-label {
    color: #7f8c8d;
    font-weight: bold;
    font-size: 12px;
  }

  .done {
    font-size: 22px;
    color: #2ecc71;
    font-weight: bold;
  }

  .sublabel {
    font-size: 14px;
    color: #556677;
  }
</style>
