---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Player/host connection system upgrade — session management, reconnect UX, seamless rejoin'
session_goals: 'Session lifecycle management, seamless reconnect, explicit rejoin flow, host controls'
selected_approach: 'progressive-flow'
techniques_used: ['what-if-scenarios', 'mind-mapping', 'scamper', 'decision-tree-mapping']
ideas_generated: [15]
session_active: false
workflow_completed: true
---

# Brainstorming Session — Connection & Session System Upgrade

**Facilitator:** Cyby
**Date:** 2026-05-11
**Approach:** Progressive Technique Flow (Expansive → Patterns → Development → Action)

---

## Session Overview

**Topic:** Upgrade the player/host connection system — session management, seamless reconnect, rejoin flow, and host controls.

**Goals:**
- Session lifecycle: stable session ID, single active session, clean reset/recreate
- Seamless reconnect: returning players skip name/class flow entirely
- Explicit rejoin: players can voluntarily change name/class
- Host controls: waiting room, per-player kick, hard reset

**Key Constraints Established:**
- Only one session runs at a time — session ID is internal-only, never in URLs
- QR code stays simple; on hard reset players refresh the page, no rescan needed
- Player name stored in sessionStorage, class always picked fresh per session
- Zero reconnect tax — full state (cooldowns, upgrades, HP) restored on reconnect
- `sessionStorage` (not `localStorage`) prevents same-device multi-connection

---

## Current System Reality Check

Before generating ideas, the existing system was audited:

| What exists | Status |
|---|---|
| `sessionToken` UUID in `localStorage` | ✓ exists |
| Auto re-register on connect if `screen` is past name/class | ✓ exists (partial) |
| Server reclaims player if they were bot-ified (searches `bots` map) | ✓ exists (fragile) |
| INIT sent on join/reconnect | ✓ exists |
| Controller self-identifies from INIT | ✗ missing — identity derived from `socket.id` |
| Reconnect works on fresh page load | ✗ missing — `screen` resets to `'name'` |
| Fast-disconnect reclaim (before bot-ify timer) | ✗ missing |
| Session lifecycle / staging state | ✗ missing |
| Host session controls | ✗ missing |

---

## All Generated Ideas

### Identity & Storage

