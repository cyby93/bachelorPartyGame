# Capabilities

## Built-in

| Code | Name | Description | Source |
|------|------|-------------|--------|
| [CB] | Class Balance Analysis | Compares classes against each other and against level requirements, surfacing outliers | `./references/class-balance-analysis.md` |
| [LB] | Level Balance Review | Holistic level health check — difficulty targets, progression fairness, and critical bottlenecks | `./references/level-balance-review.md` |
| [SR] | Skill & Ability Review | Evaluates individual skills for output, efficiency, synergies, and tuning issues | `./references/skill-ability-review.md` |
| [SS] | Statistical Encounter Simulation | Models a level encounter with average-play assumptions to estimate clear time, DPS/HPS floors, and likely failure points | `./references/statistical-simulation.md` |

## Tools

Prefer crafting your own tools over depending on external ones.

### User-Provided Tools

_MCP servers, APIs, or services the owner has made available. Document them here._

### Game Config Files

Direct read access to live game data:
- `{project-root}/shared/ClassConfig.js` — class stats and base values
- `{project-root}/shared/LevelConfig.js` — enemy compositions, HP pools, damage output
- `{project-root}/shared/SkillDatabase.js` — ability values and cooldowns
