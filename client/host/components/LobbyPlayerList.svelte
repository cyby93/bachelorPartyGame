<script>
  import { gameState } from '../stores/gameState.js'
  import { CLASSES } from '../../../shared/ClassConfig.js'

  $: players = Object.values($gameState.players).filter(p => !p.isHost)
  $: isStaging = $gameState.scene === 'staging'

  function kickPlayer(playerId) {
    const el = document.getElementById('player-list')
    el?.dispatchEvent(new CustomEvent('kick-player', { detail: { playerId }, bubbles: true }))
  }
</script>

{#if players.length === 0}
  <p id="waiting-msg">Waiting for raid members…</p>
{:else}
  {#each players as player (player.id)}
    {@const color = CLASSES[player.className]?.color ?? '#aaa'}
    {@const iconFile = (player.className ?? '').toLowerCase()}
    <div class="roster-row" style="--hp-pct:1">
      <img class="row-class-icon" src="/icons/classes/classicon_{iconFile}.jpg" alt={player.className} />
      <div class="roster-name" style="color:{color}">
        {player.name}
        {#if player.isBot}<span style="color:#555;font-size:9px"> [BOT]</span>{/if}
      </div>
      {#if isStaging}
        <span class="ready-badge" class:ready={player.ready}>{player.ready ? '✓' : '○'}</span>
        {#if !player.isBot}
          <button class="kick-btn" onclick={() => kickPlayer(player.id)} title="Kick {player.name}">✕</button>
        {/if}
      {:else}
        <div class="roster-hp">Full</div>
      {/if}
    </div>
  {/each}
{/if}

<style>
  .ready-badge {
    font-size: 13px;
    font-weight: bold;
    color: #5f7385;
    min-width: 16px;
    text-align: center;
    flex-shrink: 0;
  }
  .ready-badge.ready { color: #4caf50; }

  .kick-btn {
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(255,80,80,0.3);
    background: transparent;
    color: rgba(255,80,80,0.6);
    font-size: 11px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .kick-btn:hover { background: rgba(255,80,80,0.12); color: #ff5050; }
</style>
