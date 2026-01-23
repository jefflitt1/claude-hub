# Claude Memory

## Active Projects

| Project | Path | Description |
|---------|------|-------------|
| **Claude Hub** | `~/Documents/Claude Code/claude-agents/` | AI agent dashboard |
| **JGL Capital** | `~/Documents/Claude Code/claude-agents/projects/jgl-capital/` | Trading system |
| **L7 Partners** | `~/Documents/Claude Code/claude-agents/projects/l7partners-rewrite/` | Property management |
| **Meta-Tools** | `~/Documents/Claude Code/claude-agents/projects/meta-tools/` | Unified MCP servers |
| **Magic KB** | `~/magic.md` | Magic knowledge base |

## Quick Reference

### Key Skills
| Skill | Purpose |
|-------|---------|
| `/jeff` | Personal assistant (email triage, tasks, projects) |
| `/reading` | Feedly articles by category (markets, cre, learn) |
| `/consult` | Multi-model collaboration (Gemini, Codex second opinions) |
| `/context` | Load session context from Memory MCP |
| `/recap` | Save session progress |
| `/done` | End session (recap + commit) |
| `/deal-analysis` | CRE deal screening |
| `/n8n` | Manage n8n workflows |

### Core MCP Servers (Consolidated)
| Server | Purpose | Replaces |
|--------|---------|----------|
| **l7-business** | Supabase + n8n + GDrive routing | supabase-l7, n8n-mcp (for L7 ops) |
| **unified-comms** | Email with smart routing | gmail, gmail-l7 |
| **unified-browser** | Browser automation | playwright, puppeteer |
| **jeff-agent** | Task tracking, email threads | - |
| **session-context** | Session persistence, auto-context | memory (for session state) |
| **feedly** | RSS aggregation (149 feeds) | - |
| **sequential-thinking** | Enhanced multi-step reasoning | - |
| **context7** | Documentation indexing & retrieval | - |
| **apple-notes** | Apple Notes read/write/search/update (semantic) | - |
| **memory** | Knowledge graph (entities, relations, observations) | MCP_DOCKER |
| **tavily** | Deep research with citations (login: GitHub) | Brave search |
| **desktop-commander** | File ops, streaming search, PDF, processes | - |
| **deepwiki** | GitHub repo Q&A | - |
| **gemini-cli** | Google Gemini via OAuth (uses Gemini Advanced sub) | - |
| **codex-cli** | OpenAI Codex/GPT-5 via OAuth (uses ChatGPT Plus sub) | - |
| **grok-cli** | xAI Grok 4 with real-time X/Twitter access | - |
| **deepseek-cli** | DeepSeek R1/V3 (cheap reasoning, local option) | - |
| **imessage** | Apple Messages read/send via AppleScript | - |

**Redundant (keep as fallbacks):**
- `supabase-l7` (HTTP) - fallback only, use `l7-business`
- `n8n-mcp` (npx) - use `l7-business` for n8n ops
- `MCP_DOCKER playwright/puppeteer` - use `unified-browser`

### Specialized Subagents
| Agent | Purpose | Access |
|-------|---------|--------|
| `l7-analyst` | L7 property data analysis & reports | Read-only Supabase, GDrive |
| `trading-researcher` | Market research, Feedly Markets, quotes | Read-only TradeStation, Feedly |
| `email-drafter` | Draft responses, triage inbox | Read email, draft only (no send) |
| `code-reviewer` | Security & quality code review | Read-only file access |

**Usage**: "Use l7-analyst to query property data" or spawn via Task tool with `subagent_type`.

### Multi-Model Collaboration (5 Models)
Use these for second opinions, alternative approaches, and leveraging each model's strengths.

#### Model Strengths Comparison
> **Last Updated:** 2026-01-21 | **Update Frequency:** Weekly (Mondays) | **Reminder:** jeff-agent recurring task

| Capability | Claude Opus 4.5 | Gemini 2.5 Pro | GPT-5.2 Codex | Grok 4 | DeepSeek R1/V3 |
|------------|-----------------|----------------|---------------|--------|----------------|
| **Context Window** | 200K | **1M tokens** | 256K | 128K | 128K |
| **Reasoning** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (R1) |
| **Coding** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Security** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Multimodal** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Real-time Data** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Cost (per 1M tokens)** | $15/$75 | Free tier | Plus sub | $2/$10 | **$0.14/$0.28** |

#### When to Use Each Model

