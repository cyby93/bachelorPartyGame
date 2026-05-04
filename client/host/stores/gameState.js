import { writable } from 'svelte/store'

export const gameState = writable({
  players: {},
  stats: null,
  boss: null,
  objectives: null,
  levelMeta: null,
  npcs: [],
})
