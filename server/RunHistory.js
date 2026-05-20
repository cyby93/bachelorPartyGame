const MAX_RUNS = 50

export default class RunHistory {
  constructor() {
    this._runs = []
  }

  recordLevel(levelIndex, levelName, outcome, stats, playerSnapshot) {
    const elapsed = stats.startTime ? Math.round((Date.now() - stats.startTime) / 1000) : 0
    const idToName = {}
    playerSnapshot.forEach(p => { idToName[p.id] = p.name })

    const rekey = (map) => {
      const out = {}
      for (const [id, val] of Object.entries(map ?? {})) {
        const key = idToName[id] ?? id
        out[key] = (out[key] ?? 0) + val
      }
      return out
    }

    const entry = {
      id:          Date.now(),
      levelIndex,
      levelName,
      completedAt: Date.now(),
      outcome,
      elapsed,
      stats: {
        damage:        rekey(stats.damage),
        heal:          rekey(stats.heal),
        deaths:        rekey(stats.deaths),
        resurrections: rekey(stats.resurrections),
        kills:         stats.kills ?? 0,
      },
      players: playerSnapshot.map(p => ({ name: p.name, className: p.className, isDowned: p.isDowned })),
    }

    this._runs.push(entry)
    if (this._runs.length > MAX_RUNS) this._runs.shift()
    return entry
  }

  getLast(n = 10) { return this._runs.slice(-n) }
  getAll()        { return [...this._runs] }
}
