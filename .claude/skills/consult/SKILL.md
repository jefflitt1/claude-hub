---
name: consult
description: Multi-model collaboration with Gemini and Codex. Get second opinions, run architecture reviews, security audits. Routes to optimal AI based on task.
allowed-tools: mcp__gemini-cli__*, mcp__codex-cli__*, Read, Bash
---

# Consult Skill - Multi-Model Collaboration

Invoke Gemini or Codex for specialized tasks, second opinions, and collaborative workflows.

## Quick Reference

| Command | Action |
|---------|--------|
| `/consult` | Show available consultation options |
| `/consult gemini [task]` | Large context analysis (1M tokens) |
| `/consult codex [task]` | Security review / alternative approach |
| `/consult arch-review [target]` | Full architecture review workflow |
| `/consult security [target]` | Security audit workflow |
| `/consult second-opinion [topic]` | Get alternative perspective on current work |

---

## Model Strengths Reference

| Model | Best For | Context |
|-------|----------|---------|
| **Claude (Opus 4.5)** | Multi-step reasoning, tool orchestration, synthesis | 200K |
| **Gemini (2.5 Pro)** | Full codebase analysis, research synthesis, multimodal | 1M |
| **Codex (GPT-5.2)** | Security analysis, refactoring, migrations, long-horizon coding | 256K |

---

## Instructions for `/consult` (Overview)

Display available options:

```markdown
## Multi-Model Consultation

### Quick Consults
- `/consult gemini [task]` - Large context analysis, research synthesis
- `/consult codex [task]` - Security review, refactoring advice

### Workflows
- `/consult arch-review [module]` - Architecture review (Gemini + Codex + Claude)
- `/consult security [target]` - Security audit (Codex + Claude)
- `/consult second-opinion` - Alternative perspective on current work

### When to Use Each

| Need | Command |
|------|---------|
| Analyze entire codebase | `/consult gemini` |
| Security vulnerabilities | `/consult codex` or `/consult security` |
| Alternative implementation | `/consult codex` |
| Research synthesis | `/consult gemini` |
| Architectural concerns | `/consult arch-review` |
```

---

## Instructions for `/consult gemini [task]`

### Step 1: Prepare Context

Gather relevant context for Gemini's large context window:
- Read key files related to the task
- Summarize project structure if codebase analysis

### Step 2: Invoke Gemini

Use the gemini-cli MCP server to send the task:

```
Task: [user's task]

Context:
- Project: [current project from CLAUDE.md]
- Relevant files: [list files read]
- Question/Analysis needed: [specific ask]

Please analyze with your full context capabilities and provide:
1. Overview of findings
2. Specific concerns or recommendations
3. Confidence level
```

### Step 3: Present Gemini's Response

Format the response:

```markdown
## Gemini Analysis

### Task
[what was asked]

### Findings
[Gemini's analysis]

### Next Steps
Based on Gemini's analysis:
- [ ] [Actionable item 1]
- [ ] [Actionable item 2]

Want me to act on any of these recommendations?
```

---

## Instructions for `/consult codex [task]`

### Step 1: Prepare Context

Gather security-relevant context:
- Read files to be reviewed
- Note any known security considerations

### Step 2: Invoke Codex

Use the codex-cli MCP server:

```
Task: [user's task]

Context:
- Files for review: [list]
- Security concerns: [any known issues]
- Focus areas: [specific security aspects if any]

Please provide:
1. Security assessment
2. Alternative approaches (if implementation review)
3. Severity ratings for any issues found
4. Recommended fixes
```

### Step 3: Present Codex's Response

```markdown
## Codex Security Review

### Task
[what was asked]

### Findings
| Issue | Severity | Recommendation |
|-------|----------|----------------|
| [issue] | [High/Medium/Low] | [fix] |

### Alternative Approaches
[if applicable]

### Summary
[overall assessment]

Want me to implement any of these fixes?
```

---

## Instructions for `/consult arch-review [target]`

Full architecture review using multiple models.

### Step 1: Gemini Analysis

Prompt Gemini with full codebase context:

```
Analyze the architecture of [target]:

1. What is the overall architecture pattern?
2. Are there any circular dependencies?
3. What are the main coupling points?
4. Are there obvious scalability concerns?
5. How well is the code organized?

Provide a structured analysis.
```

### Step 2: Codex Security Review

Prompt Codex:

```
Security review of [target]:

1. Are there any OWASP top 10 vulnerabilities?
2. How is authentication/authorization handled?
3. Are API keys and secrets properly managed?
4. Is input validation adequate?
5. Are there any injection risks?

Provide findings with severity ratings.
```

### Step 3: Claude Synthesis

Combine both reviews:

```markdown
## Architecture Review: [target]

### Summary
[One paragraph overview combining both analyses]

### Gemini Findings (Architecture)
- [Finding 1]
- [Finding 2]

### Codex Findings (Security)
- [Finding 1 with severity]
- [Finding 2 with severity]

### Prioritized Actions
1. **Critical:** [highest priority items]
2. **High:** [important but not urgent]
3. **Medium:** [should address]

### Implementation Plan
[Steps to address the issues]

Ready to start implementing fixes?
```

