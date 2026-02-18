# Skill Reference Guide

Quick reference for all 32 abilities with their parameters.

## Warrior

### S1: Cleave
- **Type**: MELEE
- **Cooldown**: 1000ms (1s)
- **Damage**: 50
- **Range**: 80
- **Angle**: 60° cone

### S2: Thunder Clap
- **Type**: AOE_SELF
- **Cooldown**: 5000ms (5s)
- **Damage**: 40
- **Radius**: 150
- **Effect**: Slow (50% speed for 2s)

### S3: Charge
- **Type**: DASH
- **Cooldown**: 8000ms (8s)
- **Speed**: 800
- **Distance**: 300
- **Effect**: Stun first enemy (1s)

### S4: Shield Wall
- **Type**: BUFF
- **Cooldown**: 30000ms (30s)
- **Duration**: 5000ms (5s)
- **Effect**: 90% damage reduction (360°)

## Paladin

### S1: Hammer Swing
- **Type**: MELEE
- **Cooldown**: 1200ms (1.2s)
- **Damage**: 45
- **Range**: 70
- **Angle**: 45° cone

### S2: Judgement
- **Type**: PROJECTILE
- **Cooldown**: 4000ms (4s)
- **Damage**: 60
- **Speed**: 400
- **Range**: 400

### S3: Divine Shield
- **Type**: SHIELD
- **Cooldown**: 12000ms (12s)
- **Arc**: 90°
- **Duration**: 3000ms (3s)

### S4: Consecration
- **Type**: AOE_SELF
- **Cooldown**: 20000ms (20s)
- **Damage**: 15/tick
- **Heal**: 10/tick
- **Radius**: 200
- **Duration**: 5000ms (5s)
- **Tick Rate**: 500ms

## Shaman

### S1: Lightning Bolt
- **Type**: PROJECTILE
- **Cooldown**: 800ms
- **Damage**: 35
- **Speed**: 600
- **Range**: 500

### S2: Chain Heal
- **Type**: PROJECTILE (Targeted)
- **Cooldown**: 3000ms (3s)
- **Heal**: 50
- **Speed**: 800
- **Range**: 400

### S3: Ghost Wolf
- **Type**: BUFF
- **Cooldown**: 10000ms (10s)
- **Duration**: 3000ms (3s)
- **Effect**: +50% speed

### S4: Bloodlust
- **Type**: AOE_SELF
- **Cooldown**: 60000ms (60s)
- **Radius**: 500 (global)
- **Duration**: 8000ms (8s)
- **Effect**: +30% speed & fire rate

## Hunter

### S1: Shoot Bow
- **Type**: PROJECTILE
- **Cooldown**: 600ms
- **Damage**: 30
- **Speed**: 700
- **Range**: 600

### S2: Multi-Shot
- **Type**: PROJECTILE (Multi)
- **Cooldown**: 4000ms (4s)
- **Damage**: 25 per arrow
- **Count**: 3 projectiles
- **Spread**: 30° total
- **Speed**: 650
- **Range**: 500

### S3: Disengage
- **Type**: DASH (Backwards)
- **Cooldown**: 8000ms (8s)
- **Speed**: 1000
- **Distance**: 250

### S4: Explosive Trap
- **Type**: AOE_LOBBED
- **Cooldown**: 15000ms (15s)
- **Damage**: 80
- **Radius**: 120
- **Speed**: 500
- **Range**: 400

## Priest

### S1: Smite
- **Type**: PROJECTILE
- **Cooldown**: 1000ms (1s)
- **Damage**: 25
- **Speed**: 450
- **Range**: 450

### S2: Flash Heal
- **Type**: AOE_LOBBED
- **Cooldown**: 2500ms (2.5s)
- **Heal**: 60
- **Radius**: 80
- **Speed**: 600
- **Range**: 350

### S3: Power Word: Shield
- **Type**: BUFF (Targeted)
- **Cooldown**: 8000ms (8s)
- **Duration**: 10000ms (10s)
- **Effect**: 100 temp HP

