# CAMPAIGN.md — Level Flow And Objective Contracts

This file documents campaign progression, objective schema, and scene-flow expectations across server, host, and controller.

Shared repo-level assistant guidance lives in `AGENTS.md`.

---

## Core Rule

The server owns campaign progression:

- current level
- scene transitions
- objective progress
- win and loss conditions
- boss and spawn setup

Host and controller render or react to server progression. They do not decide it.

---

## Current Flow

```text
Lobby -> Level 1 (Waves) -> Level 2 (Siege) -> Level 3 (Gates) -> Level 4 (Leviathan) -> Level 5 (Shade of Akama) -> Level 6 (Illidan) -> Result / GameOver -> Lobby
```

Current implementation details:

- campaign data is defined in `shared/LevelConfig.js`
- progression is coordinated in `server/GameServer.js`
- host scene changes are driven by `scene:change`
- controller screens are also driven by `scene:change`

---

## Level Schema

Current campaign entries look like:

```js
{
  id,
  name,
  arena,          // { width, height, rooms?, passages? }
  objectives,
  spawning,       // { mode, interval, ... } or null
  difficulty,
  boss,           // boss config key or null
  gates?,         // array of gate definitions (Level 2)
  npcs?,          // array of NPC definitions (Level 4)
  warlocks?,      // warlock spawn config (Level 4)
  initialEnemies?, // pre-placed enemies (Level 3)
  bossSpawnPosition?, // override boss spawn { x, y }
}
```

### Fields

| Field | Meaning |
|------|---------|
| `id` | stable level identifier |
| `name` | display name |
| `arena` | arena dimensions, optional rooms and passages |
| `objectives` | ordered or grouped objective definitions |
| `spawning` | enemy spawn config (`mode: 'continuous'` or `'wave'`), or `null` |
| `difficulty` | player-count scaling configuration |
| `boss` | boss config key or `null` |
| `gates` | destructible gate definitions (Level 3) |
| `buildings` | destructible spawner buildings (Level 2) |
| `buildingSpawning` | building spawn config: interval, buff, enemy types (Level 2) |
| `npcs` | friendly NPC definitions (Level 5) |
| `warlocks` | warlock channeler spawn config (Level 5) |
| `initialEnemies` | pre-placed enemies at level start (Level 4) |
| `bossSpawnPosition` | custom boss spawn position override |

---

## Objective Schema

Current objective types documented in `shared/LevelConfig.js`:

| Type | Shape | Meaning |
|------|-------|---------|
| `killCount` | `{ type: 'killCount', target }` | kill any `target` enemies |
| `killCount` with filter | `{ type: 'killCount', target, enemyTypes }` | kill `target` enemies of listed types |
| `survive` | `{ type: 'survive', durationMs }` | survive for duration |
| `killBoss` | `{ type: 'killBoss' }` | defeat the level boss |
| `surviveWaves` | `{ type: 'surviveWaves' }` | clear all discrete waves |
| `destroyGates` | `{ type: 'destroyGates' }` | destroy all gates in sequence |
| `destroyBuildings` | `{ type: 'destroyBuildings' }` | destroy all spawner buildings |
| `killAll` | `{ type: 'killAll' }` | kill all enemies including splits |
| `killBossProtectNPC` | `{ type: 'killBossProtectNPC', npcId, bossId }` | kill boss before NPC dies |

Rules:

- any new objective type must be supported in server progression logic before it appears in config
- host objective UI must understand any new objective type
- if controller should display objective-specific UX, update it too

---

## Scene Responsibilities

### `lobby`

Server:

- accepts joins
- keeps players out of campaign flow
- may allow practice and dummy interactions

Host:

- lobby renderer

Controller:

- pre-run state and lobby UX
- may show a local class-briefing step before unlocking controls, but this remains a controller-only presentation choice inside the server-driven `lobby` scene

### `battle`

Server:

- spawns and simulates non-boss combat level
- updates objective progress

Host:

- combat renderer for normal level

Controller:

- active gameplay controls

### `bossFight`

Server:

- sets up boss and boss objective

Host:

- battle renderer in boss mode

Controller:

- active gameplay controls

### `levelComplete`

Server:

- freezes progression waiting for host advance

Host:

- level complete screen

Controller:

- waiting-for-host state

### `result` and `gameover`

Server:

- terminal campaign state until restart

Host:

- result or gameover screen

Controller:

- end-state messaging

---

## Difficulty Scaling

Current rule from `shared/LevelConfig.js`:

```text
multiplier = base + perPlayer * (playerCount - 1)
```

Typical uses:

- enemy HP
- enemy damage
- spawn pacing and frequency

Rules:

- scaling belongs to server setup logic
- shared config defines the parameters
- clients should only display the outcome, not recalculate progression rules independently

---

## Files To Review For Campaign Changes

Always inspect:

- `shared/LevelConfig.js`
- `server/GameServer.js`

Inspect when relevant:

- `server/systems/SpawnSystem.js`
- host renderers that display objectives or progression state
- controller scene and screen handling

---

## Change Checklist

When editing campaign flow, levels, objectives, or progression:

1. update `shared/LevelConfig.js` if schema or config changed
2. update `server/GameServer.js`
3. update `server/systems/SpawnSystem.js` if spawning behavior changed
4. update host scene and UI consumers
5. update controller scene handling if applicable
6. update this doc
7. run `npm run build`
8. manually verify scene flow and objective progression
