# Ability System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        GAME CLIENT                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ Controller   │────────▶│ InputManager │                │
│  │ (Phone)      │         └──────┬───────┘                │
│  └──────────────┘                │                         │
│                                   │ InputData               │
│                                   │ {action, vector,        │
│                                   │  intensity}             │
│                                   ▼                         │
│                          ┌────────────────┐                │
│                          │  SkillManager  │                │
│                          └────────┬───────┘                │
│                                   │                         │
│              ┌────────────────────┼────────────────────┐   │
│              │                    │                    │   │
│              ▼                    ▼                    ▼   │
│      ┌──────────────┐    ┌──────────────┐    ┌──────────┐│
│      │   Handlers   │    │   Systems    │    │ Database ││
│      ├──────────────┤    ├──────────────┤    ├──────────┤│
│      │ • Melee      │    │ • Collision  │    │  Skill   ││
│      │ • Cast       │    │ • Effect     │    │  Config  ││
│      │ • Shield     │    │ • Visual     │    │  (32)    ││
│      │ • AOE        │    └──────────────┘    └──────────┘│
│      │ • Dash       │                                     │
│      └──────┬───────┘                                     │
│             │                                             │
│             ▼                                             │
│      ┌──────────────┐                                     │
│      │   Entities   │                                     │
│      ├──────────────┤                                     │
│      │ • Projectile │                                     │
│      │ • MeleeAttack│                                     │
│      │ • AOEEffect  │                                     │
│      │ • Player     │                                     │
│      └──────────────┘                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Input Flow

```
Player Taps Skill Button
         │
         ▼
InputManager.initSkillGrid()
         │
         ├─ Detects: START
         ├─ Detects: HOLD (continuous)
         └─ Detects: RELEASE
         │
         ▼
socket.emit('player_input', {
  skill: 0,
  inputData: {
    action: 'RELEASE',
    vector: {x: 0.8, y: 0.6},
    intensity: 0.9
  }
})
         │
         ▼
Server broadcasts to all clients
         │
         ▼
BossFightScene.handleSocketEvent('skill_used')
         │
         ▼
SkillManager.handleSkill(scene, player, skillIndex, inputData)
```

### 2. Skill Execution Flow

```
SkillManager.handleSkill()
         │
         ├─ Validate parameters
         ├─ Check cooldown
         ├─ Get skill config from database
         └─ Normalize input data
         │
         ▼
Route to Handler based on skill.type
         │
         ├─ PROJECTILE ──▶ ProjectileHandler.spawn()
         ├─ MELEE ──────▶ MeleeHandler.execute()
         ├─ CAST ───────▶ CastHandler.startCast()
         ├─ SHIELD ─────▶ ShieldHandler.activate()
         ├─ AOE ────────▶ AOEHandler.executeSelf/Lobbed()
         ├─ DASH ───────▶ DashHandler.executeDash()
         └─ BUFF ───────▶ EffectSystem.applyBuff()
         │
         ▼
Create/Update Game Entities
         │
         ▼
Visual Feedback Rendered
```

### 3. Game Loop Integration

```
BossFightScene.update(deltaTime)
         │
         ├─ Update Players
         │   ├─ Update cast state
         │   ├─ Update shield state
         │   ├─ Update dash state
         │   └─ Update active effects
         │
         ├─ Update Boss
         │   └─ Update active effects
         │
         ├─ Update Projectiles
         │   ├─ Move projectiles
         │   ├─ Check collisions
         │   ├─ Apply damage
         │   └─ Remove destroyed
         │
         └─ Update Visual Effects
             └─ Remove expired
         │
         ▼
BossFightScene.render(ctx)
         │
         ├─ Render boss
         ├─ Render projectiles
         ├─ Render effects
         ├─ Render players
         │   ├─ Render cast bars
         │   ├─ Render shields
         │   ├─ Render dash trails
         │   └─ Render effect indicators
         └─ Render tombstones
```

## Component Relationships

### SkillManager (Central Hub)

```
SkillManager
    │
    ├─ Owns: MeleeHandler
    ├─ Owns: CastHandler
    ├─ Owns: ShieldHandler
    ├─ Owns: AOEHandler
    ├─ Owns: DashHandler
    ├─ Owns: CollisionSystem
    ├─ Owns: EffectSystem
    │
    ├─ Uses: SkillDatabase (read-only)
    └─ Manages: Cooldowns (Map)
```

### Handler Responsibilities

```
MeleeHandler
    ├─ Instant hit detection
    ├─ Cone angle calculations
    ├─ Damage application
    └─ Visual effect creation

CastHandler
    ├─ Cast state management
    ├─ Progress tracking
    ├─ Interruption handling
    └─ Payload execution

ShieldHandler
    ├─ Shield activation/deactivation
    ├─ Angle calculations
    ├─ Block detection
    └─ Duration tracking

AOEHandler
    ├─ Self-centered AOE
    ├─ Lobbed AOE
    ├─ Radius checking
    └─ Effect application

DashHandler
    ├─ Dash execution
    ├─ Teleport execution
    ├─ Path validation
    └─ Movement application
```

### System Responsibilities

