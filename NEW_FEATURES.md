## Closing Cinematic — Illidan Defeated (Level 5)

A scripted post-boss sequence that plays after Illidan is killed. It replaces the
normal `_onLevelComplete()` flow for Level 5 with a multi-stage cinematic state machine.
The level is considered complete only after all players have been dancing for 10 seconds.

---

### Notation

- **`[NEW]`** — does not exist; must be built
- **`[EXISTS]`** — already in the codebase
- **`[MODIFY]`** — exists but needs targeted changes

---

## Sequence Overview

```
Illidan dies
    │
    ▼
[S10a] GATHER — Server drives players toward Illidan's position.
               Closing dialog / voice lines play during this window.
    │
    ▼
[S10b] ITEMS_VISIBLE — Ring and Cell Key appear on the ground near Illidan's body.
                       Players regain free movement. Illidan remains in downed animation.
    │
    ▼
[S10c] PICKUP_PHASE — Proximity-triggered pickups (server-authoritative).
                      Ring: only pickable by the player whose display name is 'Cyby'.
                      Key:  any other player can pick it up.
                      Both items must be picked up before moving on.
    │
    ▼
[S10d] KEY_USE — When the key holder moves within CELL_TRIGGER_RADIUS of the cell
                 position, the cell door disappears.
    │
    ▼
[S10e] BRIDE_WALK_OUT — Bride NPC walks from inside the cell to a fixed position
                        just in front of it.
    │
    ▼
[S10f] RING_MOMENT — When the ring holder moves within RING_TRIGGER_RADIUS of the
                     bride, the bride plays her ring animation. Both player and bride
                     then start dancing.
    │
    ▼
[S10g] ALL_DANCE — After 1–2 s delay all other players start dancing (south-facing,
                   class-specific animation).
    │
    ▼
[S10h] DANCE_COMPLETE — After 10 s of all players dancing → _onLevelComplete() fires.
```

---

## New System: ClosingCinematicSystem `[NEW]`

**File:** `server/systems/ClosingCinematicSystem.js`

**Purpose:** Owns all state for the post-Illidan cinematic. Instantiated by
`GameServer` when the Level 5 `killBoss` objective resolves, replacing the normal
`_onLevelComplete()` call.

### Constructor inputs

```js
new ClosingCinematicSystem({
  io,
  players,           // Map<id, ServerPlayer>
  boss,              // ServerBoss (Illidan, isDead = true but kept for position)
  arenaWidth,
  arenaHeight,
  config,            // ILLIDAN_CONFIG.closingCinematic
  onComplete,        // () => void — GameServer calls _onLevelComplete() here
})
```

### State machine stages (internal `_stage` field)

| Stage | Value | Transitions on |
|---|---|---|
| GATHER | `'gather'` | `CinematicMovementSystem` finishes AND dialog ends |
| ITEMS_VISIBLE | `'items_visible'` | Both items picked up |
| KEY_USE | `'key_use'` | Key holder within `cellTriggerRadius` of cell |
| BRIDE_WALK_OUT | `'bride_walk_out'` | Bride walk animation finishes |
| RING_MOMENT | `'ring_moment'` | Ring holder within `ringTriggerRadius` of bride |
| DANCING | `'dancing'` | `danceCompleteDurationMs` has elapsed |
| COMPLETE | `'complete'` | — (fires `onComplete`) |

### Key behaviors

- On instantiation: emits `ILLIDAN_CLOSING_CINEMATIC_START`, clears all enemies
  and projectiles (boss entity is kept with `isDead = true` for its position),
  then starts `CinematicMovementSystem` to guide players to `gatherPosition`.
- During GATHER: the closing dialog sequence is scheduled via `setTimeout` chains,
  identical to the existing `_executePhaseTransition` pattern.
- During ITEMS_VISIBLE: on each `tick(dt, now)`, checks `players` positions
  against pickup positions. Validates name constraint for the ring before granting.
