# Shared Project Knowledge

> This file contains knowledge shared across all AI assistants (Claude, Gemini, Codex).
> Reference this for consistent understanding of the project.

## Owner

**Jeff** - Software developer building an AI-augmented personal/business productivity system.

## Projects

### Claude Hub (Main)
- **Purpose**: Central orchestration for AI agents and automation
- **Stack**: Claude Code CLI + MCP servers
- **Key Feature**: Multi-model collaboration (Claude + Gemini + Codex)

### JGL Capital
- **Purpose**: Personal trading system
- **Stack**: TypeScript, TradeStation API, Supabase
- **Key Feature**: Market data analysis, position tracking

### L7 Partners
- **Purpose**: Commercial real estate property management
- **Stack**: React, Supabase, n8n workflows
- **Key Feature**: Property database, deal analysis, document processing

### Meta-Tools
- **Purpose**: Unified MCP servers consolidating multiple services
- **Components**:
  - `l7-business` - Supabase + n8n + GDrive
  - `unified-comms` - Email routing (personal + L7)
  - `jeff-agent` - Task/email tracking
  - `session-context` - Session persistence
  - `feedly` - RSS aggregation

## Infrastructure

| Service | URL/Location | Purpose |
|---------|--------------|---------|
| n8n | n8n.l7-partners.com | Workflow automation |
| Supabase | L7 Partners project | Database + pgvector |
| MCP Docker | Local | MCP server container |

## Conventions

### Code Style
- TypeScript preferred
- ESM modules
- Async/await over callbacks
- Zod for validation

### File Naming
- kebab-case for files
- PascalCase for components
- camelCase for functions/variables

### Git
- Conventional commits
- Feature branches
- Co-authored commits with AI

## API Credentials

All credentials managed via:
- Environment variables
- MCP Docker secrets
- OAuth tokens in ~/.codex, ~/.gemini, ~/.claude

## Communication Channels

- **Personal email**: Via unified-comms MCP
- **L7 email**: Via unified-comms MCP (auto-routed)
- **Telegram**: Via telegram MCP
- **Calendar**: Via google-calendar MCP

## Multi-Agent Collaboration

Claude Code has a `/consult` skill for invoking Gemini and Codex:

| Command | Purpose |
|---------|---------|
| `/consult gemini [task]` | Large context analysis, research synthesis |
| `/consult codex [task]` | Security review, alternative approaches |
| `/consult arch-review [target]` | Full architecture review (Gemini → Codex → Claude) |
| `/consult security [target]` | Security audit (Codex → Claude) |
| `/consult second-opinion` | Get alternative perspective |

**Response expectations:**
- Gemini: Focus on big picture, architecture, research synthesis
- Codex: Focus on security, specific code issues, alternatives
- Both: Provide structured responses with confidence levels

**Workflow configs:** `ai-orchestration/configs/multi-agent.json`

## Proactive Consultation Culture

**All agents should think about multi-model collaboration:**

When analyzing a task, consider:
1. Would another model's strengths help here?
2. Is this outside my core strengths?
3. Would a second opinion improve confidence?

**Gemini should suggest Codex for:** Security issues, refactoring plans, alternative implementations
**Codex should suggest Gemini for:** Large context analysis, architecture overview, research synthesis
**Claude should proactively invoke:** Either model when their strengths match the task

**Goal:** Leverage the full AI team, not just one model. Consultation is a strength.
