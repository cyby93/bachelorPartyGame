# Level Design Overview — RAID NIGHT: THE RESCUE

Canonical implementation reference for all 6 campaign levels. Future tasks that implement individual levels or the systems they depend on should use this document as the source of truth for design intent, expected behaviors, and tuning values.

## Related Files

| File | Role |
|------|------|
| `shared/LevelConfig.js` | Campaign array — level definitions live here |
| `shared/EnemyTypeConfig.js` | Enemy type registry (stats, AI, visuals) |
| `shared/BossConfig.js` | Boss stat blocks and abilities |
| `shared/GameConfig.js` | Canvas size, tick rate, player constants |
| `server/GameServer.js` | Objective evaluation, level setup, scene flow |
| `server/systems/SpawnSystem.js` | Enemy spawn logic |
| `server/systems/BuildingSpawnSystem.js` | Building-driven enemy spawning |
| `server/entities/ServerBuilding.js` | Destructible spawner building entity |
| `server/entities/ServerEnemy.js` | Enemy AI dispatch |
| `docs/CAMPAIGN.md` | Campaign flow contracts |

## Notation

- **`[NEW]`** — System or feature that does not exist yet and must be built.
- **`[EXISTS]`** — System or feature already implemented in the codebase.
- All HP, damage, and timing values are **suggested defaults** for tuning. They can be adjusted during implementation without violating the design.
- Difficulty scaling values use the existing formula: `multiplier = base + perPlayer * (playerCount - 1)`.

---

# New Systems Required

These are cross-cutting systems that must be built before the levels that depend on them. Listed in suggested implementation order.

---

## S1. Discrete Wave Spawning `[NEW]`

**Purpose:** Spawn enemies in discrete batches where all enemies in a wave must die before the next wave begins.

**Required by:** Level 1

**Depends on:** Nothing (extends existing `SpawnSystem`)

**Current state:** `SpawnSystem` only supports continuous timer-based spawning. There is no concept of waves, wave completion, or between-wave pauses.

**Key behaviors:**
- A wave spawns all its enemies at once (or in a rapid burst)
- The system tracks how many enemies from the current wave are still alive
- When all wave enemies are dead, a configurable delay passes, then the next wave spawns
- Wave composition is driven by a **progressive random** algorithm: the wave number determines the enemy pool size and which enemy types are available (early waves = fewer, simpler enemies; later waves = more enemies from a wider pool)
- The level is complete when all waves have been cleared

**Config shape (addition to LevelConfig):**
```js
spawning: {
  mode: 'wave',                    // vs 'continuous' for existing behavior
  waveCount: 8,                    // total waves to survive
  betweenWaveDelayMs: 3000,        // pause between waves
  spawnEdge: 'right',              // which edge(s) enemies spawn from
  progression: [
    // Each entry defines what's available FROM that wave onward
    { fromWave: 1, enemyTypes: ['grunt'],                        countRange: [3, 4] },
    { fromWave: 3, enemyTypes: ['grunt', 'archer'],              countRange: [4, 6] },
    { fromWave: 5, enemyTypes: ['grunt', 'archer', 'brute'],     countRange: [5, 8] },
    { fromWave: 7, enemyTypes: ['grunt', 'archer', 'brute', 'healer'], countRange: [6, 10] },
  ]
}
```

**Server scope:** New mode branch in `SpawnSystem` (or a separate `WaveSpawnSystem` class). `GameServer` needs to track `currentWave` and `waveEnemiesAlive`.

**Client scope:** Host objective UI should display current wave number (e.g., "Wave 3 / 8"). Optional between-wave countdown display.

---

## S2. Multi-Room Map System `[NEW]`

**Purpose:** Support maps with multiple rectangular rooms connected by passages that can be open or closed.

**Required by:** Level 2

**Depends on:** Nothing

**Current state:** Arena is a single rectangle. Entities clamp to its boundaries. No concept of rooms, walls, or passages.

**Key behaviors:**
- Each room is a sub-rectangle within a larger bounding box
- Passages are openings between adjacent rooms (defined by position and size)
- A passage can be **blocked** (by a gate) or **open**
- Entity movement must check passage openness — entities cannot cross into a room if the passage is blocked
- When a gate is destroyed, its passage opens permanently
- Entities in open passages can move freely between rooms

**Config shape (addition to LevelConfig):**
```js
arena: {
  width: 2200,
  height: 800,
  rooms: [
    { id: 'left',  x: 0,    y: 0, width: 1060, height: 800 },
    { id: 'right', x: 1140, y: 0, width: 1060, height: 800 },
  ],
  passages: [
    { id: 'passage1', fromRoom: 'left', toRoom: 'right', x: 1060, y: 300, width: 80, height: 200, blockedByGate: 'gate1' }
  ]
}
```

**Server scope:** Entity clamping (`_clampToArena`) must become room-aware. Movement between rooms checks passage state. Collision system may need wall segments for room boundaries.

