# Test Scene Requirements

## Overview
Create a dedicated test scene for rapid ability and class testing without the need for rejoining or navigating through game flow. This scene will allow developers to quickly iterate on class abilities by providing instant class switching and a static test target.

## User Stories

### 1. Scene Navigation
**As a developer**, I want to access a test scene from the lobby so that I can quickly test abilities without starting a full game.

**Acceptance Criteria:**
- 1.1 Test scene can be loaded from the lobby
- 1.2 Test scene can return to lobby via a 'back_to_lobby' socket event
- 1.3 Scene transition preserves player connections

### 2. Minimal UI Test Environment
**As a developer**, I want a clean test environment without UI clutter so that I can focus on ability mechanics.

**Acceptance Criteria:**
- 2.1 Test scene renders background and grid (inherited from Scene base class)
- 2.2 No lobby UI elements (server IP, QR code, player list, start button) are rendered
- 2.3 Players and projectiles are rendered normally
- 2.4 Visual effects (cast bars, shields, dash trails) are rendered normally

### 3. Rapid Class Switching
**As a developer**, I want to switch all players' classes instantly from the host screen so that I can test different class abilities without rejoining.

**Acceptance Criteria:**
- 3.1 Host screen displays a class selector UI when in test scene
- 3.2 Selecting a class triggers a 'change_all_classes' socket event
- 3.3 All connected players' classes are updated to the selected class
- 3.4 Player abilities and stats are updated to match the new class
- 3.5 Class change is reflected immediately in the game view

### 4. Static Test Target
**As a developer**, I want a stationary enemy target so that I can test ability damage, effects, and mechanics.

**Acceptance Criteria:**
- 4.1 A single enemy spawns in the center of the test scene
- 4.2 Enemy does not move or attack players
- 4.3 Enemy can take damage from player abilities
- 4.4 Enemy displays health bar showing current HP
- 4.5 Enemy can be killed and respawns after death
- 4.6 Enemy has sufficient HP for extended testing (e.g., 1000 HP)

### 5. Scene Lifecycle
**As a developer**, I want proper scene initialization and cleanup so that the test scene integrates seamlessly with the existing game architecture.

**Acceptance Criteria:**
- 5.1 Test scene is registered in Game.js scenes object
- 5.2 Test scene properly initializes SkillManager and VisualEffectsRenderer
- 5.3 Test scene handles all necessary socket events (player_joined, player_left, game_state, skill_used, back_to_lobby, change_all_classes)
- 5.4 Test scene cleans up resources on exit

## Technical Constraints
- Must extend the Scene base class
- Must reuse existing Player, Enemy, SkillManager, and VisualEffectsRenderer components
- Must integrate with existing socket.io event system
- Must not break existing lobby or game scenes

## Out of Scope
- Multiple test targets
- Configurable enemy stats from UI
- Recording or logging test results
- Automated testing features
