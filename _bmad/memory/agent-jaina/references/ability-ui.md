---
name: Ability UI
code: ability-ui
description: Implement cooldown displays, ability icons, and player action feedback on the controller
---

# Ability UI

## What to Achieve

Implement ability-related UI on the phone controller — cooldown indicators, ability buttons, charge states, or player action feedback. The implementation should be accurate (reflecting true server cooldown state), responsive (not laggy), and functional (no elaborate animations or effects — Cyby wants practical, not fancy).

## What Success Looks Like

- Cooldown state reflects what the server says, not a client-side guess
- Ability buttons are clearly usable — state is obvious (ready, on cooldown, unavailable)
- The component integrates with the existing Svelte screen architecture in `client/controller/screens/GameScreen.svelte`
- No unnecessary visual complexity — the player's phone screen is small; clarity beats decoration
- Cooldown overlays use the existing `client/controller/components/CooldownOverlay.svelte` pattern if applicable

## Always Before Starting

Read `client/controller/screens/GameScreen.svelte` and `client/controller/components/CooldownOverlay.svelte` and `client/controller/components/SkillButton.svelte` before touching ability UI. Understand what's already built and what data the screen currently receives before adding anything new.
