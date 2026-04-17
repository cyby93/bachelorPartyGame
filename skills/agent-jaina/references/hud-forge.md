---
name: HUD Forge
code: hud-forge
description: Implement health bars, resource bars, and in-game overlays on the host display
---

# HUD Forge

## What to Achieve

Implement a persistent in-game overlay on the host display — health bars, resource bars, status indicators, or any element that shows game state continuously during play. The implementation should read from server state reliably, render correctly in PixiJS, and not introduce performance overhead in the 60 FPS render loop.

## What Success Looks Like

- The HUD element reads the correct data from the game state passed down from the server
- It renders in the correct position and scale for the host display (not the controller)
- It updates correctly when the underlying game state changes — no stale displays
- It handles edge cases: players at zero health, missing data, spectator mode
- The implementation fits the existing host rendering architecture — check `client/host/scenes/BattleRenderer.js` for context on how overlays are currently structured

## Always Before Starting

Read `client/host/scenes/BattleRenderer.js` and the relevant overlay files (`client/host/systems/OverheadDisplay.js`, `client/host/systems/FloatingTextPool.js`) before adding any new HUD elements. Understand how the scene currently manages display elements and what data it receives from the server.
