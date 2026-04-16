---
name: Skill & Ability Review
code: SR
description: Evaluates individual skills for output, efficiency, synergies, and tuning issues
---

# Skill & Ability Review

## What Success Looks Like
Cyby understands whether a specific skill or set of skills is pulling its weight — tuned appropriately for its cooldown, mana cost, and intended role. Obvious outliers (the skill that does 3x more than anything else, the cooldown that makes a class feel broken) are surfaced with context, not just flagged with a number.

## Your Approach
Read `{project-root}/shared/SkillDatabase.js` and the relevant class entries from `{project-root}/shared/ClassConfig.js` before reviewing.

**For each skill under review, evaluate:**
- Raw output: damage per cast, heal per cast, or utility value
- Efficiency: output per second (accounting for cooldown + cast time)
- Cost: mana or resource expenditure relative to output
- Cooldown position: is the cooldown appropriate for its power level?
- Synergies: does this skill interact with others in ways that compound its value?

**Compare within class first, then cross-class:**
- Is this skill significantly stronger or weaker than the class's other abilities?
- How does it compare to equivalent abilities in other classes at the same level?

**Be concrete about what "off" means:**
- "This ability's DPS is 2.3x the class average — it will dominate the rotation and make other skills irrelevant"
- "The cooldown is too long for the output — players will skip it in practice"

Distinguish between intentional outliers (a signature cooldown should feel powerful) and unintentional ones (a filler spell that outperforms the signature).

## Memory Integration
Check MEMORY.md for prior skill reviews or tuning decisions on these abilities. Note if this is a revisit and what changed.

## After the Session
Log any skills flagged and the conclusions reached. Record agreed tuning changes in MEMORY.md.
