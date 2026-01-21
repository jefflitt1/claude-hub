# Lovable Development Workflow

**Last Updated:** 2026-01-21

## Overview

Lovable is an AI-powered React app builder that generates and maintains frontend code. Projects can sync bidirectionally with GitHub, enabling work in both Lovable's web editor and local development (Claude Code).

## Active Lovable Projects

| Project | Lovable URL | GitHub Repo | Local Path |
|---------|-------------|-------------|------------|
| **L7 Partners + Claude Hub** | [0623dc91...](https://lovable.dev/projects/0623dc91-517d-423f-8ad2-54a46bcdd8ac) | `l7partners-rewrite` | `projects/l7partners-rewrite/` |

## Two-Way Sync Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOVABLE PLATFORM                             │
│  - AI-powered code generation                                        │
│  - Visual editor                                                     │
│  - Preview deployments                                               │
│  - Auto-commit on save                                               │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ automatic (~30 seconds)
┌─────────────────────────────────────────────────────────────────────┐
│                            GITHUB                                    │
│  Repository: jefflitt1/l7partners-rewrite                           │
│  Branch: main (2-way sync enabled)                                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ git pull/push
┌─────────────────────────────────────────────────────────────────────┐
│                         LOCAL CLONE                                  │
│  ~/Documents/Claude Code/claude-agents/projects/l7partners-rewrite/ │
│  - Claude Code editing                                               │
│  - npm run dev (local preview)                                       │
│  - Full IDE capabilities                                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Workflow: Editing in Lovable

1. Open Lovable project in browser
2. Make changes using Lovable's AI or visual editor
3. Lovable auto-commits to GitHub (~30s after save)
4. **Before editing locally:** Run `git pull` to get latest changes

## Workflow: Editing in Claude Code

1. **Always start with:** `git pull` to sync latest from Lovable
2. Make edits using Claude Code
3. Test locally: `npm run dev`
4. Commit and push:
   ```bash
   git add -A
   git commit -m "Description of changes"
   git push
   ```
5. Lovable syncs automatically (~30 seconds)
6. Verify in Lovable preview if needed

## Best Practices

### Do
- Always `git pull` before starting local work
- Commit frequently with clear messages
- Use Lovable for: UI design, new pages, visual experiments
- Use Claude Code for: Bug fixes, logic, refactors, complex TypeScript

### Don't
- Edit the same file in both places simultaneously
- Force push or rebase shared branches
- Leave uncommitted changes when switching to Lovable

## Handling Conflicts

If you get merge conflicts:

1. **In Claude Code (preferred):**
   ```bash
   git pull
   # Resolve conflicts in editor
   git add -A
   git commit -m "Resolve merge conflicts"
   git push
   ```

2. **In Lovable:** Limited conflict resolution - better to resolve in Git

## Project-Specific Notes

### L7 Partners + Claude Hub (`l7partners-rewrite`)

This single Lovable project contains TWO applications:

| Application | URL | Routes |
|-------------|-----|--------|
| L7 Partners Site | l7-partners.com | `/`, `/about`, `/properties`, `/tms/*`, `/portal/*` |
| Claude Hub Dashboard | claude.l7-partners.com | `/claude-catalog`, `/claude/*` |

**Claude Hub Components:**
- `src/components/sections/HomeSection.tsx` - Dashboard home
- `src/components/CommandPalette.tsx` - Cmd+K search
- `src/components/PinnedItemsSection.tsx` - Favorites
- `src/pages/ClaudeCatalog.tsx` - Main dashboard page
- `src/pages/claude/ClaudeLogin.tsx` - Auth gate

## Troubleshooting

### Lovable not showing my changes
- Wait 30-60 seconds for sync
- Check GitHub repo to confirm push succeeded
- Hard refresh Lovable (Cmd+Shift+R)

### Local changes not pulling
```bash
git fetch origin
git status
git pull origin main
```

### Lovable made unexpected changes
- Check git log to see what Lovable committed
- Revert if needed: `git revert HEAD`

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Main project context
- [l7partners-rewrite CLAUDE.md](/projects/l7partners-rewrite/CLAUDE.md) - Frontend details
- [Lovable Docs](https://docs.lovable.dev) - Official Lovable documentation

---

## Quick Reference Card

```
┌────────────────────────────────────────────────────┐
│           LOVABLE WORKFLOW CHEAT SHEET             │
├────────────────────────────────────────────────────┤
│ Before editing locally:    git pull                │
│ After editing locally:     git push                │
│ Lovable sync time:         ~30 seconds             │
│ Conflict resolution:       Do in Git, not Lovable  │
├────────────────────────────────────────────────────┤
│ Lovable best for:          UI, design, new pages   │
│ Claude Code best for:      Logic, bugs, refactors  │
└────────────────────────────────────────────────────┘
```