**Client scope:** Host renderer draws room boundaries (walls) and passage openings. Visual distinction between open and blocked passages.

---

## S3. Destructible Gate Entity `[NEW]`

**Purpose:** Targetable objects with HP that block passages. Destroyed when HP reaches 0, opening the passage.

**Required by:** Level 2

**Depends on:** S2 (Multi-Room Map System)

**Key behaviors:**
- Gates have HP and can be damaged by player skills (projectiles, melee, AOE)
- Gates do NOT move, do NOT attack, and do NOT have AI
- When a gate's HP reaches 0, it is destroyed and its associated passage opens
- Gates are included in the server state delta so the client can render them (HP bar, destruction animation)
- Gate HP scales with player count via difficulty multipliers
- Only the **active gate** (the current objective target) can be damaged; inactive gates are immune

**Config shape:**
```js
gates: [
  { id: 'gate1', passageId: 'passage1', hp: 500, position: { x: 1060, y: 400 }, radius: 30 },
  { id: 'gate2', passageId: 'passage2', hp: 500, position: { x: 2140, y: 400 }, radius: 30 },
]
```

**Server scope:** New `ServerGate` entity class. Integrated into `SkillSystem` collision checks (projectiles, melee cone, AOE radius). Death triggers passage opening.

**Client scope:** Gate sprite with HP bar. Destruction VFX. Visual state change when gate becomes active/targetable.

---

## S4. Gate Repairer Enemy Type `[NEW]`

**Purpose:** An enemy that moves toward the active gate and repairs its HP, creating pressure to split attention between killing enemies and destroying the gate.

**Required by:** Level 2

**Depends on:** S3 (Destructible Gate Entity)

**Key behaviors:**
- AI type: `gateRepairer`
- Moves toward the active gate (not toward players)
- When within repair range, stops and continuously restores gate HP
- If the gate it was assigned to is destroyed, switches to `chase` AI (attacks players)
- Low contact damage — the threat is the repair, not the enemy itself

**EnemyTypeConfig entry:**
```js
gateRepairer: {
  hp: 35,
  speed: 1.1,
  radius: 13,
  contactDamage: 5,
  shape: 'square',
  color: '#8B4513',
  ai: 'gateRepairer',
  repairAmount: 8,       // HP restored per second while in range
  repairRange: 60,       // distance to gate to start repairing
}
```

**Server scope:** New AI branch in `ServerEnemy.update()`. Needs reference to active gate position and HP.

---

## S5. Split-on-Death Enemy Mechanic `[NEW]`

**Purpose:** When an enemy with this config dies, it spawns smaller copies of itself at its death position.

**Required by:** Level 3

**Depends on:** Nothing (extends `ServerEnemy` death handling)

**Key behaviors:**
- On death, spawn `count` child enemies at the parent's position (with slight offset to avoid overlap)
- Children inherit the parent's type but with stats multiplied by `statMultiplier` per generation
- A `generation` counter tracks depth; splitting stops when `generation >= maxGenerations`
- Children are full enemies — they have AI, can be damaged, and count toward kill tracking
- The level's objective system must account for splits (no premature "level complete" while splits are pending)

**Config shape (on enemy type or per-entity):**
```js
splitOnDeath: {
  count: 2,              // number of children spawned
  statMultiplier: 0.75,  // HP, damage, speed, radius multiplied per generation
  maxGenerations: 3,     // generation 0 = original, stops splitting at gen 2
}
```

**Stat scaling across generations (for Leviathan with 0.75x multiplier):**

| Generation | HP | Speed | Radius | Melee Dmg | Ranged Dmg | Count |
|---|---|---|---|---|---|---|
| 0 (original) | 3000 | 0.8 | 50 | 25 | 15 | 1 |
| 1 | 2250 | 0.6 | 37 | 19 | 11 | 2 |
| 2 | 1688 | 0.45 | 28 | 14 | 8 | 4 |
| **Total** | | | | | | **7** |

**Server scope:** Death handling in `GameServer._updateEnemies()` must check for `splitOnDeath` config. Spawn children with reduced stats and incremented generation. Children must be registered with the spawn/enemy tracking system.

---

## S6. Multi-Target Enemy AI (Leviathan) `[NEW]`

**Purpose:** An enemy AI type that simultaneously maintains 1 melee target and N ranged targets, attacking all of them concurrently.

**Required by:** Level 3

**Depends on:** Nothing

**Key behaviors:**
- AI type: `leviathan`
- Selects the **nearest** living player as the melee target — chases and deals contact damage
- Selects up to 2 **other** living players (excluding the melee target) as ranged targets
- Fires ranged projectiles at each ranged target on cooldown
- **Projectile exclusion:** Ranged projectiles pre-populate their hit `Set` with the melee target's player ID, so they pass through the melee target without dealing damage. This uses the existing projectile hit-tracking mechanism in `SkillSystem`.
- If fewer than 3 players are alive, the Leviathan uses what's available (e.g., 1 melee + 1 ranged, or just 1 melee)
- Children (from split-on-death) also use `leviathan` AI but may have fewer simultaneous ranged targets at smaller generations (e.g., gen 1 = 1 ranged target, gen 2 = 0 ranged targets / melee only)

