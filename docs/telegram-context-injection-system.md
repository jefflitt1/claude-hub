# Telegram Bot Context Injection System

**Created:** 2026-01-19
**Updated:** 2026-01-20 (Added session tracking for conversational memory)
**Status:** Active
**Workflow ID:** `stlQoP2huGVmGzRS`

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
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ JGL Trigger  │  │ L7 Trigger   │  │ Magic Trigger│              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └────────────┬────┴─────────────────┘                       │
│                      ▼                                              │
│              ┌──────────────┐                                       │
│              │ Merge Inputs │                                       │
│              └──────┬───────┘                                       │
│                     ▼                                               │
│              ┌──────────────┐                                       │
│              │ Identify Bot │ ◄── Maps trigger → bot_username       │
│              └──────┬───────┘                                       │
│                     ▼                                               │
│         ┌────────────────────┐                                      │
│         │ Load Bot Config    │ ◄── Supabase: telegram_bot_configs   │
│         │ (context_template) │                                      │
│         └──────────┬─────────┘                                      │
│                    ▼                                                │
│         ┌────────────────────┐                                      │
│         │ Prepare Context    │ ◄── Inject context into prompt       │
│         │ & Session          │                                      │
│         └──────────┬─────────┘                                      │
│                    ▼                                                │
│         ┌────────────────────┐                                      │
│         │ Call Claude API    │ ◄── https://claude-api.l7-partners   │
│         └──────────┬─────────┘                                      │
│                    ▼                                                │
│         ┌────────────────────┐                                      │
│         │ Format Response    │ ◄── Truncate, clean markdown         │
│         └──────────┬─────────┘                                      │
│                    ▼                                                │
│         ┌────────────────────┐                                      │
│         │ Route to Bot       │ ◄── Switch on bot_username           │
│         └──────────┬─────────┘                                      │
│                    │                                                │
│         ┌──────────┼──────────┐                                     │
│         ▼          ▼          ▼                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                            │
│  │Send JGL  │ │Send L7   │ │Send Magic│                            │
│  │Response  │ │Response  │ │Response  │                            │
│  └──────────┘ └──────────┘ └──────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Session Tracking (Conversational Memory)

### How It Works
Each bot generates a **stable session_id** from the Telegram chat_id:
```
telegram-{bot_name}-{chat_id}
```

For example:
- `telegram-jgl-123456789` - JGL bot conversation with user 123456789
- `telegram-l7-987654321` - L7 bot conversation with user 987654321

This session_id is passed to the Claude API with `resume: true`, enabling Claude to remember all previous messages in that conversation.

### Implementation Details

**Process Node (per bot):**
```javascript
// Generate stable session_id for conversation memory
const session_id = `telegram-jgl-${chatId}`;  // or telegram-l7, telegram-magic

return {
  bot_username: botConfig.bot_username,
  enhanced_prompt: enhancedPrompt,
  working_dir: botConfig.working_dir,
  session_id: session_id  // Added for conversational memory
};
```

**Claude HTTP Node:**
```javascript
{
  prompt: $json.enhanced_prompt,
  working_dir: $json.working_dir,
  session_id: $json.session_id,  // Pass session identifier
  resume: true                    // Enable conversation continuation
}
```

### User Experience
- First message in a chat starts a new conversation context
- Subsequent messages continue the same conversation
- Claude remembers what was discussed previously
- No special commands needed - just chat naturally

### Session Lifecycle
- **New session**: Created automatically on first message from a chat_id
- **Resume**: All subsequent messages use the same session
- **Persistence**: Sessions persist across workflow restarts (stored by Claude API)

---

## Database Tables

### telegram_bot_configs
Maps Telegram bots to projects with context templates.

| Column | Type | Description |
|--------|------|-------------|
| `bot_username` | TEXT | Telegram bot username (unique) |
| `project_id` | TEXT | Links to claude_projects |
| `context_template` | TEXT | System prompt injected before user message |
| `working_dir` | TEXT | Claude Code working directory |
| `primary_agent` | TEXT | Default agent for this bot |
| `n8n_credential_id` | TEXT | n8n credential ID for the bot |
| `is_active` | BOOLEAN | Enable/disable bot |

**Current Data:**
| bot_username | project_id | n8n_credential_id |
|--------------|------------|-------------------|
| JeffN8NCommunicationbot | general | rnodyIjRrNxnmYkd |
| JGLCapitalBot | jgl-capital | 5lDUBxwRJirGu7fF |
| L7PartnersBot | l7-partners | HNFfYO1hK5umrlrI |
| Magic_agent1_bot | magic-agent | zOn4nNqyfxf5uIkd |

### telegram_context_templates
Detailed context templates with agent rosters.

| Column | Type | Description |
|--------|------|-------------|
| `project_id` | TEXT | Project identifier (unique) |
| `system_context` | TEXT | Core identity statement |
| `agent_roster` | JSONB | Available agents array |
| `response_guidelines` | TEXT | How to respond |
| `token_budget` | INTEGER | Max tokens for context (~500) |

### quick_responses
Instant response cache - skip Claude API for simple queries.

| Column | Type | Description |
|--------|------|-------------|
| `project_id` | TEXT | '*' for all, or specific project |
| `pattern` | TEXT | Text pattern to match |
| `match_type` | TEXT | 'exact', 'contains', 'starts_with' |
| `response` | TEXT | Cached response |
| `use_count` | INTEGER | Usage tracking |

**Current Patterns (8):**
- Universal: hi, hello, hey, thanks, thank you
- JGL: "what agents" → team roster
- L7: "what agents" → team roster
- Magic: "what tricks" → repertoire prompt

