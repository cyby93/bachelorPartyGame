# Test Scene Design

## Architecture Overview

The test scene will be implemented as a new scene class `TestScene` that extends the base `Scene` class. It will integrate with the existing game architecture, socket event system, and ability system while providing a streamlined testing environment.

## Component Design

### 1. TestScene Class (`public/js/scenes/TestScene.js`)

**Extends:** `Scene`

**Properties:**
```javascript
{
  players: Map,              // Player instances
  projectiles: Array,        // Active projectiles
  meleeEffects: Array,       // Active melee effects
  testEnemy: Enemy,          // Static test target
  isHost: boolean,           // Whether this is the host view
  skillManager: SkillManager,// Ability system manager
  visualEffectsRenderer: VisualEffectsRenderer // Visual effects
}
```

**Methods:**

- `constructor(game)` - Initialize scene with empty player map, projectiles array, and skill manager
- `enter()` - Set up test environment, spawn test enemy, show class selector UI (host only)
- `exit()` - Clean up resources, hide class selector UI
- `update(deltaTime)` - Update players, projectiles, melee effects, and test enemy (respawn if dead)
- `render(ctx)` - Render background, grid, test enemy, projectiles, players, and visual effects
- `handleSocketEvent(eventName, data)` - Handle socket events (player_joined, player_left, game_state, skill_used, back_to_lobby, change_all_classes)
- `setHost(isHost)` - Set host status
- `addPlayer(playerData)` - Add new player to scene
- `updateGameState(state)` - Update player positions and states
- `spawnTestEnemy()` - Create test enemy at center of canvas
- `changeAllClasses(className)` - Update all players to specified class

### 2. Test Enemy Configuration

**Enemy Properties:**
```javascript
{
  x: CANVAS_WIDTH / 2,      // Center X
  y: CANVAS_HEIGHT / 2,     // Center Y
  hp: 1000,                 // High HP for extended testing
  maxHp: 1000,
  speed: 0,                 // Stationary (no movement)
  radius: 30,               // Larger target
  color: '#FF6B6B',         // Distinct red color
  attackRange: 0,           // No attacks
  attackDamage: 0,
  attackCooldown: Infinity  // Never attacks
}
```

**Behavior:**
- Override `update()` method to do nothing (no AI, no movement, no attacks)
- Respawn at center with full HP when killed (3 second delay)

### 3. Socket Events

#### New Events

**`back_to_lobby`**
- Direction: Server → Client
- Payload: None
- Action: Transition from test scene back to lobby scene

**`change_all_classes`**
- Direction: Client → Server → All Clients
- Payload: `{ className: string }`
- Action: Update all connected players' classes to the specified class

**`enter_test_scene`**
- Direction: Client → Server → All Clients
- Payload: None
- Action: Transition from lobby to test scene

#### Modified Events

**`game_state`** - No changes, continues to broadcast player states

**`skill_used`** - No changes, continues to handle ability usage

### 4. Host UI Extensions (`public/host.html`)

**Class Selector UI:**
```html
<div id="test-scene-controls" style="display: none;">
  <div class="class-selector">
    <h3>Test Class</h3>
    <select id="class-selector">
      <option value="WARRIOR">Warrior</option>
      <option value="MAGE">Mage</option>
      <option value="ROGUE">Rogue</option>
      <option value="PRIEST">Priest</option>
    </select>
    <button id="apply-class-btn">Apply to All</button>
    <button id="back-to-lobby-btn">Back to Lobby</button>
  </div>
</div>
```

**Positioning:** Fixed position in top-right corner, semi-transparent background

**Behavior:**
- Show when test scene is active
- Hide when other scenes are active
- "Apply to All" button emits `change_all_classes` event
- "Back to Lobby" button emits `back_to_lobby` event

### 5. Server Changes (`server.js`)

**New Socket Event Handlers:**

