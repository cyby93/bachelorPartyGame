# Memory

_Curated long-term knowledge. Every token here loads every session — keep it tight._

## Closing Cinematic Assets (2026-05-24)

Flat sprites in `SPRITE_KEYS`: `pickup_key` (48×48), `pickup_ring` (48×48), `cell_structure` (64×64).

Bride NPC: `DIRECTIONAL_NPCS` + `DIRECTIONAL_NPC_ANIMATIONS.bride` — idle (8dir×4f), walk (8dir×6f), dance (south-only×9f). Files at `public/assets/sprites/bride/{dir}.png` + `bride/{anim}/{dir}/{frame}.png`.

**southOnly flag:** Any animation config with `southOnly: true` causes the manifest loader to emit only south-dir aliases. Both player and NPC loaders handle it. Dance state in PlayerSprite also reads this flag to lock `effectiveDir = 'south'`.

**Dance state machine (PlayerSprite.js):**
- `setDancing(bool)` is the public API — guards on `this._animCfg?.dance` so classes without the animation are safe.
- Priority: `downed > dance > cast > ability > walk > idle`.
- BattleRenderer calls `sprite.setDancing(isDancing)` in `_onPlayerSync`.

**priest** has dance animation (south-only, 9f): `public/assets/sprites/priest/dance/south/{0-8}.png`. PixelLab ID: `30cf18b2-26d0-4d73-a6e1-123603cc23da` (character `59c665b2-8bf0-4937-873e-eadea392643d`).

**Open:** `ring_moment` bride animation not generated. Cinematic bride still placeholder circle — wiring into `_renderClosingCinematic` is a separate task. Other classes have no dance frames yet.

## Portal Gate Sprites — Level Selector (2026-05-21)

Training Grounds level selector redesigned as stone portal archways.
Sprite keys: `portal_gate_1` through `portal_gate_6` (80×80px source, rendered 120×120). Files: `public/assets/sprites/portal_gate_N.png`. Registered in `HostGame.js` `SPRITE_KEYS`.

**Layout:** `container.y = -30` — portals overflow out of the arena top edge. Players activate by standing in the visible bottom half. Server `ZONE_HEIGHT = 90` (= -30 + 120). Zone grid always `CAMPAIGN.length` = 6 wide regardless of `unlockedLevelCount`; locked zones detected but not counted.

**Renderer (`TrainingGroundsRenderer.js`) key constants:**
`PORTAL_W = PORTAL_H = 120`, `GLOW_CY = 48`, `GLOW_RX = 42`, `GLOW_RY = 33`, `ZONE_HEIGHT = 90`

**Per-zone graphics:** `_portalSprite` (static, hidden during countdown), `_animSprite` (AnimatedSprite, 7 frames, shown + playing during countdown), `_glowGfx` (ellipse, committed/idle only), `_groundGfx` (progress bar during countdown, ground line otherwise). `_runeGfx` removed — replaced by animation + progress bar.

**Countdown state:** `isPending` → hide `_portalSprite`, show `_animSprite` (loop), draw progress bar in `_groundGfx` (`progress = 1 - countdownMs/4000`, fills left→right, 5px tall, levelColor). All other states use static sprite + ground line. Glow pulse removed from countdown — animation carries the energy signal.

**Animation assets:** frames at `public/assets/sprites/portal_gate_N_anim/{0..6}.png`. Registered in `HostGame.js` manifest loop (`portal_gate_N_anim_F` aliases). `animationSpeed = 0.15` (~9fps at 60fps ticker).

**Silver border:** `HostGame._rebuildBackground` skips the top edge stroke when `_activeSceneName === 'trainingGrounds'` (draws 3 sides only).

PixelLab concurrency limit: **5 concurrent jobs max** — 6th returns 429. Queue ≤5 at a time.

