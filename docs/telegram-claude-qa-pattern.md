# Telegram-to-Claude Q&A Workflow Pattern

**Last Updated:** 2026-01-19
**Owner:** n8n Automation
**Applies To:** All project-specific Telegram bots

---

## Purpose

Enable natural language Q&A with project-specific AI agents via Telegram. Users can ask questions in Telegram and receive context-aware responses powered by Claude, with access to project data via MCP servers.

---

## Architecture Overview

```
Telegram Bot                n8n Workflow                 Claude Terminal
     │                           │                              │
     │   User sends message      │                              │
     ├──────────────────────────>│                              │
     │                           │   HTTP POST to Claude        │
     │                           ├─────────────────────────────>│
     │                           │                              │
     │                           │   Claude processes with      │
     │                           │   project-specific context   │
     │                           │                              │
     │                           │   Response                   │
     │                           │<─────────────────────────────┤
     │   Bot sends response      │                              │
     │<──────────────────────────┤                              │
     │                           │                              │
```

---

## Components

### 1. Telegram Bot (per project)
- Created via @BotFather
- Dedicated credential in n8n
- Handles incoming messages

### 2. n8n Workflow
- Telegram Trigger node (listens for messages)
- Optional: Redis/Supabase for conversation memory
- HTTP Request to Claude terminal
- Telegram node for responses

### 3. Claude Terminal (per project)
- HTTP endpoint accepting POST requests
- Pre-loaded with project-specific context (CLAUDE.md, knowledge base)
- Access to relevant MCP servers (Supabase, Google Drive, etc.)

---

## Standard Workflow Structure

```
┌─────────────────┐
│ Telegram Trigger│
│  (Bot messages) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extract Message │
│ & Chat Context  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Load Conversation│
│ History (Redis) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ HTTP Request to │
│ Claude Terminal │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save to History │
│    (Redis)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Respond via     │
│   Telegram      │
└─────────────────┘
```

---

## Implementation Guide

### Step 1: Create Telegram Bot

```bash
# In Telegram, message @BotFather:
/newbot
# Name: [Project] Assistant (e.g., "L7 Partners Assistant")
# Username: [project]_assistant_bot (e.g., "l7_assistant_bot")
# Save the token
```

### Step 2: Create n8n Credential

1. Go to n8n → Credentials → New
2. Select "Telegram API"
3. Name: `[Project] Bot` (e.g., "L7 Action Items Bot")
4. Paste bot token
5. Save

### Step 3: Create n8n Workflow

**Nodes required:**

1. **Telegram Trigger**
   - Credential: Your project bot
   - Updates: Message (and optionally Callback Query)

2. **Set Node** (Extract context)
   ```javascript
   // Extract message details
   const message = $input.item.json.message;
   return {
     chatId: message.chat.id,
     userId: message.from.id,
     username: message.from.username || message.from.first_name,
     text: message.text,
     timestamp: new Date().toISOString()
   };
   ```

3. **HTTP Request** (to Claude Terminal)
   ```
   Method: POST
   URL: https://claude.l7-partners.com/api/chat/[project-id]
   Headers:
     Content-Type: application/json
     Authorization: Bearer [API_KEY]
   Body:
     {
       "message": "{{ $json.text }}",
       "context": {
         "user": "{{ $json.username }}",
         "chatId": "{{ $json.chatId }}"
       }
     }
   ```

4. **Telegram** (Send response)
   - Operation: Send Message
   - Chat ID: `{{ $('Set Node').item.json.chatId }}`
   - Text: `{{ $json.response }}`

### Step 4: Configure Claude Terminal

Each project's Claude terminal should have:

1. **Project CLAUDE.md loaded** - Contains project context, data locations, agent instructions
2. **MCP servers configured** - Access to Supabase, Google Drive, etc.
3. **API endpoint** - HTTP webhook for receiving messages

---

## Project-Specific Configurations

### L7 Partners Bot
| Setting | Value |
|---------|-------|
| Bot | @n8nmasteractionjeffbot |
| Workflow | Master Tenant Management |
| Context | L7 property data, leases, tenants |
| MCP Servers | Supabase (L7), Google Drive (L7), Weaviate |
| Use Cases | Tenant queries, lease lookups, property info |

### JGL Capital Bot
| Setting | Value |
|---------|-------|
| Bot | @jgl_personal_bot |
| Workflow | TBD |
| Context | Trading strategies, positions, market data |
| MCP Servers | TradeStation, Supabase (JGL) |
| Use Cases | Position status, strategy questions, market queries |

---

## Conversation Memory Pattern

For multi-turn conversations, use Redis or Supabase:

### Redis Pattern
```javascript
// Store conversation
const key = `telegram:${chatId}:history`;
await redis.lpush(key, JSON.stringify({
  role: 'user',
  content: message,
  timestamp: Date.now()
}));
await redis.ltrim(key, 0, 19); // Keep last 20 messages

// Retrieve history
const history = await redis.lrange(key, 0, 9);
```

### Supabase Pattern
```sql
-- Table: telegram_conversations
CREATE TABLE telegram_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL,
  user_id BIGINT,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_telegram_conv_chat ON telegram_conversations(chat_id, created_at DESC);
```

---

## Security Considerations

1. **Bot Token Security**
   - Never commit tokens to git
   - Use n8n credentials system
   - Rotate tokens if compromised

2. **User Authentication**
   - Validate Telegram user IDs against allowed list
   - Log all interactions for audit

3. **Rate Limiting**
   - Implement per-user rate limits
   - Prevent abuse of Claude API credits

4. **Data Access**
   - Each bot should only access its project's data
   - Use separate Supabase schemas if needed

---

## Monitoring & Logging

### Recommended Logging
- Log all incoming messages (redact sensitive data)
- Log Claude API response times
- Log errors with full context

### Alerts
- Set up alerts for:
  - High error rates
  - Slow response times (>30s)
  - Unusual message volumes

---

## Example: L7 Tenant Lookup

**User message:**
> "What's the lease expiration for ABC Company?"

**Workflow processing:**
1. Telegram Trigger receives message
2. Extract company name from text
3. Query Supabase for tenant data
4. Format response with lease details
5. Send via Telegram

**Bot response:**
> "ABC Company (Suite 200) lease expires on 2026-06-30. Current rent: $2,500/month. Insurance expires: 2026-03-15."

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot not responding | Check n8n workflow is active, verify credential |
| "Unauthorized" errors | Regenerate bot token, update credential |
| Slow responses | Check Claude API latency, optimize prompts |
| Missing context | Verify MCP servers are connected |

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-19 | 1.0 | Initial pattern documentation |
