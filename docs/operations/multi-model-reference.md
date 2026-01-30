# Multi-Model Collaboration Reference

> Loaded by `/consult` skill. Not needed in CLAUDE.md — this is on-demand reference.

## Model Strengths Comparison
> **Last Updated:** 2026-01-21 | **Update Frequency:** Weekly (Mondays) | **Reminder:** jeff-agent recurring task

| Capability | Claude Opus 4.5 | Gemini 2.5 Pro | GPT-5.2 Codex | Grok 4 | DeepSeek R1/V3 |
|------------|-----------------|----------------|---------------|--------|----------------|
| **Context Window** | 200K | **1M tokens** | 256K | 128K | 128K |
| **Reasoning** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (R1) |
| **Coding** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Security** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Multimodal** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Real-time Data** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Cost (per 1M tokens)** | $15/$75 | Free tier | Plus sub | $2/$10 | **$0.14/$0.28** |

## When to Use Each Model

| Task | Best Model | Why |
|------|------------|-----|
| **Planning & architecture** | Claude | Deep reasoning, maintains context across steps |
| **Full codebase analysis** | Gemini | 1M token window fits entire repos |
| **Large refactors/migrations** | Codex | Long-horizon work, maintains invariants |
| **Security review** | Claude + Codex | Both excel at vulnerability detection |
| **Document/research synthesis** | Gemini | Multimodal, handles massive docs |
| **UI/frontend development** | Gemini | Aesthetic web development strength |
| **Debugging complex issues** | Claude | Superior multi-step reasoning |
| **Code review (second opinion)** | Codex | Fresh perspective, different patterns |
| **Video/audio analysis** | Gemini | Native multimodal |
| **Agentic workflows** | Claude | Best tool orchestration |
| **Real-time X/Twitter context** | Grok | Only model with live X access |
| **Current events/news** | Grok | Real-time information retrieval |
| **Bulk reasoning tasks** | DeepSeek R1 | 10x cheaper than GPT-4, excellent reasoning |
| **Cost-sensitive coding** | DeepSeek V3 | GPT-4 quality at 1/10th cost |
| **Math/logic problems** | DeepSeek R1 | Chain-of-thought reasoning specialization |

## Model-Specific Sweet Spots

**Claude Opus 4.5** - Primary workhorse:
- Complex multi-step tasks requiring planning
- Tool orchestration and agentic workflows
- Security engineering and exploit analysis
- Tasks requiring maintained context over long sessions

**Gemini 2.5 Pro** - Consult for:
- Analyzing entire codebases at once (1M context)
- Research synthesis from large document sets
- Multimodal tasks (images, video, audio)
- Web/UI development with aesthetic focus
- When you need a "big picture" view

**GPT-5.2 Codex** - Consult for:
- Major refactoring projects
- Code migrations and large feature builds
- Security vulnerability scanning
- Alternative implementation approaches
- When Claude's approach isn't working

**Grok 4** - Consult for:
- Real-time X/Twitter analysis and sentiment
- Current events requiring live data
- Social media trend analysis
- News-driven market research
- When you need "what's happening right now"

**DeepSeek R1/V3** - Consult for:
- Bulk reasoning at low cost (10x cheaper)
- Math and logic-heavy problems (R1 excels)
- Cost-sensitive batch processing
- Local inference for sensitive data (via Ollama)
- When budget matters but quality can't suffer

## Example Prompts
- "Ask Gemini to analyze the entire codebase and identify architectural issues"
- "Get Codex's opinion on this authentication implementation"
- "Have Gemini synthesize these 5 research papers into actionable insights"
- "Consult Codex for a security review of this API endpoint"
- "Ask Gemini to review this video for UI/UX issues"
- "Ask Grok what's trending on X about this topic"
- "Use DeepSeek R1 to solve this math optimization problem"
- "Run this bulk analysis through DeepSeek to save on API costs"

## API Keys & Config
| Model | Config Location | Status |
|-------|-----------------|--------|
| Gemini | OAuth (`gemini` CLI) | Active |
| Codex | OAuth (`codex login`) | Active |
| Grok | `~/.config/grok-cli/config.json` | Active |
| DeepSeek | `~/.config/deepseek/config.json` | Active |

**Re-authenticate CLIs if needed:**
- Gemini: `gemini` (opens browser)
- Codex: `codex login` (opens browser)

## Local Models (Ollama - 32GB Mac Studio)
| Model | Size | RAM | Use Case |
|-------|------|-----|----------|
| `deepseek-r1:14b` | 14B | ~10GB | Fast reasoning, fits easily |
| `deepseek-r1:32b` | 32B | ~20GB | Best local reasoning |
| `llama3.3:latest` | 70B | ~28GB | General purpose, tight fit |
| `gemma3:27b` | 27B | ~18GB | Vision-capable local |

**Install Ollama:** `brew install ollama && ollama serve`

## Headless Automation Scripts
Located in `~/.claude/scripts/`:

| Script | Purpose | Usage |
|--------|---------|-------|
| `morning-digest.sh` | Feedly summary to Telegram | `./morning-digest.sh [--dry-run] [--email]` |
| `claude-automate.sh` | General automation wrapper | `claude-automate <preset> [--dry-run]` |

**Presets for claude-automate:**
- `digest` - Morning Feedly digest
- `inbox-triage` - Email triage with priorities
- `portfolio` - L7 portfolio status
- `market-scan` - Quick market overview

**Cron examples:** `~/.claude/scripts/cron-examples.txt`