**PixelLab IDs (portal_entrance tag, 2026-05-21 replacement):**
| File | Level | Sprite name | PixelLab ID |
|---|---|---|---|
| portal_gate_1 | L1 Courtyard (Arcane blue) | Warcraft cave entrance archway | ac08bf73-03ab-443a-964d-cf996278ca16 |
| portal_gate_2 | L2 Siege (War fire orange) | yellow glowing energy | fd9850f4-3a65-4dad-bb66-1162d05c5baf |
| portal_gate_3 | L3 Black Temple (Fel green) | black and green glowing energy | de9d059c-c7c8-489b-8d49-a62e6a08e00f |
| portal_gate_4 | L4 Serpentshrine (Naga teal) | teal glowing energy | 5e66f44d-eaf7-4fc9-a653-95fb8ad544d3 |
| portal_gate_5 | L5 Refectory (Shadow violet) | purple glowing energy | f4cc75aa-ab54-41a1-b28a-a9bd1d59ca2a |
| portal_gate_6 | L6 Illidan (Void purple) | green glowing energy | 0b9eb654-ab2a-496c-80c2-52931a8a58e2 |

## Enemy Walk Animation Debounce (2026-05-19)

`EnemySprite.update()` is called at 60fps but server STATE_DELTA arrives at 20Hz. For 2 of 3 frames,
`state.x/y` is unchanged → delta = 0 → the walk→idle state check trips and resets `_animFrame` to 0.
Fix: `_lastMoveTime` timestamp + `recentlyMoved = moved || (Date.now() - _lastMoveTime) < 150`.
150ms covers ~3 server ticks — enemy stays in walk animation as long as it's actually moving server-side.
Was visibly broken on `flameOfAzzinoth` (large 240px sprite, slow 30pps), but the fix applies to all
directional enemies. If a future enemy has snappy start/stop that 150ms overshoots, reduce the threshold.

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
| Freezing Trap (Hunter) | `trap_freezing` | `public/assets/sprites/trap_freezing.png` | trap object |
| Fireball (Mage) | `projectile_fireball` | `public/assets/sprites/projectile_fireball.png` | `fire` |
| Pyroblast (Mage) | `projectile_fireball` | shared with Fireball — larger radius reads as bigger shot | `fire` |
| Shadow Bolt (Warlock) | `projectile_shadow_bolt` | `public/assets/sprites/projectile_shadow_bolt.png` | `shadow` |
| Lightning Bolt (Shaman) | `projectile_lightning_bolt` | `public/assets/sprites/projectile_lightning_bolt.png` | `lightning` |
| Wrath (Druid) | `projectile_wrath` | `public/assets/sprites/projectile_wrath.png` | `nature` |
| Searing Totem fireball | `projectile_fireball` | shared with Fireball | `fire` |
| Hawk pet (Hunter) | `sharp_feather` | `public/assets/sprites/sharp_feather.png` | `wind`, faceDirection, angleOffset=π/4 |
| Bladestorm (Warrior) | `bladestorm_sword` | `public/assets/sprites/bladestorm_sword.png` | orbit VFX — not a projectile; see AOE table |

All sprites live in the flat `public/assets/sprites/` directory. To add a new projectile: drop `{spriteKey}.png` there and add the key to `SPRITE_KEYS` in `HostGame.js`. No separate manifest entry or subdirectory needed.

## Building Sprites (2026-05-17)

Level 2 portal buildings use `spriteKey: 'portal_building'` threaded through LevelConfig → ServerBuilding.toDTO() → BattleRenderer.
`buildingGfx` now stores `{ container, hpGfx, bW, bH }` objects (not raw Graphics). Container holds Sprite body + separate hpGfx child.
PixelLab object ID: `b05d5cd3-503c-4ef2-90e1-3077156d46b6` (56×56, 1 dir). File: `public/assets/sprites/portal_building.png`.

## Shadow Demon — Directional Static (2026-05-20)

`shadowDemon` added to `DIRECTIONAL_STATIC_ENEMIES` in HostGame.js (same pattern as shadowfiend/leviathan).
8 direction sprites at `public/assets/sprites/shadowDemon/{dir}.png`. Key format: `enemy_shadowDemon_{dir}`.
PixelLab object ID: `4b74b6ba-fa92-4632-a5c3-84647add30a0` (132×132, 8 dirs, object type).
Dark void spider-demon with swirling purple/black body and glowing blue eyes.
NOTE: set key must match renderType exactly — `shadowDemon` (camelCase) not `shadowdemon`.
`STATIC_SPRITE_KEY['shadowDemon']` entry in EnemySprite.js still exists as unreachable fallback (harmless).

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

## AOE Ground Zone Visual System (2026-05-26)

