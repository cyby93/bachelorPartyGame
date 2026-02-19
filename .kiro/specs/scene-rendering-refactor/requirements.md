# Requirements Document

## Introduction

This document specifies requirements for refactoring the scene system's rendering implementation to eliminate code duplication, improve maintainability, and establish clear separation of concerns. The current implementation has significant duplication across BossFightScene, TrashMobScene, and LobbyScene, with each scene manually implementing identical rendering logic for players, projectiles, and visual effects.

## Glossary

- **Scene**: A game state container that manages entities, updates game logic, and renders visual output
- **Rendering_Block**: A logical grouping of related rendering operations (e.g., map elements, player rendering, projectile rendering)
- **Visual_Effects_Renderer**: A system component responsible for rendering visual feedback like cast bars, shields, and dash trails
- **Legacy_Code**: Deprecated code paths including legacy effects arrays and backward-compatible skill handling
- **Base_Scene**: The Scene.js class that all concrete scenes inherit from
- **Renderer_Module**: A dedicated class or module responsible for specific rendering operations
- **Map_Elements**: Visual components of the game environment including floor, obstacles, and grid
- **Player_Visual_Effects**: Visual feedback attached to players including cast bars, shields, dash trails, and effect indicators
- **Projectile**: A moving game entity representing ranged attacks or abilities
- **Effect**: A visual or gameplay effect applied to entities (includes both legacy and modern effect systems)

## Requirements

### Requirement 1: Eliminate Rendering Code Duplication

**User Story:** As a developer, I want common rendering logic extracted from individual scenes, so that I can maintain rendering code in a single location.

#### Acceptance Criteria

1. WHEN rendering players with visual effects, THE Base_Scene SHALL provide a common method that all scenes can use
2. WHEN rendering projectiles, THE Base_Scene SHALL provide a common method that all scenes can use
3. WHEN rendering the background grid, THE Base_Scene SHALL provide a common method that all scenes can use
4. THE Rendering_System SHALL ensure that BossFightScene, TrashMobScene, and LobbyScene do not contain duplicate rendering logic
5. FOR ALL scenes, rendering player visual effects (cast bars, shields, dash trails, effect indicators) SHALL use the same implementation

### Requirement 2: Remove Legacy Code Paths

**User Story:** As a developer, I want to remove deprecated code, so that the codebase is cleaner and easier to understand.

#### Acceptance Criteria

1. WHEN rendering effects, THE Scene SHALL NOT use legacy effects arrays (this.effects)
2. WHEN handling skill events, THE Scene SHALL NOT include backward compatibility code for legacy skill format
3. THE Refactored_System SHALL remove all references to legacy effect rendering from all scene classes
4. THE Refactored_System SHALL remove all legacy skill handling code paths that check for absence of inputData

### Requirement 3: Establish Logical Rendering Organization

**User Story:** As a developer, I want rendering code organized into logical blocks, so that I can easily locate and modify specific rendering operations.

#### Acceptance Criteria

1. THE Rendering_System SHALL separate map element rendering into a distinct block
2. THE Rendering_System SHALL separate player rendering into a distinct block
3. THE Rendering_System SHALL separate projectile rendering into a distinct block
4. THE Rendering_System SHALL separate enemy rendering into a distinct block (where applicable)
5. WHEN reading scene rendering code, THE Developer SHALL be able to identify each rendering category by its organization

### Requirement 4: Centralize Visual Effects Rendering

**User Story:** As a developer, I want player visual effects rendered through a consistent interface, so that visual feedback behavior is uniform across all scenes.

#### Acceptance Criteria

1. WHEN a player has an active cast state, THE Visual_Effects_Renderer SHALL render the cast bar using the same logic in all scenes
2. WHEN a player has an active shield state, THE Visual_Effects_Renderer SHALL render the shield using the same logic in all scenes
3. WHEN a player is dashing, THE Visual_Effects_Renderer SHALL render the dash trail using the same logic in all scenes
4. WHEN a player has active effects, THE Visual_Effects_Renderer SHALL render effect indicators using the same logic in all scenes
5. THE Base_Scene SHALL provide a method that iterates through players and delegates visual effect rendering to Visual_Effects_Renderer

### Requirement 5: Support Scene-Specific Rendering

**User Story:** As a developer, I want to preserve scene-specific rendering features, so that each scene can maintain its unique visual elements.

#### Acceptance Criteria

1. WHEN BossFightScene renders, THE Scene SHALL render the boss entity in addition to common elements
2. WHEN TrashMobScene renders, THE Scene SHALL render the wave progress UI in addition to common elements
3. WHEN LobbyScene renders, THE Scene SHALL render the lobby header and start game prompt in addition to common elements
4. WHEN BossFightScene renders, THE Scene SHALL render tombstones in addition to common elements
5. THE Refactoring SHALL preserve all scene-specific rendering functionality without regression

### Requirement 6: Maintain Rendering Order

**User Story:** As a developer, I want to ensure proper visual layering, so that game elements render in the correct z-order.

#### Acceptance Criteria

1. THE Rendering_System SHALL render the background before all other elements
2. THE Rendering_System SHALL render the grid after the background but before entities
3. THE Rendering_System SHALL render enemies before projectiles (where applicable)
4. THE Rendering_System SHALL render projectiles before players
5. THE Rendering_System SHALL render players before player visual effects
6. THE Rendering_System SHALL render UI elements last (after all game entities)

### Requirement 7: Enable Game Scaling

**User Story:** As a developer, I want the rendering system to support game scaling, so that the game can render at different resolutions and scale factors.

#### Acceptance Criteria

1. WHEN rendering any element, THE Rendering_System SHALL accept canvas context dimensions as parameters
2. THE Rendering_System SHALL NOT hardcode canvas dimensions in rendering logic
3. WHEN the canvas size changes, THE Rendering_System SHALL adapt rendering without code modifications
4. THE Refactored_System SHALL support scaling transformations applied to the canvas context

### Requirement 8: Improve Code Maintainability

**User Story:** As a developer, I want clear separation between scene logic and rendering logic, so that I can modify rendering without affecting game logic.

#### Acceptance Criteria

1. THE Base_Scene SHALL provide protected or public methods for common rendering operations
2. THE Concrete_Scene SHALL override or extend base rendering methods for scene-specific needs
3. WHEN modifying common rendering logic, THE Developer SHALL only need to change code in one location
4. THE Rendering_System SHALL use composition or inheritance to share rendering logic across scenes
5. WHEN adding a new scene, THE Developer SHALL be able to reuse existing rendering methods without duplication