### S4: Mass Resurrection
- **Type**: CAST → AOE_SELF
- **Cooldown**: 120000ms (120s)
- **Cast Time**: 2000ms (2s)
- **Radius**: 300
- **Effect**: Revive with 50% HP

## Mage

### S1: Fireball
- **Type**: PROJECTILE
- **Cooldown**: 900ms
- **Damage**: 40
- **Speed**: 500
- **Range**: 550

### S2: Frost Nova
- **Type**: AOE_SELF
- **Cooldown**: 10000ms (10s)
- **Radius**: 180
- **Effect**: Root (0 speed for 2s)

### S3: Blink
- **Type**: TELEPORT
- **Cooldown**: 12000ms (12s)
- **Distance**: 150

### S4: Pyroblast
- **Type**: CAST → PROJECTILE + AOE
- **Cooldown**: 20000ms (20s)
- **Cast Time**: 1500ms (1.5s)
- **Projectile Damage**: 200
- **Speed**: 300
- **Range**: 600
- **AOE Damage**: 100
- **AOE Radius**: 100

## Druid

### S1: Wrath
- **Type**: PROJECTILE
- **Cooldown**: 1000ms (1s)
- **Damage**: 35
- **Speed**: 550
- **Range**: 500

### S2: Bear Form
- **Type**: BUFF (Toggle)
- **Cooldown**: 1000ms (1s)
- **Effect**: +50 armor, +50% max HP, S1 becomes melee

### S3: Cat Dash
- **Type**: DASH
- **Cooldown**: 6000ms (6s)
- **Speed**: 1200
- **Distance**: 200

### S4: Tranquility
- **Type**: CAST (Channeled) → AOE_SELF
- **Cooldown**: 90000ms (90s)
- **Cast Time**: 4000ms (4s)
- **Heal**: 20/tick
- **Radius**: 250
- **Tick Rate**: 500ms

## Rogue

### S1: Sinister Strike
- **Type**: MELEE
- **Cooldown**: 800ms
- **Damage**: 70
- **Range**: 50 (very short)
- **Angle**: 30° cone

### S2: Fan of Knives
- **Type**: AOE_SELF → PROJECTILE
- **Cooldown**: 8000ms (8s)
- **Damage**: 30 per knife
- **Count**: 8 knives
- **Pattern**: Circular
- **Speed**: 400
- **Range**: 200

### S3: Sprint
- **Type**: BUFF
- **Cooldown**: 15000ms (15s)
- **Duration**: 3000ms (3s)
- **Effect**: +100% speed

### S4: Ambush
- **Type**: BUFF (Stealth)
- **Cooldown**: 30000ms (30s)
- **Duration**: 10000ms (10s)
- **Effect**: Invisible, 3x damage on next attack, 30% opacity

## Mechanic Types

### PROJECTILE
- Spawns moving entity
- Travels in direction
- Collides with targets
- Can have pierce

### MELEE
- Instant hit detection
- Cone-based targeting
- No entity spawned
- Visual slash effect

### CAST
- Requires charge-up
- Shows progress bar
- Can be interrupted
- Executes payload on completion

### SHIELD
- Directional blocking
- Reduces movement speed
- Blocks projectiles in arc
- Duration-based

### AOE
- Area effect
- Self-centered or lobbed
- Affects all in radius
- Can damage, heal, or buff

### DASH/TELEPORT
- Rapid movement
- Instant or smooth
- Can be directional
- May pass through walls

### BUFF
- Stat modification
- Duration-based
- Can stack
- Visual indicator

## Cooldown Tiers

- **Low**: 600-1200ms (Basic attacks)
- **Medium**: 2500-8000ms (Special abilities)
- **High**: 10000-20000ms (Powerful abilities)
- **Ultimate**: 30000-120000ms (Game-changing abilities)

## Damage Tiers

- **Low**: 25-35 (Spam abilities)
- **Medium**: 40-60 (Standard abilities)
- **High**: 70-80 (Burst abilities)
- **Massive**: 100-200 (Ultimate abilities)

## Range Tiers

- **Melee**: 50-80 (Close combat)
- **Short**: 150-250 (Short range)
- **Medium**: 300-450 (Medium range)
- **Long**: 500-600 (Long range)
