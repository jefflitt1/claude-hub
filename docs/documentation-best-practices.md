# Documentation Best Practices for Claude Agent Projects

**Last Updated:** 2026-01-18
**Applies To:** All projects in claude-agents repository
**Owner:** Secretary Agent (per-project)

---

## Purpose

This guide establishes standards for documentation across Claude-managed projects. Consistent documentation enables:
- Reliable handoffs between sessions
- Quick context recovery after compaction
- Clear decision audit trails
- Effective collaboration between agents

---

## Document Hierarchy

### Tier 1: Project Root
Every project should have a `CLAUDE.md` at its root containing:
- Mission/purpose statement
- Agent roster and responsibilities
- Key commands/skills
- Data locations
- Quick reference for common tasks

### Tier 2: Operational Docs (`docs/`)
| Document | Purpose | Required |
|----------|---------|----------|
| business-plan.md | Operations manual, current state, progress | Yes |
| strategic-decisions.md | Formal decision log with rationale | Yes |
| session-notes.md | Running log of session accomplishments | Yes |
| [domain]-architecture.md | Technical design for the domain | As needed |
| [domain]-rules.md | Business rules and parameters | As needed |

### Tier 3: Agent Instructions (`.claude/agents/`)
One markdown file per agent containing:
- Role description
- Responsibilities
- When to invoke
- Integration with other agents
- Templates and standards

### Tier 4: Session Logs (`docs/session-logs/`)
Per-session recap files for detailed history.

---

## Standard Document Structure

### Required Sections

```markdown
# Document Title

**Last Updated:** YYYY-MM-DD
**Owner:** [Agent or Person]
**Review Cycle:** [Frequency]

---

## Purpose
[Why this document exists]

---

## [Content Sections]
[Main content organized by topic]

---

## Version History
| Date | Version | Changes |
|------|---------|---------|
| YYYY-MM-DD | X.X | [What changed] |
```

### Optional Sections
- Table of Contents (for docs >3 sections)
- Amendment Process
- Related Documents
- External References

---

## Naming Conventions

### Files
- Use kebab-case: `strategic-decisions.md`
- Be descriptive: `data-architecture.md` not `arch.md`
- Include domain prefix for clarity: `jgl-positions-schema.sql`

### Folders
- Use lowercase with hyphens: `session-logs/`
- Keep depth shallow (max 3 levels)

### References
- Decision numbers: `D001`, `D002`, etc.
- Milestone IDs: `M001`, `M002`, etc.
- Version numbers: Semantic versioning `1.0`, `1.1`, `2.0`

### Dates
- Always use ISO format: `YYYY-MM-DD`
- Include time when relevant: `YYYY-MM-DD HH:MM`

---

## Update Protocols

### When to Update Documents

| Event | Documents to Update |
|-------|---------------------|
| Strategic decision made | strategic-decisions.md, business-plan.md |
| Milestone completed | business-plan.md (milestones section) |
| New initiative started | business-plan.md (current initiatives) |
| Code/schema changed | CLAUDE.md (if data locations change), architecture docs |
| Session ends | session-notes.md or run /recap |
| Parameters changed | Relevant rules doc, strategic-decisions.md if major |

### Update Checklist
- [ ] Update "Last Updated" date
- [ ] Add entry to Version History (for major docs)
- [ ] Verify cross-references still valid
- [ ] Check for stale information nearby
- [ ] Commit to git with descriptive message

---

## Cross-Reference Standards

### Internal Links
Use relative paths from document location:
```markdown
See [strategic decisions](./strategic-decisions.md)
See [CIO agent](../.claude/agents/cio.md)
```

### External Links
Include purpose and verify periodically:
```markdown
[TradeStation API Docs](https://api.tradestation.com/docs) - Official API reference
```

### Broken Link Protocol
1. Flag broken link with `[BROKEN LINK]` marker
2. Note in session log
3. Fix or remove within 1 week

---

## Decision Documentation

### What Qualifies as a Decision
- Changes to strategy parameters
- Architecture choices
- Tool/service selections
- Process changes
- Anything requiring CIO approval

### Decision Entry Format
```markdown
### D0XX: [Clear, Descriptive Title]
**Date:** YYYY-MM-DD
**Status:** [Proposed | Approved | Implemented | Superseded]
**Owner:** [Agent responsible for implementation]

**Question:** [What problem or choice prompted this?]

**Options Considered:**
1. [Option A] - [Pros/cons]
2. [Option B] - [Pros/cons]
3. [Option C] - [Pros/cons]

**Decision:** [What was decided]

**Rationale:** [Why this option was chosen]

**Implementation:**
- [Step 1]
- [Step 2]

**Supersedes:** [D0XX if replacing previous decision]
```

---

## Progress Tracking

