<script>
  import { gameState } from '../stores/gameState.js'
  import { CLASSES } from '../../../shared/ClassConfig.js'

  function formatObjective(objective, state) {
    if (!objective) return { label: '', value: '' }
    switch (objective.type) {
      case 'killCount': {
        const label = objective.enemyTypes?.length
          ? `Kill ${objective.target ?? '?'} ${objective.enemyTypes.join(', ')}`
          : 'Wave progress'
        return { label, value: `${objective.current ?? 0} / ${objective.target ?? '?'}` }
      }
      case 'survive': {
        const total = objective.durationMs ?? objective.target ?? 0
        const remaining = Math.max(0, total - (objective.current ?? 0))
        return { label: 'Survive', value: `${Math.ceil(remaining / 1000)}s remaining` }
      }
      case 'surviveWaves':
        return { label: 'Survive the waves', value: `${objective.current ?? 0} / ${objective.target ?? '?'}` }
      case 'destroyGates':
        return { label: 'Destroy the gates', value: `${objective.current ?? 0} / ${objective.target ?? '?'}` }
      case 'killAll':
        return { label: 'Defeat all enemies', value: objective.current === 1 ? 'Complete' : 'In progress' }
      case 'killBoss': {
        const boss = state?.boss
        if (boss) {
          const hp = Math.max(0, Math.ceil(boss.hp ?? 0))
          const maxHp = Math.max(1, Math.ceil(boss.maxHp ?? 1))
          return { label: boss.name ?? 'Boss', value: `${hp} / ${maxHp} HP` }
        }
        return { label: 'Defeat the boss', value: objective.current === 1 ? 'Complete' : 'In progress' }
      }
      case 'killBossProtectNPC': {
        const npc = (state?.npcs ?? []).find(entry => entry.id === objective.npcId)
        const npcState = npc ? `${Math.max(0, Math.ceil(npc.hp ?? 0))} HP` : 'Alive'
        return { label: 'Protect Akama', value: objective.current === 1 ? 'Complete' : npcState }
      }
      default:
        return { label: 'Objective', value: String(objective.current ?? '') }
    }
  }

  function buildMeterRows(players, totals, stats) {
    const elapsed = Math.max(1, (Date.now() - (stats?.startTime ?? Date.now())) / 1000)
    return players
      .map(player => ({
        player,
        total: totals?.[player.id] ?? 0,
        rate: Math.round((totals?.[player.id] ?? 0) / elapsed),
      }))
      .filter(row => row.total > 0)
      .sort((a, b) => b.total - a.total)
  }

  $: state = $gameState
  $: raidPlayers = Object.values(state.players)
    .filter(p => !p.isHost)
    .sort((a, b) => a.name.localeCompare(b.name))
  $: meta = state.levelMeta
  $: boss = state.boss
  $: objective = formatObjective(state.objectives?.[0] ?? null, state)
  $: shadeVisible = !!(boss && boss.isImmune && !boss.isDead)
  $: shadeHp = Math.ceil(boss?.hp ?? 0)
  $: shadeDmgPct = Math.round(((boss?.damageMult ?? 1) - 1) * 100)
  $: levelDisplay = meta?.debugSandbox
    ? 'Debug Sandbox'
    : `Level ${meta?.levelNumber ?? ((meta?.levelIndex ?? 0) + 1)} / ${meta?.totalLevels ?? '?'}`
  $: nonHostPlayers = Object.values(state.players).filter(p => !p.isHost)
  $: dmgRows = buildMeterRows(nonHostPlayers, state.stats?.damage, state.stats)
  $: healRows = buildMeterRows(nonHostPlayers, state.stats?.heal, state.stats)
  $: maxDmg = dmgRows[0]?.total || 1
  $: maxHeal = healRows[0]?.total || 1
</script>

<!-- Level info card -->
<div class="sidebar-card">
  <div class="gameplay-heading">
    <div id="gameplay-level-index">{levelDisplay}</div>
    <div id="gameplay-level-name">{meta?.levelName ?? 'Current level'}</div>
  </div>
  <div class="gameplay-rule"></div>
