<script>
  /**
   * SkillButton — handles all 4 inputType interaction modes.
   *
   * inputType:
   *   INSTANT     — tap to fire (no direction needed)
   *   DIRECTIONAL — nipplejs drag to aim, release fires with normalised direction vector
   *   TARGETED    — same interaction as DIRECTIONAL (drag → release)
   *   SUSTAINED   — touchstart emits action:'START', touchend emits action:'END'
   */

  import { onDestroy } from 'svelte'
  import nipplejs from 'nipplejs'
  import CooldownOverlay from './CooldownOverlay.svelte'

  let { skill = null, index = 0, expiresAt = 0, onskill, onaim } = $props()

  let btnEl        = null
  let lastVector   = { x: 1, y: 0 }
  let lastDistance = 0
  let held         = $state(false)  // SUSTAINED visual state

  // ── Cast-on-hold state (CAST + DIRECTIONAL, e.g. Pyroblast) ──────────────

  let castTimer   = null
  let isCasting   = false

  const isCastHold = $derived(skill?.type === 'CAST' && skill?.inputType === 'DIRECTIONAL')
  const castTime   = $derived(skill?.castTime ?? 1500)

  function startCast() {
    if (isCasting) return
    isCasting = true

    // Tell server to show cast bar on host display
    onskill?.({ index, vector: lastVector, action: 'CAST_START' })

    // Fire when castTime elapses
    castTimer = setTimeout(() => {
      if (isCasting) {
        isCasting = false
        castTimer = null
        onskill?.({ index, vector: lastVector })
      }
    }, castTime)
  }

  function cancelCast() {
    const wasCasting = isCasting
    if (castTimer) { clearTimeout(castTimer); castTimer = null }
    isCasting = false
    // Tell server to hide cast bar on host display
    if (wasCasting) {
      onskill?.({ index, vector: lastVector, action: 'CAST_CANCEL' })
    }
  }

  // ── nipplejs for DIRECTIONAL / TARGETED ───────────────────────────────────

  let autoFireInterval = null

  $effect(() => {
    const type = skill?.inputType
    if (!btnEl || (type !== 'DIRECTIONAL' && type !== 'TARGETED')) return

    const isFiller = skill?.type === 'PROJECTILE' || skill?.type === 'MELEE'

    const j = nipplejs.create({
      zone:  btnEl,
      mode:  'dynamic',
      color: 'rgba(255,255,255,0.5)',
      size:  70,
    })

    j.on('start', () => {
      navigator.vibrate?.(20)
      lastVector   = { x: 1, y: 0 }
      lastDistance = 0

      if (isFiller) {
        autoFireInterval = setInterval(() => {
          if (lastDistance > 8 && expiresAt <= Date.now()) {
            onskill?.({ index, vector: lastVector })
          }
        }, 100)
      }
    })

    j.on('move', (_, data) => {
      if (data.vector) {
        lastVector = { x: data.vector.x, y: -data.vector.y }
      }
      lastDistance = data.distance ?? 0
      onaim?.({ vector: lastVector })

      if (isCastHold) {
        if (lastDistance > 8 && !isCasting && expiresAt <= Date.now()) {
          startCast()
        } else if (lastDistance <= 8 && isCasting) {
          cancelCast()
        }
      } else if (isFiller && lastDistance > 8 && expiresAt <= Date.now()) {
        onskill?.({ index, vector: lastVector })
      }
    })

    j.on('end', () => {
      if (autoFireInterval) {
        clearInterval(autoFireInterval)
        autoFireInterval = null
      }

      if (isCastHold) {
        cancelCast()
      } else if (!isFiller && lastDistance > 8) {
        onskill?.({ index, vector: lastVector })
      }
      lastDistance = 0
    })

    return () => {
      if (autoFireInterval) clearInterval(autoFireInterval)
      cancelCast()
      j.destroy()
    }
  })

  // ── Touch handlers for INSTANT / SUSTAINED ────────────────────────────────

  function onTouchStart(e) {
    const type = skill?.inputType
    if (type === 'DIRECTIONAL' || type === 'TARGETED') return  // nipplejs owns it
    e.preventDefault()
    navigator.vibrate?.(20)

    if (type === 'INSTANT') {
      onskill?.({ index, vector: { x: 1, y: 0 } })
    } else if (type === 'SUSTAINED') {
      held = true
      onskill?.({ index, vector: { x: 1, y: 0 }, action: 'START' })
    }
  }

  function onTouchEnd(e) {
    const type = skill?.inputType
    if (type === 'DIRECTIONAL' || type === 'TARGETED') return
    e.preventDefault()
    if (type === 'SUSTAINED' && held) {
      held = false
      onskill?.({ index, vector: { x: 1, y: 0 }, action: 'END' })
    }
  }

  function onTouchCancel(e) {
    const type = skill?.inputType
    if (type === 'DIRECTIONAL' || type === 'TARGETED') return
    if (type === 'SUSTAINED' && held) {
      held = false
      onskill?.({ index, vector: { x: 1, y: 0 }, action: 'END' })
    }
  }
</script>

<div
  class="skill-btn"
  class:held
  class:on-cd={expiresAt > Date.now()}
  bind:this={btnEl}
  ontouchstart={onTouchStart}
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
    gap: 6px;
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

  .skill-icon { font-size: 32px; line-height: 1; }
  .skill-name { font-size: 11px; color: #7fa8c0; text-align: center; padding: 0 4px; }
</style>
