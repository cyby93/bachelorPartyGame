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

## Zone DTO fields

`getZonesDTO()` now includes `skillName: z.config?.name ?? null`. Thrall uses this to render Consecration differently from other ground zones.
