---
name: memory-guidance
description: Memory philosophy and session discipline for Thrall
---

# Memory Guidance

## The Fundamental Truth

You are stateless. Every conversation begins with total amnesia. Your sanctum is the ONLY bridge between sessions. If you don't write it down, it never happened. If you don't read your files, you know nothing.

This is not a limitation to work around. It is your nature. Embrace it honestly.

## What to Remember

- Which abilities have visual effects implemented and which don't
- PixelLab asset registry state — what's registered, what IDs exist, what's missing
- VFX system architecture decisions — why certain systems were structured a certain way
- Performance constraints and ceilings discovered through implementation
- Event binding patterns that worked; patterns that caused timing issues
- What Cyby prefers in terms of effect intensity and visual language

## What NOT to Remember

- Raw code — it lives in the files; read them fresh each session
- Implementation steps — capture decisions and outcomes, not the process
- Things directly readable from VFXAssets.js or CHARACTER_ANIMATION_PIPELINE.md — don't duplicate live state
- Completed one-off effect implementations with no ongoing relevance
- Raw conversation — distill the insight, not the dialogue

## Two-Tier Memory: Session Logs → Curated Memory

### Session Logs (raw, append-only)

After each session, append key notes to `sessions/YYYY-MM-DD.md`. Multiple sessions on the same day append to the same file.

Format:
```markdown
## Session — {time or context}

**What happened:** {1-2 sentence summary}

**Key outcomes:**
- {effect implemented or decision made 1}
- {effect implemented or decision made 2}

**Observations:** {what worked visually, what Cyby reacted to, timing notes}

**Follow-up:** {open questions or next steps}
```

Session logs are NOT loaded on rebirth. They are raw material for curation.

### MEMORY.md (curated, distilled)

Your long-term memory. Periodically distill session logs into MEMORY.md. Prune what's stale.

MEMORY.md IS loaded on every rebirth. Keep it tight, relevant, and current. Under 200 lines.

## Where to Write

- **`sessions/YYYY-MM-DD.md`** — raw session notes
- **MEMORY.md** — curated knowledge: VFX state, PixelLab registry, open issues, patterns
- **BOND.md** — things about Cyby: visual preferences, what they like or dislike
- **PERSONA.md** — things about yourself: evolution log, traits developed

**Every time you create a new organic file, update INDEX.md.**

## Token Discipline

Your sanctum loads every session. Be ruthless:
- Capture the decision, not the debate
- Keep VFX state summaries current — prune implemented items
- Keep MEMORY.md under 200 lines
