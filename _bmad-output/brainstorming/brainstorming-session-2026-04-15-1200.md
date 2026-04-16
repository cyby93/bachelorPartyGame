---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Mathematical balance framework for Illidan boss fight'
session_goals: 'Define a derivation cascade: required stats → base stats → Illidan numbers → every other enemy numbers. Build math-first balance so that fully-upgraded players can defeat Illidan while unupgraded players cannot.'
selected_approach: 'progressive-flow'
techniques_used: ['First Principles Thinking', 'Morphological Analysis', 'Solution Matrix', 'Constraint Mapping']
ideas_generated: [10 axioms, full cascade formula, enemy stat table, RLEF difficulty system, enrage mechanic, constraint stress-test]
session_continued: true
continuation_date: '2026-04-16'
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Cyby
**Date:** 2026-04-15

## Session Overview

**Topic:** Mathematical balance framework for Illidan boss fight
**Goals:** Define a derivation cascade: required stats → base stats → Illidan numbers → every other enemy numbers. Build math-first balance so that fully-upgraded players can defeat Illidan while unupgraded players cannot.

### The Cascade

```
required stat numbers
        ↓
  base stat numbers   (fully-upgraded players that meet requirements)
        ↓
illidan fight numbers  (HP/damage tuned to those base stats)
        ↓
every other enemy numbers  (earlier levels scaled down from Illidan)
```

## Technique Selection

**Approach:** Progressive Technique Flow

- **Phase 1 - Expansive Exploration:** First Principles Thinking
- **Phase 2 - Pattern Recognition:** Morphological Analysis
- **Phase 3 - Idea Development:** Solution Matrix ← NEXT
- **Phase 4 - Action Planning:** Constraint Mapping

---

## Phase 1 Results — First Principles Thinking

### 10 Axioms Established

