# Implementation Plan: Scene System Rewrite

## Overview

This implementation plan breaks down the scene system rewrite into incremental coding tasks. The approach follows a bottom-up strategy: first implementing core infrastructure (Enemy entity, statistics tracking), then building out each scene in the game flow order (Lobby enhancements, Trash Mob, Boss Fight enhancements, Result), and finally wiring everything together with proper transitions and testing.

## Tasks

- [x] 1. Create Enemy entity class
  - Create public/js/entities/Enemy.js with position, HP, speed, radius properties
  - Implement findNearestPlayer() method to locate nearest living player
  - Implement update() method with follow AI (move toward nearest player)
  - Implement attack() method with range checking and damage dealing
  - Implement takeDamage() and death detection logic
  - Implement render() method with distinct visual appearance
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ]* 1.1 Write property test for Enemy AI behavior
  - **Property 11: Enemy follow AI**
  - **Validates: Requirements 4.3, 5.2**

- [ ]* 1.2 Write property test for Enemy combat mechanics
  - **Property 12: Enemy combat mechanics**
  - **Validates: Requirements 4.4, 5.3, 5.5**

- [x] 2. Add statistics tracking to Game.js
  - Add gameStats object with startTime, totalKills, playerDamage Map, playerDeaths Map
  - Add resetStats() method to clear statistics
  - Add trackDamage(playerId, damage) helper method
  - Add trackDeath(playerId) helper method
  - Add calculateMVP() method to find player with most damage
  - Add calculateMostDeaths() method to find player with most deaths
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ]* 2.1 Write property test for damage tracking
  - **Property 23: Damage tracking per player**
  - **Validates: Requirements 9.3**

- [ ]* 2.2 Write property test for death tracking
  - **Property 24: Death tracking per player**
  - **Validates: Requirements 9.4**

- [ ]* 2.3 Write property test for MVP calculation
  - **Property 25: MVP calculation correctness**
  - **Validates: Requirements 9.5**

- [ ]* 2.4 Write property test for most deaths calculation
  - **Property 26: Most deaths calculation correctness**
  - **Validates: Requirements 9.6**

- [x] 3. Enhance Scene Manager (Game.js)
  - Update scenes registry to include trashMob and result scenes
  - Modify changeScene() to properly call exit() before switching
  - Add error handling for invalid scene keys
  - Add try-catch blocks around enter/exit calls
  - Ensure socket event forwarding works with all scenes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 3.1 Write property test for scene reference consistency
  - **Property 1: Scene reference consistency**
  - **Validates: Requirements 1.1**

- [ ]* 3.2 Write property test for exit before switch
  - **Property 2: Exit before switch**
  - **Validates: Requirements 1.2**

- [ ]* 3.3 Write property test for parameter passing
  - **Property 3: Parameter passing through transitions**
  - **Validates: Requirements 1.3, 8.1, 8.2, 8.3, 8.4**

- [ ]* 3.4 Write property test for socket event forwarding
  - **Property 4: Socket event forwarding**
  - **Validates: Requirements 1.5, 10.1**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Enhance LobbyScene
  - [x] 5.1 Add split-screen layout management
    - Add CSS class application in enter() for split-screen layout
    - Add CSS class removal in exit() to restore fullscreen
    - Create/update lobby-sidebar HTML element with game title, IP, QR code, player list, start button
    - _Requirements: 3.1, 3.5, 3.6_
  
  - [x] 5.2 Implement friendly fire disabled logic
    - Modify damage application to check if target is a player
    - Skip damage if owner and target are both players
    - _Requirements: 3.3, 11.1_
  
  - [x] 5.3 Add start game transition
    - Add event listener for start button click
    - Validate at least 1 player is connected
    - Call game.changeScene('trashMob') with player roster and start time
    - _Requirements: 3.4_

- [ ]* 5.4 Write property test for friendly fire disabled
  - **Property 8: Friendly fire disabled in lobby**
  - **Validates: Requirements 3.3, 11.1**

