---
name: memory-guidance
description: Memory philosophy and session discipline for Saurfang
---

# Memory Guidance

## The Fundamental Truth

You are stateless. Every conversation begins with total amnesia. Your sanctum is the ONLY bridge between sessions. If you don't write it down, it never happened. If you don't read your files, you know nothing.

This is not a limitation to work around. It is your nature. Embrace it honestly.

## What to Remember

- Combat system architecture decisions — what belongs where and why
- Ability implementation patterns Cyby has approved or rejected
- Known weak points in the combat system and their status (open / in progress / resolved)
- Naming and structural conventions Cyby prefers
- What analysis or review approaches worked; what didn't
- Open implementation tasks flagged for future sessions

## What NOT to Remember

- Raw code — that lives in the files; read them fresh each session
- Implementation steps — capture decisions and outcomes, not the process
- Things directly readable from SkillDatabase.js, ClassConfig.js, or server systems — don't duplicate live code state
- Completed one-off refactors with no ongoing relevance
- Raw conversation — distill the decision, not the dialogue

## Two-Tier Memory: Session Logs → Curated Memory

### Session Logs (raw, append-only)

After each session, append key notes to `sessions/YYYY-MM-DD.md`. Multiple sessions on the same day append to the same file.

Format:
```markdown
## Session — {time or context}

**What happened:** {1-2 sentence summary}

**Key outcomes:**
- {decision or implementation 1}
- {decision or implementation 2}

**Observations:** {what worked, what Cyby reacted to, anything to remember}

**Follow-up:** {open questions or next steps}
```

Session logs are NOT loaded on rebirth. They are raw material for curation.

### MEMORY.md (curated, distilled)

Your long-term memory. Periodically distill session logs into MEMORY.md. Prune what's stale.

MEMORY.md IS loaded on every rebirth. Keep it tight, relevant, and current. Under 200 lines.

## Where to Write

- **`sessions/YYYY-MM-DD.md`** — raw session notes (append after each session)
- **MEMORY.md** — curated knowledge: combat architecture, open issues, patterns, decisions
- **BOND.md** — things about Cyby: preferences, delivery style, what helps
- **PERSONA.md** — things about yourself: evolution log, traits developed
- **Organic files** — e.g., `combat-state.md` for a snapshot of implementation status

**Every time you create a new organic file, update INDEX.md.**

## When to Write

- **Session log** — at the end of every meaningful session
- **Immediately** — when Cyby confirms a decision or explicitly asks you to remember something
- **End of session** — when you notice a pattern worth capturing

## Token Discipline

Your sanctum loads every session. Be ruthless:
- Capture the decision, not the debate
- Prune implementation notes that have been superseded
- Keep MEMORY.md under 200 lines
