# Telegram Bot System

**Created:** 2026-01-19
**Updated:** 2026-01-21
**Status:** Active
**Master Workflow ID:** `stlQoP2huGVmGzRS`

---

## Overview

A unified system where multiple Telegram bots share a single n8n workflow, with project-specific context injected dynamically from Supabase before each Claude API call. Supports **multi-turn conversations** through session tracking.

### Key Benefits
- Single workflow to maintain (not N workflows per bot)
- Context templates stored in database (easy updates)
- Q&A cache reduces API calls for simple queries
- Consistent response formatting across all bots
- **Conversational memory** - Claude remembers previous messages within the same chat

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TELEGRAM BOTS                                   │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│ @JGLCapitalBot  │ @L7PartnersBot  │ @Magic_agent1_bot               │
│ (jgl-capital)   │ (l7-partners)   │ (magic-agent)                   │
└────────┬────────┴────────┬────────┴────────┬────────────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│           MASTER TELEGRAM BOT CONVERSATIONS WORKFLOW                │
│                     (stlQoP2huGVmGzRS)                              │
├─────────────────────────────────────────────────────────────────────┤
│  Telegram Triggers → Merge → Identify Bot → Load Config             │
│        ↓                                                            │
│  Prepare Context & Session → Call Claude API → Format Response      │
│        ↓                                                            │
│  Route to Bot → Send Response (per bot)                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Session Tracking (Conversational Memory)

Each bot generates a **stable session_id** from the Telegram chat_id:
```
telegram-{bot_name}-{chat_id}
```

Example: `telegram-jgl-123456789`

This session_id is passed to the Claude API with `resume: true`, enabling Claude to remember all previous messages in that conversation.

---

## Database Tables

### telegram_bot_configs

| Column | Type | Description |
|--------|------|-------------|
| `bot_username` | TEXT | Telegram bot username (unique) |
| `project_id` | TEXT | Links to claude_projects |
| `context_template` | TEXT | System prompt injected before user message |
| `working_dir` | TEXT | Claude Code working directory |
| `n8n_credential_id` | TEXT | n8n credential ID for the bot |
| `is_active` | BOOLEAN | Enable/disable bot |

**Current Bots:**
| bot_username | project_id | n8n_credential_id |
|--------------|------------|-------------------|
| JGLCapitalBot | jgl-capital | 5lDUBxwRJirGu7fF |
| L7PartnersBot | l7-partners | HNFfYO1hK5umrlrI |
| Magic_agent1_bot | magic-agent | zOn4nNqyfxf5uIkd |

### quick_responses (Q&A Cache)

| Column | Type | Description |
|--------|------|-------------|
| `project_id` | TEXT | '*' for all, or specific project |
| `pattern` | TEXT | Text pattern to match |
| `match_type` | TEXT | 'exact', 'contains', 'starts_with' |
| `response` | TEXT | Cached response |

---

## Per-Project Prompt Templates

### JGL Capital Bot (@JGLCapitalBot)

```
<system>
You are the JGL Capital CIO - the coordinating intelligence for Jeff's trading operation.

TEAM:
- Trading Agent: Entry/exit signals, technical analysis
- Portfolio Agent: Risk management, position sizing, exposure
- Quant Agent: EasyLanguage, backtesting, strategy code
- Data Agent: TradeStation API, market data queries
- Psychology Agent: Behavioral discipline, process adherence

PHILOSOPHY:
- Defense first: Risk management before returns
- Systematic rules: Follow the trading plan
- Trend alignment: Trade with the tide
- Dynamic sizing: Scale with conviction

RESPONSE STYLE:
- Decisive and data-driven
- Lead with risk considerations
- Reference specific agents when delegating
</system>
```

### L7 Partners Bot (@L7PartnersBot)

```
<system>
You are the L7 Partners property management assistant.

CAPABILITIES:
- Property & tenant data (Supabase via l7-business MCP)
- Document generation (Google Drive)
- Workflow automation (n8n)
- Deal analysis and underwriting

AGENTS:
- l7-deals-agent: CRE acquisitions screening and analysis
- l7-docs-agent: Lease summarization, document extraction
- l7-realestate-agent: Market insights, comp analysis

RESPONSE STYLE:
- Professional and concise
- Reference properties by address
- Include relevant metrics (CAP rate, NOI, occupancy)
</system>
```

### Magic Agent Bot (@Magic_agent1_bot)

```
<system>
You are the Magic Agent - Jeff's magic performance knowledge base assistant.

KNOWLEDGE:
Primary: ~/magic.md (comprehensive magic reference)

TOPICS:
- Trick library: repertoire, methods, variations
- Sleight of hand: techniques, practice routines
- Retailers: preferred vendors, pricing notes

RULES:
- Never reveal methods to non-magicians (Jeff is a magician)
- Reference specific tricks by name when relevant
- Track what's in active rotation vs. development
</system>
```

---

## Adding a New Project Bot

### Step 1: Create Bot in BotFather
```
/newbot
Name: [Project] Assistant
Username: [Project]Bot
```

### Step 2: Add n8n Credential
1. n8n → Settings → Credentials → Add "Telegram API"
2. Paste token, note credential ID

### Step 3: Add Database Records
```sql
INSERT INTO telegram_bot_configs
(bot_username, project_id, n8n_credential_id, working_dir, context_template)
VALUES (
  '[ProjectBot]',
  '[project-id]',
  '[credential_id]',
  '/path/to/project',
  '[system prompt]'
);
```

### Step 4: Update Master Workflow
1. Add Telegram Trigger node with credential
2. Connect to Merge node
3. Update TRIGGER_BOT_MAP in "Identify Bot" node
4. Add Process node with session_id: `telegram-[botname]-${chatId}`
5. Add Send Response node

### Step 5: Test
Send `/start` to the bot.

---

## Separate Workflow: Approvals

The `@JeffN8NCommunicationbot` handles Claude Code approval notifications and system alerts.

Workflow: `Claude Code Mobile Approvals` (VLodg6UPtMa6DV30)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot not responding | Check workflow active, verify credential ID |
| Wrong context | Verify bot_username matches BotFather exactly |
| Response truncated | Telegram limit 4096 chars (workflow truncates at 4000) |
| No conversation memory | Check session_id generated, resume: true in Claude call |
| Conversations mixing | Verify session_id includes chat_id (not static) |

---

## Related Files

| File | Purpose |
|------|---------|
| `migrations/telegram_bot_context_tables.sql` | Database schema |
| `prompts/` | Reusable agent prompt templates |
