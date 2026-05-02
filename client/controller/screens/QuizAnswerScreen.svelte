<script>
  import { onMount, onDestroy } from 'svelte'

  const LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

  let { options = [], onanswer } = $props()

  let disabled      = $state(true)
  let selectedIndex = $state(null)
  let confirmed     = $state(false)

  let _timer

  onMount(() => {
    _timer = setTimeout(() => { disabled = false }, 2000)
  })

  onDestroy(() => { clearTimeout(_timer) })

  function confirm() {
    if (selectedIndex === null || confirmed) return
    confirmed = true
    onanswer?.(selectedIndex)
  }
</script>

<div class="quiz-answer">
  {#if !confirmed}
    <p class="title">Choose your answer!</p>
    {#if disabled}
      <p class="countdown">Get ready…</p>
    {/if}
    <div class="options">
      {#each options as opt, i}
        <button
          class="option-btn"
          class:selected={selectedIndex === i}
          disabled={disabled}
          onclick={() => { selectedIndex = i }}
        >
          <span class="label">{LABELS[i]}</span>
          <span class="text">{opt}</span>
        </button>
      {/each}
    </div>

    <button
      class="confirm-btn"
      disabled={selectedIndex === null || disabled}
      onclick={confirm}
    >
      Confirm
    </button>
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
    gap: 10px;
  }

  .title {
    font-size: 20px;
    font-weight: bold;
    color: var(--rn-warning);
    margin: 0;
  }

  .countdown {
    font-size: 14px;
    color: var(--rn-text-dim);
    margin: 0;
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
    padding: 12px 16px;
    border-radius: 10px;
    border: 2px solid var(--rn-bg-surface);
    background: var(--rn-bg-surface);
    color: var(--rn-text-bright);
    font-size: 16px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
  }

  .option-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .option-btn.selected {
    border-color: var(--rn-info);
    background: rgba(106, 56, 16, 0.35);
  }

  .option-btn:not(:disabled):active {
    background: var(--rn-bg-surface);
  }

  .label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--rn-bg-surface);
    color: var(--rn-info);
    font-weight: bold;
    font-size: 15px;
    flex-shrink: 0;
  }

  .option-btn.selected .label {
    background: var(--rn-info);
    color: #fff;
  }

  .text { flex: 1; }

  .confirm-btn {
    width: 100%;
    max-width: 400px;
    padding: 14px;
    border-radius: 10px;
    border: none;
    font-size: 16px;
    font-weight: bold;
    background: var(--rn-gradient-confirm);
    color: #fff;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .confirm-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .confirm-btn:not(:disabled):active { opacity: 0.85; }

  .waiting {
    font-size: 20px;
    color: var(--rn-success);
    font-weight: bold;
  }

  .sublabel {
    font-size: 14px;
    color: var(--rn-text-dimmer);
  }
</style>
