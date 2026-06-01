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
- Dense skill cast sounds are throttled via two gates in `handleSkillFired`: per-family throttle (200ms, `_skillFamilyThrottle` Map) and global concurrent cap (4 sounds per 100ms, `_recentSkillFires` rolling array). All three constants live in `_throttle` in the constructor — tunable by ear.
- Skill tier system overlays both gates: `SIGNATURE_SKILLS` Set in `shared/AudioConfig.js` marks 10 iconic abilities that bypass Gate 2 (concurrent cap) and never consume a slot. `buildSkillAudioMap()` stamps every entry with `tier: 'signature' | 'combat'`. Edit the set to promote/demote skills.
- Audio keys are logical integration contracts; gameplay code should not hardcode asset file paths ad hoc.

## Current Runtime Coverage

- Per-level music routing is wired through stable `levelId` in init/scene payloads.
- Host audio handles scene changes, player skill fire, effect damage/heal, targeted hit, boss dialog, Illidan phase transitions, aura pulse, portal beam warning/damage/end, player joins, and player downed detection.
- Controller cues in `ControllerAudio.js`: button click (`simple_button.ogg`, preloaded WebAudio buffer, fired via event delegation on `.app` div in `App.svelte`), join (660Hz triangle synth), downed (220Hz sawtooth, pitch-bend down), level-up (C-E-G ascending triad, 523→659→784Hz, staggered 110ms).
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
- Encounter utility sounds are explicitly keyed: portal beams, aura pulse, scene/result stingers, join/downed cues, portal entrance loop/end (Training Grounds level selector gate).
- Level 3 boulder mechanic: `sfx_boulder_charge_up` (loop, charge phase), `sfx_boulder_loop` (loop, rolling phase), `sfx_gate_destroy` (one-shot on gate death). Loop IDs: `boulder_charge`, `boulder_loop`. Gate death emits `GATE_DESTROY` (new event added to protocol).
- Level 5 pylon mechanic: `sfx_holy_tower_loop` (loop, charging state), `sfx_holy_tower_cast` (loop, active/healing state). Pylon events are piggybacked on `SKILL_FIRED` with `data.type` of `PYLON_SPAWN`/`PYLON_ACTIVATED`/`PYLON_EXPIRED`. Loop IDs: `pylon_charge`, `pylon_active` (safe as fixed IDs — only one pylon exists at a time). All 5 SFX files are awaiting assets.

## Important Contract Decisions

- Boss dialog event was normalized from Illidan-specific naming to generic `BOSS_DIALOG_LINE` / `boss:dialog_line`.
- `levelId` is the routing key for level-specific music, not display name.
- Controller volume controls are intentionally omitted; phone hardware volume is sufficient.

## Reactive Combat VO (Illidan Level 6)

- `boss:boss_vo` event — carries `{ speaker, voiceKey }`, no subtitle, no ducking. Wired in `main.js` → `audio.handleBossVo()`.
- Three triggers: kill taunt (20s cooldown), attack cry (3–10s random), wound cry (3–10s random).
- All cooldowns configurable in `ILLIDAN_CONFIG.reactiveVo` in `shared/IllidanConfig.js`.
- Wound cry hooked via `boss.onTakeDamage` callback set in IllidanEncounter constructor.
- Kill taunt detected via per-tick `_checkNewDeaths()` in IllidanEncounter.update().
- Attack cry fires from melee contact loop and `_handleAbility()` dispatch.
- Reactive VO silently drops if `_activeVoiceEl` is set (cinematic takes priority, no interruption).
- Asset keys: `voice_illidan_kill_01/02`, `voice_illidan_attack_01/02`, `voice_illidan_wound_01/02` — drop .ogg in `/assets/audio/voice/`.

## SFX Ducking During Cinematic Dialog

- `handleDialogLine` passes `{ duckSfx: true }` to `_duckForVoice` — sfx bus drops to 20% (`AUDIO_DUCKING.voiceSfxDialogMultiplier`).
- `_sfxDuck` multiplier applied in `_playHtmlOneShot` and `_applySettings` (looping sfx too).
- Releases smoothly on `handleDialogClear` via `_sfxDucked` state flag.
- Attack cries, wound cries, kill taunts are NOT cinematic — they use `handleBossVo` which never touches ducking.

## Verification State

- Audio implementation passes `npm run build`.
- `node shared/SkillValidator.js` had unrelated pre-existing schema drift and is not part of the audio baseline.