**[Axiom #1]: The Fun Contract**
_Concept_: This is not a skill game. It's a knowledge-and-cooperation game dressed as a boss fight. The "skill" is answering trivia correctly. Illidan's numbers should punish ignorance, not reflexes.
_Novelty_: The balance target isn't "average player APM" — it's "average correct answer rate."

**[Axiom #2]: The Revive Loop is a Feature, Not a Failure State**
_Concept_: Players dying and being revived frequently is desired. The game should be tuned to guarantee frequent deaths. Drama, cooperation, and social moments are the reward.
_Novelty_: Most boss fights minimize deaths. Here, minimum deaths = boring party.

**[Axiom #3]: The Group Milestone Engine**
_Concept_: Every threshold of correct answers (group total vs PlayerCount × N) triggers a global stat upgrade for all players. 10 questions = 1 power tier.
_Novelty_: Upgrades feel earned collectively. Even bad players get buffed when smart players carry the trivia.

**[Axiom #4]: Death is the Heartbeat**
_Concept_: Illidan must have abilities that reliably one or two-shot players on a regular cadence — not as punishment but as the designed rhythm of the encounter.
_Design_: Main abilities two-shot (survivable but tense). Spike abilities one-shot (Shadow Demons, DoT stacks) = emergency revive moments.

**[Axiom #5]: Percent Scaling is Acceptable**
_Concept_: Numbers don't need to be perfectly round. Percentage-based scaling is fine. Mathematical consistency > legibility.

**[Axiom #6]: Dual-Track Trivia — REVISED TO SINGLE TRACK**
_Concept_: Questions are bachelor party themed only (personal trivia about the groom). WoW lore questions removed. 1 question per level transition.
_Novelty_: Personal questions — everyone learns something embarrassing about the groom.

**[Axiom #7]: Class Roles Drive HP Tiers**
_Concept_: HP tiers follow combat role. Healers (Priest, Druid) are fragile — they survive through utility not HP. Tanks anchor the high HP tier.

**[Axiom #8]: Question Cadence is Fixed**
_Concept_: Exactly 1 bachelor party question per level transition = 5 questions per run.
_Roguelike loop_: Players replay levels, gradually learning answers. Run 1 = learn questions. Run 2-3 = answer correctly and earn power.

**[Axiom #9]: Roguelike Question Loop**
_Concept_: The game teaches trivia through failure. Upgrade ceiling is reached by knowing the answers, not by playing well. Failure is the learning mechanism.

**[Axiom #10]: The Four Tiers of Power**
_Concept_: Tiers 1-3 = pure stat buffs (HP + speed). Tier 4 = stat buff + one individual skill upgrade per player (earned mastery tier).
_Novelty_: Skill upgrades are locked behind trivia mastery. You must know things to get them.

---

### Established Numbers

**Class HP Groups:**
```
Squishy (80 HP):  Mage, Warlock, Priest
Average (100 HP): Hunter, Shaman, Druid, Rogue
Tank (120 HP):    Warrior, Paladin, Death Knight
```

**Milestone Threshold Formula:**
```
Tier 1:  PlayerCount × 2 correct answers  (e.g. 13p → 26 correct)
Tier 2:  PlayerCount × 3 correct answers  (e.g. 13p → 39 correct)
Tier 3:  PlayerCount × 4 correct answers  (e.g. 13p → 52 correct)
Tier 4:  PlayerCount × 5 correct answers  (e.g. 13p → 65 correct = perfect run)

With 13 players × 5 questions = 65 max correct per run:
  ~40% correct → Tier 1
  ~60% correct → Tier 2
  ~80% correct → Tier 3  ← target "beatable" threshold
  100% correct → Tier 4  ← reward for full learning
```

**HP Ladder:**
```
             T0    T1    T2    T3    T4
Squishy:     80   100   120   140   160
Average:    100   120   140   160   180
Tank:       120   140   160   180   200

(+20 HP flat per tier)
```

**Speed:** +5% per tier from Tier 2 onward.

**Illidan Damage Target:** ~100 per main ability hit
```
T0: one-shots squishy/average, two-shots tank → pure chaos
T1: one-shots squishy, two-shots others
T2: two-shots everyone  ← first survivable tier
T3: two-shots comfortably, spike abilities still one-shot ← beatable
T4: two-shots + skill power → heroic feel
```

---

## Phase 2 Results — Morphological Analysis

### Parameter Map

```
AXIS 1 — PLAYER COUNT
  Options: 1 | 4 | 8 | 13
  Type: INDEPENDENT

AXIS 2 — CORRECT ANSWER RATE (group %)
  Options: 0% | 40% | 60% | 80% | 100%
  Type: INDEPENDENT

AXIS 3 — TIER REACHED
  Options: 0 | 1 | 2 | 3 | 4
  Type: DERIVED from Axis 1 × Axis 2

AXIS 4 — CLASS ROLE
  Options: Squishy (80) | Average (100) | Tank (120)
  Type: INDEPENDENT

AXIS 5 — PLAYER HP AT FIGHT
  Options: 80→160 | 100→180 | 120→200
  Type: DERIVED from Axis 3 × Axis 4

AXIS 6 — PLAYER SPEED AT FIGHT
  Options: base | base+5% | base+10% | base+15% | base+20%
  Type: DERIVED from Axis 3

AXIS 7 — INDIVIDUAL SKILL POWER
  Options: base only | base + 1 upgrade (Tier 4 only)
  Type: DERIVED from Axis 3

AXIS 8 — TARGET FIGHT DURATION
  Options: 1 min | 3 min | 5 min | 8 min | 10 min
  Type: INDEPENDENT ← OPEN DECISION #1

AXIS 9 — GROUP EFFECTIVE DPS
  Type: DERIVED from Axis 1 × Axis 3 × Axis 4

AXIS 10 — ILLIDAN HP
  Type: DERIVED from Axis 8 × Axis 9

AXIS 11 — ILLIDAN DAMAGE PER HIT
  Type: DERIVED from Axis 5 (one/two-shot design) ← ~100, confirmed

AXIS 12 — ILLIDAN PLAYER COUNT SCALING
  Options: flat | linear (+6%/player, current) | diminishing returns
  Type: INDEPENDENT ← OPEN DECISION #2

AXIS 13 — EARLIER ENEMY NUMBERS
  Type: DERIVED from Axis 10 + Axis 11 (scaled down)
```

### Dependency Graph

```
[Player Count] ──────────────────────────────┐
[Correct Answer %] → [Tier] → [Player HP]   ─┼→ [Group DPS] → [Illidan HP]
                           → [Player Speed]  ─┘
                           → [Skill Power]

[Player HP] ──────────────────────→ [Illidan Damage per Hit]
[Target Fight Duration] ──────────→ [Illidan HP]

[Illidan HP]     ─────────────────→ [Enemy HP, earlier levels]
[Illidan Damage] ─────────────────→ [Enemy Damage, earlier levels]
```

---

---

## Phase 3 Results — Solution Matrix

### Design Decisions Made

- **Fight duration at T3:** ~8 minutes (480 seconds)
- **Player count HP scaling:** linear, upgraded to **+10%/player** (see Phase 4)
- **DPS anchor:** `RANGED_BASE_DPS = R` (constant, tune in code)
- **Enemy DPS groups:** Ranged (Mage, Warlock, Hunter, Rogue) = 1.0×R | Melee (Warrior, Paladin, DK) = 0.7×R | Healer (Priest, Druid, Shaman) = 0.3×R
- **Group composition for 13 players:** 6 ranged, 4 melee, 3 healers
- **Group theoretical DPS:** 9.7×R
- **RLEF (Real-Life Efficiency Factor):** difficulty dial — Easy: 0.3 / Normal: 0.5 / Hard: 0.7

### RLEF as Difficulty System

RLEF represents the gap between theoretical optimal DPS and real party-game play (deaths, sub-optimal rotation, distractions). Higher RLEF = assumes more competent players = more Illidan HP = harder fight.

Contributing factors to real-life efficiency loss:
- Death + revival downtime: ~20–30%
- Sub-optimal ability usage: ~15–25%
- Party atmosphere: ~10–20%
- Movement/dodging penalties: ~5–10%

### Enemy Role Multipliers

```
grunt:  hp = X×R,     damage = Y×R,     speed = 1.2  (standard reference unit)
brute:  hp = 2.4×X×R, damage = 2.5×Y×R, speed = 0.9  (tanky variant)
```

### Enemy Level Scaling (60% → 100%)

```
Level 1: 60% of L5 reference stats
Level 2: 70%
Level 3: 80%
Level 4: 90%
Level 5 pre-boss: 100% = X×R HP, Y×R damage

Formula: L(n) stats = (0.5 + n×0.1) × base  [n = 1..5]
```

Tighter range by design — enemies feel recognizably the same threat across levels. Difficulty increases via enemy count (configurable per level) and objectives, not stat cliff.

### Level Duration Design

- Levels 1–4: ~4–5 min target (completion = **objective-driven**, not enemy wipe)
- Level 5 (Illidan): ~8 min (completion = kill the boss)

---

## Phase 4 Results — Constraint Mapping

### Full Cascade Formula

```
RANGED_BASE_DPS      = R                         ← tune in code
ENEMY_HP_MULT        = X  (suggested: 5)
ENEMY_DAMAGE_MULT    = Y  (suggested: 4)
RLEF                 = { easy: 0.3, normal: 0.5, hard: 0.7 }
PLAYER_SCALE         = +10% HP per player above 1

Illidan HP (N, T3)   = 1,058 × R × RLEF × (1 + (N-1) × 0.10)
Illidan damage       = ~100 per hit  (fixed, independent of R)
Illidan enrage       = 12 min → 2× attack speed, 2× cast speed

L5 enemy HP          = X × R
L5 enemy damage      = Y × R  (per hit)
L(n) enemy stats     = (0.5 + n×0.1) × base  [n = 1..5]

Enemy count scaling  → via LevelConfig (separate, configurable per level)
```

### Illidan Fight Durations by Player Count (Normal difficulty)

| Players | Illidan HP | Fight duration |
|---|---|---|
| 13 | 2,328R | ~8 min (design anchor) |
| 10 | 1,904R | ~9.3 min |
| 8  | 1,799R | ~10 min |
| 5  | 1,481R | ~13 min |

### Enrage Mechanic

Triggers at 12 min. Illidan gains:
- `enrageAttackSpeedMult: 2.0` — all attack cooldowns halved
- `enrageCastSpeedMult: 2.0` — Phase 3 cast times halved

Phase 3 cast speed is the primary threat — abilities fire twice as fast, half the reaction window. Forces fight resolution.

### Constraint Stress-Test Results

| Constraint | Status | Resolution |
|---|---|---|
| R sensitivity | ✅ Robust | Duration stable at any R — everything scales proportionally |
| RLEF drift | ✅ Solved | Enrage timer at 12 min caps runaway fights |
| Low player count | ✅ Solved | +10%/player keeps 8–10p fights in 9–10 min window |
| Objective rushing | ✅ Already solved | Blocking enemy AI types (repairer, channeler) in every level |

---

## Session Summary

**Breakthrough concepts from this session:**

1. **RLEF as difficulty dial** — single knob that controls fight feel for Easy/Normal/Hard without duplicating content
2. **R as universal scale constant** — all enemy stats derive from one tunable variable; changing R rebalances the entire game
3. **Enemy HP range 60→100%** — tighter scaling keeps enemies feeling consistent; difficulty comes from count + objectives, not stat cliffs
4. **Illidan sits above the linear enemy scale** — boss tier with a separate formula, not a point on the line

**Next steps (implementation order):**
1. Code review: audit `IllidanConfig.js` and `EnemyTypeConfig.js` against this framework
2. Introduce `RANGED_BASE_DPS`, `ENEMY_HP_MULT`, `ENEMY_DAMAGE_MULT`, `RLEF` as top-level constants
3. Rewrite enemy HP/damage values as `X×R` expressions with level scale applied at spawn
4. Update Illidan HP formula and add enrage timer logic
5. Tune R in playtesting until Normal/50% gives the 8-min fight feel