| Task | Best Model | Why |
|------|------------|-----|
| **Planning & architecture** | Claude | Deep reasoning, maintains context across steps |
| **Full codebase analysis** | Gemini | 1M token window fits entire repos |
| **Large refactors/migrations** | Codex | Long-horizon work, maintains invariants |
| **Security review** | Claude + Codex | Both excel at vulnerability detection |
| **Document/research synthesis** | Gemini | Multimodal, handles massive docs |
| **UI/frontend development** | Gemini | Aesthetic web development strength |
| **Debugging complex issues** | Claude | Superior multi-step reasoning |
| **Code review (second opinion)** | Codex | Fresh perspective, different patterns |
| **Video/audio analysis** | Gemini | Native multimodal |
| **Agentic workflows** | Claude | Best tool orchestration |
| **Real-time X/Twitter context** | Grok | Only model with live X access |
| **Current events/news** | Grok | Real-time information retrieval |
| **Bulk reasoning tasks** | DeepSeek R1 | 10x cheaper than GPT-4, excellent reasoning |
| **Cost-sensitive coding** | DeepSeek V3 | GPT-4 quality at 1/10th cost |
| **Math/logic problems** | DeepSeek R1 | Chain-of-thought reasoning specialization |

#### Model-Specific Sweet Spots

**Claude Opus 4.5** - Your primary workhorse:
- Complex multi-step tasks requiring planning
- Tool orchestration and agentic workflows
- Security engineering and exploit analysis
- Tasks requiring maintained context over long sessions

**Gemini 2.5 Pro** - Consult for:
- Analyzing entire codebases at once (1M context)
- Research synthesis from large document sets
- Multimodal tasks (images, video, audio)
- Web/UI development with aesthetic focus
- When you need a "big picture" view

**GPT-5.2 Codex** - Consult for:
- Major refactoring projects
- Code migrations and large feature builds
- Security vulnerability scanning
- Alternative implementation approaches
- When Claude's approach isn't working

**Grok 4** - Consult for:
- Real-time X/Twitter analysis and sentiment
- Current events requiring live data
- Social media trend analysis
- News-driven market research
- When you need "what's happening right now"

**DeepSeek R1/V3** - Consult for:
- Bulk reasoning at low cost (10x cheaper)
- Math and logic-heavy problems (R1 excels)
- Cost-sensitive batch processing
- Local inference for sensitive data (via Ollama)
- When budget matters but quality can't suffer

**Example prompts:**
- "Ask Gemini to analyze the entire codebase and identify architectural issues"
- "Get Codex's opinion on this authentication implementation"
- "Have Gemini synthesize these 5 research papers into actionable insights"
- "Consult Codex for a security review of this API endpoint"
- "Ask Gemini to review this video for UI/UX issues"
- "Ask Grok what's trending on X about this topic"
- "Use DeepSeek R1 to solve this math optimization problem"
- "Run this bulk analysis through DeepSeek to save on API costs"

#### API Keys & Config
| Model | Config Location | Status |
|-------|-----------------|--------|
| Gemini | OAuth (`gemini` CLI) | ✅ Active |
| Codex | OAuth (`codex login`) | ✅ Active |
| Grok | `~/.config/grok-cli/config.json` | ✅ Configured |
| DeepSeek | `~/.config/deepseek/config.json` | ✅ Configured |

#### Local Models (Ollama - 32GB Mac Studio)
| Model | Size | RAM | Use Case |
|-------|------|-----|----------|
| `deepseek-r1:14b` | 14B | ~10GB | Fast reasoning, fits easily |
| `deepseek-r1:32b` | 32B | ~20GB | Best local reasoning |
| `llama3.3:latest` | 70B | ~28GB | General purpose, tight fit |
| `gemma3:27b` | 27B | ~18GB | Vision-capable local |

**Install Ollama:** `brew install ollama && ollama serve`

### Headless Automation Scripts
Located in `~/.claude/scripts/`:

| Script | Purpose | Usage |
|--------|---------|-------|
| `morning-digest.sh` | Feedly summary to Telegram | `./morning-digest.sh [--dry-run] [--email]` |
| `claude-automate.sh` | General automation wrapper | `claude-automate <preset> [--dry-run]` |

**Presets for claude-automate:**
- `digest` - Morning Feedly digest
- `inbox-triage` - Email triage with priorities
- `portfolio` - L7 portfolio status
- `market-scan` - Quick market overview

**Cron examples:** `~/.claude/scripts/cron-examples.txt`

