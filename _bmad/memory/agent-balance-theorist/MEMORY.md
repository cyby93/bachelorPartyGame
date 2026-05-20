# Memory

_Curated long-term knowledge. Distilled from sessions._

---

## Settled Design Decisions

### Illidan Fight Duration
**Constant = 2116 encodes 8 minutes.** Formula: `fight_time = (constant × 2.2) / 9.7`. R and RLEF cancel — they never affect duration, only difficulty pressure. Do NOT re-derive this; it's settled.

### RLEF Semantics
RLEF is a difficulty-pressure dial, not a fight duration knob. Higher RLEF = more HP AND more effective DPS, they cancel. It controls how threatening content feels for a given player skill level. Easy=0.3, Normal=0.5, Hard=0.7.

### Roguelike Upgrade Intent
Illidan is tuned for BASE DPS (no upgrades) = 8 min. Upgrade budget = 6 upgrades per player. Skill damage does NOT scale with R — flat values, intentional. With 6 upgrades:
- Spread (2+2+1+1): avg ×1.42 → ~5.6 min fight
- Focus (3+3+0+0 on top-2 damage skills): avg ×1.70 → ~4.7 min fight
- Enrage at 12 min. No upgrades = comfortable buffer; focus upgrades = fast clear.

These multipliers are calibrated and verified by `tools/dps-calculator-upgraded.js` (2026-04-21).

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

## Class Balance Snapshot (R=10, 2026-05-20 — post SkillDatabase patch)

**Single-target DPS (base, no upgrades):**

| Class | Role | DPS | Note |
|-------|------|-----|------|
| Hunter | ranged | 29.3 | Call of the Wild (8.0) + Shoot Bow (7.5) + Aimed Shot (7.5) + Explosive Trap (6.3) — SkillDatabase patched |
| Rogue | ranged | 24.4 | Vanish fix: Ambush gets ×1.5 bonus per 7s CD cycle |
| Mage | ranged | 22.8 | Pyroblast splash now scales by TARGET_COUNT in multi-target mode |
| Warlock | ranged | 18.7 | |
| Paladin | melee | 18.7 | |
| Warrior | melee | 18.0 | |
| DeathKnight | melee | 15.6 | |
| Shaman | healer | 11.8 | combat DPS only |
| Druid | healer | 8.7 | combat DPS only |
| Priest | healer | 8.0 | combat DPS only |

**Single-target HPS:** Priest 20.8, Shaman 17.3, Druid 17.1 — Priest leads single-target; Shaman leads multi-target.
**3-target HPS:** Shaman 52.0, Druid 46.8, Priest 32.8 — Shaman dominant raid healer by design.

**Upgrade projection (Illidan, 6 upgrades):**
- Spread 2+2+1+1: ×1.37 avg → ~5.9 min (⚠SPREAD on Mage still active — real spread higher once Fireball T2 tuned)
- Focus 3+3: ×1.67 avg → ~4.8 min

**⚠ Balance note:** Hunter was top-DPS class (previously 32.5). After SkillDatabase patch it dropped to 29.3; gap vs Rogue (24.4) is now 20%. Still cooperative-raid acceptable.

**Multi-target note (Pyroblast):** At N=3, Mage climbs to 30.8 DPS (Pyroblast splash hits all targets: 72 direct + 30×N). Warlock also scales strongly via DoT (34.0 at N=3).

---

## Open Questions / Known Sim Bugs

- **✅ FIXED: Vanish stealth multiplier** (2026-05-20). Both DPS calculators now fire Vanish in a utility pre-pass. When stealthMult > 1.0, instants sort by raw damage (not priority) so Ambush gets the ×1.5 bonus, not Sinister Strike. Engine confirmed: one hit per Vanish gets the bonus (shadowStrikeUsed flag). Rogue base DPS: 24.0 → 29.1.
- **BY DESIGN: Mage Spread ⚠SPREAD flag** (2026-05-20). Fireball T2 `castTime: -80` flips priority above Pyroblast T2 → Pyroblast never fires → DPS < base. Cyby chose to keep the delta as a tuning signal, not a bug. `⚠SPREAD` flag now appears in upgraded calc output. Fix by adjusting Fireball T2 deltas until flag clears.
- **🟡 CONCERN: Bladestorm opportunity cost** (2026-05-20). SkillDatabase comment says "blocks other skills" 4000ms but `getCastTime=0`. Sim treats as free instant. If engine locks player, Warrior DPS overstated. Verify engine behavior.
- **✅ FIXED: Hunter S2 (Call of the Wild) WILD_BEAST modelling** (2026-05-20). Both calculators now average beast damage across all 3 variants. `getInstantDamage` formula: `avg(floor(duration/v.attackRate) * (v.damage + damageBonus))`. No TARGET_COUNT scaling (beasts are single-target attackers). Hunter base DPS: 21.3 → 32.5.
- **Paladin outlier (×2.7 DPS):** Not addressed. Deferred by Cyby.
- **Tranquility (Druid) multi-target:** ✅ Fixed 2026-05-20.
- **L5 Phase 1 warlock defenders:** Requires engine support for dual-phase spawning per level. Deferred.
- **'random2' edge:** Implemented but untested.
- **All balance is theoretical.** First playtest will be the real calibration point.
