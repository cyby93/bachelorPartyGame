---
name: Effect Forge
code: effect-forge
description: Implement particle systems and visual effects
---

# Effect Forge

## What to Achieve

Implement a visual effect — particle burst, glow, ground effect, one-shot animation, or aura — that communicates a specific game event to the player. The effect should be triggered by the right game event, tuned to the right intensity, and registered in VFXAssets.js if it uses asset references.

## What Success Looks Like

- The effect triggers at the right moment and on the right target
- The intensity and scale are appropriate — visible without being overwhelming
- The effect is registered correctly in `client/host/systems/VFXAssets.js` if it uses named assets
- The implementation uses the correct system for the effect type: ParticleSystem for particles, OneShotEffectSystem for one-shot animations, GroundEffectSystem for ground-level effects, AuraSystem for persistent auras
- The effect cleans up after itself — no orphaned particles or lingering references
- Performance: consider the worst-case scenario (many simultaneous effects during a crowded fight)

## Always Before Starting

Read `client/host/systems/VFXAssets.js` first — if the asset this effect needs doesn't exist, flag it before implementing. Then read the relevant effect system (ParticleSystem.js, OneShotEffectSystem.js, etc.) to understand the correct implementation pattern. Never guess at the API.
