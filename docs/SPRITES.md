# SPRITES.md — Sprite Pipeline Reference

All host-side entity bodies are rendered as `PIXI.Sprite` backed by PNG files in
`public/assets/sprites/`. This document covers how to maintain, regenerate, and
extend the sprite pipeline.

---

## Directory layout

```
public/assets/sprites/   ← served at /assets/sprites/* by Vite (dev) and Express (prod)
scripts/generate-sprites.cjs  ← one-time generator script
```

---

## Running the generator

> **WSL2 note:** The project's WSL2 Node (`nvm` v25) is broken — it cannot load
> `libatomic.so.1`. Always use the Windows Node binary instead:

```bash
node.exe scripts/generate-sprites.cjs
```

The script uses the `canvas` npm package (Windows prebuilt binary, no native
build needed). It writes all PNGs to `public/assets/sprites/` and overwrites any
existing files.

---

## The canvas-size rule

Every sprite canvas must be exactly **`R*2 × R*2` pixels**, where `R` is the
entity's game-world radius. This is required because Pixi.js is told
`sprite.width = R*2; sprite.height = R*2`, so a canvas of any other size would
cause the shape to appear scaled up or down relative to the hitbox.

| Entity group | Radius (R) | Canvas size |
|---|---|---|
| Players | 20 | 40×40 |
| Enemy shadowfiend | 16 | 32×32 |
| Enemy gateRepairer / warlock | 13–14 | 26–28 |
| Enemy shadowDemon | 18 | 36×36 |
| Enemy flameOfAzzinoth | 40 | 80×80 |
| Enemy leviathan | 50 | 100×100 |
| Boss Akama | 60 | 120×120 |
| Projectile | 8 | 16×16 |

### Exception — Illidan Stormrage

Illidan's wings extend `R*1.6 = 96px` above the body center, so the canvas must
be taller than `R*2`. The rule is: **body center = PNG center**
(`anchor(0.5, 0.5)`), with the canvas padded symmetrically around it.

Current values: **120×220**, body center at `cx=60, cy=110`.

In `BossSprite.js`:
```js
sprite.width  = R * 2   // 120 — body diameter only
sprite.height = 220      // full height including wings
```

When replacing Illidan's PNG with real art, maintain the `120×220` canvas with
the body centered at `(60, 110)`, or update both the generator constants and the
`sprite.height` value in `BossSprite.js`.

---

## Sprite key naming convention

`{entity}_{typename}` — all lowercase, underscore separator.

| Entity file | Key pattern | Example |
|---|---|---|
| `PlayerSprite.js` | `player_{className.toLowerCase()}` | `player_warrior` |
| `EnemySprite.js` | `enemy_{type}` (all lowercase) | `enemy_flameofazzinoth` |
| `BossSprite.js` | `boss_{name}` | `boss_illidan`, `boss_akama` |
| `ProjectileSprite.js` | `projectile_default` | — |

The key must be registered in both the generator script and the manifest in
`HostGame._loadSprites()`.

---

## Adding a sprite for a new entity type

**Step 1 — Generator script** (`scripts/generate-sprites.cjs`)

Add an entry to the relevant array (e.g. `ENEMIES`):
```js
{ key: 'enemy_newtype', shape: 'circle', color: '#ff0000', R: 20 },
```
Available shapes: `circle`, `square`, `triangle`, `pentagon`, `diamond`,
`arrow`, `cross`.

Run `node.exe scripts/generate-sprites.cjs` to write the PNG.

**Step 2 — Asset manifest** (`client/host/HostGame.js`, `_loadSprites()`)

Add the key to the `SPRITE_KEYS` array:
```js
'enemy_newtype',
```

**Step 3 — Entity file**

Reference the key when constructing the sprite:
```js
const body = new Sprite(Assets.get('enemy_newtype'))
body.anchor.set(0.5)
body.width  = R * 2
body.height = R * 2
```

---

## Phase C — Replacing placeholders with real pixel art

No code changes needed. Drop a new PNG into `public/assets/sprites/` with the
exact filename (e.g. `player_warrior.png`) and Vite hot-reloads it in dev mode.

**Requirements for replacement PNGs:**
- Transparent background (no black fill outside the sprite)
- Canvas size must follow the canvas-size rule above (or update `sprite.width/height` to match)
- Facing direction: sprites are expected to face **right** (East) at rest; the
  game rotates the body container to match `player.angle`
- For entities without rotation (enemies, projectiles), any orientation works

When all art is final, pack into a spritesheet atlas for a single HTTP request
(TexturePacker or Shoebox → Pixi.js JSON format), then update `_loadSprites()`
to load the atlas instead of individual files.
