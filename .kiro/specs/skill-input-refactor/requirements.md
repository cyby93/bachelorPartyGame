# Requirements Document

## Introduction

This document specifies the requirements for refactoring the 4-button skill grid input system in the mobile game controller. The current implementation creates joysticks dynamically on touchstart, which causes reliability issues and complexity. The cooldown overlay also blocks touch events. The refactored system will use persistent dynamic joysticks (similar to the working move joystick) to improve reliability and simplify the input handling logic.

## Glossary

- **Skill_Grid**: The 4-button grid interface on the mobile controller for triggering player skills
- **Skill_Cell**: An individual button within the Skill_Grid (one of four cells: skill-0, skill-1, skill-2, skill-3)
- **Dynamic_Joystick**: A nipplejs joystick instance that appears at the touch point and provides directional input
- **Cooldown_Overlay**: A visual element that displays cooldown progress by filling the Skill_Cell from bottom to top
- **Input_Manager**: The JavaScript module responsible for handling controller input and joystick initialization
- **Skill_Manager**: The JavaScript module responsible for processing skill actions and managing cooldowns
- **START_Action**: The initial skill action sent when a player first touches a Skill_Cell
- **HOLD_Action**: Repeated skill actions sent while the player continues touching and holding a Skill_Cell
- **RELEASE_Action**: The final skill action sent when the player releases touch from a Skill_Cell
- **Vector**: A normalized directional value (x, y) indicating the joystick direction
- **Intensity**: A scalar value (0.0 to 1.0) indicating how far the joystick is pushed from center

## Requirements

### Requirement 1: Dynamic Joystick Initialization

**User Story:** As a developer, I want each Skill_Cell to have a persistent dynamic joystick, so that input handling is reliable and consistent with the move joystick implementation.

#### Acceptance Criteria

1. WHEN the Input_Manager initializes the Skill_Grid, THE Input_Manager SHALL create a dynamic nipplejs joystick for each of the four Skill_Cells
2. THE Input_Manager SHALL configure each joystick with mode 'dynamic', color 'rgba(255, 255, 255, 0.7)', and size from INPUT_CONFIG.JOYSTICK_SIZE
3. THE Input_Manager SHALL store references to all four joystick instances for lifecycle management
4. WHEN the Input_Manager is destroyed, THE Input_Manager SHALL destroy all four skill joystick instances

### Requirement 2: Touch Event Non-Interference

**User Story:** As a player, I want the cooldown overlay to not block my touch input, so that I can reliably trigger skills even when cooldown animations are displayed.

#### Acceptance Criteria

1. THE Cooldown_Overlay SHALL have CSS property 'pointer-events: none' applied
2. WHEN a Cooldown_Overlay is rendered over a Skill_Cell, THE Skill_Cell SHALL remain fully responsive to touch events
3. WHEN a skill is on cooldown, THE Input_Manager SHALL prevent skill activation through cooldown state checking rather than touch blocking

### Requirement 3: Skill Action Flow

**User Story:** As a player, I want my skill inputs to follow a clear START → HOLD → RELEASE flow, so that cast abilities and directional skills work correctly.

#### Acceptance Criteria

1. WHEN a player touches a Skill_Cell, THE Input_Manager SHALL emit a START_Action with the skill index, initial vector, and intensity 0
2. WHILE a player holds touch on a Skill_Cell, THE Input_Manager SHALL emit HOLD_Actions every 50ms with updated vector and intensity values
3. WHEN a player releases touch from a Skill_Cell, THE Input_Manager SHALL emit a RELEASE_Action with final vector and intensity values
4. WHEN a joystick is moved during touch, THE Input_Manager SHALL calculate vector as normalized (x, -y) from joystick data
5. WHEN a joystick is moved during touch, THE Input_Manager SHALL calculate intensity as distance divided by (JOYSTICK_SIZE * 0.8), clamped to maximum 1.0

### Requirement 4: Cooldown State Management

**User Story:** As a player, I want skills on cooldown to be visually indicated and prevented from activation, so that I understand when skills are available.

#### Acceptance Criteria

1. WHEN a skill enters cooldown, THE Input_Manager SHALL store the cooldown end timestamp for that skill index
2. WHEN a player touches a Skill_Cell that is on cooldown, THE Input_Manager SHALL prevent any skill actions from being emitted
3. WHEN a skill cooldown expires, THE Input_Manager SHALL allow skill activation on the next touch
4. THE Input_Manager SHALL update the Cooldown_Overlay visual height as a percentage of remaining cooldown time

### Requirement 5: Deadzone Handling

**User Story:** As a player, I want small accidental joystick movements to be ignored, so that I can cancel skills by releasing without dragging.

#### Acceptance Criteria

1. WHEN a player releases touch and the joystick distance is less than (JOYSTICK_SIZE * INPUT_CONFIG.DEADZONE), THE Input_Manager SHALL treat the input as cancelled
2. WHEN an input is cancelled, THE Input_Manager SHALL not emit a RELEASE_Action
3. WHEN an input is cancelled, THE Input_Manager SHALL log a cancellation message for debugging

### Requirement 6: Input Data Structure

**User Story:** As a developer, I want skill input data to have a consistent structure, so that the Skill_Manager can reliably process skill actions.

#### Acceptance Criteria

1. THE Input_Manager SHALL emit skill input with structure: { skill: number, inputData: { action: string, vector: {x, y}, intensity: number } }
2. THE vector SHALL be normalized (magnitude = 1.0) when joystick is moved
3. THE vector SHALL default to {x: 1, y: 0} when joystick is not moved
4. THE intensity SHALL be a value between 0.0 and 1.0
5. THE action SHALL be one of: 'START', 'HOLD', or 'RELEASE'

### Requirement 7: Joystick Event Handling

**User Story:** As a developer, I want joystick events to be properly handled, so that vector and intensity are accurately captured during skill use.

#### Acceptance Criteria

1. WHEN a dynamic joystick 'start' event fires, THE Input_Manager SHALL begin the skill action flow
2. WHEN a dynamic joystick 'move' event fires, THE Input_Manager SHALL update the current vector and intensity values
3. WHEN a dynamic joystick 'end' event fires, THE Input_Manager SHALL complete the skill action flow with RELEASE_Action
4. THE Input_Manager SHALL access joystick data through the event data parameter, not through joystick.get()

### Requirement 8: Code Simplification

**User Story:** As a developer, I want the skill input code to be simpler and more maintainable, so that future modifications are easier and bugs are less likely.

#### Acceptance Criteria

1. THE Input_Manager SHALL not create or destroy joysticks during touch events
2. THE Input_Manager SHALL not use manual touchstart, touchend, or touchcancel event listeners on Skill_Cells
3. THE Input_Manager SHALL rely on nipplejs event handlers for all touch interaction
4. THE Input_Manager SHALL reduce the initSkillGrid method complexity compared to the current implementation
