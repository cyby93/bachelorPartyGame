<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  import nipplejs from 'nipplejs'

  const dispatch = createEventDispatcher()

  let zoneEl   = null
  let joystick = null

  onMount(() => {
    joystick = nipplejs.create({
      zone:  zoneEl,
      mode:  'dynamic',
      color: 'rgba(255,255,255,0.35)',
      size:  100,
    })

    joystick.on('move', (_, data) => {
      if (data.vector) {
        dispatch('move', { x: data.vector.x, y: -data.vector.y })
      }
    })

    joystick.on('end', () => {
      dispatch('move', { x: 0, y: 0 })
    })
  })

  onDestroy(() => { joystick?.destroy() })
</script>

<div class="move-zone" bind:this={zoneEl}></div>

<style>
  .move-zone {
    width: 100%;
    height: 100%;
    position: relative;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }
</style>
