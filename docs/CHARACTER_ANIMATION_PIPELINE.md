# Character Animation Pipeline

Reference for downloading, extracting, and registering PixelLab character animations into the game.

---

## Animation System Overview

The game supports four animation categories:

| Category | State name | Trigger | Config location |
|---|---|---|---|
| Idle | `idle` | default / standing still | top-level in `DIRECTIONAL_ANIMATIONS[class]` |
| Walk | `walk` | position delta > 0.3px | top-level |
| Cast | `cast` | `state.castProgress != null` (STATE_DELTA) | top-level |
| Downed | `downed` | `state.isDead == true` | top-level |
| Skill fire | `ability` | `SKILL_FIRED` event | `DIRECTIONAL_ANIMATIONS[class].skills[skillName]` |

### Per-skill fire animations

Each ability that has a distinct animation gets its own entry in the `skills` sub-map.
Fallback chain (highest to lowest priority):
1. `skills[skillName]` — skill-specific strip (e.g. `warrior.skills.cleave`)
2. `skills.ability` — generic class fallback strip (folder: `ability/`)
3. Skip animation (hold last frame) — no crash

**Texture key:** `player_{class}_{skillName}_{dir}_{frame}`
**Folder path:** `public/assets/sprites/{class}/{skillName}/{dir}/{frame}.png`

`skillName` must match exactly what the server sends in `SKILL_FIRED.skillName`.

Example entries to add in `DIRECTIONAL_ANIMATIONS` (`HostGame.js`):
```js
warrior: {
  ...,
  skills: {
    cleave:       { frames: 5, fps: 14 },
    thunderstomp: { frames: 6, fps: 12 },
  },
},
priest: {
  ...,
  skills: {
    ability:  { frames: 4, fps: 12 },  // generic fallback (existing strip)
    penance:  { frames: 4, fps: 12 },
    holyNova: { frames: 4, fps: 12 },
  },
},
```

### Enemy attack animations

When an enemy attacks, the server sets `attackingAbility` for one tick in `STATE_DELTA`.
The enemy's attack animation key lives in `DIRECTIONAL_ENEMY_ANIMATIONS[type].skills[abilityName]`,
with `skills.attack` as the generic fallback.

To add an attack animation for an enemy type:
1. Add `attackAnimKey: '<name>'` to the type entry in `shared/EnemyTypeConfig.js` (defaults to `'attack'`).
2. Add `skills: { '<name>': { frames, fps } }` to `DIRECTIONAL_ENEMY_ANIMATIONS[type]` in `HostGame.js`.
3. Extract sprites to `public/assets/sprites/{type}/<name>/{dir}/{frame}.png`.

### Boss phase transition animations

When a boss transitions to a new phase with `freeze: true` in the `ILLIDAN_PHASE_TRANSITION` event,
`BossSprite.triggerPhaseTransition(freezeDuration)` plays a one-shot `transition` animation.

Texture key: `{bossType}_transition_{dir}_{frame}`
Folder path: `public/assets/sprites/{bossType}/transition/{dir}/{frame}.png`
Config: add `transition: { frames, fps }` to the boss entry in `DIRECTIONAL_BOSS_ANIMATIONS` (`HostGame.js`).

The `freezeDuration` (ms) set in `IllidanEncounter.js` controls how long both the server immunity
and the client animation last. Currently: HUNT_2 = 2500 ms, DEMON_FORM = 3500 ms.

---

## Enemy Character ID Registry

| Enemy type key | PixelLab ID | Status |
|---|---|---|
| `leviathan` | `a7aab6e3-b4d3-4d32-9fc4-b58acf24d572` | ✅ done (static rotations only — directional-static mode, no animation by design) |
| `felGuard` | `c8fd1b93-2e9f-4411-b089-46c5ea4a544c` | ✅ done (idle, walk) |
| `bonechewerBrute` | `3ad55749-0601-4b9c-afbb-dc9fb9cda661` | ✅ done (idle, walk) |
| `coilskarHarpooner` | `2e91f3bf-b45d-4c39-b6c9-d48f30fa02c6` | ✅ done (idle, walk) |
| `illidariCenturion` | `51c583ac-735f-462a-ad5b-bf622757f708` | ✅ done (idle, walk) |
| `bonechewerBladeFury` | `509eb7d2-04fb-452a-b450-cfc5f8f6b836` | ✅ done (idle, walk) |
| `ashtonghueMystic` | `9b54e7c8-008a-427a-912c-48299b108fde` | ✅ done (idle, walk) |
| `bloodProphet` | `dde73571-1b5f-4a04-9a6e-6745f699f8b4` | ✅ done (idle, walk) |
| `coilskarSerpentGuard` | `af274f5c-2bbe-4030-b55b-f485fa69b31a` | ✅ done (idle, walk) |
| `ritualChanneler` | `63b488b6-86a9-4388-b339-8acfbadd5395` | ✅ done (idle, walk, channel) |
| `flameOfAzzinoth` | `d0a0159f-619d-45a9-bdcb-38486caf3af4` | ✅ done (idle, walk) |

