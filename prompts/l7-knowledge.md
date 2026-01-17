# L7 Partners Knowledge Base

## Company Overview

**L7 Partners** is a commercial real estate investment company specializing in industrial properties in the Northeast United States.

### Focus Areas
- Shallow-bay industrial properties (20,000 - 150,000 SF)
- Multi-tenant industrial parks
- Value-add opportunities with below-market rents
- Markets with strong demographics and limited new supply
- Northeast US markets: NJ, PA, NY, CT, MA

### Business Domains

| Domain | Description |
|--------|-------------|
| Property Management | Day-to-day operations, tenant relations, maintenance |
| Acquisitions | Deal sourcing, underwriting, due diligence, closing |
| Asset Management | Business plan execution, capital improvements, NOI optimization |
| Investor Relations | LP communications, distributions, reporting |
| Leasing | Tenant procurement, lease negotiations, renewals |

## Platform Architecture

### L7 Partners Platform (l7partners-rewrite)

**URL:** https://l7-partners.com
**Repo:** https://github.com/jefflitt1/l7partners-rewrite

#### Tech Stack
- **Frontend:** React + Vite + TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Hosting:** Lovable/Cloudflare

#### Core Modules

| Module | Path | Description |
|--------|------|-------------|
| TMS | `/tms/*` | Tenant Management System for admin operations |
| Portal | `/portal/*` | Tenant self-service portal |
| Claude Catalog | `/claude-catalog` | AI agent dashboard |
| AI Chatbot | Widget | Admin assistant via n8n webhook |

### Database Schema

**Property Management Tables:**
- `profiles` - User accounts and roles
- `properties` - Property details and addresses
- `units` - Individual tenant spaces
- `tenants` - Tenant company information
- `leases` - Lease terms and dates
- `maintenance_requests` - Work orders and status
- `payments` - Rent and fee tracking
- `documents` - File storage references

**Claude Hub Tables (in Supabase):**
- `claude_projects` - Project tracking
- `claude_agents` - Agent definitions
- `claude_skills` - Skill registry
- `claude_mcp_servers` - MCP server configs
- `claude_prompts` - System prompts
- `claude_workflows` - n8n workflow references

## AI Integration

### L7 Chatbot
**Webhook:** `https://webhooks.l7-partners.com/webhook/29b8d0ff-ccf3-439e-a4b6-e4858f5809b0`

The chatbot widget in the TMS admin interface connects to an n8n workflow that:
1. Receives user questions
2. Queries relevant TMS data from Supabase
3. Sends context + question to Claude API
4. Returns formatted response

### Available Agents

| Agent | Type | Purpose |
|-------|------|---------|
| L7 Codebase Agent | codebase | Direct editing of React codebase |
| L7 Chatbot Agent | webhook | AI assistant for TMS admins |
| L7 Designer | consultant | Brand identity and UI/UX guidance |
| L7 Real Estate Consultant | consultant | Market insights and best practices |
| L7 Deals Agent | consultant | Underwriting and deal analysis |
| L7 Investor Relations Agent | consultant | LP communications |
| L7 Document Agent | processor | Document data extraction |

## Automation & Workflows

### n8n Instance
**URL:** https://n8n.l7-partners.com
**Webhooks:** https://webhooks.l7-partners.com

### Active Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| L7 Chatbot | Webhook | Process admin chat queries |
| GitHub-Supabase Sync | GitHub webhook | Sync project data to Supabase |
| n8n Health Check | Schedule | Verify system status |

## MCP Servers

### Available Integrations

| Server | Purpose | Status |
|--------|---------|--------|
| n8n-mcp | Workflow automation | Active |
| gdrive-JGL | Personal Google Drive | Active |
| gdrive-L7 | L7 Partners Google Drive | Active |
| supabase-l7 | L7 database access | Active (Mac only) |
| gmail | Personal email | Active |
| gmail-l7 | L7 business email | Active |
| github | Repository access | Active |

## Investment Criteria

### Target Property Profile

| Metric | Target Range |
|--------|--------------|
| Property Size | 20,000 - 150,000 SF |
| Building Age | 1970s - 2000s (value-add) |
| Clear Height | 16' - 24' minimum |
| Occupancy | 70% - 95% (upside potential) |
| Price per SF | $75 - $175 |
| Cap Rate (Going-In) | 7.0% - 9.5% |

### Return Targets

| Metric | Target |
|--------|--------|
| Cash-on-Cash (Year 1) | 6% - 8% |
| Average Annual Cash-on-Cash | 8% - 12% |
| IRR (5-year hold) | 15% - 20% |
| Equity Multiple | 1.8x - 2.2x |

### Deal Killers
- Environmental contamination (Phase I red flags)
- Deferred maintenance > 15% of purchase price
- Single-tenant with < 3 years remaining
- Markets with > 10% vacancy
- Functional obsolescence (low clear height, poor truck access)

## Key Integrations

### External Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| QuickBooks | Accounting | Manual export |
| Google Drive (L7) | Document storage | MCP gdrive-L7 |
| Google Sheets | Spreadsheets | MCP gdrive-L7 |
| CoStar | Market data | Manual reference |
| Supabase | Database | Direct API + MCP |

### Development Workflow

1. **Design/Layout** - Use Lovable for visual changes
2. **Logic/Bugs** - Claude Code direct editing
3. **Sync** - Push changes, Lovable auto-syncs
4. **Deploy** - Automatic via Lovable/Cloudflare

## File Locations

| Resource | Path |
|----------|------|
| L7 Platform Codebase | `~/l7partners-rewrite/` |
| Claude Hub | `~/claude-agents/` |
| Magic Knowledge | `~/magic.md` |
| L7 Deals Prompt | `~/claude-agents/prompts/l7-deals.md` |
| Session Notes | `~/claude-agents/docs/session-notes.md` |

## Common Tasks

### For TMS Admins
- View tenant information
- Process maintenance requests
- Review payment history
- Generate reports
- Ask AI assistant questions

### For Developers
- Fix bugs in React components
- Add new TMS features
- Update Supabase integrations
- Configure n8n workflows
- Manage Claude agents

### For Acquisitions
- Quick deal screening
- Pro forma modeling
- Comparable analysis
- Due diligence tracking
- Investment memo drafting
