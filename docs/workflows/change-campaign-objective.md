# change-campaign-objective

Use this workflow for campaign, objective, and progression changes.

## When To Use

- change level config
- change objective types or progress rules
- change scene progression
- change difficulty scaling
- change boss setup or spawn flow

## Required Inspection

Inspect all of these before editing:

1. `shared/LevelConfig.js`
2. `server/GameServer.js`
3. `server/systems/SpawnSystem.js` if spawning changes are involved
4. host scene and UI consumers
5. controller scene handling if progression UX may change
6. `docs/CAMPAIGN.md`

## Implementation Rules

- server owns progression and objective truth
- config and runtime behavior must stay aligned
- update host and controller only as consumers of server-driven flow

## Verification

Run:

```bash
npm run build
```

Manual verification should cover start, transition, completion, and restart behavior as relevant.

## Reviewer Focus

- objective schema drift
- scene-transition mismatches
- host or controller assumptions that no longer match server progression
