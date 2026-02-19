# Implementation Tasks: Scene Rendering Refactor

## Phase 1: Base Scene Common Rendering Methods

### Task 1: Add Grid Rendering Method to Base Scene
**Validates:** Requirements 1.3, 3.1, 8.1

Extract the `drawGrid` method from individual scenes into the base Scene class.

**Subtasks:**
- [x] 1.1 Add `renderGrid(ctx)` method to Scene.js base class
- [x] 1.2 Update BossFightScene to use `this.renderGrid(ctx)` instead of `this.drawGrid(ctx)`
- [x] 1.3 Update TrashMobScene to use `this.renderGrid(ctx)` instead of `this.drawGrid(ctx)`
- [x] 1.4 Update LobbyScene to use `this.renderGrid(ctx)` instead of `this.drawGrid(ctx)`
- [x] 1.5 Remove duplicate `drawGrid` methods from all concrete scenes

### Task 2: Add Background Rendering Method to Base Scene
**Validates:** Requirements 1.3, 3.1, 6.1, 8.1

Extract background rendering logic into a common method.

**Subtasks:**
- [x] 2.1 Add `renderBackground(ctx)` method to Scene.js that renders the blue background
- [x] 2.2 Update BossFightScene render method to call `this.renderBackground(ctx)`
- [x] 2.3 Update TrashMobScene render method to call `this.renderBackground(ctx)`
- [x] 2.4 Update LobbyScene render method to call `this.renderBackground(ctx)`
- [x] 2.5 Remove duplicate background rendering code from all concrete scenes

### Task 3: Add Player Visual Effects Rendering Method to Base Scene
**Validates:** Requirements 1.1, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 8.1

Create a common method that renders all player visual effects (cast bars, shields, dash trails, effect indicators).

**Subtasks:**
- [x] 3.1 Add `renderPlayerVisualEffects(ctx, player)` method to Scene.js base class
- [x] 3.2 Method should check and render cast bar if `player.castState` is active
- [x] 3.3 Method should check and render shield if `player.shieldState` is active
- [x] 3.4 Method should check and render dash trail if `player.isDashing` is true
- [x] 3.5 Method should check and render effect indicators if `player.activeEffects` exists
- [x] 3.6 Update BossFightScene to use `this.renderPlayerVisualEffects(ctx, player)` in player loop
- [x] 3.7 Update TrashMobScene to use `this.renderPlayerVisualEffects(ctx, player)` in player loop
- [x] 3.8 Update LobbyScene to use `this.renderPlayerVisualEffects(ctx, player)` in player loop
- [x] 3.9 Remove duplicate visual effects rendering code from all concrete scenes

### Task 4: Add Players Rendering Method to Base Scene
**Validates:** Requirements 1.1, 3.2, 6.5, 8.1

Create a common method that renders all players and their visual effects.

**Subtasks:**
- [x] 4.1 Add `renderPlayers(ctx)` method to Scene.js base class
- [x] 4.2 Method should iterate through `this.players` Map
- [x] 4.3 Method should call `player.render(ctx)` for each player
- [x] 4.4 Method should call `this.renderPlayerVisualEffects(ctx, player)` for each player
- [x] 4.5 Update BossFightScene to use `this.renderPlayers(ctx)` instead of manual player loop
- [x] 4.6 Update TrashMobScene to use `this.renderPlayers(ctx)` instead of manual player loop
- [x] 4.7 Update LobbyScene to use `this.renderPlayers(ctx)` instead of manual player loop

### Task 5: Add Projectiles Rendering Method to Base Scene
**Validates:** Requirements 1.2, 3.3, 6.4, 8.1

Create a common method that renders all projectiles.

**Subtasks:**
- [x] 5.1 Add `renderProjectiles(ctx)` method to Scene.js base class
- [x] 5.2 Method should iterate through `this.projectiles` array
- [x] 5.3 Method should call `projectile.render(ctx)` for each projectile
- [x] 5.4 Update BossFightScene to use `this.renderProjectiles(ctx)` instead of manual projectile loop
- [x] 5.5 Update TrashMobScene to use `this.renderProjectiles(ctx)` instead of manual projectile loop
- [x] 5.6 Update LobbyScene to use `this.renderProjectiles(ctx)` instead of manual projectile loop

## Phase 2: Remove Legacy Code Paths

### Task 6: Remove Legacy Effects Rendering
**Validates:** Requirements 2.1, 2.3

Remove all references to legacy `this.effects` array rendering.

**Subtasks:**
- [x] 6.1 Remove legacy effects rendering loop from BossFightScene render method
- [x] 6.2 Remove legacy effects rendering loop from TrashMobScene render method
- [x] 6.3 Remove legacy effects rendering loop from LobbyScene render method
- [x] 6.4 Remove `this.effects = [];` initialization from BossFightScene constructor (keep visualEffectsList)
- [x] 6.5 Remove duplicate `this.effects = [];` from TrashMobScene constructor
- [x] 6.6 Remove `this.effects = [];` from LobbyScene constructor

### Task 7: Remove Legacy Skill Handling Code
**Validates:** Requirements 2.2, 2.4

Remove backward compatibility code for legacy skill format.

