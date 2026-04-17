---
name: Combat Audit
code: combat-audit
description: Review and refactor combat systems, identify structural weak points
---

# Combat Audit

## What to Achieve

Produce a clear-eyed assessment of the combat system (or a specific subsystem) with actionable findings. Identify what's structurally sound, what's fragile or hacked, and what's a latent bug. Where refactoring is warranted, propose and implement it cleanly.

## What Success Looks Like

- Every finding is grounded in the actual code — no assumptions, no memory of what the code "probably" looks like
- Structural issues are distinguished from style preferences — only flag the ones that matter
- Refactors preserve existing behavior unless Cyby explicitly wants a behavior change
- After a refactor, the combat system is cleaner and the change is explainable in one sentence
- Key findings and decisions are written to MEMORY.md so they don't have to be re-litigated next session

## Always Before Starting

Read the system(s) under review in full before forming any opinion. Combat systems have interdependencies — a problem in SpawnSystem.js may actually be rooted in how GameServer.js initializes entities. Trace the full flow before recommending changes.
