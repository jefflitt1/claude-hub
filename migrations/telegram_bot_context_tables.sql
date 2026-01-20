-- Telegram Bot Context Injection Tables
-- Run this in Supabase SQL Editor
-- Created: 2026-01-19

-- ============================================
-- Table 1: telegram_bot_configs
-- Maps Telegram bots to projects with context
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_bot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_username TEXT UNIQUE NOT NULL,
  bot_token_hash TEXT,                    -- Optional: for validation
  project_id TEXT NOT NULL,               -- Links to claude_projects.id
  primary_agent TEXT,                     -- Default agent for this bot
  context_template TEXT,                  -- System prompt wrapper
  knowledge_file TEXT,                    -- Path to CLAUDE.md or similar
  working_dir TEXT NOT NULL,              -- Working directory for Claude Code
  response_style TEXT,                    -- Response guidelines
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_telegram_bot_configs_username
ON telegram_bot_configs(bot_username);

CREATE INDEX IF NOT EXISTS idx_telegram_bot_configs_project
ON telegram_bot_configs(project_id);

-- ============================================
-- Table 2: telegram_context_templates
-- Stores detailed context templates per project
-- ============================================
CREATE TABLE IF NOT EXISTS telegram_context_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT UNIQUE NOT NULL,        -- Links to claude_projects.id
  system_context TEXT NOT NULL,           -- The wrapper text
  agent_roster JSONB,                     -- Available agents for this project
  knowledge_summary TEXT,                 -- Condensed knowledge file
  response_guidelines TEXT,               -- How to respond
  token_budget INTEGER DEFAULT 500,       -- Max tokens for context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_telegram_context_templates_project
ON telegram_context_templates(project_id);

-- ============================================
-- Initial Data: Bot Configurations
-- ============================================
INSERT INTO telegram_bot_configs (bot_username, project_id, primary_agent, working_dir, context_template) VALUES
(
  'JeffN8NCommunicationbot',
  'general',
  NULL,
  '/Users/jeff-probis',
  'You are Jeff''s general assistant via Telegram. You have access to Claude Code running on his Mac.
Available: Email (unified-comms), Calendar (google-calendar), Tasks (jeff-agent), Files (all projects).
Keep responses concise for mobile. Use markdown sparingly.'
),
(
  'JGLCapitalBot',
  'jgl-capital',
  'cio',
  '/Users/jeff-probis/Documents/Claude Code/claude-agents/projects/jgl-capital',
  'You are the JGL Capital trading assistant. You operate as the CIO coordinating a team of specialist agents.

**Your Team:**
- Trading Agent: Entry/exit analysis, signal evaluation
- Portfolio Agent: Risk management, position sizing
- Quant Agent: EasyLanguage code, backtesting
- Data Agent: TradeStation API, market data
- Psychology Agent: Behavioral discipline

**Philosophy:** Defense first. Systematic rules. Trend alignment. Dynamic sizing.

**Response Style:** Decisive, data-driven. Reference specific agents when delegating.'
),
(
  'L7PartnersBot',
  'l7-partners',
  'l7-deals-agent',
  '/Users/jeff-probis/Documents/Claude Code/claude-agents/projects/l7partners-rewrite',
  'You are the L7 Partners property management assistant.

**Capabilities:**
- Property & tenant data (Supabase)
- Document generation (Google Drive)
- Workflow automation (n8n)
- Deal analysis (l7-deals-agent)

**Available Agents:**
- l7-deals-agent: CRE acquisitions analysis
- l7-docs-agent: Lease summarization
- l7-realestate-agent: Market insights

**Response Style:** Professional, concise. Focus on actionable information.'
),
(
  'MagicAgentBot',
  'magic-agent',
  'magic-agent',
  '/Users/jeff-probis',
  'You are the Magic Agent - Jeff''s magic performance knowledge base assistant.

**Knowledge:** ~/magic.md (comprehensive magic reference)
**Topics:** Tricks, sleights, retailers, resources, performance notes

**Response Style:** Enthusiastic about magic. Reference specific tricks/methods when relevant.'
)
ON CONFLICT (bot_username) DO UPDATE SET
  project_id = EXCLUDED.project_id,
  primary_agent = EXCLUDED.primary_agent,
  working_dir = EXCLUDED.working_dir,
  context_template = EXCLUDED.context_template,
  updated_at = NOW();

