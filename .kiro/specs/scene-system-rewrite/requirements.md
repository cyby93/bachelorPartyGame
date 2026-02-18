# Requirements Document

## Introduction

This document specifies the requirements for rewriting the scene handling logic for a multiplayer raid game. The system implements a 4-scene game flow: Lobby Scene (waiting room with player spawning and combat testing), Trash Mob Scene (horde mode requiring 50 enemy kills), Boss Fight Scene (boss encounter with phases), and Result Scene (victory/defeat statistics display). The rewrite addresses missing scenes, improves scene lifecycle management, adds proper state transitions, and ensures multiplayer synchronization.

## Glossary

- **Scene_Manager**: The Game.js class responsible for managing scene transitions and lifecycle
- **Scene**: A game state with its own logic, rendering, and event handling (Lobby, Trash Mob, Boss Fight, Result)
- **Scene_Lifecycle**: The enter/exit/update/render cycle that each scene implements
- **Trash_Mob**: Weak enemy entities (Murlocs) that spawn in waves during the Trash Mob Scene
- **Enemy**: A hostile entity with AI behavior that attacks players
- **Kill_Counter**: Tracking system for enemy defeats to determine scene progression
- **Statistics**: Game metrics including time played, kills, MVP, and deaths
- **Split_Screen_Layout**: Lobby display mode with HTML sidebar (20%) and canvas (80%)
- **Fullscreen_Canvas**: Display mode using 100% canvas for gameplay scenes
- **Scene_Transition**: The process of switching from one scene to another with data passing
- **Socket_Event**: Multiplayer synchronization message handled by scenes
- **Ability_System**: Existing skill/combat system (SkillManager, CastHandler, etc.)

## Requirements

### Requirement 1: Scene Manager Architecture

**User Story:** As a developer, I want a robust scene management system, so that scenes can transition cleanly with proper lifecycle management.

#### Acceptance Criteria

1. THE Scene_Manager SHALL maintain a reference to the current active scene
2. WHEN changeScene is called, THE Scene_Manager SHALL invoke exit() on the current scene before switching
3. WHEN changeScene is called with parameters, THE Scene_Manager SHALL pass those parameters to the new scene's enter() method
4. THE Scene_Manager SHALL initialize all scene instances during construction
5. THE Scene_Manager SHALL forward socket events to the current active scene's handleSocketEvent() method

### Requirement 2: Base Scene Interface

**User Story:** As a developer, I want a consistent scene interface, so that all scenes implement the required lifecycle methods.

#### Acceptance Criteria

1. THE Scene SHALL implement a constructor(game) that stores a reference to the Scene_Manager
2. THE Scene SHALL implement an enter(params) method that initializes scene state and entities
3. THE Scene SHALL implement an exit() method that cleans up listeners, timers, and entities
4. THE Scene SHALL implement an update(dt, now) method that processes game logic each frame
5. THE Scene SHALL implement a draw(ctx, width, height) method that renders the scene
6. THE Scene SHALL implement a handleSocketEvent(eventName, data) method for multiplayer synchronization

### Requirement 3: Lobby Scene Implementation

**User Story:** As a player, I want a lobby where I can join, test controls, and wait for the game to start, so that I can prepare before the raid begins.

#### Acceptance Criteria

1. WHEN entering the Lobby Scene, THE Scene SHALL display a split-screen layout with HTML sidebar (20%) and canvas (80%)
2. WHEN a player joins, THE Lobby Scene SHALL spawn a new Player entity at a random position within the canvas area
3. WHILE in the Lobby Scene, THE System SHALL allow players to use abilities with friendly fire disabled
4. WHEN the start button is clicked with at least 1 player connected, THE Lobby Scene SHALL transition to the Trash Mob Scene
5. THE Lobby Scene SHALL display game title, server IP, QR code, player list, and start button in the HTML sidebar
6. WHEN exiting the Lobby Scene, THE Scene SHALL remove the split-screen layout CSS to enable fullscreen canvas

### Requirement 4: Trash Mob Scene Implementation

**User Story:** As a player, I want to fight waves of weak enemies, so that I can progress to the boss fight after defeating 50 enemies.

#### Acceptance Criteria

1. WHEN entering the Trash Mob Scene, THE Scene SHALL initialize the kill counter to 0 and display fullscreen canvas
2. WHEN 2 seconds elapse, THE Trash Mob Scene SHALL spawn 1-3 enemies at random screen edges outside the visible area
3. WHEN an Enemy is spawned, THE Enemy SHALL use simple follow AI to move toward the nearest player
4. WHEN an Enemy collides with a player projectile or ability, THE Enemy SHALL take damage and die after 1-2 hits
5. WHEN an Enemy dies, THE Trash Mob Scene SHALL increment the kill counter and remove the Enemy entity
6. WHEN the kill counter reaches 50, THE Trash Mob Scene SHALL transition to the Boss Fight Scene
7. IF all players are dead, THEN THE Trash Mob Scene SHALL transition to the Result Scene with victory: false
8. THE Trash Mob Scene SHALL display "WAVE PROGRESS: X / 50" at the top-center of the canvas

### Requirement 5: Enemy Entity Implementation

**User Story:** As a developer, I want an Enemy entity class, so that trash mobs can be spawned with consistent behavior.

