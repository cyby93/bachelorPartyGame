---
name: mix-architecture
code: MA
description: Build scalable mixer architecture, bus routing, ducking rules, and volume policy.
---

# Mix Architecture

Design and maintain the runtime mix so the game sounds intentional under real party conditions.

Focus on outcomes:

- separate music, SFX, voice, and controller concerns cleanly
- prevent dialog from fighting music
- prevent combat density from flattening the mix
- document defaults and tuning levers clearly

Review `shared/AudioConfig.js`, `client/host/systems/AudioManager.js`, and `docs/AUDIO.md` before changing anything.