- During KEY_USE / RING_MOMENT: tracks proximity of the relevant player each tick.
- `tick(dt, now)` must be called by `GameServer` every server tick, replacing
  the Illidan encounter tick once the cinematic starts.
- `_danceElapsed` accumulates only while stage is DANCING and all players
  are in the dancing state (`p.isDancing === true`).

### New state on ServerPlayer (or equivalent)

```js
p.isDancing = false   // set to true by ClosingCinematicSystem
p.heldItem  = null    // 'ring' | 'key' | null — set on pickup
```

---

## Config additions to IllidanConfig.js `[MODIFY]`

Add `closingCinematic` to `ILLIDAN_CONFIG`:

```js
closingCinematic: {
  // Player name who is the only one allowed to pick up the ring.
  ringHolderName: 'Cyby',

  // Where players gather around Illidan's body (absolute arena coords).
  // Center of Illidan's death position — use boss.x / boss.y at death time.
  gatherRadius: 120,          // radius around boss position to cluster players
  gatherDurationMs: 8000,     // how long the gather / dialog window is

  // Closing dialog played during the gather phase. Same format as phaseDialog.
  closingDialog: [
    // TODO: fill in actual lines / voice keys
    { speaker: 'akama',   text: '[PLACEHOLDER]', voiceKey: 'voice_akama_illidan_dies_01', delayAfter: 4000 },
    { speaker: 'illidan', text: '[PLACEHOLDER]', voiceKey: 'voice_illidan_dying_01',      delayAfter: 4000 },
  ],

  // Offsets from Illidan's death position where items land.
  itemDropOffsets: {
    ring: { x: -40, y:  10 },
    key:  { x:  40, y: -10 },
  },

  // Radius within which a player triggers a pickup.
  pickupRadius: 50,

  // Cell — spawns at a fixed position after Illidan dies.
  // Should be placed on the right side of the Level 5 arena (1440 x 900).
  cellPosition:    { x: 1300, y: 450 },
  cellSize:        { width: 120, height: 160 },

  // Where the bride walks to after the cell opens.
  brideExitPosition: { x: 1160, y: 450 },
  brideWalkDurationMs: 3000,

  // How close the key holder must be to cell to trigger door opening.
  cellTriggerRadius: 80,

  // How close the ring holder must be to bride to trigger the ring moment.
  ringTriggerRadius: 60,

  // How long the ring moment animation plays before dance starts.
  ringMomentDurationMs: 3000,

  // Delay between ring-holder + bride starting to dance and everyone else joining.
  allDanceTriggerDelayMs: 1500,

  // How long all players must be dancing for level complete to fire.
  danceCompleteDurationMs: 10000,
},
```

---

## New Protocol Events `[NEW]`

Add to `shared/protocol.js`:

```js
ILLIDAN_CLOSING_CINEMATIC_START: 'illidan:closingCinematicStart',
// payload: { bossX, bossY, gatherRadius }

CLOSING_ITEMS_SPAWNED: 'closing:itemsSpawned',
// payload: { items: [{ id, type: 'ring'|'key', x, y }] }

CLOSING_ITEM_PICKUP: 'closing:itemPickup',
// payload: { itemId, playerId, itemType: 'ring'|'key' }

CLOSING_CELL_SPAWN: 'closing:cellSpawn',
// payload: { x, y, width, height }

CLOSING_CELL_OPEN: 'closing:cellOpen',
// payload: { keyHolderId }

CLOSING_BRIDE_WALK_OUT: 'closing:brideWalkOut',
// payload: { startX, startY, targetX, targetY, durationMs }

CLOSING_RING_MOMENT: 'closing:ringMoment',
// payload: { ringHolderId, brideX, brideY }

CLOSING_DANCE_START: 'closing:danceStart',
// payload: { playerIds: [id, ...] }  — ring holder + bride first, then all others

CLOSING_ALL_DANCE: 'closing:allDance',
// payload: {}  — all players now dancing
```

---

## GameServer integration `[MODIFY]`

