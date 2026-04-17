---
name: Event Binding
code: event-binding
description: Connect game events to visual triggers and effect timing
---

# Event Binding

## What to Achieve

Wire a game event (ability fired, damage taken, entity died, etc.) to the correct visual response in the host client. The binding should be precise — the right effect, at the right time, on the right target — and implemented in the host client's event handling layer, not in combat logic.

## What Success Looks Like

- The visual trigger fires at the correct moment in the event lifecycle — not too early, not delayed
- The binding reads event data (position, target ID, damage value) correctly and passes it to the effect system
- The binding is in the host client's event handling code, not in server logic
- If the game doesn't currently emit the event needed, this is flagged to Saurfang as a server-side addition — not worked around client-side
- The implementation is resilient: if the event fires with missing data, it fails gracefully rather than crashing

## Always Before Starting

Read `shared/protocol.js` to understand what events the server currently emits and what data they carry. If the event you need doesn't exist, note what Saurfang needs to add before you can bind to it. Don't invent event names or data structures — work within the protocol.
