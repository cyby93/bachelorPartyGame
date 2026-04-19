# Memory

_Curated long-term knowledge. Every token here loads every session — keep it tight._

## PixelLab Prompt Formula (ability sprites)

`create_map_object`, `low top-down`, `48×48`, `medium shading`, `single color outline`  
`low top-down` gives 3D depth without looking flat. Minimum canvas is 32px — generate at 48, render smaller in engine if needed.

## Ability Sprite Registry

| Ability | spriteKey | File | Trail Style |
|---|---|---|---|
| Penance (Priest) | `projectile_penance` | `public/assets/sprites/projectile_penance.png` | `divine` |
| Avenger's Shield (Paladin) | `projectile_avengers_shield` | `public/assets/sprites/abilities/avengers_shield.png` | `holy` |

New sprites in `abilities/` subfolder need a manual manifest entry in `HostGame.js` (not auto-generated from SPRITE_KEYS).

## Projectile Trail System (`ProjectileSprite.js`)

Four maps keyed by `spriteKey` — add entries to extend, no other files needed:
- `TRAIL_STYLE_MAP` → trail style name
- `SPIN_SPEED_MAP` → rotation speed (rad/frame). 0 = no spin
- `BODY_SCALE_MAP` → body sprite size multiplier. Default 1.0
- `TRAIL_LENGTH_MAP` → history points per style. Default 5

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
| Explosive Trap | — | `explosionBurst` (0.3s, fire) | `explosionBurst` | **Server gap**: detonation emits no `skill:fired` — needs Saurfang |

## Ricochet Bug (fixed 2026-04-17)

Chain-spawned projectiles in `SkillSystem.js` (`_findRicochetTarget` block) were not copying `spriteKey`. Fixed — `spriteKey: proj.spriteKey ?? null` added to chain object. Always check this block when adding new projectile fields.
