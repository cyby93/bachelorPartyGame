import { writable } from 'svelte/store'

export const gameState = writable({
  players:            {},
  stats:              null,
  boss:               null,
  objectives:         null,
  levelMeta:          null,
  npcs:               [],
  scene:              'lobby',
  cumulativeStats:    null,   // result / gameover — { damage, heal, deaths, resurrections, quiz, startTime }
  levelCompleteStats: null,   // levelComplete     — { damage, heal, resurrections, startTime }
})
