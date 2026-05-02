## Audio

All of the casting abilities has some issues. Its like the audio wouldnt start at all or just with a delay. 

Warlock, Druid: 
    - DOT sounds can be removed -> won't need in the future


## Host

It seems that connecting to the server takes a lot of time. Have to investigate this issues -> ideas: too much files to load (audio, sprite etc.) before the javascript could join to the server? Or just simply the connection is taking much too long. In either case something has to be displayed (filecontent progress bar or loading text or actually the 'connecting to server...' text if thats the case)

## Levels
Level 2:
- When the third building is destroyed (so only 1 is still active), the beam feature won't fire again. it's probably because the logic trying to find 2 active building. I want this logic to be modified to when only 1 building left, the beam should use one of the mirrors instead if the missing building -> so the beam would work with only 1 building as well

Level 3:
- The left gate (the first one that should be destroeyed) cannot be damaged, so the game cannot be advanced

Level 4:
- I want the Leviathan projectile attack to be a homing projectile -> so it would not just fly in a single line forward, but follow the targeted character until any player is hit (same as Illidan's fireball ability in the AZZINOTH phase)
- Also the enemies are spawning continously in this level (which is great), but i want the spawning process AFTER the last leviathan is dead

Level 5:
- Akama npc has wrong sprite 'scripting'. It probably using the same sprite as the Shade of akama, but somehow the akama sprites are not turning properly into direction.
- I want the 6 warlock (that are buffing Shade of Akama) health points to be able to configured from the LevelConfig 'warlocks' object, so i can tune those numbers easily as well
- Shade of Akama and the Akama Npc are overlapping in phase 2 when they are hitting each other. I want them to only move until they hit their own attack range (probably a little closer, to make sure the attack is dealt for sure)

## Vfx
Revive:
- I'd like an update to the vfx when one player tries to revive another player, when stading close to his downed character. Currently, a circle 'progress bar' can be seen when reviving which is great, but also a green line points towards that character from the top left corner of the screen -> I want this line removed. Also, I'd like that circular green progress bar to be a little more thich (add more width to the line)

## Enemies
- Currently the ranged enemies (coilscar harpooner's) projectiles can hit other enemies. I want them to be immune to each other's attack so the can only damage players, not each other. i mean globally, not just the harpooners -> so none of the enemies should be able to deal damage to an other enemy