<script>
  import { onMount, onDestroy } from 'svelte'
  import nipplejs from 'nipplejs'

  let { onmove } = $props()

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
        onmove?.({ x: data.vector.x, y: -data.vector.y })
      }
    })

    joystick.on('end', () => {
      onmove?.({ x: 0, y: 0 })
    })
  })

  onDestroy(() => {
    onmove?.({ x: 0, y: 0 })
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
    background:
      radial-gradient(circle at 35% 65%, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 26%),
      linear-gradient(180deg, rgba(255, 214, 143, 0.02) 0%, rgba(255, 214, 143, 0) 28%);
  }
</style>
