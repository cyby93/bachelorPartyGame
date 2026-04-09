<script>
  let { correct = false, correctAnswer = '' } = $props()
</script>

<div class="quiz-result">
  {#if correct}
    <p class="result correct">Correct!</p>
    <p class="sublabel">Choose an ability to upgrade...</p>
  {:else}
    <p class="result wrong">Wrong!</p>
    <p class="answer">The answer was: <strong>{correctAnswer}</strong></p>
    <p class="sublabel">Waiting for others...</p>
  {/if}
</div>

<style>
  .quiz-result {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    gap: 12px;
    text-align: center;
  }

  .result {
    font-size: 28px;
    font-weight: bold;
    margin: 0;
  }

  .correct { color: #2ecc71; }
  .wrong   { color: #e74c3c; }

  .answer {
    font-size: 16px;
    color: #bdc3c7;
  }

  .sublabel {
    font-size: 14px;
    color: #556677;
  }
</style>
