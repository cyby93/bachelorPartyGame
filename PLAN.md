# RAID NIGHT - THE RESCUE: Full Rebuild Plan

## Overview

Party game for local multiplayer: host on TV/monitor (big screen), 10+ players join on their phones as controllers. Real-time top-down cooperative game where players fight waves of enemies and a final boss.

**Core loop:** Lobby (skill practice) → Trash Mob wave (50 kills) → Boss Fight (Illidan) → Result screen

---

## Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Build tool | **Vite** | Zero-config, fast HMR, ESM-native, multi-page support |
| Host renderer | **PixiJS v8** | WebGL sprite batching, particle effects, easy Canvas 2D-like API |
| Controller UI | **Svelte** (compiled, no SSR) | Reactive HP/cooldowns, no runtime overhead, tiny on mobile |
| Game simulation | **Server-authoritative** | Correct multiplayer model — no desync possible |
| State sync | **Delta broadcast at 20 FPS** | Bandwidth efficient; host interpolates at 60 FPS |
| Networking | **Socket.io** | Auto-reconnect, LAN-friendly, rooms |
| Audio | **PixiJS Sound** | Integrated with renderer, Web Audio API underneath |
| Shared config | **`shared/` directory** | Single source of truth used by both server and clients |

---

## Project Structure

```
raid-night/
├── server/
│   ├── index.js                  # Express + Socket.io entry point
│   ├── GameServer.js             # Authoritative game loop (20 FPS tick)
│   ├── entities/
│   │   ├── ServerPlayer.js       # Server-side player: position, HP, effects
│   │   ├── ServerBoss.js         # Server-side boss AI (phase-based)
│   │   └── ServerEnemy.js        # Server-side enemy AI (chase nearest player)
│   └── systems/
│       ├── SkillSystem.js        # Authoritative skill execution + routing
│       ├── CollisionSystem.js    # Circle-circle collision checks
│       └── CooldownSystem.js     # Single source of truth for all cooldowns
│
├── client/
│   ├── host/
│   │   ├── main.js               # Host entry point — PixiJS Application setup
│   │   ├── HostGame.js           # State receiver + interpolation + scene manager
│   │   ├── scenes/
│   │   │   ├── LobbyRenderer.js  # Player list, QR code, "waiting" state
│   │   │   ├── BattleRenderer.js # Main game view — players, enemies, boss, effects
│   │   │   └── ResultRenderer.js # MVP, stats, victory/defeat screen
│   │   └── entities/
│   │       ├── PlayerSprite.js   # PixiJS sprite: colored shape + class icon + HP bar
│   │       ├── BossSprite.js     # PixiJS sprite: multi-part with wing detail
│   │       ├── EnemySprite.js    # PixiJS sprite: simple enemy shape
│   │       └── ProjectileSprite.js # PixiJS Graphics + particle tail
│   │
│   └── controller/
│       ├── main.js               # Svelte entry point
│       ├── App.svelte            # Root — manages screen transitions
│       ├── screens/
│       │   ├── JoinScreen.svelte    # Name input + class picker with icons
│       │   ├── LobbyScreen.svelte   # "Waiting for host" + class info display
│       │   └── GameScreen.svelte    # Move joystick + skill grid + HP bar
│       └── components/
│           ├── MoveJoystick.svelte  # nipplejs wrapper component
│           ├── SkillButton.svelte   # Handles INSTANT/DIRECTIONAL/TARGETED/SUSTAINED input
│           └── CooldownOverlay.svelte # CSS conic-gradient countdown animation
│
├── shared/
│   ├── ClassConfig.js            # 8 classes with stats (HP, speed, color)
│   ├── SkillDatabase.js          # 32 skills (8 classes × 4), includes inputType field
│   ├── GameConfig.js             # Canvas size, collision radii, revive constants
│   └── protocol.js               # Socket event name constants (avoid magic strings)
│
├── index.html                    # Host page entry (served at /)
├── controller.html               # Controller page entry (served at /controller)
├── vite.config.js                # Multi-page build config
└── package.json
```

---

## Architecture: Server-Authoritative Model

