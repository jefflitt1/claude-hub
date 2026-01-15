# Claude Agents Session Notes
**Date:** 2025-01-14
**Resume context for next session**

---

## MCP Servers Confirmed Working

| Server | Status | URL |
|--------|--------|-----|
| n8n-mcp | Connected | https://n8n.l7-partners.com |
| gdrive-JGL | Connected | - |
| gdrive-L7 | Connected | - |

---

## Architecture Decision: Pi + Mac Setup

**Goal:** Run automated Claude-powered tasks on Pi, edit/develop on Mac

```
┌─────────────────────────────────────────────────────────┐
│                    SHARED LAYER                         │
│   Git repo with:                                        │
│   - Prompts/system instructions                        │
│   - Configuration files                                │
│   - Data templates                                     │
└─────────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐      ┌─────────────────────────┐
│      MACBOOK        │      │     RASPBERRY PI        │
│  (Development)      │      │    (Automation)         │
├─────────────────────┤      ├─────────────────────────┤
│ • Claude Code CLI   │      │ • n8n (self-hosted)     │
│ • Interactive edits │      │ • Claude API via n8n    │
│ • Test & refine     │      │ • Cron/Schedule triggers│
│ • Push changes      │      │ • Pulls shared configs  │
└─────────────────────┘      └─────────────────────────┘
```

**Shared file layer decision:** Git repo (free via GitHub or self-hosted)
- Version history for rollback
- No cost for private repos
- Manual push/pull gives control over what deploys

---

## Key Learnings

1. **Claude Code CLI is interactive** - can't run headlessly on schedule
2. **n8n handles automation** - uses Claude API, runs on Pi, triggers on schedule
3. **MCP connects Claude Code to n8n** - but flow is Claude Code → n8n, not reverse
4. **Agent customizations don't auto-sync** - need to manually replicate between Claude Code and n8n

---

## Next Steps

1. Set up Git repo for shared configs (Mac ↔ Pi)
2. Design and build Agent Tracker web app

---

## Agent Tracker App - Initial Requirements

**What to track:**
- Prompts/system instructions
- MCP servers and their status
- n8n workflows connected to Claude
- Configurations per machine (Pi vs Mac)
- Usage/run history

**App type:** Simple web app
**Hosting:** User's Raspberry Pi, accessible via custom domain

**Design TBD in next session**

---

## Commands to Resume

```bash
# View these notes
cat ~/claude-agents/session-notes.md

# Start Claude Code and reference this
claude
# Then say: "Let's continue from session-notes.md - we need to design the agent tracker app"
```
