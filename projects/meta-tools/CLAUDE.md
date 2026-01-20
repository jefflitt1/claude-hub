# Meta-Tools

**Purpose:** Unified MCP server workspace consolidating multiple tools into optimized, single-purpose servers.

## Architecture

```
meta-tools/
├── l7-business/      # Supabase + n8n + GDrive routing
├── unified-browser/  # Playwright browser automation
├── unified-comms/    # Gmail (personal + L7) with smart routing
├── feedly/           # RSS aggregation (149 feeds)
├── jeff-agent/       # Personal assistant (tasks, email, calendar, habits)
├── session-context/  # Session persistence to Supabase
├── shared/           # Common utilities
└── tests/            # Integration tests
```

## MCP Server Details

| Server | Tools | Replaces |
|--------|-------|----------|
| `l7-business` | 15 | supabase-l7, n8n-mcp (for L7 ops) |
| `unified-browser` | 12 | playwright MCP, puppeteer |
| `unified-comms` | 10 | gmail (personal), gmail (L7) |
| `feedly` | 10 | N/A (new) |
| `jeff-agent` | 45+ | N/A (new) |
| `session-context` | 10 | memory (for session state) |

## Development

### Setup
```bash
cd ~/Documents/Claude\ Code/claude-agents/projects/meta-tools
npm install
```

### Build All Servers
```bash
npm run build:all
```

### Run Individual Server (Dev)
```bash
cd l7-business && npm run dev
cd unified-comms && npm run dev
cd unified-browser && npm run dev
```

### Test
```bash
npm test                    # All tests
npm run test:integration    # Integration tests only
```

## Adding New MCP Server

1. Create workspace directory with `package.json`
2. Add to root `package.json` workspaces array
3. Implement in `src/index.ts` using `@modelcontextprotocol/sdk`
4. Add to Claude Code MCP config (`~/.claude.json`)
5. Document in this file

## Configuration

All servers read from environment variables. See `~/.claude/.env.secrets.template` for required vars.

### Server-Specific Configs

| Server | Required Vars |
|--------|---------------|
| `l7-business` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `N8N_API_KEY` |
| `unified-comms` | Gmail OAuth tokens at `~/.config/unified-comms/` |
| `unified-browser` | None (uses system Playwright) |
| `feedly` | `FEEDLY_ACCESS_TOKEN` |
| `jeff-agent` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `session-context` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

## Design Principles

1. **Consolidation** - Reduce tool count, combine related functionality
2. **Smart Routing** - Auto-detect context (L7 vs personal, etc.)
3. **Caching** - Reduce API calls with intelligent caching
4. **Type Safety** - Full TypeScript with Zod validation
5. **Consistent Patterns** - All servers follow same structure

## Related

- Main CLAUDE.md: `~/CLAUDE.md`
- Claude Hub: `~/Documents/Claude Code/claude-agents/CLAUDE.md`
- Session notes: `~/Documents/Claude Code/claude-agents/docs/session-notes.md`
