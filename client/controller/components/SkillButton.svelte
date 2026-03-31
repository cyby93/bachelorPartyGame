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
  let fired        = $state(false)  // INSTANT fired flash
  let selfCastTapStart = null       // { x, y } pointer pos on down, for selfCastFallback tap detection
  let firedTimer   = null

  function flashFired() {
    fired = true
    if (firedTimer) clearTimeout(firedTimer)
    firedTimer = setTimeout(() => { fired = false; firedTimer = null }, 150)
  }

  // ── Cast-on-hold state (CAST + DIRECTIONAL, e.g. Pyroblast) ──────────────

  let castTimer     = null
  let isCasting     = false
  let joystickHeld  = false

  const isCastHold   = $derived(skill?.castBar === true)
  const isShieldHold = $derived(skill?.type === 'SHIELD' && skill?.inputType === 'DIRECTIONAL')
  const castTime     = $derived(skill?.castTime ?? 1500)

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
        // Wait for cooldown, then restart cast if joystick still held
        if (joystickHeld) {
          castTimer = setTimeout(() => {
            castTimer = null
            if (joystickHeld) startCast()
          }, skill?.cooldown ?? 0)
        }
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
    if (!btnEl || (type !== 'DIRECTIONAL' && type !== 'TARGETED' && type !== 'AIMED')) return

    // AIMED = aim while held, fire on release (no auto-fire loop)
    const isFiller = (skill?.type === 'PROJECTILE' || skill?.type === 'MELEE') && type !== 'AIMED'

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
      joystickHeld = true

      if (isCastHold && expiresAt <= Date.now()) {
        startCast()
      } else if (isFiller) {
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

      if (isShieldHold) {
        // Activate shield when joystick dragged past threshold
        if (lastDistance > 8 && !held && expiresAt <= Date.now()) {
          held = true
          onskill?.({ index, vector: lastVector, action: 'START' })
        }
      } else if (isFiller && lastDistance > 8 && expiresAt <= Date.now()) {
        onskill?.({ index, vector: lastVector })
      }
    })

    j.on('end', () => {
      joystickHeld = false
      if (autoFireInterval) {
        clearInterval(autoFireInterval)
        autoFireInterval = null
      }

      if (isShieldHold && held) {
        held = false
        onskill?.({ index, vector: lastVector, action: 'END' })
      } else if (isCastHold) {
        cancelCast()
      } else if (!isFiller) {
        if (skill?.selfCastFallback && lastDistance < 15) {
          onskill?.({ index, vector: { x: 0, y: 0 } })   // self-cast sentinel
        } else if (lastDistance > 8) {
          onskill?.({ index, vector: lastVector })
        }
      }
      lastDistance = 0
    })

    return () => {
      joystickHeld = false
      if (autoFireInterval) clearInterval(autoFireInterval)
      if (held) {
        held = false
        onskill?.({ index, vector: lastVector, action: 'END' })
      }
      cancelCast()
      j.destroy()
    }
  })

  // ── Pointer handlers for INSTANT / SUSTAINED ──────────────────────────────

  function onPointerDown(e) {
    const type = skill?.inputType
    if (type === 'DIRECTIONAL' || type === 'TARGETED' || type === 'AIMED') {
      if (skill?.selfCastFallback) selfCastTapStart = { x: e.clientX, y: e.clientY }
      return  // nipplejs owns dragging
    }
    e.preventDefault()
    navigator.vibrate?.(20)

    if (type === 'INSTANT') {
      flashFired()
      onskill?.({ index, vector: { x: 1, y: 0 } })
      if (skill?.autoRefire) {
        autoFireInterval = setInterval(() => {
          if (expiresAt <= Date.now()) {
            flashFired()
            onskill?.({ index, vector: { x: 1, y: 0 } })
          }
        }, 100)
      }
    } else if (type === 'SUSTAINED') {
      held = true
      onskill?.({ index, vector: { x: 1, y: 0 }, action: 'START' })
    }
  }

  function onPointerUp(e) {
    const type = skill?.inputType
    if (type === 'DIRECTIONAL' || type === 'TARGETED' || type === 'AIMED') {
      if (skill?.selfCastFallback && selfCastTapStart !== null) {
        const dx = e.clientX - selfCastTapStart.x
        const dy = e.clientY - selfCastTapStart.y
        // Cast-bar skills handle their own tap via the nipplejs end handler; don't double-fire
        if (Math.hypot(dx, dy) < 15 && !isCastHold) onskill?.({ index, vector: { x: 0, y: 0 } })
        selfCastTapStart = null
      }
      return
    }
    e.preventDefault()
    if (autoFireInterval) { clearInterval(autoFireInterval); autoFireInterval = null }
    if (type === 'SUSTAINED' && held) {
      held = false
      onskill?.({ index, vector: { x: 1, y: 0 }, action: 'END' })
    }
  }

  function onPointerCancel(e) {
    const type = skill?.inputType
    if (type === 'DIRECTIONAL' || type === 'TARGETED' || type === 'AIMED') {
      selfCastTapStart = null
      return
    }
    e.preventDefault()
    if (autoFireInterval) { clearInterval(autoFireInterval); autoFireInterval = null }
    if (type === 'SUSTAINED' && held) {
      held = false
      onskill?.({ index, vector: { x: 1, y: 0 }, action: 'END' })
    }
  }

  onDestroy(() => {
    if (firedTimer) { clearTimeout(firedTimer); firedTimer = null }
  })
</script>

<div
  class="skill-btn"
  class:held
  class:fired
  class:on-cd={expiresAt > Date.now()}
  bind:this={btnEl}
  onpointerdown={onPointerDown}
  onpointerup={onPointerUp}
  onpointercancel={onPointerCancel}
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

  /* INSTANT — brief green flash on fire */
  .skill-btn.fired {
    background: #1a3a2a;
    box-shadow: inset 0 0 12px rgba(0, 210, 100, 0.6);
  }

  .skill-icon { font-size: 32px; line-height: 1; }
  .skill-name { font-size: 11px; color: #7fa8c0; text-align: center; padding: 0 4px; }
</style>
