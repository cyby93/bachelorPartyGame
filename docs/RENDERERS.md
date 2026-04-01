# RENDERERS.md — Host Canvas Renderer System Reference

All host-side canvas rendering lives in `client/host/scenes/`. The system uses PixiJS v8.
Shared repo-level assistant guidance lives in `AGENTS.md`.

---

## BaseRenderer (Template Method Pattern)

File: `client/host/scenes/BaseRenderer.js`

All scene renderers extend `BaseRenderer`. The base provides the full lifecycle and calls **protected hooks** that subclasses override. No hook requires calling `super`.

### Lifecycle (called by HostGame)

```
enter()    → mounts containers to layers, creates VFXManager, calls _buildUI()
exit()     → _onBeforeExit() → destroy sprites → destroy VFX → unmount → _uiRoot.removeChildren() → _resetUIRefs()
update(dt) → _syncPlayers() → _syncEnemies() → _syncProjectiles() → _syncExtras() → _renderBeams() → _updateVFX() → _updateUI()
```

### Containers Created by Base

| Field | Layer | Purpose |
|---|---|---|
| `_entityRoot` | `layers.entities` | Players + enemies (sub-containers go inside) |
| `_projectileContainer` | `layers.fx` | All projectile sprites |
| `_uiRoot` | `layers.ui` | UI elements (kill counter, HP bar, text) |
| `_beamGfx` (Graphics) | `layers.fx` | Channel beams + flash beams, cleared every frame |

### Shared State on All Renderers

- `playerSprites` — Map(id → PlayerSprite)
- `enemySprites` — Map(id → EnemySprite)
- `projSprites` — Map(id → ProjectileSprite)
- `vfx` — VFXManager instance (null before enter(), null after exit())
- `minionGfx` — Map(id → Container) — minion shapes, synced every frame via `_syncMinions()`
- `_flashBeams` — array of `{ x1, y1, x2, y2, color, expiresAt }` for 300ms flash beams
- `_beamTime` — running animation time for channel beam dot flow

---

## Hook Reference

Override any of these in a subclass. No `super` call needed unless stated.

| Hook | Signature | When called | Used by |
|---|---|---|---|
| `_buildUI()` | `()` | end of `enter()` | **Required** — throws in base |
| `_onBeforeExit()` | `()` | start of `exit()` | BattleRenderer: destroys boss/minion/tombstone sprites |
| `_resetUIRefs()` | `()` | end of `exit()` | Both: nulls UI ref fields |
| `_onPlayerSync` | `(p, sprite, pos, dt)` | each active player, each frame | BattleRenderer: hit sparks, death bursts, aura sync |
| `_onPlayerRemoved` | `(id)` | player sprite destroyed (sync or event) | BattleRenderer: `vfx.auras.removeEntity(id)` |
| `_onEnemyCreated` | `(enemy, sprite)` | new EnemySprite added | LobbyRenderer: gold tint for training dummies |
| `_onEnemyRemoved` | `(sprite, id)` | EnemySprite about to be destroyed | BattleRenderer: death burst VFX at last position |
| `_syncExtras` | `(dt)` | after `_syncProjectiles`, before `_renderBeams` | Base syncs minions; BattleRenderer calls `super._syncExtras(dt)` then adds boss + tombstones |
| `_updateUI` | `(dt, activePlayerIds)` | end of `update()` | Both: scene-specific UI updates (kill counter, boss HP, player count) |
| `_resolveBeamTarget` | `(targetId) → {x,y}\|null` | inside `_renderBeams` for each player | BattleRenderer: adds boss target check |
| `_resolveTargetPosition` | `(targetId) → {x,y}\|null` | inside `onEffectDamage` | BattleRenderer: adds boss target check |
| `get _enemyContainer` | getter → Container | inside `_syncEnemies` | BattleRenderer: returns `this.enemyContainer` sub-container |

---

## PixiJS Layer Stack

Layers are owned by `HostGame` and shared across renderers. Back to front:

```
layers.bg        — tiled dungeon background (static, managed by HostGame)
layers.groundFx  — persistent AOE zone fills and pulsing borders (GroundEffectSystem)
layers.entities  — all entity sprites
  └─ _entityRoot (BaseRenderer)
      └─ [BattleRenderer only]: minionContainer, enemyContainer, bossContainer (Z-ordered)
      └─ player sprites added directly (on top)
layers.fx        — transient visual effects
  ├─ _projectileContainer (BaseRenderer)
  ├─ _beamGfx (BaseRenderer) — channel + flash beams
  ├─ ParticleSystem._gfx
  └─ OneShotEffectSystem effect pool
layers.ui        — screen-space UI
  ├─ _uiRoot (BaseRenderer) — scene UI (kill counter, HP bar, etc.)
  │   └─ [BattleRenderer only]: tombstone Graphics (added per-tombstone)
  └─ FloatingTextPool (damage numbers)
```

