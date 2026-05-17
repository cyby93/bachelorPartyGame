## Level cinematic feature
I want a system which could handle level opening and ending cinematic-like scene stuff.

Each level i would like to setup how the currently active players enter the level:
    - on each level i'd like the players to be spawned outside the level (or at the edge of the playable area) and make each of the character to move into the game area in a group. I would imagine a predefined group formation as a spawn logic and make each character move into the right direction for 2-3 seconds (so they reach the game area) -> this would feel like the characters has just arrived to this level from the left.
    - On level 5 and level 6 this level entering movement cinematic could happen before any dialog voice acting is started. So basically the level entering states would be: ENTER LEVEL -> ENTER LEVEL TRANSITION END -> PLAYERS WALK IN -> DIALOGS STARTS (if its level 5 & 6) -> AFTER dialogs end the actual level gameplay mechanics starts (spawning enemies, boss mechanic etc.)

## New mechanic
I want to update the downed player state. I want to let the downed players to still move his character without using any abilities. So basically the players can play even after downed by crawling into a safe position in order to revive them more easily. The crawling speed must be some minimum value like 0.2 (i will tune it afterwards)