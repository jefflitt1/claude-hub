# Agent Tracker Project

## Overview

A web dashboard to track and manage Claude agents, prompts, MCP servers, and n8n workflows across Mac and Raspberry Pi environments.

## Architecture

```
Mac (Development)          Raspberry Pi (Automation)
├── Claude Code CLI        ├── n8n (self-hosted)
├── Interactive editing    ├── Claude API via n8n
├── Test & refine          ├── Scheduled triggers
└── Push to this repo      └── Pulls shared configs
```

**Shared layer:** This Git repo syncs prompts, configs, and templates between machines.

## Tech Stack (TBD)

Options being considered:
- Node.js + SQLite + Express
- Python + Flask + SQLite

## Project Structure

```
claude-agents/
├── CLAUDE.md          # This file - project context
├── docs/              # Design specs and session notes
├── prompts/           # Saved system instructions
├── app/               # Agent Tracker web app (when built)
└── configs/           # Machine-specific configurations
```

## MCP Servers

| Server | Purpose |
|--------|---------|
| n8n-mcp | Connect to n8n at https://n8n.l7-partners.com |
| gdrive-JGL | Google Drive access (JGL account) |
| gdrive-L7 | Google Drive access (L7 account) |

## Development Notes

- Claude Code is interactive-only, can't run headlessly
- n8n handles all scheduled/automated tasks via Claude API
- MCP connects Claude Code → n8n (not reverse)
- Agent customizations don't auto-sync between Claude Code and n8n

## Current Status

See `docs/session-notes.md` for latest progress and next steps.
