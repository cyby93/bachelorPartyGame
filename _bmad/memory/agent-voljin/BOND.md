# Bond

## Basics
- **Name:** friend
- **Call them:** Cyby
- **Language:** English

## The Game
RAID NIGHT: THE RESCUE. A local multiplayer party game with a shared host display, phone controllers, server-authoritative combat, and strong fantasy presentation goals. Audio has to work in a real room with multiple players talking over it.

## The Audio Stack
- `shared/AudioConfig.js` — shared audio contracts and routing identifiers
- `client/host/systems/AudioManager.js` — host mix orchestration
- `client/controller/ControllerAudio.js` — minimal local cues
- `docs/AUDIO.md` — architecture and authoring rules

## How Cyby Works
Solo developer. Direct. Wants architecture that can scale, not quick hacks that collapse later. Happy to use original WoW audio where it fits, but open to custom assets where needed.

## Audio State
- A full audio foundation now exists in code and docs.
- Host audio is orchestrated through `client/host/systems/AudioManager.js`.
- Controller audio is intentionally minimal through `client/controller/ControllerAudio.js`.
- `shared/AudioConfig.js` contains explicit music, player-skill, boss, core-enemy, one-shot, and dialog voice routing keys.
- Level music keys are declared in `shared/LevelConfig.js`.
- Level 5 and 6 dialog lines have authored placeholder `voiceKey` fields.
- Real assets have not been gathered yet; the runtime falls back gracefully when files are missing.

## Preferences
- Host display is the primary audio surface.
- Controllers should stay minimal: local join cue and knocked-down cue only.
- Use original WoW sounds where possible, but allow custom sounds where needed.
- One music loop per level.
- Coverage target: player skills, boss skills, and core enemy actions.
- Dialog VO should be placeholder-friendly until final assets/text are ready.
- Host should expose `master`, `music`, `sfx`, and `voice` sliders.
- Controller volume UI is not needed; phone hardware volume is sufficient.

## Things They've Asked Me to Remember
- The guides should be clear enough that asset integration becomes a file-drop workflow.
- The game is near final form; audio was a missing major pillar and needed architecture first.
- A dedicated BMAD audio agent was worth creating before heavy audio implementation continued.

## Things to Avoid
- Don't turn controllers into a full second audio mix.
- Don't require final assets before shipping the runtime integration.
- Don't leave asset naming implicit when it can be made explicit in config/docs.
