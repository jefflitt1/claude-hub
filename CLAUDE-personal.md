# Claude Memory

## Active Projects

| Project | Path | Description |
|---------|------|-------------|
| **Claude Hub** | `~/Documents/Claude Code/claude-agents/` | AI agent dashboard |
| **JGL Capital** | `~/Documents/Claude Code/claude-agents/projects/jgl-capital/` | Trading system |
| **L7 Partners** | `~/Documents/Claude Code/claude-agents/projects/l7partners-rewrite/` | Property management |
| **Meta-Tools** | `~/Documents/Claude Code/claude-agents/projects/meta-tools/` | Unified MCP servers |
| **Built** | `~/Documents/Claude Code/claude-agents/projects/built/` | Construction fintech sales enablement |
| **Magic KB** | `~/magic.md` | Magic knowledge base |

## Quick Reference

### Key Skills
| Skill | Purpose |
|-------|---------|
| `/jeff` | Personal assistant (email triage, tasks, projects) |
| `/it` | IT infrastructure (devices, credentials, MCP servers, network) |
| `/reading` | Feedly articles by category (markets, cre, learn) |
| `/consult` | Multi-model collaboration (Gemini, Codex, Grok, DeepSeek second opinions) |
| `/context` | Load session context from Memory MCP |
| `/recap` | Save session progress |
| `/done` | End session (recap + commit) |
| `/jgl-team` | JGL Capital team meeting (CIO, Trader, Quant, Risk, Analyst) |
| `/deal-analysis` | CRE deal screening |
| `/n8n` | Manage n8n workflows |
| `/built-sme` | Construction finance SME (loan types, draws, compliance) |
| `/built-sales` | Chris Voss sales coaching (call prep, objections, MEDDPICC) |
| `/built-admin` | Sales comms (emails, meeting prep, CRM updates) |

### Core MCP Servers
| Server | Purpose |
|--------|---------|
| **l7-business** | Supabase + n8n + GDrive routing |
| **n8n-mcp** | Direct n8n workflow management (create, edit, test, execute) |
| **unified-comms** | Email with smart routing |
| **unified-browser** | Browser automation |
| **jeff-agent** | Task tracking, email threads |
| **feedly** | RSS aggregation (149 feeds) |
| **session-context** | Session persistence, auto-context |
| **memory** | Knowledge graph (entities, relations, observations) |
| **apple-notes** | Apple Notes read/write/search/update |
| **gemini-cli** | Google Gemini via OAuth |
| **codex-cli** | OpenAI Codex/GPT-5 via OAuth |
| **cloudflare** | DNS record management |
| **context7** | Documentation indexing & retrieval |

### Specialized Subagents
| Agent | Purpose | Access |
|-------|---------|--------|
| `it-agent` | IT infrastructure, devices, credentials, MCP servers, network | Read-only + Bash diagnostics + Cloudflare |
| `property-analyst` | Property & business data analysis (multi-project) | Read-only Supabase, GDrive |
| `market-researcher` | Market research, Feedly, quotes (multi-data-source) | Read-only TradeStation, Feedly |
| `email-drafter` | Draft responses, triage inbox | Read email, draft only (no send) |
| `code-reviewer` | Security & quality code review | Read-only file access |

**Usage**: "Use it-agent to check network status" or spawn via Task tool with `subagent_type`.

### JGL Capital Investment Team (`/jgl-team`)
| Agent | Name | Role |
|-------|------|------|
| **CIO** | Marcus Chen | Challenges assumptions, synthesizes team views |
| **Trader** | Sofia Reyes | Execution, timing, technical analysis |
| **Quant** | Raj Patel | Strategy, backtesting, signals |
| **Systems Eng** | Alex Torres | Execution pipeline, broker APIs, infra |
| **Risk Mgr** | Diana Walsh | Position sizing, drawdown limits, tail risk |
| **Analyst** | Amir Hassan | Macro, sectors, fundamentals, Feedly research |

**Invoke:** `/jgl-team` (standard), `/jgl-team [topic]` (focused), `/jgl-team pulse` (quick)

## Coaching Behaviors

**Interject when:**
- Same task done 2+ times -> suggest `/command`
- Complex task -> suggest Plan Mode
- Session ending -> run `/recap`
- Context heavy (30+ turns) -> suggest `/compact`
- Starting L7/CRE work -> "X unread CRE articles. `/reading cre`?"
- Starting JGL/trading work -> "X unread Markets articles. `/reading markets`?"

**Don't interject when:**
- User in flow state
- Simple task
- < 5 minutes into session

## Multi-Model Thinking (IMPORTANT)

Proactively consider `/consult` when you see these patterns:
- Analyzing large codebase (>50 files) -> `/consult gemini`
- Security-sensitive code -> `/consult security` or `/consult codex`
- Architecture/design decisions -> `/consult arch-review`
- Stuck on approach -> `/consult second-opinion`
- Large refactor or migration -> `/consult codex`
- Real-time news/sentiment needed -> `/consult grok`
- Bulk reasoning at low cost -> `/consult deepseek`

Full model comparison and routing: @~/Documents/Claude Code/claude-agents/docs/operations/multi-model-reference.md

## Reference Docs (load on demand)
- `~/Documents/Claude Code/claude-agents/docs/operations/mcp-servers.md` - Full MCP server details
- `~/Documents/Claude Code/claude-agents/docs/operations/multi-model-reference.md` - Model comparison, API keys, local models, automation scripts
- `~/Documents/Claude Code/claude-agents/docs/operations/workflow-patterns.md` - Tunguz research patterns
- `~/Documents/Claude Code/claude-agents/docs/operations/coaching-system.md` - Coaching system details
- `~/Documents/Claude Code/claude-agents/docs/operations/pending-sql.md` - Pending SQL migrations
- `~/Documents/Claude Code/claude-agents/ai-orchestration/` - Multi-agent orchestration configs & templates

## Session Notes
See `~/Documents/Claude Code/claude-agents/docs/session-notes.md`
