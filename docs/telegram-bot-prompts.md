# Telegram Bot Prompt Architecture

## Overview

Each project bot sends a structured prompt to Claude with context injection. This document defines the prompt templates and Q&A caching strategy.

---

## Prompt Structure

### Current Format (v1)
```
[context_template from telegram_bot_configs]

---

User message: [user_prompt]
```

### Enhanced Format (v2 - Recommended)
```
<system>
[IDENTITY]
[CAPABILITIES]
[CONSTRAINTS]
</system>

<channel>
Platform: Telegram Mobile
Response limits: 4000 chars max
Format: Markdown (Telegram flavor)
</channel>

<user>
Name: [user_name]
Message: [user_prompt]
</user>
```

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

KNOWLEDGE FILES:
- Trading Plan: projects/jgl-capital/CLAUDE.md
- Strategy Rules: projects/jgl-capital/strategies/

RESPONSE STYLE:
- Decisive and data-driven
- Lead with risk considerations
- Reference specific agents when delegating
- Use trading terminology
</system>

<channel>
Platform: Telegram Mobile
Response limits: 4000 chars max
Format: Markdown with bold for emphasis
</channel>

<user>
Name: {user_name}
Message: {user_prompt}
</user>
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

DATA ACCESS:
- Properties table: addresses, units, financials
- Tenants table: leases, contacts, payment history
- Deals table: pipeline tracking, underwriting

KNOWLEDGE FILES:
- Project docs: projects/l7partners-rewrite/CLAUDE.md
- Deal templates: projects/l7partners-rewrite/templates/

RESPONSE STYLE:
- Professional and concise
- Reference properties by address
- Include relevant metrics (CAP rate, NOI, occupancy)
- Focus on actionable next steps
</system>

<channel>
Platform: Telegram Mobile
Response limits: 4000 chars max
Format: Markdown with bullet points
</channel>

<user>
Name: {user_name}
Message: {user_prompt}
</user>
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
- Resources: books, videos, creators to follow
- Performance notes: audience reactions, improvements

RULES:
- Never reveal methods to non-magicians (Jeff is a magician)
- Reference specific tricks by name when relevant
- Suggest practice priorities based on upcoming shows
- Track what's in active rotation vs. development

RESPONSE STYLE:
- Enthusiastic about magic
- Reference specific tricks and methods
- Suggest related effects when appropriate
</system>

<channel>
Platform: Telegram Mobile
Response limits: 4000 chars max
Format: Markdown, concise
</channel>

<user>
Name: {user_name}
Message: {user_prompt}
</user>
```

---

## Q&A Cache Layer

### Purpose
Avoid full Claude API calls for simple, repetitive questions by checking a cache first.

### Table: `quick_responses`

```sql
CREATE TABLE quick_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  pattern TEXT NOT NULL,           -- Regex or exact match
  match_type TEXT DEFAULT 'contains', -- 'exact', 'contains', 'regex'
  response TEXT NOT NULL,
  use_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qa_cache_project ON quick_responses(project_id);
```

### Common Q&A Patterns

| Project | Pattern | Response |
|---------|---------|----------|
| `*` (all) | `/start` | [Bot intro - pulled from context_template] |
| `*` (all) | `hello`, `hi`, `hey` | "Hello! How can I help you today?" |
| `*` (all) | `thanks`, `thank you` | "You're welcome! Let me know if you need anything else." |
| `jgl-capital` | `what's my risk` | "Your current risk parameters: [fetch from trading plan]" |
| `jgl-capital` | `portfolio status` | [Trigger portfolio summary workflow] |
| `l7-partners` | `property count` | [Quick Supabase count query] |
| `magic-agent` | `what tricks` | "Check ~/magic.md for your full repertoire. Want me to list what's in rotation?" |

### Workflow Integration

Add a node **before** "Call Claude API":

```javascript
// Check Q&A Cache
const prompt = $json.prompt.toLowerCase().trim();
const project = $json.project;

// Quick pattern matches (no DB needed)
const INSTANT_RESPONSES = {
  'hi': 'Hello! How can I help you today?',
  'hello': 'Hello! How can I help you today?',
  'hey': 'Hello! How can I help you today?',
  'thanks': "You're welcome! Let me know if you need anything else.",
  'thank you': "You're welcome! Let me know if you need anything else.",
  'thx': "You're welcome!"
};

if (INSTANT_RESPONSES[prompt]) {
  return {
    cached: true,
    response: INSTANT_RESPONSES[prompt],
    skip_claude: true
  };
}

// For more complex patterns, query quick_responses
// (Add Supabase lookup here if needed)

return {
  cached: false,
  skip_claude: false,
  ...items
};
```

### Benefits
- Instant responses for greetings (~0ms vs ~5-30s for Claude)
- Reduced API costs
- Consistent responses for common questions
- Easy to update via database

---

## Implementation Checklist

- [ ] Update `telegram_bot_configs.context_template` with v2 prompts
- [ ] Create `quick_responses` table
- [ ] Add Q&A cache check node to workflow
- [ ] Add conditional branch to skip Claude for cached responses
- [ ] Populate initial Q&A patterns
- [ ] Test all bots with common queries

---

## Adding a New Project Bot

1. **BotFather**: Create bot, get token
2. **n8n**: Add Telegram API credential
3. **Database**:
   - Insert row in `telegram_bot_configs`
   - Insert row in `telegram_context_templates`
   - Add common Q&A patterns to `quick_responses`
4. **Workflow**:
   - Add Telegram Trigger node (with new credential)
   - Connect to Merge node
   - Add to TRIGGER_BOT_MAP in "Identify Bot" code
   - Add route in Switch node
   - Add Send Response node with credential
5. **Test**: Send `/start` to verify

**Do NOT create separate workflows** - all bots use the Master workflow.