### Feedly Category Mapping
| Category | Feeds | Project | Auto-Surface When |
|----------|-------|---------|-------------------|
| Markets | 33 | jgl-capital | Trading research, strategy work |
| Real Estate | 58 | l7-partners | Deal analysis, market research |
| Other | 37 | claude-hub | Workflow optimization, learning |
| Local | 16 | personal | Family planning, CT/NY news |
| Sports | 5 | personal | Leisure reading |

**Reading Workflow:**
- `feedly_all_articles(count=10, unreadOnly=true)` - Top unread
- `feedly_stream(streamId=<category_id>)` - Category-specific
- `feedly_save_for_later(entryId)` - Bookmark for later
- `/reading` - Quick access skill

## Coaching Behaviors

**Interject when:**
- Same task done 2+ times → suggest `/command`
- Complex task → suggest Plan Mode
- Session ending → run `/recap`
- Context heavy (30+ turns) → suggest `/compact`
- Starting L7/CRE work → "X unread CRE articles. `/reading cre`?"
- Starting JGL/trading work → "X unread Markets articles. `/reading markets`?"
- Learning/optimization discussion → mention `/reading learn` if relevant

**Don't interject when:**
- User in flow state
- Simple task
- < 5 minutes into session

## Multi-Model Thinking (IMPORTANT)

**Proactively consider `/consult` for these situations:**

| Situation | Action |
|-----------|--------|
| Analyzing large codebase (>50 files) | `/consult gemini` - 1M context advantage |
| Security-sensitive code (auth, API, input handling) | `/consult security` or `/consult codex` |
| Architecture/design decisions | `/consult arch-review` for multiple perspectives |
| Stuck on implementation approach | `/consult second-opinion` |
| Large refactor or migration | `/consult codex` - long-horizon strength |
| Research synthesis needed | `/consult gemini` - multimodal research |
| Code review before merge | `/consult codex` - fresh eyes |
| UI/frontend aesthetic review | `/consult gemini` - web design strength |

**Mental checklist before complex tasks:**
1. Would a 1M context window help? → Gemini
2. Is this security-sensitive? → Codex
3. Am I uncertain about the approach? → Second opinion
4. Is this a major architectural decision? → Full arch-review

**Don't hesitate to consult** - the models are available and specialized. Using them is a strength, not a weakness.

## Reference Docs (load on demand)
- `~/Documents/Claude Code/claude-agents/docs/operations/mcp-servers.md` - Full MCP server details
- `~/Documents/Claude Code/claude-agents/docs/operations/workflow-patterns.md` - Tunguz research patterns
- `~/Documents/Claude Code/claude-agents/docs/operations/coaching-system.md` - Coaching system details
- `~/Documents/Claude Code/claude-agents/docs/operations/pending-sql.md` - Pending SQL migrations
- `~/Documents/Claude Code/claude-agents/ai-orchestration/` - Multi-agent orchestration configs & templates
- `~/Documents/Claude Code/claude-agents/GEMINI.md` - Gemini CLI context file
- `~/Documents/Claude Code/claude-agents/AGENTS.md` - Codex CLI context file

## Future Enhancements
- **n8n Feedly Digest** - Automated 6:30am email with top articles by category (requires Feedly API credential in n8n)
- **saved_articles table** - Supabase table for article archiving if `/reading` usage warrants persistence
- **Article-to-task associations** - Link saved articles to projects/tasks in jeff-agent
- **L7 Vendor Network (HomeAdvisor-style)** - Contractor/vendor management system for L7 properties:
  - Vendor database with ratings, specialties, service areas, pricing tiers
  - Work order creation → auto-match to qualified vendors → quote requests
  - Vendor performance tracking (response time, quality scores, cost history)
  - Tenant request intake → triage → vendor dispatch workflow
  - Integration with L7 Supabase (properties, units, maintenance_requests tables)
  - Potential n8n workflows: new request → vendor matching → quote collection → approval → scheduling

## API Credentials (MCP Docker Secrets)
| Service | Key Location | Login Method |
|---------|--------------|--------------|
| **Tavily** | `docker mcp secret` / MCP URL | GitHub OAuth |
| **Gemini CLI** | OAuth token | Google account (Gemini Advanced) |
| **Codex CLI** | OAuth token | ChatGPT account (Plus/Pro) |

**Tavily MCP URL:** `https://mcp.tavily.com/mcp/?tavilyApiKey=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`

**Re-authenticate CLIs if needed:**
- Gemini: `gemini` (opens browser)
- Codex: `codex login` (opens browser)

## Session Notes
See `~/Documents/Claude Code/claude-agents/docs/session-notes.md`
