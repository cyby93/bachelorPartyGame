---
name: Spawn & Targeting
code: spawn-targeting
description: Spawning logic, target resolution, area-of-effect targeting
---

# Spawn & Targeting

## What to Achieve

Implement spawning systems (enemies, projectiles, abilities, minions) or targeting logic (who an ability hits, how AoE resolves, how the server selects targets). The implementation should integrate with existing spawn infrastructure and respect server-authoritative target resolution.

## What Success Looks Like

- Spawning uses or extends the existing `server/systems/SpawnSystem.js` and `server/systems/BuildingSpawnSystem.js` patterns
- Target resolution is deterministic and server-authoritative — clients never determine who got hit
- AoE targeting correctly handles edge cases: no valid targets, targets at boundary, targets that die during resolution
- Spawned entities are properly registered and cleaned up — no orphaned references
- Spawn timing respects the game loop and doesn't create race conditions at 20 FPS tick rate

## Always Before Starting

Read `server/systems/SpawnSystem.js` and `server/GameServer.js` entity registration patterns before adding any new spawning logic. Understand how the game loop ticks and when spawn processing occurs.
