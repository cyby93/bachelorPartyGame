# RAID NIGHT — Skill System Reference

> **Keep this file updated whenever you add or change a skill.**
> It is the single source of truth for skill conventions, valid field combinations, and VFX behavior.

---

## Table of Contents
1. [Skill Schema](#skill-schema)
2. [Type × Subtype Matrix](#type--subtype-matrix)
3. [Effect Types](#effect-types)
4. [effectParams Glossary](#effectparams-glossary)
5. [VFX Lookup](#vfx-lookup)
6. [How to Add a New Skill](#how-to-add-a-new-skill)
7. [Design Guidelines](#design-guidelines)

---

## Skill Schema

Every entry in `shared/SkillDatabase.js` is an object with these fields.

### Required (all skills)
| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name shown in UI |
| `type` | string | Server handler. See [Type × Subtype Matrix](#type--subtype-matrix) |
| `inputType` | string | Controller interaction mode. See below. |
| `cooldown` | number (ms) | Time before skill can be used again |
| `icon` | string (emoji) | Shown on the skill button |

### inputType values
| Value | Controller behavior |
|-------|---------------------|
| `INSTANT` | Single tap, no direction needed |
| `DIRECTIONAL` | Drag joystick to aim, release to fire |
| `TARGETED` | Drag to place a landing spot on the arena |
| `SUSTAINED` | Hold to maintain (e.g. shield, toggle) |

### Conditional fields

#### PROJECTILE type
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `damage` | number | yes | Damage on hit |
| `speed` | number | yes | Pixels per second |
| `radius` | number | yes | Projectile circle size |
| `range` | number | yes | Max travel distance before despawn |
| `pierce` | boolean | yes | Whether it hits multiple enemies |
| `projectileCount` | number | MULTI only | How many projectiles to fire |
| `spreadAngle` | number (radians) | MULTI only | Total spread of the fan (e.g. `Math.PI / 2`) |
| `healAmount` | number | TARGETED only | Heal amount on ally hit |
| `dot` | object | optional | Apply damage over time on hit. See DoT fields below. |
| `effectType` | string | optional | For non-damage projectiles (e.g. `GRIP`, `HEAL`) |

#### MELEE type
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `damage` | number | yes | Damage to enemies in cone |
| `range` | number | yes | Cone length (pixels) |
| `angle` | number (radians) | yes | Half-angle of the cone from center (e.g. `Math.PI/3` = 60°) |
| `effectParams` | object | optional | Apply debuff to hit enemies |

#### AOE type
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `radius` | number | yes | Explosion radius |
| `damage` | number | depends | Damage per explosion. Required if `effectType` is DAMAGE or DUAL. |
| `healAmount` | number | depends | Heal per tick. Required if `effectType` is HEAL or DUAL. |
| `effectType` | string | yes | What the AOE does. See [Effect Types](#effect-types) |
| `effectParams` | object | BUFF/DEBUFF | Effect applied to targets |
| `fearDuration` | number (ms) | FEAR only | How long fear lasts |
| `speed` | number | AOE_LOBBED | Travel speed of the lobbed projectile |
| `range` | number | AOE_LOBBED | Max throw distance |
| `duration` | number (ms) | optional | If set with `tickRate`, creates a persistent ground zone |
| `tickRate` | number (ms) | optional | How often the zone damages/heals while it persists |

#### DASH type
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `distance` | number | yes | How far the dash moves (pixels) |
| `speed` | number | yes | Dash travel speed (affects charge stun range) |
| `effectType` | string | optional | For dashes that apply a debuff on impact (e.g. stun) |
| `effectParams` | object | optional | The debuff applied to enemies in the path |

#### BUFF type
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `duration` | number (ms) | yes | `-1` = permanent (TOGGLE only) |
| `effectParams` | object | yes | Stats to modify. See [effectParams Glossary](#effectparams-glossary) |

#### SHIELD type
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `arc` | number (radians) | yes | Block arc width (e.g. `Math.PI` = 180°) |

#### CAST type
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `castTime` | number (ms) | yes | Delay before payload fires |
| `payload` | object | yes | Nested skill config to execute after cast. Supports `PROJECTILE`, `AOE`. |

#### CHANNEL type
Sustained effect that fires repeatedly. **Movement interrupts the channel and applies cooldown.**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `castTime` | number (ms) | yes | Total channel duration |
| `tickRate` | number (ms) | yes | How often the effect fires per tick |
| `range` | number | BEAM only | Max range of the drain beam |
| `damagePerTick` | number | BEAM only | Damage dealt to target per tick |
| `healPerTick` | number | BEAM only | Healing received per tick |
| `payload` | object | UNTARGETED only | AOE effect fired each tick (e.g. Tranquility) |

> **BEAM** (`subtype: 'BEAM'`): requires an enemy in aim direction to activate. Cooldown only consumed if a target is found.
> **UNTARGETED** (`subtype: 'UNTARGETED'`): fires AOE payload around caster each tick. No target needed.

#### TARGETED type
Ray-cast single-target ability. **Cooldown is only consumed if a target is found.**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `range` | number | yes | Ray-cast search distance (pixels) |
| `healAmount` | number | HEAL_ALLY only | HP restored to the first ally hit |
| `damage` | number | DAMAGE_ENEMY only | Damage dealt to the first enemy hit |

> Use `subtype: 'HEAL_ALLY'` to find the first allied player in aim direction.
> Use `subtype: 'DAMAGE_ENEMY'` to find the first enemy in aim direction.

#### SPAWN type
Instantiates a server-side minion entity. **Spawning a second minion of the same subtype replaces the first.**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `duration` | number (ms) | yes | How long the minion lives before despawning |
| `totemAbility` | object | TOTEM only | What the totem fires. See below. |
| `triggerRadius` | number | TRAP only | Proximity detection radius |
| `trapEffect` | object | TRAP only | AOE fired when triggered |
| `petStats` | object | PET only | HP, speed, damage, attack range/rate |

**`totemAbility` fields:**
```js
totemAbility: {
  type:     'PROJECTILE' | 'AOE',
  damage:   number,
  speed:    number,   // PROJECTILE only
  radius:   number,
  range:    number,
  tickRate: number,   // how often the totem attacks (ms)
}
```

**`trapEffect` fields:**
```js
trapEffect: {
  type:        'AOE',
  damage:      number,
  radius:      number,
  effectType:  string,    // DAMAGE, DEBUFF, etc.
  effectParams: object,   // optional
}
```

**`petStats` fields:**
```js
petStats: {
  hp:          number,
  speed:       number,   // pixels per second
  damage:      number,
  attackRange: number,   // pixels
  attackRate:  number,   // ms between attacks
}
```

#### DoT object (inside PROJECTILE)
```js
dot: {
  damagePerTick: number,  // damage per tick
  tickRate:      number,  // ms between ticks
  duration:      number,  // total duration ms
  sourceSkill:   string,  // skill name (for stacking/refresh logic)
}
```

---

## Type × Subtype Matrix

Use this to pick the right combination for a new skill idea.

| type | subtype | Server behavior | Notes |
|------|---------|-----------------|-------|
| `PROJECTILE` | *(none)* | Single projectile, travels until range or hit | Standard ranged attack |
| `PROJECTILE` | `MULTI` | Fan of `projectileCount` projectiles | Needs `projectileCount` + `spreadAngle` |
| `PROJECTILE` | `TARGETED` | Projectile that heals allies instead of damaging enemies | Needs `healAmount` + `effectType: 'HEAL'` |
| `PROJECTILE` | `GRIP` | Pulls first enemy hit toward caster | Needs `effectType: 'GRIP'` |
| `MELEE` | *(none)* | Instant cone hit | No movement |
| `AOE` | `AOE_SELF` | Instant explosion at caster's feet | Common for self-centered blasts |
| `AOE` | `AOE_LOBBED` | Projectile flies to target location, detonates on arrival | Needs `speed` + `range` |
| `DASH` | *(none)* | Charge forward; stuns enemies in path | Standard dash |
| `DASH` | `BACKWARDS` | Charge backward (away from aim direction) | Good for escape skills |
| `DASH` | `TELEPORT` | Instant warp, no path collision | No stun on teleport |
| `BUFF` | *(none)* | Apply effect to self | Duration-based |
| `BUFF` | `TOGGLE` | Toggle on/off; `duration: -1` for permanent while active | Bear Form pattern |
| `BUFF` | `STEALTH` | Makes player invisible, breaks on attack | Needs `effectParams.invisible: true` |
| `BUFF` | `TARGETED` | Apply buff to nearest ally in aim direction | Power Word: Shield pattern |
| `SHIELD` | *(none)* | Directional block; held with DIRECTIONAL/SUSTAINED | Blocks projectiles in arc |
| `CAST` | *(none)* | Delay then fire payload once | Pyroblast pattern |
| `CHANNEL` | `BEAM` | Sustained drain beam on single target; movement interrupts | Drain Life pattern |
| `CHANNEL` | `UNTARGETED` | Repeatedly fire AOE payload around caster; movement interrupts | Tranquility pattern |
| `TARGETED` | `HEAL_ALLY` | Ray-cast finds first ally in aim direction, heals instantly | Chain Heal pattern — no cooldown if no target |
| `TARGETED` | `DAMAGE_ENEMY` | Ray-cast finds first enemy in aim direction, damages instantly | No cooldown if no target |
| `SPAWN` | `TOTEM` | Stationary minion that fires at nearby enemies | Searing Totem pattern |
| `SPAWN` | `TRAP` | Stationary trigger object; fires when enemy enters radius | Explosive Trap pattern |
| `SPAWN` | `PET` | Mobile minion that chases and attacks enemies | Call of the Wild pattern |

---

## Effect Types

`effectType` tells the server what to do when the skill hits.

| effectType | Behavior |
|------------|----------|
| `DAMAGE` | Deal damage to enemies in area |
| `HEAL` | Heal allies in area |
| `DUAL` | Deal damage to enemies AND heal allies in same radius |
| `BUFF` | Apply beneficial `effectParams` to players in area |
| `DEBUFF` | Apply detrimental `effectParams` to enemies in area |
| `FEAR` | Force enemies to flee for `fearDuration` ms |
| `REVIVE` | Revive dead teammates at `healPercent` of max HP |
| `GRIP` | Pull hit enemy toward caster's position |

---

## effectParams Glossary

All keys are optional unless the skill depends on them.

| Key | Type | Effect |
|-----|------|--------|
| `speedMultiplier` | number | Multiplier on movement speed. `1.5` = 50% faster. `0.5` = 50% slower |
| `fireRateMultiplier` | number | Multiplier on attack speed (cooldown reduction). `1.3` = 30% faster |
| `damageMultiplier` | number | Multiplier on outgoing damage. `3.0` = triple damage |
| `damageReduction` | number (0–1) | Fraction of incoming damage blocked. `0.8` = 80% reduction |
| `shield` | number | Absorption pool. Incoming damage hits shield before HP |
| `stunned` | boolean | Target cannot move or act |
| `rooted` | boolean | Target cannot move but can still act |
| `feared` | boolean | Target moves away from source uncontrollably |
| `invisible` | boolean | Target is not targetable; alpha = 0.3 visually |
| `breaksOnAttack` | boolean | Remove the effect when the player uses an attack skill |
| `duration` | number (ms) | How long the effect lasts. `-1` = permanent (TOGGLE only) |
| `armorBonus` | number | Flat armor increase (damage reduction) |
| `maxHpMultiplier` | number | Multiplier on max HP (e.g. `1.5` = 50% more HP in Bear Form) |
| `transformSprite` | string | Change player's sprite. Currently supports: `'bear'` |
| `modifyS1` | object | Override skill slot 1 config while effect is active. Used by Bear Form to swap Wrath → Swipe |
| `opacity` | number (0–1) | Visual transparency override |

---

## VFX Lookup

When a skill fires, the server emits `skill:fired` with `{ type, subtype, x, y, angle, radius, range, color }`.
`VFXManager.triggerSkillVFX()` routes it to the right effect.

| type | subtype | VFX produced | System |
|------|---------|--------------|--------|
| `MELEE` | *(any)* | Sweeping arc at player, 60°, 0.15s fade | OneShotEffectSystem |
| `AOE` | `AOE_SELF` | Expanding ring at player, 0.3s fade | OneShotEffectSystem |
| `AOE` | `AOE_LOBBED` | Small indicator at cast point; impact ring on detonation | OneShotEffectSystem |
| `DASH` | *(none)* | Streak from start → end position, 0.2s fade | OneShotEffectSystem |
| `DASH` | `BACKWARDS` | Same streak, reversed | OneShotEffectSystem |
| `DASH` | `TELEPORT` | Flash at origin + flash at destination | OneShotEffectSystem |
| `BUFF` | *(any)* | Small glow at caster | OneShotEffectSystem |
| `SHIELD` | *(any)* | Glow feedback at caster on raise | OneShotEffectSystem |
| `CAST` | *(none)* | Glow when cast begins | OneShotEffectSystem |
| `CAST` | `BEAM` | Beam line drawn to target | OneShotEffectSystem |
| `CHANNEL` | *(any)* | Glow when channel begins | OneShotEffectSystem |
| `CHANNEL` | `BEAM` | Beam line drawn to target (same as CAST/BEAM) | BattleRenderer |
| `TARGETED` | *(any)* | Flash at caster; instant line + impact flash on `targeted:hit` event | OneShotEffectSystem |
| `SPAWN` | *(any)* | Burst flash + particles at spawn location | OneShotEffectSystem + ParticleSystem |
| Channel interrupted | — | Red impact flash at caster on `channel:interrupted` event | OneShotEffectSystem |
| Persistent zone | — | Pulsing circle border, fades in last 500ms | GroundEffectSystem |
| Hit | — | Directional sparks (6 particles, 0.22s) | ParticleSystem |
| Kill | — | Burst (18 particles, 0.6s) | ParticleSystem |
| Damage number | — | Red `"-25"` floats up 40px over 0.8s | FloatingTextPool |
| Heal number | — | Green `"+50"` floats up | FloatingTextPool |
| Active buff | — | Colored ring around entity, pulses | AuraSystem |

**Aura ring colors** (AuraSystem):
| Effect | Ring color |
|--------|------------|
| Speed buff | cyan |
| Damage buff | red |
| Damage reduction | yellow |
| Shield | orange |
| Transform (Bear) | brown |
| Invisible | entity alpha → 0.3 |

**If you add a new `type` or `subtype`, also add a case in `VFXManager.triggerSkillVFX()`.**

---

## How to Add a New Skill

Follow this checklist in order:

1. **Pick type + subtype** — Find the closest match in the [Type × Subtype Matrix](#type--subtype-matrix). If none fits, you need a new handler (see step 5).

2. **Define the skill** in `shared/SkillDatabase.js`:
   - Required fields: `name`, `type`, `inputType`, `cooldown`, `icon`
   - Add all conditional fields for your type (see [Skill Schema](#skill-schema))
   - Run the validator: `node shared/SkillValidator.js` — fix any warnings

3. **Check VFX coverage** — Look up your type/subtype in the [VFX Lookup](#vfx-lookup) table.
   - If it's covered → VFX works automatically.
   - If it's a new combination → add a case in `client/host/systems/VFXManager.js` `triggerSkillVFX()` and update the VFX table above.

4. **Test in-game**:
   - Does the skill do damage/heal correctly?
   - Does the cooldown feel right?
   - Does the VFX match the intent?
   - Does it feel good on phone controller?

5. **Special rules for new types:**
   - **CHANNEL**: Movement interrupts the channel and applies cooldown. BEAM subtype only activates if a target is found (no cooldown consumed otherwise).
   - **TARGETED**: Cooldown is only applied if a target is found. Uses ray-cast in aim direction.
   - **SPAWN**: One minion per subtype per player — spawning a second replaces the first. Minions persist until `duration` expires or they are killed.

6. **If you need a new handler** (new `type`):
   - Add a case to the switch in `SkillSystem.execute()` (`server/systems/SkillSystem.js`)
   - Add `_executeNewType()` method following existing patterns
   - Add tick logic in `SkillSystem.tick()` if the effect persists
   - Add VFX in `VFXManager`
   - Document the new type in this file (matrix, VFX table, schema)

7. **Update this doc** if you added new fields, types, or subtypes.

---

## Design Guidelines

### Feel
- **Immediacy**: Instant skills (`INSTANT` inputType) should resolve in one server tick (50ms). No delay unless it's intentional (CAST).
- **Feedback**: Every skill needs a visual. If the VFX is weak, the skill feels weak even if the numbers are right.
- **Cooldown length matches impact**: Short cooldowns (< 2s) = low-damage filler. Long cooldowns (> 15s) = game-changing moments.

### Balance
| Category | Typical cooldown | Typical damage |
|----------|-----------------|----------------|
| Basic attack | 600–1200ms | 25–70 |
| AoE / multi-hit | 4000–10000ms | 30–80 per target |
| Crowd control | 5000–20000ms | low/none (CC is the value) |
| Dash / mobility | 6000–12000ms | n/a |
| Ultimate | 20000–120000ms | 80–200+ or huge utility |
| Persistent zone | 15000–20000ms | 15–20/tick |

### Cooldown conventions
- `castTime` for CAST skills delays when the effect fires, not the cooldown reset.
- Cooldown starts when the skill is **activated**, not when the effect lands.
- For CHANNEL, the cooldown is short (500ms) because the cast time IS the limitation. If the player moves, cooldown is applied immediately.
- For TARGETED and CHANNEL/BEAM, the cooldown is **only applied if a target is found**. Failed casts are free retries.
- For SPAWN, the cooldown starts immediately regardless of what the minion does after spawning.

### Controller feel
- DIRECTIONAL feels best for aimed projectiles and dashes.
- TARGETED feels best for placement skills (traps, heals).
- INSTANT feels best for defensive/utility skills where timing matters more than aim.
- SUSTAINED is rare — only use when the player needs to hold for a persistent effect.

### Class identity
Each class should feel distinct. Avoid giving the same combo of types to two classes.
Example: Warrior = melee + AoE + dash + shield. No other class should have all four of these.
