### Boss name: Illidan Stormrage

I want to make some entrance cinematic-like dialog between Illidan and Akama (from previous levels), so we will need some mechanic that would halt the boss fight flow (makes the boss immune and do not start their damage/ability mechanics yet). The entracnce dialog would be a little talk between Akama and Illidan, so i need some config that can be used to setup this dialog properly: timestamps or deltas for each sentence (e.g: 00:00: 'Hey Illidan!'; 01:30: 'Hello, Akama!', 03:00: 'How are you?' or any other pattern which i can use that fullfil my needs -> properly time each sentence and 'play' the next after the previous finished or timed)

## It has 3 phases:
Phase 1:
- Illidan simply focuses the closest player and attacks it while using abilities related to his first phase.

Phase 2:
- Illidan transforms into demon form and would fly high in the sky, throw down his 2 glaives onto the map (which are transformed into flame elementals) and cast his Phase 2 abilities from there. But in this game we should simply put the boss model outside of the map area, so he can be visible AND can cast his abilities into the map.
- So the mechanichs would be:
    - Illidan transform into demon form (while unattdamagable and it does not attack nor use abilities -> 2-3 sec)
    - It moves outside of the walkable map (or simply teleports)
    - summons 2 flame elemental into the map (in 2 different positions)
    - Illidan start to use his Phase 2 abilities while the players fight the 2 flame elemental (enemy name: Flame of Azzinoth)

Phase 3:
- Illidan comes back to the map in demon form and starts hitting the closest player while using his Phase 3 abilities

## Illidan abilities

Phase 1:
 - Flame Crash: With a little warning, Illidan jumps up in the air, then quickly crashes down, dealing area of effect damage to everyone in a small radius and leaving persistent blue fire on the ground, which continues to damage players who remain in the area.
 - Draw Soul: Frontal cone attack that hits all targets in front of Illidan for 50 damage. Illidan will heal for 500 health per target hit by this ability.
 - Shear: Cast by Illidan against his primary threat target. Decreases the maximum health of the target by 60% for 5 seconds. 
 - Parasitic Shadowfiend: Illidan will put this debuff on random players, dealing 30 shadow damage every 2 seconds for 10 seconds. When the debuff ends, 2 Shadowfiend mobs are spawned at the feet of the player, which will move towards other players. If they reach another player, they will infect that player and apply the Parasitic Shadowfiend debuff to them.

 Phase 2:
 - Fireball: Fireball targets random raid members during phase 2 and deals between 100 damage to the primary target and all players within 10 yards of that target.
 - Dark Barrage: Dark Barrage targets random raid members during phase 2 and deals 20 damage per second for 10 seconds to a single player.
- Eye Beams: Illidan will periodically cast two eye beams, which damage all targets in a line for massive impact damage and then leave behind a persistent blue flame, which deals around 30 damage per second to any player standing in the flame.

Phase 3:
- Agonizing Flames: It targets a random raid member and deals 100 damage to that player and anyone within 5 yards of the primary target. It also leaves a damage over time effect on the primary target, which deals 30 damage every 5 seconds to the player and anyone within 5 yards of them and lasts 20 seconds.
 - Aura of Dread: When Illidan transforms into a demon, he gains the Aura of Dread. This deals 10 damage every 3 seconds to all players within 15 yards of Illidan.
 - Shadow Blast: While Illidan is in demon form, he will continuously cast this ability to a random player. This deals 120 damage to the target and everyone within 10 yards of the target.
 - Summon Shadow Demons: While Illidan is in demon form, he will sometimes cast Summon Shadow Demons. This spawns 4 Shadow Demons at Illidan's feet. Each Shadow Demon chooses a random raider and projecting a purple beam towards that player. The demon will move towards the chosen player, and if the demon reaches the player, the player instantly dies, and the demon picks a new target.

## Flame of Azzinoth enemy abilities:
- periodically leaves a flaming circle (Blaze) on the ground where the enemy stands (bigger circle than the enemy itself so the enemy has to be moved in order to mellee players can hit the enemy again). These burning circles stays on the ground for 30 seconds and damages each players standing in it for 25 damage every second.
- Each Flame of Azzinoth has a burning flame aura which damages all players in 5 yards with 10 damage every 2 seconds. (Some light visual effect would be needed here so ranged players can stand outside of it)