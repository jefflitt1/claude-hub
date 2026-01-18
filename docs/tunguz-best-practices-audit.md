# Tunguz Best Practices Audit & Recommendations

**Date:** 2026-01-18
**Scope:** Full system review against Tomasz Tunguz AI workflow research
**Status:** Recommendations ready for implementation

---

## Executive Summary

Your current system is **well-architected** with strong foundations:
- Comprehensive documentation (CLAUDE.md hierarchy)
- Proactive workflow coaching system
- Multi-project structure with clear boundaries
- n8n automation + Supabase persistence
- Memory MCP for cross-session learning

However, there are **7 key gaps** when measured against Tunguz's latest research on optimal AI workflows. Addressing these could yield:
- **41% reduction in token costs** (via meta-tool consolidation)
- **8% improvement in task success rate**
- **Faster implementation cycles** (Architect/Implementer pattern)
- **Better trajectory data** for future optimization

---

## Gap Analysis

### 1. Architect/Implementer Pattern - NOT IMPLEMENTED

**Current State:** Plan Mode exists as a suggestion ("Let's use Plan Mode to design this first") but it's not a formalized two-phase workflow.

**Tunguz Insight:** *"The approach splits AI coding into two sessions: one architect to design, one implementer to execute. No weeks of trial & error."*

**Gap:** No structured handoff between planning and execution. No PRD generation step. No test-first enforcement.

**Recommendation:**
```
Create /architect skill:
1. Generate PRD (using ChatPRD-style prompts)
2. Create implementation roadmap
3. Generate test cases BEFORE code
4. User approves → transition to implementation phase
5. Implementation runs with structure (10-15 min autonomous)
```

**Files to create:**
- `~/.claude/skills/architect/SKILL.md`
- `~/.claude/prompts/prd-template.md`

---

### 2. Test-First AI Development - PARTIALLY IMPLEMENTED

**Current State:** "Implementation without tests" is an interjection pattern (`"What should verify this works?"`) but tests are generated AFTER code, not before.

**Tunguz Insight:** *"Insist AI writes test cases before writing implementation code."*

**Gap:** Tests are an afterthought, not the scaffolding.

**Recommendation:**
- Add `test_first` as a required step in architect skill
- Modify workflow-analyzer.py to detect "implement" patterns and inject test-first reminder
- Add to coaching-profiles.json: `"test_first_enforcement": true` for production profile

---

### 3. Unified Meta-Tools - MAJOR GAP

**Current State:** You have 11+ fragmented MCP servers:
```
MCP_DOCKER gateway:
  - github (40 tools)
  - memory (9 tools)
  - brave (search)
  - playwright (browser)
  - puppeteer (browser)
  - supabase (9 tools)
  - plus: gmail, gdrive-jgl, gdrive-l7, n8n-mcp
```

**Tunguz Insight:** *"Consolidating specialized tools into unified, stateful interfaces reduced token consumption by 41.2% and costs by 41.7%."*

**Gap:** Each tool requires separate parsing. No shared state. No caching.

**Recommendations:**

**A. Consolidate Browser Tools:**
```
playwright + puppeteer + cloudflare-browser-rendering → unified-browser
- Single interface for all browser automation
- Shared session state
- Intelligent routing (headless vs full)
```

**B. Consolidate Communication Tools:**
```
gmail + gmail-l7 + slack → unified-comms
- Single "send message" interface
- Channel routing by context
- Contact resolution across services
```

**C. Create L7 Business Meta-Tool:**
```
supabase + gdrive-l7 + n8n-mcp → l7-business-tool
- Unified interface for all L7 operations
- Property queries, document access, workflow triggers
- Built-in caching for repeated queries
```

**Implementation Path:**
1. Create `~/Documents/Claude Code/claude-agents/projects/meta-tools/`
2. Build Python wrappers that combine tool calls
3. Single MCP server exposes unified interface
4. Track token savings in analytics

---

### 4. Three Workflow Types - MISALIGNED TAXONOMY

**Current State:** Coaching profiles use `minimal/moderate/aggressive` based on interjection frequency.

