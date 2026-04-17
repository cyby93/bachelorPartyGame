# Memory

_Curated long-term knowledge. Distilled from sessions._

---

## Settled Design Decisions

### Illidan Fight Duration
**Constant = 2116 encodes 8 minutes.** Formula: `fight_time = (constant × 2.2) / 9.7`. R and RLEF cancel — they never affect duration, only difficulty pressure. Do NOT re-derive this; it's settled.

### RLEF Semantics
RLEF is a difficulty-pressure dial, not a fight duration knob. Higher RLEF = more HP AND more effective DPS, they cancel. It controls how threatening content feels for a given player skill level. Easy=0.3, Normal=0.5, Hard=0.7.

### Roguelike Upgrade Intent
Illidan is tuned for BASE DPS (no upgrades) = 8 min. Well-upgraded players (~1.5× DPS) clear in ~5.3 min. Unupgraded players risk hitting enrage at 12 min. Upgrades are the difference between clean kill and wipe — intentional design.

### Shadow Demon Phase 3 Mechanic
Slow crawl (speed 0.6), tanky (hp 10×XR = 500 at defaults), instant kill on contact. Count: 2, cooldown: 12000. Mechanic: party must stop and focus it before it reaches its target. NOT a fast-moving threat.

### Spawn Scaling Architecture
- `spawnMult` = frequency only (scales interval)
- `countMult` = batch size only (scales countPerWave / countPerSpawn / maxAliveAtOnce)
- Both scale perPlayer: 0.05–0.10 depending on level. At 13p: spawnMult ×2.2, countMult ×1.6.
- Wave mode previously used spawnMult for count — moved to countMult in 2026-04-16 session.

---

## Balance State by Level (as of 2026-04-16, config-only — no playtest)

| Level | Config status | Fight target | Notes |
|-------|--------------|-------------|-------|
| L1 The Courtyard | ✅ Done | ~3 min | 8 waves, random2 edge, no ritualChanneler |
| L2 The Siege | ✅ Done | ~4 min | Edge reinforcements added |
| L3 Black Temple Gates | ✅ Done | ~3 min | ritualChanneler mechanic intact |
| L4 Serpentshrine (Leviathan) | ✅ Done | ~3.3 min | HP doubled to 12×XR, naga ambient spawns |
| L5 The Refectory (Shade) | ✅ Done | ~2.5 min | HP now R-based, no Phase 1 defenders yet |
| L6 Illidan's Sanctum | ✅ Done | ~8 min | All 3 phases configured, constant 2116 |

---

## Calculator Architecture (as of 2026-04-17)

Both calculators use a tick-based greedy simulation (50ms ticks, 5-min fight).

**Action loop — two phases per tick:**
1. Phase 1: fire all available instant-cast (0 cast time) abilities — they don't block the player
2. Phase 2: select best cast-time ability by priority score and begin casting

**Multi-target mode:** `--targets=N` flag on both calculators. Scales DoTs, AOE, SPAWN/TOTEM, HoTs, and Chain Heal chains by N. Single-target abilities unchanged.

## Class Balance Snapshot (R=10, fixed calculators, 2026-04-17)

All classes are ~1.5–2.7× their role targets. RLEF=0.5 offsets this by design.

**Single-target DPS:**

| Class | Role | DPS | vs target |
|-------|------|-----|-----------|
| Mage | ranged | 25.2 | ×2.5 |
| Hunter | ranged | 20.2 | ×2.0 |
| Rogue | ranged | 19.5 | ×1.9 |
| Paladin | melee | 19.2 | **×2.7** ← outlier |
| Warlock | ranged | 16.7 | ×1.7 |
| DeathKnight | melee | 14.7 | ×2.1 |
| Warrior | melee | 13.0 | ×1.9 |
| Shaman | healer | 9.6 | ×3.2 |
| Druid | healer | 7.3 | ×2.4 |
| Priest | healer | 5.0 | ×1.7 |

**Single-target HPS:** Priest 11.3, Shaman 10.0, Druid 9.7 — tightly balanced.
**3-target HPS:** Shaman 30.0, Priest 17.3, Druid 16.7 — Shaman is the raid healer by design (Chain Heal hits all 3 chains).

---

## Open Questions

- **Paladin outlier (×2.7 DPS + 3.4 off-role HPS):** Not addressed. Explicitly deferred by Cyby — fine-tuning pass later.
- **Hunter pet multi-target:** Does Call of the Wild split attacks across targets or focus one? If focus-one, 3-target DPS is inflated — 36.5 may be misleading.
- **Tranquility (Druid) multi-target:** Currently doesn't scale in HPS multi-target mode — CHANNEL heals excluded. Would need an AOE flag in SkillDatabase to get the multiplier.
- **L5 Phase 1 warlock defenders:** Requires engine support for dual-phase spawning per level. Deferred.
- **Draw Soul cooldown = 8000:** Set by Cyby. Verify it feels right in practice.
- **'random2' edge:** Implemented but untested. Confirm it creates the intended "grouped horde from 2 sides" feeling.
- **All balance is theoretical.** First playtest will be the real calibration point. Expect to retune R and individual ability values afterward.
