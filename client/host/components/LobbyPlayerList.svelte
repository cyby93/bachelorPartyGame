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
    <div class="player-item" style="border-left-color:{color}">
      <span class="pname">
        {player.name}
        {#if player.isBot}<span style="color:#555;font-size:10px"> [BOT]</span>{/if}
      </span>
      <span class="pclass" style="color:{color}">{player.className}</span>
    </div>
  {/each}
{/if}
