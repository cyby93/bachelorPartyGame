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

All 8 direction frames are used at runtime. The engine selects the correct frame based
on the entity's angle — **no runtime rotation is applied to directional sprites**.

Sprites are stored in `/public/assets/sprites/{class_name}/{direction}.png`
where `{direction}` is one of: `north`, `north-east`, `east`, `south-east`,
`south`, `south-west`, `west`, `north-west`.

To activate a class for directional rendering, add its lowercase name to
`DIRECTIONAL_CLASSES` in `client/host/HostGame.js` once all 8 frames are ready.

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
| enemy_leviathan | 3-headed sea leviathan, dark green scales — directional-static only (no animation; engine-side pulse+aura instead) |
| boss_akama | draenei broken elder, robes, staff with light |
| boss_illidan | Illidan Stormrage, twin warglaives, glowing tattoos, wings |

### Size integration note

Directional player sprites are rendered at **48×48** in `PlayerSprite.js`.
Non-directional (single-sprite) player classes are still sized at `PLAYER_RADIUS * 2`.
When adding a new class to `DIRECTIONAL_CLASSES`, no size change is needed — the 48×48
size is already applied automatically by the directional branch in `PlayerSprite.js`.
For enemies and bosses, update `sprite.width`/`sprite.height` in `EnemySprite.js`
/ `BossSprite.js` when switching those to directional art.

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