**File:** `server/GameServer.js`

- In `_updateObjectives()`, when Level 5's `killBoss` objective resolves, do NOT
  call `_onLevelComplete()`. Instead call `_startClosingCinematic()`.
- `_startClosingCinematic()` creates a `ClosingCinematicSystem` and stores it as
  `this._closingCinematic`. Sets `this._levelCompletePending = true` to prevent
  re-entry.
- In the main game tick, when `this._closingCinematic` is set, call
  `this._closingCinematic.tick(dt, now)` instead of the normal `IllidanEncounter`
  tick and `_updateObjectives`.
- `ClosingCinematicSystem.onComplete` callback calls `this._onLevelComplete()`.
- Guard: if Level 5 is not active, `_startClosingCinematic()` is a no-op.

### Detecting Level 5

```js
// Suggested check inside _updateObjectives or a helper:
const isLevel5 = this.currentLevel?.id === 'illidan' // or currentLevelIndex === 4
```

---

## New Entities `[NEW]`

### ServerPickup (inline in ClosingCinematicSystem or a thin class)

```js
{
  id,              // integer
  type,            // 'ring' | 'key'
  x, y,            // world position
  isPickedUp,      // boolean
  holderId,        // null | playerId
}
```

No combat logic, no movement — proximity check only.

### ServerBrideNPC (inline in ClosingCinematicSystem or a thin class)

```js
{
  x, y,            // world position (interpolated during walk)
  targetX, targetY,
  walkStartMs,
  walkDurationMs,
  state,           // 'idle' | 'walking' | 'ring_moment' | 'dancing'
}
```

Included in the server state delta during the cinematic so the client can render it.

---

## Sprites Required `[NEW]`

All sprites follow the canvas-size rule in `docs/SPRITES.md` (canvas = R×2 × R×2).
Generate via `node.exe scripts/generate-sprites.cjs` (WSL2 note: use Windows Node).

| Sprite | Key | Radius | Canvas | Notes |
|---|---|---|---|---|
| Cell key pickup | `pickup_key` | 15 | 30×30 | Small key icon on ground |
| Ring pickup | `pickup_ring` | 12 | 24×24 | Small ring icon on ground |
| Cell structure | `cell_structure` | — | Match `cellSize` | Static image, not a character |
| Cell door open VFX | optional | — | — | Can be a flash / fade |
| Bride NPC | `bride` | 20 | 40×40 | Needs south-direction frames only |

### Bride NPC animation states (south direction only)

| Animation | Frames needed | Trigger |
|---|---|---|
| idle | 2–4 frames | Inside cell (not rendered) / standing at exit |
| walk | 4–6 frames | Walking from cell to exit position |
| ring_moment | 3–5 frames | Ring raised to head |
| dance | 4–8 frames, looping | After ring moment |

### Player dance animation (per class, south direction only)

Each existing character class sprite sheet needs a new animation row:

| Animation | Direction | Frames | Notes |
|---|---|---|---|
| dance | south | 4–8 looping | Faces south regardless of prior facing |

Classes to cover: Warrior, Mage, Priest, Rogue, Hunter, Druid, Paladin, Shaman
(full list in `shared/ClassConfig.js`).

---

## Host-side rendering `[NEW]`

**File:** `client/host/scenes/IllidanSceneRenderer.js` (or the existing Level 5 renderer)

Listen for the new protocol events and update visual state:

- `ILLIDAN_CLOSING_CINEMATIC_START` — stop Illidan battle music, start cinematic
  ambient; show Illidan in downed animation (existing `isDead` sprite state, or
  add a `downed` animation if the sprite distinguishes it).
- `CLOSING_ITEMS_SPAWNED` — render pickup sprites at given positions; show a
  subtle pulse/glow to indicate they are interactable.
- `CLOSING_ITEM_PICKUP` — remove pickup sprite; show a small item icon above the
  holder's head (or attached to their sprite).