---

## Instructions for `/consult security [target]`

Security-focused audit workflow.

### Step 1: Codex Deep Scan

```
Comprehensive security audit of [target]:

Focus areas:
- Authentication/Authorization
- Input validation and sanitization
- SQL injection, XSS, CSRF vulnerabilities
- Secrets management
- API security
- Dependency vulnerabilities

Provide detailed findings with:
- Severity (Critical/High/Medium/Low)
- Location (file:line)
- Recommended fix
- OWASP category if applicable
```

### Step 2: Claude Review and Triage

Review Codex findings and:
1. Validate each finding
2. Check for false positives
3. Prioritize by actual risk in this codebase
4. Create implementation plan

### Step 3: Present Results

```markdown
## Security Audit: [target]

### Executive Summary
[Critical count] critical, [High count] high, [Medium count] medium issues found.

### Critical Issues (Fix Immediately)
| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | [issue] | [file:line] | [fix] |

### High Priority
...

### Medium Priority
...

### Recommendations
1. [Immediate actions]
2. [Short-term improvements]
3. [Long-term security posture]

Shall I start fixing the critical issues?
```

---

## Instructions for `/consult second-opinion [topic]`

Get an alternative perspective on current work.

### Step 1: Assess Current Context

Determine what's being worked on:
- Check recent files edited
- Check current task context
- Ask user for clarification if needed

### Step 2: Route to Appropriate Model

| Context | Route To |
|---------|----------|
| Implementation approach | Codex (alternative impl) |
| Architecture decision | Gemini (big picture) |
| Security concern | Codex (security review) |
| Research/synthesis needed | Gemini (research) |

### Step 3: Frame the Question

```
We're currently working on: [context]

The current approach is: [what Claude/user proposed]

Please provide:
1. Your assessment of this approach
2. Alternative approaches you'd consider
3. Pros/cons comparison
4. Your recommendation
```

### Step 4: Present Comparison

```markdown
## Second Opinion: [topic]

### Current Approach
[what we're doing]

### Alternative Perspective ([Gemini/Codex])
[their analysis]

### Comparison
| Aspect | Current | Alternative |
|--------|---------|-------------|
| [aspect] | [pro/con] | [pro/con] |

### Recommendation
[synthesis of both perspectives]

How would you like to proceed?
```

---

## Routing Logic

When user doesn't specify a model, auto-route based on task:

| Task Keywords | Route To |
|---------------|----------|
| "analyze codebase", "full repo", "research" | Gemini |
| "security", "vulnerabilities", "audit" | Codex |
| "alternative", "refactor", "better way" | Codex |
| "synthesize", "summarize docs", "multimodal" | Gemini |
| "migration", "large refactor" | Codex |

---

## Integration with Workflow Config

Reference the orchestration configs at:
`~/Documents/Claude Code/claude-agents/ai-orchestration/configs/multi-agent.json`

For custom workflows, see templates at:
`~/Documents/Claude Code/claude-agents/ai-orchestration/templates/`

---

## Error Handling

If MCP server not responding:

```markdown
## Connection Issue

The [Gemini/Codex] CLI isn't responding. Try:

1. **Re-authenticate:**
   - Gemini: `gemini` (in terminal, follow OAuth)
   - Codex: `codex login` (in terminal)

2. **Check MCP server:**
   ```bash
   claude mcp list
   ```

3. **Restart Claude Code** if servers were just added
```

---

## Proactive Thinking (IMPORTANT)

**Before starting complex tasks, ask yourself:**

1. **Could Gemini's 1M context help?**
   - Analyzing >50 files? → `/consult gemini`
   - Need full codebase understanding? → `/consult gemini`
   - Research synthesis needed? → `/consult gemini`

2. **Is this security-sensitive?**
   - Auth/authorization code? → `/consult security`
   - API endpoints? → `/consult codex`
   - Input handling? → `/consult codex`

3. **Am I uncertain about the approach?**
   - Design decision? → `/consult second-opinion`
   - Multiple valid approaches? → `/consult codex`

4. **Is this a major change?**
   - Large refactor? → `/consult codex`
   - Architecture decision? → `/consult arch-review`

**Don't wait to be asked** - proactively suggest consultations when you recognize these patterns. Say things like:
- "This touches auth - let me `/consult security` before we proceed"
- "Given the scope, I'll `/consult gemini` for full codebase analysis first"
- "I have two approaches in mind - let me `/consult second-opinion` to validate"

## Auto-Trigger Patterns

Automatically suggest `/consult` when you see:

| Pattern in User Request | Suggest |
|------------------------|---------|
| "review", "audit", "check security" | `/consult security` |
| "analyze codebase", "full repo", "entire project" | `/consult gemini` |
| "refactor", "migrate", "rewrite" | `/consult codex` |
| "architecture", "design", "structure" | `/consult arch-review` |
| "what do you think", "is this right", "better way" | `/consult second-opinion` |
| "alternative", "other approaches", "options" | `/consult codex` |
