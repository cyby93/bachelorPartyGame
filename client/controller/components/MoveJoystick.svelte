<script>
  import { onMount, onDestroy } from 'svelte'
  import nipplejs from 'nipplejs'

  const p = $props()

  let zoneEl        = null
  let joystick      = null
  let _lastVec      = { x: 0, y: 0 }
  let _lastMoveTime = 0
  let _watchdog     = null

  function _createJoystick() {
    joystick?.destroy()
    joystick = nipplejs.create({
      zone:  zoneEl,
      mode:  'dynamic',
      color: 'rgba(255,255,255,0.35)',
      size:  100,
    })

    joystick.on('move', (_, data) => {
      if (data.vector) {
        const vec = { x: data.vector.x, y: -data.vector.y }
        _lastVec      = vec
        _lastMoveTime = Date.now()
        p.onmove?.(vec)
      }
    })

    joystick.on('end', () => {
      _lastVec = { x: 0, y: 0 }
      p.onmove?.({ x: 0, y: 0 })
    })
  }

  onMount(() => {
    _createJoystick()

    // iOS fires touchcancel when a touch is hijacked (scroll, alert, screen lock).
    // nipplejs may not fire 'end' in that case — reset and recreate.
    zoneEl.addEventListener('touchcancel', () => {
      _lastVec = { x: 0, y: 0 }
      p.onmove?.({ x: 0, y: 0 })
      _createJoystick()
    })

    // Watchdog: if input vector is non-zero but no move event for 500ms, the
    // joystick is frozen — clear it and recreate.
    _watchdog = setInterval(() => {
      const nonZero = Math.abs(_lastVec.x) > 0.01 || Math.abs(_lastVec.y) > 0.01
      if (nonZero && Date.now() - _lastMoveTime > 10000) {
        _lastVec = { x: 0, y: 0 }
        p.onmove?.({ x: 0, y: 0 })
        _createJoystick()
      }
    }, 250)
  })

  onDestroy(() => {
    clearInterval(_watchdog)
    p.onmove?.({ x: 0, y: 0 })
    joystick?.destroy()
  })
</script>

<div class="move-zone" bind:this={zoneEl}></div>

<style>
  .move-zone {
    width: 100%;
    height: 100%;
    position: relative;
    border-radius: inherit;
    touch-action: none;
    background:
      radial-gradient(circle at 35% 65%, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 26%),
      linear-gradient(180deg, rgba(255, 214, 143, 0.02) 0%, rgba(255, 214, 143, 0) 28%);
  }
</style>
