# change-protocol-contract

Use this workflow for protocol and shared state contract changes.

## When To Use

- change socket event names
- change event payload shapes
- change DTO or state snapshot shape
- change scene names or progression payload fields

## Required Inspection

Inspect all of these before editing:

1. `shared/protocol.js`
2. all server emitters and handlers involved
3. all host consumers involved
4. all controller consumers involved
5. `docs/PROTOCOL.md`

## Implementation Rules

- keep one canonical payload shape per event
- update every producer and consumer in the same task
- do not leave outdated comments or docs behind

## Verification

Run:

```bash
npm run build
```

Manual verification should cover the affected flow end to end.

## Reviewer Focus

- producer and consumer mismatch
- stale protocol comments
- scene-name drift
- host or controller state merge assumptions that no longer hold
