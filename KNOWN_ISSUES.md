## VFX
hunter pets and trap should be rendered behind the characters

## from last test
- level 2 -> 4 + kevesebb mob legyen


## Final changes

- Switch level 2 and level 3 (search for every reference as well -> audio etc.)
- 'find my character' controller button cannot be pressed when the user using his movement joystick -> can we make to be able to be pressed WHILE moving? also the circular yellow pulsing effects could be a little bigger
- Illidan fight: 
    - when Illidan is in demon form, his abilities can be outranged -> that should not be the case and i tried to find any cast range related code part or property, but i couldnt find any. Can you check on it why people at the other side of the map are not included in the targets list?
    - when illidan is in demon form, he casts Agonizing Flames. This ability puts a purple circle as visual on the character, however when the character downed under this effect the purple circle does not disappears -> i'd like you to remove this (and similar effects) from characters when they downed.
    - when illidan is in demon form, he summons Shadow Demons. They are focused on players (hopefully on different targets if available multiple), but can you draw a simple redish line between the demon and the target? it could be great if the fixated target would know its him.
    - Make Illidan's cast bar the same size as his health bar. Also put the cast bast right below it (you can restructure if needed)