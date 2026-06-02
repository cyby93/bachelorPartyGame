<script>
  import { onMount, onDestroy } from 'svelte'
  import nipplejs from 'nipplejs'

  const p = $props()

  let zoneEl        = null
  let joystick      = null
  let _lastVec      = { x: 0, y: 0 }
  let _lastMoveTime = 0
  let _watchdog     = null
  let _visHandler   = null
  let _blurHandler  = null

  function _createJoystick() {
    joystick?.destroy()
    joystick = nipplejs.create({
      zone:       zoneEl,
      mode:       'dynamic',
      color:      'rgba(255,255,255,0.35)',
      size:       100,
      multitouch: false,
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

  function _reset() {
    _lastVec = { x: 0, y: 0 }
    p.onmove?.({ x: 0, y: 0 })
    _createJoystick()
  }

  onMount(() => {
    _createJoystick()

    // iOS fires touchcancel when a touch is hijacked (scroll, alert, screen lock).
    // nipplejs may not fire 'end' in that case — reset and recreate.
    zoneEl.addEventListener('touchcancel', _reset)

    // App switch / notification banner: touchcancel may NOT fire on iOS when the
    // user presses the home button or a full-screen notification appears.
    // visibilitychange and blur are the only reliable signals for those cases.
    _visHandler  = () => { if (document.hidden) _reset() }
    _blurHandler = () => _reset()
    document.addEventListener('visibilitychange', _visHandler)
    window.addEventListener('blur', _blurHandler)

    // Watchdog: if input vector is non-zero but no move event for 3s, the
    // joystick is frozen — clear it and recreate.
    _watchdog = setInterval(() => {
      const nonZero = Math.abs(_lastVec.x) > 0.01 || Math.abs(_lastVec.y) > 0.01
      if (nonZero && Date.now() - _lastMoveTime > 8000) {
        _reset()
      }
    }, 250)
  })

  onDestroy(() => {
    clearInterval(_watchdog)
    document.removeEventListener('visibilitychange', _visHandler)
    window.removeEventListener('blur', _blurHandler)
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
