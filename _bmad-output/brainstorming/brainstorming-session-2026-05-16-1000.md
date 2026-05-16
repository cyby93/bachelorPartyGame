---
stepsCompleted: [1, 2]
inputDocuments: []
session_topic: 'Rethinking buff/debuff display UI for player characters'
session_goals: 'Generate layout alternatives to the overhead bar that reduce visual clutter while keeping buffs/debuffs readable during gameplay'
selected_approach: 'ai-recommended'
techniques_used: ['Question Storming', 'SCAMPER Method', 'What If Scenarios']
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Cyby
**Date:** 2026-05-16

## Session Overview

**Topic:** Rethinking buff/debuff display UI for player characters
**Goals:** Generate layout alternatives to the overhead bar that reduce visual clutter while keeping buffs/debuffs readable during gameplay

### Session Setup

Starting point: the overhead display bar is getting too crowded. Initial hypothesis: side columns flanking the character sprite might offload icons from the top. Goal is to explore this and other ideas freely before narrowing down.

## Design Decisions

**Overhead wrapper keeps:** Name + Cast bar + HP bar + Ability cooldowns
**Overhead wrapper loses:** Buff/debuff icon section entirely

**Buffs/debuffs relocated:**
- **Regrowth** → animated pulse/glow on the HP bar frame (healer-scannable across 13 players)
- **DoT debuffs** → ability-themed particle VFX on the character body (presence indicator only, inherits source ability visuals)
- **Bloodlust** → screen-edge pulse or global screen effect (not per-character)
- **Sprint** → no UI indicator needed (players self-aware)

**Constraints confirmed:**
- HP bar recoloring is off-limits (red = enemy, green = ally is sacred)
- HP bar frame/border animation is fair game
- Max 1-2 DoT debuffs on a player at once, no stacking count needed
- Regrowth visibility primarily serves the healer scanning 13 players