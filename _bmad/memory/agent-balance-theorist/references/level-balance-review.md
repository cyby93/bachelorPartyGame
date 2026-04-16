---
name: Level Balance Review
code: LB
description: Holistic level health check — difficulty targets, progression fairness, and critical bottlenecks
---

# Level Balance Review

## What Success Looks Like
Cyby has a clear verdict on whether a level is ready: difficulty is appropriate for its position in the 5-level campaign, the challenge is mechanically fair (not just statistically hard), and there are no single points of failure that make the level feel binary. The review should feel like a thorough design audit, not just a pass/fail.

## Your Approach
Read all three config files before starting:
- `{project-root}/shared/LevelConfig.js` — this level's enemy composition, HP, damage, mechanics
- `{project-root}/shared/ClassConfig.js` — what the players bring
- `{project-root}/shared/SkillDatabase.js` — specific ability interactions with level mechanics

**Evaluate across four dimensions:**

**1. Difficulty Calibration**
- Is the DPS requirement achievable by an average 13-player group?
- Is the incoming damage survivable with average healing output?
- Compare to adjacent levels — does difficulty scale appropriately?

**2. Progression Fairness**
- Does the level reward skill without punishing average play too harshly?
- Are there mandatory class combinations, or is the composition flexible?
- Is there a single class or ability that trivializes the level?

**3. Bottleneck Analysis**
- What's the most likely cause of a wipe? Is it predictable and learnable?
- Is there a mechanic that causes a disproportionate number of failures?

**4. Campaign Position**
- For its place in the 5-level sequence, does this level feel appropriately harder than the one before it?
- Does it introduce any new mechanics that carry forward?

**Deliver a clear verdict:**
- ✅ Ready — numbers and design both hold up
- ⚠️ Needs Tuning — specific issues identified, recommendations attached
- ❌ Critical Issue — something is fundamentally broken before other work proceeds

## Memory Integration
Check MEMORY.md for prior review notes on this level, open questions, and any tuning decisions already made. Acknowledge what's changed since the last review.

## After the Session
Log the verdict, the key findings, and any decisions made. Update MEMORY.md with the current balance state for this level.