**Server scope:** New AI branch in `ServerEnemy.update()`. Returns multiple action descriptors per tick (melee contact + ranged projectile spawns).

---

## S7. Friendly NPC Entity `[NEW]`

**Purpose:** A server-authoritative allied entity that fights alongside players. Can be targeted by enemies and has a death condition that affects level outcome.

**Required by:** Level 4

**Depends on:** Nothing

**Key behaviors:**
- Has HP, position, speed, radius — similar to a player but AI-controlled
- Attacks a designated target (e.g., Shade of Akama) with basic melee when in range
- Can be damaged by enemies (but NOT by players)
- Death triggers a **loss condition** for the level
- Included in server state delta so the client can render it (sprite, HP bar, name tag)
- Does NOT use player skill system — has simple built-in attack logic

**Config shape (in LevelConfig):**
```js
npcs: [
  {
    id: 'akama',
    name: 'Akama',
    hp: 2000,
    speed: 0.8,
    radius: 25,
    meleeDamage: 15,
    attackCooldown: 1500,   // ms between attacks
    attackRange: 50,        // px
    target: 'shade',        // entity ID to attack (only in Phase 2)
    idleUntilPhase: 2,      // stays idle until phase 2 begins
  }
]
```

**Server scope:** New `ServerNPC` entity class. Integrated into `GameServer` state management. Loss-condition check in `_updateObjectives()`.

**Client scope:** NPC sprite with HP bar, name label, and idle/attack animations.

---

## S8. Enemy Channeling Beam (Warlock Mechanic) `[NEW]`

**Purpose:** Enemies that stand in place and channel a beam to a target entity, applying continuous buffs (HP increase, damage increase) and granting immunity.

**Required by:** Level 4

**Depends on:** Nothing

**Key behaviors:**
- AI type: `channeler`
- Stationary — does not move or chase players
- Channels a visible beam to a designated target entity (e.g., Shade of Akama)
- While **at least one channeler is alive**, the target has `isImmune = true` (cannot take damage)
- Each channeler continuously buffs the target: +HP/s and +damage/s
- Buffs have **no cap** — the longer channelers live, the stronger the target becomes, creating urgency
- When a channeler dies, its beam disappears and its buff contribution stops (but already-applied HP/damage remain)
- Channelers can be attacked and killed by players normally

**EnemyTypeConfig entry:**
```js
warlock: {
  hp: 60,
  speed: 0,
  radius: 14,
  contactDamage: 0,
  shape: 'diamond',
  color: '#6A0DAD',
  ai: 'channeler',
  channelTarget: null,          // set at spawn time to target entity ID
  hpBuffPerSecond: 50,          // HP added to target per second per warlock
  damageBuffPerSecond: 2,       // damage added to target per second per warlock
}
```

**Buff math example (6 warlocks):**
- Per second: +300 HP, +12 damage to Shade
- If players take 20s to kill all warlocks: Shade gains +6000 HP and +240 damage on top of base stats
- If players take 40s: +12000 HP and +480 damage — nearly unsurvivable Phase 2

**Server scope:** New AI branch in `ServerEnemy.update()`. `GameServer` must check warlock count for immunity flag. Buff application runs every server tick.

**Client scope:** Beam VFX from each warlock to target. Immunity visual indicator on target.

---

## S9. New Objective Types `[NEW]`

**Purpose:** Extend the objective system to support the win/lose conditions of Levels 1–4.

**Required by:** Levels 1, 2, 3, 4

**Depends on:** Respective systems per type

| Objective Type | Evaluated As | Complete When | Required By |
|---|---|---|---|
| `surviveWaves` | `currentWave` vs `waveCount` | All waves cleared (last wave enemies dead) | Level 1 |
| `destroyBuildings` | Count of destroyed buildings vs total | All buildings destroyed | Level 2 |
| `destroyGates` | Count of destroyed gates vs total | All gates destroyed | Level 3 |
| `killAll` | All enemies dead AND no pending splits | Enemy count = 0 and no more will spawn | Level 4 |
| `killBossProtectNPC` | Boss dead = win; NPC dead = lose | Boss HP reaches 0 | Level 5 |

**Server scope:** New branches in `GameServer._updateObjectives()` and `_initObjectiveProgress()`. The `killBossProtectNPC` type needs a dual win/lose check — NPC death triggers `gameover` instead of `levelComplete`.

**Config shape:**
```js
// Level 1
objectives: [{ type: 'surviveWaves' }]

// Level 2
objectives: [{ type: 'destroyGates' }]

// Level 3
objectives: [{ type: 'killAll' }]

// Level 4
objectives: [{ type: 'killBossProtectNPC', npcId: 'akama', bossId: 'shade' }]
```

---

# Global Constants and Formulas

## Difficulty Scaling

All per-player scaling uses the existing formula:

