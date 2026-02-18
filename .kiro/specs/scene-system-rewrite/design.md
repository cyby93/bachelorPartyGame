# Design Document: Scene System Rewrite

## Overview

This design document describes the rewrite of the scene handling logic for a multiplayer raid game. The system implements a 4-scene game flow with proper lifecycle management, state transitions, and multiplayer synchronization. The design builds upon the existing ability system (SkillManager, handlers, effect systems) and extends the current Scene base class to support two new scenes (TrashMobScene and ResultScene) while enhancing the existing LobbyScene and BossFightScene.

The scene system follows a manager pattern where Game.js acts as the Scene Manager, maintaining references to all scene instances and handling transitions. Each scene implements a consistent lifecycle interface (enter/exit/update/render/handleSocketEvent) and manages its own entities, effects, and UI overlays.

## Architecture

### Scene Manager (Game.js)

The Scene Manager is responsible for:
- Maintaining a registry of all scene instances
- Managing the current active scene reference
- Orchestrating scene transitions with proper cleanup
- Forwarding socket events to the active scene
- Running the game loop (update/render cycle)

```javascript
class Game {
  constructor(canvas, socket) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.socket = socket;
    
    // Scene registry
    this.scenes = {
      lobby: new LobbyScene(this),
      trashMob: new TrashMobScene(this),
      bossFight: new BossFightScene(this),
      result: new ResultScene(this)
    };
    
    this.currentScene = null;
    this.gameStats = {
      startTime: 0,
      totalKills: 0,
      playerDamage: new Map(),  // playerId -> damage dealt
      playerDeaths: new Map()   // playerId -> death count
    };
  }
  
  changeScene(sceneKey, params = {}) {
    // Exit current scene
    if (this.currentScene) {
      this.currentScene.exit();
    }
    
    // Switch to new scene
    this.currentScene = this.scenes[sceneKey];
    
    // Enter new scene with params
    if (this.currentScene) {
      this.currentScene.enter(params);
    }
  }
}
```

### Base Scene Class

All scenes inherit from the Scene base class which defines the lifecycle interface:

```javascript
class Scene {
  constructor(game) {
    this.game = game;
    this.isActive = false;
  }
  
  enter(params = {}) {
    this.isActive = true;
  }
  
  exit() {
    this.isActive = false;
  }
  
  update(deltaTime, now) {
    // Override in subclasses
  }
  
  draw(ctx, width, height) {
    // Override in subclasses
  }
  
  handleSocketEvent(eventName, data) {
    // Override in subclasses
  }
}
```

### Scene Transition Flow

```
LOBBY → TRASH_MOB → BOSS_FIGHT → RESULT → LOBBY
  ↑                                          ↓
  └──────────────────────────────────────────┘
```

Scene transitions pass data through the `params` argument:
- **Lobby → Trash Mob**: Player roster, game start time
- **Trash Mob → Boss Fight**: Kill count, elapsed time, player stats
- **Boss Fight → Result**: Victory status, total time, kills, MVP, deaths
- **Result → Lobby**: Reset signal (maintains connections)

## Components and Interfaces

### LobbyScene

**Purpose**: Waiting room for players to join, test controls, and start the game.

**Layout**: Split-screen with HTML sidebar (20%) and canvas (80%).

**State**:
```javascript
{
  players: Map<playerId, Player>,
  effects: Array<Effect>,
  isHost: boolean
}
```

**Key Methods**:
- `enter()`: Apply split-screen CSS, initialize empty player map
- `exit()`: Remove split-screen CSS, prepare for fullscreen
- `update(dt, now)`: Update players and effects
- `draw(ctx, width, height)`: Render grid, players, effects, UI overlay
- `handleSocketEvent()`: Handle player_joined, player_left, init_state, game_state, skill_used, game_started

