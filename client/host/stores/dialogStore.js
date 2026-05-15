import { writable } from 'svelte/store'

/** Active dialog line from the server, or null when none is playing. */
export const dialogLine = writable(null)
