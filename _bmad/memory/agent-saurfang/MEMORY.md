# Memory

_Curated long-term knowledge. Grows through sessions. Keep under 200 lines._

## Serialization rule — the most important pattern in this codebase

Any server-side field must be **explicitly listed** in `_deltaState()` and `_fullState()` in `GameServer.js` to reach the client. Server-side storage (Maps, player objects, projectile objects) is not automatically serialized. Always check the serializer when a field isn't showing up on the client.

Same applies to zone DTO: `getZonesDTO()` in `SkillSystem.js` — must explicitly include any field Thrall or Jaina needs.

## VFX event routing

`skill:fired` events are emitted by the server and consumed by `VFXManager.triggerSkillVFX()` on the client.

- Persistent zones (e.g. Death and Decay) do NOT emit `EXPLOSION` — their visual comes from `GroundEffectSystem` via `aoeZones` state delta
- Lobbed AOE projectiles (`AOE/AOE_LOBBED`) detonate in `SkillSystem._tickProjectiles` — EXPLOSION emit lives there
- **SPAWN/TRAP skills detonate in `ServerMinion._updateTrap()`** — a completely separate code path. EXPLOSION emit must be added there, not in _tickProjectiles.

Always check `type` + `subtype` in SkillDatabase to know which server path owns a skill's detonation.

## Enemy state serialization

`ServerEnemy.toDTO()` is the only window to client enemy state. Any new field on `ServerEnemy` (e.g. `isFeared`) is invisible to the client until explicitly added to `toDTO()`.

## Mobile input: autoRefire / SUSTAINED cleanup

`SkillButton.svelte` handles `autoRefire` (INSTANT) and SUSTAINED abilities via `onPointerDown` + `onPointerUp`/`onPointerCancel`. On mobile, if the user drags their finger off the button before releasing, `pointerup` may never fire on the button element — the browser hijacks the gesture as a scroll.

Two required defenses:
1. **`touch-action: none` on `.skill-btn`** — tells the browser not to scroll-hijack touches on ability buttons.
2. **Window-level `pointerup`/`pointercancel` listeners** filtered by `e.pointerId`, registered in `onPointerDown` when starting a continuous interval. Use a `clearAutoRefire()` helper that clears both the interval and the window listeners atomically. Without this, dragging off the button leaves the interval running forever.

This was applied for `autoRefire` in 2026-05-18. If any future SUSTAINED or autoRefire ability feels "sticky", check for missing `touch-action: none` or missing window-level cleanup.

## Mobile input: DIRECTIONAL/AIMED/TARGETED pointercancel cleanup

`onPointerCancel` in `SkillButton.svelte` returns early for DIRECTIONAL/AIMED/TARGETED types — nipplejs owns those touches. **But iOS can fire `pointercancel` when a touch leaves the zone during rapid double-tap + drag sequences, and nipplejs may not fire its own `end` in that case.**

Defense added (2026-05-20): when `joystickHeld` is true inside `onPointerCancel`, perform the same cleanup that `j.on('end', ...)` does — clear `aimHeartbeat`, `autoFireInterval`, emit SHIELD END or cancelCast as appropriate, reset `lastDistance`. The double-cleanup is safe (idempotent).

Also: `MoveJoystick.svelte` now has `touch-action: none` on `.move-zone`. Without it, iOS can hijack movement touches as scroll gestures, preventing nipplejs from receiving `touchend`.

## Mobile input: visibilitychange / blur — app-switch frozen joystick (2026-06-02)

`touchcancel` fires for system-interrupted touches (phone call, Siri, notification pull-down) but **does NOT reliably fire when the user presses the home button or uses the app switcher on iOS.** In those cases, the joystick can remain stuck at its last position indefinitely.

Defense added (2026-06-02):

**MoveJoystick.svelte** — `_visHandler` (`document.visibilitychange`) and `_blurHandler` (`window.blur`) both call `_reset()` (zero vector + `_createJoystick()`). Handlers stored as module vars, cleaned up in `onDestroy`. Watchdog threshold reduced `10000 → 3000ms`.

**SkillButton.svelte** — new `$effect` registers matching `visibilitychange` + `blur` listeners. On hide: mirrors the `onPointerCancel` path for DIRECTIONAL/TARGETED/AIMED (clear `aimHeartbeat`, `autoFireInterval`, emit SHIELD END or cancelCast), and the `onPointerUp` path for INSTANT/SUSTAINED. Returns cleanup that removes both listeners.