---

## Prompt Structure

### Current Format (Active)
```
[context_template from telegram_bot_configs]

---

User message: [user_prompt]
```

### Example: JGL Capital Bot

**User sends:** "What's my risk per trade?"

**Prompt sent to Claude:**
```
You are the JGL Capital trading assistant. You operate as the CIO coordinating a team of specialist agents.

**Your Team:**
- Trading Agent: Entry/exit analysis, signal evaluation
- Portfolio Agent: Risk management, position sizing
- Quant Agent: EasyLanguage code, backtesting
- Data Agent: TradeStation API, market data
- Psychology Agent: Behavioral discipline

**Philosophy:** Defense first. Systematic rules. Trend alignment. Dynamic sizing.

**Response Style:** Decisive, data-driven. Reference specific agents when delegating.

---

User message: What's my risk per trade?
```

---

## Q&A Cache Implementation

### Purpose
Instant responses for simple queries without calling Claude API.

### In-Memory Cache (Active in Prepare Context node)
```javascript
const INSTANT_CACHE = {
  'hi': 'Hello! How can I help you today?',
  'hello': 'Hello! How can I help you today?',
  'thanks': "You're welcome! Let me know if you need anything else.",
  'thank you': "You're welcome! Let me know if you need anything else."
};
```

### Database Cache (Optional Enhancement)
Run the migration in `migrations/telegram_bot_context_tables.sql` to create `quick_responses` table with project-specific patterns.

### Workflow Enhancement (Manual)
To add full cache checking with conditional routing:

1. **Add "Check Q&A Cache" code node** after "Prepare Context & Session"
2. **Add "Is Cached?" switch node** to branch on `is_cached` boolean
3. **Route cached responses** directly to "Format Response", skipping Claude API

---

## Adding a New Project Bot

### Step 1: Create Bot in BotFather
```
/newbot
Name: [Project] Assistant
Username: [Project]Bot
```
Save the token.

### Step 2: Add n8n Credential
1. Go to https://n8n.l7-partners.com
2. Settings → Credentials → Add Credential
3. Select "Telegram API"
4. Name: `[Project] Bot`
5. Paste token from BotFather
6. Save and note the credential ID

### Step 3: Add Database Records
```sql
-- telegram_bot_configs
INSERT INTO telegram_bot_configs
(bot_username, project_id, n8n_credential_id, working_dir, context_template)
VALUES (
  '[ProjectBot username]',
  '[project-id]',
  '[n8n credential ID]',
  '/Users/jeff-probis/Documents/Claude Code/claude-agents/projects/[project]',
  'You are the [Project] assistant. [Describe capabilities and style]'
);

-- telegram_context_templates
INSERT INTO telegram_context_templates
(project_id, system_context, agent_roster, response_guidelines)
VALUES (
  '[project-id]',
  '[Core identity]',
  '["agent-1", "agent-2"]'::jsonb,
  '[How to respond]'
);
```

### Step 4: Update Master Workflow
1. Open workflow `stlQoP2huGVmGzRS`
2. Add new Telegram Trigger node with the credential
3. Connect to "Merge Bot Messages" (add input)
4. Update "Identify Bot & Extract Message" TRIGGER_BOT_MAP:
   ```javascript
   const TRIGGER_BOT_MAP = {
     // ... existing
     '[New Trigger Name]': '[bot_username]'
   };
   ```
5. **Add Process Node** for the new bot:
   - Copy an existing process node (e.g., process-jgl)
   - Update the session_id pattern: `telegram-[botname]-${chatId}`
   - Connect to the appropriate bot config lookup
6. **Add Claude HTTP Node** for the new bot:
   - Ensure it passes `session_id: $json.session_id` and `resume: true`
7. Add route in "Route to Bot" switch node
8. Add "Send [Project] Response" Telegram node with credential

### Step 5: Test
Send `/start` to the new bot.

---

## Related Files

| File | Purpose |
|------|---------|
| `migrations/telegram_bot_context_tables.sql` | Database schema & initial data |
| `docs/telegram-bot-prompts.md` | Detailed prompt templates |
| `workflows/master-telegram-bot.json` | Workflow export (if needed) |

---

## Separate Workflow: Approvals

The `@JeffN8NCommunicationbot` is **NOT** part of this system. It handles:
- Claude Code approval notifications
- System alerts

Workflow: `Claude Code Mobile Approvals` (VLodg6UPtMa6DV30)

---

## Troubleshooting

### Bot not responding
1. Check workflow is active in n8n
2. Verify credential ID matches in `telegram_bot_configs`
3. Check n8n execution logs for errors

### Wrong context injected
1. Verify `bot_username` in database matches BotFather username exactly
2. Check TRIGGER_BOT_MAP in "Identify Bot" node

### Response truncated
Telegram limit is 4096 chars. The workflow truncates at 4000.

### Bot doesn't remember previous messages
1. Verify the Process node generates `session_id` correctly
2. Check Claude HTTP node has `resume: true` in jsonBody
3. Ensure `session_id` is passed from Process node to Claude HTTP node
4. Check n8n execution to confirm session_id value is being sent

### Conversations mixing between users
1. Verify session_id includes the chat_id (not a static value)
2. Check that each bot uses unique bot-name prefix (telegram-jgl vs telegram-l7)

### Session appears to reset
1. Claude API sessions may have TTL - normal behavior after extended inactivity
2. Verify the session_id format is consistent (no typos in bot name prefix)
