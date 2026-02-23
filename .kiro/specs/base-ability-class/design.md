# Design Document: Base Ability Class Refactoring

## Overview

This design establishes a base Ability class that encapsulates common properties and methods shared across all ability types in the game. The refactoring follows object-oriented inheritance principles to eliminate code duplication while preserving the unique behavior of each ability type.

The base class will handle:
- Common property initialization (position, owner, lifetime, visual properties)
- Lifecycle management (creation timestamp, alive state)
- Standard interface definition (update, render, checkCollision, destroy)

Each ability subclass will:
- Extend the base Ability class
- Define its own specific properties
- Override abstract methods with specialized implementations
- Maintain all existing functionality

## Architecture

### Class Hierarchy

```
Ability (base class)
├── Projectile
├── MeleeAttack
├── AOEEffect
└── HealEffect
```

### Inheritance Strategy

The design uses classical JavaScript inheritance with ES6 classes:
- Base class defines common properties and provides method signatures
- Subclasses call `super(config)` to initialize base properties
- Subclasses override methods to implement specific behavior
- Base class provides concrete implementation for `destroy()` method

### File Structure

```
public/js/entities/
├── Ability.js          (new base class)
├── Projectile.js       (refactored to extend Ability)
├── MeleeAttack.js      (refactored to extend Ability)
├── AOEEffect.js        (refactored to extend Ability)
└── HealEffect.js       (refactored to extend Ability)
```

## Components and Interfaces

### Base Ability Class

**File:** `public/js/entities/Ability.js`

**Purpose:** Provides common functionality for all ability types

**Properties:**
- `x: number` - X coordinate position
- `y: number` - Y coordinate position
- `owner: Object` - Reference to the entity that created this ability
- `lifetime: number` - Duration in milliseconds before auto-destruction (default: 5000)
- `createdAt: number` - Timestamp when ability was created
- `isAlive: boolean` - Whether the ability is active (default: true)
- `radius: number` - Size for collision detection and rendering (default: 10)
- `color: string` - Visual color in hex format (default: '#ffffff')

**Constructor:**
```javascript
constructor(config)
```
- Accepts configuration object with all properties
- Initializes common properties from config
- Provides default values for optional properties
- Sets `createdAt` to current timestamp
- Sets `isAlive` to true

**Methods:**

```javascript
update(deltaTime)
```
- Abstract method to be overridden by subclasses
- Updates ability state each frame
- Parameters: `deltaTime` - time elapsed since last frame (milliseconds)

```javascript
render(ctx)
```
- Abstract method to be overridden by subclasses
- Draws the ability on the canvas
- Parameters: `ctx` - Canvas 2D rendering context

```javascript
checkCollision(target)
```
- Abstract method to be overridden by subclasses
- Checks if ability collides with a target entity
- Parameters: `target` - Entity to check collision against
- Returns: `boolean` - true if collision detected

```javascript
destroy()
```
- Concrete method (not abstract)
- Marks the ability as no longer alive
- Sets `isAlive` to false

### Projectile Class

**File:** `public/js/entities/Projectile.js`

**Extends:** Ability

**Additional Properties:**
- `vx: number` - Velocity in X direction
- `vy: number` - Velocity in Y direction
- `speed: number` - Movement speed (calculated from vx/vy if not provided)
- `damage: number` - Damage dealt on collision (default: 10)
- `pierce: boolean` - Whether projectile continues after hitting (default: false)
- `range: number` - Maximum travel distance (default: 500)
- `distanceTraveled: number` - Distance traveled so far (default: 0)
- `healAmount: number` - Healing amount for healing projectiles (default: 0)
- `effectType: string` - Type of effect: 'DAMAGE', 'HEAL', etc. (default: 'DAMAGE')
- `onImpact: Function|null` - Callback for impact effects like AOE (default: null)

**Constructor:**
- Calls `super(config)` with base properties
- Initializes projectile-specific properties
- Calculates speed from vx/vy if not provided

**Overridden Methods:**

`update(deltaTime)`:
- Calculates distance moved this frame
- Updates position based on velocity
- Increments distanceTraveled
- Checks if range exceeded → sets isAlive to false
- Checks canvas boundaries → sets isAlive to false if out of bounds
- Checks lifetime expiration → sets isAlive to false if expired

`render(ctx)`:
- Returns early if not alive
- Draws main projectile circle with color and white stroke
- Calculates angle from velocity
- Draws motion trail behind projectile (semi-transparent smaller circle)

`checkCollision(target)`:
- Returns false if not alive or no target
- Calculates distance between projectile and target
- Returns true if distance < (projectile radius + target radius)

**Additional Methods:**

`onCollision(target)`:
- Returns false if pierce is enabled (projectile continues)
- Returns true otherwise (projectile should be destroyed)