**Tunguz Taxonomy:**
| Type | Description | Best For |
|------|-------------|----------|
| **Deterministic** | Same steps, same order, every time | Consistent processes |
| **Deterministic+AI** | Hybrid: AI enhances steps, humans control | Most work |
| **Fully Agentic** | AI decides sequence and tools | Unpredictable inputs |

**Gap:** Profiles control coaching intensity, not workflow architecture.

**Recommendation:** Add workflow type selection alongside coaching profile:

```json
// coaching-profiles.json addition
"workflow_types": {
  "deterministic": {
    "description": "Fixed steps for consistency",
    "example_use": "VC due diligence, morning briefs",
    "allows_deviation": false
  },
  "hybrid": {
    "description": "Human controls process, AI enhances steps",
    "example_use": "Feature development, refactoring",
    "allows_deviation": "with_approval"
  },
  "agentic": {
    "description": "AI decides sequence and tools",
    "example_use": "Research, exploration, support",
    "allows_deviation": true
  }
}
```

**Add interjection:**
```python
# In workflow-analyzer.py
if "every time" in prompt_lower or "consistently" in prompt_lower:
    suggest("workflow_type", "This calls for Deterministic workflow type")
```

---

### 5. Trajectory Data Structure - UNDERUTILIZED

**Current State:** You capture:
- `analytics_queue.jsonl` (skill usage, interjections)
- `coaching-learning.json` (acceptance rates)
- `session-state.json` (current session)

**Tunguz Insight:** *"Your path through tools becomes training data. Fine-tuned models trained on high-value trajectories reduce costs and improve accuracy."*

**Gap:** Data is logged but not structured for trajectory analysis. No sequence preservation. No outcome correlation.

**Recommendation:** Create trajectory logging format:

```json
// trajectory-log.jsonl (new file)
{
  "trajectory_id": "traj_20260118_abc",
  "session_id": "session_20260118_123",
  "sequence": [
    {"step": 1, "action": "read_file", "target": "src/App.tsx", "duration_ms": 150},
    {"step": 2, "action": "grep_search", "pattern": "useState", "results": 12},
    {"step": 3, "action": "edit_file", "target": "src/App.tsx", "lines_changed": 5},
    {"step": 4, "action": "run_test", "result": "pass"}
  ],
  "task_type": "bug_fix",
  "outcome": "success",
  "tokens_used": 45000,
  "duration_seconds": 180
}
```

**Implementation:**
1. Hook into tool execution (via Hookify or custom)
2. Log sequences with timestamps
3. Correlate with outcomes (success/failure)
4. Weekly analysis for pattern optimization

---

### 6. Experiment-Based Discovery - NOT FORMALIZED

**Current State:** Ad-hoc approach changes with no measurement.

**Tunguz Insight:** *"Test productivity systems like trying coffee drinks. Monday: architect/implementer. Tuesday: traditional single-session. Wednesday: hybrid."*

**Gap:** No framework for systematically testing workflow approaches.

**Recommendation:** Create `/experiment` skill:

```markdown
# Experiment Skill

## Commands
- `/experiment start [approach]` - Begin tracking this approach
- `/experiment log [note]` - Add observation
- `/experiment end` - Complete and measure
- `/experiment compare` - Show approach comparison

## Auto-tracked Metrics
- Time to completion
- Token usage
- Error rate
- Rework needed
- Satisfaction rating (prompt at end)

## Weekly Report
Every Sunday, generate comparison of approaches tried this week.
```

**File:** `~/.claude/skills/experiment/SKILL.md`

---

### 7. Parallelization Tooling - DETECTION ONLY

**Current State:** Interjection says "These could run in parallel" but no tooling to actually manage parallel sessions.

**Tunguz Insight:** *"How do I parallelize this so I can manage 10 browser tabs or terminal windows simultaneously?"*

**Gap:** Suggestion without enablement.

**Recommendation:** Create `/parallel` skill for session orchestration:

```markdown
# Parallel Orchestration

## Commands
- `/parallel split [task list]` - Break into parallel tracks
- `/parallel status` - Show all running tracks
- `/parallel merge` - Consolidate results

## Integration
- n8n workflow for parallel Claude API calls
- Each track gets isolated context
- Results aggregated via webhook
```

**Workflow ID to create:** `Claude Parallel Orchestrator`

---

## Implementation Priority

