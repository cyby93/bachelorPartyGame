# Requirements Document: Ability System

## Introduction

This document specifies the requirements for implementing a comprehensive ability system for a multiplayer boss fight game. The system supports 8 character classes, each with 4 unique skills, for a total of 32 abilities. The system is built on 6 core mechanic archetypes (PROJECTILE, MELEE, CAST, SHIELD, AOE, DASH/TELEPORT) that handle different input interactions and effect types.

## Glossary

- **Ability_System**: The complete system managing all skill mechanics, input handling, and effect execution
- **SkillManager**: The central component responsible for handling skill execution and coordination
- **Projectile**: A moving entity that travels in a direction and collides with targets
- **Melee_Attack**: An instant hit detection in a directional cone
- **Cast_Ability**: A skill requiring a charge-up period before execution
- **Shield**: A directional blocking mechanism that reduces or negates damage
- **AOE**: Area of Effect - an ability affecting all entities within a radius
- **Dash**: A rapid movement ability that instantly or quickly moves the player
- **Player**: The character entity controlled by the user
- **Enemy**: A hostile entity that can be damaged or affected by abilities
- **Ally**: A friendly entity that can be healed or buffed by abilities
- **Input_Data**: The collection of user input information including action type, direction vector, and intensity
- **Payload**: The effect executed upon completion of a cast ability
- **Collision_Detection**: The system for detecting when projectiles or effects hit targets
- **Buff**: A temporary positive effect applied to a character
- **Debuff**: A temporary negative effect applied to a character

## Requirements

### Requirement 1: Projectile Mechanic

**User Story:** As a player, I want to aim and fire projectile abilities, so that I can damage enemies from a distance.

#### Acceptance Criteria

1. WHEN a player drags and releases for a projectile ability, THE Ability_System SHALL spawn a Projectile entity at the Player position
2. WHEN a Projectile is spawned, THE Ability_System SHALL set the Projectile velocity based on the aim vector direction
3. WHILE a Projectile is active, THE Projectile SHALL move at its configured speed in the specified direction
4. WHEN a Projectile collides with a wall, THE Ability_System SHALL destroy the Projectile
5. WHEN a Projectile collides with an Enemy, THE Ability_System SHALL apply damage to the Enemy and destroy the Projectile
6. WHERE a Projectile has pierce enabled, WHEN the Projectile collides with an Enemy, THE Ability_System SHALL apply damage but not destroy the Projectile
7. WHEN a Projectile travels beyond its maximum range, THE Ability_System SHALL destroy the Projectile

### Requirement 2: Melee Mechanic

**User Story:** As a player, I want to perform melee attacks in a direction, so that I can damage nearby enemies.

#### Acceptance Criteria

1. WHEN a player taps or drags for a melee ability, THE Ability_System SHALL perform instant hit detection without spawning an entity
2. WHEN melee hit detection executes, THE Ability_System SHALL check all Enemies within the configured range
3. WHEN checking an Enemy for melee hit, IF the distance is less than range AND the angle difference is less than half the cone angle, THEN THE Ability_System SHALL register a hit
4. WHEN a melee hit is registered, THE Ability_System SHALL apply damage to the Enemy
5. WHEN a melee ability executes, THE Ability_System SHALL render a visual slash arc effect instantly

### Requirement 3: Cast Mechanic

**User Story:** As a player, I want to charge up powerful abilities, so that I can execute high-impact skills with proper timing.

#### Acceptance Criteria

1. WHEN a player starts holding a cast ability button, THE Ability_System SHALL freeze or slow the Player movement
2. WHEN a cast begins, THE Ability_System SHALL display a progress bar above the Player showing 0% to 100% completion
3. WHILE a cast is in progress, THE Ability_System SHALL increment the cast timer
4. IF a Player moves during a cast, THEN THE Ability_System SHALL interrupt and cancel the cast
5. IF a Player releases the button before cast completion, THEN THE Ability_System SHALL cancel the cast
6. WHEN the cast timer reaches or exceeds the configured cast time, THE Ability_System SHALL execute the Payload ability
7. WHEN a cast completes, THE Ability_System SHALL restore normal Player movement

### Requirement 4: Shield Mechanic

**User Story:** As a player, I want to block incoming attacks with a directional shield, so that I can defend against enemy projectiles.

#### Acceptance Criteria

1. WHEN a player holds or drags for a shield ability, THE Ability_System SHALL set the Player isShielding state to true
2. WHEN a shield is active, THE Ability_System SHALL set the Player shield angle based on the aim vector angle
3. WHILE a shield is active, THE Ability_System SHALL reduce Player movement speed by 50%
4. WHEN Collision_Detection checks a Projectile hitting a shielding Player, IF the absolute difference between impact angle and shield angle is less than half the shield arc, THEN THE Ability_System SHALL set damage to zero
5. WHEN a shield duration expires, THE Ability_System SHALL deactivate the shield and restore normal movement speed
6. WHEN a player releases the shield button, THE Ability_System SHALL deactivate the shield

