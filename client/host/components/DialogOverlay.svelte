<script>
  import { fly, fade } from 'svelte/transition'
  import { cubicOut, cubicIn } from 'svelte/easing'
  import { onDestroy } from 'svelte'
  import { dialogLine } from '../stores/dialogStore.js'

  const SPEAKERS = {
    illidan: { label: 'ILLIDAN STORMRAGE', color: '#9933ff' },
    akama:   { label: 'AKAMA',             color: '#00ccaa' },
    shade:   { label: 'SHADE OF AKAMA',    color: '#8c6bff' },
  }

  let hideTimer = null

  // Start (or restart) the hide timer whenever a new line arrives.
  $: {
    clearTimeout(hideTimer)
    if ($dialogLine) {
      hideTimer = setTimeout(() => dialogLine.set(null), $dialogLine.delayAfter ?? 8000)
    }
  }

  $: line = $dialogLine
  $: cfg  = line
    ? (SPEAKERS[line.speaker] ?? { label: line.speaker.toUpperCase(), color: '#ffffff' })
    : null

  onDestroy(() => clearTimeout(hideTimer))
</script>

{#if line}
  <div
    class="dialog-box"
    in:fly={{ y: 48, duration: 360, easing: cubicOut }}
    out:fly={{ y: 28, duration: 240, easing: cubicIn }}
  >
    {#key line}
      <span
        class="speaker"
        style="color: {cfg.color}"
        in:fade={{ duration: 280 }}
      >{cfg.label}</span>
      <p
        class="text"
        in:fly={{ y: 8, duration: 280, delay: 230, easing: cubicOut }}
      >{line.text}</p>
    {/key}
  </div>
{/if}

<style>
.dialog-box {
  padding: 20px 36px 26px;
  background:
    linear-gradient(180deg, rgba(200, 148, 40, 0.05) 0%, rgba(200, 148, 40, 0) 50%),
    rgba(10, 6, 3, 0.94);
  border-top: 1px solid rgba(148, 106, 32, 0.40);
  box-shadow:
    inset 0 1px 0 rgba(255, 210, 80, 0.06),
    0 -12px 40px rgba(0, 0, 0, 0.60);
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.speaker {
  display: block;
  font-family: Arial, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.text {
  margin: 0;
  font-family: Arial, sans-serif;
  font-size: 20px;
  color: #e8e0d0;
  line-height: 1.5;
}
</style>
