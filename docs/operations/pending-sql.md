# Pending SQL - Run in Supabase Dashboard

## ✅ COMPLETED (2026-01-20)

The following tables have been created:
- `saved_articles` - Feedly article persistence
- `claude_session_context` - Session context MCP persistence
- `telegram_chat_history` - Telegram bot conversation memory
- `memory_graph` - Memory graph entity storage

---

## saved_articles table (for Feedly integration) ✅

```sql
CREATE TABLE IF NOT EXISTS saved_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  url TEXT,
  source_feed TEXT,
  category TEXT,
  summary TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  project_id TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_saved_articles_category ON saved_articles(category);
CREATE INDEX idx_saved_articles_project ON saved_articles(project_id);
CREATE INDEX idx_saved_articles_saved_at ON saved_articles(saved_at DESC);

-- Enable RLS
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated access
CREATE POLICY "Enable all for authenticated users" ON saved_articles
  FOR ALL USING (true);
```

## claude_session_context table (for session-context MCP)

```sql
CREATE TABLE IF NOT EXISTS claude_session_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  active_project TEXT,
  working_context JSONB DEFAULT '{}',
  active_files TEXT[] DEFAULT '{}',
  recent_tasks JSONB DEFAULT '[]',
  session_summary TEXT,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_context_session ON claude_session_context(session_id);
CREATE INDEX idx_session_context_project ON claude_session_context(active_project);
```

## telegram_chat_history table (for Telegram bot memory)

```sql
CREATE TABLE IF NOT EXISTS telegram_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_username TEXT NOT NULL,
  chat_id BIGINT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries by bot + chat_id (most recent first)
CREATE INDEX idx_chat_history_lookup
ON telegram_chat_history (bot_username, chat_id, created_at DESC);

-- Enable RLS
ALTER TABLE telegram_chat_history ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated access
CREATE POLICY "Enable all for authenticated users" ON telegram_chat_history
  FOR ALL USING (true);

-- Comment
COMMENT ON TABLE telegram_chat_history IS 'Stores Telegram bot conversation history for short-term memory';
```

## memory_graph table (for memory-session integration)

```sql
CREATE TABLE IF NOT EXISTS memory_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name TEXT UNIQUE NOT NULL,
  entity_type TEXT NOT NULL,
  observations TEXT[] DEFAULT '{}',
  relations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_memory_graph_type ON memory_graph(entity_type);
CREATE INDEX idx_memory_graph_updated ON memory_graph(updated_at DESC);

-- Full text search on observations
CREATE INDEX idx_memory_graph_observations ON memory_graph USING GIN (observations);

-- Enable RLS
ALTER TABLE memory_graph ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated access
CREATE POLICY "Enable all for authenticated users" ON memory_graph
  FOR ALL USING (true);

-- Comment
COMMENT ON TABLE memory_graph IS 'Persistent storage for MCP memory graph entities, relations, and observations';
```

---

# PENDING: Tomorrow's Migration (2026-01-22)

## Multi-Model LLM Integration

### Phase 1: API Setup (Prerequisites)

| Service | API Console | Key Storage |
|---------|-------------|-------------|
| **xAI (Grok 4)** | https://console.x.ai | `~/.config/grok-cli/config.json` |
| **DeepSeek** | https://platform.deepseek.com | `DEEPSEEK_API_KEY` env var |

**Cost Comparison:**
- Grok 4: ~$2/1M input, $10/1M output
- DeepSeek V3.2: ~$0.14/1M input, $0.28/1M output (14x cheaper than GPT-4)

### Phase 2: CLI Installation

```bash
# Grok CLI (community, MCP-enabled)
npm install -g @superagent-ai/grok-cli

# Verify installation
grok --version

# Configure (after getting API key)
export XAI_API_KEY="your-key"
```

