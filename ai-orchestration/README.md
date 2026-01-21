# AI Orchestration

Multi-agent coordination for Claude Code + Gemini CLI + Codex CLI.

## Structure

```
ai-orchestration/
├── README.md              # This file
├── shared-context/        # Knowledge shared across all AIs
│   └── project-knowledge.md
├── configs/               # Orchestration configurations
│   └── multi-agent.json
├── templates/             # Reusable workflow templates
│   ├── architecture-review.md
│   └── code-review-second-opinion.md
└── tasks/                 # Active task queue (for multi-agent workflows)
```

## Context Files

Each AI has its own context file at project root:

| File | AI | Purpose |
|------|----|---------||
| `CLAUDE.md` | Claude Code | Primary instructions, project memory |
| `GEMINI.md` | Gemini CLI | Large context analysis, research |
| `AGENTS.md` | Codex CLI | Security review, refactoring |

## Quick Reference

### When to Invoke Each AI

| Task | Best AI | Command |
|------|---------|---------|
| Full codebase analysis | Gemini | "Ask Gemini to analyze..." |
| Security review | Codex | "Get Codex to review for security..." |
| Alternative implementation | Codex | "Get Codex's opinion on..." |
| Document synthesis | Gemini | "Have Gemini synthesize..." |
| Everything else | Claude | (default) |

### Workflow Examples

**Architecture Review:**
```
1. Gemini: Analyze full codebase
2. Codex: Security review
3. Claude: Synthesize and act
```

**Second Opinion:**
```
1. Claude: Implement solution
2. Codex: Review implementation
3. Claude: Incorporate feedback
```

**Research to Code:**
```
1. Gemini: Research and summarize
2. Claude: Plan implementation
3. Claude: Execute
```

## Adding New Workflows

1. Create template in `templates/`
2. Add workflow config to `configs/multi-agent.json`
3. Document in this README

## Authentication

All AI CLIs use OAuth (no API keys needed):
- Gemini: `~/.gemini/` (Google account)
- Codex: `~/.codex/` (ChatGPT account)
- Claude: Claude Code subscription
