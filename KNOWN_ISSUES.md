## Levels
- Level 2:
    - buildings cannot be damaged from auto targeted abilities (corruption, moonfire) nor by pets or totems. We should handle building almost just as enemy npcs: targetable, damageable and should display the damage numbers above them.
    - Lasers beam should start from the center of the building, not from its corner
    - We need some modifications about the spawning rate from the building. Currently, as the spawning buildings fall, less and less enemy is spawning because of it. I think we should declare a maximum number of spawned enemies (e.g. 10) which should be equally divided among the alive buildings (4 from the start) and the edge screen spawning 'point' -> so the 10 would be divided by 5 -> which means each building and edge point summons should limited to 2. But as the building are getting destroyed, the same number of enemies (so same difficulty) will be spawned from the leftover points. So if only 2 buildins are left, the math would look like: 10/3 = 3,333 -> so that would mean 2 point would spawn maximum 3 enemies and the 3rd one would spawn max 4. So this way we could keep the level difficulty.

Level 3:
    - I think we should keep all 4 spawn points but the spawn limit and rate should be divided amongs them
    - Also I think repairer enemy types should only be summoned when any of the gate is actually damaged
Level 4:
    - I need to add proper sound effects for the leviathan hit, projectile and death event.

Level 5:
    - Need to find proper voice lines

Level 6:
    - Need proper sfx for illidan's dot ability damage - currently the flesh hit sfx is played

## Classes
Hunter:
    - hawk pet should not move if its in range
Death Knight:
    - Icebound Fortitude - does not reduce damage takent while the shield active -> it should
    - Death Grip - it should not pull the enemy all the way to the same position as the DK, just into melee range

## Common
- Priest Mass resurrection ability revives does not count towards the all revive counter that is displayed at the end of each level

- Need to check if the host properly loads the audio files in advance (in the welcome screen), since i experienced delayed sfx when using abilities for the first time

- Need some asset loading indication progress bar for the controller view as well, since the controller can be 'frozen' after selecting a class and before advancing to the ability briefing view -> because the ability icons not yet downloaded

## Audio
If I stop casting an ability the sfx still playing until it ends -> can we stop the sfx when the current casted ability is fired of the cast stopped/cancelled?

I want all basic enemy attack damage (projectile and melee as well) to have less base volume -> make it 50% percent

Shaman:
    - Searing totem's projectile fireball sounds effects are wrong -> only one arrow impact sfx can be heard (probably the default and not getting the proper sounds from the fireball stuff)