**Split-Screen Implementation**:
```javascript
enter() {
  super.enter();
  // Add CSS class to enable split-screen
  const container = document.getElementById('game-container');
  container.classList.add('split-screen-layout');
  
  // Show sidebar
  const sidebar = document.getElementById('lobby-sidebar');
  sidebar.style.display = 'block';
}

exit() {
  super.exit();
  // Remove split-screen layout
  const container = document.getElementById('game-container');
  container.classList.remove('split-screen-layout');
  
  // Hide sidebar
  const sidebar = document.getElementById('lobby-sidebar');
  sidebar.style.display = 'none';
}
```

**Friendly Fire**: Disable damage between players by checking owner ID before applying damage.

### TrashMobScene

**Purpose**: Horde mode where players defeat 50 weak enemies to progress.

**Layout**: Fullscreen canvas.

**State**:
```javascript
{
  players: Map<playerId, Player>,
  enemies: Array<Enemy>,
  projectiles: Array<Projectile>,
  effects: Array<Effect>,
  visualEffects: Array<VisualEffect>,
  killCount: number,
  spawnTimer: number,
  startTime: number,
  skillManager: SkillManager,
  effectSystem: EffectSystem
}
```

**Key Methods**:
- `enter(params)`: Initialize from lobby players, reset kill counter, start spawn timer
- `exit()`: Clean up enemies and timers
- `update(dt, now)`: Update spawn timer, enemies, players, projectiles, check win/lose conditions
- `draw(ctx, width, height)`: Render enemies, players, projectiles, effects, progress UI
- `handleSocketEvent()`: Handle game_state, skill_used, player_joined, player_left

**Enemy Spawning Logic**:
```javascript
update(deltaTime, now) {
  // Spawn timer
  this.spawnTimer += deltaTime;
  if (this.spawnTimer >= 2000) {  // Every 2 seconds
    this.spawnTimer = 0;
    const count = Math.floor(Math.random() * 3) + 1;  // 1-3 enemies
    for (let i = 0; i < count; i++) {
      this.spawnEnemy();
    }
  }
  
  // Update enemies
  this.enemies.forEach(enemy => {
    enemy.update(deltaTime, this.players);
  });
  
  // Check collisions
  this.projectiles.forEach(projectile => {
    this.enemies.forEach(enemy => {
      if (projectile.checkCollision(enemy)) {
        const isDead = enemy.takeDamage(projectile.damage);
        if (isDead) {
          this.killCount++;
          this.game.gameStats.totalKills++;
          // Track player damage for MVP
          const owner = this.players.get(projectile.owner.id);
          if (owner) {
            const currentDamage = this.game.gameStats.playerDamage.get(owner.id) || 0;
            this.game.gameStats.playerDamage.set(owner.id, currentDamage + projectile.damage);
          }
        }
        projectile.destroy();
      }
    });
  });
  
  // Win condition
  if (this.killCount >= 50) {
    const elapsedTime = now - this.startTime;
    this.game.changeScene('bossFight', {
      elapsedTime: elapsedTime,
      killCount: this.killCount
    });
  }
  
  // Lose condition
  const allDead = Array.from(this.players.values()).every(p => p.isDead);
  if (allDead && this.players.size > 0) {
    this.transitionToResult(false, now);
  }
}

spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);  // 0=top, 1=right, 2=bottom, 3=left
  let x, y;
  
  switch (edge) {
    case 0: // Top
      x = Math.random() * this.game.canvas.width;
      y = -30;
      break;
    case 1: // Right
      x = this.game.canvas.width + 30;
      y = Math.random() * this.game.canvas.height;
      break;
    case 2: // Bottom
      x = Math.random() * this.game.canvas.width;
      y = this.game.canvas.height + 30;
      break;
    case 3: // Left
      x = -30;
      y = Math.random() * this.game.canvas.height;
      break;
  }
  
  this.enemies.push(new Enemy({ x, y }));
}
```

### Enemy Entity

**Purpose**: Weak hostile entity with simple follow AI.

**Properties**:
```javascript
{
  x: number,
  y: number,
  hp: number,
  maxHp: number,
  speed: number,
  radius: number,
  color: string,
  target: Player | null
}
```

