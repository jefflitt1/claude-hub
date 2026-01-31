# Built Technologies — Sales Enablement System

## Overview

Enterprise SaaS sales enablement for Built Technologies, a construction finance platform. Jeff sells to banks and lenders, using AI-assisted sales coaching, domain expertise, and communication tools.

## Skills

| Skill | Purpose |
|-------|---------|
| `/built-sme` | Construction finance domain expertise (loan types, draws, compliance) |
| `/built-sales` | Chris Voss + Challenger + MEDDPICC sales coaching |
| `/built-admin` | Email drafting, meeting prep, CRM notes, follow-ups |

## Data

| Table | Purpose |
|-------|---------|
| `built_deals` | Pipeline tracking with MEDDPICC fields |
| `built_contacts` | Prospects, champions, economic buyers |
| `built_interactions` | Call logs, emails, meeting notes |

## Workflow

1. **Prep**: `/built-sales prep [prospect]` → call prep sheet
2. **Domain**: `/built-sme [topic]` → technical depth for conversations
3. **Execute**: `/built-sales roleplay` → practice before calls
4. **Debrief**: `/built-sales debrief` → post-call analysis
5. **Follow-up**: `/built-admin email follow-up` → draft communications
6. **Track**: `/built-admin crm [deal]` → pipeline updates

## Data Locations

| Type | Path |
|------|------|
| Project root | `projects/built/` |
| Deal data | `projects/built/data/` |
| Documentation | `projects/built/docs/` |
