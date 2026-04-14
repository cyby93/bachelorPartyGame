---
stepsCompleted: [1, 2, 3-partial]
session_topic: 'Development roadmap to bring the bachelor party game to playable state by June 6'
session_goals: 'Prioritize and sequence remaining work across 5 pillars: animations/VFX, level balancing, upgrade balancing, audio, UI — with hard June 6 deadline'
selected_approach: 'ai-recommended'
techniques_used: ['Constraint Mapping (complete)', 'Morphological Analysis (complete)', 'Reverse Brainstorming (complete)']
ideas_generated: []
context_file: ''
current_phase: 'SESSION COMPLETE — all 3 phases done. Roadmap ready to execute.'
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

## Phase 2: Morphological Analysis (COMPLETE)

### Cross-Cutting Infrastructure

| # | Subtask | Notes |
|---|---------|-------|
| DEV-1 | Bot/dummy player mode | Unlocks ALL level and balance testing — highest priority task in the project |

### Level 6 Dimension

| # | Subtask | Blocked by |
|---|---------|-----------|
| BAL-1 | Fix Level 6 mechanics (audit → implement) | — |
| BAL-2 | Fix Level 6 visuals (audit → replace) | — |

### Balance Dimension (all levels)

| # | Subtask | Blocked by |
|---|---------|-----------|
| BAL-3 | Balance all 6 levels (numbers, enemy scaling) | DEV-1 + BAL-1 |
| BAL-4 | Balance upgrade curve across levels | BAL-3 + UPG-2 |

### Upgrade Dimension

| # | Subtask | Type | Blocked by |
|---|---------|------|-----------|
| UPG-1 | Design attribute upgrades (what stats, what values) | Design | — |
| UPG-2 | Implement attribute upgrade system | Dev | UPG-1 |
| UPG-3 | Balance all upgrade numbers (ability + attribute) | Tuning | DEV-1 + BAL-3 + UPG-2 |

_Note: 5 inter-level quiz moments = 5 upgrade opportunities max. Attribute upgrades expand the upgrade system beyond ability-only._

### Quiz Dimension

| # | Subtask | Type | Blocked by |
|---|---------|------|-----------|
| QUIZ-1 | Design expanded quiz trigger points (mid-level triggers) | Design | — |
| QUIZ-2 | Implement additional quiz trigger logic | Dev | QUIZ-1 |
| QUIZ-3 | Write 60–70 quiz questions (10/week, background task) | Content | — |

### Audio Dimension

| # | Subtask | Type | Blocked by |
|---|---------|------|-----------|
| AUD-1 | Source/generate 6 background music tracks (1 per level) | Asset | — |
| AUD-2 | Generate key SFX (hits, abilities, death, UI) | Asset | — |
| AUD-3 | Download Akama/Illidan dialog lines from Wowhead | Asset | — |
| AUD-4 | Integrate all audio into game | Dev | AUD-1+2+3 |

_Note: Dialog audio already exists (original WoW voice lines via Wowhead). AUD-3 is download + format only._

### UI Dimension

| # | Subtask | Type | Blocked by |
|---|---------|------|-----------|
| UI-1 | Decide: overlay vs. outside layout for HUD elements | Design | — |
| UI-2 | Retheme host UI (game area frame, objective, player list, meters) | Dev/Art | UI-1 |
| UI-3 | Retheme controller UI | Dev/Art | UI-1 |
| UI-4 | Level transition effects (fade in/out) | Dev | — |

### VFX Dimension

| # | Subtask | Type | Blocked by |
|---|---------|------|-----------|
| VFX-1 | Audit all placeholder sprites (full replacement list) | Design | — |
| VFX-2 | Generate/acquire replacement effect sprites (PixelLab) | Asset | VFX-1 |
| VFX-3 | Integrate new sprites into game | Dev | VFX-2 |

_Note: Code already refactored to use sprites — pure asset replacement pipeline, no structural dev work._

---

### Full Dependency Map