### MeleeAttack Class

**File:** `public/js/entities/MeleeAttack.js`

**Extends:** Ability

**Additional Properties:**
- `damage: number` - Damage dealt to targets (default: 15)
- `range: number` - Attack reach distance (default: 80)
- `coneAngle: number` - Angle of attack cone in radians (default: π/3)
- `direction: Object` - Attack direction vector {x, y} (default: {x: 1, y: 0})
- `angle: number` - Calculated angle from direction vector
- `duration: number` - How long attack persists (default: 200ms)

**Constructor:**
- Calls `super(config)` with base properties
- Initializes melee-specific properties
- Calculates angle from direction vector using atan2

**Overridden Methods:**

`update(deltaTime)`:
- Returns early if not alive
- Checks if current time exceeds createdAt + lifetime
- Sets isAlive to false if expired

`render(ctx)`:
- Returns early if not alive
- Saves canvas state
- Translates to attack position and rotates by angle
- Calculates alpha fade based on lifetime progress
- Draws cone/arc shape with color and white stroke
- Restores canvas state

`checkCollision(target)`:
- Returns false if not alive or no target
- Calculates distance between attack center and target
- Returns true if distance < (attack radius + target radius)
- Note: Current implementation uses simple radius check, not cone geometry

### AOEEffect Class

**File:** `public/js/entities/AOEEffect.js`

**Extends:** Ability

**Additional Properties:**
- `damage: number` - Damage dealt to targets in area (default: 20)
- `hasDealtDamage: boolean` - Flag to prevent multiple damage applications (default: false)

**Constructor:**
- Calls `super(config)` with base properties
- Initializes AOE-specific properties

**Overridden Methods:**

`update(deltaTime)`:
- Returns early if not alive
- Checks if current time exceeds createdAt + lifetime
- Sets isAlive to false if expired

`render(ctx)`:
- Returns early if not alive
- Saves canvas state
- Calculates progress (0 to 1) based on lifetime
- Calculates expanding radius (50% to 100% of full radius)
- Calculates fading alpha based on progress
- Draws outer circle with color fill and stroke
- Draws inner circle (70% size) with white stroke
- Restores canvas state

`checkCollision(target)`:
- Returns false if not alive, no target, or hasDealtDamage is true
- Calculates distance between effect center and target
- Returns true if distance < (effect radius + target radius)

**Additional Methods:**

`markDamageDealt()`:
- Sets hasDealtDamage to true
- Prevents the effect from dealing damage again

### HealEffect Class

**File:** `public/js/entities/HealEffect.js`

**Extends:** Ability

**Additional Properties:**
- `amount: number` - Healing amount restored to targets (default: 30)

**Constructor:**
- Calls `super(config)` with base properties
- Initializes heal-specific properties

**Overridden Methods:**

`update(deltaTime)`:
- Returns early if not alive
- Moves effect upward by 0.5 pixels per frame
- Checks if current time exceeds createdAt + lifetime
- Sets isAlive to false if expired

`render(ctx)`:
- Returns early if not alive
- Saves canvas state
- Calculates progress (0 to 1) based on lifetime
- Calculates fading alpha based on progress
- Calculates expanding radius (100% to 150% of base radius)
- Draws circle with green color and white stroke
- Draws cross symbol (+ shape) in white
- Restores canvas state

Note: HealEffect does not override checkCollision, so it uses the base implementation (which would need to be defined in the base class).

## Data Models

### Configuration Objects

All ability classes accept a configuration object in their constructor. The configuration object structure:

**Base Configuration (all abilities):**
```javascript
{
  x: number,              // Required: X position
  y: number,              // Required: Y position
  owner: Object,          // Required: Entity that created the ability
  lifetime: number,       // Optional: Duration in ms (default varies by type)
  radius: number,         // Optional: Size (default varies by type)
  color: string          // Optional: Hex color (default varies by type)
}
```

**Projectile Configuration:**
```javascript
{
  ...baseConfig,
  vx: number,            // Optional: X velocity (default: 0)
  vy: number,            // Optional: Y velocity (default: 0)
  speed: number,         // Optional: Calculated from vx/vy if not provided
  damage: number,        // Optional: Damage amount (default: 10)
  pierce: boolean,       // Optional: Continue after hit (default: false)
  range: number,         // Optional: Max distance (default: 500)
  healAmount: number,    // Optional: Healing amount (default: 0)
  effectType: string,    // Optional: 'DAMAGE', 'HEAL', etc. (default: 'DAMAGE')
  onImpact: Function     // Optional: Impact callback (default: null)
}
```

**MeleeAttack Configuration:**
```javascript
{
  ...baseConfig,
  damage: number,        // Optional: Damage amount (default: 15)
  range: number,         // Optional: Attack reach (default: 80)
  angle: number,         // Optional: Cone angle in radians (default: π/3)
  direction: {x, y},     // Optional: Direction vector (default: {x:1, y:0})
  duration: number       // Optional: Attack duration (default: 200)
}
```

