# Design Document: Skill Input Refactor

## Overview

This design refactors the skill grid input system to use persistent dynamic joysticks instead of on-the-fly joystick creation. The current implementation has three main issues:

1. Joysticks are created/destroyed on every touch, causing reliability issues
2. Cooldown overlays block touch events due to missing CSS pointer-events configuration
3. Complex manual touch event handling leads to error-prone code

The refactored design will:
- Initialize four persistent dynamic joysticks at startup (one per skill cell)
- Use nipplejs event handlers exclusively (no manual touch listeners)
- Fix CSS to prevent cooldown overlays from blocking input
- Simplify the code while maintaining the START → HOLD → RELEASE action flow

## Architecture

### Current Architecture (Problems)

```
initSkillGrid()
  ├─ For each skill cell:
  │   ├─ Add touchstart listener
  │   │   ├─ Create new joystick (dynamic creation)
  │   │   ├─ Send START action
  │   │   └─ Start setInterval for HOLD actions
  │   ├─ Add touchend listener
  │   │   ├─ Send RELEASE action
  │   │   └─ Destroy joystick
  │   └─ Add touchcancel listener
  │       └─ Cleanup
```

**Problems:**
- Joystick creation/destruction on every touch is unreliable
- Manual touch event management is complex
- Cooldown overlay blocks touches (CSS issue)
- setInterval management adds complexity

### Refactored Architecture (Solution)

```
initSkillGrid()
  ├─ For each skill cell:
  │   ├─ Create persistent dynamic joystick
  │   ├─ Register 'start' event → Send START, begin HOLD interval
  │   ├─ Register 'move' event → Update vector/intensity
  │   └─ Register 'end' event → Send RELEASE, clear interval

destroy()
  └─ Destroy all four joysticks
```

**Benefits:**
- Joysticks persist for the controller's lifetime
- nipplejs handles all touch events internally
- Simpler code with fewer edge cases
- Consistent with move joystick implementation

## Components and Interfaces

### InputManager.initSkillGrid()

**Purpose:** Initialize four persistent dynamic joysticks for the skill grid

**Algorithm:**
```
For i = 0 to 3:
  1. Query DOM for skill cell with class `.skill-cell.skill-${i}`
  2. Create dynamic joystick:
     - zone: skill cell element
     - mode: 'dynamic'
     - color: 'rgba(255, 255, 255, 0.7)'
     - size: INPUT_CONFIG.JOYSTICK_SIZE
  
  3. Store joystick reference in this.skillJoysticks[i]
  
  4. Register 'start' event handler:
     - Check if skill is on cooldown (this.skillCooldowns[i] > Date.now())
     - If on cooldown, return early
     - Emit START action with:
       * skill: i
       * inputData: { action: 'START', vector: {x: 1, y: 0}, intensity: 0 }
     - Start HOLD interval (50ms):
       * Get joystick data from event
       * Calculate vector and intensity
       * Emit HOLD action
  
  5. Register 'move' event handler:
     - Update internal state (vector/intensity) from event data
     - Note: HOLD interval will pick up these values
  
  6. Register 'end' event handler:
     - Clear HOLD interval
     - Get final joystick data from event
     - Check deadzone: if distance < JOYSTICK_SIZE * DEADZONE, cancel
     - Calculate final vector and intensity
     - Emit RELEASE action
```

**Key Changes from Current Implementation:**
- Joysticks created once during initialization, not on every touch
- No manual touchstart/touchend/touchcancel listeners
- nipplejs events ('start', 'move', 'end') handle all interaction
- Cooldown check happens in 'start' event, not in touch listener

### InputManager.destroy()

**Purpose:** Clean up all joystick instances

**Algorithm:**
```
1. If moveJoystick exists, destroy it
2. For each joystick in skillJoysticks:
   - If joystick exists, destroy it
```

### InputManager.updateCooldown()

**Purpose:** Update cooldown visual and state (no changes needed)

**Current Implementation:** Already correct, no modifications required

**Note:** This method updates the visual cooldown overlay and stores the cooldown end timestamp. The CSS fix (pointer-events: none) will prevent the overlay from blocking touches.

### CSS Changes

**File:** `public/css/style.css`

**Change:** Add pointer-events property to cooldown overlay

```css
.skill-cell .cooldown-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  height: 0%;
  transition: height 0.1s linear;
  pointer-events: none;  /* ADD THIS LINE */
}
```

**Rationale:** The cooldown overlay is purely visual and should not intercept touch events. Setting `pointer-events: none` allows touches to pass through to the skill cell beneath.

## Data Models

### Joystick Configuration

```javascript
{
  zone: HTMLElement,        // The skill cell DOM element
  mode: 'dynamic',          // Joystick appears at touch point
  color: 'rgba(255, 255, 255, 0.7)',
  size: 100                 // From INPUT_CONFIG.JOYSTICK_SIZE
}
```

### Skill Input Data Structure

