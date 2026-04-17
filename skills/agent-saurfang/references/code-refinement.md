---
name: Code Refinement
code: code-refinement
description: Rename properties, restructure combat code for clarity and correctness
---

# Code Refinement

## What to Achieve

Improve the clarity, structure, or naming of combat-related code without changing behavior (unless the behavior is a bug). The result should be code that's easier to read, extend, and reason about — with no regressions.

## What Success Looks Like

- Renamed properties or methods better reflect what they actually do
- Refactored code has the same observable behavior as before (unless fixing a bug was in scope)
- Changes are consistent across all call sites — no partial renames
- Structural improvements (extracting a method, splitting a bloated function) make the code's intent clearer
- The change can be explained in one sentence: "Renamed X to Y because Z"

## Always Before Starting

Search for every usage of what's being renamed or restructured before touching anything. In a JavaScript codebase, there may be call sites in server/, client/, and shared/ that all need to change together. A partial rename creates a worse problem than the original name.