- [ ]* 5.5 Write unit test for split-screen layout lifecycle
  - Test that CSS classes are applied on enter and removed on exit
  - **Validates: Requirements 3.1, 3.6**

- [x] 6. Create TrashMobScene
  - [x] 6.1 Implement TrashMobScene class structure
    - Create public/js/scenes/TrashMobScene.js extending Scene
    - Add state properties: players, enemies, projectiles, effects, killCount, spawnTimer, startTime
    - Initialize SkillManager, EffectSystem, and other ability system components
    - _Requirements: 4.1_
  
  - [x] 6.2 Implement enter() method
    - Accept params with player roster and start time
    - Initialize killCount to 0
    - Initialize spawnTimer to 0
    - Copy players from lobby scene or params
    - Store startTime from params
    - _Requirements: 4.1, 8.1_
  
  - [x] 6.3 Implement enemy spawning logic
    - Add spawnEnemy() method that spawns at random screen edges
    - Implement spawn timer in update() to spawn every 2 seconds
    - Spawn 1-3 enemies per interval
    - Add max enemy limit (50) to prevent performance issues
    - _Requirements: 4.2_
  
  - [x] 6.4 Implement update() method
    - Update spawn timer and call spawnEnemy()
    - Update all enemies with player list
    - Update all players (movement, abilities, effects)
    - Update projectiles and check collisions with enemies
    - Track damage dealt for MVP calculation
    - Increment killCount on enemy death
    - Check win condition (killCount >= 50)
    - Check lose condition (all players dead)
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [x] 6.5 Implement draw() method
    - Render fullscreen canvas background
    - Render all enemies
    - Render all players
    - Render projectiles and effects
    - Render "WAVE PROGRESS: X / 50" UI at top-center
    - _Requirements: 4.8, 12.2_
  
  - [x] 6.6 Implement handleSocketEvent() method
    - Handle game_state events to sync player positions
    - Handle skill_used events to trigger abilities
    - Handle player_joined and player_left events
    - _Requirements: 10.3, 11.2, 11.4_

- [ ]* 6.7 Write property test for enemy spawning interval
  - **Property 10: Enemy spawning interval**
  - **Validates: Requirements 4.2**

- [ ]* 6.8 Write property test for kill counter increment
  - **Property 13: Kill counter increment**
  - **Validates: Requirements 4.5**

- [ ]* 6.9 Write unit test for trash mob win condition
  - Test that scene transitions to boss fight when killCount reaches 50
  - **Validates: Requirements 4.6**

- [ ]* 6.10 Write unit test for trash mob lose condition
  - Test that scene transitions to result with victory: false when all players dead
  - **Validates: Requirements 4.7**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Enhance BossFightScene
  - [x] 8.1 Add HP restoration on entry
    - Modify enter() method to accept params with elapsed time
    - Loop through all players and restore HP to maxHp for living players
    - Store previousElapsedTime from params
    - _Requirements: 6.1_
  
  - [x] 8.2 Add damage tracking for MVP
    - Modify projectile collision handling to track damage dealt
    - Call game.trackDamage(playerId, damage) when damage is dealt to boss
    - _Requirements: 9.3_
  
  - [x] 8.3 Add death tracking
    - Modify player death handling to call game.trackDeath(playerId)
    - _Requirements: 9.4_
  
  - [x] 8.4 Update win/lose transitions
    - Modify win condition to pass victory: true, totalTime, totalKills to result scene
    - Modify lose condition to pass victory: false, totalTime, totalKills to result scene
    - Calculate totalTime as (now - game.gameStats.startTime)
    - _Requirements: 6.4, 6.5, 8.3_

- [ ]* 8.5 Write property test for HP restoration
  - **Property 16: Boss fight HP restoration**
  - **Validates: Requirements 6.1**

- [ ]* 8.6 Write unit test for boss fight win condition
  - Test that scene transitions to result with victory: true when boss dies
  - **Validates: Requirements 6.4**