---

## Entity Sprites

All sprites live in `client/host/entities/`.

| Class | Container Structure |
|---|---|
| `PlayerSprite` | `container` → body (rotated shape + front dot + flash gfx) + nameText + HP bar + `OverheadDisplay` |
| `EnemySprite` | `container` → Graphics circle with HP bar |
| `BossSprite` | `container` → Graphics body + HP bar + phase indicator |
| `ProjectileSprite` | `container` → trail Graphics + body circle |

`PlayerSprite.update(p, pos, dt)` — takes server state, interpolated position, and delta time.
`sprite.container.tint` — set on EnemySprite in `_onEnemyCreated` for dummy gold tint.

---

## VFX API (`this.vfx`)

`VFXManager` is a facade over 5 subsystems. Created in `enter()`, destroyed in `exit()`.

| Method | Effect |
|---|---|
| `vfx.triggerSkillVFX(data)` | Dispatches to correct subsystem based on skill type |
| `vfx.triggerImpact(x, y, color)` | Expanding ring flash + hit spark particles |
| `vfx.triggerDeath(x, y, color)` | Large burst of particles (18 particles, 0.6s) |
| `vfx.spawnDamageNumber(x, y, amount, type)` | Floating text (red=damage, green=heal), rises 40px |
| `vfx.particles.hitSpark(x, y, color)` | Small 6-particle spark (0.22s) |
| `vfx.ground.sync(aoeZones)` | Sync persistent AOE zone graphics to server state |
| `vfx.auras.sync(id, container, effects, radius)` | Sync buff/debuff rings on entity container |
| `vfx.auras.removeEntity(id)` | Remove all aura rings for entity (call on disconnect) |
| `vfx.update(dt)` | Advance all subsystems (particles, one-shots, auras, floating text) |

---

## State Access

Inside any renderer method, server state is accessed via:

```js
const state = this.game.knownState
// Fields:
state.players       // { [id]: { id, hp, maxHp, x, y, angle, isDead, isHost, className, effects, beamTargetId, ... } }
state.enemies       // [{ id, x, y, hp, maxHp, isDummy, ... }]  (null in bossFight)
state.boss          // { id, x, y, hp, maxHp, isDead, phase, ... }  (null in trashMob)
state.minions       // [{ id, x, y, hp, maxHp, minionType, color, ownerId, ... }]
state.projectiles   // [{ id, x, y, angle, color, radius, ... }]
state.tombstones    // [{ id, x, y, progress }]
state.aoeZones      // [{ id, x, y, radius, color, expiresAt }]
state.killCount     // number (trashMob)
```

Interpolated render position (blends prev/current server tick):
```js
const pos = this.game.getRenderPos(p)   // → { x, y }
```

---

## Existing Renderers

### LobbyRenderer (`client/host/scenes/LobbyRenderer.js`)
Lobby / skill practice phase. Shows players and gold-tinted training dummies.
**What it overrides:**
- `_buildUI()` — title bar, player count text, bottom hint
- `_onEnemyCreated(enemy, sprite)` — applies 0xf1c40f tint if `enemy.isDummy`
- `_updateUI(dt, activePlayerIds)` — updates player count / waiting text
- `_resetUIRefs()` — nulls `_countText`

No boss, no minions, no tombstones. AOE zones not used in lobby (empty array sync is safe).

### BattleRenderer (`client/host/scenes/BattleRenderer.js`)
Combat phases. Mode passed to constructor: `'trashMob'` or `'bossFight'`.
**What it overrides:** all hooks + `onChannelInterrupted`.
**Extra sub-containers** in `_entityRoot` (Z-ordered back→front): `minionContainer`, `enemyContainer`, `bossContainer`. Players are added directly to `_entityRoot` (top layer).
**Battle-only fields:** `bossSprite`, `tombstoneGfx`, `_prevPlayerHp`. (`minionGfx` is now in the base.)
- trashMob: enemies synced via `_syncEnemies()` base (uses `enemyContainer` via getter). Kill counter in `_updateUI`.
- bossFight: boss synced in `_syncExtras()`. HP bar in `_updateUI`.
- Both modes: minions and tombstones synced in `_syncExtras()`.

### ResultRenderer (`client/host/scenes/ResultRenderer.js`)
Victory / defeat overlay. **Does NOT extend BaseRenderer** — has no entities, no VFX, no beams. Standalone class.

---

## Adding a New Scene Renderer

Minimal renderer (UI-only, no entities):

```js
import { Text }        from 'pixi.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'
import BaseRenderer    from './BaseRenderer.js'

export default class CutsceneRenderer extends BaseRenderer {
  _buildUI() {
    const text = new Text({ text: 'Cutscene', style: { ... } })
    this._uiRoot.addChild(text)
  }
}
```

HostGame wires it up by calling `enter()`/`exit()`/`update(dt)` and forwarding socket events to `on*` methods. The base handles everything else.
