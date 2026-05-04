<script>
  /**
   * CooldownOverlay — JS-driven conic-gradient countdown.
   *
   * Uses requestAnimationFrame to update the sweep angle each frame.
   * Works on all mobile browsers; the previous @property CSS approach
   * failed silently on older Android / Samsung Internet.
   */

  let { expiresAt = 0 } = $props()

  let pct     = $state(0)     // 0 = no overlay, 1 = full dark sweep
  let rafId   = null
  let totalMs = 0

  function cancelRaf() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  }

  function tick() {
    const remaining = expiresAt - Date.now()
    if (remaining <= 0) {
      pct   = 0
      rafId = null
      return
    }
    pct   = remaining / totalMs
    rafId = requestAnimationFrame(tick)
  }

  $effect(() => {
    const now = Date.now()
    if (expiresAt > now) {
      totalMs = expiresAt - now
      pct     = 1
      cancelRaf()
      rafId = requestAnimationFrame(tick)
    } else {
      cancelRaf()
      pct = 0
    }

    return cancelRaf
  })
</script>

{#if pct > 0}
  <div
    class="cd-overlay"
    style="background: conic-gradient(from -90deg, rgba(0,0,0,0.82) {pct * 360}deg, transparent 0)"
  ></div>
{/if}

<style>
  .cd-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
  }
</style>
