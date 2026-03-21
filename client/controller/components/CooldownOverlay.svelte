<script>
  /**
   * CooldownOverlay — CSS conic-gradient countdown, no JS animation loop.
   *
   * Pass `expiresAt` (timestamp ms) whenever a cooldown starts.
   * The component derives the total duration, then CSS @property animates
   * --cd-pct from 1 → 0 over that duration.
   *
   * @property is supported in all modern mobile browsers (Chrome 85+, Safari 16.4+).
   */

  import { untrack } from 'svelte'

  let { expiresAt = 0 } = $props()  // ms timestamp; 0 = not on cooldown

  let animKey  = $state(0)   // incremented to force Svelte re-render / restart animation
  let duration = $state(0)   // ms
  let active   = $state(false)

  $effect(() => {
    const now = Date.now()
    if (expiresAt > now) {
      duration = expiresAt - now
      active   = true
      untrack(() => animKey++)
    } else {
      active = false
    }
  })
</script>

{#if active}
  <!-- key block forces DOM recreation each time expiresAt changes, restarting animation -->
  {#key animKey}
    <div
      class="cd-overlay"
      style="--cd-dur: {duration}ms"
    ></div>
  {/key}
{/if}

<style>
  /* Register --cd-pct as an animatable number */
  @property --cd-pct {
    syntax: '<number>';
    inherits: false;
    initial-value: 1;
  }

  .cd-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;

    /* conic-gradient sweeps clockwise from top, covering the cooldown fraction */
    background: conic-gradient(
      from -90deg,
      rgba(0, 0, 0, 0.7) calc(var(--cd-pct) * 360deg),
      transparent 0
    );

    --cd-pct: 1;
    animation: cd-drain var(--cd-dur) linear forwards;
  }

  @keyframes cd-drain {
    from { --cd-pct: 1; }
    to   { --cd-pct: 0; }
  }
</style>