```bash
# Ollama for local models (optional)
brew install ollama
ollama serve &

# Pull DeepSeek R1 (requires 32GB+ RAM for 32B)
ollama pull deepseek-r1:14b  # 16GB RAM option
ollama pull deepseek-r1:32b  # 32GB+ RAM option
```

### Phase 3: MCP Server Creation

Create MCP servers for new LLM integrations:

**Location:** `~/Documents/Claude Code/claude-agents/projects/meta-tools/servers/`

| Server | Approach | Key Tools |
|--------|----------|-----------|
| `grok-mcp` | Clone [Bob-lance/grok-mcp](https://github.com/Bob-lance/grok-mcp) | `ask-grok` (MCP-only, lighter) |
| `deepseek-cli` | Build from codex-cli template | `ask-deepseek`, `deepseek-reason` (chain-of-thought) |

**Note:** Using dedicated `grok-mcp` instead of full grok-cli per user preference.

### Phase 4: Update CLAUDE.md

Add to Multi-Model section:

```markdown
| Model | Context | Best For | Access |
|-------|---------|----------|--------|
| **Grok 4** | 128K | Real-time X/Twitter, current events | grok-cli MCP |
| **DeepSeek R1** | 128K | Cheap reasoning, math, bulk tasks | deepseek-cli MCP |
| **DeepSeek V3.2** | 128K | General coding at 10x lower cost | deepseek-cli MCP |
```

### Phase 5: Update /consult Skill

Add routing logic for new models:

| Task Pattern | Route To |
|--------------|----------|
| Real-time info, Twitter/X analysis | Grok 4 |
| Bulk reasoning, cost-sensitive | DeepSeek R1 |
| Large codebase analysis | Gemini (1M context) |
| Security review | Codex + Claude |

### Rollback Plan

If issues arise:
1. MCP servers are additive - existing setup unaffected
2. Can disable in `claude_desktop_config.json`
3. Keep gemini-cli/codex-cli as primary consultants

---

## Remote Access Overhaul (Tailscale + Jump Desktop)

Replacing RealVNC + Cloudflare access tunnels with a simpler stack.

### Phase 1: Tailscale Setup (All Devices)

```bash
# Mac Studio
brew install tailscale
sudo tailscale up

# MacBook
brew install tailscale
sudo tailscale up

# Raspberry Pi
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Windows VMs (in each VM)
# Download from https://tailscale.com/download/windows
# Install → Sign in with same account
```

**After setup, devices auto-discover:**
- `mac-studio` (100.x.x.x)
- `macbook` (100.x.x.x)
- `pi5` (100.x.x.x)
- `trading-vm1` (100.x.x.x)
- `trading-vm2` (100.x.x.x)

### Phase 2: Jump Desktop ($35 one-time)

1. Purchase from App Store (covers Mac + iOS)
2. Add connections:

| Name | Host | Protocol |
|------|------|----------|
| Mac Studio | `mac-studio` | Fluid |
| Trading VM 1 | `trading-vm1` | RDP |
| Trading VM 2 | `trading-vm2` | RDP |
| Pi 5 | `pi5` | VNC |

### Phase 3: Cleanup (After Verified Working)

Remove obsolete configs:
```bash
# Remove VNC Cloudflare tunnel
rm ~/.cloudflared/vnc.yml
launchctl unload ~/Library/LaunchAgents/com.l7partners.vnc-access.plist

# Keep Cloudflare only for public endpoints:
# - n8n.l7-partners.com (webhooks)
# - claude-api.l7-partners.com (HTTP API)
```

### Benefits Over Previous Setup

| Before | After |
|--------|-------|
| RealVNC + Cloudflare tunnels | Tailscale (mesh VPN) |
| Multiple tunnel configs | Auto-discovery |
| cloudflared client required | Native protocols |
| VNC (basic) | Fluid/RDP (better quality) |
| Complex DNS routing | MagicDNS (`ssh mac-studio`) |

### Cost Summary

| Item | Cost |
|------|------|
| Tailscale | Free (personal) |
| Jump Desktop | $53 (Mac $35 + iOS $18) |
| Windows keys (x2) | ~$30-60 (Kinguin) |
| **Total** | **~$83-113** |

---

## Decision Points ✅ RESOLVED (2026-01-21)

### LLM Integration
- [x] **xAI API key obtained?** ✅ Saved to `~/.config/grok-cli/config.json`
- [x] **DeepSeek API key obtained?** ✅ Saved to `~/.config/deepseek/config.json`
- [x] **Local models desired?** ✅ Yes - 32GB Mac Studio (M2 Max baseline)
- [x] **Grok integration type?** ✅ `grok-mcp` (MCP-only, not full CLI)

### Mac Studio Migration
- [x] **Username:** `jgl` (different from MacBook's `jeff-probis`)
- [x] **Docker vs Native MCPs:** Docker (single docker-compose.mcp.yml)
- [x] **Windows licenses:** Try transfer first, then Kinguin keys (~$15-30 each)

### Pi 5 AI HAT 2
- [x] **Dedicated task:** Security camera AI processing (Frigate NVR + Hailo NPU)

### Hardware Confirmed
- **Mac Studio M2 Max** (baseline, $2K)
- **32GB RAM** - Can run DeepSeek R1 32B, Gemma 3 27B locally
- **Ollama models to install:**
  - `deepseek-r1:14b` (fast, fits easily)
  - `deepseek-r1:32b` (best reasoning, uses ~20GB)
  - `gemma3:27b` (vision-capable backup)

### API Keys Configured
```
~/.config/grok-cli/config.json    # xAI Grok 4
~/.config/deepseek/config.json    # DeepSeek API
~/.zshrc                          # Both as env vars
```

---

# PENDING: Skill Registry (2026-01-26)

## skill_project_mappings table

Maps skills to projects with priority, auto-surface, and context triggers for intelligent skill discovery.

```sql
-- Create skill_project_mappings table
CREATE TABLE IF NOT EXISTS skill_project_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES claude_skills(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  auto_surface BOOLEAN DEFAULT false,
  context_triggers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, project_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_skill_mappings_project ON skill_project_mappings(project_id);
CREATE INDEX idx_skill_mappings_auto_surface ON skill_project_mappings(auto_surface) WHERE auto_surface = true;

-- Enable RLS
ALTER TABLE skill_project_mappings ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated access
CREATE POLICY "Enable all for authenticated users" ON skill_project_mappings
  FOR ALL USING (true);

-- Comments
COMMENT ON TABLE skill_project_mappings IS 'Maps skills to projects with priority and auto-surface settings';
COMMENT ON COLUMN skill_project_mappings.priority IS 'Higher priority skills surface first (0 = normal)';
COMMENT ON COLUMN skill_project_mappings.auto_surface IS 'Whether to proactively suggest this skill';
COMMENT ON COLUMN skill_project_mappings.context_triggers IS 'Keywords/phrases that trigger skill suggestion';
```

### Populate Initial Mappings

After creating the table, run this to populate mappings for all 13 skills:

```sql
-- Get skill IDs first
WITH skill_ids AS (
  SELECT id, name FROM claude_skills
)
-- Insert base skills (all projects)
INSERT INTO skill_project_mappings (skill_id, project_id, priority, auto_surface, context_triggers)
SELECT
  s.id,
  p.project,
  CASE
    WHEN s.name IN ('recap', 'done') THEN 10
    WHEN s.name = 'consult' THEN 5
    ELSE 0
  END as priority,
  CASE WHEN s.name IN ('workflow-coach', 'context-loader') THEN true ELSE false END as auto_surface,
  CASE
    WHEN s.name = 'recap' THEN ARRAY['end of session', 'what did we do', 'save progress']
    WHEN s.name = 'done' THEN ARRAY['exit', 'finished', 'end session']
    WHEN s.name = 'consult' THEN ARRAY['second opinion', 'other model', 'gemini', 'codex']
    WHEN s.name = 'reading' THEN ARRAY['articles', 'feedly', 'news']
    ELSE ARRAY[]::TEXT[]
  END as context_triggers
FROM skill_ids s
CROSS JOIN (VALUES ('l7-partners'), ('jgl-capital'), ('claude-hub'), ('personal')) AS p(project)
WHERE s.name IN ('recap', 'done', 'context-loader', 'consult', 'reading', 'workflow-coach');

-- Insert L7-specific skills
INSERT INTO skill_project_mappings (skill_id, project_id, priority, auto_surface, context_triggers)
SELECT id, 'l7-partners', 5, true, ARRAY['deal', 'property', 'underwriting', 'investment']
FROM claude_skills WHERE name = 'deal-analysis';

-- Insert personal skills
INSERT INTO skill_project_mappings (skill_id, project_id, priority, auto_surface, context_triggers)
SELECT id, 'personal', 10, true, ARRAY['email', 'task', 'calendar', 'family']
FROM claude_skills WHERE name = 'jeff';
```

---

# ✅ COMPLETED: Self-Healing Infrastructure (2026-01-26)

## self_healing_attempts table

Tracks self-healing attempts with cooldown management to prevent repeated attempts for the same issue.

```sql
-- Create self_healing_attempts table
CREATE TABLE IF NOT EXISTS self_healing_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_signature TEXT NOT NULL,
  service_name TEXT,
  trigger_type TEXT DEFAULT 'auto' CHECK (trigger_type IN ('auto', 'manual', 'webhook')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'skipped')),
  prompt_sent TEXT,
  ai_response TEXT,
  resolution_notes TEXT,
  error_message TEXT,
  cooldown_until TIMESTAMPTZ,
  attempt_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for efficient queries
CREATE INDEX idx_self_healing_signature ON self_healing_attempts(issue_signature);
CREATE INDEX idx_self_healing_status ON self_healing_attempts(status);
CREATE INDEX idx_self_healing_created ON self_healing_attempts(created_at DESC);

-- Enable RLS
ALTER TABLE self_healing_attempts ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated access
CREATE POLICY "Enable all for authenticated users" ON self_healing_attempts
  FOR ALL USING (true);

-- Comments
COMMENT ON TABLE self_healing_attempts IS 'Tracks self-healing attempts with cooldown management';
COMMENT ON COLUMN self_healing_attempts.issue_signature IS 'Unique identifier for the type of issue (e.g., n8n_health_check_failed)';
COMMENT ON COLUMN self_healing_attempts.cooldown_until IS 'Do not retry this issue signature until this time';
```

## self_healing_runbooks table

Stores known issue patterns and their documented solutions for automatic remediation.

```sql
-- Create self_healing_runbooks table
CREATE TABLE IF NOT EXISTS self_healing_runbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_pattern TEXT NOT NULL UNIQUE,
  issue_description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  auto_remediate BOOLEAN DEFAULT false,
  remediation_script TEXT,
  remediation_type TEXT DEFAULT 'manual' CHECK (remediation_type IN ('manual', 'script', 'restart', 'notify')),
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_runbooks_pattern ON self_healing_runbooks(issue_pattern);
CREATE INDEX idx_runbooks_auto ON self_healing_runbooks(auto_remediate) WHERE auto_remediate = true;

-- Enable RLS
ALTER TABLE self_healing_runbooks ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated access
CREATE POLICY "Enable all for authenticated users" ON self_healing_runbooks
  FOR ALL USING (true);

-- Comments
COMMENT ON TABLE self_healing_runbooks IS 'Known issue patterns with documented remediation steps';
COMMENT ON COLUMN self_healing_runbooks.issue_pattern IS 'Regex or exact match pattern for issue signatures';
COMMENT ON COLUMN self_healing_runbooks.auto_remediate IS 'Whether to automatically apply remediation without AI';
```

---
Created: 2026-01-20
Updated: 2026-01-26
Run these in Supabase Dashboard → SQL Editor