| Priority | Gap | Effort | Impact |
|----------|-----|--------|--------|
| **P0** | Unified Meta-Tools | High | 41% cost reduction |
| **P1** | Architect/Implementer Pattern | Medium | Better outcomes |
| **P1** | Test-First Enforcement | Low | Quality improvement |
| **P2** | Trajectory Data Structure | Medium | Future optimization |
| **P2** | Workflow Type Taxonomy | Low | Better matching |
| **P3** | Experiment Framework | Medium | Long-term learning |
| **P3** | Parallelization Tooling | High | Throughput increase |

---

## Quick Wins (Implement Today)

### 1. Add new interjection patterns to workflow-analyzer.py:

```python
# Feature request without spec
if any(word in prompt_lower for word in ["add feature", "implement", "build new"]):
    if "spec" not in prompt_lower and "prd" not in prompt_lower:
        suggest("architect_first", "Architect first: create PRD before implementing")

# Multiple similar tools
tool_calls = state.get("tool_usage", {})
browser_tools = sum(tool_calls.get(t, 0) for t in ["playwright", "puppeteer"])
if browser_tools > 3:
    suggest("consolidate_tools", "Consider unified-browser meta-tool")

# Consistency need
if "every time" in prompt_lower or "always the same" in prompt_lower:
    suggest("deterministic_workflow", "This calls for Deterministic workflow type")
```

### 2. Add to coaching-profiles.json suggestion_types:

```json
"architect_first": {
  "id": "architect_first",
  "message_template": "Feature request detected. Create PRD before implementing?",
  "priority": 1
},
"consolidate_tools": {
  "id": "consolidate_tools",
  "message_template": "Multiple similar tools used. Consider meta-tool consolidation.",
  "priority": 2
},
"deterministic_workflow": {
  "id": "deterministic_workflow",
  "message_template": "Consistency needed. Use Deterministic workflow type.",
  "priority": 2
}
```

### 3. Update CLAUDE.md interjection table (already done in this session)

---

## Tech Stack Integration Recommendations

### Supabase

**Current:**
- Tables for projects, agents, skills, workflows, etc.
- Real-time subscriptions working

**Add:**
- `trajectory_logs` table for sequence tracking
- `experiment_results` table for approach comparison
- `meta_tool_usage` table for consolidation metrics

```sql
CREATE TABLE trajectory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  trajectory_id TEXT NOT NULL,
  sequence JSONB NOT NULL,
  task_type TEXT,
  outcome TEXT,
  tokens_used INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE experiment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id TEXT NOT NULL,
  approach TEXT NOT NULL,
  metrics JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### n8n

**Current:**
- Claude Coaching Events Handler
- Daily Digest
- GitHub → Supabase Sync

**Add:**
- `Claude Parallel Orchestrator` - Manage parallel API calls
- `Trajectory Analyzer` - Weekly pattern analysis
- `Experiment Reporter` - Sunday workflow comparison

### Memory MCP

**Current:**
- 18 entities, 22 relations
- Cross-session learning storage

**Add:**
- Entity: "High-Value Trajectories" - Successful sequence patterns
- Entity: "Tool Consolidation Map" - Which tools to combine
- Relation: "optimizes" between trajectory patterns and outcomes

---

## Measurement Plan

After implementing recommendations, track:

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Tokens per task | Current avg | -41% | trajectory_logs |
| Task success rate | 87% (Tunguz) | 94% | outcome tracking |
| Rework frequency | Unknown | -50% | experiment_results |
| Session duration | Unknown | -20% | session-state |

---

## Summary

Your system is well-positioned for these enhancements. The existing infrastructure (workflow coaching, n8n automation, Supabase persistence, Memory MCP) provides the foundation. The key gaps are:

1. **Process gaps** - Architect/Implementer, Test-First, Experiment framework
2. **Tooling gaps** - Meta-tool consolidation, Parallelization
3. **Data gaps** - Trajectory structure, Workflow type taxonomy

Start with **Unified Meta-Tools** (P0) for immediate cost savings, then add **Architect/Implementer** (P1) for better outcomes.

---

*Generated from Tunguz research synthesis - see CLAUDE.md "Advanced AI Workflow Patterns" section for source insights.*
