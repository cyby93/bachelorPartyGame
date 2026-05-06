<script>
  import { gameState } from '../stores/gameState.js'
  import { CLASSES } from '../../../shared/ClassConfig.js'

  function buildMeterRows(players, totals, elapsed) {
    return players
      .map(p => ({
        player: p,
        total:  totals?.[p.id] ?? 0,
        rate:   Math.round((totals?.[p.id] ?? 0) / elapsed),
      }))
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total)
  }

  $: state    = $gameState
  $: meta     = state.levelMeta
  $: stats    = state.levelCompleteStats
  $: players  = Object.values(state.players).filter(p => !p.isHost)
  $: elapsed  = Math.max(1, (Date.now() - (stats?.startTime ?? Date.now())) / 1000)
  $: dmgRows  = buildMeterRows(players, stats?.damage, elapsed)
  $: healRows = buildMeterRows(players, stats?.heal,   elapsed)
  $: maxDmg   = dmgRows[0]?.total  || 1
  $: maxHeal  = healRows[0]?.total || 1

  $: levelNum    = meta?.levelNumber ?? ((meta?.levelIndex ?? 0) + 1)
  $: totalLevels = meta?.totalLevels ?? '?'
  $: levelName   = meta?.levelName ?? ''
  $: isSandbox   = !!meta?.debugSandbox
</script>

<div class="lc-screen">

  <h1 class="lc-title">
    {isSandbox ? 'SANDBOX COMPLETE!' : `LEVEL ${levelNum} COMPLETE!`}
  </h1>

  {#if levelName}
    <p class="lc-level-name">{levelName}</p>
  {/if}

  <p class="lc-progress">
    {isSandbox ? 'Debug encounter finished' : `${levelNum} / ${totalLevels} levels completed`}
  </p>

  <!-- Damage + Healing meters side by side -->
  {#if stats}
    <div class="meters-row">
      <div class="sidebar-card meter-section">
        <div class="sidebar-card-header">Damage meter</div>
        {#if dmgRows.length === 0}
          <div class="empty-state">No damage recorded.</div>
        {:else}
          {#each dmgRows as { player, total, rate } (player.id)}
            {@const color    = CLASSES[player.className]?.color ?? '#ffffff'}
            {@const meterPct = total / maxDmg}
            {@const iconFile = (player.className ?? '').toLowerCase()}
            <div class="meter-row" style="--meter-pct:{meterPct};--meter-color:{color}">
              <img class="row-class-icon" src="/icons/classes/classicon_{iconFile}.jpg" alt={player.className} />
              <div class="meter-name" style="color:{color}">{player.name}</div>
              <div class="meter-value">
                {total.toLocaleString()} <span class="meter-rate">({rate}/s)</span>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <div class="sidebar-card meter-section">
        <div class="sidebar-card-header">Healing meter</div>
        {#if healRows.length === 0}
          <div class="empty-state">No healing recorded.</div>
        {:else}
          {#each healRows as { player, total, rate } (player.id)}
            {@const color    = CLASSES[player.className]?.color ?? '#ffffff'}
            {@const meterPct = total / maxHeal}
            {@const iconFile = (player.className ?? '').toLowerCase()}
            <div class="meter-row" style="--meter-pct:{meterPct};--meter-color:{color}">
              <img class="row-class-icon" src="/icons/classes/classicon_{iconFile}.jpg" alt={player.className} />
              <div class="meter-name" style="color:{color}">{player.name}</div>
              <div class="meter-value">
                {total.toLocaleString()} <span class="meter-rate">({rate}/s)</span>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <p class="lc-hint">Host — press CONTINUE to advance to the next level</p>
</div>

<style>
.lc-screen {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px 0 16px;
}

.lc-title {
  text-align: center;
  font-size: 52px;
  font-weight: 700;
  font-family: Arial, sans-serif;
  color: #f1c40f;
  margin: 0;
  line-height: 1;
}

.lc-level-name {
  text-align: center;
  font-size: 20px;
  color: var(--rn-text-body);
  margin: 0;
}

.lc-progress {
  text-align: center;
  font-size: 14px;
  color: var(--rn-text-dimmer);
  margin: 0;
}

.meters-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.meter-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lc-hint {
  text-align: center;
  font-size: 13px;
  color: var(--rn-text-dimmer);
  margin: 4px 0 0;
}
</style>
