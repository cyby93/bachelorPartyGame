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
Lobby -> Level 1 (Waves) -> Level 2 (Siege) -> Level 3 (Leviathan) -> Level 4 (Shade of Akama) -> Level 5 (Illidan Stormrage) -> Result / GameOver -> Lobby
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
| `warlocks` | warlock channeler spawn config (Level 4) |
| `initialEnemies` | pre-placed enemies at level start (Level 3) |
| `bossSpawnPosition` | custom boss spawn position override |
| `dialog` | Illidan entrance cinematic lines `[{ speaker, text, delayAfter }]` (Level 5 only) |
| `mirrors` | Fixed waypoint positions the beam system can route through. Optional on any level. Shape: `[{ id, position: { x, y } }]` |
| `beams` | Active beam definitions. Optional on any level. Shape: `[{ id, source: buildingId, target: buildingId, waypoints?: [mirrorId] }]` |

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

---

## Level 5 — Illidan Stormrage

Config lives in `shared/IllidanConfig.js` (not `BossConfig.js`). All Illidan-specific phase logic is in `GameServer._updateIllidan()` and related methods.

### Entrance Cinematic

When Level 5 starts, boss is set to immune and `DialogSystem` plays the `dialog` lines from `LevelConfig`. Boss immunity is released after the last line.

Socket events: `illidan:dialog_line { speaker, text }` → `BattleRenderer.onIllidanDialogLine()`

### Phase 1 (100% → 60% HP)

Illidan chases nearest player. Abilities (all Illidan-specific types handled by `_handleIllidanAbility`):

| Ability | Cooldown | Effect |
|---|---|---|
| Flame Crash | 12 s | Jump → AOE + persistent blue ground fire |
| Draw Soul | 10 s | 90° frontal cone; heals Illidan 500 per target hit |
| Shear | 8 s | Reduces closest player's effective max HP 60% for 5 s |
| Parasitic Shadowfiend | 18 s | Shadow DoT 30/2 s for 10 s; on expiry spawns 2 Shadowfiend mobs that spread infection |

### Phase 2 (triggered at 60% HP)

Illidan teleports to `phase2Position` (above top edge of arena, y ≈ -80), becomes immune. Two **Flame of Azzinoth** adds spawn at fixed positions. Phase 2 ends when **both adds die** → Phase 3 triggers (`_onIllidanPhase3`).

Flame of Azzinoth mechanics (handled via `_aiFlameOfAzzinoth` + enemy action handlers):
- **Blaze**: drops a persistent fire circle (radius 80, 30 s, 25 dmg/s) every 8 s
- **Burning Aura**: 10 dmg every 2 s to all players within 40 px

Illidan Phase 2 abilities (fired from outside map, no range gate):

| Ability | Cooldown | Effect |
|---|---|---|
| Fireball | 8 s | Random player + 80 px splash, 100 dmg |
| Dark Barrage | 12 s | DoT 20/s for 10 s on random player |
| Eye Beams | 22 s | 2 progressive fire lines drawn over 3.5 s; leave persistent ground fire |

Eye Beam state is broadcast via `delta.eyeBeams []` and rendered in `BattleRenderer._renderEyeBeams()`.

### Phase 3 (after both Flame of Azzinoth die)

Illidan teleports back to arena centre, becomes vulnerable, speed 2.0. Demon form.

| Ability | Cooldown | Effect |
|---|---|---|
| Agonizing Flames | 15 s | AOE on random player + 20 s DoT (30/5 s) that also hits nearby players |
| Shadow Blast | 5 s | 120 dmg splash on random player (80 px) |
| Summon Shadow Demons | 30 s | 4 Shadow Demons; each instantly kills the player they reach; retarget on death |
| Aura of Dread (passive) | — | 10 dmg every 3 s to all players within 120 px of Illidan |

### Key Contracts

- `ILLIDAN_CONFIG` in `shared/IllidanConfig.js` is the single source of truth for all numeric values
- `ILLIDAN_DIALOG_LINE` / `ILLIDAN_PHASE_TRANSITION` are the socket events — see `shared/protocol.js`
- Phase 2 → 3 is NOT HP-based; it fires when `_illidanState.flameOfAzzinothIds` empties
- `_tickIllidanEffects()` handles all Illidan DoTs independently from `SkillSystem._tickEffects()`

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
