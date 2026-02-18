# Integration Test Guide

## Testing the New Ability System

This guide helps you verify that the new ability system is properly integrated.

## Pre-Flight Checklist

### 1. File Structure
- [ ] `public/js/config/SkillDatabase.js` exists
- [ ] All handler files in `public/js/handlers/` exist
- [ ] All system files in `public/js/systems/` exist
- [ ] `public/js/utils/ErrorHandler.js` exists

### 2. HTML Files Updated
- [ ] `host.html` loads SkillDatabase.js
- [ ] `controller.html` loads SkillDatabase.js
- [ ] Scripts load in correct order (SkillDatabase before modules)

### 3. Server Configuration
- [ ] `server.js` handles new `inputData` format
- [ ] Server broadcasts `skill_used` with `inputData`
- [ ] Backward compatibility maintained for legacy format

## Testing Steps

### Phase 1: Basic Connection (5 minutes)

1. **Start Server**
   ```bash
   npm start
   ```
   - [ ] Server starts without errors
   - [ ] Console shows network addresses

2. **Open Host Display**
   - Navigate to `http://localhost:3100/host.html`
   - [ ] Canvas loads
   - [ ] "START GAME" button appears
   - [ ] No console errors

3. **Connect Controller**
   - Navigate to `http://localhost:3100/controller.html` on phone/browser
   - [ ] Connection screen appears
   - [ ] Can enter name
   - [ ] Can select class
   - [ ] "JOIN GAME" button works

4. **Join Game**
   - Enter name and select a class
   - Click "JOIN GAME"
   - [ ] Controller shows skill grid
   - [ ] Movement joystick appears
   - [ ] Skills show correct names and icons
   - [ ] Host display shows player joined

### Phase 2: Movement & Basic Skills (10 minutes)

5. **Test Movement**
   - Use movement joystick on controller
   - [ ] Player moves on host display
   - [ ] Movement is smooth
   - [ ] Player stays within bounds

6. **Start Game**
   - Click "START GAME" on host display
   - [ ] Boss appears
   - [ ] Game transitions to boss fight
   - [ ] Players can still move

7. **Test Basic Projectile (S1 for most classes)**
   - Tap skill button 1
   - [ ] Projectile spawns
   - [ ] Projectile moves toward boss
   - [ ] Projectile hits boss
   - [ ] Boss HP decreases
   - [ ] Skill goes on cooldown
   - [ ] Cooldown visual appears

### Phase 3: Advanced Skills (15 minutes)

8. **Test Melee Skills (Warrior, Paladin, Rogue S1)**
   - Select Warrior/Paladin/Rogue
   - Tap S1 near boss
   - [ ] Slash arc appears
   - [ ] Boss takes damage if in range
   - [ ] No projectile spawns

9. **Test AOE Skills (Warrior S2, Mage S2)**
   - Use Thunder Clap (Warrior S2) or Frost Nova (Mage S2)
   - [ ] AOE circle appears
   - [ ] Boss takes damage if in radius
   - [ ] Visual effect shows

10. **Test Dash Skills (Warrior S3, Hunter S3)**
    - Use Charge (Warrior) or Disengage (Hunter)
    - [ ] Player moves quickly
    - [ ] Dash trail appears
    - [ ] Player stops at destination

11. **Test Cast Skills (Priest S4, Mage S4)**
    - Hold Priest Mass Resurrection or Mage Pyroblast
    - [ ] Cast bar appears above player
    - [ ] Cast bar fills over time
    - [ ] Moving cancels cast
    - [ ] Releasing early cancels cast
    - [ ] Completing cast executes ability

### Phase 4: Special Mechanics (15 minutes)

12. **Test Multi-Projectile (Hunter S2)**
    - Use Hunter Multi-Shot
    - [ ] 3 projectiles spawn
    - [ ] Projectiles spread in fan shape
    - [ ] All projectiles can hit

13. **Test Circular Projectiles (Rogue S2)**
    - Use Rogue Fan of Knives
    - [ ] 8 knives spawn
    - [ ] Knives travel in circle pattern
    - [ ] Knives can hit boss

14. **Test Buffs (Shaman S3, Rogue S3)**
    - Use Ghost Wolf (Shaman) or Sprint (Rogue)
    - [ ] Player moves faster
    - [ ] Buff indicator appears above player
    - [ ] Buff expires after duration

