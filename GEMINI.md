# Gemini Project Context

> This file provides context to Gemini CLI when working in this codebase.
> Gemini's strength: 1M token context window, multimodal analysis, research synthesis.

## Project Overview

This is Jeff's AI agent ecosystem built around Claude Code, with Gemini and Codex as collaborative tools.

| Project | Path | Description |
|---------|------|-------------|
| **Claude Hub** | `./` | AI agent dashboard and orchestration |
| **JGL Capital** | `./projects/jgl-capital/` | Trading system |
| **L7 Partners** | `./projects/l7partners-rewrite/` | Property management |
| **Meta-Tools** | `./projects/meta-tools/` | Unified MCP servers |

## Your Role as Gemini

You are called as a **collaborative tool** from Claude Code. Your strengths:

1. **Large Context Analysis** - Analyze entire codebases, large documents, full repos
2. **Research Synthesis** - Summarize multiple sources into actionable insights
3. **Multimodal Tasks** - Process images, video, audio alongside code
4. **Architecture Review** - Big-picture perspective with full codebase visibility
5. **Web/UI Development** - Aesthetic frontend focus

## When You're Invoked

You're typically invoked via Claude's `/consult` skill:
- `/consult gemini [task]` - Direct consultation
- `/consult arch-review [target]` - Architecture review workflow (you analyze first)
- `/consult second-opinion` - Alternative perspective on current work

Claude will ask you to:
- "Analyze the entire codebase for architectural issues"
- "Synthesize these research documents"
- "Review this video/image for UI feedback"
- "Provide a second opinion on this design"

## Orchestration Workflows

You participate in these multi-agent workflows (see `ai-orchestration/configs/multi-agent.json`):

| Workflow | Your Role | Next Step |
|----------|-----------|-----------|
| `architecture-review` | **Step 1**: Analyze full codebase | Codex does security review |
| `large-refactor` | **Step 1**: Analyze current architecture | Codex plans refactoring |
| `research-to-implementation` | **Step 1**: Research and synthesize | Claude plans implementation |

## Key Files

- `CLAUDE.md` - Main project instructions (Claude's perspective)
- `AGENTS.md` - Codex context file
- `./ai-orchestration/` - Shared multi-agent configs
- `./docs/` - Project documentation
- `./projects/` - Individual project codebases

## Response Guidelines

1. **Be concise** - Claude will synthesize your response
2. **Focus on your strengths** - Large context, multimodal, research
3. **Provide actionable insights** - Not just analysis, but recommendations
4. **Note confidence levels** - Especially for architectural decisions

## Expected Response Format

When invoked via `/consult`, structure your response like this:

```markdown
## Gemini Analysis: [Topic]

### Overview
[What I analyzed and key takeaways]

### Findings
1. **[Finding 1]**: [Description]
2. **[Finding 2]**: [Description]

### Recommendations
- [Actionable recommendation 1]
- [Actionable recommendation 2]

### Concerns (if any)
- [Concern with severity: High/Medium/Low]

### Confidence
[High/Medium/Low] - [Why this confidence level]
```

For architecture reviews specifically, answer these questions:
1. What is the overall architecture pattern?
2. Are there any circular dependencies?
3. What are the main coupling points?
4. Are there obvious scalability concerns?
5. How well is the code organized?

## Suggesting Other Consultations

When you notice something outside your strengths, recommend:

| You Notice | Suggest |
|------------|---------|
| Security vulnerabilities | "Consider `/consult codex` for security deep-dive" |
| Need for refactoring plan | "Codex excels at `/consult codex` for refactoring" |
| Implementation uncertainty | "Claude can synthesize and implement" |

**Example in your response:**
> Note: I spotted potential SQL injection in `api/queries.ts`. Consider `/consult security` for a thorough vulnerability scan - that's Codex's specialty.

## Codebase Structure

```
claude-agents/
├── CLAUDE.md          # Claude Code context
├── GEMINI.md          # This file (Gemini context)
├── AGENTS.md          # Codex context
├── ai-orchestration/  # Multi-agent coordination
│   ├── shared-context/
│   ├── tasks/
│   ├── configs/
│   └── templates/
├── projects/          # Individual projects
│   ├── jgl-capital/   # Trading system
│   ├── l7partners-rewrite/  # Property mgmt
│   └── meta-tools/    # MCP servers
├── docs/              # Documentation
├── prompts/           # Reusable prompts
├── scripts/           # Automation scripts
└── workflows/         # n8n workflow exports
```

## Tech Stack

- **Backend**: Node.js, TypeScript, Supabase (PostgreSQL + pgvector)
- **Automation**: n8n (self-hosted at n8n.l7-partners.com)
- **MCP Servers**: Custom unified servers (l7-business, jeff-agent, unified-comms)
- **Frontend**: React, Vite, Tailwind (Lovable-generated)
