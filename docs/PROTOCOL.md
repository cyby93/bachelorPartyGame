# PROTOCOL.md — Socket Events And State Contracts

All runtime parts must stay aligned with this file:

- server: authoritative producer of gameplay state
- host: renderer of shared state
- controller: input sender and local UI

Shared repo-level assistant guidance lives in `AGENTS.md`.

---

## Rules

- Do not hardcode event names outside `shared/protocol.js`.
- When changing a payload shape, update:
  - `shared/protocol.js`
  - all emitters
  - all consumers
  - this file
- The server owns gameplay truth. Clients may derive presentation state, but must not redefine gameplay meaning.

---

## Scene Names

Current server-driven scenes:

| Scene | Produced By | Consumed By | Meaning |
|------|-------------|-------------|---------|
| `lobby` | server | host, controller | Pre-run waiting and practice state |
| `battle` | server | host, controller | Non-boss combat level |
| `bossFight` | server | host, controller | Boss combat level |
| `levelComplete` | server | host, controller | Between-level progression gate |
| `result` | server | host, controller | Campaign victory |
| `gameover` | server | host, controller | Campaign defeat |

Any new scene name must be added in all scene consumers before use.

---

## Client To Server Events

### `game:join`

Source of truth: `EVENTS.JOIN`

Payload:

```js
{ name, className, isHost }
```

Producer:

- `client/controller/App.svelte`
- `client/host/main.js`

Consumer:

- `server/GameServer.js` `_onJoin`

Notes:

- `className` must resolve through shared class config.
- `isHost` determines host-only command permissions.

### `input:move`

Payload:

```js
{ x, y }
```

Producer:

- `client/controller/App.svelte`

Consumer:

- `server/GameServer.js` `_onInputMove`

Notes:

- vector is intent only
- server applies movement rules and constraints

### `input:skill`

Payload:

```js
{ index, vector, action }
```

Producer:

- `client/controller/App.svelte`

Consumer:

- `server/GameServer.js` `_onInputSkill`

Notes:

- `index` is skill slot
- `vector` is aim/input vector
- `action` is used for cast, hold, and sustained semantics where needed

### `input:aim`

Payload:

```js
{ vector }
```

Producer:

- `client/controller/App.svelte`

Consumer:

- `server/GameServer.js` input aim handler

Notes:

- updates aim state only and sets preferred facing while aim is active
- does not itself execute gameplay

### Host Commands

- `host:start`
- `host:restart`
- `host:advance`
- `host:setLevel`
- `host:botAdd`
- `host:botRemove`
- `host:debugSetSkillTier`
- `host:debugSpawnEnemy`
- `host:debugClearEnemies`

Producer:

- `client/host/main.js`

Consumer:

- `server/GameServer.js`

Notes:

- host-only permissions are enforced on the server
- sandbox enemy commands are accepted only while the debug sandbox level is active

---

## Server To Client Events

### `game:init`

Purpose:

- full state snapshot on join

Primary consumers:

- `client/host/main.js`
- `client/host/HostGame.js`

Contract notes:

- the host uses `scene`, `players`, and level metadata from this payload to initialize UI and render state
- level metadata includes `levelId`, `levelIndex`, `levelNumber`, `totalLevels`, `levelName`, `debugSandbox`, `rooms`, `passages`, and `mirrors`

### `state:delta`

Purpose:

- incremental state update at server tick cadence

Primary consumers:

- `client/host/main.js`
- `client/host/HostGame.js`
- `client/controller/App.svelte`

Known fields currently used by the host:

```js
{
  players,
  boss,
  killCount,
  enemies,
  projectiles,
  tombstones,
  stats,
  aoeZones,
  minions,
  gates,
  buildings,
  npcs,
  waveInfo,
  eyeBeams,
  illidanFireballs
}
```

Contract notes:

- adding or renaming fields here requires updating host merge logic
- player DTO shape must remain compatible with interpolation assumptions in `client/host/HostGame.js`

### `player:joined`

Payload:

```js
playerDto
```

Primary consumers:

- `client/host/main.js`
- `client/host/HostGame.js`

### `player:left`

Payload:

```js
socketId
```

Primary consumers:

- `client/host/main.js`
- `client/host/HostGame.js`

### `scene:change`

Payload:

```js
{
  scene,
  levelId,
  levelIndex,
  levelNumber,
  totalLevels,
  levelName,
  objectives,
  debugSandbox,
  mirrors
}
```

Consumers:

- `client/host/main.js`
- `client/host/HostGame.js`
- `client/controller/App.svelte`

Contract notes:

- scene names must match the Scene Names table above
- controller maps `lobby` to a local two-step flow: briefing screen first, then active controls after player acknowledgment
- `battle` and `bossFight` map to active gameplay immediately
- `levelId` is the stable content identifier for level-specific routing such as music selection

### `level:complete`

Payload:

```js
{ levelIndex, levelName, stats }
```

### `objective:update`

Payload:

```js
{ objectives }
```

Primary consumers:

- `client/host/main.js`
- active host renderer

### `skill:cooldown`

Payload:

```js
{ playerId, skillIndex, durationMs }
```

Primary consumers:

- `client/controller/App.svelte`

Contract notes:

- the server emits duration, not an absolute timestamp
- the controller reconstructs a local `expiresAt` timestamp for UI rendering
- comments in `shared/protocol.js` must stay aligned with this payload shape

### `skill:fired`

Payload:

```js
{ playerId, skillName, type, subtype, x, y, angle, radius, range, color }
```

Primary consumers:

- `client/host/main.js`
- active host renderer
- `client/host/systems/VFXManager.js`

### `effect:damage`

Payload:

```js
{ targetId, amount, type, sourceSkill }
```

Primary consumers:

- host floating text and hit feedback

### `boss:dialog_line`

Payload:

```js
{ speaker, text, voiceKey, durationMs }
```

Primary consumers:

- `client/host/main.js`
- host battle renderer dialog overlay
- host audio manager voice routing

Contract notes:

- this event is generic boss dialog, not Illidan-specific
- `voiceKey` is optional but should be authored for boss-dialog levels so voice assets can be dropped in without code edits
- subtitle text remains the authoritative visible line

### `channel:interrupted`

Payload:

```js
{ playerId }
```

### `targeted:hit`

Payload:

```js
{ casterX, casterY, targetX, targetY, effectType, color }
```

### `player:comboPoints`

Payload:

```js
{ playerId, points }
```

Primary consumers:

- `client/controller/App.svelte`

---

## State Shape Notes

### Players

Current host assumptions include fields such as:

```js
{
  id, hp, maxHp, x, y, angle, aimAngle, isDead, isHost, className, effects, beamTargetId
}
```

- `angle` is the resolved model-facing direction
- `aimAngle` is the current ability-aim direction used by helper visuals

Rules:

- server owns all gameplay fields
- host may add private interpolation fields such as `_prevX`, `_prevY`, `_recvAt`
- private client-only fields must never be treated as shared contract

### Boss, Enemies, Projectiles, Minions, Zones

Each state collection must keep a stable enough shape for current renderers to consume.

If changing shape, review:

- `client/host/HostGame.js`
- relevant renderers and systems under `client/host/`

---

## Change Checklist

When editing protocol or state contracts:

1. update `shared/protocol.js`
2. update all emitters
3. update all consumers
4. update this doc
5. run `npm run build`
6. manually verify the affected flow
