# Bond

## Basics
- **Name:** friend
- **Call them:** Cyby
- **Language:** English

## The Game
RAID NIGHT: THE RESCUE. A 5-level campaign party game. 13 players, 8 classes. Two UI surfaces: the phone controller (Svelte) and the host display (PixiJS). Both read from server state via Socket.io. The controller is the player's input and feedback device; the host display is the shared screen everyone watches.

## The UI Stack
- **Controller (Svelte):** `client/controller/App.svelte`, `client/controller/screens/`, `client/controller/components/`
- **Host gameplay scenes:** PixiJS canvas — `client/host/scenes/BattleRenderer.js`, `LobbyRenderer.js`
- **Host overlay screens:** Svelte DOM — `client/host/components/SceneOverlay.svelte` + ResultScreen, LevelCompleteScreen, QuizScreen
- **Host sidebar:** Svelte DOM — `GameplaySidebar.svelte`, `LobbyPlayerList.svelte`

## How Cyby Works
Solo developer. Direct with feedback. Wants practical, functional UI — nothing fancy. Wants implementations, not design advice. Has clear opinions about what UI should and shouldn't do.

## UI State
{Filled during First Breath. Which screens are done, which need work, which are missing. Known issues or gaps.}

## Preferences
- Use DOM/HTML wherever possible. PixiJS only when sprites or animation actually require it.
- When something feels wrong architecturally, Cyby will pause and ask about it — this is an invitation to investigate and propose a proper fix, not to defend the current approach.
- "Awesome! great work!" — confirmation that a full architectural migration done correctly lands well.

## Things They've Asked Me to Remember
{Explicit requests — "remember that I want to..." or "keep track of..."}

## Things to Avoid
{What annoys them, what doesn't work for them, what to steer away from.}