```javascript
socket.on('enter_test_scene', () => {
  if (gameState.players[socket.id]?.isHost) {
    io.emit('enter_test_scene');
  }
});

socket.on('back_to_lobby', () => {
  if (gameState.players[socket.id]?.isHost) {
    io.emit('back_to_lobby');
  }
});

socket.on('change_all_classes', (data) => {
  if (gameState.players[socket.id]?.isHost) {
    const { className } = data;
    
    // Update all players' classes
    Object.values(gameState.players).forEach(player => {
      if (!player.isHost) {
        player.className = className;
        player.classData = CLASSES[CLASS_NAMES[className]];
        // Reset cooldowns
        player.cooldowns = [0, 0, 0, 0];
      }
    });
    
    // Broadcast class change
    io.emit('all_classes_changed', { className });
  }
});
```

### 6. Game.js Integration

**Scene Registration:**
```javascript
this.scenes = {
  lobby: new LobbyScene(this),
  test: new TestScene(this),        // Add test scene
  trashMob: new TrashMobScene(this),
  bossFight: new BossFightScene(this),
  result: new ResultScene(this),
  gameover: new GameOverScene(this)
};
```

**Socket Listener:**
```javascript
this.socket.on('enter_test_scene', () => {
  if (this.currentScene) {
    this.currentScene.handleSocketEvent('enter_test_scene');
  }
});

this.socket.on('back_to_lobby', () => {
  if (this.currentScene) {
    this.currentScene.handleSocketEvent('back_to_lobby');
  }
});

this.socket.on('all_classes_changed', (data) => {
  if (this.currentScene) {
    this.currentScene.handleSocketEvent('all_classes_changed', data);
  }
});
```

### 7. Lobby Scene Modifications

**Add Test Scene Button:**
- Add "Enter Test Scene" button to lobby sidebar (host only)
- Button emits `enter_test_scene` socket event
- Handle `enter_test_scene` event to transition to test scene

## Data Flow

### Entering Test Scene
1. Host clicks "Enter Test Scene" button in lobby
2. Client emits `enter_test_scene` socket event
3. Server validates host and broadcasts `enter_test_scene` to all clients
4. All clients transition from lobby to test scene
5. Test scene spawns test enemy and shows class selector (host only)

### Changing Classes
1. Host selects class from dropdown and clicks "Apply to All"
2. Client emits `change_all_classes` with className
3. Server updates all player classes in gameState
4. Server broadcasts `all_classes_changed` to all clients
5. All clients update their local player instances with new class data

### Returning to Lobby
1. Host clicks "Back to Lobby" button
2. Client emits `back_to_lobby` socket event
3. Server validates host and broadcasts `back_to_lobby` to all clients
4. All clients transition from test scene back to lobby

## Correctness Properties

### Property 1: Scene Isolation
**Description:** Test scene operations do not affect lobby or game scene state.

**Validation:** Unit test verifying that entering/exiting test scene does not modify other scene instances.

### Property 2: Class Change Consistency
**Description:** When classes are changed, all non-host players receive the same class update.

**Validation:** Property-based test that verifies all players have matching className and classData after change_all_classes event.

### Property 3: Enemy Respawn Invariant
**Description:** Test enemy always exists in the scene (respawns after death).

**Validation:** Property-based test that verifies testEnemy is never null after initialization.

### Property 4: Stationary Enemy
**Description:** Test enemy position never changes during update cycles.

**Validation:** Unit test that verifies enemy x,y coordinates remain constant across multiple update calls.

### Property 5: Socket Event Ordering
**Description:** Scene transitions complete before subsequent events are processed.

**Validation:** Integration test verifying that back_to_lobby completes before new lobby events are handled.

## Testing Strategy

### Unit Tests
- TestScene initialization
- Enemy spawn and respawn logic
- Class change application to players
- Scene enter/exit lifecycle

### Integration Tests
- Socket event flow (enter_test_scene, back_to_lobby, change_all_classes)
- Scene transitions (lobby → test → lobby)
- Player synchronization across clients

### Manual Testing
- Verify UI elements show/hide correctly
- Test all class switches with ability usage
- Verify enemy takes damage and respawns
- Test with multiple connected players

## Implementation Notes

1. Reuse existing Enemy class with custom configuration (speed: 0, no attacks)
2. Leverage Scene base class methods (renderBackground, renderGrid, renderPlayers, renderProjectiles)
3. Use existing SkillManager for ability handling
4. Follow existing socket event patterns for consistency
5. Ensure test scene does not interfere with game statistics tracking
