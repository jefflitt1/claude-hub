# Architecture Review Template

## Task
Review the architecture of: `[PROJECT/MODULE]`

## Step 1: Gemini Analysis (Large Context)
> Invoke: "Ask Gemini to analyze [PROJECT] with its full context window"

**Questions for Gemini:**
1. What is the overall architecture pattern?
2. Are there any circular dependencies?
3. What are the main coupling points?
4. Are there obvious scalability concerns?
5. How well is the code organized?

## Step 2: Codex Security Review
> Invoke: "Get Codex's security review of [PROJECT]"

**Questions for Codex:**
1. Are there any OWASP top 10 vulnerabilities?
2. How is authentication/authorization handled?
3. Are API keys and secrets properly managed?
4. Is input validation adequate?
5. Are there any injection risks?

## Step 3: Claude Synthesis
Claude synthesizes both reviews and:
1. Prioritizes issues by severity
2. Creates actionable improvement plan
3. Implements critical fixes first

## Output Format
```markdown
## Architecture Review: [PROJECT]

### Summary
[One paragraph overview]

### Gemini Findings
- [Finding 1]
- [Finding 2]

### Codex Security Findings
- [Finding 1]
- [Finding 2]

### Prioritized Actions
1. [Critical] ...
2. [High] ...
3. [Medium] ...

### Implementation Plan
[Steps to address issues]
```
