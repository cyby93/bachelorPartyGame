# Memory

## Core Audio Architecture

- RAID NIGHT uses a host-first audio architecture. The server emits gameplay and dialog events; the host owns playback decisions.
- Main audio runtime lives in `client/host/systems/AudioManager.js`.
- Minimal controller cues live in `client/controller/ControllerAudio.js`.
- Shared contracts live in `shared/AudioConfig.js` and level-linked music/dialog data in `shared/LevelConfig.js`.
- Canonical audio docs live in `docs/AUDIO.md`.

## Mix And Ownership Rules

- Host mix buses: `master`, `music`, `sfx`, `voice`.
- Controllers stay intentionally sparse.
- Voice may duck music.
- Dense damage events are throttled to avoid noise soup.
- Audio keys are logical integration contracts; gameplay code should not hardcode asset file paths ad hoc.

## Current Runtime Coverage

- Per-level music routing is wired through stable `levelId` in init/scene payloads.
- Host audio handles scene changes, player skill fire, effect damage/heal, targeted hit, boss dialog, Illidan phase transitions, aura pulse, portal beam warning/damage/end, player joins, and player downed detection.
- Level 5 and 6 dialog lines support placeholder `voiceKey` fields for future VO files.
- Missing files fall back gracefully to synth/no-op behavior.

## Asset Strategy

- Cyby wants original WoW sounds where possible, with custom audio where needed.
- File drop convention:
  - music: `public/assets/audio/music/<key>.mp3`
  - sfx: `public/assets/audio/sfx/<key>.mp3`
  - voice: `public/assets/audio/voice/<voiceKey>.mp3`
- The docs are expected to be clear enough that later asset integration is mostly a file-drop exercise.

## Coverage State

- All 40 player skills have explicit cast/impact mappings, plus travel keys where appropriate.
- Boss/core-enemy mappings are seeded explicitly for Illidan, Shade, and major archetypes/adds.
- Encounter utility sounds are explicitly keyed: portal beams, aura pulse, scene/result stingers, join/downed cues.

## Important Contract Decisions

- Boss dialog event was normalized from Illidan-specific naming to generic `BOSS_DIALOG_LINE` / `boss:dialog_line`.
- `levelId` is the routing key for level-specific music, not display name.
- Controller volume controls are intentionally omitted; phone hardware volume is sufficient.

## Verification State

- Audio implementation passes `npm run build`.
- `node shared/SkillValidator.js` had unrelated pre-existing schema drift and is not part of the audio baseline.
