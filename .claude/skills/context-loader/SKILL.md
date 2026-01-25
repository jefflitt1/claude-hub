---
name: context-loader
description: Load relevant context from recent sessions and memory graph at session start. Use automatically or when user asks "what were we working on?"
allowed-tools: Read, Bash, Grep
---

# Context Loader Skill

Quickly load context from previous sessions and the memory graph to resume work seamlessly.

## Quick Reference

| Command | Action |
|---------|--------|
| `/context` | Load context for current project |
| `/context all` | Load all recent context across projects |
| `/context [project]` | Load context for specific project |

## When to Auto-Trigger

Run this skill automatically when:
- User asks "what were we working on?"
- User asks "remind me what we did last time"
- User asks about previous session or context
- Session starts after a break

## Workflow

### Step 0: Log Skill Invocation

```bash
docker mcp tools call insert_row 'table=claude_skill_usage' 'data={
  "skill_id": "context-loader",
  "command": "/context",
  "machine": "mac",
  "project_context": "PROJECT_ID",
  "success": true
}'
```

### Step 1: Query Memory Graph

Use the memory MCP to get relevant entities:

```
memory search_nodes "project_name"
memory read_graph
```

Extract:
- Project details (repos, URLs, tech stack)
- Related learnings and gotchas
- Key decisions and patterns
- Connected services and integrations

### Step 2: Query Recent Sessions

Use Supabase (via docker mcp tools call) to get recent session logs:

```bash
docker mcp tools call execute_sql "query=SELECT session_date, session_number, summary, accomplishments FROM claude_session_logs WHERE project_id = 'PROJECT_ID' ORDER BY session_date DESC, session_number DESC LIMIT 5"
```

Or for all projects:
```bash
docker mcp tools call execute_sql "query=SELECT session_date, session_number, project_id, summary FROM claude_session_logs ORDER BY created_at DESC LIMIT 10"
```

### Step 3: Check Open Tasks

Query pending tasks for the project:

```bash
docker mcp tools call execute_sql "query=SELECT title, status, priority FROM claude_tasks WHERE project_id = 'PROJECT_ID' AND status != 'completed' ORDER BY priority, created_at"
```

### Step 4: Format Context Summary

Output a concise summary:

```
CONTEXT LOADED: [Project Name]

RECENT SESSIONS
- Session 19 (Today): Built Supabase MCP Server
- Session 18 (Today): Parent-Child Hierarchy in frontend

KEY LEARNINGS
- exec_sql needs SECURITY DEFINER
- Docker MCP uses key=value format

OPEN TASKS
- [ ] Fix DNS for claude.l7-partners.com (high)
- [ ] Add usage tracking (medium)

RELATED ENTITIES
- n8n: Workflow automation at https://n8n.l7-partners.com
- Raspberry Pi: Production server at 192.168.4.147

Ready to continue!
```

## Detect Current Project

To determine current project context:

1. Check current working directory
2. Look for CLAUDE.md in current or parent directories
3. Match against known project paths:
   - `~/claude-agents/` → Claude Hub
   - `~/l7partners-rewrite/` → L7 Partners
   - `~/supabase-mcp-server/` → Supabase MCP Server
   - `~/magic.md` → Magic KB

## Example Usage

**User:** "what were we working on?"

**Response:**
```
Loading context from memory and recent sessions...

CONTEXT LOADED: Claude Hub

RECENT SESSIONS (Last 24h)
- Session 19: Built Supabase MCP Server for Docker MCP
  - Created custom MCP with 9 tools
  - Published to Docker Hub
  - Submitted PR #959 to catalog

- Session 18: Parent-Child Hierarchy
  - Added parent_id to claude_projects
  - Built hierarchical view in frontend
  - Aggregate task stats for parents

KEY LEARNINGS
- Supabase exec_sql needs SECURITY DEFINER
- Docker MCP uses key=value not JSON format
- n8n Merge v3 only supports 2 inputs

OPEN TASKS (3)
- Fix claude.l7-partners.com DNS (high)
- Test daily digest workflow (medium)
- Add claude_skills RLS policies (low)

Ready to continue where we left off!
```

## Integration with Other Skills

- Works with `/recap` - context loader reads what recap saves
- Works with Memory MCP - reads entities and relations
- Works with session_logs table - reads structured session data

## Notes

- Keep context summaries concise (under 30 lines)
- Prioritize most recent and relevant information
- Highlight blockers or urgent items
- Include links where helpful
