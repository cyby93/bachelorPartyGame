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

Store at `client/host/stores/gameState.js` — writable with: players, stats, boss, objectives, levelMeta, npcs, scene, cumulativeStats, levelCompleteStats.
Store at `client/host/stores/quizState.js` — writable with: phase, question, progress, results, upgrades.

`main.js` pattern:
- `syncGameState()` — writes store after any state change (INIT, STATE_DELTA, SCENE_CHANGE, etc.)
- `updateLobbyStartBtn()` — updates bot count display + startBtn.disabled (kept separate; store doesn't own button state)
- `currentObjectives` / `currentScene` — tracked separately in main.js
- Quiz socket events write directly to `quizState` store (not via renderer methods)

**Scene → render layer rule (2026-05-06):**
- `lobby`, `battle`, `bossFight` — PixiJS canvas (live sprites)
- `levelComplete`, `quiz`, `result`, `gameover` — DOM/Svelte overlay (`SceneOverlay.svelte` in `#scene-overlay`)
- Stub renderers exist for the 3 DOM scenes so HostGame.switchScene works without changes

Adding a new sidebar card = new `.svelte` file + add fields to `gameState` store if server data needed. No main.js surgery.
Adding a new overlay screen = new component + mount in `SceneOverlay.svelte` + add scene key to the active-scenes list.

Components use Svelte 4 legacy mode ($: reactive statements, $store auto-subscription). No runes.

## Ability Asset Rule (2026-05-04)

For player-facing spell visuals, use PixelLab object-style sprites for things that read as world objects:
- projectiles
- traps
- totems
- pickups
- small spawned props / missile cores

Do not default to object sprites for energy-shape effects. These are better as host-side VFX code:
- lightning beams / arcs
- explosions
- novas / shockwaves
- ground circles / aura fields
- burst flashes / impact energy

Practical rule: if it is a thing flying or sitting in the world, object sprite first. If it is energy spreading, bursting, pulsing, or drawing a line through space, procedural VFX first.

Current PixelLab research notes:
- repo `public/assets/sprites/projectile_fireball.png` is byte-identical to PixelLab object `pyroblast` (`8d3a0ce0-06d5-4115-a98a-177734b4e0bc`)
- newer gallery-like fireball object is `b06f51e7-876f-447d-99fc-c673971acb5a`
- recommended split: normal Fireball should use the lighter `fireball` object; Pyroblast can keep the heavier `pyroblast` object; Shadow Bolt fits a 1-direction object sprite; Lightning Bolt should stay line/beam/procedural-first rather than object-first

Repo fit: keep the current sprite + trail + impact architecture for most projectile skills. Reserve animated object support, if ever added, for premium/heavy spells like Pyroblast rather than making it the default for every ability.

## Known Open Gaps

- Tasks 12 and 13 (socket event schema validation, cooldown/skill button rendering review) blocked on Thrall's `skill:fired` shape being frozen
- Saurfang's BotController extraction (Task 11) is now unblocked — no concurrent GameServer.js edits in flight
