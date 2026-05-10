<script>
  import { gameState } from '../stores/gameState.js'
  import { CLASSES } from '../../../shared/ClassConfig.js'

  $: players = Object.values($gameState.players).filter(p => !p.isHost)
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
      <div class="roster-hp">Full</div>
    </div>
  {/each}
{/if}