### Requirement 5: Area of Effect Mechanic

**User Story:** As a player, I want to use area effect abilities, so that I can affect multiple targets simultaneously.

#### Acceptance Criteria

1. WHEN a player activates an AOE_SELF ability, THE Ability_System SHALL apply effects to all entities within the configured radius of the Player
2. WHEN checking entities for AOE_SELF effects, THE Ability_System SHALL calculate the distance between Player and each entity
3. WHEN an entity is within the AOE radius, THE Ability_System SHALL apply the configured effect (damage, heal, or buff)
4. WHEN a player drags for an AOE_LOBBED ability, THE Ability_System SHALL determine the target location based on drag intensity
5. WHEN an AOE_LOBBED ability is released, THE Ability_System SHALL spawn a Projectile that travels to the target location
6. WHEN an AOE_LOBBED Projectile reaches its target location, THE Ability_System SHALL create an explosion effect
7. WHEN an AOE explosion occurs, THE Ability_System SHALL apply effects to all entities within the explosion radius

### Requirement 6: Dash and Teleport Mechanic

**User Story:** As a player, I want to quickly move or teleport, so that I can reposition during combat.

#### Acceptance Criteria

1. WHEN a player drags for a dash ability, THE Ability_System SHALL determine the dash direction from the aim vector
2. WHEN a dash ability executes, THE Ability_System SHALL move the Player instantly or apply high velocity for a short duration
3. WHEN calculating dash distance, THE Ability_System SHALL use the configured distance parameter
4. WHEN a teleport ability executes, THE Ability_System SHALL instantly move the Player to the target position

### Requirement 7: Unified Skill Handler

**User Story:** As a developer, I want a unified interface for handling all skills, so that the system is maintainable and extensible.

#### Acceptance Criteria

1. THE SkillManager SHALL provide a handleSkill method accepting scene, player, skillIndex, and Input_Data parameters
2. WHEN handleSkill is called, THE SkillManager SHALL determine the skill type based on the skillIndex
3. WHEN processing Input_Data, THE SkillManager SHALL extract the action type (START, HOLD, or RELEASE)
4. WHEN processing Input_Data, THE SkillManager SHALL extract the normalized direction vector
5. WHEN processing Input_Data, THE SkillManager SHALL extract the intensity value between 0.0 and 1.0
6. WHEN a skill is executed, THE SkillManager SHALL route to the appropriate mechanic handler based on skill type

### Requirement 8: Warrior Class Skills

**User Story:** As a player, I want to play as a Warrior with tank abilities, so that I can protect my team and control enemies.

#### Acceptance Criteria

1. WHEN a Warrior uses Cleave (S1), THE Ability_System SHALL execute a MELEE attack in a cone dealing moderate damage
2. WHEN a Warrior uses Thunder Clap (S2), THE Ability_System SHALL execute an AOE_SELF attack that damages and slows Enemies within radius
3. WHEN a Warrior uses Charge (S3), THE Ability_System SHALL execute a DASH towards the aim direction
4. WHEN a Warrior Charge hits an Enemy, THE Ability_System SHALL apply a stun effect to the first Enemy hit
5. WHEN a Warrior uses Shield Wall (S4), THE Ability_System SHALL apply a buff reducing all incoming damage by 90% for 5 seconds
6. WHEN Shield Wall is active, THE Ability_System SHALL provide 360-degree protection

### Requirement 9: Paladin Class Skills

**User Story:** As a player, I want to play as a Paladin with hybrid abilities, so that I can both attack and defend.

#### Acceptance Criteria

1. WHEN a Paladin uses Hammer Swing (S1), THE Ability_System SHALL execute a standard MELEE attack
2. WHEN a Paladin uses Judgement (S2), THE Ability_System SHALL spawn a PROJECTILE hammer with medium range
3. WHEN a Paladin uses Divine Shield (S3), THE Ability_System SHALL activate a directional SHIELD with standard blocking logic
4. WHEN a Paladin uses Consecration (S4), THE Ability_System SHALL create an AOE_SELF zone lasting 5 seconds
5. WHILE Consecration is active, THE Ability_System SHALL deal damage to Enemies inside the zone
6. WHILE Consecration is active, THE Ability_System SHALL heal Allies inside the zone

### Requirement 10: Shaman Class Skills

**User Story:** As a player, I want to play as a Shaman with hybrid DPS abilities, so that I can damage enemies and support allies.

#### Acceptance Criteria

