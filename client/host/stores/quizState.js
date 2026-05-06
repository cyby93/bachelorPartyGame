import { writable } from 'svelte/store'

export const quizState = writable({
  phase:    'waiting',   // 'waiting' | 'answering' | 'results' | 'upgrading' | 'done'
  question: null,        // { question, options }
  progress: null,        // { answered, total }
  results:  null,        // { correctIndex, correctCount, wrongCount }
  upgrades: [],          // [{ playerName, skillName }]
})
