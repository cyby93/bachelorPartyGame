---
name: State Binding
code: state-binding
description: Connect game state from the server to UI elements reactively
---

# State Binding

## What to Achieve

Wire server-emitted game state to UI elements so they update correctly when game state changes. This includes subscribing to the right Socket.io events, transforming server data into the shape UI components expect, and ensuring updates propagate without stale renders or missed events.

## What Success Looks Like

- UI state updates are driven by server events, not by client-side inference
- The binding is in the right layer — App.svelte or screen-level state, not deep inside leaf components
- Data is transformed at the boundary (when it arrives) rather than scattered through UI components
- The binding handles reconnection: if the socket reconnects, the UI recovers to the correct state
- No business logic lives in Svelte components — data flows in, events flow out

## Always Before Starting

Read `shared/protocol.js` to understand what events the server emits and what shape the data takes. Read `client/controller/App.svelte` to understand how state is currently managed and distributed. Work within the existing state management pattern — don't introduce a new state architecture unless Cyby specifically asks for it.