```
multiplier = base + perPlayer * (playerCount - 1)
```

Applied to: enemy HP, enemy damage, spawn frequency/count, gate HP, boss HP.

## Timing Defaults

| Constant | Value | Source |
|---|---|---|
| Server tick rate | 20 FPS (50ms) | `[EXISTS]` GameConfig |
| Contact damage rate limit | 500ms per enemy per player | `[EXISTS]` GameServer |
| Revive time | 3000ms at 80px range | `[EXISTS]` GameConfig |
| Between-wave delay | 3000ms | `[NEW]` suggested default |

## Player Reference Stats (for balancing context)

| Stat | Range | Source |
|---|---|---|
| Player HP | 85–160 | ClassConfig |
| Player speed | 2.2–3.2 | ClassConfig |
| Player count | 1–13 | GameConfig |
| Player radius | 20px | GameConfig |

---

# Level 1: Survive the Waves

## Overview

An introductory combat level with no obstacles. Players face increasingly difficult discrete waves of enemies spawning from one side of the map. Clear all waves to win.

## Map Layout

```
+-------------------------------------------+
|                                            |
|                                            |
|   P P                              >> E E  |
|   P P          (open arena)         >> E   |
|                                     >> E E |
|                                            |
|                                            |
+-------------------------------------------+
         1024 x 768 (single room)

P = player spawn area (left side)
E = enemy spawn edge (right side only)
>> = spawn direction (enemies move left)
```

- **Arena:** 1024 x 768 `[EXISTS]`
- **Rooms:** 1 (no walls, no obstacles)
- **Spawn edge:** Right side only

## Objective

- **Type:** `surviveWaves` `[NEW]`
- **Win condition:** All 8 waves cleared (all enemies in the final wave are dead)
- **Lose condition:** All players dead simultaneously

```js
objectives: [{ type: 'surviveWaves' }]
```

## Enemy Roster

| Type | HP | Speed | Radius | Contact Dmg | AI | Spawn Weight | Available From |
|---|---|---|---|---|---|---|---|
| grunt `[EXISTS]` | 30 | 1.2 | 15 | 15 | chase | 3 | Wave 1 |
| archer `[EXISTS]` | 20 | 1.0 | 12 | 5 | ranged (12 dmg projectile) | 1 | Wave 3 |
| brute `[EXISTS]` | 80 | 0.9 | 22 | 30 | chase | 1 | Wave 5 |
| healer `[EXISTS]` | 40 | 1.0 | 14 | 5 | healer (10 HP/heal) | 1 | Wave 7 |

## Spawning Rules

- **Mode:** Discrete waves `[NEW]`
- **Wave count:** 8
- **Between-wave delay:** 3000ms
- **Spawn location:** Right edge of arena (random Y position, 30px margin)
- **Progressive composition:**

| Waves | Enemy Pool | Count Range |
|---|---|---|
| 1–2 | grunt | 3–4 |
| 3–4 | grunt, archer | 4–6 |
| 5–6 | grunt, archer, brute | 5–8 |
| 7–8 | grunt, archer, brute, healer | 6–10 |

Enemy type selection within each wave uses weighted random from the available pool.

## New Systems Used

- S1. Discrete Wave Spawning `[NEW]`
- S9. `surviveWaves` Objective Type `[NEW]`

## Difficulty Tuning

```js
difficulty: {
  hpMult:     { base: 1.0, perPlayer: 0.05 },
  damageMult: { base: 1.0, perPlayer: 0.05 },
  spawnMult:  { base: 1.0, perPlayer: 0.10 },   // affects count range
}
```

## Renderer Notes

- Wave counter UI: "Wave 3 / 8"
- Between-wave countdown timer (optional)
- No special map rendering needed (open arena)

---

# Level 2: The Siege

## Overview

A large square arena with 4 enemy-summoning buildings in the corners. Buildings continuously spawn enemies until destroyed. As buildings fall, the surviving buildings ramp up their spawn rate, creating increasing pressure. Destroy all 4 buildings to win.

## Map Layout

```
+----------------------------------------------+
|  [B1]                                  [B2]  |
|                                              |
|                                              |
|                                              |
|                   P P                        |
|                   P P                        |
|                                              |
|                                              |
|  [B3]                                  [B4]  |
+----------------------------------------------+
                 1000 x 1000

P = player spawn area (center)
[BN] = enemy-spawning building (corners)
```

- **Arena:** 1000 x 1000 (1:1 ratio, large)
- **Rooms:** 1 (no walls, no obstacles)
- **Buildings:** 4, positioned at each corner (120px inset from edges)

## Objective

- **Type:** `destroyBuildings`
- **Win condition:** All 4 buildings destroyed
- **Lose condition:** All players dead simultaneously

```js
objectives: [{ type: 'destroyBuildings' }]
```

## Building Stats

| Building | HP | Position | Size |
|---|---|---|---|
| B1 | 600 | (120, 120) | 60x60 |
| B2 | 600 | (880, 120) | 60x60 |
| B3 | 600 | (120, 880) | 60x60 |
| B4 | 600 | (880, 880) | 60x60 |

