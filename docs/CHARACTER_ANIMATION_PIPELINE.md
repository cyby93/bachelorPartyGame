# Character Animation Pipeline

Reference for downloading and extracting PixelLab character animations into the game.

---

## Enemy Character ID Registry

| Enemy type key | PixelLab ID | Status |
|---|---|---|
| `felGuard` | `c8fd1b93-2e9f-4411-b089-46c5ea4a544c` | ✅ done (idle, walk) |
| `bonechewerBrute` | `3ad55749-0601-4b9c-afbb-dc9fb9cda661` | ✅ done (idle, walk) |
| `coilskarHarpooner` | `2e91f3bf-b45d-4c39-b6c9-d48f30fa02c6` | ✅ done (idle, walk) |
| `illidariCenturion` | `51c583ac-735f-462a-ad5b-bf622757f708` | ✅ done (idle, walk) |
| `bonechewerBladeFury` | `509eb7d2-04fb-452a-b450-cfc5f8f6b836` | ✅ done (idle, walk) |
| `ashtonghueMystic` | `9b54e7c8-008a-427a-912c-48299b108fde` | ✅ done (idle, walk) |
| `bloodProphet` | `dde73571-1b5f-4a04-9a6e-6745f699f8b4` | ✅ done (idle, walk) |
| `coilskarSerpentGuard` | `af274f5c-2bbe-4030-b55b-f485fa69b31a` | ✅ done (idle, walk) |
| `ritualChanneler` | `63b488b6-86a9-4388-b339-8acfbadd5395` | ✅ done (idle, walk) |

Enemy sprites extract to: `public/assets/sprites/{typeKey}/{dir}.png` (static rotations)
and `public/assets/sprites/{typeKey}/{idle|walk}/{dir}/{frame}.png` (animations).
Asset key format: `enemy_{typeKey}_{dir}` / `enemy_{typeKey}_{anim}_{dir}_{frame}`.

---

## Player Character ID Registry

| Class | PixelLab ID | Status |
|---|---|---|
| `priest` | `59c665b2-8bf0-4937-873e-eadea392643d` | ✅ done (idle, walk, ability_neutral, cast) |
| `warrior` | `f7dd4422-52ad-47aa-b2fe-3f23452c3170` | ✅ done |
| `paladin` | `d631692d-4b5f-43a7-973d-8868d7d9c590` | ✅ done |
| `druid` | `407467d9-5767-4fe5-ba61-e8a57e2d9b6b` | ✅ done |
| `hunter` | `0a18a9d1-6ead-4eeb-b8ca-8fa2ea0f6dd0` | ✅ done |
| `mage` | `a6258f38-f4d3-4299-872e-20c3b47060b8` | ✅ done |
| `warlock` | `5f01a06f-ea17-40a6-8438-85a3c5062cce` | ✅ done |
| `deathknight` | `7de980a5-af87-4144-82fe-3e6a8753a105` | ✅ done |
| `rogue` | `c8bdf5d0-f824-4444-aa25-8de0a276c3f0` | pending |
| `shaman` | `b3e0d661-03e0-49d9-8604-a1ff4e1ca55e` | ✅ done |

> Ignore: `player_priest` (3bab55e7), T6 variants, and other unnamed alternates.

---

## Directory Structure

```
public/assets/sprites/{class}/
├── {dir}.png               ← static rotation sprite (8 files)
├── idle/
│   └── {dir}/
│       ├── 0.png … 3.png   ← 4 frames, 0-indexed
├── walk/
│   └── {dir}/
│       ├── 0.png … 5.png   ← 6 frames, 0-indexed
├── ability_neutral/        ← one-shot burst for instant abilities (priest only so far)
│   └── {dir}/
│       ├── 0.png … 3.png   ← 4 frames, 0-indexed
└── cast/                   ← looping channel animation (priest only so far)
    └── {dir}/
        ├── 0.png … 5.png   ← 6 frames, 0-indexed
```

Directions: `south`, `south-east`, `east`, `north-east`, `north`, `north-west`, `west`, `south-west`

---

## Step-by-Step Process

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

const DIRECTIONAL_ANIMATIONS = {
  priest: { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
  <class>: { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
}
```

---

## Checklist (per character)

- [ ] `get_character` — confirm 16 animations (8 idle + 8 walk), all complete
- [ ] `curl` download
- [ ] Identify `IDLE_FOLDER` and `WALK_FOLDER` from ZIP listing
- [ ] Run extraction script
- [ ] Verify: idle=4, walk=6 per direction × 8 dirs
- [ ] Update `DIRECTIONAL_CLASSES` and `DIRECTIONAL_ANIMATIONS` in `HostGame.js`
- [ ] Update status in this file's registry table
