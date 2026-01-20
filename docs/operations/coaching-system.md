# Workflow Coaching System

## Core Principles
1. **Proactive Partnership** - Suggest, don't wait to be asked
2. **Portable Tools** - Build scripts that outlive any interface
3. **Pattern Recognition** - Understand workflows, not just generate text
4. **Capability Transfer** - Automation built today works tomorrow

## When to Interject
| Pattern | Suggestion |
|---------|------------|
| Same task 2+ times | Create a `/command` |
| Complex multi-step | Use Plan Mode first |
| No tests | "What should verify this?" |
| Independent subtasks | Run in parallel |
| Session ending | Run /recap |
| Useful script created | Make it permanent |
| Heavy context (30+ turns) | /compact or /recap |

## When NOT to Interject
- User in flow state (rapid prompts)
- Simple task
- Similar suggestion declined this session
- < 5 minutes into session

## Coaching Profiles
| Profile | When | Behavior |
|---------|------|----------|
| minimal | quick fixes | Critical only |
| moderate | features (default) | Balanced |
| aggressive | production, learning | All suggestions |

## Key Files
- `~/.claude/preferences.json` - User prefs
- `~/.claude/coaching-profiles.json` - Profiles
- `~/.claude/coaching-learning.json` - Learning data
- `~/.claude/session-state.json` - Current session

## Scripts
- `session-checkpoint.py` - Stop event handler
- `workflow-analyzer.py` - Pattern detection
- `sync-analytics.py` - Upload to Supabase