```
DEV-1 (bot mode)
  └─→ BAL-1 (L6 mechanics fix)
        └─→ BAL-3 (balance all 6 levels)
              ├─→ BAL-4 (upgrade curve balance)
              └─→ UPG-3 (upgrade numbers)
                    ↑
UPG-1 → UPG-2 ────┘

BAL-2 (L6 visuals fix)     ← parallel to BAL-1

QUIZ-1 → QUIZ-2
QUIZ-3                     ← independent content, 10 questions/week

AUD-1 ┐
AUD-2 ├─→ AUD-4
AUD-3 ┘

UI-1 → UI-2 + UI-3
UI-4                       ← independent

VFX-1 → VFX-2 → VFX-3
```

**Critical path: DEV-1 → BAL-1 → BAL-3 → UPG-3**

---

### Week-by-Week Roadmap

| Week | Dates | Primary Tasks | Parallel Tasks |
|------|-------|--------------|----------------|
| 1 | Apr 14–20 | DEV-1 (bot mode) | UI-1 (layout decision), QUIZ-1 (quiz design), QUIZ-3 start (10 questions) |
| 2 | Apr 21–27 | BAL-1 (L6 mechanics fix) | BAL-2 (L6 visuals), UPG-1 (attribute design), VFX-1 (sprite audit), QUIZ-3 (10 questions) |
| 3 | Apr 28–May 4 | BAL-3 (balance levels 1–5) | UPG-2 (implement attributes), QUIZ-2 (quiz triggers), UI-2+3 begin, QUIZ-3 (10 questions) |
| 4 | May 5–11 | BAL-3 continued + BAL-4 + UPG-3 | AUD-1+2+3 (source all audio assets), VFX-2 (generate sprites), QUIZ-3 (10 questions) |
| 5 | May 12–18 | AUD-4 (integrate audio) | VFX-3 (integrate sprites), UI-2+3 finish, UI-4 (transitions), QUIZ-3 (10 questions) |
| 6 | May 19–25 | Full playtest (3–4 players/bots) | Bug fix pass, balance tweaks, QUIZ-3 final (10 questions) |
| 7 | May 26–Jun 1 | Overflow buffer | Final playtest |
| 8 | Jun 2–6 | **FREEZE** — critical bugs only | Event setup/logistics |

---

## Phase 3: Reverse Brainstorming (COMPLETE)

**Question asked:** "How could we guarantee RAID NIGHT is NOT ready by June 6?"

### Failure Modes Evaluated

| # | Risk | Reality Check | Mitigation |
|---|------|--------------|------------|
| 1 | DEV-1 takes 2 weeks | Possible but manageable | Timebox to 1 week; scope to minimum viable (bots that just exist, no AI) |
| 2 | Level 6 has structural design problem | Unlikely — mechanics exist, needs fixing not rethinking | Early smoke test in Week 1 as pre-check |
| 3 | QUIZ-3 written in week 7 panic | Real risk — easy to defer | 10 questions/week baked into roadmap from Week 1 |
| 4 | UI retheme scope creep | Manageable | Hard design lock at UI-1 before any implementation begins |
| 5 | PixelLab throughput blocks VFX | Possible | Start VFX-1 audit early; generate in batches across weeks 2–4 |
| 6 | **Balance tuning becomes addictive** | **Most real risk** | **Define "good enough" criteria before tuning starts — not after** |

### Key Mitigation Added to Roadmap

**Balance "good enough" definition (set before BAL-3 begins):**
> Players can clear each level in 2–3 attempts with decent coordination. Level 6 is beatable but punishing. Once this bar is met, numbers are frozen.

### Overall Assessment

The roadmap is sound. No catastrophic hidden risks. The developer has good self-awareness about the balance rabbit hole — naming it in advance is the primary defense against it.

---

## Session Complete

**All 3 phases finished.** The roadmap is stress-tested and ready to execute.

**The single most important thing to do next: build DEV-1 (bot player mode). Everything flows from there.**
