ABILITY SYSTEM SPECIFICATION

1. OVERVIEW

This document defines the logic and parameters for all 32 abilities (8 Classes x 4 Skills). The SkillManager.js must implement handlers for these specific Archetypes.

2. CORE MECHANIC ARCHETYPES

The system distinguishes between Input Interaction (how the player triggers it) and Effect Type (what happens).

A. PROJECTILE (Linear)

Interaction: Drag & Release (Aim Vector).

Logic: Spawns a Projectile entity at player position.

Behavior: Moves in direction (vx, vy) with fixed speed.

Collision: Destroys on impact with wall or enemy. Deals damage or effect.

Parameters: speed, radius, damage, range (max distance), pierce (boolean).

B. MELEE (Directional Cone)

Interaction: Tap (Auto-aim) or Drag (Directional).

Logic: Instant hit detection. No entity spawned.

Calculation: Checks all enemies. IF distance < range AND angleDiff < coneAngle/2 THEN hit.

Visual: Renders a "Slash" arc effect instantly.

Parameters: range, angle (in radians), damage.

C. CAST (Charge-up Trigger)

Interaction: Hold Button (Joystick active).

Logic:

Start: Player freezes/slows. A bar appears above head (0% to 100%).

During: If player moves or cancels, cast is interrupted.

Completion: When holdTime >= castTime, the PAYLOAD ability is executed.

Payload: A CAST ability always triggers another type (e.g., Projectile, AoE) upon completion.

Parameters: castTime (ms), payloadType.

D. SHIELD (Directional Block)

Interaction: Hold/Drag (Directional).

Logic:

Sets player.isShielding = true.

Sets player.shieldAngle = aimVectorAngle.

Movement speed reduced by 50%.

Defense: In checkCollisions(), if projectile hits player, check: abs(impactAngle - shieldAngle) < arc / 2. If true, damage = 0.

Parameters: arc (width of shield in radians), duration (max hold time).

E. AOE (Area of Effect)

Two sub-types based on targeting:

AOE_SELF: Instant effect around the player (e.g., Thunderclap).

Logic: Distance check dist(player, enemy) < radius.

AOE_LOBBED: Thrown to a location (e.g., Grenade).

Interaction: Drag Intensity determines distance.

Logic: Spawns a projectile that travels to target {x,y}, then explodes.

Parameters: radius, damage, effect (Heal/Damage/Buff).

F. DASH / TELEPORT

Interaction: Drag (Direction).

Logic: Instantly moves player OR applies high velocity vector for short time.

Parameters: distance, speed.

3. CLASS SKILL MATRIX (The 32 Skills)

Legend:

S1: Main Attack (Low Cooldown)

S2: Special (Med Cooldown)

S3: Utility/Movement

S4: Ultimate (High Cooldown)

1. WARRIOR (Tank)

S1: Cleave [MELEE]

Cone attack in front. Moderate damage.

S2: Thunder Clap [AOE_SELF]

Damages and Slows enemies within radius.

S3: Charge [DASH]

Rapid dash towards aim direction. Stuns first enemy hit.

S4: Shield Wall [SHIELD]

Buff: Reduces ALL incoming damage by 90% for 5 seconds (360 degree protection, unlike standard shield).

2. PALADIN (Hybrid)

S1: Hammer Swing [MELEE]

Standard melee attack.

S2: Judgement [PROJECTILE]

Throws a hammer. Medium range.

S3: Divine Shield [SHIELD] (Directional)

Standard directional block logic. Hold to block.

S4: Consecration [AOE_SELF]

Creates a zone on the floor for 5s. Deals dmg to enemies, Heals allies inside.

3. SHAMAN (Hybrid DPS)

S1: Lightning Bolt [PROJECTILE]

Fast moving projectile.

S2: Chain Heal [PROJECTILE] (Targeted)

Shoots a "water" beam at nearest ally. Heals them. (Visual: Beam effect).

S3: Ghost Wolf [BUFF]

Increases movement speed by 50% for 3s.

S4: Bloodlust [AOE_SELF] (Global Buff)

Increases Fire Rate and Movement Speed of ALL allies by 30% for 8s.

4. HUNTER (Ranged)

S1: Shoot Bow [PROJECTILE]

Long range, thin projectile.

S2: Multi-Shot [PROJECTILE]

Spawns 3 projectiles in a spread angle (Fan shape).

S3: Disengage [DASH]

Dashes backwards (opposite to aim vector).

S4: Explosive Trap [AOE_LOBBED]

Throws a trap. When enemy touches it -> Explosion (AoE Damage).

5. PRIEST (Healer)

S1: Smite [PROJECTILE]

Weak damage projectile.

S2: Flash Heal [AOE_LOBBED] (Instant/Fast)

Throws a small healing spark to target location. Heals allies in small radius.

S3: Power Word: Shield [BUFF]

Applies a temporary HP shield to self or nearest ally.

S4: Mass Resurrection [CAST] -> [AOE_SELF]

Cast Time: 2.0 seconds (Hold button).

Effect: Revives all dead players (Tombstones) within large radius with 50% HP.

6. MAGE (DPS)

S1: Fireball [PROJECTILE]

Standard damage.

S2: Frost Nova [AOE_SELF]

Roots enemies (movement speed = 0) for 2s.

S3: Blink [TELEPORT]

Instantly moves player 150px in aim direction (can pass through walls if logic permits).

S4: Pyroblast [CAST] -> [PROJECTILE]

Cast Time: 1.5 seconds.

Effect: Spawns a massive, slow fireball. Huge damage + AoE on impact.

7. DRUID (Shapeshifter)

Mechanic: Skills change player sprite/stats temporarily.

S1: Wrath [PROJECTILE]

Standard magic attack.

S2: Bear Form [BUFF]

Transforms sprite to Bear. +Armor, +HP, but Weapon becomes Melee (only S1 usable as Bite). Toggle.

S3: Cat Dash [DASH]

Quick leap forward.

S4: Tranquility [CAST] -> [AOE_SELF] (Channeled)

Cast Time: 4.0 seconds (Channeling).

Effect: Heals all allies in range every 0.5s while holding button.

8. ROGUE (Melee)

S1: Sinister Strike [MELEE]

Very short range, high damage.

S2: Fan of Knives [AOE_SELF] -> [PROJECTILE]

Spawns 8 knives traveling outward in a circle from player.

S3: Sprint [BUFF]

+100% Speed for 3s.

S4: Ambush [BUFF] (Stealth)

Player becomes semi-transparent. Enemies stop targeting player. Next attack deals 3x damage.

4. IMPLEMENTATION NOTES FOR SKILLMANAGER

Unified Handler: SkillManager.handleSkill(scene, player, skillIndex, inputData)

Input Data:

action: 'START' (Tap/Drag Start), 'HOLD' (Dragging), 'RELEASE' (Fire).

vector: {x, y} normalized direction.

intensity: 0.0 to 1.0 (for Lobbed/Dash distance).

Cast Logic:

If skill is type CAST, action: 'HOLD' updates a timer.

If timer < castTime and action: 'RELEASE', cancel cast.

If timer >= castTime, execute Payload.