`GroundEffectSystem.js` uses `ZONE_THEMES` keyed by skillName. Each zone gets 4 PIXI objects (z-order bottom→top): `glowGfx` (blurred bright core, optional) → `gfx` (multi-layer concentric fills, static) → `flickerGfx` (animated, cleared each frame) → `borderGfx` (pulsing ring).

**Themes and flicker styles:**
| skillName | layers | flicker | glow |
|---|---|---|---|
| Flame Crash | 4 layers (dark brown→muted red→muted orange→amber) | fire — 5 blobs, alpha 0.35 | BlurFilter(7), glowColor 0xee8800, glowAlpha 0.45 |
| Blaze | 5 layers (dark→muted red→muted orange→warm gold→soft gold) | blaze — 8 blobs, alpha 0.40 | BlurFilter(5), glowColor 0xee9900, glowAlpha 0.45 |
| Eye Beams | 4 layers (dark purple→mid purple→violet→muted lavender) | felfire — 4 blobs, alpha 0.32 | BlurFilter(7), glowColor 0x8877ee, glowAlpha 0.50 |
| Consecration | 1 layer (mid amber 0x956600, alpha 0.25) | holy — 28 tiny ember dots, each alpha-pulsing independently | BlurFilter(6), glowColor 0xddaa44, glowAlpha 0.72 |
| Death and Decay | 3 layers (dark green→mid green→bright green) | plague — 6 lissajous bubbles | none |
| Freezing Trap | 3 layers (dark ice→blue→cyan) | ice — 2 counter-rotating hexagons | BlurFilter(5), glowColor 0xaaeeff |
| (unknown) | single fill from server color | none | none |

**2026-05-26 hostile zone softening pass:** Flame Crash, Blaze, and Eye Beams had too-high contrast (near-black outer → pure bright inner) and glowAlpha 0.75–0.88. Fixed: outer layers lifted to mid-value dark, inner layers desaturated/darkened, glow reduced to 0.45–0.50, flicker alpha cut to 0.32–0.40. Felfire blobs also shifted from bright 0xaaaaff to muted 0x8866cc.

**BlurFilter** is in `pixi.js` (v8.5.0). Import: `import { BlurFilter } from 'pixi.js'`. Filters are explicitly destroyed on zone removal.

**Freezing Trap zone**: `ServerMinion._updateTrap()` calls `skillSystem.addZone()` with `effectType: 'VISUAL'` on trigger. `SkillSystem._executeAOEAtPoint()` has an early return for `'VISUAL'` to prevent spurious damage ticks.

**New ParticleSystem methods:** `flameCrashAmbient`, `eyeBeamsAmbient`, `freezingTrapAmbient`. All called from `GroundEffectSystem._emitParticles()` via theme particle key. Existing `consecrationAmbient`/`deathDecayAmbient` remain unchanged.

**Alpha starting values:** conservative (0.18–0.40 per layer). Expect tuning after first visual review.

**CRITICAL — `name` required in addZone config:** `getZonesDTO()` reads `z.config?.name ?? null` for skillName. If `name` is omitted, skillName is null on the client and no theme is applied — silent plain-circle fallback. Always include `name: 'Skill Name'` when calling `skillSystem.addZone()`. IllidanEncounter.js was missing this for both Flame Crash and Eye Beams — fixed 2026-05-26.

## AOE / Skill-Specific VFX

Branch on `data.skillName` in `VFXManager.triggerSkillVFX`. All AOE_SELF skills, plus CAST and CHANNEL cases.

Rule: sprites are wrong for burst effects — shapes + particles only.