### Old (broken) model
```
Phone → socket → Server (relays only) → Host client (simulates game) → Server (relays back)
```
Problem: game logic runs on one client. Any disconnect = desynced state. No way to validate inputs.

### New (correct) model
```
Phone → socket → Server (simulates, authoritative) → Host client (renders only)
                                                    → All phones (UI state updates)
```
The server runs the game loop. Clients only render what the server tells them.

### Server Game Loop (20 FPS tick)
1. Dequeue all player inputs received since last tick (move vectors, skill activations)
2. Update player positions (deltaTime-normalized: `pos += input * speed * dt`)
3. Update enemy/boss AI
4. Check all collisions (projectile vs entity, melee hitbox vs entity)
5. Apply skill effects (damage, heal, debuffs, buffs)
6. Advance cooldowns, effect timers, cast states
7. Check win/lose conditions
8. Broadcast delta state to all connected clients

### State Synchronization

**Input protocol (phone → server, max 20 Hz):**
```js
socket.emit('input:move',  { x: 0.5, y: -0.7 })
socket.emit('input:skill', { index: 2, vector: { x: 1, y: 0 } })
```

**Delta broadcast (server → all, 20 Hz):**
```js
socket.emit('state:delta', {
  tick: 1234,
  players:     { [id]: { x, y, hp, isDead, effects } },  // only changed fields
  projectiles: [...],   // full list (short-lived, cheap to send)
  enemies:     [...],   // position + hp only
  boss:        { hp, x, y, phase }
})
```

**Host interpolation:**
Host renders at 60 FPS, receives at 20 FPS. Linear interpolation between last two received states smooths all movement.

---

## Ability System

### Core Principle: Separate Input Type from Effect Type

`type` = what happens server-side (damage, movement, buff, etc.)
`inputType` = how the player interacts on the controller

This decoupling means the controller knows exactly how to handle each skill button without inferring behavior from the effect type.

### The Four Input Types

| inputType | Controller interaction | Used by |
|---|---|---|
| `INSTANT` | Single tap — no direction | AOE_SELF (Thunder Clap), BUFF (Ghost Wolf, Sprint) |
| `DIRECTIONAL` | Drag to aim direction → release to fire | PROJECTILE, **MELEE**, DASH, CAST |
| `TARGETED` | Drag to aim at a landing spot | AOE_LOBBED (Flash Heal, Explosive Trap) |
| `SUSTAINED` | Press and hold; direction while held | SHIELD (Divine Shield) |

**Melee is `DIRECTIONAL`** — same interaction as Fireball or Charge. The player drags on the melee button to choose the cone direction, then releases. No auto-targeting.

### SkillDatabase Shape (with inputType)

```js
// Example entries showing the inputType field
{
  name: 'Cleave',
  type: 'MELEE',
  inputType: 'DIRECTIONAL',   // drag to aim the cone
  cooldown: 1000,
  damage: 50,
  range: 80,
  angle: Math.PI / 3,
  icon: '⚔️'
},
{
  name: 'Thunder Clap',
  type: 'AOE',
  subtype: 'AOE_SELF',
  inputType: 'INSTANT',       // tap — always centered on player
  cooldown: 5000,
  ...
},
{
  name: 'Divine Shield',
  type: 'SHIELD',
  inputType: 'SUSTAINED',     // hold to maintain, drag to rotate
  ...
}
```

### Complete inputType Map