**AOEEffect Configuration:**
```javascript
{
  ...baseConfig,
  damage: number         // Optional: Damage amount (default: 20)
}
```

**HealEffect Configuration:**
```javascript
{
  ...baseConfig,
  amount: number         // Optional: Healing amount (default: 30)
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Base Ability Class Properties

**Property 1: Constructor initialization**
*For any* valid configuration object with required properties (x, y, owner), creating an Ability instance should result in an object with all provided properties correctly assigned and createdAt set to a valid timestamp and isAlive set to true.
**Validates: Requirements 1.2**

**Property 2: Default values**
*For any* configuration object missing optional properties (lifetime, radius, color), creating an Ability instance should result in an object with those properties set to their documented default values.
**Validates: Requirements 1.3**

**Property 3: Destroy method**
*For any* ability instance, calling the destroy() method should result in isAlive being set to false.
**Validates: Requirements 1.5**

### Projectile Properties

**Property 4: Projectile constructor initialization**
*For any* valid projectile configuration object, creating a Projectile instance should result in an object with both base properties (x, y, owner, etc.) and projectile-specific properties (vx, vy, speed, damage, etc.) correctly initialized.
**Validates: Requirements 2.3**

**Property 5: Projectile movement**
*For any* projectile with non-zero velocity (vx, vy), calling update() should change the position (x, y) by the velocity values.
**Validates: Requirements 2.4**

**Property 6: Projectile range limit**
*For any* projectile, if distanceTraveled exceeds or equals the range property after calling update(), then isAlive should be false.
**Validates: Requirements 2.4**

**Property 7: Projectile boundary checking**
*For any* projectile, if its position (x, y) is outside the canvas boundaries after calling update(), then isAlive should be false.
**Validates: Requirements 2.4**

**Property 8: Projectile collision detection**
*For any* projectile and target entity, checkCollision(target) should return true if and only if the distance between them is less than the sum of their radii.
**Validates: Requirements 2.6**

**Property 9: Projectile pierce behavior**
*For any* projectile with pierce=true, calling onCollision() should return false, and for any projectile with pierce=false, calling onCollision() should return true.
**Validates: Requirements 2.7**

### MeleeAttack Properties

**Property 10: MeleeAttack constructor initialization**
*For any* valid melee attack configuration object, creating a MeleeAttack instance should result in an object with both base properties and melee-specific properties (damage, range, coneAngle, direction, angle, duration) correctly initialized, with angle calculated from the direction vector.
**Validates: Requirements 3.3**

**Property 11: MeleeAttack collision detection**
*For any* melee attack and target entity, checkCollision(target) should return true if and only if the target is within the attack's range (distance less than attack radius + target radius).
**Validates: Requirements 3.6**

### AOEEffect Properties

**Property 12: AOEEffect constructor initialization**
*For any* valid AOE configuration object, creating an AOEEffect instance should result in an object with both base properties and AOE-specific properties (damage, hasDealtDamage) correctly initialized, with hasDealtDamage set to false.
**Validates: Requirements 4.3**

**Property 13: AOEEffect collision with damage flag**
*For any* AOE effect with hasDealtDamage=false and a target within radius, checkCollision(target) should return true, and for any AOE effect with hasDealtDamage=true, checkCollision(target) should return false regardless of target position.
**Validates: Requirements 4.6**

**Property 14: AOEEffect damage marking**
*For any* AOE effect instance, calling markDamageDealt() should set hasDealtDamage to true.
**Validates: Requirements 4.7**

### HealEffect Properties

**Property 15: HealEffect constructor initialization**
*For any* valid heal effect configuration object, creating a HealEffect instance should result in an object with both base properties and heal-specific properties (amount) correctly initialized.
**Validates: Requirements 5.3**

**Property 16: HealEffect upward movement**
*For any* heal effect, calling update() should decrease the y position (move upward).
**Validates: Requirements 5.4**

### Shared Properties (All Abilities)

**Property 17: Lifetime expiration**
*For any* ability instance, if the current time exceeds (createdAt + lifetime) when update() is called, then isAlive should be set to false.
**Validates: Requirements 3.4, 4.4, 5.4**

## Error Handling

### Invalid Configuration Handling

**Base Ability Class:**
- If required properties (x, y, owner) are missing, the constructor should still create an object but may have undefined values
- JavaScript's dynamic nature means no compile-time validation, so runtime checks may be needed
- Consider adding validation in constructor to throw errors for missing required properties

**Subclasses:**
- Each subclass should validate its specific required properties
- Invalid velocity vectors (both vx and vy are 0) for Projectile should be handled gracefully
- Invalid direction vectors for MeleeAttack should default to {x: 1, y: 0}

### Collision Detection Edge Cases

**Null/Undefined Targets:**
- All checkCollision methods should return false if target is null or undefined
- This prevents runtime errors when checking collisions

**Dead Abilities:**
- All checkCollision methods should return false if the ability's isAlive is false
- This prevents dead abilities from registering collisions

**Missing Radius:**
- If target doesn't have a radius property, use a default value (20) as seen in current implementations
- This ensures collision detection works with various entity types

### Boundary Conditions

**Canvas Boundaries:**
- Projectiles should check against GAME_CONFIG.CANVAS_WIDTH and GAME_CONFIG.CANVAS_HEIGHT
- Out-of-bounds projectiles should be marked as not alive to prevent memory leaks

**Lifetime Expiration:**
- All abilities should check lifetime on every update call
- Expired abilities should be marked as not alive immediately

**Distance Calculations:**
- Division by zero should not occur in distance calculations (using Pythagorean theorem)
- Very small distances should be handled correctly (no floating-point precision issues)

## Testing Strategy

### Dual Testing Approach

This refactoring requires both unit tests and property-based tests to ensure correctness:

**Unit Tests** focus on:
- Specific examples of ability creation with known configurations
- Edge cases like null targets, zero velocities, boundary positions
- Integration between base class and subclasses
- Specific scenarios like pierce behavior, damage marking

**Property-Based Tests** focus on:
- Universal properties that hold for all valid inputs
- Constructor initialization across random configurations
- Collision detection accuracy across random positions and sizes
- Movement and state transitions across random initial conditions

### Property-Based Testing Configuration

**Framework:** Use `fast-check` library for JavaScript property-based testing

**Test Configuration:**
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `// Feature: base-ability-class, Property N: [property title]`

