# AGENTS.md

Shared working instructions for AI coding assistants in this repository. This is the canonical repo-level guide for both Claude-style and Opencode-style tools.

## Scope

- Keep repo-specific agent guidance here.
- Keep deep system references in `docs/`.
- Keep tool-specific config in tool-specific folders such as `.claude/`.

If guidance in another file conflicts with this one, update this file and then align the wrapper or tool-specific file.

## Commands

```bash
# Development (server on :3100 and Vite on :5173)
npm run dev

# Server only
npm run dev:server

# Client only
npm run dev:client

# Production build
npm run build

# Production server
npm start

# Skill data validation
node shared/SkillValidator.js
```

## Verification

- No automated test framework is configured.
- Default verification is manual in-browser testing.
- Run `npm run build` after non-trivial changes when practical.
- Run `node shared/SkillValidator.js` after adding or changing skills.

## Architecture

`RAID NIGHT` is a real-time local multiplayer party game with three main parts:

| Part | Stack | Entry Point |
|------|-------|-------------|
| Game Server | Node.js + Express + Socket.io | `server/index.js` |
| Host Display | PixiJS v8 | `client/host/main.js` -> `index.html` |
| Phone Controller | Svelte + nipplejs | `client/controller/main.js` -> `controller.html` |

In development, Vite proxies `/socket.io` and `/api` to the Express server on port `3100`.

## Core Runtime Rules

- `server/GameServer.js` is the authoritative game state and runs the main loop at 20 FPS.
- The host display interpolates server state and renders at 60 FPS.
- Controllers are input devices and UI surfaces, not the source of truth for gameplay state.
- Cooldowns are enforced on the server in `server/systems/CooldownSystem.js`.
- Shared gameplay config lives in `shared/` and should be reused instead of duplicating constants.

## Important Source-of-Truth Files

- `shared/protocol.js`: socket event names
- `shared/GameConfig.js`: map size, radii, tick values, revive settings
- `shared/ClassConfig.js`: class stats, colors, skill loadouts
- `shared/SkillDatabase.js`: skill definitions
- `shared/BossConfig.js`: boss phase data
- `docs/SKILLS.md`: skill schema, valid type/subtype combinations, VFX expectations, design rules
- `docs/RENDERERS.md`: host renderer lifecycle and extension points

When changing skill behavior, keep `shared/SkillDatabase.js`, `shared/SkillValidator.js`, and `docs/SKILLS.md` aligned.

## Scene Flow

```text
Lobby -> TrashMob (50 kills) -> BossFight (Illidan) -> Result / GameOver -> Lobby
```

Scene transitions are server-driven through the shared protocol.

## Editing Norms

- Prefer small, minimal changes over broad rewrites.
- Reuse existing patterns before introducing new abstractions.
- Do not move authority for gameplay rules from server to client.
- Update nearby docs when changing behavior that other agents or contributors rely on.
- Treat `docs/SKILLS.md` as required maintenance when skill schema, types, subtypes, or VFX routing change.
- Treat `docs/RENDERERS.md` as required maintenance when renderer lifecycle or hooks change.

## Practical Guidance

- For server gameplay bugs, inspect `server/GameServer.js` and the relevant system under `server/systems/` first.
- For controller behavior, inspect `client/controller/screens/` and input handling in `client/controller/main.js`.
- For host-side rendering changes, inspect `client/host/HostGame.js`, `client/host/scenes/`, and `client/host/systems/`.
- Prefer shared constants and protocol definitions over hardcoded strings or numbers.

## Claude Compatibility

`CLAUDE.md` is kept as a compatibility wrapper for Claude Code. Shared repo guidance should be maintained here in `AGENTS.md` first.