- `CLOSING_CELL_SPAWN` — render cell structure at given position.
- `CLOSING_CELL_OPEN` — play door-open VFX on cell; remove door layer.
- `CLOSING_BRIDE_WALK_OUT` — spawn bride sprite; interpolate to exit position over
  `durationMs`.
- `CLOSING_RING_MOMENT` — play bride ring animation; lock ring holder and bride
  into south-facing dance.
- `CLOSING_DANCE_START` / `CLOSING_ALL_DANCE` — switch listed player sprites to
  south-facing dance animation loop; force `facingAngle = Math.PI/2` (south).

### State delta additions

During the cinematic, the server state snapshot/delta should include:

```js
closingCinematic: {
  stage,              // string — current stage name
  pickups: [...],     // [ { id, type, x, y, isPickedUp } ]
  bride: {            // null until stage >= BRIDE_WALK_OUT
    x, y, state,
  },
  dancingPlayerIds,   // Set/Array of player IDs currently dancing
  danceElapsedMs,     // how far along the 10-second dance timer is
}
```

This can be emitted as a custom field inside the existing `STATE_SNAPSHOT` /
`STATE_DELTA` payload or as a separate `CLOSING_CINEMATIC_STATE` event alongside it.

---

## File Change Matrix

| File | Change |
|---|---|
| `shared/IllidanConfig.js` | Add `closingCinematic` block |
| `shared/protocol.js` | Add 9 new event constants |
| `server/GameServer.js` | Intercept Level 5 `killBoss` resolve; tick `ClosingCinematicSystem` |
| `server/systems/ClosingCinematicSystem.js` | **New file** — full state machine |
| `client/host/scenes/IllidanSceneRenderer.js` | Listen for new events; render cell, bride, pickups, dance states |
| `scripts/generate-sprites.cjs` | Add pickup_key, pickup_ring, cell_structure, bride, and dance frames per class |
| `public/assets/sprites/` | Generated outputs |
| `docs/RENDERERS.md` | Document new closing cinematic renderer hooks |
| `LEVEL_DESIGN_OVERVIEW.md` | Replace Level 5 placeholder with closing cinematic design |

---

## Implementation Dependency Graph

```
Phase A — No dependencies (can start immediately):
  Sprite generation (pickup_key, pickup_ring, bride, cell_structure)
  Dance animation frames for all classes
  Protocol event constants

Phase B — Depends on Phase A:
  ClosingCinematicSystem (server logic)
  GameServer integration (intercept killBoss → _startClosingCinematic)

Phase C — Depends on Phase A + B:
  Host renderer updates (uses new protocol events + new sprites)
  State delta additions (ClosingCinematicSystem exposes DTO)

Phase D — Final:
  End-to-end test: Illidan dies → full 10-dance sequence → levelComplete fires
```

---

## Open Questions / Implementation Notes

- **Player name lookup:** The server must match `ringHolderName: 'Cyby'` against
  the player's display name. Verify which field on `ServerPlayer` stores the display
  name (likely `p.name` or `p.username`) and confirm case-sensitivity intent.
- **Single player edge case:** If only one player is in the game, they cannot pick
  up the ring (reserved for 'Cyby') AND the key. Decide: Does the game skip the
  pickup phase in solo, or require 'Cyby' to be the only player to allow solo
  completion? Current spec assumes at least 2 players.
- **Illidan downed animation:** Current `BossSprite.js` plays a death animation when
  `isDead = true`. If a distinct "lying on ground" loop is needed (vs. a one-shot
  death animation), a `downed` animation state must be added to `BossSprite`.
- **Closing dialog content:** Voice key filenames in `closingDialog` are placeholders.
  Fill in with real asset names once audio is recorded/imported.
- **Cell structure sprite:** The cell is not a character — it is a static image
  larger than a typical entity sprite. It may be rendered as a `PIXI.Sprite` with
  a custom anchor, not through the normal entity pipeline. Coordinate with the
  renderer implementer on how to load and position it.
