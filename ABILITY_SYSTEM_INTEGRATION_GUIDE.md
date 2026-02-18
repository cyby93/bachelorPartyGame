# Ability System Integration Guide

## Overview

The ability system has been successfully implemented with all 32 abilities across 8 classes. This guide explains how to integrate and use the new system.

## Architecture

### Core Components

1. **SkillDatabase** (`public/js/config/SkillDatabase.js`)
   - Contains all 32 skill configurations
   - Organized by class name with 4 skills each

2. **Handlers** (`public/js/handlers/`)
   - `MeleeHandler.js` - Cone-based melee attacks
   - `CastHandler.js` - Charge-up abilities with payload
   - `ShieldHandler.js` - Directional blocking
   - `AOEHandler.js` - Area of effect abilities
   - `DashHandler.js` - Movement abilities

3. **Systems** (`public/js/systems/`)
   - `CollisionSystem.js` - Unified collision detection
   - `EffectSystem.js` - Buff/debuff management
   - `VisualEffectsRenderer.js` - Visual feedback

4. **SkillManager** (`public/js/managers/SkillManager.js`)
   - Central coordinator for all abilities
   - Routes skills to appropriate handlers
   - Manages cooldowns

## Usage

### Client-Side (InputManager)

The InputManager now sends enhanced input data:

```javascript
{
  skill: skillIndex,  // 0-3
  inputData: {
    action: 'START' | 'HOLD' | 'RELEASE',
    vector: { x: number, y: number },  // Normalized
    intensity: number  // 0.0 to 1.0
  }
}
```

### Server-Side Integration

To use the new ability system on the server:

```javascript
const SkillManager = require('./public/js/managers/SkillManager.js');
const skillManager = new SkillManager();

// Handle skill input
socket.on('player_input', (data) => {
  if (data.skill !== undefined && data.inputData) {
    const player = getPlayer(socket.id);
    const scene = getCurrentScene();
    
    skillManager.handleSkill(
      scene,
      player,
      data.skill,
      data.inputData
    );
  }
});
```

### Player Entity Requirements

Players need these properties for the ability system:

```javascript
{
  id: string,
  className: string,  // 'Warrior', 'Mage', etc.
  x: number,
  y: number,
  speed: number,
  hp: number,
  maxHp: number,
  
  // Ability state (initialized by handlers)
  castState: {},
  shieldState: {},
  isDashing: false,
  activeEffects: []
}
```

## Class Skills Reference

### Warrior (Tank)
- S1: Cleave - MELEE cone attack
- S2: Thunder Clap - AOE_SELF damage + slow
- S3: Charge - DASH with stun
- S4: Shield Wall - BUFF 90% damage reduction

### Paladin (Hybrid)
- S1: Hammer Swing - MELEE
- S2: Judgement - PROJECTILE
- S3: Divine Shield - SHIELD directional
- S4: Consecration - AOE_SELF damage enemies, heal allies

### Shaman (Hybrid DPS)
- S1: Lightning Bolt - PROJECTILE fast
- S2: Chain Heal - PROJECTILE heal
- S3: Ghost Wolf - BUFF +50% speed
- S4: Bloodlust - AOE_SELF global buff

### Hunter (Ranged)
- S1: Shoot Bow - PROJECTILE
- S2: Multi-Shot - PROJECTILE x3 spread
- S3: Disengage - DASH backwards
- S4: Explosive Trap - AOE_LOBBED

### Priest (Healer)
- S1: Smite - PROJECTILE weak
- S2: Flash Heal - AOE_LOBBED heal
- S3: Power Word: Shield - BUFF temp HP
- S4: Mass Resurrection - CAST → AOE_SELF revive

### Mage (DPS)
- S1: Fireball - PROJECTILE
- S2: Frost Nova - AOE_SELF root
- S3: Blink - TELEPORT
- S4: Pyroblast - CAST → PROJECTILE + AOE

### Druid (Shapeshifter)
- S1: Wrath - PROJECTILE
- S2: Bear Form - BUFF transform
- S3: Cat Dash - DASH
- S4: Tranquility - CAST channeled heal

### Rogue (Melee)
- S1: Sinister Strike - MELEE high damage
- S2: Fan of Knives - AOE_SELF → 8 PROJECTILES
- S3: Sprint - BUFF +100% speed
- S4: Ambush - BUFF stealth + 3x damage

## Game Loop Integration

The BossFightScene now includes:

1. **Update Loop**:
   - Cast state updates
   - Shield duration tracking
   - Dash movement
   - Effect (buff/debuff) updates
   - Projectile collision detection

2. **Render Loop**:
   - Cast progress bars
   - Shield visuals
   - Dash trails
   - Effect indicators
   - Projectile trails

## Testing Checklist

### Basic Functionality
- [ ] All 8 classes load correctly
- [ ] Skills trigger on button press
- [ ] Cooldowns work properly
- [ ] Projectiles spawn and move
- [ ] Melee attacks hit in cone
- [ ] AOE effects apply to targets in radius

### Cast Abilities
- [ ] Cast bar appears and fills
- [ ] Movement cancels cast
- [ ] Early release cancels cast
- [ ] Payload executes on completion
- [ ] Priest Mass Resurrection works
- [ ] Mage Pyroblast works

### Special Mechanics
- [ ] Shield blocks projectiles
- [ ] Dash moves player
- [ ] Blink teleports instantly
- [ ] Multi-Shot spawns 3 projectiles
- [ ] Fan of Knives spawns 8 projectiles
- [ ] Buffs/debuffs apply and expire

### Visual Feedback
- [ ] Cast bars render correctly
- [ ] Shield visual shows direction
- [ ] Dash trails appear
- [ ] Effect indicators show above players
- [ ] Projectile trails render

## Known Limitations

1. **Server Synchronization**: The current implementation is client-side focused. Server-side validation and synchronization need to be added.

2. **Collision with Players**: Currently only checks collision with boss. Player-to-player collision needs implementation for PvP.

3. **Advanced Mechanics**: Some complex interactions (e.g., Druid Bear Form modifying S1) may need additional implementation.

## Next Steps

1. Add server-side skill validation
2. Implement network synchronization for abilities
3. Add visual effects for each class (particles, sounds)
4. Balance skill parameters (damage, cooldowns, ranges)
5. Add skill upgrade system
6. Implement combo mechanics

## Troubleshooting

### Skills Not Firing
- Check that SkillDatabase is loaded
- Verify player.className matches database keys
- Ensure inputData has required fields

### Projectiles Not Appearing
- Check that scene.projectiles array exists
- Verify projectile is added to array
- Check render loop includes projectiles

### Cast Not Working
- Verify castHandler is initialized
- Check that player.castState is being updated
- Ensure cast bar rendering is in render loop

### Effects Not Applying
- Check that effectSystem is initialized
- Verify entity has activeEffects array
- Ensure updateEffects is called in game loop

## Support

For issues or questions, refer to:
- `AGENT_ABILITY_SYSTEM_SPECIFICATION.md` - Original specification
- `.kiro/specs/ability-system-implementation/` - Detailed requirements and design