**Subtasks:**
- [x] 7.1 Remove legacy skill handling else block from BossFightScene `handleSocketEvent` method
- [x] 7.2 Remove legacy skill handling else block from TrashMobScene `handleSocketEvent` method
- [x] 7.3 Remove legacy skill handling else block from LobbyScene `handleSocketEvent` method
- [x] 7.4 Verify all skill handling uses only `data.inputData` format

## Phase 3: Organize Scene Rendering Structure

### Task 8: Refactor BossFightScene Render Method
**Validates:** Requirements 3.1, 3.2, 3.3, 3.4, 5.1, 5.4, 6.1-6.6

Reorganize BossFightScene render method into logical blocks.

**Subtasks:**
- [x] 8.1 Organize render method with clear comment blocks: Background, Grid, Enemies, Projectiles, Players, UI
- [x] 8.2 Ensure rendering order: background → grid → boss → projectiles → visual effects → players → tombstones
- [x] 8.3 Use base class methods for common rendering (background, grid, projectiles, players)
- [x] 8.4 Keep scene-specific rendering (boss, tombstones) in BossFightScene
- [x] 8.5 Verify no legacy code remains

### Task 9: Refactor TrashMobScene Render Method
**Validates:** Requirements 3.1, 3.2, 3.3, 3.4, 5.2, 6.1-6.6

Reorganize TrashMobScene render method into logical blocks.

**Subtasks:**
- [x] 9.1 Organize render method with clear comment blocks: Background, Grid, Enemies, Projectiles, Players, UI
- [x] 9.2 Ensure rendering order: background → grid → enemies → projectiles → players → wave progress UI
- [x] 9.3 Use base class methods for common rendering (background, grid, projectiles, players)
- [x] 9.4 Keep scene-specific rendering (enemies, wave progress UI) in TrashMobScene
- [x] 9.5 Remove duplicate `draw` method and consolidate into `render` method
- [x] 9.6 Verify no legacy code remains

### Task 10: Refactor LobbyScene Render Method
**Validates:** Requirements 3.1, 3.2, 3.3, 5.3, 6.1-6.6

Reorganize LobbyScene render method into logical blocks.

**Subtasks:**
- [x] 10.1 Organize render method with clear comment blocks: Background, Grid, Projectiles, Players, UI
- [x] 10.2 Ensure rendering order: background → grid → projectiles → players → lobby header → start prompt
- [x] 10.3 Use base class methods for common rendering (background, grid, projectiles, players)
- [x] 10.4 Keep scene-specific rendering (lobby header, start prompt) in LobbyScene
- [x] 10.5 Verify no legacy code remains

## Phase 4: Validation and Testing

### Task 11: Manual Testing - BossFightScene
**Validates:** Requirements 5.1, 5.4, 6.1-6.6, 8.3

Test that BossFightScene renders correctly after refactoring.

**Subtasks:**
- [ ] 11.1 Start a game and progress to boss fight scene
- [ ] 11.2 Verify background and grid render correctly
- [ ] 11.3 Verify boss renders correctly
- [ ] 11.4 Verify projectiles render correctly
- [ ] 11.5 Verify players render correctly with all visual effects (cast bars, shields, dash trails, effect indicators)
- [ ] 11.6 Verify tombstones render correctly
- [ ] 11.7 Verify rendering order is correct (no z-fighting or incorrect layering)
- [ ] 11.8 Verify no visual regressions compared to original implementation

### Task 12: Manual Testing - TrashMobScene
**Validates:** Requirements 5.2, 6.1-6.6, 8.3

Test that TrashMobScene renders correctly after refactoring.

**Subtasks:**
- [ ] 12.1 Start a game and enter trash mob scene
- [ ] 12.2 Verify background and grid render correctly
- [ ] 12.3 Verify enemies render correctly
- [ ] 12.4 Verify projectiles render correctly
- [ ] 12.5 Verify players render correctly with all visual effects
- [ ] 12.6 Verify wave progress UI renders correctly
- [ ] 12.7 Verify rendering order is correct
- [ ] 12.8 Verify no visual regressions compared to original implementation

### Task 13: Manual Testing - LobbyScene
**Validates:** Requirements 5.3, 6.1-6.6, 8.3

Test that LobbyScene renders correctly after refactoring.

**Subtasks:**
- [ ] 13.1 Start a game and stay in lobby scene
- [ ] 13.2 Verify background and grid render correctly
- [ ] 13.3 Verify projectiles render correctly (from skill testing)
- [ ] 13.4 Verify players render correctly with visual effects
- [ ] 13.5 Verify lobby header renders correctly
- [ ] 13.6 Verify start game prompt renders correctly (when host)
- [ ] 13.7 Verify rendering order is correct
- [ ] 13.8 Verify no visual regressions compared to original implementation

### Task 14: Code Review and Cleanup
**Validates:** Requirements 8.1, 8.2, 8.3, 8.4, 8.5

Final code review to ensure quality and maintainability.

**Subtasks:**
- [x] 14.1 Review Scene.js base class for proper method organization
- [x] 14.2 Verify all concrete scenes use base class methods where appropriate
- [x] 14.3 Verify no code duplication remains across scenes
- [x] 14.4 Verify all legacy code has been removed
- [x] 14.5 Verify rendering order is consistent and documented
- [x] 14.6 Add JSDoc comments to new base class methods
- [x] 14.7 Verify canvas dimensions are passed as parameters (not hardcoded) for scaling support