**[Identity #1]: sessionStorage-Scoped Token**
_Concept:_ Move `sessionToken` from `localStorage` to `sessionStorage`. Token lives per-tab — survives page refresh and network blips in the same tab, but a new tab gets a new token.
_Novelty:_ Kills the dual-connection problem for free. The browser enforces one-tab-one-identity naturally, no server-side enforcement needed.

**[Identity #2]: Server INIT Carries a `you` Field**
_Concept:_ When the server sends INIT to a reconnecting controller, it includes `you: { id, name, className, hp, cooldowns, upgrades, screen }` — a self-referential slice pointing at that specific player. Controller reads it once, restores all local UI state, jumps to the correct screen.
_Novelty:_ Controller stops deriving identity from `socket.id` entirely. Server is the single source of truth for "who you are."

**[Identity #3]: Full State Restoration — Zero Reconnect Tax**
_Concept:_ On reclaim, server restores cooldowns, upgrades, HP — everything. No penalties for a dropped connection.
_Novelty:_ Treats reconnect as "you never left." Respects that mobile network drops are involuntary.

**[Storage #4]: Name in sessionStorage, Class Never**
_Concept:_ Store only the player's name in sessionStorage. On any fresh session the name field pre-fills. Class is always picked fresh — it's an intentional choice per run.
_Novelty:_ Separates "persistent identity hint" (name) from "per-session loadout decision" (class).

**[Edge #9]: "Stale Token, Known Name" Path**
_Concept:_ Player opens new tab (token gone), but name is still in sessionStorage. Server says "register fresh" but name screen pre-fills with a hint: "Welcome back, Gandalf — pick your class to rejoin."
_Novelty:_ Acknowledges returning players without a full cold-start. Feels personal even on a "fresh" session.

---

### Reconnect Flow

**[Reconnect #5-S]: Single `HANDSHAKE` Event**
_Concept:_ Replace the current JOIN/reconnect split with a single `HANDSHAKE { token, name, className }` event the controller always emits on connect. Server inspects the token and routes internally — client never needs to decide which path it's on. Server always responds with INIT carrying a `you` field.
_Novelty:_ Eliminates the `if (screen !== 'name' && screen !== 'classSelect')` client-side guard entirely. Clean, single entry point.

**[Reconnect #6-E]: `disconnectedPlayers` Map Replaces Bot Map Lookup**
_Concept:_ On disconnect, immediately move the player to a `disconnectedPlayers` map keyed by `sessionToken`, before any bot-ify logic runs. `_onJoin` (or `_onHandshake`) checks this map first, always. Bot-ify becomes an independent background timer, not intertwined with reconnect.
_Novelty:_ Reconnect works even for fast disconnects that never triggered bot-ification. Decouples two separate concerns that were accidentally coupled.

**[Reconnect #7-R]: Server-Issued Token (Authority Reversal)**
_Concept:_ On first connect (no token), server issues the token rather than the client generating it. Flow: `HANDSHAKE { token: null }` → server responds `HANDSHAKE_ACK { freshToken }` → client stores it. Server owns issuance and can invalidate by simply not recognising old tokens after a session reset.
_Novelty:_ Server is full authority — no client-side UUID generation needed. Hard reset invalidation is automatic.

**[Race #14]: Reconnect During Scene Transition**
_Concept:_ If a player reconnects exactly during a scene transition, server holds the INIT until the transition resolves, then sends the correct scene state.
_Novelty:_ Avoids controller getting stuck on a screen that no longer exists.

**[Race #15]: Wall-Clock Cooldown Timestamps**
_Concept:_ Cooldowns stored as `expiresAt` wall-clock timestamps server-side. On reconnect the raw values are sent; controller checks `Date.now() < expiresAt`. Expired cooldowns arrive as 0. No special "restore cooldown" code path needed.
_Novelty:_ Cooldown restoration is a zero-cost consequence of using wall-clock time. The math just works.

---

### Rejoin Flow

**[Rejoin #5]: Controller-Initiated Rejoin via Header Button**
_Concept:_ A visible button in the controller header. Tapping it immediately emits `REJOIN` to server — old character drops from the game instantly, sessionStorage token clears, controller flips to name screen (name pre-filled, class cleared).
_Novelty:_ Player owns the decision. Character disappears the moment the button is tapped, no ambiguity.

**[Rejoin #6]: Server-Initiated `FORCE_REJOIN` with Reason Field**
_Concept:_ Server can push `FORCE_REJOIN { reason: 'kicked_by_host' | 'session_reset' | 'voluntary' }` to a specific controller or all controllers. Controller clears its token and navigates to name screen with an appropriate message per reason.
_Novelty:_ One event handles kick, reset, and voluntary rejoin — single code path, consistent UX, different messaging.

---

### Session Lifecycle

**[GameState #7]: Pre-Lobby "Staging" State**
_Concept:_ New server state `'staging'` between server boot and lobby active. Players join via QR, complete name/class, and land on a live ability briefing screen showing who else has joined. Server is not ticking or processing inputs. Host hits "Start Game" → controllers snap from briefing into the game controller view.
_Novelty:_ Decouples "players can join" from "game is running." Creates a natural pre-game ritual. Staging is always-open from server boot — players can join before the host even loads.

**[Session #C]: Internal-Only Session ID**
_Concept:_ Server generates a short session ID on boot (or hard reset). ID is never exposed in URLs — it's a server-side validation stamp embedded in issued tokens. QR code stays simple. On reset: new ID generated → all old tokens become invalid → `FORCE_REJOIN` broadcast to all controllers.
_Novelty:_ Players refresh the page after reset, not rescan. Clean invalidation without pushing anything to clients.

**[Host #12]: Hard Reset with Confirmation Guard**
_Concept:_ Hard reset (nuke session, drop all players, new session ID) requires two-step confirm on host UI — hold 2 seconds or confirm dialog. Accidental tap during live game is catastrophic; friction is intentional.
_Novelty:_ Asymmetric UX — easy to start, hard to destroy. Matches severity of the action.

**[Session #P]: Staging Doubles as "Game Paused" Recovery**
_Concept:_ Staging state can be re-entered from an active game if the host needs to pause mid-campaign. Players land on briefing, server stops ticking, host restarts when ready.
_Novelty:_ Reuses the same state for two scenarios — no new state needed for mid-game holds.

---

### Host Controls

**[Host #10]: Waiting Room Panel in Staging**
_Concept:_ During staging, host sees a live list of connected players, their chosen class, and a ✓/○ indicator for "on ability briefing" vs. "still in name/class flow." "Start Game" button is disabled until at least one player has reached briefing.
_Novelty:_ Host has full situational awareness before committing to start. Eliminates "I started too early."

**[Host #11]: Per-Player Kick**
_Concept:_ Host can kick individual players from the waiting room panel. Kicked player receives `FORCE_REJOIN { reason: 'kicked_by_host' }`. Useful during staging before the game starts.
_Novelty:_ Surgical removal without nuking the whole session.

**[Host #M]: Extended Bot-ify Delay**
_Concept:_ With zero-tax reconnect guaranteed, extend the bot-ify delay to 2–3 minutes. Less pressure on the player to reconnect instantly — their character holds on longer.
_Novelty:_ Zero-tax restore makes a longer window safe. Directly improves the live-game experience.

---

### Staging UX

**[Staging #M]: Live Social Briefing Screen**
_Concept:_ The ability briefing screen during staging is animated and live — shows who else has joined, their class icons, a "waiting for host to start" indicator. Turns a passive wait into a social moment.
_Novelty:_ Players arrive at a screen that feels alive, not a dead-end wait.

**[Edge #8]: Staging vs. Live Reconnect Destinations**
_Concept:_ Disconnect during staging → reconnect lands on ability briefing. Disconnect during live game → reconnect lands on game controller view. Server drives the destination via `you.screen` in INIT.
_Novelty:_ One reconnect system, two destination screens — driven by server state, not client guesswork.

**[Race #13]: Players Join Before Host Loads**
_Concept:_ Staging state is active from server boot. Players scanning QR before the host has loaded simply wait longer on briefing — no error.
_Novelty:_ Makes join flow resilient to host-load-order variance.

---

## Decision Trees — Implementation Map

### Tree 1 — Controller Connects (Every Connect Event)

```
Controller opens page / reconnects
│
└── Send HANDSHAKE { token: sessionStorage.token ?? null, name: sessionStorage.name ?? null }
    │
    ├── token valid + matches current session + player in disconnectedPlayers
    │   └── RECLAIM → emit INIT { you: { id, name, className, hp, cooldowns, upgrades, screen } }
    │       └── Controller: skip onboarding → jump to you.screen
    │
    ├── token exists but session ID mismatch (after hard reset)
    │   └── emit FORCE_REJOIN { reason: 'session_reset' }
    │       └── Controller: clear token → name screen (name pre-filled), "Session was reset"
    │
    ├── token exists but not in disconnectedPlayers (unknown)
    │   └── emit FORCE_REJOIN { reason: 'session_reset' }
    │
    └── no token
        └── emit HANDSHAKE_ACK { freshToken }
            └── Controller: store token → name screen (name pre-filled if stored)
```

### Tree 2 — Player Registration

```
Player on name screen
│
├── Enters name → confirm → store name in sessionStorage → class select
│   └── Picks class → confirm → emit JOIN { token, name, className }
│       │
│       ├── game state 'staging' → register → INIT → ability briefing
│       └── game state 'lobby'/'battle' → register → INIT → game controller view
```

### Tree 3 — Rejoin Flow

```
├── [A] Voluntary (header button)
│   └── emit REJOIN → server: PLAYER_LEFT broadcast + FORCE_REJOIN { reason: 'voluntary' }
│       └── Controller: clear token → name screen (name pre-filled)
│
├── [B] Host kicks player
│   └── emit KICK { playerId } → PLAYER_LEFT + FORCE_REJOIN { reason: 'kicked_by_host' }
│       └── Controller: "You were removed by the host"
│
└── [C] Hard reset
    └── Hold confirm → emit SESSION_RESET → new session ID + FORCE_REJOIN all
        └── All controllers: clear token → name screen, "Session was reset"
```

### Tree 4 — Staging → Game Start

```
Staging active → players join → ability briefing (live roster panel)
Host sees: names, classes, ✓/○ readiness
│
└── Host hits "Start Game" (≥1 player ready)
    └── SERVER_START → broadcast SCENE_CHANGE { scene: 'lobby' }
        ├── Controllers on briefing → snap to game controller view
        └── Controllers still in name/class → finish flow → enter at current scene
```

### Tree 5 — Disconnect During Active Game

```
Player socket drops
│
└── Server: move to disconnectedPlayers { sessionToken, fullState, disconnectedAt }
    └── Start bot-ify timer (2–3 min)
        ├── Player reconnects before timer → RECLAIM → zero-tax restoration
        └── Timer expires → bot-ify (disconnectedPlayers entry stays)
            └── Player reconnects later → RECLAIM from bot control, full state restored
```

---

## Prioritization

### Tier 1 — Core Reconnect (Ship First, Highest User Impact)

| # | Item | Why first |
|---|---|---|
| 1 | `disconnectedPlayers` map (decouple from bots) | Unblocks all reconnect reliability |
| 2 | `HANDSHAKE` event replaces JOIN reconnect split | Single clean entry point |
| 3 | `you` field in INIT | Keystone — everything else hangs off this |
| 4 | sessionStorage token + name storage | Prevents dual-connect, enables name pre-fill |
| 5 | Controller reads `you`, jumps to correct screen | The visible user-facing payoff |
| 6 | Wall-clock cooldown timestamps | Enables zero-tax cooldown restore |
| 7 | `FORCE_REJOIN { reason }` event | Shared path for kick/reset/voluntary |

### Tier 2 — Session Lifecycle (Ship Second, Host-Facing)

| # | Item | Why second |
|---|---|---|
| 8 | `staging` game state on server | Gate for everything below |
| 9 | Ability briefing screen (static) | Controller destination during staging |
| 10 | Host waiting room panel | Host situational awareness |
| 11 | `HOST_START` → staging → lobby transition | The actual start-game flow |
| 12 | Hard reset with confirmation guard + new session ID | Session management completion |
| 13 | Per-player kick from waiting room | Host control granularity |

### Tier 3 — Polish (After Core is Stable)

| # | Item |
|---|---|
| 14 | Live/social briefing screen (animated roster) |
| 15 | Extended bot-ify delay (2–3 min) |
| 16 | Server-issued token (replaces client UUID generation) |
| 17 | Staging as mid-game pause recovery |

---

## Action Plan

### Track A — Reconnect (independent, ~3–4 days)

1. **Add `disconnectedPlayers` map to GameServer** — populate on `_onDisconnect`, keyed by `sessionToken`. Keep bot-ify as a separate timer reading from this map.
2. **Add `HANDSHAKE` event** — replaces the reconnect branch in `_onJoin`. Check `disconnectedPlayers` first, then route to reclaim or fresh registration.
3. **Add `you` field to `buildFullState()`** — pass the requesting socket so `StateSerializer` can attach the player's own slice. Shape: `{ id, name, className, hp, cooldowns, upgrades, screen }`.
4. **Update `App.svelte`** — move token to `sessionStorage`, store name on confirm, always emit `HANDSHAKE` on connect, read `you` from INIT to set `myId`, `playerName`, `className`, and jump to correct screen.
5. **Convert cooldowns to wall-clock `expiresAt`** — server stores timestamps, controller checks `Date.now() < expiresAt`.
6. **Add `FORCE_REJOIN { reason }` event** — controller handler clears token, navigates to name screen, shows reason message.

### Track B — Session Lifecycle (independent, ~3–4 days)

1. **Add `staging` state to server** — initial state on boot, not ticking, not processing inputs. `HOST_START` event transitions to lobby.
2. **Add ability briefing screen to controller** — static version: shows class skills after JOIN is confirmed in staging state.
3. **Add host waiting room panel** — consumes existing player list + a `ready` flag (true when player has reached briefing). Disable "Start Game" until ≥1 ready.
4. **Wire `HOST_START`** — host emits, server transitions state, broadcasts `SCENE_CHANGE { scene: 'lobby' }`.
5. **Add hard reset** — `SESSION_RESET` event: new session ID, clear `disconnectedPlayers`, broadcast `FORCE_REJOIN { reason: 'session_reset' }` to all, confirmation guard on host UI.
6. **Add per-player kick** — `KICK { playerId }` event → `PLAYER_LEFT` broadcast + `FORCE_REJOIN` to target socket.

---

## Session Summary

**Ideas generated:** 23 across 4 techniques
**Techniques used:** What If Scenarios → Mind Mapping → SCAMPER → Decision Tree Mapping

**Key breakthroughs:**
- The `you` field in INIT is the keystone of the entire reconnect system — one change unlocks seamless reconnect, correct screen routing, and zero-tax restore simultaneously
- `sessionStorage` solves the dual-connection problem for free — no server enforcement needed
- `FORCE_REJOIN { reason }` unifies voluntary rejoin, host kick, and session reset into a single code path
- The two implementation tracks (reconnect + session lifecycle) are fully independent — can ship separately or in parallel

**What Cyby confirmed during the session:**
- No reconnect tax — full state restore is non-negotiable
- Name in storage, class always fresh
- Session ID is internal-only — QR stays clean, players refresh not rescan on reset
- Character drops immediately on any rejoin trigger
- Class selection timing: always before "Start Game" (not reversed)
