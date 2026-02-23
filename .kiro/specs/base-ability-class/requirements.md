# Requirements Document

## Introduction

This document specifies the requirements for refactoring the game's ability system to use a base Ability class. Currently, the game has four ability implementations (Projectile, MeleeAttack, AOEEffect, HealEffect) that duplicate common properties and methods. This refactoring will establish a clear inheritance hierarchy, reduce code duplication, and make the system more maintainable and extensible for future ability types.

## Glossary

- **Ability**: A base class representing any action or effect that can be created by a player or entity in the game
- **Projectile**: A moving ability that travels in a direction and can hit targets
- **MeleeAttack**: A cone-shaped ability that damages targets in close range
- **AOEEffect**: An area-of-effect ability that damages all targets within a radius
- **HealEffect**: An ability that restores health to targets
- **Owner**: The entity (player or NPC) that created the ability
- **Lifetime**: The duration in milliseconds that an ability exists before being destroyed
- **Collision_Detection**: The process of determining if an ability intersects with a target entity

## Requirements

### Requirement 1: Base Ability Class Creation

**User Story:** As a developer, I want a base Ability class with common properties and methods, so that all ability types share consistent behavior and reduce code duplication.

#### Acceptance Criteria

1. THE Ability_Class SHALL define common properties: x, y, owner, lifetime, createdAt, isAlive, radius, and color
2. THE Ability_Class SHALL provide a constructor that accepts a configuration object and initializes all common properties
3. THE Ability_Class SHALL provide default values for optional properties (lifetime, radius, color)
4. THE Ability_Class SHALL define abstract methods: update, render, and checkCollision
5. THE Ability_Class SHALL provide a concrete destroy method that sets isAlive to false

### Requirement 2: Projectile Refactoring

**User Story:** As a developer, I want the Projectile class to extend the base Ability class, so that it inherits common functionality while maintaining projectile-specific behavior.

#### Acceptance Criteria

1. THE Projectile_Class SHALL extend the Ability_Class
2. THE Projectile_Class SHALL define projectile-specific properties: vx, vy, speed, damage, pierce, range, distanceTraveled, healAmount, effectType, and onImpact
3. WHEN a Projectile is constructed, THE Projectile_Class SHALL call the parent constructor with common properties
4. THE Projectile_Class SHALL override the update method to handle movement, range checking, and boundary checking
5. THE Projectile_Class SHALL override the render method to draw the projectile with motion trail
6. THE Projectile_Class SHALL override the checkCollision method to detect collisions with targets
7. THE Projectile_Class SHALL provide an onCollision method that returns whether the projectile should be destroyed based on pierce property

### Requirement 3: MeleeAttack Refactoring

**User Story:** As a developer, I want the MeleeAttack class to extend the base Ability class, so that it inherits common functionality while maintaining melee-specific behavior.

#### Acceptance Criteria

1. THE MeleeAttack_Class SHALL extend the Ability_Class
2. THE MeleeAttack_Class SHALL define melee-specific properties: damage, range, coneAngle, direction, angle, and duration
3. WHEN a MeleeAttack is constructed, THE MeleeAttack_Class SHALL call the parent constructor with common properties
4. THE MeleeAttack_Class SHALL override the update method to check lifetime expiration
5. THE MeleeAttack_Class SHALL override the render method to draw a cone-shaped attack with fade-out animation
6. THE MeleeAttack_Class SHALL override the checkCollision method to detect collisions within the cone area

### Requirement 4: AOEEffect Refactoring

**User Story:** As a developer, I want the AOEEffect class to extend the base Ability class, so that it inherits common functionality while maintaining AOE-specific behavior.

#### Acceptance Criteria

1. THE AOEEffect_Class SHALL extend the Ability_Class
2. THE AOEEffect_Class SHALL define AOE-specific properties: damage and hasDealtDamage
3. WHEN an AOEEffect is constructed, THE AOEEffect_Class SHALL call the parent constructor with common properties
4. THE AOEEffect_Class SHALL override the update method to check lifetime expiration
5. THE AOEEffect_Class SHALL override the render method to draw an expanding circle with fade-out animation
6. THE AOEEffect_Class SHALL override the checkCollision method to detect collisions within the radius, respecting the hasDealtDamage flag
7. THE AOEEffect_Class SHALL provide a markDamageDealt method to prevent multiple damage applications

### Requirement 5: HealEffect Refactoring

**User Story:** As a developer, I want the HealEffect class to extend the base Ability class, so that it inherits common functionality while maintaining heal-specific behavior.

#### Acceptance Criteria

1. THE HealEffect_Class SHALL extend the Ability_Class
2. THE HealEffect_Class SHALL define heal-specific properties: amount (healing amount)
3. WHEN a HealEffect is constructed, THE HealEffect_Class SHALL call the parent constructor with common properties
4. THE HealEffect_Class SHALL override the update method to move upward and check lifetime expiration
5. THE HealEffect_Class SHALL override the render method to draw a healing cross symbol with fade-out animation
6. THE HealEffect_Class SHALL NOT override the checkCollision method (uses base implementation)

### Requirement 6: Backward Compatibility

**User Story:** As a developer, I want all existing ability functionality to continue working after refactoring, so that no game features are broken by the changes.

#### Acceptance Criteria

1. WHEN any ability is created with the same configuration as before refactoring, THE System SHALL produce identical behavior
2. WHEN any ability's update method is called, THE System SHALL produce the same state changes as before refactoring
3. WHEN any ability's render method is called, THE System SHALL produce the same visual output as before refactoring
4. WHEN any ability's checkCollision method is called, THE System SHALL return the same collision results as before refactoring
5. WHEN any ability's destroy method is called, THE System SHALL mark the ability as not alive

### Requirement 7: Code Organization

**User Story:** As a developer, I want the ability classes organized in a clear file structure, so that the codebase is maintainable and easy to navigate.

#### Acceptance Criteria

1. THE System SHALL create a new file at public/js/entities/Ability.js for the base class
2. THE System SHALL maintain existing files for Projectile, MeleeAttack, AOEEffect, and HealEffect
3. WHEN any ability subclass file is opened, THE File SHALL import the base Ability class
4. THE System SHALL export each class as the default export from its file
