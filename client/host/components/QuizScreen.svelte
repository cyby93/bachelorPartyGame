<script>
  import { quizState } from '../stores/quizState.js'

  const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

  $: phase    = $quizState.phase
  $: question = $quizState.question
  $: progress = $quizState.progress
  $: results  = $quizState.results
  $: upgrades = $quizState.upgrades
</script>

<div class="quiz-screen">

  {#if phase === 'answering' && question}
    <h1 class="quiz-title">QUIZ TIME!</h1>

    <p class="quiz-question">{question.question}</p>

    <div class="options-list">
      {#each question.options as option, i}
        <div class="option-row">
          <span class="option-label">{OPTION_LABELS[i]}.</span>
          <span class="option-text">{option}</span>
        </div>
      {/each}
    </div>

    <p class="quiz-progress-text">
      {#if progress}
        {progress.answered} / {progress.total} players answered
      {:else}
        Players — answer on your phones!
      {/if}
    </p>

  {:else if phase === 'results' && results && question}
    <h1 class="quiz-title">RESULTS</h1>

    <p class="quiz-question quiz-question--small">{question.question}</p>

    <div class="options-list">
      {#each question.options as option, i}
        {@const isCorrect = i === results.correctIndex}
        <div class="option-row" class:correct={isCorrect}>
          <span class="option-label">{OPTION_LABELS[i]}.</span>
          <span class="option-text">{option}{isCorrect ? '  ✓' : ''}</span>
        </div>
      {/each}
    </div>

    <div class="results-summary">
      <span class="correct-count">✓ {results.correctCount} correct</span>
      <span class="wrong-count">✗ {results.wrongCount} wrong</span>
    </div>

  {:else if phase === 'upgrading'}
    <h1 class="quiz-title upgrade-title">CHOOSING UPGRADES...</h1>
    <p class="quiz-subtitle">Players with correct answers are upgrading their abilities</p>

    {#each upgrades as u}
      <p class="upgrade-entry">{u.playerName} upgraded {u.skillName}</p>
    {/each}

  {:else if phase === 'done'}
    <h1 class="quiz-title done-title">QUIZ COMPLETE</h1>

    {#if results}
      <p class="results-done">✓ {results.correctCount} correct &nbsp;&nbsp; ✗ {results.wrongCount} wrong</p>
    {/if}

    {#if upgrades.length > 0}
      <p class="upgrades-label">Upgrades chosen:</p>
      {#each upgrades as u}
        <p class="upgrade-entry">{u.playerName} → {u.skillName}</p>
      {/each}
    {/if}

    <p class="quiz-hint">Host — press CONTINUE to proceed</p>

  {:else}
    <p class="quiz-waiting">Preparing quiz...</p>
  {/if}

</div>

<style>
.quiz-screen {
  width: 100%;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 32px 0 24px;
}

.quiz-title {
  font-size: 42px;
  font-weight: 700;
  font-family: Arial, sans-serif;
  color: #f39c12;
  margin: 0;
  text-align: center;
}
.upgrade-title { color: #3498db; }
.done-title    { color: #f39c12; }

.quiz-question {
  font-size: 28px;
  color: #ecf0f1;
  text-align: center;
  line-height: 1.35;
  margin: 0;
  max-width: 580px;
}
.quiz-question--small { font-size: 22px; color: #bdc3c7; }

.quiz-subtitle {
  font-size: 16px;
  color: #95a5a6;
  text-align: center;
  margin: 0;
}

.options-list {
  width: 100%;
  max-width: 580px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #2c3e50;
  border-radius: 8px;
  padding: 12px 18px;
  min-height: 48px;
}
.option-row.correct {
  background: #27ae60;
}

.option-label {
  font-size: 20px;
  font-weight: 700;
  color: #ecf0f1;
  min-width: 24px;
}

.option-text {
  font-size: 20px;
  color: #ecf0f1;
  line-height: 1.3;
}
.option-row:not(.correct) .option-text { color: #7f8c8d; }
.option-row.correct .option-text       { color: #ffffff; }

.quiz-progress-text {
  font-size: 18px;
  color: #95a5a6;
  margin: 0;
  text-align: center;
}

.results-summary {
  display: flex;
  gap: 40px;
  font-size: 26px;
  font-weight: 700;
  margin-top: 8px;
}
.correct-count { color: #2ecc71; }
.wrong-count   { color: #e74c3c; }

.results-done {
  font-size: 22px;
  color: #bdc3c7;
  margin: 0;
}

.upgrades-label {
  font-size: 18px;
  color: #3498db;
  margin: 0;
}

.upgrade-entry {
  font-size: 18px;
  color: #2ecc71;
  margin: 0;
}

.quiz-hint {
  font-size: 13px;
  color: var(--rn-text-dimmer);
  margin: 12px 0 0;
}

.quiz-waiting {
  font-size: 24px;
  color: #95a5a6;
  margin: 0;
}
</style>
