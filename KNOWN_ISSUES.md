## Classes that might be better:
Warrior: 
    - Remove Charge ability and create a new one: Bladestorm (for X seconds damage all nearby enemies)
Hunter:
    - not that interesting
    - swap multishot with aimed shot?
    - reduce pet cd when hittin enemy by shot?
Rogue: 
Warlock:
Death Knight:
    - Death and decay aiming shall be better or do not throw the ability that far (maybe just put the circle in front of him)
Druid:
    - Tranquility radius is not working it heals always in a specific circle


## Levels
Level 2:
    - The enemy spawning from the edges are halted while the enemies spawning from the gates. It seems like the maxAliveAtOnce property of the buildings limits the enemy spawning from the edges as well

Level 3:
    - Update the wall and gate positions because i changed the size of the map
    - I also would like to move the enemy spawning positions to the active room's corners that are closer to the gate:
    ---------------
    |     x|     x|
    |      |      |
    |      G      G
    |      |      |
    |     x|     x|
    ---------------

Level 5:
    - Minion spawning (voidSentinel / shadowWeaver / felHound) now fires after dialog completes via minionSpawning config.
      Saurfang: verify SpawnSystem handles minionSpawning enemy types and that voidSentinel/shadowWeaver/felHound are registered in EnemyTypeConfig.