Building HP scales with difficulty: `buildingHp * hpMult`.

All buildings are active (damageable) simultaneously — unlike gates, there is no sequential activation.

## Enemy Roster

| Type | HP | Speed | Radius | Contact Dmg | AI | Spawn Weight |
|---|---|---|---|---|---|---|
| grunt | 30 | 1.2 | 15 | 15 | chase | 3 |
| brute | 80 | 0.9 | 22 | 30 | chase | 1 |
| archer | 20 | 1.0 | 12 | 5 | ranged | 2 |
| charger | 50 | 1.4 | 18 | 40 | charger | 1 |

## Spawning Rules

- **Mode:** Building-driven (independent timers per building via `BuildingSpawnSystem`)
- **Base interval:** 3000ms per building
- **Count per spawn:** 1–2 enemies
- **Max alive per building:** 6
- **Spawn location:** Within 80px radius of owning building
- **Buff on destruction:** Each destroyed building speeds up survivors by 25% (stacking)
  - Formula: `effectiveInterval = baseInterval / (1 + buffFactor * destroyedCount) / spawnMult`
  - 0 destroyed: 3000ms, 1 destroyed: 2400ms, 2 destroyed: 2000ms, 3 destroyed: 1714ms

## New Systems Used

- `ServerBuilding` entity — destructible spawner, all active simultaneously
- `BuildingSpawnSystem` — per-building spawn timers with ramping buff
- `destroyBuildings` objective type

## Difficulty Tuning

```js
difficulty: {
  hpMult:     { base: 1.0, perPlayer: 0.06 },
  damageMult: { base: 1.0, perPlayer: 0.05 },
  spawnMult:  { base: 1.0, perPlayer: 0.10 },
}
```

## Renderer Notes

- Building sprites: brown/stone rectangles with HP bars
- Building destruction removes the graphic (no rubble)
- Enemies spawn visibly near buildings

---

# Level 3: Destroy the Gates

## Overview

A two-room map where players must destroy two gates sequentially. Enemies spawn near the active gate and include a new gate repairer type that restores gate HP. After the first gate falls, both rooms open and enemies can follow players between them.

## Map Layout

```
+----------------------+    +----------------------+
|                      |    |                      |
|                      | P  |                      |
|   P P            [GATE 1]--->            [GATE 2]|
|   P P                | A  |                      |
|                      | S  |                      |
|                      | S  |                      |
|         ROOM 1       |    |        ROOM 2        |
+----------------------+    +----------------------+
        1060 x 800     80gap       1060 x 800

Total bounding box: 2200 x 800

P = player spawn area (left side of Room 1)
[GATE N] = destructible gate (blocks passage until destroyed)
PASS = passage between rooms (blocked by Gate 1 initially)
```

- **Arena:** 2200 x 800 total bounding box
- **Rooms:** 2 (left: 1060x800, right: 1060x800)
- **Passage:** Centered vertically between rooms, 80px wide x 200px tall, blocked by Gate 1
- **Gate positions:** Gate 1 at right side of Room 1, Gate 2 at right side of Room 2

## Objective

- **Type:** `destroyGates` `[NEW]`
- **Win condition:** Both gates destroyed
- **Lose condition:** All players dead simultaneously
- **Sequencing:** Gate 1 is the active target first. Gate 2 becomes active (damageable) only after Gate 1 is destroyed.

```js
objectives: [{ type: 'destroyGates' }]
```

## Gate Stats

| Gate | HP | Position | Passage |
|---|---|---|---|
| Gate 1 | 500 | Right side of Room 1 | Blocks passage to Room 2 |
| Gate 2 | 500 | Right side of Room 2 | Level completion target |

Gate HP scales with difficulty: `gateHp * hpMult`.

## Enemy Roster

| Type | HP | Speed | Radius | Contact Dmg | AI | Spawn Weight |
|---|---|---|---|---|---|---|
| grunt `[EXISTS]` | 30 | 1.2 | 15 | 15 | chase | 3 |
| brute `[EXISTS]` | 80 | 0.9 | 22 | 30 | chase | 1 |
| archer `[EXISTS]` | 20 | 1.0 | 12 | 5 | ranged | 1 |
| healer `[EXISTS]` | 40 | 1.0 | 14 | 5 | healer | 1 |
| gateRepairer `[NEW]` | 35 | 1.1 | 13 | 5 | gateRepairer | 2 |

## Spawning Rules

- **Mode:** Continuous `[EXISTS]`
- **Interval:** 2000ms (scaled by spawnMult)
- **Count per wave:** 1–3
- **Max alive:** 12 (scaled by spawnMult)
- **Spawn location:** Near the **active gate** (within ~150px radius of gate position), NOT from arena edges
- **After Gate 1 destroyed:** Spawn point shifts to Gate 2. Existing enemies can follow players between rooms through the now-open passage.

## New Systems Used