#### Acceptance Criteria

1. THE Enemy SHALL have properties for position (x, y), health points, speed, and collision radius
2. WHEN an Enemy updates, THE Enemy SHALL calculate the nearest living player and move toward them
3. WHEN an Enemy is within attack range of a player, THE Enemy SHALL deal damage to that player
4. THE Enemy SHALL render as a distinct visual entity on the canvas
5. WHEN an Enemy's health reaches 0, THE Enemy SHALL be marked for removal

### Requirement 6: Boss Fight Scene Enhancement

**User Story:** As a player, I want an improved boss fight experience, so that the transition from trash mobs is seamless and fair.

#### Acceptance Criteria

1. WHEN entering the Boss Fight Scene from Trash Mob Scene, THE Scene SHALL restore all living players to maximum HP
2. WHEN entering the Boss Fight Scene, THE Scene SHALL spawn the boss at the center of the canvas
3. THE Boss Fight Scene SHALL maintain existing boss AI, phases, and ability system integration
4. WHEN the boss HP reaches 0, THE Boss Fight Scene SHALL transition to the Result Scene with victory: true
5. IF all players are dead, THEN THE Boss Fight Scene SHALL transition to the Result Scene with victory: false

### Requirement 7: Result Scene Implementation

**User Story:** As a player, I want to see game statistics and outcome, so that I can review performance and restart if desired.

#### Acceptance Criteria

1. WHEN entering the Result Scene, THE Scene SHALL display "VICTORY" in gold if victory is true, or "DEFEAT" in red if victory is false
2. THE Result Scene SHALL display total time played, total enemies killed, MVP (most damage dealt), and most deaths
3. THE Result Scene SHALL receive statistics data through the params argument in enter()
4. THE Result Scene SHALL display a "RESTART GAME" button
5. WHEN the restart button is clicked, THE Result Scene SHALL transition back to the Lobby Scene
6. THE Result Scene SHALL use fullscreen canvas with dimmed/dark overlay for statistics display

### Requirement 8: Scene Transition Data Flow

**User Story:** As a developer, I want proper data passing between scenes, so that statistics and state can flow through the game progression.

#### Acceptance Criteria

1. WHEN transitioning from Lobby to Trash Mob, THE Scene_Manager SHALL pass player roster data
2. WHEN transitioning from Trash Mob to Boss Fight, THE Scene_Manager SHALL pass kill count and time elapsed
3. WHEN transitioning from Boss Fight to Result, THE Scene_Manager SHALL pass victory status, total time, kill count, MVP data, and death counts
4. WHEN transitioning from Result to Lobby, THE Scene_Manager SHALL reset game state while maintaining player connections
5. THE Scene_Manager SHALL ensure params are properly received by the target scene's enter() method

### Requirement 9: Statistics Collection

**User Story:** As a player, I want accurate game statistics, so that I can see my performance and compare with teammates.

#### Acceptance Criteria

1. THE System SHALL track total time played from game start to completion
2. THE System SHALL track total enemies killed across all scenes
3. THE System SHALL track damage dealt by each player to determine MVP
4. THE System SHALL track death count for each player
5. WHEN calculating MVP, THE System SHALL identify the player with the highest damage dealt
6. WHEN calculating "most deaths", THE System SHALL identify the player with the highest death count

### Requirement 10: Multiplayer Synchronization

**User Story:** As a player, I want synchronized gameplay across all clients, so that all players see the same game state.

#### Acceptance Criteria

1. WHEN a scene receives a socket event, THE Scene SHALL update its local state to match the server state
2. THE Lobby Scene SHALL handle player_joined, player_left, init_state, game_state, skill_used, and game_started events
3. THE Trash Mob Scene SHALL handle game_state, skill_used, player_joined, and player_left events
4. THE Boss Fight Scene SHALL maintain existing socket event handling for game_state, skill_used, player_joined, and player_left
5. THE Result Scene SHALL handle restart_game events to synchronize scene transitions

### Requirement 11: Ability System Integration

**User Story:** As a developer, I want seamless ability system integration, so that existing skills work correctly in all scenes.

#### Acceptance Criteria

1. THE Lobby Scene SHALL integrate with SkillManager to process player abilities with friendly fire disabled
2. THE Trash Mob Scene SHALL integrate with SkillManager to process player abilities against enemies
3. THE Boss Fight Scene SHALL maintain existing ability system integration (SkillManager, CastHandler, ShieldHandler, DashHandler, EffectSystem)
4. WHEN a skill_used event is received, THE Scene SHALL delegate to SkillManager.handleSkill() with appropriate targets
5. THE System SHALL ensure projectiles, AOE effects, and visual effects work correctly in all combat scenes

### Requirement 12: UI Overlay System

**User Story:** As a player, I want clear UI feedback, so that I can track progress and understand game state.

#### Acceptance Criteria

1. THE Lobby Scene SHALL render player count and connection status on the canvas
2. THE Trash Mob Scene SHALL render kill progress (X / 50) at the top-center of the canvas
3. THE Boss Fight Scene SHALL render the boss HP bar at the top of the canvas
4. THE Result Scene SHALL render victory/defeat status and statistics in a readable format
5. THE System SHALL ensure UI overlays do not obstruct critical gameplay elements
