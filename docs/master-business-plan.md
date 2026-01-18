# Claude Operations - Master Business Plan

**Last Updated:** 2026-01-18
**Owner:** Operations Secretary
**Review Cycle:** Monthly

---

## Executive Summary

This document serves as the master reference for all Claude-powered operations. It tracks projects, agents, skills, infrastructure, and identifies gaps for future development. This is the "single source of truth" for understanding what exists, what's in progress, and what's needed.

---

## Table of Contents

1. [Operations Overview](#operations-overview)
2. [Project Portfolio](#project-portfolio)
3. [Agent Inventory](#agent-inventory)
4. [Skills Registry](#skills-registry)
5. [Infrastructure Map](#infrastructure-map)
6. [Gap Analysis](#gap-analysis)
7. [Roadmap](#roadmap)
8. [Governance](#governance)

---

## Operations Overview

### Mission

Build and operate AI-augmented systems that automate, analyze, and enhance business operations across trading, property management, and personal productivity domains.

### Architecture Philosophy

```
┌─────────────────────────────────────────────────────────────────┐
│                     HUMAN INTERFACE LAYER                       │
│  Claude Code CLI (Mac) | Dashboards (Lovable) | Alerts (n8n)    │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                     INTELLIGENCE LAYER                          │
│  Claude Agents | Skills | Prompts | Decision Logic              │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                     INTEGRATION LAYER                           │
│  MCP Servers | APIs | n8n Workflows                             │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
│  Supabase | Google Drive | Local Files | External APIs          │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **API-First**: Query live data, don't warehouse redundantly
2. **Automation-Forward**: If it can be automated, it should be
3. **Documentation-Driven**: Every decision documented, every process recorded
4. **Defense First**: Risk management before opportunity
5. **Modular Design**: Reusable agents, skills, and components

---

## Project Portfolio

### Active Projects

| Project | Domain | Status | Dashboard | Repository |
|---------|--------|--------|-----------|------------|
| **Claude Hub** | Meta/Operations | Active | claude.l7-partners.com | claude-agents (root) |
| **JGL Capital** | Trading | Active | jglcap.l7-partners.com (planned) | claude-agents/projects/jgl-capital |
| **L7 Partners** | Property Mgmt | Active | l7-partners.com | claude-agents/projects/l7partners-rewrite |
| **Supabase MCP** | Infrastructure | Maintenance | N/A | claude-agents/projects/supabase-mcp-server |
| **Magic Agent** | Personal KB | Active | N/A | ~/magic.md (standalone) |

### Project Details

#### Claude Hub
- **Purpose**: Central dashboard and knowledge graph for all Claude operations
- **Tech**: Lovable (React), Supabase, n8n
- **Owner**: Operations
- **Key Features**: Project tracking, agent registry, workflow inventory, MCP server status
- **Docs**: `CLAUDE.md`, `README.md`

#### JGL Capital
- **Purpose**: Systematic trend-following trading system
- **Tech**: TradeStation, EasyLanguage, Python, Supabase
- **Owner**: CIO Agent + Team (7 agents)
- **Key Features**: 3-sleeve portfolio, automated signals, circuit breakers
- **Docs**: `projects/jgl-capital/docs/business-plan.md`
- **Strategic Decisions**: `projects/jgl-capital/docs/strategic-decisions.md`

#### L7 Partners
- **Purpose**: Property management platform
- **Tech**: TMS integration, AI chatbot, tenant portal
- **Owner**: Operations
- **Key Features**: Tenant management, maintenance requests, financial tracking
- **Docs**: `projects/l7partners-rewrite/`

#### Supabase MCP
- **Purpose**: Custom MCP server for Supabase database access
- **Tech**: Node.js, MCP protocol
- **Owner**: Data/Infrastructure
- **Key Features**: Table queries, inserts, updates, SQL execution
- **Note**: Works on Mac, has issues on Raspberry Pi

#### Magic Agent
- **Purpose**: Personal knowledge base and quick reference
- **Tech**: Markdown
- **Owner**: Personal
- **Docs**: `~/magic.md`

---

## Agent Inventory

### Global Agents (Cross-Project)

| Agent | Scope | Purpose |
|-------|-------|---------|
| **Operations Secretary** | All Projects | Master documentation, cross-project coordination |

### JGL Capital Agents

| Agent | File | Purpose |
|-------|------|---------|
| CIO | `.claude/agents/cio.md` | Strategic oversight, final decisions |
| Trading | `.claude/agents/trading.md` | Entry/exit analysis, execution |
| Portfolio | `.claude/agents/portfolio.md` | Risk management, allocation |
| Psychology | `.claude/agents/psychology.md` | Behavioral discipline |
| Quant | `.claude/agents/quant.md` | Systems development, backtesting |
| Data | `.claude/agents/data.md` | API integration, data pipelines |
| Secretary | `.claude/agents/secretary.md` | JGL-specific documentation |

### L7 Partners Agents

| Agent | Purpose | Status |
|-------|---------|--------|
| TBD | Property operations | Not yet defined |

### Agent Gaps Identified

| Gap | Project | Priority | Notes |
|-----|---------|----------|-------|
| Property Manager Agent | L7 Partners | Medium | Handle tenant/maintenance logic |
| Research Agent | JGL Capital | Low | External research, news analysis |
| Compliance Agent | JGL Capital | Low | Regulatory tracking |

---

## Skills Registry

### Active Skills

| Skill | Trigger | Project | Purpose |
|-------|---------|---------|---------|
| recap | `/recap` | Global | Auto-detect session accomplishments |
| recap merge | `/recap merge` | Global | Consolidate session logs |
| recap status | `/recap status` | Global | Show pending logs |
| context-loader | `/context` | Global | Load recent session context |
| done | `/done` | Global | End session with recap and commit |
| n8n | `/n8n` | Global | n8n workflow management |
| n8n-setup | `/n8n-setup` | Global | Configure n8n API access |
| guide | `/guide` | Global | System setup assistance |
| workflow-coach | Proactive | Global | Workflow optimization suggestions |
| deal-analysis | `/deal` | L7 Partners | CRE deal screening |
| frontend-design | `/frontend` | Global | UI component generation |

### Skill Gaps Identified

| Gap | Project | Priority | Notes |
|-----|---------|----------|-------|
| /morning-brief | JGL Capital | High | Daily pre-market review |
| /analyze-trade | JGL Capital | Medium | Post-trade analysis |
| /strategy-review | JGL Capital | Medium | Comprehensive strategy assessment |
| /backtest | JGL Capital | Medium | Run backtest analysis |
| /tenant-status | L7 Partners | Medium | Tenant portfolio overview |

---

## Infrastructure Map

### MCP Servers

| Server | Status | Purpose | Projects |
|--------|--------|---------|----------|
| n8n-mcp | Active | Workflow automation | All |
| gmail | Active | Email (jglittell@gmail.com) | All |
| gmail-l7 | Active | Email (jeff@jglcap.com) | L7 Partners |
| supabase | Active (Mac only) | Database access | All |
| gdrive-JGL | Active | Google Drive (personal) | JGL Capital |
| gdrive-L7 | Active | Google Drive (L7) | L7 Partners |
| github | Active | Repository access | All |
| memory | Active | Knowledge graph | All |
| brave | Active | Web search | All |
| playwright | Active | Browser automation | All |
| tradestation_mcp | Pending | Trading API | JGL Capital |
| alpaca-mcp-server | Backup | Trading API fallback | JGL Capital |

### Databases

| Database | Platform | Purpose | Projects |
|----------|----------|---------|----------|
| Supabase (donnmhbwhpjlmpnwgdqr) | Cloud | Primary data store | All |
| Local SQLite | Mac | Development/testing | As needed |

### Supabase Tables by Project

**Claude Hub:**
- `n8n_workflows` - Workflow inventory
- `workflow_categories` - Categorization
- `claude_projects` - Project registry
- `claude_agents` - Agent definitions
- `claude_skills` - Skill registry

**JGL Capital:**
- `jgl_symbols` - Universe watchlist
- `jgl_positions` - Current positions
- `jgl_trades` - Trade history
- `jgl_signal_states` - TrendQual signals
- `jgl_portfolio_snapshots` - Daily snapshots
- `jgl_price_data` - Historical OHLC
- `jgl_backtests` - Backtest results

**L7 Partners:**
- TBD - Property/tenant tables

### Automation (n8n)

| Workflow Category | Count | Purpose |
|-------------------|-------|---------|
| Data Sync | ~5 | GitHub → Supabase, API syncs |
| Alerts | ~3 | Email/Slack notifications |
| Scheduled Tasks | ~4 | Daily/weekly automations |
| Webhooks | ~2 | External integrations |

### Hosting

| Service | Platform | URL |
|---------|----------|-----|
| Claude Hub Dashboard | Cloudflare (Lovable) | claude.l7-partners.com |
| JGL Dashboard | Cloudflare (Lovable) | jglcap.l7-partners.com (planned) |
| L7 Partners | Cloudflare | l7-partners.com |
| n8n | Raspberry Pi | n8n.l7-partners.com |

---

## Gap Analysis

### High Priority Gaps

| Gap | Category | Impact | Effort | Target |
|-----|----------|--------|--------|--------|
| TradeStation API credentials | JGL Capital | Blocks all trading automation | Low (waiting) | TBD |
| JGL Dashboard | JGL Capital | No visibility into positions | Medium | Q1 2026 |
| /morning-brief skill | JGL Capital | Manual pre-market review | Low | Post-API |
| Circuit breaker automation | JGL Capital | Risk management manual | Medium | Post-API |

### Medium Priority Gaps

| Gap | Category | Impact | Effort |
|-----|----------|--------|--------|
| L7 Partners agent team | L7 Partners | No AI assistance | High |
| Backtest validation framework | JGL Capital | Can't verify Python vs EL | Medium |
| Cross-project reporting | Operations | No unified view | Medium |

### Low Priority Gaps

| Gap | Category | Notes |
|-----|----------|-------|
| Mobile alerts app | JGL Capital | SMS/Slack sufficient for now |
| Multi-account support | JGL Capital | Single account currently |
| Supabase MCP on Pi | Infrastructure | Workaround exists |

---

## Roadmap

### Q1 2026

| Initiative | Project | Status | Owner |
|------------|---------|--------|-------|
| TradeStation API integration | JGL Capital | Blocked - awaiting credentials | Data Agent |
| Position sync automation | JGL Capital | Ready when API available | Data Agent |
| Circuit breaker implementation | JGL Capital | Pending | Quant Agent |
| JGL Dashboard MVP | JGL Capital | Not started | Data Agent |
| Daily email digest | JGL Capital | Not started | Data Agent |

### Q2 2026

| Initiative | Project | Status | Owner |
|------------|---------|--------|-------|
| Backtest validation | JGL Capital | Not started | Quant Agent |
| Universe population automation | JGL Capital | Not started | Data Agent |
| L7 agent team definition | L7 Partners | Not started | Operations |
| Cross-project dashboard | Claude Hub | Not started | Operations |

### Future Backlog

- EasyLanguage → Python migration assessment
- Tax lot optimization
- Research agent for market news
- Voice interface for quick updates

---

## Governance

### Documentation Standards

See `docs/documentation-best-practices.md` for full standards.

**Key Rules:**
- Every project has a CLAUDE.md
- Every project has a business-plan.md
- All decisions logged in strategic-decisions.md
- Session recaps run automatically
- Git commits after significant work

### Review Cycles

| Document | Frequency | Owner |
|----------|-----------|-------|
| Master Business Plan | Monthly | Operations Secretary |
| Project Business Plans | Monthly | Project Secretary |
| Strategic Decisions | As needed | CIO (per project) |
| Gap Analysis | Quarterly | Operations |
| Roadmap | Quarterly | Operations |

### Amendment Process

1. Identify change needed
2. Draft proposal with rationale
3. Review with relevant stakeholders
4. Update document with version note
5. Commit to git
6. Push to GitHub

---

## Document References

### Master Level (This Repo Root)
| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Claude Hub project overview |
| `README.md` | Repository documentation |
| `docs/master-business-plan.md` | This document |
| `docs/documentation-best-practices.md` | Standards guide |
| `docs/session-notes.md` | Running session log |

### Project Level
| Project | Key Doc |
|---------|---------|
| JGL Capital | `projects/jgl-capital/docs/business-plan.md` |
| L7 Partners | `projects/l7partners-rewrite/` (TBD) |

### Data Files
| File | Purpose |
|------|---------|
| `data/projects.json` | Project registry (syncs to Supabase) |
| `data/agents.json` | Agent definitions (syncs to Supabase) |
| `data/skills.json` | Skill registry (syncs to Supabase) |
| `data/mcp-servers.json` | MCP server inventory |

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-18 | 1.0 | Initial master business plan |
