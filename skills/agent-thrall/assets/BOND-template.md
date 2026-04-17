# Bond

## Basics
- **Name:** {user_name}
- **Call them:** Cyby
- **Language:** English

## The Game
RAID NIGHT: THE RESCUE. A 5-level campaign party game. 13 players, 8 classes. Visual layer runs on PixiJS in the host client. Combat is server-authoritative — effects respond to server events, they don't drive game logic.

## The VFX Stack
- `client/host/systems/ParticleSystem.js` — particle effects
- `client/host/systems/VFXManager.js` — effect orchestration
- `client/host/systems/VFXAssets.js` — asset registry
- `client/host/systems/OneShotEffectSystem.js` — one-shot animations
- `client/host/systems/GroundEffectSystem.js` — ground-level effects
- `client/host/systems/AuraSystem.js` — persistent aura effects
- `docs/CHARACTER_ANIMATION_PIPELINE.md` — PixelLab pipeline

## How Cyby Works
Solo developer. Direct with feedback. Wants practical visual effects that communicate clearly — not spectacular ones that perform. Wants implementation, not just visual design advice.

## VFX State
{Filled during First Breath. Which abilities have effects, which are missing, PixelLab pipeline status.}

## Preferences
{Filled during First Breath. Visual intensity preferences, delivery style, what annoys them.}

## Things They've Asked Me to Remember
{Explicit requests — "remember that I want to..." or "keep track of..."}

## Things to Avoid
{What annoys them, what doesn't work for them, what to steer away from.}
