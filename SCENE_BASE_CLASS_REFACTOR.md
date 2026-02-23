# Scene Base Class Refactor Summary

## Overview
Refactored the `Scene.js` base class to include common rendering and update logic that all scenes inherit, reducing code duplication and establishing a consistent pattern across all game scenes.

## Changes Made

### Scene.js (Base Class)
Added comprehensive base implementation with hook methods for customization:

#### Constructor
- Added `players` Map initialization (moved from child scenes)
- Kept `projectiles`, `meleeAttacks`, `aoeEffects` arrays
- Kept `visualEffectsRenderer` instance

#### Update Method
Now calls all common update logic in order:
1. `updatePlayers(deltaTime)` - Updates all players
2. `updateProjectiles(deltaTime)` - Updates and filters projectiles
3. `updateMeleeAttacks(deltaTime)` - Updates and filters melee attacks
4. `updateAoeEffects(deltaTime)` - Updates and filters AOE effects
5. `updateEntities(deltaTime)` - Hook for scene-specific entity updates

#### Render Method
Now calls all common rendering logic in order:
1. `renderBackground(ctx)` - Background color
2. `renderGrid(ctx)` - Grid overlay
3. `renderBeforeEntities(ctx)` - Hook for scene-specific pre-entity rendering
4. `renderProjectiles(ctx)` - All projectiles
5. `renderMeleeEffects(ctx)` - All melee attacks
6. `renderAoeEffects(ctx)` - All AOE effects
7. `renderPlayers(ctx)` - All players with visual effects
8. `renderEntities(ctx)` - Hook for scene-specific entities
9. `renderUI(ctx)` - Hook for scene-specific UI

#### Hook Methods (Override in Child Scenes)
- `updatePlayers(deltaTime)` - Override for custom player update logic
- `updateProjectiles(deltaTime)` - Override for custom projectile collision logic
- `updateMeleeAttacks(deltaTime)` - Override for custom melee collision logic
- `updateAoeEffects(deltaTime)` - Override for custom AOE collision logic
- `updateEntities(deltaTime)` - Override for scene-specific entity updates
- `renderBeforeEntities(ctx)` - Override to render before standard entities
- `renderEntities(ctx)` - Override to render scene-specific entities
- `renderUI(ctx)` - Override to render scene-specific UI

### LobbyScene
- Removed duplicate `players` and `projectiles` initialization
- Removed `update()` and `render()` methods
- Added `updateProjectiles()` override for lobby-specific collision (no damage)
- Added `renderUI()` override for lobby header and start prompt

### TrashMobScene
- Removed duplicate `players` and `projectiles` initialization
- Removed `update()` and `render()` methods
- Added `updatePlayers()` override for ability system updates and death tracking
- Added `updateProjectiles()` override for enemy collision detection
- Added `updateEntities()` override for enemy spawning, updates, and win/lose conditions
- Added `renderEntities()` override to render enemies
- Added `renderUI()` override for wave progress indicator

### TestScene
- Removed duplicate `players`, `projectiles`, and `meleeAttacks` initialization
- Removed `update()` and `render()` methods
- Added `updateProjectiles()` override for test enemy collision
- Added `updateEntities()` override for melee collision with test enemy
- Added `renderEntities()` override to render test enemy

### BossFightScene
- Removed duplicate `players` and `projectiles` initialization
- Removed `update()` and `render()` methods
- Added `updatePlayers()` override for ability system updates, death tracking, and tombstone creation
- Added `updateProjectiles()` override for boss collision detection and win condition
- Added `updateEntities()` override for boss updates, visual effects, revive attempts, and game over logic
- Added `renderBeforeEntities()` override to render boss before other entities
- Added `renderEntities()` override to render visual effects and tombstones

### ResultScene & GameOverScene
- No changes needed - these scenes don't have entities to update
- Already work correctly with the base class

## Benefits

1. **Code Reuse**: Common update and render logic is now in one place
2. **Consistency**: All scenes follow the same pattern and rendering order
3. **Maintainability**: Changes to common logic only need to be made once
4. **Clarity**: Clear separation between base functionality and scene-specific logic
5. **Extensibility**: Easy to add new scenes by overriding only what's needed

## Testing
All existing tests pass (112 tests across 6 test suites).

## Pattern for New Scenes

When creating a new scene:
1. Extend `Scene` base class
2. Call `super(game)` in constructor
3. Override only the hook methods you need:
   - `updatePlayers()` if you need custom player logic
   - `updateProjectiles()` if you need custom collision logic
   - `updateEntities()` for scene-specific entities (enemies, boss, etc.)
   - `renderBeforeEntities()` for entities that should render before players
   - `renderEntities()` for scene-specific entities
   - `renderUI()` for scene-specific UI elements
4. Don't override `update()` or `render()` unless you need completely custom behavior
