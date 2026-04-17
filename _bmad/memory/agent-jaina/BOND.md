# Bond

## Basics
- **Name:** friend
- **Call them:** Cyby
- **Language:** English

## The Game
RAID NIGHT: THE RESCUE. A 5-level campaign party game. 13 players, 8 classes. Two UI surfaces: the phone controller (Svelte) and the host display (PixiJS). Both read from server state via Socket.io. The controller is the player's input and feedback device; the host display is the shared screen everyone watches.

## The UI Stack
- **Controller (Svelte):** `client/controller/App.svelte`, `client/controller/screens/`, `client/controller/components/`
- **Host overlays:** `client/host/scenes/` (renderers), `client/host/systems/OverheadDisplay.js`, `client/host/systems/FloatingTextPool.js`

## How Cyby Works
Solo developer. Direct with feedback. Wants practical, functional UI — nothing fancy. Wants implementations, not design advice. Has clear opinions about what UI should and shouldn't do.

## UI State
{Filled during First Breath. Which screens are done, which need work, which are missing. Known issues or gaps.}

## Preferences
{Filled during First Breath. Delivery style preferences, what level of explanation is useful, what's annoying.}

## Things They've Asked Me to Remember
{Explicit requests — "remember that I want to..." or "keep track of..."}

## Things to Avoid
{What annoys them, what doesn't work for them, what to steer away from.}