**AI Behavior**:
```javascript
update(deltaTime, players) {
  // Find nearest living player
  this.target = this.findNearestPlayer(players);
  
  if (this.target) {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Move toward target
    if (distance > this.attackRange) {
      this.x += (dx / distance) * this.speed;
      this.y += (dy / distance) * this.speed;
    }
    // Attack if in range
    else if (this.canAttack()) {
      this.attack(this.target);
    }
  }
}

findNearestPlayer(players) {
  let nearest = null;
  let minDist = Infinity;
  
  for (const player of players.values()) {
    if (player.isDead) continue;
    
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < minDist) {
      minDist = dist;
      nearest = player;
    }
  }
  
  return nearest;
}
```

**Stats**:
- HP: 20-40 (1-2 hits to kill)
- Speed: 1.5-2.0 (medium speed)
- Attack Range: 30
- Attack Damage: 5
- Attack Cooldown: 1000ms

### BossFightScene

**Purpose**: Boss encounter with phases and special attacks.

**Enhancements**:
- Restore player HP on entry
- Accept elapsed time and kill count from previous scene
- Track damage dealt for MVP calculation
- Track player deaths

**Key Changes**:
```javascript
enter(params = {}) {
  super.enter();
  
  // Restore all living players to max HP
  this.players.forEach(player => {
    if (!player.isDead) {
      player.hp = player.maxHp;
    }
  });
  
  // Initialize boss if needed
  if (!this.boss) {
    this.boss = new Boss();
  }
  
  // Store elapsed time from previous scene
  this.startTime = Date.now();
  this.previousElapsedTime = params.elapsedTime || 0;
}

// Track damage for MVP
handleProjectileHit(projectile, target) {
  if (target === this.boss) {
    const owner = this.players.get(projectile.owner.id);
    if (owner) {
      const currentDamage = this.game.gameStats.playerDamage.get(owner.id) || 0;
      this.game.gameStats.playerDamage.set(owner.id, currentDamage + projectile.damage);
    }
  }
}

// Track deaths
handlePlayerDeath(player) {
  const currentDeaths = this.game.gameStats.playerDeaths.get(player.id) || 0;
  this.game.gameStats.playerDeaths.set(player.id, currentDeaths + 1);
}
```

### ResultScene

**Purpose**: Display game outcome and statistics.

**Layout**: Fullscreen canvas with dark overlay.

**State**:
```javascript
{
  victory: boolean,
  totalTime: number,
  totalKills: number,
  mvpPlayer: { id, name, damage },
  mostDeathsPlayer: { id, name, deaths }
}
```

**Key Methods**:
```javascript
enter(params = {}) {
  super.enter();
  
  this.victory = params.victory || false;
  this.totalTime = params.totalTime || 0;
  this.totalKills = params.totalKills || 0;
  
  // Calculate MVP (most damage dealt)
  let maxDamage = 0;
  let mvpId = null;
  this.game.gameStats.playerDamage.forEach((damage, playerId) => {
    if (damage > maxDamage) {
      maxDamage = damage;
      mvpId = playerId;
    }
  });
  
  if (mvpId) {
    const player = this.game.scenes.bossFight.players.get(mvpId);
    this.mvpPlayer = {
      id: mvpId,
      name: player ? player.name : 'Unknown',
      damage: maxDamage
    };
  }
  
  // Calculate most deaths
  let maxDeaths = 0;
  let deathsId = null;
  this.game.gameStats.playerDeaths.forEach((deaths, playerId) => {
    if (deaths > maxDeaths) {
      maxDeaths = deaths;
      deathsId = playerId;
    }
  });
  
  if (deathsId) {
    const player = this.game.scenes.bossFight.players.get(deathsId);
    this.mostDeathsPlayer = {
      id: deathsId,
      name: player ? player.name : 'Unknown',
      deaths: maxDeaths
    };
  }
}

draw(ctx, width, height) {
  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, width, height);
  
  // Victory/Defeat title
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = this.victory ? '#FFD700' : '#FF4444';
  ctx.fillText(this.victory ? 'VICTORY!' : 'DEFEAT', width / 2, 150);
  
  // Statistics
  ctx.font = '32px Arial';
  ctx.fillStyle = '#FFFFFF';
  
  const stats = [
    `Total Time: ${this.formatTime(this.totalTime)}`,
    `Enemies Killed: ${this.totalKills}`,
    this.mvpPlayer ? `MVP: ${this.mvpPlayer.name} (${this.mvpPlayer.damage} damage)` : '',
    this.mostDeathsPlayer ? `Most Deaths: ${this.mostDeathsPlayer.name} (${this.mostDeathsPlayer.deaths})` : ''
  ];
  
  let y = 250;
  stats.forEach(stat => {
    if (stat) {
      ctx.fillText(stat, width / 2, y);
      y += 50;
    }
  });
  
  // Restart button hint
  ctx.font = '24px Arial';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText('Click RESTART to play again', width / 2, height - 100);
}

formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
```

