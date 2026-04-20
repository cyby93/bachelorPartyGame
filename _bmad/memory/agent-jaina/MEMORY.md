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

## Known Open Gaps

- Tasks 12 and 13 (socket event schema validation, cooldown/skill button rendering review) blocked on Thrall's `skill:fired` shape being frozen
- Saurfang's BotController extraction (Task 11) is now unblocked — no concurrent GameServer.js edits in flight