```javascript
{
  skill: number,            // Skill index (0-3)
  inputData: {
    action: string,         // 'START' | 'HOLD' | 'RELEASE'
    vector: {
      x: number,            // Normalized x direction (-1 to 1)
      y: number             // Normalized y direction (-1 to 1)
    },
    intensity: number       // 0.0 to 1.0
  }
}
```

### Joystick Event Data

nipplejs provides event data in this structure:

```javascript
{
  vector: {
    x: number,              // Normalized x direction
    y: number               // Normalized y direction (positive = down)
  },
  distance: number,         // Distance from center in pixels
  angle: {
    radian: number,
    degree: number
  },
  force: number             // 0.0 to 1.0
}
```

**Important:** nipplejs uses positive Y for downward direction, but the game expects negative Y for downward. The vector must be transformed: `{ x: data.vector.x, y: -data.vector.y }`

### Internal State

```javascript
class InputManager {
  constructor(socket) {
    this.socket = socket;
    this.moveJoystick = null;
    this.skillJoysticks = [];           // Array of 4 joystick instances
    this.skillCooldowns = [0, 0, 0, 0]; // Cooldown end timestamps
    this.skillHoldIntervals = [null, null, null, null]; // HOLD interval IDs
  }
}
```

**New Field:** `skillHoldIntervals` - Stores setInterval IDs for each skill's HOLD action loop, allowing proper cleanup on release or cancel.


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Vector Normalization

*For any* joystick movement event with non-zero distance, the emitted vector SHALL have magnitude 1.0 (normalized).

**Validates: Requirements 3.4, 6.2**

**Rationale:** Directional input must be normalized to ensure consistent behavior across different joystick distances. The game logic expects unit vectors for direction.

### Property 2: Intensity Calculation and Bounds

*For any* joystick position, the calculated intensity SHALL equal min(1.0, distance / (JOYSTICK_SIZE * 0.8)) and SHALL always be in the range [0.0, 1.0].

**Validates: Requirements 3.5, 6.4**

**Rationale:** Intensity represents how far the joystick is pushed and must be properly scaled and clamped. The 0.8 factor allows reaching maximum intensity before the joystick edge.

### Property 3: Cooldown Prevention

*For any* skill that is on cooldown (cooldown end timestamp > current time), attempting to activate that skill SHALL not emit any START, HOLD, or RELEASE actions.

**Validates: Requirements 4.2**

**Rationale:** Skills on cooldown must be completely non-functional to prevent exploitation and maintain game balance.

### Property 4: Input Data Structure Validity

*For any* emitted skill input, the data structure SHALL conform to { skill: number, inputData: { action: string, vector: {x, y}, intensity: number } } where action is one of 'START', 'HOLD', or 'RELEASE'.

**Validates: Requirements 6.1, 6.5**

**Rationale:** Consistent data structure ensures the SkillManager can reliably parse and process skill inputs without type errors.

### Property 5: Cooldown Overlay Height Calculation

*For any* active cooldown, the overlay height percentage SHALL equal (remaining_time / total_cooldown_duration) * 100, where remaining_time = max(0, cooldown_end - current_time).

**Validates: Requirements 4.4**

**Rationale:** The visual cooldown indicator must accurately represent the remaining cooldown time to provide clear feedback to players.

## Error Handling

### Cooldown State Errors

**Scenario:** Skill activation attempted while on cooldown

**Handling:**
- Check cooldown state at the start of the 'start' event handler
- If `this.skillCooldowns[i] > Date.now()`, return early without emitting actions
- No error message needed (expected behavior)

### Missing DOM Elements

**Scenario:** Skill cell element not found during initialization

**Handling:**
```javascript
const cell = document.querySelector(`.skill-cell.skill-${i}`);
if (!cell) {
  console.error(`Skill cell ${i} not found during initialization`);
  continue; // Skip this skill cell
}
```

**Rationale:** Fail gracefully if DOM structure is incorrect, but log the error for debugging.

### Joystick Creation Failure

**Scenario:** nipplejs.create() fails or returns null

**Handling:**
```javascript
const joystick = nipplejs.create({ /* config */ });
if (!joystick) {
  console.error(`Failed to create joystick for skill ${i}`);
  this.skillJoysticks[i] = null;
  continue;
}
```

**Rationale:** Store null reference and continue initialization for other skills. Log error for debugging.

### Interval Cleanup

**Scenario:** HOLD interval not cleared properly

**Handling:**
- Always clear interval in 'end' event handler
- Also clear interval in error cases or early returns
- Store interval ID in `this.skillHoldIntervals[i]` for reliable cleanup

```javascript
if (this.skillHoldIntervals[i]) {
  clearInterval(this.skillHoldIntervals[i]);
  this.skillHoldIntervals[i] = null;
}
```

**Rationale:** Prevent memory leaks and duplicate HOLD emissions from orphaned intervals.

### Deadzone Cancellation

**Scenario:** Player releases joystick within deadzone

