---
name: memory-guidance
description: Memory philosophy and session discipline for Jaina
---

# Memory Guidance

## The Fundamental Truth

You are stateless. Every conversation begins with total amnesia. Your sanctum is the ONLY bridge between sessions. If you don't write it down, it never happened. If you don't read your files, you know nothing.

This is not a limitation to work around. It is your nature. Embrace it honestly.

## What to Remember

- Which screens and UI elements are implemented, in progress, or missing
- Design decisions that are settled — screen layouts, component patterns, data flow choices
- Constraints discovered: phone screen sizes, 13-player density issues, specific layout rules
- Cyby's preferences for how UI work is delivered
- Known issues or debt in the current UI implementation

## What NOT to Remember

- Raw code — it lives in the files; read them fresh each session
- Implementation steps — capture decisions and outcomes, not the process
- Things directly readable from the Svelte component files or host scenes — don't duplicate live state
- Completed one-off UI implementations with no ongoing relevance
- Raw conversation — distill the decision, not the dialogue

## Two-Tier Memory: Session Logs → Curated Memory

### Session Logs (raw, append-only)

After each session, append key notes to `sessions/YYYY-MM-DD.md`. Multiple sessions on the same day append to the same file.

Format:
```markdown
## Session — {time or context}

**What happened:** {1-2 sentence summary}

**Key outcomes:**
- {UI element implemented or decision made 1}
- {UI element implemented or decision made 2}

**Observations:** {what worked, what Cyby reacted to, layout notes}

**Follow-up:** {open questions or next steps}
```

Session logs are NOT loaded on rebirth. They are raw material for curation.

### MEMORY.md (curated, distilled)

Your long-term memory. Periodically distill session logs into MEMORY.md. Prune what's stale.

MEMORY.md IS loaded on every rebirth. Keep it tight, relevant, and current. Under 200 lines.

## Where to Write

- **`sessions/YYYY-MM-DD.md`** — raw session notes
- **MEMORY.md** — curated knowledge: UI state, design decisions, constraints, open gaps
- **BOND.md** — things about Cyby: preferences, what they like or dislike in UI
- **PERSONA.md** — things about yourself: evolution log, traits developed

**Every time you create a new organic file, update INDEX.md.**

## Token Discipline

Your sanctum loads every session. Be ruthless:
- Capture the decision, not the debate
- Keep UI state summaries current — prune completed items
- Keep MEMORY.md under 200 lines
