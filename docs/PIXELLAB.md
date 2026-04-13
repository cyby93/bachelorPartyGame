# PIXELLAB.md — Sprite Generation Prompt Guidelines

Reference for all PixelLab MCP sprite generation calls in this project.
Use these defaults as the baseline for every prompt in each category.
Entries marked **TBD** will be defined when that category is ready.

---

## Characters

Applies to: player classes, enemies, bosses.

### Fixed parameters

| Parameter | Value |
|---|---|
| Style | chibi |
| Theme | Warcraft game (WoW / WC3 aesthetic) |
| Canvas size | 48×48 px |
| Camera angle | high top-down view |
| Directions | 8 (N, NE, E, SE, S, SW, W, NW) |

### Facing convention

The **East (right)** frame is the canonical rest pose.
The game engine rotates the sprite container to match the entity's angle at runtime,
so the art itself never needs to rotate — just ensure the E frame faces right.

### Base prompt template

```
chibi warcraft character, high top-down view, 48x48 pixel art, transparent background,
[CHARACTER DESCRIPTION HERE]
```

### Per-entity notes

Add a short description that captures silhouette, color palette, and any iconic gear:

| Entity | Description hint |
|---|---|
| player_warrior | heavily armored human, red and gold plate |
| player_paladin | holy knight, silver plate with glowing hammer |
| player_shaman | orc shaman, tribal totems, blue lightning |
| player_hunter | lean elf hunter, green cloak, bow |
| player_priest | robed healer, white and gold, glowing staff |
| player_mage | robed mage, blue arcane robes, floating orb |
| player_druid | night elf druid, antler headdress, nature green |
| player_rogue | dark leather assassin, twin daggers, hooded |
| player_warlock | warlock, dark robes, green fel fire |
| player_deathknight | death knight, black runic plate, icy blue glow |
| enemy_grunt | orc grunt, brown/green skin, crude axe |
| enemy_brute | massive orc, heavy armor, spiked shoulders |
| enemy_archer | troll archer, long bow, lanky silhouette |
| enemy_charger | armored boar or orc rider, charging pose |
| enemy_healer | blood elf healer, green healing glow |
| enemy_warlock | satyr warlock, horns, fel green robes |
| enemy_shadowDemon | wisp-like shadow demon, purple-black smoke |
| enemy_shadowfiend | small shadowy imp, dark purple |
| enemy_flameOfAzzinoth | floating flame blade, teal/green infernal fire |
| enemy_leviathan | massive sea serpent or leviathan silhouette |
| boss_akama | draenei broken elder, robes, staff with light |
| boss_illidan | Illidan Stormrage, twin warglaives, glowing tattoos, wings |

### Size integration note

Current placeholder sprites are **40×40**. When dropping 48×48 PixelLab art into the
pipeline, update `sprite.width`/`sprite.height` in the relevant entity file
(`PlayerSprite.js`, `EnemySprite.js`, `BossSprite.js`) and the canvas-size table in
`SPRITES.md` to reflect the new dimensions.

---

## Effects

Ground effects, auras, hit flashes, skill VFX.

**TBD** — parameters will be defined when effect art is scoped.

Planned entries: aura rings, impact sparks, heal burst, fire trail, shadow cloud.

---

## Items

Pickups, powerups, loot icons.

**TBD** — parameters will be defined when item art is scoped.

---

## Map / Environment

Tiles, props, terrain, decorations.

**TBD** — parameters will be defined when map art is scoped.
