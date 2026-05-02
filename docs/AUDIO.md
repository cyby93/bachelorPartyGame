# AUDIO.md — Audio Architecture And Authoring Rules

All runtime parts must stay aligned with this file when touching music, sound effects, controller cues, or dialog voice.

- server: authoritative producer of timing and gameplay events
- host: primary shared playback surface for music, boss VO, and combat SFX
- controller: minimal local cues only

Shared repo-level assistant guidance lives in `AGENTS.md`.

---

## Goals

- one background music loop per level
- combat sound coverage for player skills, boss skills, and core enemy actions
- dialog voice support for the last two levels
- placeholder-friendly implementation that works before all assets exist
- stable audio contracts so asset sourcing can happen in parallel

---

## Ownership

### Server

- emits gameplay and dialog events
- owns timing and sequencing
- never decides how playback happens

### Host

- owns music, combat SFX, boss VO, and mix state
- resolves logical audio keys into actual playback
- may duck music during voice playback

### Controller

- only plays minimal local cues
- current approved scope: join cue and knocked-down cue
- must not become a second full combat mix

---

## Source Of Truth

### Shared config

- `shared/AudioConfig.js`
- `shared/LevelConfig.js`
- `shared/SkillDatabase.js`

### Host runtime

- `client/host/systems/AudioManager.js`
- `client/host/main.js`

### Controller runtime

- `client/controller/ControllerAudio.js`
- `client/controller/App.svelte`

### Assets

- `public/assets/audio/music/`
- `public/assets/audio/sfx/`
- `public/assets/audio/voice/`
- `public/assets/sounds/` for sourced player skill imports kept as raw Wowhead `.ogg`

Until real files exist, missing files are allowed. The runtime will fall back gracefully.

Runtime expectation once files are gathered:

- music: `/assets/audio/music/<key>.mp3`
- sfx: `/assets/audio/sfx/<key>.mp3`
- voice: `/assets/audio/voice/<voiceKey>.mp3`

Current exception for sourced player skill imports:

- skill one-shots may point directly to `/assets/sounds/<key>.ogg`
- this repo currently keeps sourced Wowhead files as-is instead of transcoding them into the main `/assets/audio/sfx/` pipeline

---

## Mixer Model

The host mix uses 4 logical buses:

- `master`
- `music`
- `sfx`
- `voice`

Current defaults are defined in `shared/AudioConfig.js`.

Rules:

- sliders write logical bus values, not raw asset gains
- mute should zero master, not disable state tracking
- voice may duck music temporarily
- repeated combat events must be throttled before playback

---

## Level Music

Each playable level maps to exactly one loop.

Current contract:

```js
{
  music: { key, src, loop }
}
```

Routing:

- `lobby` uses the lobby profile
- `battle` and `bossFight` use the active `levelId`
- `result` and `gameover` use terminal scene profiles

Use `levelId`, not display name, as the routing key.

---

## Skill And Combat SFX

Coverage target for the first real content pass:

- all player skills
- boss skills
- core enemy actions

Use this fallback chain:

1. exact skill mapping
2. subtype family mapping
3. type family mapping
4. generic fallback

This keeps the system scalable while real assets arrive over time.

### Practical rule

Do not require bespoke sounds for every skill before shipping the system. The contract should guarantee some sound identity for every important event, even if it is a family fallback.

---

## Dialog Voice

Dialog voice currently targets Level 5 and Level 6.

Rules:

- text remains the authoritative subtitle string
- host resolves a logical `voiceKey` from speaker + text
- missing voice assets must fail gracefully without breaking subtitles
- server still owns the line order and delay timing

Recommended authored dialog shape over time:

```js
{
  speaker,
  text,
  delayAfter,
  voiceKey,
  durationMs
}
```

Placeholder-first is acceptable. The architecture must not require final assets before integration starts.

---

## Asset Naming

Use logical keys with predictable prefixes.

Examples:

- `music_level_1_courtyard`
- `music_level_6_illidan`
- `sfx_skill_fireball_cast`
- `sfx_skill_fireball_impact`
- `sfx_family_melee_cast`
- `voice_illidan_you_are_not_prepared`

Rules:

- lowercase
- underscore-separated
- no direct asset path literals in gameplay code
- path resolution belongs in audio manifests, not renderers

---

## Performance Rules

- throttle repeated hit sounds in dense combat
- cap repeated downed cues
- avoid per-tick DOT spam
- preload current scene music when real assets are added
- keep controller audio intentionally sparse

Silence is bad. Noise soup is worse.

---

## Placeholder Strategy

The current system intentionally supports three states:

1. no asset yet -> synth fallback or silence-safe no-op
2. placeholder asset -> real playback path already wired
3. final asset -> drop-in replacement via config only

This allows architecture and gameplay integration to land before sourcing all WoW/custom audio.

---

## Implementation Notes

- current host entrypoint wires `SCENE_CHANGE`, `SKILL_FIRED`, `EFFECT_DAMAGE`, `TARGETED_HIT`, dialog lines, and phase transitions into `AudioManager`
- current controller entrypoint wires minimal local join/downed cues into `ControllerAudio`
- current state contract includes `levelId` in `game:init` and `scene:change` so level audio routing uses a stable identifier

---

## Next Content Pass

Recommended order:

1. add real level music assets
2. add boss phase stingers and dialog VO placeholders
3. map all player skills to families or exact sounds
4. add boss/core-enemy sound families
5. replace placeholder/fallback routing with sourced WoW/custom clips where available

---

## Asset Drop-In Guide

Once you gather audio files, place them using the exact logical key as the filename.

### Music

Examples:

- `public/assets/audio/music/music_level_1_courtyard.mp3`
- `public/assets/audio/music/music_level_6_illidan.mp3`
- `public/assets/audio/music/music_lobby_gathering.mp3`

### General SFX

Examples:

- `public/assets/audio/sfx/stinger_scene_transition.mp3`
- `public/assets/audio/sfx/ui_player_join.mp3`
- `public/assets/audio/sfx/combat_hit_damage.mp3`
- `public/assets/audio/sfx/portal_beam_warning.mp3`
- `public/assets/audio/sfx/sfx_boss_illidan_cast.mp3`

### Player Skill SFX

Every player skill now has an explicit logical mapping in `shared/AudioConfig.js`.

Selection rules for sourced class audio:

- casted abilities may use up to three states: `precast`, `cast`, `impact`
- when Wowhead exposes multiple alternates for the same state, pick exactly one file at random
- instant abilities use one fired-state sound only
- channeled abilities use one start sound plus one looping channel sound when available
- if a spell page does not expose a clean sound for a desired state, use the closest available match or reuse a related state deliberately

Common pattern:

- cast: `public/assets/audio/sfx/sfx_skill_<skill_name>_cast.mp3`
- impact: `public/assets/audio/sfx/sfx_skill_<skill_name>_impact.mp3`
- optional travel: `public/assets/audio/sfx/sfx_skill_<skill_name>_travel.mp3`

Current Warlock import pass uses direct file paths under `public/assets/sounds/` and keeps Wowhead-source `.ogg` files as-is.

Warlock mapping in this pass:

- `Shadow Bolt`: `precast`, `cast`, `impact`
- `Corruption`: `cast`, `impact`
- `Drain Life`: `cast`, looping `channel`
- `Fear`: `precast`, `cast`

Mage mapping in this pass:

- `Fireball`: `precast`, `cast`, `impact`
- `Frost Nova`: `cast`, `impact`
- `Blink`: `cast`, `impact`
- `Pyroblast`: `precast`, `cast`, `impact`

Shaman mapping in this pass:

- `Lightning Bolt`: `precast`, `cast`, `impact`
- `Chain Heal`: `precast`, `cast`, `impact`
- `Searing Totem`: `cast`
- `Bloodlust`: `cast`

Warrior mapping in this pass:

- `Cleave`: `cast`, `impact`
- `Thunder Clap`: single sourced impact file reused for both `cast` and `impact`
- `Bladestorm`: loop-style sourced file reused for `cast` and `channel`, plus sourced `impact`
- `Shield Wall`: sourced `cast` reused for `impact`

Paladin mapping in this pass:

- `Hammer Swing`: sourced proxy `cast`, sourced proxy `impact`
- `Avenger's Shield`: `cast`, `impact`
- `Divine Shield`: `cast`, `impact`
- `Consecration`: sourced `cast` plus sourced impact proxy

Hunter mapping in this pass:

- `Shoot Bow`: sourced `precast`, sourced `cast`, `cast` reused as `impact`
- `Aimed Shot`: sourced `precast`, `cast`, `impact`
- `Call of the Wild`: temporary proxy reused from an existing sourced summon-style class clip
- `Explosive Trap`: temporary proxy pair reused from existing sourced ground-effect clips

Priest mapping in this pass:

- `Penance`: temporary proxy pair reused from sourced holy cast and impact clips
- `Holy Nova`: `cast`, impact proxy
- `Power Word: Shield`: `cast`, `impact`
- `Mass Resurrection`: `precast`, `channel`, `cast`, `cast` reused as `impact`

Druid mapping in this pass:

- `Wrath`: `precast`, `cast`, `impact`
- `Moonfire`: `cast`, `impact`
- `Regrowth`: `precast`, `cast`, `impact`
- `Tranquility`: `cast`, `channel`

Rogue mapping in this pass:

- `Sinister Strike`: sourced cast proxy reused for `impact`
- `Vanish`: sourced cast proxy
- `Sprint`: sourced cast proxy
- `Ambush`: `cast`, impact proxy

Death Knight mapping in this pass:

- `Obliterate`: sourced cast file reused for `impact`
- `Death Grip`: sourced impact proxy reused for `cast`
- `Death and Decay`: `cast`, `impact`, `channel`
- `Anti-Magic Shell`: cast proxy plus sourced shell impact

Examples:

- `public/assets/audio/sfx/sfx_skill_cleave_cast.mp3`
- `public/assets/audio/sfx/sfx_skill_cleave_impact.mp3`
- `public/assets/audio/sfx/sfx_skill_fireball_travel.mp3`
- `public/assets/audio/sfx/sfx_skill_mass_resurrection_cast.mp3`
- `public/assets/audio/sfx/sfx_skill_death_and_decay_impact.mp3`

Not every skill needs a travel file. Only add it where the sound should follow a projectile or sustained travel path later.

### Voice

Examples:

- `public/assets/audio/voice/voice_akama_shade_intro_01.mp3`
- `public/assets/audio/voice/voice_shade_intro_01.mp3`
- `public/assets/audio/voice/voice_illidan_intro_01.mp3`

### Boss And Core Enemy SFX

The shared config now includes explicit non-player keys for the most important encounter and archetype sounds.

Examples:

- `public/assets/audio/sfx/sfx_boss_illidan_cast.mp3`
- `public/assets/audio/sfx/sfx_boss_illidan_impact.mp3`
- `public/assets/audio/sfx/sfx_boss_illidan_summon.mp3`
- `public/assets/audio/sfx/sfx_boss_shade_of_akama_cast.mp3`
- `public/assets/audio/sfx/sfx_enemy_felguard_melee.mp3`
- `public/assets/audio/sfx/sfx_enemy_coilskar_harpooner_cast.mp3`
- `public/assets/audio/sfx/sfx_enemy_bonechewer_brute_melee.mp3`
- `public/assets/audio/sfx/sfx_enemy_ashtongue_mystic_cast.mp3`
- `public/assets/audio/sfx/sfx_enemy_leviathan_ranged.mp3`
- `public/assets/audio/sfx/sfx_enemy_shadow_demon_cast.mp3`
- `public/assets/audio/sfx/sfx_enemy_shadowfiend_spawn.mp3`

Special encounter utility examples:

- `public/assets/audio/sfx/portal_beam_warning.mp3`
- `public/assets/audio/sfx/portal_beam_damage.mp3`
- `public/assets/audio/sfx/portal_beam_end.mp3`
- `public/assets/audio/sfx/boss_aura_pulse.mp3`

Rules:

- keep filenames exactly aligned with the configured key
- prefer `.mp3` consistently for the main authored pipeline unless a config entry intentionally points at sourced `.ogg`
- do not rename keys casually after files exist; keys are integration contracts

If a file is missing, the runtime falls back to synth/no-op behavior instead of crashing.
