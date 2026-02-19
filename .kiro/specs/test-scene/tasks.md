# Test Scene Implementation Tasks

## 1. Create TestScene Class
- [x] 1.1 Create `public/js/scenes/TestScene.js` file
- [x] 1.2 Implement constructor with players Map, projectiles array, testEnemy, skillManager
- [x] 1.3 Implement enter() method to spawn test enemy
- [x] 1.4 Implement exit() method for cleanup
- [x] 1.5 Implement update() method for players, projectiles, melee effects, and enemy respawn logic
- [x] 1.6 Implement render() method with background, grid, enemy, projectiles, and players
- [x] 1.7 Implement handleSocketEvent() for all required events
- [x] 1.8 Implement helper methods (setHost, addPlayer, updateGameState, spawnTestEnemy, changeAllClasses)

## 2. Configure Test Enemy
- [x] 2.1 Create spawnTestEnemy() method with stationary enemy configuration
- [x] 2.2 Set enemy position to canvas center (512, 384)
- [x] 2.3 Set enemy HP to 1000 for extended testing
- [x] 2.4 Set enemy speed to 0 (stationary)
- [x] 2.5 Disable enemy attacks (attackRange: 0, attackDamage: 0)
- [x] 2.6 Implement enemy respawn logic (3 second delay after death)

## 3. Add Socket Events to Server
- [x] 3.1 Add 'enter_test_scene' event handler in server.js (host only)
- [x] 3.2 Add 'back_to_lobby' event handler in server.js (host only)
- [x] 3.3 Add 'change_all_classes' event handler in server.js (host only)
- [x] 3.4 Implement class change logic to update all players' className and classData
- [x] 3.5 Broadcast 'all_classes_changed' event to all clients

## 4. Integrate TestScene into Game.js
- [x] 4.1 Import TestScene in Game.js
- [x] 4.2 Register test scene in scenes object
- [x] 4.3 Add socket listener for 'enter_test_scene' event
- [x] 4.4 Add socket listener for 'back_to_lobby' event
- [x] 4.5 Add socket listener for 'all_classes_changed' event

## 5. Add Host UI Controls
- [x] 5.1 Add test scene controls div to host.html (hidden by default)
- [x] 5.2 Add class selector dropdown with all class options
- [x] 5.3 Add "Apply to All" button
- [x] 5.4 Add "Back to Lobby" button
- [x] 5.5 Style controls with fixed positioning and semi-transparent background
- [x] 5.6 Add JavaScript to show/hide controls based on current scene
- [x] 5.7 Wire up "Apply to All" button to emit 'change_all_classes' event
- [x] 5.8 Wire up "Back to Lobby" button to emit 'back_to_lobby' event

## 6. Modify Lobby Scene
- [x] 6.1 Add "Enter Test Scene" button to lobby sidebar (host only)
- [x] 6.2 Wire up button to emit 'enter_test_scene' socket event
- [x] 6.3 Add 'enter_test_scene' case to handleSocketEvent() to transition to test scene
- [x] 6.4 Update lobby HTML to include the new button

## 7. Implement Scene Transitions
- [x] 7.1 Handle 'enter_test_scene' in LobbyScene to call game.changeScene('test')
- [x] 7.2 Handle 'back_to_lobby' in TestScene to call game.changeScene('lobby')
- [x] 7.3 Ensure player data is preserved during transitions
- [x] 7.4 Verify scene enter/exit methods are called correctly

## 8. Handle Class Changes in TestScene
- [x] 8.1 Implement 'all_classes_changed' event handler in TestScene
- [x] 8.2 Update all player instances with new className and classData
- [x] 8.3 Reset player cooldowns after class change
- [x] 8.4 Ensure visual updates reflect new class (colors, abilities)

## 9. Testing and Validation
- [x] 9.1 Test entering test scene from lobby
- [x] 9.2 Test returning to lobby from test scene
- [x] 9.3 Test class switching with multiple players
- [x] 9.4 Test enemy takes damage and displays health bar
- [x] 9.5 Test enemy respawns after death
- [x] 9.6 Test all class abilities work in test scene
- [x] 9.7 Verify no UI elements from lobby appear in test scene
- [x] 9.8 Verify test scene controls only show for host

## 10. Documentation
- [x] 10.1 Add comments to TestScene class explaining key methods
- [x] 10.2 Document new socket events in server.js
- [x] 10.3 Update README.md with test scene usage instructions (if applicable)
