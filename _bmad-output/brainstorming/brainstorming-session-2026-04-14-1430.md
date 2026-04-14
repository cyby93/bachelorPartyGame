---
stepsCompleted: [1, 2, 3-partial]
session_topic: 'Development roadmap to bring the bachelor party game to playable state by June 6'
session_goals: 'Prioritize and sequence remaining work across 5 pillars: animations/VFX, level balancing, upgrade balancing, audio, UI — with hard June 6 deadline'
selected_approach: 'ai-recommended'
techniques_used: ['Constraint Mapping (complete)', 'Morphological Analysis (pending)', 'Reverse Brainstorming (pending)']
ideas_generated: []
context_file: ''
current_phase: 'Phase 1 complete — Constraint Mapping done, ready for Phase 2: Morphological Analysis'
---

## Session Overview

**Topic:** Development roadmap — bachelor party game → playable by June 6, 2026
**Goals:** Sequence and prioritize the 5 remaining work pillars so the game is fully playable at the bachelor party event

### Session Setup

- **Hard deadline:** June 6, 2026 (the actual bachelor party event)
- **Available time:** 2–3 hours/day → ~105–157 hours total over 7.5 weeks
- **Team:** Solo developer (Cyby)

---

## Technique Selection

**Approach:** AI-Recommended Techniques

**Recommended Techniques:**
- **Phase 1 — Constraint Mapping:** Surface all real constraints before sequencing anything
- **Phase 2 — Morphological Analysis:** Break each pillar into subtasks, map dependencies, shape the sequence
- **Phase 3 — Reverse Brainstorming:** Stress-test the plan by asking "how could we guarantee we miss June 6?"

---

## Phase 1: Constraint Mapping (COMPLETE)

### The 5 Pillars — Initial Priority Assessment

| Pillar | User Rating | Actual Assessment |
|--------|------------|-------------------|
| Animations & VFX | Nice-to-have | Basic effects already exist — upgrades are additive, low risk |
| Level & enemy balancing | Important | Design problem, not just tuning — curve is undefined |
| Ability upgrade balancing | Important | Mechanically complete — just needs number tuning |
| Audio integration | Nice-to-have | **Revised: has a hard floor** — silence is unacceptable for a party setting; ambient audio minimum |
| UI/Interface design | Important | Full retheme needed — large effort but no unknowns |

### Current State per Pillar

- **Animations:** Basic placeholder shapes/instant effects exist for all abilities. Not zero — just rough.
- **Audio:** Completely silent right now.
- **UI:** Fully functional prototype — texts and numbers visible but no visual theme.
- **Level balancing:** 6 levels fixed. No difficulty curve designed yet.
- **Upgrade balancing:** System mechanically complete, just needs tuning.
- **Level 6:** **UNTESTED.** Most complex level — 3 phases, many mechanics. Unknown bugs and design gaps.

### Constraint Map

| # | Constraint | Type | Risk |
|---|-----------|------|------|
| 1 | 105–157 hrs over 7.5 weeks, hard June 6 | Time | Fixed |
| 2 | Ambient audio is a hard floor (silence = dead at a party) | Scope floor | Low |
| 3 | Level difficulty curve + upgrade balance are tightly coupled | Dependency | Medium |
| 4 | Level difficulty curve is a design unknown (not started) | Unknown | Medium |
| 5 | Level 6 is untested, most complex, 3-phase | **Unknown** | **HIGH** |
| 6 | UI retheme is large but fully defined — no surprises | Effort | Medium |
| 7 | PixelLab caps animation + UI asset throughput | Pipeline | Medium |
| 8 | Animations have a working base — upgrades are additive | Baseline | Low |

### Key Structural Insight

**Level 6 is the critical path.** It is untested, most complex, and directly coupled to upgrade balancing. The difficulty curve, upgrade gates, and "last level requires enough upgrades" mechanic cannot be finalized until Level 6 is working and fun. If Level 6 has serious issues, it eats time from everything else.

---

## Phase 2: Morphological Analysis (PENDING)

_To be completed in next session._

**Planned approach:** Break each of the 5 pillars into concrete subtasks, map what blocks what, estimate effort per task, and produce a sequenced week-by-week roadmap.

---

## Phase 3: Reverse Brainstorming (PENDING)

_To be completed after Phase 2._

**Planned approach:** Ask "How could we guarantee the game is NOT ready by June 6?" to surface hidden risks and adjust the roadmap accordingly.
