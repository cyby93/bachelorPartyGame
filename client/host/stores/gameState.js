import { writable } from 'svelte/store'

export const gameState = writable({
  players:            {},
  waitingPlayers:     [],
  stats:              null,
  boss:               null,
  objectives:         null,
  levelMeta:          null,
  npcs:               [],
  scene:              'lobby',
  serverScene:        'staging',  // raw server scene (staging, lobby, trainingGrounds, battle, ...)
  networkUrl:         '',         // controller URL for QR code display
  isLoading:          true,       // true while PixiJS assets are loading
  loadingProgress:    0,          // 0–1 during asset load
  cumulativeStats:    null,   // result / gameover — { damage, heal, deaths, resurrections, quiz, startTime }
  levelCompleteStats: null,   // levelComplete     — { damage, heal, resurrections, startTime }
  tutorial:           null,   // tutorial state from TUTORIAL_STATE event, or null when inactive
})
