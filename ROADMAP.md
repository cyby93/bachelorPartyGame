# RAID NIGHT — Roadmap to June 6

**Deadline:** June 6, 2026 (bachelor party event)
**Updated:** 2026-05-06

---

## Status Overview

| Pillar | Status |
|--------|--------|
| Bot/dummy player mode | ✅ Done |
| UI retheme | ✅ Done |
| Upgrade system (design + impl + balance) | ✅ Done |
| Audio framework | ✅ Done |
| Ability SFX | 🟡 80% done |
| Level 6 mechanics (BAL-1) | 🟡 Mostly done — playtest tweaks |
| Level 1–5 balance (BAL-3) | 🟡 Mostly done — playtest tweaks |
| Level 6 visuals (BAL-2) | 🔴 In progress |
| Background music (6 tracks) | 🔴 Not started |
| Akama/Illidan dialog lines | 🔴 Not started |
| VFX (shapes → sprites + missing 15%) | 🔴 In progress |
| Scene transitions | 🔴 Not started |
| Player spawn positions (per level) | 🔴 Not started |
| Quiz questions | 🟡 ~30 / 60–70 target |
| Cinematic sequences (3 scenes) | 🔴 Not started |

---

## Week-by-Week Plan

| Week | Dates | Primary | Parallel |
|------|-------|---------|----------|
| **4** | May 6–11 | BAL-2 (L6 visuals), spawn positions | AUD-3 dialog download, AUD-2 last 20% SFX, quiz +10 |
| **5** | May 12–18 | AUD-1 — 6 music tracks ← first priority | Scene transitions, VFX sprites push, quiz +10 |
| **6** | May 19–25 | Full playtest → BAL-1/3 tweaks | VFX remaining, quiz +10 (~60 total) |
| **7** | May 26–Jun 1 | Cinematic runner + 3 scenes | Second playtest, final polish |
| **8** | Jun 2–6 | **FREEZE** — critical bugs only | — |

---

## Cinematics (Week 7)

Three hardcoded scenes using a thin `{ delay, action }` sequence runner:

- **Level 5 opening** — intro before the Illidan fight
- **Level 6 opening** — setup cinematic
- **Level 6 ending** — victory/banishment scene

---

## Balance Freeze Rule

> Players can clear each level in 2–3 attempts with decent coordination.
> Level 6 is beatable but punishing.
>
> **Once this bar is met after the Week 6 playtest → numbers are frozen.**

---

## Dependency Chain (critical path)

```
BAL-2 (L6 visuals)
  └─→ Playtest (Week 6)
        └─→ BAL-1/3 final tweaks
              └─→ FREEZE

AUD-1 (music) ┐
AUD-3 (dialog)├─→ already integrated (AUD-4 done)
AUD-2 (SFX)   ┘

Spawn positions → Cinematic scenes (Week 7 needs correct positions)
```