Also added `multitouch: false` to nipplejs options in MoveJoystick (prevents multi-finger confusion on the same zone, related to nipplejs issue #94).

## Self-cast BURST projectiles (e.g. Penance self-heal)

Self-cast BURST projectiles spawn with `vx=0, vy=0, selfCast=true`. `_tickProjectiles` has an early-return guard for these to avoid them freezing in place. **The guard must apply the heal before deleting the projectile.** Currently it checks `canHitAllies && healAmount > 0` and heals the owner directly. Each burst projectile in the 3-shot fires the full `healAmount` independently.

## Zone DTO fields

`getZonesDTO()` now includes `skillName: z.config?.name ?? null`. Thrall uses this to render Consecration differently from other ground zones.

## Structure damage tracking — buildings and gates bypass `_dealDamage`

Buildings (`ServerBuilding`) and gates (`ServerGate`) are never passed to `_dealDamage` — that function is wired for enemies/boss/players only. All building/gate damage is manual `takeDamage()` calls at each site in `SkillSystem.js`.

**Both entities now return actual HP dealt from `takeDamage()`.** Every call site must capture the return value and write to both stat maps:
```js
const actual = structure.takeDamage(dmg)
if (attacker && actual > 0) {
  gs.stats.damage[attacker.id] = (gs.stats.damage[attacker.id] ?? 0) + actual
  if (gs.levelStats) gs.levelStats.damage[attacker.id] = (gs.levelStats.damage[attacker.id] ?? 0) + actual
}
```
DoT effects on buildings use `eff.ownerId` as the attacker key.

**If adding a new building/gate damage path — this boilerplate is required.** A `_dealStructureDamage()` helper would centralize it; not yet implemented.

## Entity takeDamage / heal return contracts

- `ServerPlayer.takeDamage(amount)` → returns actual HP damage dealt (capped, 0 if immune/absorbed)
- `ServerEnemy.takeDamage(amount)` → returns actual HP taken (`Math.min(amount, this.hp)`), 0 if dead/immune
- `ServerBoss.takeDamage(amount)` → same as enemy
- `ServerPlayer.heal(amount)` → returns actual HP gained (`this.hp - before`), 0 if downed or already full

**Floating text vs meters split (2026-05-20):**
- `_dealDamage` VFX emit uses `finalAmount` — ability damage pre-HP-cap
- `_dealDamage` meter tracking uses `actualDealt` — real HP removed
- All `_trackHeal` calls pass the return value of `heal()` — real HP restored only

## Melee hitbox shapes — rect vs cone

`_executeMelee()` in `SkillSystem.js` supports two hitbox shapes:

- **Cone** (default): `config.angle` present → `inCone()`. Used by Warrior, Paladin, DK.
- **Oriented rect**: `config.width` present → `inOrientedRect()`. Used by Rogue (Sinister Strike).

Discriminator is `config.width != null`. No new type/subtype needed.

`inOrientedRect()` in `CollisionSystem.js` takes an optional `targetRadius` for rect-vs-circle overlap (not point-in-rect). All four hit loops in `_executeMelee` pass the target's `.radius`. If `targetRadius = 0`, falls back to pure point-in-rect.

SKILL_FIRED payload includes `width: config.width` when set — Thrall's VFX branches on `d.width != null` to call `meleeRect` vs `meleeArc`.

## Stats are keyed by socket ID (unstable) — player.id === socket.id

`this.stats.damage`, `this.stats.heal`, etc. in `GameServer.js` use socket ID as key. Socket ID changes on reconnect. Two defenses exist:

1. **`_reclaimPlayer()` re-keys all stat maps** (both cumulative and levelStats) from `oldId → socket.id` the moment a player reconnects. Stats follow the player.
2. **`_buildPlayerSnapshot()` captures a frozen array** `{ id, name, className, isDowned }` at level-end and embeds it in `cumulativeStats` payload. `ResultScreen.svelte` renders from this snapshot, not from live `state.players`. Disconnect-immune.

`RunHistory` (`server/RunHistory.js`) re-keys stats further to **player name** for cross-session stability. Only the history archive uses name keys; in-flight game stats still use socket ID.

## RunHistory — where level data is recorded

`this.runHistory.recordLevel(levelIndex, levelName, outcome, { ...this.levelStats }, snapshot)` is called:
- `_doLevelComplete()` — victory path, before `_startLevel` resets `levelStats`
- NPC-died gameover block — before `currentLevel = null`
- `_checkAllDead()` gameover — before `currentLevel = null`

**Critical ordering**: always call `recordLevel` and `_buildPlayerSnapshot()` BEFORE nulling `this.currentLevel` or `this.currentLevelIndex` — those values are used in the call.

## BotController — architecture and deps (as of 2026-05-27)

`server/systems/BotController.js`. Constructor receives: `bots, players, inputQueues, enemies, getBoss, buildings, gates, getCurrentLevel, isDialogRunning, getScene`.

`GameServer.js` passes `buildings` and `gates` by Map reference (always current), plus three lambdas: `getCurrentLevel`, `isDialogRunning` (`this._dialogSystem?.isRunning() ?? false`), `getScene`.

**Behaviour summary:**
1. Downed → crawl toward nearest alive character (move input only)
2. Dialog running OR scene ≠ 'battle'/'bossFight' → idle wander
3. HP < 30% → non-healers retreat to nearest healer; no healer = flee from threat
4. `destroyBuildings`/`destroyGates` objectives → ~65% of bots (by `objectiveBias`) move toward nearest live building or active gate
5. Skill selection: eligibility-gated loop every 2 ticks — Mass Rez only when downed ally exists; Blink/DASH/Vanish only when enemy < 220px; CHANNEL skills suppress movement; HEAL_ALLY only when ally < 85% HP; AOE_SELF only when enemy in range; etc.
6. `skillNextAllowed[slot]` tracks `castTime + cooldown` — bots skip CDs without wasting ticks.

**Future hook — difficulty levels:** pass `difficulty` per botState at init; scale thresholds in `_isEligible` and skill timing. Not yet implemented.
