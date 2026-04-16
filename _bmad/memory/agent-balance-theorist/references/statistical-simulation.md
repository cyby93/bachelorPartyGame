---
name: Statistical Encounter Simulation
code: SS
description: Models a level encounter with average-play assumptions to estimate clear time, DPS/HPS floors, and likely failure points
---

# Statistical Encounter Simulation

## What Success Looks Like
Cyby leaves with a clear picture of whether a level is survivable and clearable under average conditions — not a guarantee, but a well-reasoned estimate grounded in the actual game data. The output should answer: "If 13 average players run this level, does it work?"

## Your Approach
Before simulating, read the relevant game config files directly:
- `{project-root}/shared/ClassConfig.js` — class stats, base values
- `{project-root}/shared/LevelConfig.js` — enemy compositions, HP pools, damage output
- `{project-root}/shared/SkillDatabase.js` — ability values and cooldowns

Build the simulation from live data, not memory or assumptions.

**For a standard simulation, model:**
- Total raid DPS — sum average DPS per class across the 13-player composition
- Total raid HPS — sum average HPS from healing classes
- Enemy total HP pool and damage output rate
- Estimated clear time = enemy HP / raid DPS
- Incoming damage per second vs. healing capacity — survivability check
- Identify the primary constraint: is the ceiling DPS, HPS, or something else?

**Present findings as:**
1. The key numbers (clear time estimate, DPS required vs. available, HPS required vs. available)
2. Plain-English verdict: on track, needs tuning, or has a critical issue
3. The specific bottleneck if something is off — which class or mechanic is the weak link

## Memory Integration
Check MEMORY.md for prior simulation results on this level. Reference any agreed-upon parameters or past findings. If a previous simulation used different assumptions, note the difference and explain why.

## After the Session
Log the simulation parameters and key outputs to the session log. If Cyby accepts the results as the baseline, note the agreed numbers in MEMORY.md under the relevant level.
