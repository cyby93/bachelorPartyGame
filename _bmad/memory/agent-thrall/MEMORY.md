# Memory

_Curated long-term knowledge. Every token here loads every session — keep it tight._

## Leviathan Visual System (2026-04-21)

PixelLab animations fail for multi-headed characters — skeleton deformation collapses extra heads.
Solution: `DIRECTIONAL_STATIC_ENEMIES` set in HostGame.js + `_isDirectionalStatic` flag in EnemySprite.
Pattern: 8 direction sprites loaded as `enemy_{type}_{dir}`, texture-swapped on angle change, no frame animation.
Engine effects compensate: scale pulse (`_bodyBaseScaleX/Y * (1 ± 0.05)`). Teal aura rings were removed (pure noise, no gameplay signal).
Generation scaling: `displaySize * 0.75^generation` applied at construction time.
Leviathan PixelLab ID: `a7aab6e3-b4d3-4d32-9fc4-b58acf24d572`.

## PixelLab Prompt Formula (ability sprites)

`create_map_object`, `low top-down`, `48×48`, `medium shading`, `single color outline`  
`low top-down` gives 3D depth without looking flat. Minimum canvas is 32px — generate at 48, render smaller in engine if needed.

## Ability Sprite Registry

| Ability | spriteKey | File | Trail Style |
|---|---|---|---|
| Penance (Priest) | `projectile_penance` | `public/assets/sprites/projectile_penance.png` | `divine` |
| Avenger's Shield (Paladin) | `projectile_avengers_shield` | `public/assets/sprites/projectile_avengers_shield.png` | `holy` |
| Shoot Bow (Hunter) | `projectile_shoot_arrow` | `public/assets/sprites/projectile_shoot_arrow.png` | `none` |
| Aimed Shot (Hunter) | `projectile_aimed_shot` | `public/assets/sprites/projectile_aimed_shot.png` | `none` |
| Explosive Trap (Hunter) | `trap_explosive` | `public/assets/sprites/trap_explosive.png` | trap object |
| Fireball (Mage) | `projectile_fireball` | `public/assets/sprites/projectile_fireball.png` | `fire` |
| Pyroblast (Mage) | `projectile_fireball` | shared with Fireball — larger radius reads as bigger shot | `fire` |
| Shadow Bolt (Warlock) | `projectile_shadow_bolt` | `public/assets/sprites/projectile_shadow_bolt.png` | `shadow` |
| Lightning Bolt (Shaman) | `projectile_lightning_bolt` | `public/assets/sprites/projectile_lightning_bolt.png` | `lightning` |
| Wrath (Druid) | `projectile_wrath` | `public/assets/sprites/projectile_wrath.png` | `nature` |
| Searing Totem fireball | `projectile_fireball` | shared with Fireball | `fire` |

All sprites live in the flat `public/assets/sprites/` directory. To add a new projectile: drop `{spriteKey}.png` there and add the key to `SPRITE_KEYS` in `HostGame.js`. No separate manifest entry or subdirectory needed.

## Building Sprites (2026-05-17)

Level 2 portal buildings use `spriteKey: 'portal_building'` threaded through LevelConfig → ServerBuilding.toDTO() → BattleRenderer.
`buildingGfx` now stores `{ container, hpGfx, bW, bH }` objects (not raw Graphics). Container holds Sprite body + separate hpGfx child.
PixelLab object ID: `b05d5cd3-503c-4ef2-90e1-3077156d46b6` (56×56, 1 dir). File: `public/assets/sprites/portal_building.png`.

## Shadowfiend — Directional Static (2026-05-17)

`shadowfiend` added to `DIRECTIONAL_STATIC_ENEMIES` in HostGame.js (same pattern as leviathan).
8 direction sprites at `public/assets/sprites/shadowfiend/{dir}.png`. Key format: `enemy_shadowfiend_{dir}`.
PixelLab object ID: `3af7147c-86fb-4b42-9434-c13c3250e912` (48×48, 8 dirs, high top-down).
`enemy_shadowfiend` removed from flat SPRITE_KEYS — now loaded by the DIRECTIONAL_STATIC_ENEMIES manifest loop.

## Training Dummy Sprites (2026-05-12)

Three dummies, each with a PixelLab model. Type field in DTO drives STATIC_SPRITE_KEY lookup in EnemySprite.

| Dummy class | dummyType | spriteKey | PixelLab ID |
|---|---|---|---|
| TrainingDummy (Idle) | `trainingDummy` | `dummy_training` | `d69d5743-6f97-4474-8df5-fbc0c2a1a69b` |
| RangedDummy | `rangedDummy` | `dummy_ranged` | `a1505c93-faa8-4c04-949c-96aba3ad110a` |
| MeleeDummy | `meleeDummy` | `dummy_tank` | `f6fc98a6-48e6-42a7-b6f9-f25000043e45` |

