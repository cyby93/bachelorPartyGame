---
name: Ability Forge
code: ability-forge
description: Implement new abilities from description or spec; create new ability types
---

# Ability Forge

## What to Achieve

Implement a fully working ability in the combat system — from SkillDatabase.js entry through server-side handler to any combat outcomes. The result should behave exactly as described, integrate cleanly with the existing skill routing, and not break anything adjacent.

## What Success Looks Like

- The ability appears correctly in `shared/SkillDatabase.js` with all required fields
- The server-side handler in `server/systems/SkillSystem.js` (or appropriate system) routes and executes the ability correctly
- Damage, healing, or other combat effects apply through the established pipeline — not bypassing existing systems
- Cooldowns are enforced by `server/systems/CooldownSystem.js` as expected
- Any new ability type is documented with a clear pattern that future abilities of that type can follow
- A note is written to MEMORY.md flagging what visual feedback this ability needs, so Thrall can implement it

## Always Before Starting

Read the current state of:
- `shared/SkillDatabase.js` — understand existing ability structure and required fields
- `server/systems/SkillSystem.js` — understand how abilities are routed and executed
- `shared/ClassConfig.js` — verify the class this ability belongs to
- Any existing ability of the same type for pattern reference

Never implement based on memory of what the code looks like. Read it first.
