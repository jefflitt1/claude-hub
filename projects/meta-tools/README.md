# Unified Meta-Tools v2.0.0

Self-contained MCP servers that consolidate fragmented tools into unified, stateful interfaces with direct API integration. Built based on Tunguz research showing 41% token reduction and improved success rates.

## Architecture

```
meta-tools/
├── shared/                    # Common utilities
│   └── src/
│       ├── cache.ts           # LRU cache with TTL
│       ├── metrics.ts         # Token/cost tracking
│       └── types.ts           # Shared interfaces
├── unified-browser/           # Embedded Playwright browser automation
├── unified-comms/             # Direct Gmail API with OAuth
└── l7-business/               # Direct Supabase + n8n API calls
```

## Quick Start

```bash
# Build all packages
cd ~/Documents/Claude\ Code/claude-agents/projects/meta-tools/shared && npm install && npm run build
cd ~/Documents/Claude\ Code/claude-agents/projects/meta-tools/unified-browser && npm install && npm run build
cd ~/Documents/Claude\ Code/claude-agents/projects/meta-tools/unified-comms && npm install && npm run build
cd ~/Documents/Claude\ Code/claude-agents/projects/meta-tools/l7-business && npm install && npm run build

# Restart Claude Code to load new MCP servers
```

## Meta-Tools

### unified-browser (v2.0.0)

**Self-contained** browser automation with embedded Playwright.

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to URL with page load waiting |
| `browser_click` | Click element by CSS selector |
| `browser_type` | Type text into element |
| `browser_screenshot` | Capture screenshot (viewport or element) |
| `browser_snapshot` | Get accessibility tree |
| `browser_wait` | Wait for element to appear |
| `browser_evaluate` | Execute JavaScript on page |
| `browser_content` | Get page text content |
| `browser_close` | Close browser session |
| `browser_info` | Get browser status |

**Features:**
- Embedded Chromium (auto-installed via postinstall)
- Persistent browser session across calls
- No external MCP dependencies

### unified-comms (v2.0.0)

**Self-contained** Gmail integration with OAuth and smart routing.

| Tool | Description |
|------|-------------|
| `message_send` | Send email with auto account routing |
| `message_list` | List recent messages from accounts |
| `message_search` | Search across accounts (Gmail syntax) |
| `message_get` | Get full message details |
| `contact_resolve` | Resolve identifier to email |
| `comms_oauth_setup` | Set up OAuth for an account |
| `comms_info` | Get configuration and status |

**Routing Logic:**
1. Explicit account → use that account
2. Recipient domain matches L7 → use L7 account
3. Content has L7 keywords → use L7 account
4. Default → personal account

**OAuth Setup Required:**
```bash
# 1. Create credentials directory
mkdir -p ~/.config/unified-comms

# 2. Get OAuth credentials from Google Cloud Console:
#    - Create project at https://console.cloud.google.com
#    - Enable Gmail API
#    - Create OAuth 2.0 credentials (Desktop app)
#    - Download JSON and save as:
cp ~/Downloads/client_secret_*.json ~/.config/unified-comms/oauth-credentials.json

# 3. Restart Claude Code, then use the tool:
#    comms_oauth_setup(account="personal")
#    - Open the provided URL in browser
#    - Authenticate and copy the code
#    comms_oauth_setup(account="personal", authorizationCode="<code>")
#
# 4. Repeat for L7 account if needed
```

### l7-business (v2.0.0)

**Self-contained** L7 Partners operations with direct API calls and caching.

| Tool | Description | Cache TTL |
|------|-------------|-----------|
| `l7_query` | Query Supabase | 1 minute |
| `l7_insert` | Insert row | - |
| `l7_update` | Update rows | - |
| `l7_delete` | Delete rows | - |
| `l7_sql` | Execute SQL | - |
| `l7_list_tables` | List tables | 1 minute |
| `l7_workflow_trigger` | Trigger n8n webhook | - |
| `l7_list_workflows` | List n8n workflows | 10 minutes |
| `l7_get_workflow` | Get workflow details | 10 minutes |
| `l7_list_executions` | List recent executions | - |
| `l7_doc_search` | Search Drive (routes to gdrive-L7) | 5 minutes |
| `l7_info` | Get status/cache stats | - |
| `l7_clear_cache` | Clear caches | - |

**Self-Contained Services:**
- ✅ Supabase - Direct client SDK
- ✅ n8n - Direct REST API calls
- ⏳ Google Drive - Routes to gdrive-L7 (OAuth complexity)

## Configuration

MCP servers are registered in `~/.claude.json`:

```json
{
  "mcpServers": {
    "unified-browser": {
      "type": "stdio",
      "command": "node",
      "args": ["~/Documents/Claude Code/claude-agents/projects/meta-tools/unified-browser/dist/index.js"]
    },
    "unified-comms": {
      "type": "stdio",
      "command": "node",
      "args": ["~/Documents/Claude Code/claude-agents/projects/meta-tools/unified-comms/dist/index.js"],
      "env": {
        "PERSONAL_EMAIL": "jglittell@gmail.com",
        "L7_EMAIL": "jeff@jglcap.com",
        "DEFAULT_ACCOUNT": "personal",
        "L7_DOMAINS": "jglcap.com,l7-partners.com",
        "L7_KEYWORDS": "property,tenant,lease,rent,maintenance,l7,jgl capital",
        "GMAIL_CREDENTIALS_DIR": "~/.config/unified-comms",
        "GOOGLE_CREDENTIALS_PATH": "~/.config/unified-comms/oauth-credentials.json"
      }
    },
    "l7-business": {
      "type": "stdio",
      "command": "node",
      "args": ["~/Documents/Claude Code/claude-agents/projects/meta-tools/l7-business/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://donnmhbwhpjlmpnwgdqr.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "...",
        "N8N_URL": "https://n8n.l7-partners.com",
        "N8N_API_KEY": "..."
      }
    }
  }
}
```

## Self-Contained vs Routing

| Meta-Tool | Service | Integration |
|-----------|---------|-------------|
| unified-browser | Playwright | ✅ Embedded (self-contained) |
| unified-comms | Gmail | ✅ Direct API (OAuth required) |
| l7-business | Supabase | ✅ Direct SDK (self-contained) |
| l7-business | n8n | ✅ Direct REST API (self-contained) |
| l7-business | Google Drive | ⏳ Routes to gdrive-L7 MCP |

## Research Background

Based on Tomasz Tunguz's findings:
- Individual tools force LLMs to parse inconsistent formats
- Unified tools with state management reduce parsing friction
- Expected improvements:
  - 41% token reduction
  - 8% success rate improvement (87% → 94%)
  - 30% cache hit rates
  - 70% reduction in tool calls

## Development

```bash
# Watch mode for development
cd unified-browser && npm run dev

# Test with MCP inspector
npx @anthropic-ai/mcp-inspector node dist/index.js
```

## Version History

- **v2.0.0** - Self-contained implementations with direct API calls
  - unified-browser: Embedded Playwright
  - unified-comms: Direct Gmail API with OAuth
  - l7-business: Direct n8n REST API
- **v1.0.0** - Initial routing-based implementations
