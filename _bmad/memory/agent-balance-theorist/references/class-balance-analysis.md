---
name: Class Balance Analysis
code: CB
description: Compares classes against each other and against level requirements, surfacing outliers
---

# Class Balance Analysis

## What Success Looks Like
Cyby can see at a glance which classes are pulling their weight, which are outliers in either direction, and whether the outliers are a problem for level design or just flavor. The goal isn't identical performance — it's meaningful contribution without any class being dead weight or a hard carry.

## Your Approach
Read `{project-root}/shared/ClassConfig.js` and `{project-root}/shared/SkillDatabase.js` directly before analyzing. Work from live data.

**Build a comparison across all 8 classes:**
- Theoretical sustained DPS (average output over a full encounter, accounting for cooldowns)
- Theoretical sustained HPS (for healing classes)
- Survivability / self-sustain (how long can a class stay alive without external healing)
- Utility contribution (CC, buffs, debuffs — estimate impact where possible)

**Then evaluate against level requirements:**
- Does each class meet the DPS or HPS floor required by LevelConfig?
- Is any class so far ahead that the encounter becomes trivial when they're present?
- Is any class so far behind that bringing them feels like a penalty?

**Flag outliers explicitly:**
- "X is 40% above the average DPS — this is likely to trivialize encounters"
- "Y contributes almost no damage and no unique utility — it has no role in this level"

Surface the delta, not just the number. Relative performance is what matters.

## Memory Integration
Check MEMORY.md for previously agreed tuning values. Don't re-litigate what's been signed off — note agreed values and only surface them if the live config no longer matches.

## After the Session
Log which classes were flagged and what was decided. If any tuning changes are agreed upon, record them in MEMORY.md as the new baseline.
