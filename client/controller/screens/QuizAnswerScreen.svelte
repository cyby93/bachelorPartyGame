<script>
  const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

  let { options = [], onanswer } = $props()
  let answered = $state(false)
</script>

<div class="quiz-answer">
  {#if !answered}
    <p class="title">Choose your answer!</p>
    <div class="options">
      {#each options as opt, i}
        <button
          class="option-btn"
          onclick={() => { answered = true; onanswer?.(i) }}
        >
          <span class="label">{LABELS[i]}</span>
          <span class="text">{opt}</span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="waiting">Answer submitted!</p>
    <p class="sublabel">Waiting for other players...</p>
  {/if}
</div>

<style>
  .quiz-answer {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px;
    gap: 12px;
  }

  .title {
    font-size: 20px;
    font-weight: bold;
    color: #f39c12;
    margin: 0 0 8px;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-width: 400px;
  }

  .option-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 10px;
    border: 2px solid #2c3e50;
    background: #1a2533;
    color: #ecf0f1;
    font-size: 16px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
  }

  .option-btn:active {
    background: #2c3e50;
    border-color: #3498db;
  }

  .label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #2c3e50;
    color: #3498db;
    font-weight: bold;
    font-size: 15px;
    flex-shrink: 0;
  }

  .text {
    flex: 1;
  }

  .waiting {
    font-size: 20px;
    color: #2ecc71;
    font-weight: bold;
  }

  .sublabel {
    font-size: 14px;
    color: #556677;
  }
</style>