Positioned in a row at y=H*0.82: ranged left (W*0.25), idle center (W*0.5), melee right (W*0.75). MovingDummy removed.

Trap sprite: if `m.spriteKey` is set in minion DTO, BaseRenderer renders a 40×40 Sprite; falls back to diamond shape.

## Minion Sprites (2026-05-13)

TOTEM and WILD_BEAST minions now support sprites via `m.spriteKey`. Same pattern as TRAP: BaseRenderer checks for `Assets.get(m.spriteKey)`, falls back to procedural graphics.

| Minion | spriteKey | PixelLab ID |
|---|---|---|
| Searing Totem | `searing_totem` | `59839014-4f87-4ae2-aeb0-45d0b52098e3` |
| Bear pet | `minion_bear` | `664f74fc-0f8c-4322-9553-f6d1a74776bf` |
| Hawk pet | `minion_hawk` | `0d185d0a-b322-45bc-a7b6-dd7ebffbc09b` |
| Panther pet | `minion_panther` | `d7a2d49c-8422-4e9e-b8c8-0e8281a1e52f` |

WILD_BEAST lookup: `BEAST_SPRITE_KEYS = { bear: 'minion_bear', hawk: 'minion_hawk', panther: 'minion_panther' }` in `BaseRenderer._createMinionGfx`.
Totem gets `spriteKey` from `config.spriteKey` in SkillDatabase → ServerMinion reads it → DTO sends it to client.

## Projectile Trail System (`ProjectileSprite.js`)

`PROJECTILE_CONFIG` keyed by `spriteKey` — add entries to extend, no other files needed:
- `trailStyle` → trail style name
- `spinSpeed` → rotation speed (rad/frame). 0 = no spin
- `bodyScale` → body sprite size multiplier. Default 1.0
- `trailLength` → history points per style. Default 5

All trails use `_interpolateTrail(cx, cy, step)` — interpolates intermediate positions between stored trail points so circles overlap and form a continuous smear regardless of server tick rate. Step = draw radius of that trail. Returns `{ rx, ry, t }[]` newest-first; draw reversed (oldest→newest) so head paints on top.

`trailLength` controls geometric tail length (number of stored positions), NOT visual density. To get a denser smear, reduce `step` (smaller r). To get a longer tail, increase `trailLength`.

Implemented styles (all use fixed radius, not shrinking-per-index):
| Style | r multiplier | Notes |
|---|---|---|
| `holy` | `radius * 0.9` | 3-layer golden bloom. Shield projectiles. |
| `divine` | `radius * 0.85` | Warm glow streak + holy sparkle particles. |
| `fire` | `radius * 0.9` | Deep orange outer, orange mid, yellow-white core. Floating embers. |
| `ichor` | `radius * 1.1` | Olive-green slimy blobs. Drip particles. |
| `shadow` | `radius * 0.6` (tunable) | Void bloom + violet ring. Drifting shadow motes. |
| `lightning` | `radius * 0.7` | Yellow-white electric bloom + fast-decay arc particles. |
| `nature` | `radius * 0.85` | Green-gold glow + nature spore particles (slow drift). |

To add a new style: register in `PROJECTILE_CONFIG`, implement `_draw{Style}Trail(cx, cy, now)` using `_interpolateTrail`, add branch in `_drawTrail()`.

**Trail linger on hit (2026-05-14):** When a projectile is removed from server state, `BaseRenderer._syncProjectiles()` calls `s.detach()` (hides body, stamps `_detachedAt`) instead of `s.destroy()`. The sprite is moved to `_dyingProjectiles`; `_tickDying()` calls `s.updateDetached()` each frame, which fades `_trailGfx.alpha` over 400ms and ages out particles. Returns `true` when fully gone → cleanup. Same pattern for boss fireballs via `_dyingBossFireballs`.

## Beam System (`BaseRenderer.js`)

Three beam arrays, all drawn in `_renderBeams()`:
- `_flashBeams` — static `{x1,y1,x2,y2}` coordinates, expire by timestamp
- `_trackedBeams` — follow `playerSprites`/`enemySprites` by ID each frame (Death Grip)
- `_trackedRefBeams` — follow Pixi Container refs each frame; guards with `.destroyed` check (Chain Heal, Regrowth, and any future "line between two moving entities" effects)

