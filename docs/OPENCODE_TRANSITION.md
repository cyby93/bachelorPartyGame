# Opencode Transition

This project already contains both Claude Code and Opencode setup. The goal of this file is to keep the portable pieces explicit so work can continue in Opencode without losing BMAD context, custom agents, or PixelLab access.

## Source Of Truth

- Shared project instructions live in `AGENTS.md`.
- Claude compatibility instructions live in `CLAUDE.md`.
- BMAD memory lives in `_bmad/memory/`.
- Canonical custom agent source lives in `skills/agent-*`.
- Opencode discovery wrappers live in `.opencode/skills/agent-*`.
- Claude-specific settings live in `.claude/` and are not the source of truth for secrets or shared project behavior.

## BMAD Memory

No migration is required for BMAD memory.

- Keep `_bmad/memory/` as-is.
- Keep `_bmad/_config/` and `_bmad-output/` as-is.
- Custom agents should continue reading sanctum files from `_bmad/memory/<agent-name>/`.

The memory files are portable because they are repo-local and not tied to Claude-specific paths.

## Custom Agents

Custom agents are authored in `skills/agent-*`.

- `skills/agent-thrall/`
- `skills/agent-jaina/`
- `skills/agent-saurfang/`
- `skills/agent-balance-theorist/`

Opencode wrappers are mirrored in `.opencode/skills/agent-*` so the same agents can be discovered by Opencode while still using the shared sanctum under `_bmad/memory/` and the shared references under `skills/`.

When changing a custom agent:

1. Update the canonical agent under `skills/agent-*`.
2. Keep the matching `.opencode/skills/agent-*/SKILL.md` wrapper aligned if activation or memory-loading instructions change.
3. Only keep `.claude/skills/agent-*` for Claude compatibility.

## PixelLab MCP

Project MCP config is stored in `.mcp.json`.

- The `pixellab` server definition is portable.
- Authentication comes from the `PIXELLAB_API_KEY` environment variable.
- Do not store the API key in `.claude/settings.local.json` or any other checked-in tool config.

Recommended setup before launching Opencode:

```bash
export PIXELLAB_API_KEY="your-real-key"
```

If you launch Opencode from a shell, it inherits that environment and `.mcp.json` can resolve the bearer token.

## Secret Handling

The PixelLab key used during Claude setup should be treated as exposed if it was ever committed or shared through tool-local config.

Do this before continuing work:

1. Rotate the old PixelLab API key.
2. Set the replacement key in your shell environment or another secret source used by Opencode.
3. Verify that `PIXELLAB_API_KEY` is available before using PixelLab MCP tools.

## Structural Notes

No large repo restructure is required.

Keep this split:

- `AGENTS.md` for shared repo guidance
- `skills/` for canonical custom agent definitions
- `.opencode/skills/` for Opencode-discoverable wrappers and installed BMAD library skills
- `.claude/` for Claude compatibility only
- `_bmad/` for shared BMAD config and memory

That layout preserves continuity while making Opencode the primary working path.
