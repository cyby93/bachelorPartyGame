## buff/debuff
- We need to somehow rethink the whol buff/debuff overhead display bar -> too much things happening already there, we might want to create some buff/debuff column on each side of the character maybe?

## Mechanics
- I want to update the Warrior and Paladin shield block and divine shield mechanic: I want them to do not block all of the damage, but only 60% and allow it to be upgradeable until 90% (so 10% each times)

## Levels
Level 2:
    - Building shapes can be replaced by portal sprite


## VFX for auto targeting abilities
I want to create sprites and integrate them into the game for auto targeted abilities (like moonfire, corruption, chain heal, regrowth etc.). Currently a colored line indicating that the ability has hit someone, but i'd like some vfx to be displayed on the target (or targets if we think about the chain heal)
For example: The moonfire should summon a blue-colored fire beam on the target enemy model like a beam has just hit the enemy from above
For example 2: When the corruption hits an enemy some continous plague-like vfx should be displayed on the model until the debuff is over
For exmaple 3: The chain heal should chain the target togheter with a healing beam for a brief moment, indicating that a healing spring went through them

Also some of these abilities apply over time effects. I want those overtime effects to be indicated by a visible continous visual effect.

I give the the list of abilities:
    auto-targeted abilities:
        - Druid: Moonfire
        - Warlock: Corruption cast effect, Drain Life beam effect 
        - Shaman: Chain heal instant beam effect
        - Death Knight: Death grip
        - Rogue: Ambush
        - Mage: Blink effect

    ability debuffs on enemies:
        - Druid: Moonfire burn effect, Regrowth healing effect
        - Warlock: Corruption
        - Death Knight: Obliterate slow effect
        - Mage: Frost nova freeze effect
        - Paladin: Avenger's shield slow effect
        - Hunter: Aimed shot slow effect

## VFX for debuffs on enemies
I want to display special vfxs emitted from the enemy who has dedicated debuffs:
I want visual representation for player damage overtime and status effects like: Corruption, Moonfire, Frost Nova, any slow effect
Tasks that will be required for this task (in my opinion):
    - vfx for each debuff (some frozen block at the feet of the enemy OR purple shadow flame that is emitted from the enemy)
    - 'play' (or display) these vfx animations when the enemy has a certain debuff