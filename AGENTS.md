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
- `shared/BaseBossConfig.js`: shared boss defaults and `DEFAULT_BOSS_RADIUS`
- `shared/IllidanConfig.js`: Illidan encounter config (phases, abilities, enrage)
- `shared/ShadeOfAkamaConfig.js`: Shade of Akama encounter config
- `docs/SKILLS.md`: skill schema, valid type/subtype combinations, VFX expectations, design rules
- `docs/RENDERERS.md`: host renderer lifecycle and extension points
- `docs/SPRITES.md`: sprite pipeline — generator script, canvas-size rule, key naming, adding new sprites

When changing skill behavior, keep `shared/SkillDatabase.js`, `shared/SkillValidator.js`, and `docs/SKILLS.md` aligned.

## Scene Flow

```text
Lobby -> Level 1 (Waves) -> Level 2 (Gates) -> Level 3 (Leviathan) -> Level 4 (Shade of Akama) -> Level 5 (Illidan) -> Result / GameOver -> Lobby
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

## Ownership Matrix

Use these ownership areas to decide which files and docs must be reviewed before changing behavior.

| Area | Primary Files | Core Rule |
|------|---------------|-----------|
| Server Gameplay Authority | `server/GameServer.js`, `server/systems/*`, `server/entities/*` | Server is the source of truth for gameplay state, cooldowns, damage, scene flow, and objective progress. |
| Shared Contracts and Config | `shared/protocol.js`, `shared/*Config.js`, `shared/SkillDatabase.js` | Shared files define contracts used by multiple runtime parts. Do not change them without checking all producers and consumers. |
| Host Rendering and VFX | `client/host/*`, `docs/RENDERERS.md` | Host renders server state and should not invent gameplay rules. |
| Controller UI and Input | `client/controller/*` | Controller sends intent and presents UI only. It must stay aligned with protocol and skill input semantics. |
| Campaign and Level Flow | `shared/LevelConfig.js`, `server/GameServer.js`, `server/entities/ServerNPC.js`, `server/entities/ServerGate.js`, progression-related renderers/screens | Level schema, scene transitions, and objective handling must stay aligned across server and UI surfaces. |
| Docs and Validation | `AGENTS.md`, `docs/*`, `shared/SkillValidator.js` | Docs and validators are part of the implementation for boundary-heavy changes, not optional cleanup. |

## Change Routing Rules

Use these routing rules before editing code.

### Skill change

If a task changes skill behavior, skill schema, input mode, cooldown semantics, cast/channel behavior, targeting, or VFX routing for a skill, inspect all of:

- `shared/SkillDatabase.js`
- `shared/SkillValidator.js`
- `docs/SKILLS.md`
- `server/systems/SkillSystem.js`
- controller files that interpret `inputType` or cast behavior
- `client/host/systems/VFXManager.js` if the visual behavior or type/subtype mapping changes

### Protocol or state contract change

If a task changes event names, payload shapes, DTO fields, scene names, or state snapshot/delta structure, inspect all producers and consumers:

- `shared/protocol.js`
- relevant server emitters/handlers
- relevant host consumers
- relevant controller consumers
- `docs/PROTOCOL.md`

### Renderer or VFX change

If a task changes host scene lifecycle, renderer hooks, interpolation assumptions, effect systems, or scene-specific host UI:

- inspect relevant files under `client/host/`
- inspect `docs/RENDERERS.md`

### Campaign or objective change

If a task changes level schema, objective types, progression flow, scene transitions, boss setup, or spawn pacing:

- inspect `shared/LevelConfig.js`
- inspect `server/GameServer.js`
- inspect `server/systems/SpawnSystem.js` if spawning changes
- inspect relevant host renderers
- inspect controller scene handling if flow or screen expectations change
- inspect `docs/CAMPAIGN.md`

## Definition Of Done

For non-trivial changes, the task is not complete until:

- implementation is finished
- all required cross-boundary files were reviewed
- nearby docs were updated when behavior or contracts changed
- `npm run build` was run when practical
- `node shared/SkillValidator.js` was run after changing skills or skill schema
- manual verification notes were listed in the final response
- a second-pass review was done for boundary-heavy changes

## Boundary Review Checklist

Use a separate review pass for changes that touch shared contracts, skills, progression, or scene flow.

The review should focus on:

- contract drift between docs, validators, configs, and runtime code
- source-of-truth violations
- changed producers without changed consumers
- changed consumers without changed producers
- missing verification
- missing docs updates

## Current Drift Watchlist

These are known examples of boundary drift and should be treated as regression traps:

- `AIMED` exists in skill data/docs/controller semantics; keep validator and related workflows aligned.
- Cooldown payload semantics must stay consistent across `shared/protocol.js`, server emitters, and controller handling.
- Lobby/game/level-complete/result scene names and controller screen mapping must stay aligned with server scene flow.

## Claude Compatibility

`CLAUDE.md` is kept as a compatibility wrapper for Claude Code. Shared repo guidance should be maintained here in `AGENTS.md` first.