1. WHEN a Shaman uses Lightning Bolt (S1), THE Ability_System SHALL spawn a fast-moving PROJECTILE
2. WHEN a Shaman uses Chain Heal (S2), THE Ability_System SHALL target the nearest Ally
3. WHEN Chain Heal executes, THE Ability_System SHALL render a water beam visual effect to the target Ally
4. WHEN Chain Heal hits an Ally, THE Ability_System SHALL heal the target
5. WHEN a Shaman uses Ghost Wolf (S3), THE Ability_System SHALL apply a BUFF increasing movement speed by 50% for 3 seconds
6. WHEN a Shaman uses Bloodlust (S4), THE Ability_System SHALL execute an AOE_SELF global buff
7. WHEN Bloodlust is active, THE Ability_System SHALL increase fire rate and movement speed of all Allies by 30% for 8 seconds

### Requirement 11: Hunter Class Skills

**User Story:** As a player, I want to play as a Hunter with ranged abilities, so that I can attack from distance and control positioning.

#### Acceptance Criteria

1. WHEN a Hunter uses Shoot Bow (S1), THE Ability_System SHALL spawn a long-range thin PROJECTILE
2. WHEN a Hunter uses Multi-Shot (S2), THE Ability_System SHALL spawn 3 PROJECTILE entities in a fan-shaped spread angle
3. WHEN a Hunter uses Disengage (S3), THE Ability_System SHALL execute a DASH in the opposite direction of the aim vector
4. WHEN a Hunter uses Explosive Trap (S4), THE Ability_System SHALL throw an AOE_LOBBED trap to the target location
5. WHEN an Enemy touches the Explosive Trap, THE Ability_System SHALL trigger an explosion dealing AOE damage

### Requirement 12: Priest Class Skills

**User Story:** As a player, I want to play as a Priest with healing abilities, so that I can support and revive my team.

#### Acceptance Criteria

1. WHEN a Priest uses Smite (S1), THE Ability_System SHALL spawn a weak damage PROJECTILE
2. WHEN a Priest uses Flash Heal (S2), THE Ability_System SHALL throw an AOE_LOBBED healing spark to the target location
3. WHEN Flash Heal reaches its target, THE Ability_System SHALL heal all Allies within a small radius
4. WHEN a Priest uses Power Word: Shield (S3), THE Ability_System SHALL apply a temporary HP shield buff to self or nearest Ally
5. WHEN a Priest uses Mass Resurrection (S4), THE Ability_System SHALL begin a CAST with 2.0 seconds cast time
6. WHEN Mass Resurrection cast completes, THE Ability_System SHALL execute an AOE_SELF effect with large radius
7. WHEN Mass Resurrection effect applies, THE Ability_System SHALL revive all dead players within radius with 50% HP

### Requirement 13: Mage Class Skills

**User Story:** As a player, I want to play as a Mage with powerful DPS abilities, so that I can deal high damage and control enemies.

#### Acceptance Criteria

1. WHEN a Mage uses Fireball (S1), THE Ability_System SHALL spawn a standard damage PROJECTILE
2. WHEN a Mage uses Frost Nova (S2), THE Ability_System SHALL execute an AOE_SELF effect
3. WHEN Frost Nova hits Enemies, THE Ability_System SHALL root them by setting movement speed to 0 for 2 seconds
4. WHEN a Mage uses Blink (S3), THE Ability_System SHALL instantly TELEPORT the Player 150 pixels in the aim direction
5. WHEN a Mage uses Pyroblast (S4), THE Ability_System SHALL begin a CAST with 1.5 seconds cast time
6. WHEN Pyroblast cast completes, THE Ability_System SHALL spawn a massive slow PROJECTILE with huge damage
7. WHEN Pyroblast impacts, THE Ability_System SHALL create an AOE explosion at the impact location

### Requirement 14: Druid Class Skills

**User Story:** As a player, I want to play as a Druid with shapeshifting abilities, so that I can adapt to different combat situations.

#### Acceptance Criteria

1. WHEN a Druid uses Wrath (S1), THE Ability_System SHALL spawn a standard magic PROJECTILE
2. WHEN a Druid uses Bear Form (S2), THE Ability_System SHALL transform the Player sprite to a bear
3. WHILE in Bear Form, THE Ability_System SHALL increase Player armor and HP
4. WHILE in Bear Form, THE Ability_System SHALL change S1 to a MELEE bite attack
5. WHEN a Druid uses Cat Dash (S3), THE Ability_System SHALL execute a quick DASH forward
6. WHEN a Druid uses Tranquility (S4), THE Ability_System SHALL begin a CAST with 4.0 seconds channeling time
7. WHILE Tranquility is channeling, THE Ability_System SHALL heal all Allies in range every 0.5 seconds
8. IF the Player releases the button during Tranquility, THEN THE Ability_System SHALL stop the channeling

### Requirement 15: Rogue Class Skills

