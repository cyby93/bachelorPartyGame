# Project Structure

## Root Level
- `server.js` - Game server with Socket.io logic and game state management
- `package.json` - Dependencies and scripts
- `jest.config.js` - Test configuration

## Public Directory (`/public`)
Static files served to clients. Contains all frontend code.

### HTML Files
- `index.html` - Landing page
- `host.html` - Main game display (TV/monitor)
- `controller.html` - Phone controller interface

### JavaScript (`/public/js`)

#### Core
- `Game.js` - Main game loop, scene manager, and statistics tracking
- `Constants.js` - Game configuration and class definitions

#### Managers (`/public/js/managers`)
Singleton-style managers for cross-cutting concerns:
- `SkillManager.js` - Central hub for skill execution, routes to handlers
- `InputManager.js` - Controller input processing
- `AudioManager.js` - Sound effects and music

#### Scenes (`/public/js/scenes`)
Scene-based architecture with base class:
- `Scene.js` - Base class with common rendering methods
- `LobbyScene.js` - Pre-game lobby with skill practice
- `TestScene.js` - Ability testing environment
- `BossFightScene.js` - Main boss encounter
- `TrashMobScene.js` - Trash mob encounters
- `ResultScene.js` - Victory screen
- `GameOverScene.js` - Defeat screen

#### Entities (`/public/js/entities`)
Game objects with update/render methods:
- `Player.js` - Player character with ability system state
- `Boss.js` - Boss enemy
- `Enemy.js` - Regular enemies
- `Projectile.js` - Ranged attack projectiles
- `MeleeAttack.js` - Melee attack effects
- `AOEEffect.js` - Area-of-effect damage zones
- `HealEffect.js` - Healing visual effects
- `Tombstone.js` - Dead player markers

#### Handlers (`/public/js/handlers`)
Skill type-specific execution logic:
- `CastHandler.js` - Cast-time abilities
- `MeleeHandler.js` - Melee attacks with cone detection
- `AOEHandler.js` - Area-of-effect abilities
- `ShieldHandler.js` - Directional shields
- `DashHandler.js` - Dash and teleport abilities

#### Systems (`/public/js/systems`)
Reusable game systems:
- `CollisionSystem.js` - Collision detection (projectiles, melee, AOE)
- `EffectSystem.js` - Buff/debuff application and tracking
- `VisualEffectsRenderer.js` - Visual feedback (cast bars, shields, dash trails)

#### Config (`/public/js/config`)
Data-driven configuration:
- `Config.js` - General game configuration
- `ClassConfig.js` - Class definitions and utilities
- `SkillDatabase.js` - All 32 skills (8 classes × 4 skills)
- `BossConfig.js` - Boss definitions

#### Utils (`/public/js/utils`)
- `ErrorHandler.js` - Error handling utilities

## Architecture Patterns

### Scene Management
Game uses scene-based architecture. Each scene inherits from `Scene.js` and implements:
- `enter(data)` - Scene initialization
- `exit()` - Scene cleanup
- `update(deltaTime)` - Game logic
- `render(ctx)` - Canvas rendering
- `handleSocketEvent(eventName, data)` - Network events

### Ability System
Modular skill system with clear separation:
1. `SkillManager` receives skill input and routes to appropriate handler
2. Handlers execute skill-specific logic
3. Systems provide reusable functionality (collision, effects)
4. Entities represent game objects created by skills

### Network Protocol
- Client → Server: Player input (movement, skill usage)
- Server → Clients: Game state broadcasts (50ms intervals) and skill events
- Skill format supports both new (`inputData`) and legacy (`aim`) formats

## Testing
- Test files co-located with source: `*.test.js`
- Integration tests: `*.integration.test.js`
- Coverage collected from `public/js/**/*.js`

## Documentation
Root-level markdown files document architecture and integration:
- `SYSTEM_ARCHITECTURE.md` - Ability system architecture
- `AGENT_ABILITY_SYSTEM_SPECIFICATION.md` - Ability system spec
- `ABILITY_SYSTEM_INTEGRATION_GUIDE.md` - Integration guide
- Various refactor summaries and guides