**Generator Strategies:**

For Ability configurations:
```javascript
fc.record({
  x: fc.integer(0, 1000),
  y: fc.integer(0, 1000),
  owner: fc.constant({ id: 'test-owner' }),
  lifetime: fc.option(fc.integer(100, 10000)),
  radius: fc.option(fc.integer(5, 50)),
  color: fc.option(fc.hexaString(6, 6).map(s => '#' + s))
})
```

For Projectile configurations:
```javascript
fc.record({
  ...baseConfig,
  vx: fc.integer(-10, 10),
  vy: fc.integer(-10, 10),
  damage: fc.option(fc.integer(1, 100)),
  pierce: fc.boolean(),
  range: fc.option(fc.integer(100, 1000))
})
```

For collision testing:
```javascript
fc.tuple(
  fc.record({ x: fc.integer(0, 1000), y: fc.integer(0, 1000), radius: fc.integer(5, 50) }),
  fc.record({ x: fc.integer(0, 1000), y: fc.integer(0, 1000), radius: fc.integer(5, 50) })
)
```

### Unit Test Coverage

**Base Ability Class:**
- Test constructor with minimal config (only required properties)
- Test constructor with full config (all properties provided)
- Test default values when optional properties omitted
- Test destroy() method sets isAlive to false

**Projectile Class:**
- Test movement in all directions (positive/negative vx/vy)
- Test range limit triggers isAlive = false
- Test boundary checking for all four edges
- Test collision detection with overlapping and non-overlapping targets
- Test pierce behavior (continues vs. destroys)
- Test lifetime expiration
- Test speed calculation from vx/vy

**MeleeAttack Class:**
- Test constructor calculates angle from direction
- Test lifetime expiration
- Test collision detection within range
- Test collision detection outside range

**AOEEffect Class:**
- Test hasDealtDamage flag prevents collision
- Test markDamageDealt() sets flag
- Test collision detection within radius
- Test lifetime expiration

**HealEffect Class:**
- Test upward movement (y decreases)
- Test lifetime expiration
- Test amount property initialization

### Integration Testing

**Cross-Class Behavior:**
- Test that all subclasses properly inherit from Ability
- Test that all subclasses can be stored in the same array
- Test that all subclasses respond to destroy() method
- Test that instanceof checks work correctly for inheritance hierarchy

**Backward Compatibility:**
- Create abilities with exact configurations from existing code
- Verify behavior matches pre-refactoring behavior
- Test with actual game scenarios (player shooting, melee attacking, etc.)

### Test Execution

**Unit Tests:**
- Run with Jest or similar testing framework
- Aim for 100% code coverage of new base class
- Aim for high coverage of refactored subclasses

**Property Tests:**
- Run with fast-check library
- Configure for minimum 100 iterations per property
- Use seed values for reproducible failures
- Log counterexamples when properties fail

**Regression Tests:**
- Keep existing tests for ability classes
- Ensure all existing tests still pass after refactoring
- Add new tests for base class functionality
