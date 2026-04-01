# change-renderer-vfx

Use this workflow for host renderer, scene, and VFX changes.

## When To Use

- change host scene lifecycle
- add or modify renderer hooks
- change interpolation assumptions
- change visual effect routing or effect systems
- change scene-specific host UI

## Required Inspection

Inspect all of these before editing:

1. `client/host/HostGame.js`
2. relevant files in `client/host/scenes/`
3. relevant files in `client/host/systems/`
4. `docs/RENDERERS.md`

## Implementation Rules

- host renders server state and must not become authoritative for gameplay rules
- preserve renderer lifecycle and layer ownership
- keep changes minimal and consistent with existing renderer patterns

## Verification

Run:

```bash
npm run build
```

Manual verification should cover:

- affected scene entry and exit behavior
- expected VFX timing and layering
- no renderer lifecycle regressions

## Reviewer Focus

- lifecycle regressions
- layer misuse
- missing `docs/RENDERERS.md` updates
- state shape assumptions that no longer match the server
