# MCP Server Reference

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
