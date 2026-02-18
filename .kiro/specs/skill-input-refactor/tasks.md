# Implementation Plan: Skill Input Refactor

## Overview

This implementation plan refactors the skill grid input system to use persistent dynamic joysticks instead of on-the-fly creation. The changes focus on simplifying the InputManager code, fixing CSS to prevent touch blocking, and maintaining the existing START → HOLD → RELEASE action flow.

## Tasks

- [x] 1. Fix CSS to prevent cooldown overlay from blocking touch events
  - Add `pointer-events: none` to `.skill-cell .cooldown-overlay` in `public/css/style.css`
  - _Requirements: 2.1, 2.3_

- [x] 2. Refactor InputManager to use persistent dynamic joysticks
  - [x] 2.1 Add skillHoldIntervals field to InputManager constructor
    - Initialize as `[null, null, null, null]` to track HOLD interval IDs
    - _Requirements: 3.2_
  
  - [x] 2.2 Rewrite initSkillGrid method to create persistent joysticks
    - Remove all manual touch event listeners (touchstart, touchend, touchcancel)
    - Create dynamic joystick for each skill cell during initialization
    - Configure with mode 'dynamic', color 'rgba(255, 255, 255, 0.7)', size from INPUT_CONFIG.JOYSTICK_SIZE
    - Store joystick references in this.skillJoysticks array
    - _Requirements: 1.1, 1.2, 1.3, 8.1, 8.2_
  
  - [x] 2.3 Implement 'start' event handler for skill joysticks
    - Check cooldown state (this.skillCooldowns[i] > Date.now())
    - If on cooldown, return early without emitting actions
    - Emit START action with skill index, vector {x: 1, y: 0}, intensity 0
    - Start HOLD interval (50ms) that emits HOLD actions with updated vector/intensity
    - Store interval ID in this.skillHoldIntervals[i]
    - _Requirements: 3.1, 3.2, 4.2, 7.1_
  
  - [x] 2.4 Implement 'move' event handler for skill joysticks
    - Update internal state with current vector and intensity from event data
    - Transform vector Y coordinate: { x: data.vector.x, y: -data.vector.y }
    - Calculate intensity as min(1.0, data.distance / (INPUT_CONFIG.JOYSTICK_SIZE * 0.8))
    - _Requirements: 3.4, 3.5, 7.2_
  
  - [x] 2.5 Implement 'end' event handler for skill joysticks
    - Clear HOLD interval using this.skillHoldIntervals[i]
    - Check deadzone: if distance < JOYSTICK_SIZE * DEADZONE, log cancellation and return
    - Calculate final vector and intensity from event data
    - Emit RELEASE action with skill index, final vector, and intensity
    - _Requirements: 3.3, 5.1, 5.2, 5.3, 7.3_
  
  - [x] 2.6 Update destroy method to clean up skill joysticks
    - Iterate through this.skillJoysticks array
    - Destroy each joystick instance if it exists
    - Clear any remaining HOLD intervals
    - _Requirements: 1.4_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 4. Write unit tests for initialization and cleanup
  - [ ]* 4.1 Test initSkillGrid creates exactly 4 joysticks
    - Verify this.skillJoysticks.length === 4
    - Verify each joystick is truthy
    - _Requirements: 1.1, 1.3_
  
  - [ ]* 4.2 Test joystick configuration
    - Verify mode is 'dynamic'
    - Verify color is 'rgba(255, 255, 255, 0.7)'
    - Verify size is INPUT_CONFIG.JOYSTICK_SIZE
    - _Requirements: 1.2_
  
  - [ ]* 4.3 Test destroy method cleanup
    - Create InputManager, initialize, then destroy
    - Verify all joysticks are destroyed
    - Verify all intervals are cleared
    - _Requirements: 1.4_

- [ ]* 5. Write unit tests for action flow
  - [ ]* 5.1 Test START action emission
    - Simulate joystick 'start' event
    - Verify START action emitted with correct structure
    - Verify vector is {x: 1, y: 0} and intensity is 0
    - _Requirements: 3.1, 6.1, 6.3_
  
  - [ ]* 5.2 Test HOLD action emission
    - Simulate joystick 'start' event
    - Wait 100ms and verify at least 2 HOLD actions emitted
    - Verify HOLD actions have updated vector and intensity
    - _Requirements: 3.2_
  
  - [ ]* 5.3 Test RELEASE action emission
    - Simulate joystick 'end' event with distance > deadzone
    - Verify RELEASE action emitted with final vector and intensity
    - _Requirements: 3.3_
  
  - [ ]* 5.4 Test deadzone cancellation
    - Simulate joystick 'end' event with distance < deadzone
    - Verify no RELEASE action emitted
    - Verify cancellation log message appears
    - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 6. Write unit tests for cooldown handling
  - [ ]* 6.1 Test cooldown prevention
    - Set skill cooldown in future
    - Simulate joystick 'start' event
    - Verify no actions emitted
    - _Requirements: 4.2_
  
  - [ ]* 6.2 Test cooldown expiration
    - Set skill cooldown in past
    - Simulate joystick 'start' event
    - Verify START action emitted normally
    - _Requirements: 4.3_
  
  - [ ]* 6.3 Test updateCooldown stores timestamp
    - Call updateCooldown with skill index and timestamp
    - Verify this.skillCooldowns[index] is set correctly
    - _Requirements: 4.1_

- [ ]* 7. Write property-based tests for correctness properties
  - [ ]* 7.1 Property test: Vector normalization
    - **Property 1: Vector Normalization**
    - Generate random joystick positions with non-zero distance
    - Verify emitted vector has magnitude 1.0 (within tolerance)
    - Run 100 iterations
    - **Validates: Requirements 3.4, 6.2**
  
  - [ ]* 7.2 Property test: Intensity calculation and bounds
    - **Property 2: Intensity Calculation and Bounds**
    - Generate random joystick distances (0 to JOYSTICK_SIZE * 2)
    - Verify intensity = min(1.0, distance / (JOYSTICK_SIZE * 0.8))
    - Verify intensity always in range [0.0, 1.0]
    - Run 100 iterations
    - **Validates: Requirements 3.5, 6.4**
  
  - [ ]* 7.3 Property test: Cooldown prevention
    - **Property 3: Cooldown Prevention**
    - Generate random cooldown timestamps (past and future)
    - For future timestamps, verify no actions emitted
    - For past timestamps, verify actions emitted normally
    - Run 100 iterations
    - **Validates: Requirements 4.2**
  
  - [ ]* 7.4 Property test: Input data structure validity
    - **Property 4: Input Data Structure Validity**
    - Generate random skill activations with various joystick states
    - Verify all emitted data matches { skill, inputData: { action, vector, intensity } }
    - Verify action is 'START', 'HOLD', or 'RELEASE'
    - Run 100 iterations
    - **Validates: Requirements 6.1, 6.5**
  
  - [ ]* 7.5 Property test: Cooldown overlay height calculation
    - **Property 5: Cooldown Overlay Height Calculation**
    - Generate random cooldown durations and current times
    - Verify overlay height = (remaining / total) * 100
    - Verify height is 0 when cooldown expired
    - Run 100 iterations
    - **Validates: Requirements 4.4**

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The refactor maintains the existing START → HOLD → RELEASE action flow
- Cooldown checking moves from DOM blocking to state checking in the 'start' event handler
- The move joystick implementation serves as a reference for the dynamic joystick pattern
- Property-based tests require fast-check library: `npm install --save-dev fast-check`