**Restart Mechanism**: Add a button to the HTML overlay that calls `game.changeScene('lobby')` and resets game stats.

## Data Models

### Scene Transition Parameters

```typescript
// Lobby → Trash Mob
interface LobbyToTrashMobParams {
  players: Map<string, Player>;
  startTime: number;
}

// Trash Mob → Boss Fight
interface TrashMobToBossFightParams {
  elapsedTime: number;
  killCount: number;
}

// Boss Fight → Result
interface BossFightToResultParams {
  victory: boolean;
  totalTime: number;
  totalKills: number;
}

// Result → Lobby
interface ResultToLobbyParams {
  reset: boolean;
}
```

### Game Statistics

```typescript
interface GameStats {
  startTime: number;
  totalKills: number;
  playerDamage: Map<string, number>;  // playerId -> total damage dealt
  playerDeaths: Map<string, number>;  // playerId -> death count
}
```

### Enemy Data Model

```typescript
interface EnemyData {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  color: string;
  attackRange: number;
  attackDamage: number;
  attackCooldown: number;
  lastAttackTime: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified the following redundancies:

1. **Property 1.3 and 8.5**: Both test that params are passed to enter(). Property 8.5 is redundant.
2. **Property 4.8 and 12.2**: Both test kill progress rendering. Property 12.2 is redundant.
3. **Properties 2.1-2.6**: These all test the Scene interface contract. They can be combined into a single comprehensive property about interface compliance.
4. **Properties 10.2, 10.3, 10.5**: These test event handling for specific scenes. They can be combined into a single property about event handling.
5. **Properties 8.1, 8.2, 8.3, 8.4**: These all test data flow through scene transitions. They can be combined into a single comprehensive property.

After reflection, the following properties provide unique validation value:

**Scene Manager Properties**:
- Scene reference management (1.1)
- Exit before switch (1.2)
- Parameter passing (1.3)
- Socket event forwarding (1.5)

**Scene Interface Properties**:
- Interface compliance (combined 2.1-2.6)

**Scene-Specific Properties**:
- Lobby split-screen layout (3.1, 3.6 combined)
- Player spawning (3.2)
- Friendly fire disabled (3.3)
- Start game transition (3.4)
- Enemy spawning (4.2)
- Enemy AI behavior (4.3, 5.2 combined)
- Enemy combat (4.4, 5.3 combined)
- Kill tracking (4.5)
- Player HP restoration (6.1)

**Statistics Properties**:
- Time tracking (9.1)
- Kill tracking (9.2)
- Damage tracking (9.3)
- Death tracking (9.4)
- MVP calculation (9.5)
- Most deaths calculation (9.6)

**Data Flow Properties**:
- Scene transition data flow (combined 8.1-8.4)

**Integration Properties**:
- Ability system integration (11.1, 11.2, 11.4 combined)
- Socket event handling (combined 10.1-10.5)

### Correctness Properties

Property 1: Scene reference consistency
*For any* scene transition, after calling changeScene(), the currentScene property should reference the target scene
**Validates: Requirements 1.1**

Property 2: Exit before switch
*For any* scene transition where a current scene exists, the exit() method should be called on the current scene before the scene reference changes
**Validates: Requirements 1.2**

Property 3: Parameter passing through transitions
*For any* scene transition with parameters, the parameters passed to changeScene() should be received by the target scene's enter() method
**Validates: Requirements 1.3, 8.1, 8.2, 8.3, 8.4**

Property 4: Socket event forwarding
*For any* socket event received by the Scene_Manager, the event should be forwarded to the current active scene's handleSocketEvent() method with the correct event name and data
**Validates: Requirements 1.5, 10.1**

Property 5: Scene interface compliance
*For any* scene class (LobbyScene, TrashMobScene, BossFightScene, ResultScene), the scene should implement all required methods: constructor(game), enter(params), exit(), update(dt, now), draw(ctx, width, height), and handleSocketEvent(eventName, data)
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 6: Lobby split-screen layout lifecycle
*For any* transition into the Lobby Scene, the split-screen CSS class should be applied on enter(), and for any transition out of the Lobby Scene, the split-screen CSS class should be removed on exit()
**Validates: Requirements 3.1, 3.6**

Property 7: Player spawning on join
*For any* player_joined event in the Lobby Scene, a new Player entity should be added to the players map with a position within the canvas bounds
**Validates: Requirements 3.2**

Property 8: Friendly fire disabled in lobby
*For any* player ability used in the Lobby Scene, if the ability hits another player, no damage should be applied to that player
**Validates: Requirements 3.3, 11.1**

Property 9: Start game transition
*For any* start button click in the Lobby Scene with at least 1 player connected, the scene should transition to the Trash Mob Scene
**Validates: Requirements 3.4**

Property 10: Enemy spawning interval
*For any* 2-second interval in the Trash Mob Scene, 1-3 enemies should be spawned at random screen edges outside the visible area
**Validates: Requirements 4.2**

Property 11: Enemy follow AI
*For any* enemy update in the Trash Mob Scene, the enemy should move toward the nearest living player
**Validates: Requirements 4.3, 5.2**

Property 12: Enemy combat mechanics
*For any* collision between an enemy and a player projectile, the enemy should take damage, and for any enemy with HP <= 0, the enemy should be marked for removal
**Validates: Requirements 4.4, 5.3, 5.5**

Property 13: Kill counter increment
*For any* enemy death in the Trash Mob Scene, the kill counter should increment by 1 and the enemy should be removed from the enemies array
**Validates: Requirements 4.5**

Property 14: Trash mob win condition
*For any* Trash Mob Scene state where killCount >= 50, the scene should transition to the Boss Fight Scene
**Validates: Requirements 4.6**

Property 15: Trash mob lose condition
*For any* Trash Mob Scene state where all players are dead, the scene should transition to the Result Scene with victory: false
**Validates: Requirements 4.7**

Property 16: Boss fight HP restoration
*For any* transition into the Boss Fight Scene, all living players should have their HP restored to maxHp
**Validates: Requirements 6.1**

Property 17: Boss fight win condition
*For any* Boss Fight Scene state where boss HP <= 0, the scene should transition to the Result Scene with victory: true
**Validates: Requirements 6.4**

Property 18: Boss fight lose condition
*For any* Boss Fight Scene state where all players are dead, the scene should transition to the Result Scene with victory: false
**Validates: Requirements 6.5**

Property 19: Result scene victory display
*For any* Result Scene entered with victory: true, the scene should display "VICTORY" in gold color, and for any Result Scene entered with victory: false, the scene should display "DEFEAT" in red color
**Validates: Requirements 7.1**

Property 20: Statistics display completeness
*For any* Result Scene, the scene should display total time, total kills, MVP player name and damage, and most deaths player name and count
**Validates: Requirements 7.2, 7.3, 12.4**

Property 21: Time tracking accuracy
*For any* game session from start to completion, the total time should equal the difference between the completion time and the start time
**Validates: Requirements 9.1**

Property 22: Kill tracking accumulation
*For any* enemy killed in any scene, the total kill count should increment by 1
**Validates: Requirements 9.2**

Property 23: Damage tracking per player
*For any* damage dealt by a player to an enemy or boss, the damage amount should be added to that player's total damage in gameStats.playerDamage
**Validates: Requirements 9.3**

Property 24: Death tracking per player
*For any* player death, the death count for that player should increment by 1 in gameStats.playerDeaths
**Validates: Requirements 9.4**

Property 25: MVP calculation correctness
*For any* set of players with damage dealt, the MVP should be the player with the maximum damage value
**Validates: Requirements 9.5**

Property 26: Most deaths calculation correctness
*For any* set of players with death counts, the player with most deaths should be the player with the maximum death count value
**Validates: Requirements 9.6**

Property 27: Socket event handling completeness
*For any* scene, when it receives a socket event that it should handle (based on its event list), the scene should update its state appropriately
**Validates: Requirements 10.2, 10.3, 10.5**

Property 28: Ability system integration
*For any* skill_used event in a combat scene (Lobby, Trash Mob, Boss Fight), the scene should delegate to SkillManager.handleSkill() with the correct player, skill index, and input data
**Validates: Requirements 11.2, 11.4**

Property 29: UI overlay rendering
*For any* scene, the scene should render its required UI elements (player count in Lobby, kill progress in Trash Mob, boss HP in Boss Fight, statistics in Result)
**Validates: Requirements 12.1, 12.3**

## Error Handling

### Scene Transition Errors

**Invalid Scene Key**:
- Check if scene key exists in scenes registry
- Log error and remain in current scene if invalid
- Provide fallback to lobby scene

```javascript
changeScene(sceneKey, params = {}) {
  if (!this.scenes[sceneKey]) {
    console.error(`Invalid scene key: ${sceneKey}`);
    return;
  }
  
  // Proceed with transition
}
```

**Scene Enter/Exit Errors**:
- Wrap enter/exit calls in try-catch
- Log errors with context
- Ensure scene reference is updated even if enter fails

```javascript
changeScene(sceneKey, params = {}) {
  try {
    if (this.currentScene) {
      this.currentScene.exit();
    }
  } catch (error) {
    console.error('Error exiting scene:', error);
  }
  
  this.currentScene = this.scenes[sceneKey];
  
  try {
    if (this.currentScene) {
      this.currentScene.enter(params);
    }
  } catch (error) {
    console.error('Error entering scene:', error);
  }
}
```

### Enemy Spawning Errors

**Out of Bounds Spawn**:
- Validate spawn positions are outside visible area but within reasonable distance
- Clamp positions to valid ranges

**Spawn Rate Limiting**:
- Limit maximum concurrent enemies (e.g., 50)
- Skip spawning if limit reached

```javascript
spawnEnemy() {
  if (this.enemies.length >= 50) {
    console.warn('Max enemy count reached, skipping spawn');
    return;
  }
  
  // Proceed with spawn
}
```

### Statistics Calculation Errors

**Missing Player Data**:
- Handle cases where player no longer exists
- Use default values for missing data
- Log warnings for data inconsistencies

```javascript
calculateMVP() {
  if (this.game.gameStats.playerDamage.size === 0) {
    return null;
  }
  
  let maxDamage = 0;
  let mvpId = null;
  
  this.game.gameStats.playerDamage.forEach((damage, playerId) => {
    if (damage > maxDamage) {
      maxDamage = damage;
      mvpId = playerId;
    }
  });
  
  return mvpId;
}
```

### Socket Event Errors

**Malformed Event Data**:
- Validate event data structure
- Provide safe defaults for missing fields
- Log warnings for invalid data

```javascript
handleSocketEvent(eventName, data) {
  if (!data) {
    console.warn(`Received ${eventName} with no data`);
    return;
  }
  
  // Proceed with event handling
}
```

## Testing Strategy

### Dual Testing Approach

The scene system rewrite will use both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Scene initialization with specific configurations
- Specific scene transition sequences (Lobby → Trash Mob → Boss Fight → Result → Lobby)
- Edge cases like empty player lists, zero kills, etc.
- Integration with existing ability system components

**Property-Based Tests**: Verify universal properties across all inputs
- Scene lifecycle properties (enter/exit/update/render)
- Data flow through scene transitions with random parameters
- Enemy spawning and AI with random player positions
- Statistics calculation with random damage/death values
- Socket event handling with random event sequences

### Property-Based Testing Configuration

**Library**: Use `fast-check` for JavaScript property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: scene-system-rewrite, Property {N}: {property_text}`

