<script>
  /**
   * SkillButton — handles all 4 inputType interaction modes.
   *
   * inputType:
   *   INSTANT    — tap to fire (no direction needed)
   *   DIRECTIONAL — drag to aim, release fires with normalised direction vector
   *   TARGETED    — same interaction as DIRECTIONAL (drag → release)
   *   SUSTAINED   — touchstart emits action:'START', touchend emits action:'END'
   */

  import CooldownOverlay from './CooldownOverlay.svelte'

  let { skill = null, index = 0, expiresAt = 0, onskill } = $props()

  let btnEl        = null
  let lastVector   = { x: 1, y: 0 }
  let lastDistance = 0
  let startX       = 0
  let startY       = 0
  let held         = $state(false)  // SUSTAINED visual state

  // ── Touch handlers per inputType ──────────────────────────────────────────

  function onTouchStart(e) {
    e.preventDefault()

    if (!skill) return
    const type = skill.inputType

    // Haptic feedback on all skill inputs
    navigator.vibrate?.(20)

    if (type === 'INSTANT') {
      onskill?.({ index, vector: { x: 1, y: 0 } })

    } else if (type === 'DIRECTIONAL' || type === 'TARGETED') {
      const t = e.touches[0]
      startX = t.clientX
      startY = t.clientY
      lastVector   = { x: 1, y: 0 }
      lastDistance = 0

    } else if (type === 'SUSTAINED') {
      held = true
      onskill?.({ index, vector: { x: 1, y: 0 }, action: 'START' })
    }
  }

  function onTouchMove(e) {
    e.preventDefault()
    if (!skill) return
    const type = skill.inputType
    if (type !== 'DIRECTIONAL' && type !== 'TARGETED') return

    const t    = e.touches[0]
    const dx   = t.clientX - startX
    const dy   = t.clientY - startY
    const dist = Math.hypot(dx, dy)
    lastDistance = dist
    if (dist > 0) lastVector = { x: dx / dist, y: -(dy / dist) }
  }

  function onTouchEnd(e) {
    e.preventDefault()
    if (!skill) return
    const type = skill.inputType

    if ((type === 'DIRECTIONAL' || type === 'TARGETED') && lastDistance > 8) {
      onskill?.({ index, vector: lastVector })
    } else if (type === 'SUSTAINED' && held) {
      held = false
      onskill?.({ index, vector: { x: 1, y: 0 }, action: 'END' })
    }
  }

  function onTouchCancel(e) {
    if (skill?.inputType === 'SUSTAINED' && held) {
      held = false
      onskill?.({ index, vector: { x: 1, y: 0 }, action: 'END' })
    }
    lastDistance = 0
  }
</script>

<div
  class="skill-btn"
  class:held
  class:on-cd={expiresAt > Date.now()}
  bind:this={btnEl}
  ontouchstart={onTouchStart}
  ontouchmove={onTouchMove}
  ontouchend={onTouchEnd}
  ontouchcancel={onTouchCancel}
>
  {#if skill}
    <span class="skill-icon">{skill.icon}</span>
    <span class="skill-name">{skill.name}</span>
    <CooldownOverlay {expiresAt} />
  {/if}
</div>

<style>
  .skill-btn {
    background: #16202a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    user-select: none;
    position: relative;
    overflow: hidden;
    transition: background 0.1s;
    /* let parent grid size it */
  }

  .skill-btn:active {
    background: #1e3a4a;
  }

  /* SUSTAINED — lit border while held */
  .skill-btn.held {
    border: 2px solid #00d2ff;
  }

  .skill-icon { font-size: 28px; line-height: 1; }
  .skill-name { font-size: 10px; color: #7fa8c0; text-align: center; padding: 0 4px; }
</style>
