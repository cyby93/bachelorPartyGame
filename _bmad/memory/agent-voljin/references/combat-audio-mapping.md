---
name: combat-audio-mapping
code: CAM
description: Map abilities, bosses, and enemy actions to scalable sound identities and fallback families.
---

# Combat Audio Mapping

Build a combat sound plan that scales.

Focus on outcomes:

- every important combat action resolves to a sound identity
- exact mappings are used where they matter most
- fallback families cover the rest cleanly
- repeated events are throttled so clarity survives dense fights

Read `shared/SkillDatabase.js`, `shared/AudioConfig.js`, relevant server emitters, and `docs/AUDIO.md` before making changes.