</div>

<!-- Objective card -->
<div class="sidebar-card">
  <div class="sidebar-card-header">Objective</div>
  <div id="gameplay-objective-value">{objective.value || 'In progress'}</div>
  <div id="gameplay-objective-label">{objective.label}</div>
</div>

<!-- Shade of Akama card — visible only during Level 4 Phase 1 -->
{#if shadeVisible}
  <div id="gameplay-shade-card" class="sidebar-card">
    <div class="sidebar-card-header">Shade of Akama</div>
    <div id="gameplay-shade-hp">{shadeHp.toLocaleString()} HP</div>
    <div id="gameplay-shade-text">{shadeDmgPct > 0 ? `+${shadeDmgPct}% Damage` : 'No buff yet'}</div>
  </div>
{/if}

<!-- Raid Status card -->
<div class="sidebar-card">
  <div class="sidebar-card-header">Raid Status</div>
  <div id="gameplay-roster">
    {#if raidPlayers.length === 0}
      <div class="empty-state">Waiting for players…</div>
    {:else}
      {#each raidPlayers as player (player.id)}
        {@const color = CLASSES[player.className]?.color ?? '#ffffff'}
        {@const maxHp = Math.max(1, player.maxHp ?? player.hp ?? 1)}
        {@const hp = Math.max(0, Math.ceil(player.hp ?? 0))}
        {@const hpPct = player.isDead ? 0 : Math.max(0, Math.min(1, hp / maxHp))}
        {@const iconFile = (player.className ?? '').toLowerCase()}
        <div class="roster-row" class:dead={player.isDead} style="--hp-pct:{hpPct}">
          <img class="row-class-icon" src="/icons/classes/classicon_{iconFile}.jpg" alt={player.className} />
          <div class="roster-name" style="color:{color}">{player.name}</div>
          <div class="roster-hp">{player.isDead ? 'Dead' : String(hp)}</div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<!-- Damage + Healing meters card -->
<div class="sidebar-card meter-columns">
  <div>
    <div class="sidebar-card-header">Damage</div>
    <div id="damage-meter-list">
      {#if dmgRows.length === 0}
        <div class="empty-state">No damage yet.</div>
      {:else}
        {#each dmgRows as { player, total, rate }, i (player.id)}
          {@const color = CLASSES[player.className]?.color ?? '#ffffff'}
          {@const meterPct = total / maxDmg}
          {@const compact = i >= 5}
          {@const iconFile = (player.className ?? '').toLowerCase()}
          <div class="meter-row" class:compact style="--meter-pct:{meterPct};--meter-color:{color}">
            {#if !compact}
              <img class="row-class-icon" src="/icons/classes/classicon_{iconFile}.jpg" alt={player.className} />
              <div class="meter-name" style="color:{color}">{player.name}</div>
              <div class="meter-value">
                {total.toLocaleString()} <span class="meter-rate">({rate}/s)</span>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
  <div>
    <div class="sidebar-card-header">Healing</div>
    <div id="healing-meter-list">
      {#if healRows.length === 0}
        <div class="empty-state">No healing yet.</div>
      {:else}
        {#each healRows as { player, total, rate }, i (player.id)}
          {@const color = CLASSES[player.className]?.color ?? '#ffffff'}
          {@const meterPct = total / maxHeal}
          {@const compact = i >= 5}
          {@const iconFile = (player.className ?? '').toLowerCase()}
          <div class="meter-row" class:compact style="--meter-pct:{meterPct};--meter-color:{color}">
            {#if !compact}
              <img class="row-class-icon" src="/icons/classes/classicon_{iconFile}.jpg" alt={player.className} />
              <div class="meter-name" style="color:{color}">{player.name}</div>
              <div class="meter-value">
                {total.toLocaleString()} <span class="meter-rate">({rate}/s)</span>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>