```
CollisionSystem
    ├─ Projectile collision
    ├─ Melee cone detection
    ├─ AOE radius checking
    ├─ Angle calculations
    └─ Distance calculations

EffectSystem
    ├─ Buff application
    ├─ Debuff application
    ├─ Effect duration tracking
    ├─ Stat modification
    └─ Effect cleanup

VisualEffectsRenderer
    ├─ Cast bar rendering
    ├─ Shield visual rendering
    ├─ Dash trail rendering
    ├─ Effect indicator rendering
    └─ AOE targeting rendering
```

## Skill Configuration Structure

```
SkillDatabase = {
  'Warrior': [
    {
      name: 'Cleave',
      type: 'MELEE',
      cooldown: 1000,
      damage: 50,
      range: 80,
      angle: Math.PI / 3
    },
    // ... 3 more skills
  ],
  'Mage': [
    {
      name: 'Pyroblast',
      type: 'CAST',
      cooldown: 20000,
      castTime: 1500,
      payload: {
        type: 'PROJECTILE',
        damage: 200,
        speed: 300,
        onImpact: {
          type: 'AOE',
          damage: 100,
          radius: 100
        }
      }
    },
    // ... 3 more skills
  ],
  // ... 6 more classes
}
```

## Player State Structure

```
Player {
  // Basic properties
  id, name, className, x, y, hp, maxHp
  
  // Movement
  moveX, moveY, vx, vy, speed
  
  // Ability system state
  castState: {
    active: boolean,
    startTime: number,
    castTime: number,
    config: SkillConfig,
    inputData: InputData
  },
  
  shieldState: {
    active: boolean,
    angle: number,
    arc: number,
    startTime: number,
    duration: number
  },
  
  isDashing: boolean,
  dashVelocity: {x, y},
  
  activeEffects: [
    {
      type: 'BUFF' | 'DEBUFF',
      startTime: number,
      duration: number,
      params: {...}
    }
  ],
  
  // Flags
  isShielding, isCasting, isStunned, isRooted
}
```

## Network Protocol

### Client → Server

```javascript
// Movement
{
  move: {x: number, y: number}
}

// Skill (New Format)
{
  skill: number,
  inputData: {
    action: 'START' | 'HOLD' | 'RELEASE',
    vector: {x: number, y: number},
    intensity: number
  }
}

// Skill (Legacy Format - Still Supported)
{
  skill: number,
  aim: {x: number, y: number}
}
```

### Server → Clients

```javascript
// Skill Used (New Format)
{
  playerId: string,
  skillIndex: number,
  inputData: {
    action: string,
    vector: {x, y},
    intensity: number
  },
  timestamp: number
}

// Game State (Broadcast every 50ms)
{
  players: {...},
  boss: {...},
  gameStarted: boolean,
  gameOver: boolean
}
```

## Execution Timeline Example

### Mage Pyroblast (Cast → Projectile → AOE)

```
T=0ms:    Player holds S4 button
          ├─ InputManager detects START
          └─ Sends action: 'START'

T=50ms:   InputManager sends HOLD updates
          └─ Sends action: 'HOLD' every 50ms

T=100ms:  CastHandler.startCast()
          ├─ Sets player.isCasting = true
          ├─ Freezes player movement
          └─ Creates progress bar

T=150ms:  CastHandler.updateCast()
          └─ Progress: 50/1500 = 3.3%

T=1500ms: Cast completes
          ├─ CastHandler.completeCast()
          ├─ Executes payload
          └─ Spawns Pyroblast projectile

T=1550ms: Projectile travels
          └─ Updates position each frame

T=3000ms: Projectile hits boss
          ├─ Applies 200 damage
          ├─ Triggers onImpact AOE
          └─ Creates explosion

T=3001ms: AOE explosion
          ├─ Checks entities in radius
          ├─ Applies 100 damage to boss
          └─ Creates visual effect

T=3500ms: Visual effect fades
          └─ Effect removed from scene
```

## Memory Management

### Object Lifecycle

```
Projectile Created
    ├─ Added to scene.projectiles[]
    ├─ Updated each frame
    ├─ Collision checked
    └─ Removed when:
        ├─ isAlive = false
        ├─ Out of bounds
        ├─ Range exceeded
        └─ Collision (if not pierce)

Effect Created
    ├─ Added to entity.activeEffects[]
    ├─ Updated each frame
    ├─ Duration tracked
    └─ Removed when:
        └─ Duration expired

Visual Effect Created
    ├─ Added to scene.visualEffectsList[]
    ├─ Rendered each frame
    ├─ Lifetime tracked
    └─ Removed when:
        └─ Lifetime expired
```

## Performance Considerations

### Optimization Points

1. **Collision Detection**
   - Only check active projectiles
   - Early exit on distance check
   - Spatial partitioning for many entities

2. **Effect Updates**
   - Batch effect updates
   - Remove expired effects immediately
   - Limit max effects per entity (10)

3. **Visual Effects**
   - Reuse effect objects
   - Limit particle count
   - Use object pooling

4. **Network**
   - Only broadcast changes
   - Compress data where possible
   - Client-side prediction

## Error Handling Strategy

```
Input Validation
    ├─ Check null/undefined
    ├─ Validate ranges
    └─ Provide safe defaults
    
Execution Safety
    ├─ Try-catch in handlers
    ├─ Log errors with context
    └─ Graceful degradation
    
State Recovery
    ├─ Reset on errors
    ├─ Clean up resources
    └─ Notify user if needed
```

This architecture provides a robust, extensible, and maintainable ability system! 🎮
