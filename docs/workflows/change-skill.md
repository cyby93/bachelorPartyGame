# change-skill

Use this workflow for any change to skill definitions or skill behavior.

## When To Use

- add a new skill
- change an existing skill's behavior
- change `inputType`
- change cast, channel, targeting, cooldown, or self-cast semantics
- change VFX mapping for a skill `type` or `subtype`

## Required Inspection

Inspect all of these before editing:

1. `shared/SkillDatabase.js`
2. `shared/SkillValidator.js`
3. `docs/SKILLS.md`
4. `server/systems/SkillSystem.js`
5. controller files that interpret `inputType`, cast behavior, or aim semantics
6. `client/host/systems/VFXManager.js` if visual behavior may change

## Implementation Rules

- keep the server authoritative for gameplay behavior
- keep docs, validator, and runtime behavior aligned in the same task
- prefer minimal changes over new abstractions
- if a new `type` or `subtype` is introduced, update every affected consumer before considering the task complete

## Verification

Run:

```bash
node shared/SkillValidator.js
npm run build
```

Manual verification should cover:

- controller feel
- cooldown behavior
- target-finding semantics
- host VFX feedback

## Reviewer Focus

- missing doc updates
- type and subtype drift
- validator drift
- controller and server mismatch
- VFX mismatch