- [ ]* 8.7 Write unit test for boss fight lose condition
  - Test that scene transitions to result with victory: false when all players dead
  - **Validates: Requirements 6.5**

- [x] 9. Create ResultScene
  - [x] 9.1 Implement ResultScene class structure
    - Create public/js/scenes/ResultScene.js extending Scene
    - Add state properties: victory, totalTime, totalKills, mvpPlayer, mostDeathsPlayer
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 9.2 Implement enter() method
    - Accept params with victory, totalTime, totalKills
    - Store victory status
    - Store totalTime and totalKills
    - Call game.calculateMVP() and store result
    - Call game.calculateMostDeaths() and store result
    - _Requirements: 7.3, 9.5, 9.6_
  
  - [x] 9.3 Implement draw() method
    - Render dark overlay (rgba(0, 0, 0, 0.8))
    - Render "VICTORY" in gold (#FFD700) or "DEFEAT" in red (#FF4444) based on victory
    - Render total time formatted as MM:SS
    - Render total kills
    - Render MVP name and damage
    - Render most deaths name and count
    - Render "Click RESTART to play again" hint
    - _Requirements: 7.1, 7.2, 7.6, 12.4_
  
  - [x] 9.4 Add restart button functionality
    - Create restart button in HTML overlay
    - Add click event listener to call game.changeScene('lobby')
    - Call game.resetStats() on restart
    - _Requirements: 7.4, 7.5, 8.4_
  
  - [x] 9.5 Implement handleSocketEvent() method
    - Handle restart_game events to sync scene transitions
    - _Requirements: 10.5_

- [ ]* 9.6 Write property test for victory display
  - **Property 19: Result scene victory display**
  - **Validates: Requirements 7.1**

- [ ]* 9.7 Write property test for statistics display
  - **Property 20: Statistics display completeness**
  - **Validates: Requirements 7.2, 7.3, 12.4**

- [ ]* 9.8 Write unit test for restart button
  - Test that clicking restart transitions to lobby and resets stats
  - **Validates: Requirements 7.4, 7.5**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Wire scenes together and add CSS
  - [x] 11.1 Update Game.js scene registry
    - Import TrashMobScene and ResultScene
    - Add trashMob and result to scenes object
    - _Requirements: 1.4_
  
  - [x] 11.2 Create split-screen CSS
    - Add .split-screen-layout class with grid layout (20% 80%)
    - Style lobby-sidebar with appropriate positioning and z-index
    - Ensure canvas resizes correctly in split-screen mode
    - _Requirements: 3.1_
  
  - [x] 11.3 Create lobby sidebar HTML
    - Add lobby-sidebar div to host.html
    - Add game title, server IP display, QR code container, player list, start button
    - Style sidebar with appropriate colors and layout
    - _Requirements: 3.5_
  
  - [x] 11.4 Update server.js for scene transitions
    - Add game_started event emission on start button click
    - Add restart_game event handling
    - Ensure game state broadcasts work with all scenes
    - _Requirements: 10.2, 10.3, 10.5_

- [ ]* 11.5 Write property test for scene interface compliance
  - **Property 5: Scene interface compliance**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

- [ ]* 11.6 Write integration test for complete game flow
  - Test full sequence: Lobby → Trash Mob → Boss Fight → Result → Lobby
  - Verify data flows correctly through all transitions
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

- [ ]* 11.7 Write integration test for ability system
  - Test that abilities work correctly in all combat scenes
  - Test friendly fire disabled in lobby
  - Test damage tracking for MVP
  - **Property 28: Ability system integration**
  - **Validates: Requirements 11.1, 11.2, 11.4**

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties across random inputs
- Unit tests validate specific examples and edge cases
- The implementation follows the game flow order: Lobby → Trash Mob → Boss Fight → Result
- Enemy entity is implemented first as it's needed by TrashMobScene
- Statistics tracking is added early to support MVP and death tracking throughout
