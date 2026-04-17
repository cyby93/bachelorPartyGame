---
name: PixelLab Pipeline
code: pixellab-pipeline
description: PixelLab asset registration, animation triggering, and pipeline work
---

# PixelLab Pipeline

## What to Achieve

Register new PixelLab character assets, set up animation states, or maintain the pipeline that connects PixelLab-generated sprites to the game's visual systems. The pipeline should be well-documented and consistent — adding a new character should follow the same pattern as every existing character.

## What Success Looks Like

- New assets are registered following the exact pattern in `docs/CHARACTER_ANIMATION_PIPELINE.md`
- Animation states are wired to the correct game events (walk, attack, death, idle)
- The CHARACTER_ANIMATION_PIPELINE.md document is updated to reflect any new registrations
- PixelLab IDs are recorded accurately — a wrong ID means loading the wrong asset silently
- The sprite implementation in `client/host/entities/` correctly reads from the registered asset

## Always Before Starting

Read `docs/CHARACTER_ANIMATION_PIPELINE.md` in full before working with any PixelLab assets. This document is the source of truth for IDs, naming conventions, and pipeline steps. Do not work from memory about how the pipeline works — read it fresh every session.
