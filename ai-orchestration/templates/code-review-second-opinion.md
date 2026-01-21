# Code Review - Second Opinion Template

## Task
Get a second opinion on: `[FILE/FEATURE/PR]`

## When to Use
- Before merging significant changes
- When unsure about implementation approach
- For security-sensitive code
- When stuck on a design decision

## Step 1: Describe the Code
Provide context to the reviewing agent:
- What does this code do?
- What problem does it solve?
- What alternatives were considered?

## Step 2: Invoke Reviewer

### For Security Review:
> "Ask Codex to review [FILE] for security issues and suggest improvements"

### For Alternative Approaches:
> "Get Codex's opinion on alternative implementations for [FEATURE]"

### For Large-Scale Analysis:
> "Have Gemini analyze [MODULE] and identify architectural concerns"

## Step 3: Evaluate Feedback
Claude evaluates the feedback:
1. Which suggestions are actionable?
2. Do the recommendations align with project patterns?
3. What's the effort/impact tradeoff?

## Response Template for Reviewing Agent

```markdown
## Code Review: [FILE/FEATURE]

### Overview
[What I understand this code does]

### Strengths
- [What's done well]

### Concerns
- [Issue 1]: [Severity] - [Description]
- [Issue 2]: [Severity] - [Description]

### Alternative Approaches
1. [Approach 1]: [Pros/Cons]
2. [Approach 2]: [Pros/Cons]

### Recommendations
1. [Must fix] ...
2. [Should consider] ...
3. [Nice to have] ...

### Confidence
[High/Medium/Low] - [Why]
```