**Handling:**
```javascript
if (data.distance < INPUT_CONFIG.JOYSTICK_SIZE * INPUT_CONFIG.DEADZONE) {
  console.log(`Skill ${i} cancelled (deadzone)`);
  // Clear interval but don't emit RELEASE
  if (this.skillHoldIntervals[i]) {
    clearInterval(this.skillHoldIntervals[i]);
    this.skillHoldIntervals[i] = null;
  }
  return;
}
```

**Rationale:** Allow players to cancel skills by releasing without dragging. Log for debugging purposes.

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and integration points
- **Property tests**: Verify universal properties across randomized inputs

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide input space.

### Unit Testing Focus

Unit tests should cover:

1. **Initialization Examples**
   - Test that initSkillGrid creates exactly 4 joysticks
   - Test that each joystick has correct configuration (mode, color, size)
   - Test that destroy() cleans up all joysticks

2. **Action Flow Examples**
   - Test START action emitted on joystick 'start' event
   - Test HOLD actions emitted every 50ms during hold
   - Test RELEASE action emitted on joystick 'end' event
   - Test action flow with default vector {x: 1, y: 0} when joystick not moved

3. **Cooldown Examples**
   - Test skill activation blocked when on cooldown
   - Test skill activation allowed after cooldown expires
   - Test updateCooldown stores correct timestamp

4. **Deadzone Examples**
   - Test skill cancelled when released within deadzone
   - Test cancellation log message appears
   - Test no RELEASE action emitted on cancellation

5. **Edge Cases**
   - Test behavior when skill cell DOM element missing
   - Test behavior when joystick creation fails
   - Test interval cleanup on rapid touch/release cycles

### Property-Based Testing Focus

Property tests should verify universal correctness properties using a property-based testing library (e.g., fast-check for JavaScript):

**Configuration:** Each property test should run minimum 100 iterations with randomized inputs.

**Test Tagging:** Each property test must include a comment tag referencing the design property:
```javascript
// Feature: skill-input-refactor, Property 1: Vector Normalization
```

**Property Tests:**

1. **Property 1: Vector Normalization**
   - Generate random joystick positions (x, y, distance > 0)
   - Verify emitted vector has magnitude 1.0 (within floating point tolerance)
   - Tag: `Feature: skill-input-refactor, Property 1: Vector Normalization`

2. **Property 2: Intensity Calculation and Bounds**
   - Generate random joystick distances (0 to JOYSTICK_SIZE * 2)
   - Verify intensity = min(1.0, distance / (JOYSTICK_SIZE * 0.8))
   - Verify intensity always in range [0.0, 1.0]
   - Tag: `Feature: skill-input-refactor, Property 2: Intensity Calculation and Bounds`

3. **Property 3: Cooldown Prevention**
   - Generate random cooldown end timestamps (some in past, some in future)
   - For timestamps in future, verify no actions emitted on skill activation
   - For timestamps in past, verify actions emitted normally
   - Tag: `Feature: skill-input-refactor, Property 3: Cooldown Prevention`

4. **Property 4: Input Data Structure Validity**
   - Generate random skill activations with various joystick states
   - Verify all emitted data matches structure { skill, inputData: { action, vector, intensity } }
   - Verify action is always 'START', 'HOLD', or 'RELEASE'
   - Tag: `Feature: skill-input-refactor, Property 4: Input Data Structure Validity`

5. **Property 5: Cooldown Overlay Height Calculation**
   - Generate random cooldown durations and current times
   - Verify overlay height = (remaining / total) * 100
   - Verify height is 0 when cooldown expired
   - Tag: `Feature: skill-input-refactor, Property 5: Cooldown Overlay Height Calculation`

### Integration Testing

Integration tests should verify:

1. **End-to-End Skill Flow**
   - Initialize InputManager with mock socket
   - Simulate complete skill usage (start → hold → release)
   - Verify correct sequence of socket emissions

2. **CSS Integration**
   - Verify cooldown overlay has `pointer-events: none` in computed styles
   - Verify overlay doesn't block touch events (if testable in environment)

3. **Coordination with SkillManager**
   - Verify emitted input data is correctly parsed by SkillManager
   - Verify cooldown updates from SkillManager are correctly applied

### Testing Library Selection

For JavaScript property-based testing, use **fast-check**:

```bash
npm install --save-dev fast-check
```

Example property test structure:

```javascript
import fc from 'fast-check';

// Feature: skill-input-refactor, Property 1: Vector Normalization
test('Vector normalization property', () => {
  fc.assert(
    fc.property(
      fc.float({ min: -1, max: 1 }), // x
      fc.float({ min: -1, max: 1 }), // y
      (x, y) => {
        const distance = Math.sqrt(x * x + y * y);
        if (distance === 0) return true; // Skip zero vector
        
        const normalized = normalizeVector(x, y);
        const magnitude = Math.sqrt(
          normalized.x * normalized.x + 
          normalized.y * normalized.y
        );
        
        return Math.abs(magnitude - 1.0) < 0.0001; // Floating point tolerance
      }
    ),
    { numRuns: 100 }
  );
});
```
