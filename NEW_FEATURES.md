## Level cinematic feature
I want a system which could handle level opening and ending cinematic-like scene stuff.

Each level i would like to setup how the currently active players enter the level:
    - on each level i'd like the players to be spawned outside the level (or at the edge of the playable area) and make each of the character to move into the game area in a group. I would imagine a predefined group formation as a spawn logic and make each character move into the right direction for 2-3 seconds (so they reach the game area) -> this would feel like the characters has just arrived to this level from the left.
    - On level 5 and level 6 this level entering movement cinematic could happen before any dialog voice acting is started. So basically the level entering states would be: ENTER LEVEL -> ENTER LEVEL TRANSITION END -> PLAYERS WALK IN -> DIALOGS STARTS (if its level 5 & 6) -> AFTER dialogs end the actual level gameplay mechanics starts (spawning enemies, boss mechanic etc.)

## Melee attack upgrade
I want the rogue to have a little different melee attack. As i know, the current melee attacks are hitting everyone in front of the character in a cone. so calculating the enemies inside that cone which arc and range is defined in the config. That is solid for a cleaving warrior and paladin which should hit in a larger area.
However, I'd like the Rogue to have somehat different melee attack. I want it to be more precise hit so it would hit enemies only in front of him in the direction of the aim with a specified width. So the rogue could reach further but only in that direction (it would require more precise aiming and positioning but more rewarding in term of damage). I would imagine the shape that used in finding melee hit targets as a rectangular (I would use the currently used 'range' config property with a new property that would hold it's width)

## Classes
Death Knight:
    - I want to rename the Obliterate to 'Death strike'. Everything else would be the same. I will find a better image for it