| Class | S1 | S2 | S3 | S4 |
|---|---|---|---|---|
| Warrior | DIRECTIONAL (Cleave) | INSTANT (Thunder Clap) | DIRECTIONAL (Charge) | INSTANT (Shield Wall) |
| Paladin | DIRECTIONAL (Hammer Swing) | DIRECTIONAL (Judgement) | SUSTAINED (Divine Shield) | INSTANT (Consecration) |
| Shaman | DIRECTIONAL (Lightning Bolt) | DIRECTIONAL (Chain Heal) | INSTANT (Ghost Wolf) | INSTANT (Bloodlust) |
| Hunter | DIRECTIONAL (Shoot Bow) | DIRECTIONAL (Multi-Shot) | DIRECTIONAL (Disengage) | TARGETED (Explosive Trap) |
| Priest | DIRECTIONAL (Smite) | TARGETED (Flash Heal) | DIRECTIONAL (PW:Shield) | INSTANT (Mass Rez) |
| Mage | DIRECTIONAL (Fireball) | INSTANT (Frost Nova) | DIRECTIONAL (Blink) | DIRECTIONAL (Pyroblast) |
| Druid | DIRECTIONAL (Wrath) | INSTANT (Bear Form) | DIRECTIONAL (Cat Dash) | INSTANT (Tranquility) |
| Rogue | DIRECTIONAL (Sinister Strike) | INSTANT (Fan of Knives) | INSTANT (Sprint) | INSTANT (Ambush) |

### Server-Side Skill Execution

```js
class SkillSystem {
  handleInput(gameState, playerId, skillIndex, vector) {
    const player = gameState.players[playerId]
    const config = getSkillConfig(player.className, skillIndex)

    if (this.cooldowns.isOnCooldown(playerId, skillIndex)) return

    // Route to handler by effect type
    const handlers = {
      PROJECTILE: this.spawnProjectile,
      MELEE:      this.executeConeMelee,   // uses vector for cone direction
      AOE:        this.executeAOE,
      DASH:       this.executeDash,
      BUFF:       this.applyBuff,
      SHIELD:     this.activateShield,
      CAST:       this.startCast,
    }

    handlers[config.type](gameState, player, config, vector)
    this.cooldowns.start(playerId, skillIndex, config.cooldown)
  }
}
```

---

## Game Content

### Classes (8 total)

| Class | Role | HP | Speed | Color |
|---|---|---|---|---|
| Warrior | Tank (melee, AoE stun, charge, shield wall) | 150 | 2.5 | Blue |
| Paladin | Tank/Heal (melee, holy bolt, directional shield, consecration) | 140 | 2.3 | Gold |
| Shaman | DPS/Heal (lightning, chain heal, speed buff, bloodlust) | 110 | 2.6 | Purple |
| Hunter | Ranged DPS (bow, multi-shot, backflip dash, explosive trap) | 100 | 3.0 | Green |
| Priest | Healer (smite, AOE heal lob, shield ally, mass resurrection) | 90 | 2.4 | White |
| Mage | Glass cannon (fireball, frost nova, blink, pyroblast cast) | 85 | 2.5 | Red |
| Druid | Hybrid (wrath, bear form toggle, cat dash, tranquility channel) | 120 | 2.7 | Teal |
| Rogue | Assassin (directional strike, fan of knives, sprint, stealth) | 95 | 3.2 | Dark |

### Scene Flow

```
[Lobby]
  Players join, select class, practice all 4 skills freely
  Host sees player list + QR code + START button
       ↓ host clicks START
[TrashMob Wave]
  Kill 50 enemies (spawn from edges, chase nearest player)
  Progress counter shown on screen
  Lose: all players dead → GameOver scene
       ↓ 50 kills reached
[Boss Fight]
  Illidan Stormrage — 3 phases (100%/60%/30% HP thresholds)
  Phase 1: slow chase + basic attacks
  Phase 2: faster + adds new abilities
  Phase 3: enraged — maximum speed + most dangerous abilities
  Die/revive mechanic: dead players become tombstones
  Living players can stand near a tombstone for 3 seconds to revive
  Lose: all players dead → GameOver scene
  Win: boss reaches 0 HP → Result scene
       ↓
[Result / GameOver]
  Shows: MVP (most damage), Most Deaths, total time, kill count
  Host can restart → back to Lobby
```

### Mechanics

**Movement:**
- Server-side: `position += inputVector * speed * deltaTime`
- Boundary clamped to arena bounds
- Effects can modify speed (slowed, rooted, hasted)

**Death & Revive:**
- Dead player becomes a tombstone at their position
- Any living player who stands within 80px of a tombstone for 3 consecutive seconds revives them at 40% HP
- Progress is shown as a fill ring on the tombstone