`_findClosestSpriteContainer(x, y)` searches both `playerSprites` and `enemySprites`, returns closest container. Used at event-fire time to resolve IDs when `targeted:hit` only carries coordinates. Falls back to `_flashBeams` if no sprite found.

## Shield Rendering (2026-05-13)

`PlayerSprite._drawShieldArc` is now class-aware:
- `warrior` → thick steel-gray arc (0xdddddd, double-bevel, +4px radius)
- `paladin` → golden arc (0xffd700) with outer white glow ring (+6px radius)
- default → existing blue (0x00d2ff)

## Cyby's Visual Preferences

- **Sprite must be dominant.** Glow and particles support the sprite — never compete with it.
- Start conservative on alpha and scale, tune upward. Never go the other direction first.
- Particle origin matters — tail-only spawn with perpendicular scatter feels natural. All-directions scatter felt wrong.

## AOE / Skill-Specific VFX

Branch on `data.skillName` in `VFXManager.triggerSkillVFX`. All AOE_SELF skills, plus CAST and CHANNEL cases.

Rule: sprites are wrong for burst effects — shapes + particles only.

| Ability | Case | Ring method | Particle method | Notes |
|---|---|---|---|---|
| Holy Nova | AOE_SELF | `holyNovaRing` (0.35s, white+gold) | `holyNovaBurst` (custom loop, radial) | autoRefire — keep short |
| Frost Nova | AOE_SELF | `frostNovaRing` (0.4s, white+cyan, ice spikes) | `frostNovaBurst` (gravity 0) | |
| Fear | AOE_SELF | `fearRing` (0.45s, violet+dark fill) | `fearBurst` (gravity 30) | No impactFlash — void feel |
| Consecration | AOE_SELF | `consecrationBurst` (0.4s, gold) | `consecrationSparkle` (rises, gravity -80) | Persistent zone from GroundEffectSystem |
| Bloodlust | AOE_SELF | `bloodlustWave` (0.55s, 3 staggered rings) | `bloodlustBurst` (30 particles, massive) | Fixed radii (80/160/280px), not game radius 2500 |
| Mass Resurrection | CAST | `massResurrectionRing` (2.0s = castTime) | `massResurrectionBurst` (gravity -150, souls) | Ring duration matches castTime — peaks on revive |
| Tranquility | CHANNEL | `tranquilityField` (4.0s persistent ring, `OneShotEffectSystem`) | `tranquilityBurst` + `tranquilityAmbient` per-frame | `tranquilityField` accepts `emitFn` callback; VFXManager passes `() => ps.tranquilityAmbient(...)` |
| Explosive Trap | EXPLOSION | `explosionBurst` (0.3s, fire) | `explosionBurst` | Emission live in `ServerMinion._updateTrap()`. Payload: `{ type, skillName, x, y, radius, color: '#ff6600' }` |
| Icebound Fortitude | BUFF | `iceboundFortitude` (0.55s, 8 ice spikes + crystal ring) | `iceShards` (20 blue-white, gravity -20) | |
| Bladestorm | AOE/BLADESTORM | `aoeFlash` on cast + `attachBladestorm` persistent | — | `attachBladestorm(getPos, 4000)` called from `BaseRenderer.onSkillFired`; VFXManager ticks spinning blades on fx layer |

## Debuff Rendering Patterns (2026-05-14)

**Moonfire DoT:** 8 `_moonfireParticles` in `EnemySprite` — lazily initialized, zig-zag via `sin(now/160 + phase)` lateral push per particle. Bounces off body boundary. Nulled when debuff expires. Dots are deliberately small + semi-transparent (r=1.4, α=0.45).

**Corruption DoT:** Horizontal ellipse orbit at head level. `orbitW = R * 0.65`, `orbitH = R * 0.18`, center at `y = -(R + 3)`. Dot r=2.5.

**Per-sprite particle state pattern:** Initialize lazily in the debuff block, store on `this._moonfireParticles`; null on expiry. `_moonfireLastTime` tracks dt across frames. Cap dt at 50ms to avoid jumps after tab unfocus.

**TrainingDummy debuff gap:** `TrainingDummy.toDTO()` is a SEPARATE codepath from `ServerEnemy.toDTO()`. Any new state field must be added to BOTH. When debuffs were added to ServerEnemy, TrainingDummy was missed — all DoT visuals were invisible on dummies until fixed (2026-05-14).

## Ricochet Bug (fixed 2026-04-17)

Chain-spawned projectiles in `SkillSystem.js` (`_findRicochetTarget` block) were not copying `spriteKey`. Fixed — `spriteKey: proj.spriteKey ?? null` added to chain object. Always check this block when adding new projectile fields.
