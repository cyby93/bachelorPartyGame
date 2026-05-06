<script>
  import { gameState } from '../stores/gameState.js'
  import ResultScreen       from './ResultScreen.svelte'
  import LevelCompleteScreen from './LevelCompleteScreen.svelte'
  import QuizScreen         from './QuizScreen.svelte'

  $: scene = $gameState.scene
  $: active = scene === 'result' || scene === 'gameover' || scene === 'levelComplete' || scene === 'quiz'
</script>

{#if active}
  <div class="scene-overlay">
    {#if scene === 'result' || scene === 'gameover'}
      <ResultScreen />
    {:else if scene === 'levelComplete'}
      <LevelCompleteScreen />
    {:else if scene === 'quiz'}
      <QuizScreen />
    {/if}
  </div>
{/if}

<style>
.scene-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: linear-gradient(180deg, #1C1008 0%, #0D0802 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding: 0 40px 40px;
  box-sizing: border-box;
}
</style>