Enemy sprites extract to: `public/assets/sprites/{typeKey}/{dir}.png` (static rotations)
and `public/assets/sprites/{typeKey}/{idle|walk}/{dir}/{frame}.png` (animations).
Asset key format: `enemy_{typeKey}_{dir}` / `enemy_{typeKey}_{anim}_{dir}_{frame}`.

---

## Boss Character ID Registry

| Boss type key | PixelLab ID | Status |
|---|---|---|
| `illidan` | `c5e59f42-3c50-47d5-916c-3dc07ffb6c8c` | ✅ done (idle, walk) |
| `illidan_demon` | `05406bcc-df66-49d5-a4d3-c81913d3ef0d` | ✅ done (idle, walk) |

Boss sprites extract to: `public/assets/sprites/{typeKey}/{dir}.png` (static rotations)
and `public/assets/sprites/{typeKey}/{idle|walk|transition}/{dir}/{frame}.png` (animations).
Asset key format: `{typeKey}_{dir}` / `{typeKey}_{anim}_{dir}_{frame}`.
Registered in `DIRECTIONAL_BOSSES` and `DIRECTIONAL_BOSS_ANIMATIONS` in `HostGame.js`.

---

## NPC Character ID Registry

| NPC id | PixelLab ID | Status |
|---|---|---|
| `akama` | `bac74a43-0e70-4b33-a81a-6a3ee954cd6d` | ✅ done (idle, walk) |

NPC sprites extract to: `public/assets/sprites/{npcId}/{dir}.png` (static rotations)
and `public/assets/sprites/{npcId}/{idle|walk}/{dir}/{frame}.png` (animations).
Asset key format: `{npcId}_{dir}` / `{npcId}_{anim}_{dir}_{frame}`.
Registered in `DIRECTIONAL_NPCS` and `DIRECTIONAL_NPC_ANIMATIONS` in `HostGame.js`.

---

## Player Character ID Registry

| Class | PixelLab ID | Status |
|---|---|---|
| `priest` | `59c665b2-8bf0-4937-873e-eadea392643d` | ✅ done (idle, walk, ability, cast) |
| `warrior` | `f7dd4422-52ad-47aa-b2fe-3f23452c3170` | ✅ done (idle, walk) |
| `paladin` | `d631692d-4b5f-43a7-973d-8868d7d9c590` | ✅ done (idle, walk) |
| `druid` | `407467d9-5767-4fe5-ba61-e8a57e2d9b6b` | ✅ done (idle, walk) |
| `hunter` | `0a18a9d1-6ead-4eeb-b8ca-8fa2ea0f6dd0` | ✅ done (idle, walk) |
| `mage` | `a6258f38-f4d3-4299-872e-20c3b47060b8` | ✅ done (idle, walk) |
| `warlock` | `5f01a06f-ea17-40a6-8438-85a3c5062cce` | ✅ done (idle, walk) |
| `deathknight` | `7de980a5-af87-4144-82fe-3e6a8753a105` | ✅ done (idle, walk) |
| `rogue` | `c8bdf5d0-f824-4444-aa25-8de0a276c3f0` | pending |
| `shaman` | `b3e0d661-03e0-49d9-8604-a1ff4e1ca55e` | ✅ done (idle, walk) |

> Ignore: `player_priest` (3bab55e7), T6 variants, and other unnamed alternates.

---

## Directory Structure

```
public/assets/sprites/{class}/
├── {dir}.png                  ← static rotation sprite (8 files)
├── idle/{dir}/0.png … 3.png   ← 4 frames, 0-indexed
├── walk/{dir}/0.png … 5.png   ← 6 frames, 0-indexed
├── cast/{dir}/0.png … 5.png   ← looping cast channel animation (priest only so far)
├── downed/{dir}/0.png … 8.png ← death/downed animation
├── ability/{dir}/0.png … N.png ← generic skill fire fallback (priest has this)
└── {skillName}/{dir}/0.png … N.png  ← per-skill fire animation (one folder per skill)
```

Directions: `south`, `south-east`, `east`, `north-east`, `north`, `north-west`, `west`, `south-west`

---

## Adding a New Skill Fire Animation

1. **Generate** the animation in PixelLab for the character. Confirm it has 8 directional strips.

2. **Download and identify** the animation folder in the ZIP (same process as idle/walk).

3. **Extract** to the correct path:
```bash
SKILL="<skillName>"   # must match SKILL_FIRED.skillName from the server exactly
CLASS="<className>"
ANIM_FOLDER="<folder-name-from-zip>"
SPRITE_DIR="public/assets/sprites/$CLASS"
DIRS="south south-east east north-east north north-west west south-west"

for dir in $DIRS; do
  mkdir -p "$SPRITE_DIR/$SKILL/$dir"
  i=0; for f in "$SRC/animations/$ANIM_FOLDER/$dir/frame_"*.png; do
    cp "$f" "$SPRITE_DIR/$SKILL/$dir/$i.png"; i=$((i+1))
  done
done
```

