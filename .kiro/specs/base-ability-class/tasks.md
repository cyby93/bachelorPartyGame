# Implementation Plan: Base Ability Class Refactoring

## Overview

This plan refactors the ability system to use a base Ability class, eliminating code duplication across Projectile, MeleeAttack, AOEEffect, and HealEffect classes. The implementation follows an incremental approach: create the base class first, then refactor each ability type one at a time, ensuring tests pass at each step.

## Tasks

- [x] 1. Create base Ability class
  - Create new file `public/js/entities/Ability.js`
  - Implement constructor accepting configuration object with common properties (x, y, owner, lifetime, createdAt, isAlive, radius, color)
  - Provide default values for optional properties (lifetime: 5000, radius: 10, color: '#ffffff')
  - Implement concrete `destroy()` method that sets isAlive to false
  - Define abstract method signatures for `update(deltaTime)`, `render(ctx)`, and `checkCollision(target)`
  - Export Ability as default export
  - _Requirements: 1.2, 1.3, 1.5, 7.1, 7.4_

- [x] 1.1 Write property tests for base Ability class
  - **Property 1: Constructor initialization**
  - **Property 2: Default values**
  - **Property 3: Destroy method**
  - Set up fast-check testing framework if not already configured
  - Create test file for Ability class
  - _Requirements: 1.2, 1.3, 1.5_

- [x] 2. Refactor Projectile class to extend Ability
  - [x] 2.1 Update Projectile class to extend Ability
    - Import Ability base class
    - Change class declaration to extend Ability
    - Update constructor to call `super(config)` with base properties
    - Keep projectile-specific properties (vx, vy, speed, damage, pierce, range, distanceTraveled, healAmount, effectType, onImpact)
    - Ensure all existing methods remain functional
    - _Requirements: 2.1, 2.2, 2.3, 7.3, 7.4_
  
  - [x] 2.2 Write property tests for Projectile class
    - **Property 4: Projectile constructor initialization**
    - **Property 5: Projectile movement**
    - **Property 6: Projectile range limit**
    - **Property 7: Projectile boundary checking**
    - **Property 8: Projectile collision detection**
    - **Property 9: Projectile pierce behavior**
    - _Requirements: 2.3, 2.4, 2.6, 2.7_
  
  - [x] 2.3 Write unit tests for Projectile edge cases
    - Test zero velocity projectiles
    - Test projectiles at canvas boundaries
    - Test null target collision checks
    - Test lifetime expiration
    - _Requirements: 2.4, 2.6_

- [x] 3. Checkpoint - Verify Projectile refactoring
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Refactor MeleeAttack class to extend Ability
  - [x] 4.1 Update MeleeAttack class to extend Ability
    - Import Ability base class
    - Change class declaration to extend Ability
    - Update constructor to call `super(config)` with base properties
    - Keep melee-specific properties (damage, range, coneAngle, direction, angle, duration)
    - Ensure angle calculation from direction vector remains
    - Ensure all existing methods remain functional
    - _Requirements: 3.1, 3.2, 3.3, 7.3, 7.4_
  
  - [x] 4.2 Write property tests for MeleeAttack class
    - **Property 10: MeleeAttack constructor initialization**
    - **Property 11: MeleeAttack collision detection**
    - **Property 17: Lifetime expiration** (shared property)
    - _Requirements: 3.3, 3.4, 3.6_
  
  - [x] 4.3 Write unit tests for MeleeAttack edge cases
    - Test invalid direction vectors
    - Test collision at exact range boundary
    - Test lifetime expiration timing
    - _Requirements: 3.4, 3.6_

- [x] 5. Checkpoint - Verify MeleeAttack refactoring
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Refactor AOEEffect class to extend Ability
  - [x] 6.1 Update AOEEffect class to extend Ability
    - Import Ability base class
    - Change class declaration to extend Ability
    - Update constructor to call `super(config)` with base properties
    - Keep AOE-specific properties (damage, hasDealtDamage)
    - Ensure hasDealtDamage initializes to false
    - Ensure all existing methods remain functional
    - _Requirements: 4.1, 4.2, 4.3, 7.3, 7.4_
  
  - [x] 6.2 Write property tests for AOEEffect class
    - **Property 12: AOEEffect constructor initialization**
    - **Property 13: AOEEffect collision with damage flag**
    - **Property 14: AOEEffect damage marking**
    - **Property 17: Lifetime expiration** (shared property)
    - _Requirements: 4.3, 4.4, 4.6, 4.7_
  
  - [x] 6.3 Write unit tests for AOEEffect edge cases
    - Test markDamageDealt prevents further collisions
    - Test collision at exact radius boundary
    - Test expanding radius animation timing
    - _Requirements: 4.6, 4.7_

- [x] 7. Checkpoint - Verify AOEEffect refactoring
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Refactor HealEffect class to extend Ability
  - [x] 8.1 Update HealEffect class to extend Ability
    - Import Ability base class
    - Change class declaration to extend Ability
    - Update constructor to call `super(config)` with base properties
    - Keep heal-specific property (amount)
    - Ensure all existing methods remain functional
    - _Requirements: 5.1, 5.2, 5.3, 7.3, 7.4_
  
  - [x] 8.2 Write property tests for HealEffect class
    - **Property 15: HealEffect constructor initialization**
    - **Property 16: HealEffect upward movement**
    - **Property 17: Lifetime expiration** (shared property)
    - _Requirements: 5.3, 5.4_
  
  - [x] 8.3 Write unit tests for HealEffect edge cases
    - Test upward movement rate (0.5 pixels per frame)
    - Test lifetime expiration timing
    - Test amount property initialization
    - _Requirements: 5.4_

- [x] 9. Checkpoint - Verify HealEffect refactoring
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Integration verification
  - [x] 10.1 Verify inheritance hierarchy
    - Test that all ability classes are instances of Ability
    - Test that all abilities can be stored in a single array
    - Test that destroy() works on all ability types
    - _Requirements: 6.1, 6.5_
  
  - [x] 10.2 Write integration tests
    - Test mixed array of different ability types
    - Test polymorphic behavior (calling update/render on base type)
    - Test that all abilities respond to common interface
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 11. Final checkpoint - Complete refactoring verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify no regressions in game functionality
  - Confirm all ability types work correctly in actual gameplay

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each ability class is refactored independently to minimize risk
- Checkpoints after each class ensure incremental validation
- Property tests validate universal correctness properties across random inputs
- Unit tests validate specific examples and edge cases
- Integration tests ensure the inheritance hierarchy works correctly
- All tests should use fast-check library with minimum 100 iterations per property test
- Each property test must include a comment tag: `// Feature: base-ability-class, Property N: [property title]`
