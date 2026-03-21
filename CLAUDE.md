# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs server on :3100 + Vite dev server on :5173 concurrently)
npm run dev

# Run only the game server (with nodemon hot-reload)
npm run dev:server

# Run only the Vite dev server
npm run dev:client

# Production build (outputs to dist/)
npm run build

# Run production server (serves dist/)
npm start
```

No test framework is configured — all testing is manual in-browser.

## Architecture Overview

**RAID NIGHT** is a real-time local multiplayer party game. The host runs on a TV/monitor; up to 13 players join via their phones as controllers.

### Three-Part System

| Part | Stack | Entry Point |
|------|-------|-------------|
| Game Server | Node.js + Express + Socket.io | `server/index.js` |
| Host Display | PixiJS v8 (WebGL) | `client/host/main.js` → `index.html` |
| Phone Controller | Svelte + nipplejs | `client/controller/main.js` → `controller.html` |

Vite builds both HTML pages as separate bundles. In dev, Vite proxies `/socket.io` and `/api` to the Express server on port 3100.

### Server-Authoritative Game Loop

`server/GameServer.js` is the single source of truth. It ticks at **20 FPS** (50 ms), doing:
1. Drain per-player input queues (movement + skills)
2. Apply deltaTime-normalized movement + boundary clamp
3. Update enemy/boss AI
4. `SkillSystem.tick()` — advance projectiles, resolve effects, handle casts
5. Collision detection (circle-circle)
6. Check revive timers, win/lose conditions
7. Broadcast delta state to all clients

The **host display** merges deltas into `HostGame.knownState` and renders at 60 FPS with linear interpolation between server ticks. Controllers only receive their own HP and cooldown feedback.

### Shared Config (`shared/`)

Both server and client import from `shared/`:
- `protocol.js` — all Socket.io event name constants (no magic strings)
- `GameConfig.js` — canvas size (1024×768), collision radii, tick rate, revive distance/time
- `ClassConfig.js` — 8 classes with HP, speed, color, skill list
- `SkillDatabase.js` — 32 skills (8 classes × 4); each has `type`, `subtype`, `inputType`
- `BossConfig.js` — Illidan phase abilities

Skill `type` drives `SkillSystem.js` routing: `PROJECTILE`, `MELEE`, `AOE`, `DASH`, `BUFF`, `SHIELD`, `CAST`.
Skill `inputType` drives controller UI: `INSTANT`, `DIRECTIONAL`, `TARGETED`, `SUSTAINED`.

### Scene Flow

```
Lobby → TrashMob (50 kills) → BossFight (Illidan) → Result / GameOver → Lobby
```

Scene transitions are server-driven via `scene:change` socket event. Both the host renderer (`HostGame.switchScene()`) and controller (`App.svelte` state machine) react to this event.

### Key Design Decisions

- **Cooldowns are server-only** (`server/systems/CooldownSystem.js`). The server emits `skill:cooldown` events; the controller UI reflects them but does not enforce them.
- **Interpolation lives in `HostGame.js`** (`getRenderPos()`). It blends between the previous and current server position using elapsed time since last tick.
- **Enemy/projectile sprites are pooled** in `BattleRenderer.js` — reuse objects rather than create/destroy every frame.
- **Audio is synthesized** via Web Audio API in `AudioSystem.js` — no audio files needed.
- **QR code** for controller URL is generated client-side from the `/api/network-url` endpoint response.