**User Story:** As a player, I want to play as a Rogue with melee and stealth abilities, so that I can deal burst damage and evade enemies.

#### Acceptance Criteria

1. WHEN a Rogue uses Sinister Strike (S1), THE Ability_System SHALL execute a very short range MELEE attack with high damage
2. WHEN a Rogue uses Fan of Knives (S2), THE Ability_System SHALL spawn 8 knife PROJECTILE entities
3. WHEN Fan of Knives executes, THE Ability_System SHALL distribute the 8 knives in a circular pattern traveling outward from the Player
4. WHEN a Rogue uses Sprint (S3), THE Ability_System SHALL apply a BUFF increasing movement speed by 100% for 3 seconds
5. WHEN a Rogue uses Ambush (S4), THE Ability_System SHALL apply a stealth BUFF making the Player semi-transparent
6. WHILE Ambush is active, THE Ability_System SHALL prevent Enemies from targeting the Player
7. WHEN the Player attacks while Ambush is active, THE Ability_System SHALL deal 3x damage and remove the stealth buff

### Requirement 16: Collision Detection

**User Story:** As a developer, I want accurate collision detection, so that abilities interact correctly with targets.

#### Acceptance Criteria

1. WHEN a PROJECTILE moves, THE Collision_Detection SHALL check for intersections with walls and entities
2. WHEN checking PROJECTILE collision, THE Collision_Detection SHALL use the Projectile radius for hit detection
3. WHEN a MELEE attack executes, THE Collision_Detection SHALL calculate distance and angle for all potential targets
4. WHEN an AOE effect triggers, THE Collision_Detection SHALL calculate distance from the effect center to all entities
5. WHEN a shielded Player is hit, THE Collision_Detection SHALL calculate the impact angle relative to the shield angle

### Requirement 17: Buff and Debuff System

**User Story:** As a player, I want buffs and debuffs to affect character stats, so that abilities can provide temporary advantages or disadvantages.

#### Acceptance Criteria

1. WHEN a BUFF is applied, THE Ability_System SHALL modify the target entity's stats according to the buff parameters
2. WHEN a BUFF duration expires, THE Ability_System SHALL restore the target entity's original stats
3. WHEN a DEBUFF is applied, THE Ability_System SHALL apply negative effects to the target entity
4. WHEN a DEBUFF duration expires, THE Ability_System SHALL remove the negative effects
5. THE Ability_System SHALL support stacking multiple buffs and debuffs on a single entity

### Requirement 18: Visual Feedback

**User Story:** As a player, I want clear visual feedback for abilities, so that I can understand what is happening in combat.

#### Acceptance Criteria

1. WHEN a PROJECTILE is spawned, THE Ability_System SHALL render the appropriate projectile sprite
2. WHEN a MELEE attack executes, THE Ability_System SHALL render a slash arc visual effect
3. WHEN a CAST is in progress, THE Ability_System SHALL display a progress bar above the Player
4. WHEN a SHIELD is active, THE Ability_System SHALL render the shield visual in the correct direction
5. WHEN an AOE effect triggers, THE Ability_System SHALL render the area effect visual at the correct location
6. WHEN a DASH executes, THE Ability_System SHALL render appropriate movement visual effects

### Requirement 19: Input Handling

**User Story:** As a player, I want responsive input handling, so that my abilities execute when I intend them to.

#### Acceptance Criteria

1. WHEN a player taps the screen, THE Ability_System SHALL register a START action
2. WHEN a player drags on the screen, THE Ability_System SHALL register a HOLD action with direction vector
3. WHEN a player releases after dragging, THE Ability_System SHALL register a RELEASE action
4. WHEN calculating aim vector, THE Ability_System SHALL normalize the direction vector
5. WHEN calculating drag intensity, THE Ability_System SHALL clamp the value between 0.0 and 1.0

### Requirement 20: Ability Parameters

**User Story:** As a developer, I want configurable ability parameters, so that abilities can be balanced and tuned.

#### Acceptance Criteria

1. THE Ability_System SHALL store speed parameters for PROJECTILE abilities
2. THE Ability_System SHALL store radius parameters for PROJECTILE and AOE abilities
3. THE Ability_System SHALL store damage parameters for all damaging abilities
4. THE Ability_System SHALL store range parameters for PROJECTILE and MELEE abilities
5. THE Ability_System SHALL store pierce boolean parameters for PROJECTILE abilities
6. THE Ability_System SHALL store angle parameters for MELEE cone attacks
7. THE Ability_System SHALL store castTime parameters for CAST abilities
8. THE Ability_System SHALL store arc parameters for SHIELD abilities
9. THE Ability_System SHALL store duration parameters for SHIELD and BUFF abilities
10. THE Ability_System SHALL store distance parameters for DASH abilities