**Damage model:**
- Projectile: instant damage on collision
- Melee: cone check — entities within `range` distance AND within `angle/2` of the aim direction take damage
- AOE_SELF: radius check centered on caster
- AOE_LOBBED: projectile flies to target point, then AOE detonates
- DOT effects: damage/heal ticks at `tickRate` interval for `duration` ms

**Cooldowns:**
- Tracked exclusively on the server (`CooldownSystem.js`)
- Server broadcasts cooldown state to the relevant phone as part of player state delta
- Controller animates the cooldown overlay based on received data (no local tracking)

---

## Visual Design (PixiJS)

### Layering (back to front)
1. Background — tiled dungeon texture (CC0 asset)
2. AOE ground effects (rings, zones)
3. Enemies
4. Boss
5. Players
6. Projectiles + particle trails
7. Hit effects (flash, explosion bursts)
8. UI (HP bars, cast bars, tombstones, name labels)

### Entity Visuals
- **Players**: colored filled shape by class role (circle = caster, square = tank, triangle = ranger, pentagon = hybrid) + emoji class icon rendered to texture once and cached
- **Boss**: large sprite with animated wings (oscillating y-offset), glowing red eyes, distinct silhouette
- **Enemies**: small red triangles, slightly randomized size
- **Projectiles**: colored circle + short particle trail matching caster color
- **Hit flash**: tint entity to white for 80ms on any damage taken
- **Death**: particle burst at death position, then tombstone sprite fades in

### Controller Layout
```
┌──────────────────────────────────────┐
│  [Name]  [Class icon]  ████ HP ████  │
├──────────────────┬───────────────────┤
│                  │   [SK2]    [SK4]  │
│  MOVE JOYSTICK   │                   │
│  (nipplejs,      │   [SK1]    [SK3]  │
│   dynamic mode)  │                   │
└──────────────────┴───────────────────┘
```
- Skill buttons show: icon, name, cooldown overlay (CSS conic-gradient, no JS animation loop)
- DIRECTIONAL buttons: drag shows an aim arrow indicator, release fires
- INSTANT buttons: visual tap feedback (scale pulse)
- SUSTAINED buttons: highlighted border while held
- Dead state: controls replaced with "YOU ARE DEAD — waiting for revive..." overlay

---

## Implementation Phases

### Phase 1 — Foundation
- [ ] Initialize Vite multi-page project (host + controller output pages)
- [ ] Create `shared/` with ClassConfig, SkillDatabase (add inputType field), GameConfig, protocol constants
- [ ] Build Express + Socket.io server skeleton
- [ ] Implement `GameServer.js` authoritative game loop (20 FPS tick)
- [ ] Implement `ServerPlayer.js` (movement, HP, boundary clamping, deltaTime-normalized)
- [ ] Implement `CooldownSystem.js` (server-side single source of truth)
- [ ] Implement socket protocol: `input:move`, `input:skill`, `state:delta`
- [ ] Implement player join/leave/reconnect handling

### Phase 2 — Host Renderer
- [ ] Set up PixiJS v8 Application on host page
- [ ] Implement sprite pool/factory for players, enemies, boss
- [ ] Implement `LobbyRenderer` (player list, QR code, class colors)
- [ ] Implement `BattleRenderer` (state delta consumer, linear interpolation, renders all entities)
- [ ] Implement `ResultRenderer` (MVP stats, victory/defeat, restart button)
- [ ] Add layered container structure (background, entities, UI)

### Phase 3 — Controller UI ✅
- [x] Set up Svelte on controller page
- [x] `JoinScreen.svelte` — name input + class picker (class grid with color highlight)
- [x] `LobbyScreen.svelte` — waiting display with class info + skill list
- [x] `GameScreen.svelte` — move joystick + 2×2 skill grid + HP bar + dead overlay
- [x] `SkillButton.svelte` — reads `inputType` from SkillDatabase, handles all 4 interaction modes
- [x] `CooldownOverlay.svelte` — CSS conic-gradient countdown via @property (no JS loop)
- [x] Responsive layout for various phone screen sizes and orientations