4. **Register** in `DIRECTIONAL_ANIMATIONS` in `client/host/HostGame.js`:
```js
warrior: {
  idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 }, downed: { frames: 9, fps: 10 },
  skills: {
    cleave: { frames: 5, fps: 14 },   // ← add here
  },
},
```

5. **Verify** frame counts match the config entry.

6. **Update** the registry table in this file.

---

## Adding Idle/Walk Animations (standard process)

### 1. Verify animations are ready

```
mcp__pixellab__get_character(character_id="<ID>")
```

Check the Animations list for:
- `breathing-idle` × 8 directions, 4 frames each
- `walk` × 8 directions, 6 frames each

If missing, run `animate_character` with `template_animation_id="breathing-idle"` or `"walk"`. If pending, wait and re-check.

### 2. Download the ZIP

```bash
curl --fail -o /tmp/<class>_model.zip \
  "https://api.pixellab.ai/mcp/characters/<ID>/download"
```

### 3. Identify animation folder names

ZIP uses opaque folder names. List them:

```bash
unzip -l /tmp/<class>_model.zip | grep "frame_" | awk -F/ '{print $3}' | sort -u
```

Identify by frame count (check one direction):

```bash
unzip -l /tmp/<class>_model.zip | grep "<folder>/south/" | wc -l
```

- **4 frames** → idle (`breathing-idle`)
- **6 frames** → walk

Folders containing `Breathing` or `Idle` in the name → idle. Everything else → walk.

### 4. Extract into game directories

```bash
CLASS="<classname>"           # e.g. warrior, paladin, mage
IDLE_FOLDER="<idle-folder>"   # e.g. Breathing_Idle-d279fa04
WALK_FOLDER="<walk-folder>"   # e.g. animation-4705264c
SPRITE_DIR="D:/Games/bachelorPartyGame/public/assets/sprites/$CLASS"
SRC="/tmp/${CLASS}_extract"

mkdir -p "$SRC" && unzip -o /tmp/${CLASS}_model.zip -d "$SRC" > /dev/null

DIRS="south south-east east north-east north north-west west south-west"

# Rotations
for dir in $DIRS; do
  cp "$SRC/rotations/$dir.png" "$SPRITE_DIR/$dir.png"
done

# Idle frames
for dir in $DIRS; do
  mkdir -p "$SPRITE_DIR/idle/$dir"
  i=0; for f in "$SRC/animations/$IDLE_FOLDER/$dir/frame_"*.png; do
    cp "$f" "$SPRITE_DIR/idle/$dir/$i.png"; i=$((i+1))
  done
done

# Walk frames
for dir in $DIRS; do
  mkdir -p "$SPRITE_DIR/walk/$dir"
  i=0; for f in "$SRC/animations/$WALK_FOLDER/$dir/frame_"*.png; do
    cp "$f" "$SPRITE_DIR/walk/$dir/$i.png"; i=$((i+1))
  done
done
```

### 5. Verify frame counts

```bash
for dir in south south-east east north-east north north-west west south-west; do
  idle=$(ls "$SPRITE_DIR/idle/$dir/"*.png | wc -l)
  walk=$(ls "$SPRITE_DIR/walk/$dir/"*.png | wc -l)
  echo "$dir: idle=$idle walk=$walk"
done
# Expected: idle=4 walk=6 for all 8 directions
```

### 6. Register in HostGame.js

Add to `DIRECTIONAL_CLASSES` and `DIRECTIONAL_ANIMATIONS` in `client/host/HostGame.js`:

```js
export const DIRECTIONAL_CLASSES = new Set(['priest', '<class>'])

// In DIRECTIONAL_ANIMATIONS, all classes follow this shape:
<class>: {
  idle:   { frames: 4, fps: 7  },
  walk:   { frames: 6, fps: 10 },
  downed: { frames: 9, fps: 10 },
  skills: {
    // Add per-skill fire animations here as they are generated
  },
},
```

---

## Checklist (per character — idle/walk)

- [ ] `get_character` — confirm 16 animations (8 idle + 8 walk), all complete
- [ ] `curl` download
- [ ] Identify `IDLE_FOLDER` and `WALK_FOLDER` from ZIP listing
- [ ] Run extraction script
- [ ] Verify: idle=4, walk=6 per direction × 8 dirs
- [ ] Update `DIRECTIONAL_CLASSES` and `DIRECTIONAL_ANIMATIONS` in `HostGame.js`
- [ ] Update status in this file's registry table

## Checklist (per skill fire animation)

- [ ] Generate animation in PixelLab — confirm 8 directional strips
- [ ] Download ZIP, identify animation folder
- [ ] Extract to `public/assets/sprites/{class}/{skillName}/{dir}/{frame}.png`
- [ ] Add `skills.{skillName}: { frames, fps }` to `DIRECTIONAL_ANIMATIONS[class]` in `HostGame.js`
- [ ] Verify frame counts match config
- [ ] Update registry table status
