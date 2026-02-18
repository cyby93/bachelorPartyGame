# Implementation Plan: Ability System

## Overview

This plan implements a comprehensive ability system for 8 character classes with 4 skills each (32 total abilities). The implementation is organized around 6 core mechanic archetypes (PROJECTILE, MELEE, CAST, SHIELD, AOE, DASH/TELEPORT) with a unified SkillManager interface. The existing SkillManager.js will be refactored to support all mechanic types with proper collision detection, buff/debuff systems, and visual feedback.

## Tasks

- [x] 1. Set up skill configuration database
  - Create `public/js/config/SkillDatabase.js` with all 32 skill configurations
  - Define configuration objects for all 8 classes (Warrior, Paladin, Shaman, Hunter, Priest, Mage, Druid, Rogue)
  - Include all parameters: type, subtype, cooldown, damage, range, speed, radius, angle, pierce, castTime, arc, duration, distance, payload, effectType, effectParams
  - _Requirements: 8.1-8.6, 9.1-9.6, 10.1-10.7, 11.1-11.5, 12.1-12.7, 13.1-13.7, 14.1-14.8, 15.1-15.7, 20.1-20.10_

- [ ]* 1.1 Write unit tests for skill configuration database
  - Test that all 8 classes have exactly 4 skills
  - Test that all required parameters are present for each skill type
  - Test specific skill examples (Warrior Cleave, Priest Mass Resurrection, Mage Pyroblast)
  - _Requirements: 8.1-15.7_

- [x] 2. Implement enhanced Projectile entity
  - Update `public/js/entities/Projectile.js` to include: pierce, range, distanceTraveled, owner reference
  - Add update method that increments distanceTraveled and checks range limit
  - Add collision handling that respects pierce parameter
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7_

- [ ]* 2.1 Write property test for projectile initialization
  - **Property 1: Projectile Initialization**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 2.2 Write property test for projectile movement
  - **Property 2: Projectile Movement Consistency**
  - **Validates: Requirements 1.3**

- [ ]* 2.3 Write property test for projectile collision handling
  - **Property 3: Projectile Collision Handling**
  - **Validates: Requirements 1.4, 1.5, 1.6**

- [ ]* 2.4 Write property test for projectile range limit
  - **Property 4: Projectile Range Limit**
  - **Validates: Requirements 1.7**

- [x] 3. Implement MeleeHandler with cone detection
  - Create `public/js/handlers/MeleeHandler.js`
  - Implement execute method with instant hit detection
  - Implement isInCone method using distance and angle calculations
  - Implement renderEffect method for slash arc visual
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 3.1 Write property test for melee cone hit detection
  - **Property 5: Melee Cone Hit Detection**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 4. Implement CastHandler with charge-up mechanics
  - Create `public/js/handlers/CastHandler.js`
  - Implement startCast method that freezes/slows player movement
  - Implement updateCast method that increments timer and checks completion
  - Implement cancelCast method for interruption handling
  - Implement executePayload method that triggers the payload ability
  - Add cast state tracking to player entity
  - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ]* 4.1 Write property test for cast movement state management
  - **Property 6: Cast Movement State Management**
  - **Validates: Requirements 3.1, 3.7**

- [ ]* 4.2 Write property test for cast timer progression
  - **Property 7: Cast Timer Progression**
  - **Validates: Requirements 3.3**

- [ ]* 4.3 Write property test for cast cancellation conditions
  - **Property 8: Cast Cancellation Conditions**
  - **Validates: Requirements 3.4, 3.5**

- [ ]* 4.4 Write property test for cast completion and payload
  - **Property 9: Cast Completion and Payload**
  - **Validates: Requirements 3.6**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement ShieldHandler with directional blocking
  - Create `public/js/handlers/ShieldHandler.js`
  - Implement activate method that sets isShielding state and reduces movement speed
  - Implement deactivate method that restores movement speed
  - Implement isBlocked method that calculates impact angle vs shield angle
  - Implement update method for duration tracking
  - Add shield state tracking to player entity
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ]* 6.1 Write property test for shield activation state
  - **Property 10: Shield Activation State**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ]* 6.2 Write property test for shield blocking calculation
  - **Property 11: Shield Blocking Calculation**
  - **Validates: Requirements 4.4**

- [ ]* 6.3 Write property test for shield deactivation
  - **Property 12: Shield Deactivation**
  - **Validates: Requirements 4.5, 4.6**

- [x] 7. Implement AOEHandler for area effects
  - Create `public/js/handlers/AOEHandler.js`
  - Implement executeSelf method for self-centered AOE
  - Implement executeLobbed method for thrown AOE with intensity-based targeting
  - Implement applyEffects method that checks radius and applies effects
  - Implement isInRadius method for distance checking
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ]* 7.1 Write property test for AOE self effect application
  - **Property 13: AOE Self Effect Application**
  - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ]* 7.2 Write property test for AOE lobbed targeting
  - **Property 14: AOE Lobbed Targeting**
  - **Validates: Requirements 5.4, 5.5**