-- ============================================
-- Initial Data: Context Templates (detailed)
-- ============================================
INSERT INTO telegram_context_templates (project_id, system_context, agent_roster, response_guidelines) VALUES
(
  'general',
  'You are Jeff''s personal assistant accessible via Telegram. You run on Claude Code with full MCP server access.',
  '["jeff-agent", "unified-comms", "google-calendar", "l7-business"]'::jsonb,
  'Keep responses under 500 chars when possible. Use bullet points. No emojis unless requested.'
),
(
  'jgl-capital',
  'You are the JGL Capital CIO. Coordinate the trading team. Reference the Trading Plan when making decisions.',
  '["cio", "trading-agent", "portfolio-agent", "quant-agent", "data-agent", "psychology-agent"]'::jsonb,
  'Use trading terminology. Be decisive. Always mention risk first. Reference agents by name.'
),
(
  'l7-partners',
  'You are the L7 Partners assistant. Access property data, documents, and workflows.',
  '["l7-deals-agent", "l7-docs-agent", "l7-realestate-agent"]'::jsonb,
  'Professional tone. Reference specific properties by address. Include relevant metrics.'
),
(
  'magic-agent',
  'You are the Magic Agent. Help Jeff with magic performance preparation and trick selection.',
  '["magic-agent"]'::jsonb,
  'Enthusiastic but professional. Reference specific tricks. Never reveal methods to non-magicians.'
)
ON CONFLICT (project_id) DO UPDATE SET
  system_context = EXCLUDED.system_context,
  agent_roster = EXCLUDED.agent_roster,
  response_guidelines = EXCLUDED.response_guidelines,
  updated_at = NOW();

-- ============================================
-- Table 3: quick_responses
-- Quick response cache to avoid over-processing
-- ============================================
CREATE TABLE IF NOT EXISTS quick_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,               -- '*' for all projects, or specific project_id
  pattern TEXT NOT NULL,                  -- Text pattern to match
  match_type TEXT DEFAULT 'contains',     -- 'exact', 'contains', 'starts_with', 'regex'
  response TEXT NOT NULL,                 -- Cached response
  use_count INTEGER DEFAULT 0,            -- Track usage for analytics
  last_used TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_cache_project ON quick_responses(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_cache_active ON quick_responses(is_active) WHERE is_active = true;

-- ============================================
-- Initial Data: Q&A Cache Patterns
-- ============================================
INSERT INTO quick_responses (project_id, pattern, match_type, response) VALUES
-- Universal greetings (all projects)
('*', 'hi', 'exact', 'Hello! How can I help you today?'),
('*', 'hello', 'exact', 'Hello! How can I help you today?'),
('*', 'hey', 'exact', 'Hello! How can I help you today?'),
('*', 'thanks', 'contains', 'You''re welcome! Let me know if you need anything else.'),
('*', 'thank you', 'contains', 'You''re welcome! Let me know if you need anything else.'),

-- JGL Capital quick responses
('jgl-capital', 'what agents', 'contains', 'Your JGL Capital team:\n• *Trading Agent*: Entry/exit signals\n• *Portfolio Agent*: Risk & position sizing\n• *Quant Agent*: EasyLanguage & backtesting\n• *Data Agent*: TradeStation API\n• *Psychology Agent*: Behavioral discipline\n\nAsk me anything trading-related!'),

-- L7 Partners quick responses
('l7-partners', 'what agents', 'contains', 'Your L7 Partners team:\n• *l7-deals-agent*: CRE acquisitions analysis\n• *l7-docs-agent*: Lease summarization\n• *l7-realestate-agent*: Market insights\n\nI can also access property data, documents, and workflows.'),

-- Magic Agent quick responses
('magic-agent', 'what tricks', 'contains', 'Check ~/magic.md for your full repertoire. Would you like me to:\n• List what''s in active rotation?\n• Suggest practice priorities?\n• Find a specific trick?')

ON CONFLICT DO NOTHING;

-- ============================================
-- Verify installation
-- ============================================
SELECT 'telegram_bot_configs' as table_name, COUNT(*) as row_count FROM telegram_bot_configs
UNION ALL
SELECT 'telegram_context_templates', COUNT(*) FROM telegram_context_templates
UNION ALL
SELECT 'quick_responses', COUNT(*) FROM quick_responses;
