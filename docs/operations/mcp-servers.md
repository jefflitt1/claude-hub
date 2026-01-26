# MCP Server Reference

## ⚠️ Credential Sharing Best Practices (IMPORTANT)

**All API-key based MCPs must use environment variable inheritance for cross-machine compatibility.**

### Adding a New MCP Server

1. **Identify credential type:**
   - API Key → Use env var inheritance (shareable)
   - OAuth Token → Machine-specific, store in `~/.config/`

2. **For API-key MCPs:**
   ```bash
   # Step 1: Add to ~/.zshrc on ALL machines (MacBook + Mac Studio)
   export NEW_MCP_API_KEY="your-key-here"

   # Step 2: Use empty env in .claude.json
   "new-mcp": {
     "type": "stdio",
     "command": "node",
     "args": ["/path/to/mcp.js"],
     "env": {}  // Inherits from shell
   }
   ```

3. **Update documentation:**
   - Add to `~/CLAUDE.md` MCP Credential Sharing table
   - Add to this file if needed

### Current Shared Env Vars (~/.zshrc)

| Env Var | Used By |
|---------|---------|
| `SUPABASE_URL` | l7-business, jeff-agent, session-context |
| `SUPABASE_SERVICE_ROLE_KEY` | l7-business, jeff-agent, session-context |
| `N8N_URL` | l7-business |
| `N8N_API_KEY` | l7-business |
| `FEEDLY_ACCESS_TOKEN` | feedly |

### Anti-Patterns (Don't Do This)

```json
// ❌ WRONG - hardcoded secrets, breaks on other machines
"my-mcp": {
  "env": {
    "API_KEY": "sk-1234567890"
  }
}

// ❌ WRONG - machine-specific paths without env vars
"my-mcp": {
  "env": {
    "CONFIG_PATH": "/Users/jeff-probis/specific/path"
  }
}
```

---

## Unified Meta-Tools (Mac - Custom)
Built for 41% token reduction and improved success rates.

### unified-browser
Consolidates playwright + puppeteer with smart routing.
- Tools: browser_navigate, browser_click, browser_type, browser_screenshot, browser_snapshot, browser_session, browser_info

### unified-comms
Consolidates gmail accounts with auto-routing.
- Tools: message_send, message_list, message_search, contact_resolve, comms_info

### l7-business
Consolidates supabase + gdrive-l7 + n8n with caching.
- Tools: l7_query, l7_insert, l7_update, l7_delete, l7_sql, l7_list_tables, l7_workflow_trigger, l7_list_workflows, l7_doc_search, l7_info, l7_clear_cache

---

## Mac (Claude Desktop) - DEPRECATED SECTION
> **Note:** This section is outdated. See `~/CLAUDE.md` for current MCP server configuration.
> n8n-mcp has been consolidated into l7-business. Gmail consolidated into unified-comms.

| Server | Purpose | Status |
|--------|---------|--------|
| ~~n8n-mcp~~ | ~~Workflow automation~~ | Replaced by l7-business |
| ~~gmail~~ | ~~jglittell@gmail.com~~ | Replaced by unified-comms |
| ~~gmail-l7~~ | ~~jeff@jglcap.com~~ | Replaced by unified-comms |
| ~~supabase~~ | ~~L7 Partners DB~~ | Replaced by l7-business |
| gdrive-jgl | Personal Google Drive | Active |
| gdrive-l7 | L7 Partners Google Drive | Active |

### MCP_DOCKER Gateway
| Server | Tools | Notes |
|--------|-------|-------|
| github | 40 | PAT configured |
| memory | 9 | Knowledge graph |
| deepwiki | 3 | Repository docs |
| brave | - | Web/news/image search |
| playwright | - | Browser automation |
| puppeteer | - | Browser automation |
| supabase | 9 | L7 Partners DB |

---

## Pi (Claude Code)
- n8n-mcp, gmail, gmail-l7, github, memory, puppeteer
- gdrive-jgl, gdrive-l7 (@piotr-agier/google-drive-mcp)
- Note: Supabase MCP doesn't work on Pi (package bug)