15. **Test Healing (Priest S2, Paladin S2)**
    - Take damage from boss
    - Use healing ability
    - [ ] HP increases
    - [ ] Heal visual effect appears

### Phase 5: Edge Cases (10 minutes)

16. **Test Cooldowns**
    - Spam skill button
    - [ ] Skill only fires when off cooldown
    - [ ] Cooldown overlay shows correctly
    - [ ] Can't use skill while on cooldown

17. **Test Death**
    - Let boss kill player
    - [ ] Player becomes tombstone
    - [ ] Can't use skills while dead
    - [ ] Other players can revive

18. **Test Multiple Players**
    - Connect 2-3 controllers
    - [ ] All players appear on host
    - [ ] All players can use skills
    - [ ] Skills don't interfere with each other
    - [ ] Projectiles from different players work

## Console Checks

### Expected Console Messages (Good)
```
✅ New connection: [socket-id]
✅ [Player Name] joined as [Class]
✅ Game started!
✅ Connected as HOST
```

### Warning Messages (Acceptable)
```
⚠️ SkillDatabase not loaded, using empty database
   (Only if script didn't load - check HTML)
```

### Error Messages (Bad - Need Fixing)
```
❌ Cannot read property 'handleSkill' of undefined
❌ SkillManager is not a constructor
❌ TypeError: Cannot read property 'x' of undefined
❌ ReferenceError: SkillDatabase is not defined
```

## Common Issues & Fixes

### Issue: Skills Don't Fire
**Symptoms**: Clicking skill button does nothing
**Fixes**:
1. Check browser console for errors
2. Verify SkillDatabase.js loaded (check Network tab)
3. Ensure player.className matches database keys
4. Check that inputData has required fields

### Issue: Projectiles Don't Appear
**Symptoms**: No visual when using projectile skills
**Fixes**:
1. Check that scene.projectiles array exists
2. Verify projectile is added to array
3. Check render loop includes projectiles
4. Look for collision detection errors

### Issue: Cast Bar Doesn't Show
**Symptoms**: Cast abilities work but no progress bar
**Fixes**:
1. Verify castHandler is initialized
2. Check that renderCastBar is called in render loop
3. Ensure player.castState is being updated

### Issue: Cooldowns Don't Work
**Symptoms**: Can spam skills infinitely
**Fixes**:
1. Check that startCooldown is called after skill use
2. Verify cooldown Map is initialized
3. Ensure isOnCooldown check happens before execution

## Performance Checks

### Frame Rate
- [ ] Host display runs at ~60 FPS
- [ ] No stuttering during skill usage
- [ ] Smooth projectile movement

### Network
- [ ] Input lag < 100ms
- [ ] Skills execute immediately on controller
- [ ] Visual feedback appears on host quickly

### Memory
- [ ] No memory leaks after extended play
- [ ] Projectiles are cleaned up properly
- [ ] Effects are removed when expired

## Success Criteria

✅ **Minimum Viable Product**
- All 8 classes can join
- Basic skills (S1) work for all classes
- Projectiles hit boss and deal damage
- Cooldowns function correctly
- No critical errors in console

✅ **Full Integration**
- All 32 skills work as specified
- Cast abilities show progress bars
- AOE effects apply to targets in radius
- Dash abilities move players
- Buffs/debuffs apply and expire
- Visual feedback for all ability types

✅ **Production Ready**
- Multiple players can play simultaneously
- No performance issues with 4+ players
- All edge cases handled gracefully
- Error messages are helpful
- Game is stable for 10+ minute sessions

## Rollback Plan

If critical issues occur:

1. **Disable New System**
   - Comment out new ability system in BossFightScene
   - Revert to legacy SkillManager.handleSkillUsed only

2. **Hybrid Mode**
   - Keep new system for new classes
   - Use legacy system for old classes
   - Gradually migrate

3. **Debug Mode**
   - Add console.log statements in handlers
   - Track skill execution flow
   - Identify where system breaks

## Next Steps After Testing

1. **Balance Pass**
   - Adjust damage values
   - Tune cooldowns
   - Modify ranges

2. **Visual Polish**
   - Add particle effects
   - Improve animations
   - Add sound effects

3. **Advanced Features**
   - Skill upgrades
   - Combo system
   - Achievement tracking

## Support

For issues, check:
- `ABILITY_SYSTEM_INTEGRATION_GUIDE.md` - Integration details
- `SKILL_REFERENCE.md` - Skill parameters
- `.kiro/specs/ability-system-implementation/` - Full specification
