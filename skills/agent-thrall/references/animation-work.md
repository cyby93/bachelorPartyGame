---
name: Animation Work
code: animation-work
description: Character and ability animation implementation
---

# Animation Work

## What to Achieve

Implement or repair character animations — idle, walk, attack, death, and ability-specific states — in the host client sprite system. Animations should be smooth, correctly timed to game events, and consistent with the visual language established by other characters.

## What Success Looks Like

- Animation states transition correctly based on game events (not based on guesses about game state)
- Frame timing feels responsive — attack animations don't lag noticeably behind the server event
- Animation loops (idle, walk) are seamless
- Death and one-shot animations play fully before the entity is removed
- The sprite implementation reads from the PixelLab-registered asset correctly

## Always Before Starting

Read the existing sprite implementation for a similar character in `client/host/entities/` to understand the current animation pattern. Check `docs/CHARACTER_ANIMATION_PIPELINE.md` for any animation state conventions. Don't invent new patterns when an established one exists.
