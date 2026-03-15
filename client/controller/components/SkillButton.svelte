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

  import { createEventDispatcher, onDestroy } from 'svelte'
  import nipplejs from 'nipplejs'
  import CooldownOverlay from './CooldownOverlay.svelte'

  export let skill     = null   // skill config object from SkillDatabase
  export let index     = 0
  export let expiresAt = 0      // cooldown expiry timestamp

  const dispatch = createEventDispatcher()

  let btnEl      = null
  let joystick   = null
  let lastVector = { x: 1, y: 0 }
  let held       = false        // SUSTAINED visual state

  // ── Touch handlers per inputType ──────────────────────────────────────────

  function onTouchStart(e) {
    e.preventDefault()

    if (!skill) return
    const type = skill.inputType

    // Haptic feedback on all skill inputs
    navigator.vibrate?.(20)

    if (type === 'INSTANT') {
      dispatch('skill', { index, vector: { x: 1, y: 0 } })

    } else if (type === 'DIRECTIONAL' || type === 'TARGETED') {
      // Create a dynamic nipple inside the button
      if (joystick) { joystick.destroy(); joystick = null }

      joystick = nipplejs.create({
        zone:  btnEl,
        mode:  'dynamic',
        color: 'rgba(255,255,255,0.5)',
        size:  70,
      })

      joystick.on('move', (_, data) => {
        if (data.vector) {
          const v   = { x: data.vector.x, y: -data.vector.y }
          const mag = Math.hypot(v.x, v.y)
          if (mag > 0) { v.x /= mag; v.y /= mag }
          lastVector = v
        }
      })

      joystick.on('end', (_, data) => {
        joystick.destroy(); joystick = null
        if (data && data.distance > 8) {
          dispatch('skill', { index, vector: lastVector })
        }
      })

    } else if (type === 'SUSTAINED') {
      held = true
      dispatch('skill', { index, vector: { x: 1, y: 0 }, action: 'START' })
    }
  }

  function onTouchEnd(e) {
    e.preventDefault()
    if (skill?.inputType === 'SUSTAINED' && held) {
      held = false
      dispatch('skill', { index, vector: { x: 1, y: 0 }, action: 'END' })
    }
  }

  onDestroy(() => { joystick?.destroy() })
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="skill-btn"
  class:held
  class:on-cd={expiresAt > Date.now()}
  bind:this={btnEl}
  on:touchstart={onTouchStart}
  on:touchend={onTouchEnd}
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
