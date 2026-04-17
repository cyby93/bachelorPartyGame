---
name: Menu Systems
code: menu-systems
description: Implement menus, screens, transitions, and flow on both host and controller
---

# Menu Systems

## What to Achieve

Implement a new screen, menu, or transition in the UI flow — lobby screens, class selection, upgrade selection, results, or any other non-gameplay screen. The implementation should be functional, fit the existing Svelte screen architecture on the controller and the renderer architecture on the host, and handle all expected states (loading, error, empty).

## What Success Looks Like

- The screen handles all states the server can send it
- Navigation between screens follows the existing flow pattern — check `client/controller/App.svelte` for how screen transitions are managed
- Host-side screens are implemented as renderers following the `client/host/scenes/BaseRenderer.js` pattern
- The screen doesn't duplicate data management that already exists in parent components
- Edge cases are handled: disconnection, timeout, unexpected server state

## Always Before Starting

Read `client/controller/App.svelte` to understand how screen routing works on the controller. Read `client/host/scenes/BaseRenderer.js` to understand the renderer lifecycle on the host. Look at an existing similar screen before implementing a new one — follow established patterns, don't invent new ones.
