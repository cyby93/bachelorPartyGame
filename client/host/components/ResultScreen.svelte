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

  $: state        = $gameState
  $: isVictory    = state.scene === 'result'
  $: stats        = state.cumulativeStats
  $: players      = Object.values(state.players).filter(p => !p.isHost)
  $: elapsed      = Math.max(1, (Date.now() - (stats?.startTime ?? Date.now())) / 1000)
  $: dmgRows      = buildMeterRows(players, stats?.damage, elapsed)
  $: healRows     = buildMeterRows(players, stats?.heal,   elapsed)
  $: maxDmg       = dmgRows[0]?.total  || 1
  $: maxHeal      = healRows[0]?.total || 1
  $: sortedPlayers = [...players.filter(p => !p.isDead), ...players.filter(p => p.isDead)]
  $: quizStats    = stats?.quiz ?? {}
  $: hasQuiz      = Object.keys(quizStats).length > 0
</script>

<div class="result-screen">

  <h1 class="result-title" class:victory={isVictory} class:defeat={!isVictory}>
    {isVictory ? '⚔️  VICTORY!' : '💀  DEFEAT...'}
  </h1>

  <!-- Damage + Healing meters side by side -->
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

  <!-- Deaths + Revives (no label) -->
  <div class="sidebar-card deaths-card">
    <div class="deaths-header-row">
      <span></span>
      <span>Deaths</span>
      <span>Revives</span>
    </div>
    {#each sortedPlayers as p (p.id)}
      {@const color = p.isDead ? '#663333' : (CLASSES[p.className]?.color ?? '#ffffff')}
      <div class="deaths-row">
        <span class="deaths-name" style="color:{color}">{p.name}</span>
        <span class="deaths-val">{stats?.deaths?.[p.id] ?? 0}</span>
        <span class="revives-val">{stats?.resurrections?.[p.id] ?? 0}</span>
      </div>
    {/each}
  </div>

  <!-- Quiz summary -->
  {#if hasQuiz}
    <div class="sidebar-card quiz-card">
      <div class="sidebar-card-header">Quiz</div>
      <div class="quiz-header-row">
        <span></span>
        <span>Correct</span>
        <span>Wrong</span>
      </div>
      {#each sortedPlayers as p (p.id)}
        {@const color = p.isDead ? '#663333' : (CLASSES[p.className]?.color ?? '#ffffff')}
        {@const q = quizStats[p.id] ?? { correct: 0, wrong: 0 }}
        <div class="quiz-row">
          <span class="quiz-name" style="color:{color}">{p.name}</span>
          <span class="quiz-correct">{q.correct}</span>
          <span class="quiz-wrong">{q.wrong}</span>
        </div>
      {/each}
    </div>
  {/if}

  <p class="result-hint">Host — press RESTART GAME to play again</p>
</div>

<style>
.result-screen {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 0 16px;
}

.result-title {
  text-align: center;
  font-size: 64px;
  font-weight: 700;
  font-family: Arial, sans-serif;
  margin: 0 0 8px;
  line-height: 1;
}
.result-title.victory { color: #f1c40f; }
.result-title.defeat  { color: #e74c3c; }

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

/* Deaths / revives table */
.deaths-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.deaths-header-row,
.deaths-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0 24px;
  align-items: center;
  padding: 2px 4px;
  font-size: 12px;
}

.deaths-header-row {
  font-weight: 700;
  color: var(--rn-text-label);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(148, 106, 32, 0.22);
  margin-bottom: 2px;
}

.deaths-header-row span:nth-child(2),
.deaths-header-row span:nth-child(3) {
  text-align: center;
  min-width: 52px;
}

.deaths-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.deaths-val,
.revives-val {
  text-align: center;
  min-width: 52px;
  font-size: 13px;
}
.deaths-val  { color: #cc8866; }
.revives-val { color: #88aaff; }

/* Quiz table */
.quiz-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.quiz-header-row,
.quiz-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0 24px;
  align-items: center;
  padding: 2px 4px;
  font-size: 12px;
}

.quiz-header-row {
  font-weight: 700;
  color: var(--rn-text-label);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(148, 106, 32, 0.22);
  margin-bottom: 2px;
}

.quiz-header-row span:nth-child(2),
.quiz-header-row span:nth-child(3) {
  text-align: center;
  min-width: 52px;
}

.quiz-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quiz-correct {
  text-align: center;
  min-width: 52px;
  font-size: 13px;
  color: #44ee99;
}

.quiz-wrong {
  text-align: center;
  min-width: 52px;
  font-size: 13px;
  color: #ff6655;
}

.result-hint {
  text-align: center;
  font-size: 13px;
  color: var(--rn-text-dimmer);
  margin: 4px 0 0;
}
</style>