| Ability | Case | Ring method | Particle method | Notes |
|---|---|---|---|---|
| Holy Nova | AOE_SELF | `holyNovaRing` (0.35s, white+gold) | `holyNovaBurst` (custom loop, radial) | autoRefire — keep short |
| Frost Nova | AOE_SELF | `frostNovaRing` (0.4s, white+cyan, ice spikes) | `frostNovaBurst` (gravity 0) | |
| Fear | AOE_SELF | `fearRing` (0.45s, violet+dark fill) | `fearBurst` (gravity 30) | No impactFlash — void feel |
| Consecration | AOE_SELF | `consecrationBurst` (0.4s, gold) | `consecrationSparkle` (rises, gravity -80) | Persistent zone from GroundEffectSystem |
| Bloodlust | AOE_SELF | `bloodlustWave` (0.55s, 3 staggered rings) | `bloodlustBurst` (30 particles, massive) | Fixed radii (80/160/280px), not game radius 2500. **On receive:** `triggerBloodlustReceive` clones player texture as red-tinted Sprite, scales 1→2.4 / fade 650ms. **Persistent:** `attachBloodlustAura` in `_bloodlustAuras` Map fires `bloodlustPulseRing` (28→100px red ring) every 1.5s. Orange AuraSystem ring replaced. Gain/loss detected via `_prevBloodlustSet` in BattleRenderer. |
| Mass Resurrection | CAST | `massResurrectionRing` (2.0s = castTime) | `massResurrectionBurst` (gravity -150, souls) | Ring duration matches castTime — peaks on revive |
| Tranquility | CHANNEL | `tranquilityField` (4.0s persistent ring, `OneShotEffectSystem`) | `tranquilityBurst` + `tranquilityAmbient` per-frame | `tranquilityField` accepts `emitFn` callback; VFXManager passes `() => ps.tranquilityAmbient(...)` |
| Explosive Trap | EXPLOSION | `explosionBurst` (0.3s, fire) | `explosionBurst` | Emission live in `ServerMinion._updateTrap()`. Payload: `{ type, skillName, x, y, radius, color: '#ff6600' }` |
| Icebound Fortitude | BUFF | `iceboundFortitude` (0.55s, 8 ice spikes + crystal ring) | `iceShards` (20 blue-white, gravity -20) | |
| Cleave (Warrior) | MELEE | `cleaveWipe` (0.22s, rotational sweep left→right) | `hitSpark` (red) | `d.skillAngle` drives `halfAngle`; blade radial + tip arc; fade-out at 80%. Requires `skillAngle` in SKILL_FIRED payload. |
| Hammer Swing (Paladin) | MELEE | `hammerStamp` (0.22s, instant golden stamp) | `hitSpark` (gold) | Full cone at t=0, 4 crack radials first 35%, white inner tip first 25%. Requires `skillAngle` in SKILL_FIRED payload. |
| Thunder Clap | AOE_SELF | `thunderClapRing` (0.4s, gold instant stamp) | `hitSpark` (gold) | Frost Nova pattern — full-radius at t=0, no expansion. 8 crack radials first 25%, golden fill + double ring. |
| Bladestorm | AOE/BLADESTORM | `aoeFlash` on cast + `attachBladestorm` persistent | — | `attachBladestorm(getPos, 4000, radius)` from `BaseRenderer.onSkillFired`; 5 `bladestorm_sword` Sprites (36px, PixelLab `bcdcac1c`) orbit at `radius` px, each with 8 blue-tinted ghost trail sprites (TRAIL_ALPHA=0.38). Container per storm, `destroy({children:true})` on expire. Sword facing: `a + π/2` (tangent). May need `SWORD_ANGLE_OFFSET` tuning if sprite orientation doesn't align. |

## Debuff Rendering Patterns (2026-05-14)

**Moonfire DoT:** 8 `_moonfireParticles` in `EnemySprite` — lazily initialized, zig-zag via `sin(now/160 + phase)` lateral push per particle. Bounces off body boundary. Nulled when debuff expires. Dots are deliberately small + semi-transparent (r=1.4, α=0.45).

**Corruption DoT:** Horizontal ellipse orbit at head level. `orbitW = R * 0.65`, `orbitH = R * 0.18`, center at `y = -(R + 3)`. Dot r=2.5.

**Per-sprite particle state pattern:** Initialize lazily in the debuff block, store on `this._moonfireParticles`; null on expiry. `_moonfireLastTime` tracks dt across frames. Cap dt at 50ms to avoid jumps after tab unfocus.

**TrainingDummy debuff gap:** `TrainingDummy.toDTO()` is a SEPARATE codepath from `ServerEnemy.toDTO()`. Any new state field must be added to BOTH. When debuffs were added to ServerEnemy, TrainingDummy was missed — all DoT visuals were invisible on dummies until fixed (2026-05-14).

## Ricochet Bug (fixed 2026-04-17)

Chain-spawned projectiles in `SkillSystem.js` (`_findRicochetTarget` block) were not copying `spriteKey`. Fixed — `spriteKey: proj.spriteKey ?? null` added to chain object. Always check this block when adding new projectile fields.