### Phase 4 — Skill System ✅
- [x] Port all 32 skill configs to `shared/SkillDatabase.js` with `inputType` field added
- [x] Implement `SkillSystem.js` on server — clean single routing pipeline
- [x] PROJECTILE handler: spawn projectile with velocity, track lifetime
- [x] MELEE handler: cone check — direction from aim vector, hits all in arc
- [x] AOE_SELF handler: radius damage/heal/debuff centered on caster
- [x] AOE_LOBBED handler: spawn AOE projectile, detonate on arrival
- [x] DASH handler: teleport or physics dash with boundary safety
- [x] BUFF handler: apply timed stat modifier
- [x] SHIELD handler: directional block state, SUSTAINED input protocol
- [x] CAST handler: charge state machine (start → hold → release/cancel → fire)
- [x] Multi-projectile subtype (Hunter Multi-Shot): fan of N projectiles

### Phase 5 — Game Content ✅
- [x] `ServerEnemy.js` — spawn from edges, chase nearest living player, simple melee contact damage
- [x] Enemy spawn schedule for TrashMob scene (1–3 every 2s, max 50 concurrent)
- [x] `ServerBoss.js` — Illidan: 3-phase AI, phase ability patterns
- [x] Death / tombstone / revive system (server-side timer, progress broadcast)
- [x] Win/lose condition checks and scene transition signals
- [x] Stats tracking: damage per player, death count, kill count, time

### Phase 6 — Polish ✅
- [x] Enemy sprites pooled and rendered in BattleRenderer (trashMob mode)
- [x] Boss sprite pooled and rendered in BattleRenderer (bossFight mode)
- [x] Projectile sprites pooled and rendered in both battle modes
- [x] Tombstone graphics with revive progress ring drawn in BattleRenderer
- [x] HostGame.js forwards enemies/projectiles/tombstones/stats from server delta
- [x] Particle effects: hit sparks on player HP drop, death bursts on enemy/player death
- [x] Projectile trails: fading 4-frame history on ProjectileSprite
- [x] Background: procedural dungeon stone tiles replacing plain grid
- [x] Sound effects: Web Audio API synthesizer (hit, death, transition, victory, defeat, boss)
- [x] Controller haptic feedback: 20ms vibrate on skill touchstart (Vibration API)
- [x] Reconnection: controller re-emits JOIN on socket reconnect if already past join screen
- [x] Fullscreen button in host sidebar (Fullscreen API, toggles label)

---

## What Is Preserved from the Previous Version

| Kept | Notes |
|---|---|
| Skill configs (32 skills) | Ported to `shared/SkillDatabase.js`, `inputType` field added |
| Class configs (8 classes) | Ported to `shared/ClassConfig.js` unchanged |
| GameConfig constants | Ported to `shared/GameConfig.js` |
| BossConfig (Illidan) | Ported to `shared/BossConfig.js` |
| Scene flow | Lobby → TrashMob → BossFight → Result — identical |
| Collision math | Circle-circle distance check — same algorithm |
| nipplejs for move joystick | Wrapped in Svelte component |

## What Is Rewritten

| Old | New | Reason |
|---|---|---|
| `server.js` (relay only) | `server/GameServer.js` (authoritative loop) | Correct multiplayer model |
| Canvas 2D scenes | PixiJS renderers (pure display) | Performance, visual quality |
| `Game.js` (simulates + renders) | `HostGame.js` (renders only) | Separation of concerns |
| `InputManager.js` | `SkillButton.svelte` + `MoveJoystick.svelte` | Better UX, reactive UI |
| `SkillManager.js` (dual system) | `SkillSystem.js` (clean single pipeline) | Remove legacy code debt |
| All `handlers/` | Server-side handlers in `SkillSystem.js` | Authoritative execution |
| `Player.js` / `Boss.js` (simulate + render) | `ServerXxx.js` + `XxxSprite.js` split | Single responsibility |
| `VisualEffectsRenderer.js` | PixiJS particle containers | GPU-accelerated |
| Raw HTML pages | Vite-built pages | Bundling, cache optimization |
| Cooldown on controller | Cooldown on server → broadcast to controller | Single source of truth |