- S2. Multi-Room Map System `[NEW]`
- S3. Destructible Gate Entity `[NEW]`
- S4. Gate Repairer Enemy Type `[NEW]`
- S9. `destroyGates` Objective Type `[NEW]`

## Difficulty Tuning

```js
difficulty: {
  hpMult:     { base: 1.0, perPlayer: 0.06 },
  damageMult: { base: 1.0, perPlayer: 0.06 },
  spawnMult:  { base: 1.0, perPlayer: 0.10 },
}
```

## Renderer Notes

- Room walls and passage rendering (open vs blocked visual state)
- Gate sprites with HP bars
- Gate destruction animation/VFX
- Gate repairer enemy visual (distinct shape/color — square, brown)
- Repair beam VFX from repairer to gate (while repairing)
- Minimap or room indicator so players know which room they're in (optional)

---

# Level 3: The Leviathan

## Overview

A single massive Leviathan enemy that attacks 3 players simultaneously and splits into smaller copies on death. No regular enemies — the splitting mechanic IS the challenge. Players must kill all 7 Leviathans across 3 generations to win.

## Map Layout

```
+----------------------------------------------+
|                                              |
|                                              |
|                                              |
|   P P              LEVIATHAN                 |
|   P P                (G0)                    |
|                                              |
|                                              |
|                                              |
+----------------------------------------------+
              1200 x 900 (single room)

P = player spawn area (left side)
LEVIATHAN (G0) = generation 0 Leviathan (center-right)
```

- **Arena:** 1200 x 900 (slightly larger than default for split chaos)
- **Rooms:** 1 (no walls, no obstacles)

## Objective

- **Type:** `killAll` `[NEW]`
- **Win condition:** All Leviathans dead (including all split children) and no pending splits
- **Lose condition:** All players dead simultaneously

```js
objectives: [{ type: 'killAll' }]
```

## Leviathan — Boss-Class Enemy

The Leviathan is NOT implemented as a `ServerBoss` — it uses the `ServerEnemy` system with a new `leviathan` AI type and split-on-death config. This allows children to reuse the same entity system.

### Base Stats (Generation 0)

| Stat | Value |
|---|---|
| HP | 3000 |
| Speed | 0.8 |
| Radius | 50 |
| Contact damage (melee) | 25 |
| Ranged projectile damage | 15 |
| Ranged projectile speed | 180 |
| Ranged attack cooldown | 2000ms |
| Ranged attack range | 400 |
| AI | `leviathan` `[NEW]` |
| Color | `#2E8B57` (sea green) |
| Shape | `circle` |

### Multi-Target Attack Pattern

1. **Melee target:** Nearest living player. Leviathan chases this player and deals contact damage.
2. **Ranged targets:** Up to 2 other living players (excluding melee target). Fires projectiles at each on cooldown.
3. **Projectile exclusion:** Ranged projectiles pre-populate their hit `Set` with the melee target's player ID. Projectiles pass through the melee target without dealing damage.
4. **Fallback:** If fewer than 3 players alive, use available targets (1 melee + 1 ranged, or just 1 melee).

### Split-on-Death

| Generation | HP | Speed | Radius | Melee Dmg | Ranged Dmg | Ranged Targets | Count at Gen |
|---|---|---|---|---|---|---|---|
| 0 (original) | 3000 | 0.8 | 50 | 25 | 15 | 2 | 1 |
| 1 | 2250 | 0.6 | 37 | 19 | 11 | 1 | 2 |
| 2 | 1688 | 0.45 | 28 | 14 | 8 | 0 (melee only) | 4 |

- **Total Leviathans:** 7 (1 + 2 + 4)
- **Total HP pool:** 3000 + 4500 + 6752 = **14,252 HP** (before difficulty scaling)
- Children spawn at parent's death position with slight random offset (±20px) to avoid stacking
- Generation 2 Leviathans do NOT split further (`generation >= maxGenerations`)
- Generation 2 Leviathans use `chase` AI instead of `leviathan` (melee only, simpler behavior)

### EnemyTypeConfig Entry

```js
leviathan: {
  hp: 3000,
  speed: 0.8,
  radius: 50,
  contactDamage: 25,
  shape: 'circle',
  color: '#2E8B57',
  ai: 'leviathan',
  attackRange: 400,
  attackCooldown: 2000,
  _projSpeed: 180,
  _projDamage: 15,
  maxRangedTargets: 2,
  splitOnDeath: {
    count: 2,
    statMultiplier: 0.75,
    maxGenerations: 3,
  },
}
```

## Spawning Rules

- **Mode:** None — no continuous or wave spawning
- **Initial spawn:** 1 Leviathan (generation 0) at center-right of arena
- **All subsequent enemies** come from split-on-death only

## New Systems Used

- S5. Split-on-Death Enemy Mechanic `[NEW]`
- S6. Multi-Target Enemy AI (Leviathan) `[NEW]`
- S9. `killAll` Objective Type `[NEW]`

## Difficulty Tuning