### Status Labels
| Label | Meaning |
|-------|---------|
| Not Started | In backlog, no work begun |
| In Progress | Actively being worked on |
| Blocked | Cannot proceed, waiting on dependency |
| Review | Complete, awaiting approval |
| Complete | Done and verified |
| Superseded | Replaced by newer initiative |

### Milestone Format
```markdown
| Date | Milestone | Details |
|------|-----------|---------|
| YYYY-MM-DD | [Short Name] | [What was accomplished, links to related docs] |
```

### Backlog Item Format
```markdown
- [ ] [Task description]
  - Owner: [Agent]
  - Priority: [High/Medium/Low]
  - Blocked by: [Dependency if any]
  - Target: [Date if known]
```

---

## Session Recap Standards

### When to Recap
- End of significant work session
- Before context compaction
- After completing major milestone
- Weekly minimum for active projects

### Recap Contents
1. **Accomplishments** - What was done
2. **Decisions** - Any choices made
3. **Open Items** - What's pending
4. **Blockers** - What's preventing progress
5. **Next Steps** - Immediate priorities

### Recap to Document Flow
```
Session work
    ↓
/recap command
    ↓
session-logs/[timestamp].md created
    ↓
Secretary agent updates:
  - business-plan.md (progress, milestones)
  - strategic-decisions.md (if decisions made)
  - session-notes.md (summary added)
    ↓
Git commit
```

---

## Quality Checklist

### Before Committing Documentation
- [ ] All dates in YYYY-MM-DD format
- [ ] "Last Updated" is current
- [ ] No placeholder text ([TODO], [TBD], etc.) without explanation
- [ ] Tables are properly formatted
- [ ] Code blocks have language specified
- [ ] Links tested and working
- [ ] No sensitive data (credentials, keys)
- [ ] Spelling/grammar checked

### Monthly Review
- [ ] All docs have been updated within review cycle
- [ ] Cross-references validated
- [ ] Obsolete content archived or removed
- [ ] Agent instructions match current practice
- [ ] Business plan reflects actual state

---

## Backup and Version Control

### Git Standards
- Commit documentation changes separately from code
- Use descriptive commit messages: `docs: update strategic-decisions with D011`
- Push to remote after significant updates
- Tag major documentation versions

### Backup Locations
| Location | Purpose | Frequency |
|----------|---------|-----------|
| Local Mac | Working copy | Real-time |
| GitHub | Offsite backup, collaboration | Per commit |
| Supabase | Operational data (not docs) | Per sync |

### Recovery Protocol
If documentation is lost:
1. Pull from GitHub (primary backup)
2. Check local git history
3. Review Supabase for operational state
4. Reconstruct from session logs if needed

---

## Agent-Specific Guidelines

### Secretary Agent
- Primary owner of documentation quality
- Runs recap at session end
- Updates business-plan.md after milestones
- Maintains strategic-decisions.md

### All Other Agents
- Update their own agent instruction file when role changes
- Flag documentation gaps to Secretary
- Include doc updates in task completion

---

## Template Library

Templates are stored in `claude-agents/templates/` for reuse:
- `project-claude-md.template.md` - New project CLAUDE.md
- `business-plan.template.md` - New business plan
- `agent-instructions.template.md` - New agent file
- `decision-entry.template.md` - Decision log entry

---

## Adoption Checklist for New Projects

### Documentation Setup
- [ ] Create `CLAUDE.md` at project root
- [ ] Create `docs/` folder with business-plan.md
- [ ] Create `docs/strategic-decisions.md`
- [ ] Create `.claude/agents/` with agent files
- [ ] Create `.claude/agents/secretary.md`
- [ ] Initialize git repository
- [ ] Push to GitHub
- [ ] Add project to claude-agents tracking

### Communication Infrastructure
- [ ] Create dedicated Telegram bot via @BotFather
- [ ] Create n8n credential for the bot
- [ ] Set up Telegram-to-Claude Q&A workflow (see [telegram-claude-qa-pattern.md](./telegram-claude-qa-pattern.md))
- [ ] Add bot to relevant Telegram groups/channels

**Why dedicated bots per project:**
- Clear separation of concerns (L7 queries don't mix with JGL queries)
- Project-specific context and knowledge base
- Independent rate limits and logging
- Easier credential management and rotation

**Current Project Bots:**
| Project | Bot | Username | n8n Credential |
|---------|-----|----------|----------------|
| L7 Partners | L7 Action Items Bot | @n8nmasteractionjeffbot | L7 Action Items Bot |
| JGL Capital | JGL Personal Assistant | @jgl_personal_bot | JGL Personal Assistant |
| System | JeffN8NCommunicationbot | @JeffN8Ncommunicationbot | JeffN8NCommunicationbot |

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-18 | 1.0 | Initial best practices guide |