- [ ]* 7.3 Write property test for AOE explosion effect
  - **Property 15: AOE Explosion Effect**
  - **Validates: Requirements 5.6, 5.7**

- [x] 8. Implement DashHandler for movement abilities
  - Create `public/js/handlers/DashHandler.js`
  - Implement executeDash method that applies high velocity or instant movement
  - Implement executeTeleport method for instant position change
  - Implement isPathClear method for wall collision checking
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 8.1 Write property test for dash direction and distance
  - **Property 16: Dash Direction and Distance**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 9. Implement CollisionSystem
  - Create `public/js/systems/CollisionSystem.js`
  - Implement checkProjectileCollision for walls and entities
  - Implement checkMeleeCone for cone-based hit detection
  - Implement getEntitiesInRadius for AOE detection
  - Implement angleBetween and distance utility methods
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ]* 9.1 Write property test for collision detection consistency
  - **Property 19: Collision Detection Consistency**
  - **Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement EffectSystem for buffs and debuffs
  - Create `public/js/systems/EffectSystem.js`
  - Implement applyDamage method
  - Implement applyHealing method
  - Implement applyBuff method with stat modifications
  - Implement applyDebuff method with negative effects
  - Implement updateEffects method for duration tracking
  - Implement cleanupExpiredEffects method
  - Add activeEffects array to player and enemy entities
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ]* 11.1 Write property test for buff application and expiry
  - **Property 20: Buff Application and Expiry**
  - **Validates: Requirements 17.1, 17.2**

- [ ]* 11.2 Write property test for debuff application and expiry
  - **Property 21: Debuff Application and Expiry**
  - **Validates: Requirements 17.3, 17.4**

- [ ]* 11.3 Write property test for effect stacking
  - **Property 22: Effect Stacking**
  - **Validates: Requirements 17.5**

- [x] 12. Refactor SkillManager with unified handler interface
  - Update `public/js/managers/SkillManager.js` to use new handler architecture
  - Implement handleSkill method with scene, player, skillIndex, inputData parameters
  - Implement getSkillConfig method that looks up skills from SkillDatabase
  - Implement isOnCooldown and startCooldown methods
  - Add routing logic to dispatch to appropriate handlers based on skill type
  - _Requirements: 7.1, 7.2, 7.6_

- [ ]* 12.1 Write property test for input data extraction
  - **Property 17: Input Data Extraction**
  - **Validates: Requirements 7.3, 7.4, 7.5**

- [ ]* 12.2 Write property test for skill type routing
  - **Property 18: Skill Type Routing**
  - **Validates: Requirements 7.2, 7.6**

- [x] 13. Implement input handling system
  - Update input processing to create InputData objects with action, vector, intensity
  - Implement vector normalization for aim direction
  - Implement intensity clamping to [0.0, 1.0] range
  - Add support for START, HOLD, RELEASE action types
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ]* 13.1 Write property test for input action registration
  - **Property 23: Input Action Registration**
  - **Validates: Requirements 19.1, 19.2, 19.3**

- [ ]* 13.2 Write property test for vector normalization
  - **Property 24: Vector Normalization**
  - **Validates: Requirements 19.4**

- [x] 14. Implement Warrior class skills
  - Add Warrior skill configurations to SkillDatabase
  - S1: Cleave (MELEE with cone attack)
  - S2: Thunder Clap (AOE_SELF with damage and slow debuff)
  - S3: Charge (DASH with stun on first enemy hit)
  - S4: Shield Wall (BUFF with 90% damage reduction, 360-degree protection)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ]* 14.1 Write unit tests for Warrior skills
  - Test Cleave hits enemies in cone
  - Test Thunder Clap damages and slows enemies in radius
  - Test Charge dashes and stuns first enemy
  - Test Shield Wall provides 360-degree protection
  - _Requirements: 8.1-8.6_

- [x] 15. Implement Paladin class skills
  - Add Paladin skill configurations to SkillDatabase
  - S1: Hammer Swing (MELEE)
  - S2: Judgement (PROJECTILE hammer)
  - S3: Divine Shield (SHIELD directional)
  - S4: Consecration (AOE_SELF zone with damage to enemies, heal to allies)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ]* 15.1 Write unit tests for Paladin skills
  - Test all 4 Paladin skills execute correctly
  - Test Consecration damages enemies and heals allies
  - _Requirements: 9.1-9.6_

- [x] 16. Implement Shaman class skills
  - Add Shaman skill configurations to SkillDatabase
  - S1: Lightning Bolt (PROJECTILE fast)
  - S2: Chain Heal (PROJECTILE targeted heal with beam visual)
  - S3: Ghost Wolf (BUFF +50% movement speed)
  - S4: Bloodlust (AOE_SELF global buff +30% fire rate and speed)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ]* 16.1 Write unit tests for Shaman skills
  - Test all 4 Shaman skills execute correctly
  - Test Bloodlust affects all allies in range
  - _Requirements: 10.1-10.7_

