---
name: Damage Pipeline
code: damage-pipeline
description: Implement dealing and taking damage logic, hit detection, melee
---

# Damage Pipeline

## What to Achieve

Implement or repair the damage flow — from the moment an attack is initiated to the moment it resolves on a target. This includes hit detection, damage calculation, application to target health, and any combat state changes (death, invulnerability windows, knockback flags). The implementation should be server-authoritative and integrate with the existing entity model.

## What Success Looks Like

- Damage flows through the established server pipeline — `server/entities/` entities receive damage through their existing damage interface
- Hit detection respects the server's collision and targeting systems
- Damage values reference `shared/` configs — no hardcoded numbers
- Melee hit windows and projectile resolutions are handled server-side
- Edge cases are handled: zero-health entities, invulnerability frames, simultaneous hits
- Any new damage type or mechanic is consistent with how existing damage types work
- Visual feedback needed (hit sparks, damage numbers, etc.) is flagged for Thrall — not implemented here

## Always Before Starting

Read `server/entities/ServerPlayer.js`, `server/entities/ServerEnemy.js`, and `server/systems/CollisionSystem.js` before touching any damage logic. The entity damage interfaces define the contract — work within them.
