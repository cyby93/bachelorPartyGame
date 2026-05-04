# Memory

_Curated long-term knowledge. Grows through sessions. Keep under 200 lines._

## Server→Client Contract

**StateSerializer** (`server/systems/StateSerializer.js`) is the canonical location for the server→client payload contract. Two public functions:
- `buildFullState(gs)` — INIT payload on join/reconnect. Includes all persistent state: players, enemies, minions, boss, aoeZones, waveInfo, stats, gates, buildings, npcs, arena layout.
- `buildDeltaState(gs)` — STATE_DELTA broadcast every tick. Includes all frame-changing state: players (delta DTO), projectiles, enemies, boss, tombstones, minions, stats, aoeZones, gates, buildings, npcs, waveInfo, eyeBeams, illidanFireballs.

Helper DTOs `gatesDTO`, `buildingsDTO`, `npcsDTO` are also exported — used in `_startLevel`'s `_changeScene` call.

When adding a new server field that clients need: add it to the appropriate builder in StateSerializer, not in GameServer.

## Session Token (disconnect/reconnect)

Implemented in `client/controller/App.svelte` (2026-04-19):
- Token generated at module scope via `localStorage.getItem('sessionToken') ?? crypto.randomUUID()`
- Sent in JOIN payload on first connect and on socket reconnect
- Server matches token to bot-controlled players and reclaims character on reconnect

## Host Sidebar — Svelte Architecture (completed 2026-05-04)

Host sidebar gameplay panel is now fully Svelte. Components under `client/host/components/`:
- `GameplaySidebar.svelte` — mounted into `#gameplay-panel`. Renders level info, objective, Shade of Akama card (conditional), raid roster, damage/healing meters. All data from `gameState` store.
- `LobbyPlayerList.svelte` — mounted into `#player-list`. Renders lobby player list. Data from `gameState` store.

Store at `client/host/stores/gameState.js` — writable with: players, stats, boss, objectives, levelMeta, npcs.

`main.js` pattern:
- `syncGameState()` — writes store after any state change (called from INIT, STATE_DELTA, SCENE_CHANGE, OBJECTIVE_UPDATE, PLAYER_JOINED, PLAYER_LEFT)
- `updateLobbyStartBtn()` — updates bot count display + startBtn.disabled (kept separate; store doesn't own button state)
- `currentObjectives` — tracked separately in main.js because OBJECTIVE_UPDATE overrides meta.objectives mid-scene

Adding a new sidebar card = new `.svelte` file + add fields to `gameState` store if server data needed. No main.js surgery.

Components use Svelte 4 legacy mode ($: reactive statements, $store auto-subscription). No runes.

## Known Open Gaps

- Tasks 12 and 13 (socket event schema validation, cooldown/skill button rendering review) blocked on Thrall's `skill:fired` shape being frozen
- Saurfang's BotController extraction (Task 11) is now unblocked — no concurrent GameServer.js edits in flight