- [x] 17. Implement Hunter class skills
  - Add Hunter skill configurations to SkillDatabase
  - S1: Shoot Bow (PROJECTILE long range)
  - S2: Multi-Shot (PROJECTILE with 3-projectile fan spread)
  - S3: Disengage (DASH backwards)
  - S4: Explosive Trap (AOE_LOBBED with explosion on enemy touch)
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 17.1 Write unit tests for Hunter skills
  - Test all 4 Hunter skills execute correctly
  - Test Multi-Shot spawns 3 projectiles in spread
  - Test Disengage dashes backwards
  - _Requirements: 11.1-11.5_

- [ ] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Implement Priest class skills
  - Add Priest skill configurations to SkillDatabase
  - S1: Smite (PROJECTILE weak damage)
  - S2: Flash Heal (AOE_LOBBED instant heal)
  - S3: Power Word: Shield (BUFF temporary HP shield)
  - S4: Mass Resurrection (CAST 2.0s → AOE_SELF revive with 50% HP)
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [ ]* 19.1 Write unit tests for Priest skills
  - Test all 4 Priest skills execute correctly
  - Test Mass Resurrection requires 2.0s cast and revives dead players
  - _Requirements: 12.1-12.7_

- [x] 20. Implement Mage class skills
  - Add Mage skill configurations to SkillDatabase
  - S1: Fireball (PROJECTILE standard)
  - S2: Frost Nova (AOE_SELF root enemies for 2s)
  - S3: Blink (TELEPORT 150px instant)
  - S4: Pyroblast (CAST 1.5s → PROJECTILE massive with AOE on impact)
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [ ]* 20.1 Write unit tests for Mage skills
  - Test all 4 Mage skills execute correctly
  - Test Frost Nova roots enemies (movement speed = 0)
  - Test Pyroblast requires 1.5s cast and creates AOE on impact
  - _Requirements: 13.1-13.7_

- [x] 21. Implement Druid class skills
  - Add Druid skill configurations to SkillDatabase
  - S1: Wrath (PROJECTILE magic)
  - S2: Bear Form (BUFF transform with +armor, +HP, S1 becomes melee bite)
  - S3: Cat Dash (DASH quick leap)
  - S4: Tranquility (CAST 4.0s channeled → AOE_SELF heal every 0.5s)
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

- [ ]* 21.1 Write unit tests for Druid skills
  - Test all 4 Druid skills execute correctly
  - Test Bear Form transforms sprite and changes S1 to melee
  - Test Tranquility channels for 4.0s and heals every 0.5s
  - _Requirements: 14.1-14.8_

- [x] 22. Implement Rogue class skills
  - Add Rogue skill configurations to SkillDatabase
  - S1: Sinister Strike (MELEE very short range, high damage)
  - S2: Fan of Knives (AOE_SELF → 8 PROJECTILE knives in circle)
  - S3: Sprint (BUFF +100% speed for 3s)
  - S4: Ambush (BUFF stealth, semi-transparent, next attack 3x damage)
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [ ]* 22.1 Write unit tests for Rogue skills
  - Test all 4 Rogue skills execute correctly
  - Test Fan of Knives spawns 8 projectiles in circular pattern
  - Test Ambush prevents enemy targeting and multiplies next attack damage
  - _Requirements: 15.1-15.7_

- [x] 23. Implement visual feedback system
  - Create visual effects for projectiles (sprites based on class color)
  - Create slash arc effect for melee attacks
  - Create progress bar UI for cast abilities
  - Create shield visual that rotates with aim direction
  - Create AOE explosion effects with radius visualization
  - Create dash/teleport movement trails
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

- [x] 24. Integrate with game loop
  - Update main game loop to call CastHandler.updateCast for active casts
  - Update main game loop to call ShieldHandler.update for active shields
  - Update main game loop to call EffectSystem.updateEffects for all entities
  - Update collision detection to use CollisionSystem methods
  - Update projectile updates to check range limits
  - _Requirements: 1.3, 1.7, 3.3, 4.5, 17.2, 17.4_

- [x] 25. Add error handling
  - Add null/undefined parameter validation to all handler methods
  - Add skill index bounds checking in SkillManager
  - Add class name validation in getSkillConfig
  - Add InputData validation with safe defaults
  - Add collision edge case handling (zero distance, simultaneous collisions)
  - Add cast interruption handling (scene change, player death, stun)
  - Add effect system edge cases (conflicting effects, negative stats, overflow)
  - Add cooldown edge cases (rapid activation, scene change, time manipulation)
  - _Requirements: Error Handling section_

- [x] 26. Final checkpoint - Ensure all tests pass
  - Run all unit tests and property tests
  - Verify all 32 skills work correctly
  - Verify all 6 mechanic archetypes function properly
  - Test edge cases and error conditions
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at reasonable breaks
- Property tests validate universal correctness properties using fast-check library (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases for all 32 class skills
- The existing SkillManager.js will be refactored to use the new handler architecture
- All handlers are implemented as separate modules for maintainability
- Visual feedback is implemented last to ensure core mechanics work first