```js
difficulty: {
  hpMult:     { base: 1.0, perPlayer: 0.08 },
  damageMult: { base: 1.0, perPlayer: 0.05 },
  spawnMult:  { base: 1.0, perPlayer: 0.0 },   // no spawning
}
```

## Renderer Notes

- Leviathan sprite that visually scales with generation (smaller each gen)
- Split death animation (parent explodes into 2 children)
- Generation indicator (color shade or size makes generation obvious)
- No boss HP bar — individual enemy HP bars per Leviathan
- Enemy counter UI: "Leviathans remaining: 5 / 7"

---

# Level 4: Shade of Akama

## Overview

A two-phase boss encounter. In Phase 1, players must kill 6 warlock enemies channeling beams that make the boss immune and progressively stronger. In Phase 2, the boss awakens and attacks a friendly NPC (Akama) while random enemies assault the players. Players must kill the boss before Akama falls.

## Map Layout

```
+----------------------------------------------------------+
|                                                          |
|         W   W                                            |
|   A                    W  SHADE  W                       |
|   P P P                                                  |
|   P P                  W   W                             |
|                                                          |
|                                                          |
+----------------------------------------------------------+
                   1400 x 900 (single room)

P = player spawn area (x ~150-250)
A = Akama NPC (x ~250, near players)
SHADE = Shade of Akama (x ~1100, right side)
W = Warlock enemies (6, arranged in circle around Shade, radius ~120)
```

- **Arena:** 1400 x 900
- **Rooms:** 1 (no walls, no obstacles)

## Objective

- **Type:** `killBossProtectNPC` `[NEW]`
- **Win condition:** Shade of Akama dies
- **Lose conditions:** Akama NPC dies OR all players die

```js
objectives: [{ type: 'killBossProtectNPC', npcId: 'akama', bossId: 'shade' }]
```

## Phase 1: Channeling Warlocks

**Trigger:** Level start.

**State:**
- Shade of Akama stands idle at the right side of the room. It is **immune to all damage** while any warlock is alive.
- 6 warlock enemies are arranged in a circle (radius ~120px) around Shade. They are stationary and channel beams to Shade.
- Akama NPC stands idle near players (does nothing in Phase 1).
- No other enemies spawn during Phase 1.

**Warlock stats:**

| Stat | Value |
|---|---|
| HP | 60 |
| Speed | 0 (stationary) |
| Radius | 14 |
| Contact damage | 0 |
| AI | `channeler` `[NEW]` |
| Color | `#6A0DAD` (purple) |
| Shape | `diamond` |

**Channeling buff (per warlock, per second):**
- +50 HP to Shade
- +2 damage to Shade

**With 6 warlocks alive:**
- +300 HP/s and +12 damage/s to Shade
- After 10s: Shade has gained +3000 HP and +120 damage
- After 20s: +6000 HP and +240 damage
- After 30s: +9000 HP and +360 damage

**No cap.** This creates strong urgency to kill warlocks quickly. Buffs already applied persist even after the warlock dies — only future buff rate decreases as warlocks die.

**Phase 1 ends when:** All 6 warlocks are dead. Shade loses immunity.

## Phase 2: The Shade Awakens

**Trigger:** Last warlock dies.

**Shade of Akama behavior:**
- Becomes active enemy — targets Akama NPC
- Moves toward Akama slowly
- When in melee range, attacks Akama with basic melee attacks
- Does NOT target players (focuses exclusively on Akama)
- Players must damage Shade to kill it before it kills Akama

**Shade base stats (before warlock buffs):**

| Stat | Value |
|---|---|
| HP | 4000 |
| Speed | 0.6 |
| Radius | 55 |
| Melee damage | 40 |
| Attack cooldown | 2000ms |
| Attack range | 60 |

**Akama NPC (becomes active in Phase 2):**

| Stat | Value |
|---|---|
| HP | 2000 |
| Speed | 0.8 |
| Radius | 25 |
| Melee damage | 15 |
| Attack cooldown | 1500ms |
| Attack range | 50 |
| Behavior | Moves toward Shade, attacks it in melee range |

**Random enemy spawning (Phase 2 only):**

| Type | Spawn Weight |
|---|---|
| grunt | 3 |
| archer | 1 |
| brute | 1 |
| healer | 1 |

- **Mode:** Continuous
- **Interval:** 3000ms
- **Count per wave:** 1–2
- **Max alive:** 8
- **Spawn location:** Random arena edges
- **Target:** Players (not Akama)

**Phase 2 ends when:** Shade dies (win), Akama dies (lose), or all players die (lose).

## Shade of Akama — Entity Design

The Shade should be implemented as a `ServerBoss` (or boss-like entity) since it has:
- Phase transitions (idle → active)
- Immunity mechanic
- High HP pool
- Is the primary win condition target

However, unlike Illidan, it has simpler combat (melee only, single target, no abilities). The key complexity is the warlock buff interaction.

## New Systems Used

