<script>
  import { gameState } from './stores/gameState.js'
  import CreationScreen from './screens/CreationScreen.svelte'
  import JoinScreen from './screens/JoinScreen.svelte'
  import GameHUD from './screens/GameHUD.svelte'

  let { socket, audio } = $props()

  function toStage(scene) {
    if (scene === 'staging') return 'creation'
    if (scene === 'lobby')   return 'join'
    return 'game'
  }

  const stage = $derived(toStage($gameState.serverScene))

  $effect(() => {
    document.body.dataset.stage = stage
  })
</script>

{#if stage === 'creation'}
  <CreationScreen {socket} {audio} />
{:else if stage === 'join'}
  <JoinScreen {socket} />
{:else}
  <GameHUD {socket} />
{/if}