**Example Property Test**:
```javascript
import fc from 'fast-check';

// Feature: scene-system-rewrite, Property 3: Parameter passing through transitions
test('Scene transition parameters are passed to enter()', () => {
  fc.assert(
    fc.property(
      fc.record({
        victory: fc.boolean(),
        totalTime: fc.nat(),
        totalKills: fc.nat()
      }),
      (params) => {
        const game = new Game(canvas, socket);
        const resultScene = game.scenes.result;
        
        // Spy on enter method
        let receivedParams = null;
        const originalEnter = resultScene.enter.bind(resultScene);
        resultScene.enter = (p) => {
          receivedParams = p;
          originalEnter(p);
        };
        
        // Transition to result scene
        game.changeScene('result', params);
        
        // Verify params were passed
        expect(receivedParams).toEqual(params);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Test Examples

**Scene Initialization**:
```javascript
test('Game initializes all four scenes', () => {
  const game = new Game(canvas, socket);
  
  expect(game.scenes.lobby).toBeInstanceOf(LobbyScene);
  expect(game.scenes.trashMob).toBeInstanceOf(TrashMobScene);
  expect(game.scenes.bossFight).toBeInstanceOf(BossFightScene);
  expect(game.scenes.result).toBeInstanceOf(ResultScene);
});
```

**Scene Transition Sequence**:
```javascript
test('Complete game flow transitions correctly', () => {
  const game = new Game(canvas, socket);
  
  // Start in lobby
  game.changeScene('lobby');
  expect(game.currentScene).toBe(game.scenes.lobby);
  
  // Transition to trash mob
  game.changeScene('trashMob');
  expect(game.currentScene).toBe(game.scenes.trashMob);
  
  // Transition to boss fight
  game.changeScene('bossFight');
  expect(game.currentScene).toBe(game.scenes.bossFight);
  
  // Transition to result
  game.changeScene('result', { victory: true });
  expect(game.currentScene).toBe(game.scenes.result);
  
  // Transition back to lobby
  game.changeScene('lobby');
  expect(game.currentScene).toBe(game.scenes.lobby);
});
```

**Enemy Spawning Edge Case**:
```javascript
test('Enemy spawning respects maximum limit', () => {
  const scene = new TrashMobScene(game);
  scene.enter();
  
  // Spawn 60 enemies (over the limit of 50)
  for (let i = 0; i < 60; i++) {
    scene.spawnEnemy();
  }
  
  // Should only have 50 enemies
  expect(scene.enemies.length).toBe(50);
});
```

### Integration Testing

**Ability System Integration**:
- Test that SkillManager works correctly in all combat scenes
- Verify projectiles damage enemies in Trash Mob Scene
- Verify friendly fire is disabled in Lobby Scene
- Verify damage tracking for MVP calculation

**Socket Event Integration**:
- Test that socket events are forwarded to active scene
- Verify scene state updates on game_state events
- Verify skill_used events trigger ability execution

### Test Coverage Goals

- **Scene Manager**: 100% coverage of changeScene, socket forwarding, game loop
- **Scene Lifecycle**: 100% coverage of enter/exit/update/render for all scenes
- **Enemy System**: 100% coverage of spawning, AI, combat, death
- **Statistics System**: 100% coverage of tracking and calculation
- **Scene Transitions**: All transition paths tested with various parameters
