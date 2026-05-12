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
| Shoot Bow (Hunter) | `projectile_shoot_arrow` | `public/assets/sprites/projectile_shoot_arrow.png` | `default` |
| Aimed Shot (Hunter) | `projectile_aimed_shot` | `public/assets/sprites/projectile_aimed_shot.png` | `default` |
| Explosive Trap (Hunter) | `trap_explosive` | `public/assets/sprites/trap_explosive.png` | trap object |

All sprites live in the flat `public/assets/sprites/` directory. To add a new projectile: drop `{spriteKey}.png` there and add the key to `SPRITE_KEYS` in `HostGame.js`. No separate manifest entry or subdirectory needed.

## Training Dummy Sprites (2026-05-12)

Three dummies, each with a PixelLab model. Type field in DTO drives STATIC_SPRITE_KEY lookup in EnemySprite.

| Dummy class | dummyType | spriteKey | PixelLab ID |
|---|---|---|---|
| TrainingDummy (Idle) | `trainingDummy` | `dummy_training` | `d69d5743-6f97-4474-8df5-fbc0c2a1a69b` |
| RangedDummy | `rangedDummy` | `dummy_ranged` | `a1505c93-faa8-4c04-949c-96aba3ad110a` |
| MeleeDummy | `meleeDummy` | `dummy_tank` | `f6fc98a6-48e6-42a7-b6f9-f25000043e45` |

Positioned in a row at y=H*0.82: ranged left (W*0.25), idle center (W*0.5), melee right (W*0.75). MovingDummy removed.

Trap sprite: if `m.spriteKey` is set in minion DTO, BaseRenderer renders a 40×40 Sprite; falls back to diamond shape.

## Projectile Trail System (`ProjectileSprite.js`)

`PROJECTILE_CONFIG` keyed by `spriteKey` — add entries to extend, no other files needed:
- `trailStyle` → trail style name
- `spinSpeed` → rotation speed (rad/frame). 0 = no spin
- `bodyScale` → body sprite size multiplier. Default 1.0
- `trailLength` → history points per style. Default 5

Implemented styles:
- `holy` — 3-layer golden bloom (outer glow + mid ring + white core). Used for shield-type projectiles.
- `divine` — tight glow streak + tail-spawned holy sparkles. Particles are direction-aware (perpendicular scatter, tail origin only).

To add a new style: register in maps, implement `_draw{Style}Trail(cx, cy, now)`, add branch in `_drawTrail()`.

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
| Tranquility | CHANNEL | `tranquilityRing` (0.6s, green) | `tranquilityBurst` (gravity -90) | Channel start only; per-tick VFX needs Saurfang |
| Explosive Trap | EXPLOSION | `explosionBurst` (0.3s, fire) | `explosionBurst` | Emission live in `ServerMinion._updateTrap()`. Payload: `{ type, skillName, x, y, radius, color: '#ff6600' }` |

## Ricochet Bug (fixed 2026-04-17)

Chain-spawned projectiles in `SkillSystem.js` (`_findRicochetTarget` block) were not copying `spriteKey`. Fixed — `spriteKey: proj.spriteKey ?? null` added to chain object. Always check this block when adding new projectile fields.