- S7. Friendly NPC Entity `[NEW]`
- S8. Enemy Channeling Beam (Warlock Mechanic) `[NEW]`
- S9. `killBossProtectNPC` Objective Type `[NEW]`

## Difficulty Tuning

```js
difficulty: {
  hpMult:     { base: 1.0, perPlayer: 0.06 },   // affects Shade, warlocks, Akama, and spawned enemies
  damageMult: { base: 1.0, perPlayer: 0.04 },
  spawnMult:  { base: 1.0, perPlayer: 0.08 },   // affects Phase 2 enemy spawning only
}
```

## Renderer Notes

- Warlock beam VFX (visible channeling lines from each warlock to Shade)
- Shade immunity visual (glowing shield/aura while immune)
- Shade buff stacking indicator (growing intensity or counter showing accumulated buffs)
- Akama NPC sprite with HP bar and name label
- Phase transition VFX (Shade "awakens" — dramatic visual when immunity breaks)
- Akama HP bar prominently displayed (players need to monitor it)
- Beam disappearing one by one as warlocks die

---

# Level 5: Illidan Stormrage (Placeholder)

## Overview

The final boss encounter. Full design TBD. This entry exists as a placeholder to maintain the 5-level campaign structure.

## Map Layout

- **Arena:** 1440 x 900
- **Rooms:** 1

## Objective

- **Type:** `killBoss` `[EXISTS]`
- **Win condition:** Illidan dies
- **Lose condition:** All players dead

```js
objectives: [{ type: 'killBoss' }]
```

## Current State

The existing Illidan boss in `shared/BossConfig.js` has:
- 5000 HP, 3 phases (100%/60%/30% HP thresholds)
- Abilities: Fel Beam, Flame Burst, Shadow Dash
- Phase transitions increase speed

This placeholder uses the existing boss config as-is. A dedicated design pass will replace this section with the final Illidan encounter design.

## Difficulty Tuning

```js
difficulty: {
  hpMult:     { base: 1.0, perPlayer: 0.06 },
  damageMult: { base: 1.0, perPlayer: 0.06 },
  spawnMult:  { base: 1.0, perPlayer: 0.0 },
}
```

---

# Appendix: Enemy Type Reference

Consolidated table of all enemy types across all levels.

## Existing Types

| Type | HP | Speed | Radius | Contact Dmg | AI | Special | Used In |
|---|---|---|---|---|---|---|---|
| grunt | 30 | 1.2 | 15 | 15 | chase | — | L1, L2, L4 |
| brute | 80 | 0.9 | 22 | 30 | chase | Tanky | L1, L2, L4 |
| archer | 20 | 1.0 | 12 | 5 | ranged | 12 dmg projectile, 300px range, 2500ms CD | L1, L2, L4 |
| healer | 40 | 1.0 | 14 | 5 | healer | 10 HP/heal, 120px radius, 3000ms CD | L1, L2, L4 |
| charger | 50 | 1.4 | 18 | 40 | charger | Burst charge, 4000ms CD, 500ms telegraph | (unused in L1–L4) |

## New Types

| Type | HP | Speed | Radius | Contact Dmg | AI | Special | Used In |
|---|---|---|---|---|---|---|---|
| gateRepairer `[NEW]` | 35 | 1.1 | 13 | 5 | gateRepairer | Repairs gate 8 HP/s at 60px range | L2 |
| leviathan `[NEW]` | 3000 | 0.8 | 50 | 25 | leviathan | Multi-target (1 melee + 2 ranged), splits on death | L3 |
| warlock `[NEW]` | 60 | 0 | 14 | 0 | channeler | Channels beam, buffs target +50 HP/s +2 dmg/s | L4 |

---

# Implementation Dependency Graph

```
Phase A — No dependencies (can build in parallel):
  [S1] Discrete Wave Spawning
  [S5] Split-on-Death Mechanic
  [S6] Multi-Target Enemy AI (Leviathan)
  [S7] Friendly NPC Entity
  [S8] Enemy Channeling Beam (Warlock)
  [S9] New Objective Types (surviveWaves, killAll, killBossProtectNPC, destroyGates)

Phase B — Depends on Phase A:
  [S2] Multi-Room Map System

Phase C — Depends on Phase B:
  [S3] Destructible Gate Entity (needs S2)
  [S4] Gate Repairer Enemy Type (needs S3)

Level readiness:
  Level 1  ->  Phase A  (S1 + S9)
  Level 2  ->  Phase C  (S2 + S3 + S4 + S9)
  Level 3  ->  Phase A  (S5 + S6 + S9)
  Level 4  ->  Phase A  (S7 + S8 + S9)
  Level 5  ->  Ready now (uses existing boss system)

Recommended implementation order:
  1. Level 5 (placeholder, no new systems)
  2. Level 1 (simplest new system: wave spawning)
  3. Level 3 (isolated new mechanics: split + multi-target)
  4. Level 4 (isolated new mechanics: NPC + channeling)
  5. Level 2 (most dependencies: rooms + gates + repairer)
```
