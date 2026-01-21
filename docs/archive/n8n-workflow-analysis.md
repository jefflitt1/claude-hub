# n8n Workflow Analysis & Cleanup Recommendations

**Generated:** 2026-01-17
**Total Workflows:** 85
**Active:** 22 | **Inactive:** 63

---

## Summary by Category

| Category | Count | Action |
|----------|-------|--------|
| Keep Active (Production) | 16 | No changes needed |
| Pending Activation (Claude Hub) | 3 | Activate when ready |
| Keep Inactive (Templates/Dev) | 16 | Preserve for reference |
| Candidates for Deletion | 50 | Review and cleanup |

---

## 1. KEEP ACTIVE - Production Workflows (16)

These are working production workflows that should remain active.

| ID | Name | Tags | Updated | Notes |
|----|------|------|---------|-------|
| `2fwvrmN2I3PDcXRz` | Daily Agent Status Digest | - | 2026-01-17 | Claude Hub - daily notifications |
| `KQ2bleG4vj728I4f` | GitHub -> Supabase Project Sync | - | 2026-01-17 | Claude Hub - syncs projects |
| `UnaVIfIo1Wy4bUSg` | Sync n8n Workflows to Claude Hub | - | 2026-01-17 | Claude Hub - workflow sync |
| `VLodg6UPtMa6DV30` | Claude Code Mobile Approvals | - | 2026-01-17 | Claude Hub - mobile approvals |
| `JmKq2szBEImx8Uv5` | Sports schedule - latest | JGL, active dev | 2025-12-03 | Personal - sports tracking |
| `ibNsTUGTbdbh1RKv` | Daily Sports Briefing | JGL, active dev | 2026-01-16 | Personal - daily briefing |
| `OSKEDUq7HqOKiwWw` | error trigger | JGL, active dev | 2025-09-05 | System - error notifications |
| `Et5ODelMIBMYrNCO` | ROI Calculator trigger | PROBIS | 2025-08-19 | PROBIS - business logic |
| `UoIkhhkavgzvDXfA` | Airtop - ROI Calculator | PROBIS, WIP | 2025-08-17 | PROBIS - ROI calculations |
| `k4Rt8brxVpBO15IC` | ROI Calculator Notification | - | 2025-08-21 | PROBIS - notifications |
| `UC2V1dWtmZvQwlUR` | L7 Partners website submission | l7, active dev | 2025-09-11 | L7 - lead capture |
| `enXArZitFcJovFlF` | Master Tenant Management | l7, weaviate, active dev | 2025-10-27 | L7 - core workflow |
| `pK0muoyUOFyrfUUL` | L7 Drive Trigger for files to Weaviate | l7 | 2025-08-29 | L7 - document ingestion |
| `G0iqjev1R4IsFxrA` | PDF to weaviate - L7 | l7, active dev | 2025-08-27 | L7 - PDF processing |
| `BdmQTuQ9YwkiFp2M` | PDF to weaviate | PROBIS, active dev | 2025-08-27 | PROBIS - PDF processing |
| `sqtzRu7FiJyRbVDj` | Magic N8N | WIP | 2025-12-30 | Magic - active development |

---

## 2. PENDING ACTIVATION - Claude Hub Workflows (3)

Recently created workflows that need activation when ready.

| ID | Name | Created | Nodes | Notes |
|----|------|---------|-------|-------|
| `btzTPdQPMQNBwujF` | System Health Check | 2026-01-17 | 6 | Monitoring - ready to activate |
| `w1st7CarxGp6LYM7` | Weekly Backup - Supabase & n8n | 2026-01-17 | 6 | Backup - ready to activate |
| `cSXBlzLBmD5KuFSJ` | Daily Memory Graph Backup | 2026-01-17 | 3 | Backup - ready to activate |

---

## 3. KEEP INACTIVE - Templates & Development (16)

Useful reference workflows or development work worth preserving.

| ID | Name | Tags | Notes |
|----|------|------|-------|
| `AejN400NwnXOUW84` | Workflow Test Suite | - | Testing framework |
| `TCmkLz26FHroUCSt` | Template - OpenAI Webhook to Gmail | JGL | Reusable template |
| `InhzBTOQWbxL18Lx` | Lead Scraper to email generator | l7, approved | L7 approved workflow |
| `hthOCOMjdIq08cWy` | L7 Submission Form | l7 | L7 form handling |
| `aWNdSnb7eAolMYey` | Mongo Upload | l7 | L7 data migration |
| `8I3jVftaCbEojVqD` | Sporting Schedules | JGL | Sports - prior version |
| `l8r6U4RUkziQ8Xnm` | amex-tracker | JGL | Personal finance |
| `LgcMPqogpYQ0rEx0` | PROBIS Emails | - | PROBIS email system |
| `0KRbAsCCRukazUdm` | Supabase to L7 | - | Data sync utility |
| `VeYu130a14Suxxjt` | Supabase to PROBIS | - | Data sync utility |
| `qOz0zWai4Pzlz87q` | Magic Reveal - Production Stable | - | Magic - stable backup |
| `LzxQ32MavETzJC4Y` | Photoreveal - Clean Room | - | Magic - variant |
| `DxohDApoQhrwhRCJ` | telegram test | active dev | Telegram integration dev |
| `FpslQ7fF0C9KR9hY` | Gmail AI Email Manager | - | Email automation concept |
| `QaB81UFlpjkAlWTB` | Anthropic AI Agent: Claude with Think and Web Search | - | AI agent template |
| `XD6dcZCq7k6ucNqd` | AI agent that can scrape webpages | - | AI scraping template (ACTIVE - consider deactivating) |

---

## 4. CANDIDATES FOR DELETION (50)

### 4.1 Duncan Tag - Abandoned Experiments (15)

All workflows with Duncan tag appear to be from a tutorial/experiment session and haven't been updated since creation.

| ID | Name | Last Updated | Nodes |
|----|------|--------------|-------|
| `29bOhrsZwgrJWqqr` | Youtube analyzer | 2025-07-28 | 13 |
| `6XMQ1JfGT18indMd` | Anthropic AI Agent... copy | 2025-07-28 | 6 |
| `7Nfp36XzjyRV3t63` | Chatgpt to text | 2025-07-28 | 10 |
| `EwD7L7A3wQBoOlbL` | Ask questions about a PDF using AI | 2025-08-27 | 15 |
| `HRGFiD44ZDHY99xM` | Blog to newsletter transformation | 2025-07-28 | 9 |
| `I4ci2djMlrhyVQiS` | Upwork Scraper | 2025-07-28 | 11 |
| `IhYMQ3OQiRbG4mR4` | CRE Lead Scraper | 2025-08-10 | 35 |
| `XXSDfPYQvirK6NqM` | Telegram Play with agent | 2025-08-12 | 15 |
| `aWJDywkqZPlCPHzr` | Knowledge DB | 2025-07-28 | 16 |
| `fflediGaehA5EFhA` | Duncan lead gen template | 2025-08-10 | 32 |
| `jym5dTCJyGUa1782` | Proposal Generator | 2025-07-28 | 6 |
| `k07W2WFo93OM40SM` | Social Hub | 2025-08-08 | 101 |
| `lQyigCmgAuvKuT91` | Bolato | 2025-08-27 | 8 |
| `nDfMeiaDA9efzeUS` | Article Summary Machine | 2025-08-09 | 56 | **ACTIVE - DEACTIVATE** |
| `qF1Tm0bmMB5lyvb1` | Call Knowledge DB | 2025-07-28 | 8 |
| `qFDbnbSvpPVzYpgi` | JL - Modified Knowledge DB | 2025-07-28 | 15 |
| `yeynmskfgSD5mhOC` | Generate AI Videos with Google Veo3 | 2025-08-27 | 22 |

### 4.2 WIP Tag Only - Stale Development (18)

Workflows tagged WIP without meaningful updates or clear purpose.

| ID | Name | Last Updated | Nodes |
|----|------|--------------|-------|
| `6cNtRktoYCSIxXPH` | Competitor LinkedIn Monitor with Airtop | 2025-08-22 | 6 |
| `7jNTezn0PARszFD5` | MCP Server Sender with anthropic | 2025-07-28 | 5 | **ACTIVE - REVIEW** |
| `Buei2hwuDxExUDkW` | MCP Server Trigger with Tools | 2025-08-05 | 8 | **ACTIVE - REVIEW** |
| `Dzb3aLQMDbj9QIjW` | AUTOMA Webhook | 2025-08-13 | 2 |
| `FKDnVPqzgMq6mojG` | WIP workflow - linkedin rss feeds | 2025-08-27 | 61 |
| `BGivKiZ5uhKIbWeZ` | not working - new claude output for search | 2025-08-27 | 11 |
| `KDlmqNNPEJUQ9Rn6` | Perplexity Search - sports email prompt | 2025-07-28 | 6 |
| `N2XupvgUogOtCbub` | telegram action bot | 2025-08-27 | 4 |
| `N3LCGTbe3Qjabxq1` | Pre-Call Research | 2025-08-27 | 6 |
| `V7fkM0iIAoBSMcfR` | sports with grok attempt | 2025-08-27 | 6 |
| `Vw7TbsNboS7kUW2o` | DB Test | 2025-07-28 | 4 |
| `XV64hQFPQtNzkyZE` | Airtop - Full Features | 2025-08-26 | 13 | **ACTIVE - REVIEW** |
| `h9x5h1soVbL2WFxg` | Slack Trigger | 2025-08-27 | 5 |
| `mm23vFeqQdpDgrpF` | Loopnet Listing Scraper | 2025-08-26 | 16 |
| `tJLlItw1HS1FB1NH` | Extract Facebook Group Posts with Airtop | 2025-08-22 | 3 |
| `zMON3p8I8tKdQW3i` | sportsemail test | 2025-07-28 | 21 |
| `zkLlbONvDWIe2oAj` | Oura | 2025-07-28 | 1 |
| `QfSYYHyLHaBBK7cY` | Apify Scrape | 2025-07-28 | 5 | **ACTIVE - REVIEW** |
| `y4TvG9juve4icnWo` | Scraper | 2025-07-28 | 32 | **ACTIVE - REVIEW** |

### 4.3 YouTube Tutorial Tag - Learning Exercises (5)

From tutorial following sessions, not production use.

| ID | Name | Last Updated | Nodes |
|----|------|--------------|-------|
| `dtyzgODR6RKpzpEo` | Linked Writer | 2025-07-28 | 61 |
| `z3DCxZuFF1V4sV5l` | Ask questions about a PDF using AI 2 | 2025-07-28 | 19 |

### 4.4 Jono Series - Abandoned Project (5)

Complete project that appears abandoned.

| ID | Name | Last Updated | Nodes |
|----|------|--------------|-------|
| `4Gd5TYaNIFnfEmhu` | Jono - AI Agent | 2025-07-28 | 9 |
| `BA9ttXA3SDjRdg9t` | Jono - Webhooks | 2025-08-27 | 2 |
| `SHAxlMy2B4qY7akp` | Jono - New Lead | 2025-07-28 | 8 |
| `XyLNDSiaLX8tgFM5` | Jono - Reporting | 2025-08-27 | 6 |

### 4.5 Miscellaneous - Test/Copy/Abandoned (12)

| ID | Name | Last Updated | Reason |
|----|------|--------------|--------|
| `FqnZnnHpLmylhO1B` | Automate Sales Cold Calling Pipeline... | 2025-07-28 | Template never customized |
| `GbGhNjno4z3lgE5c` | paid - Linkedin Agent | 2025-07-28 | Never developed |
| `Gbwb5Y7yV7FR8poP` | tested - OpenAI Assistant workflow | 2025-07-28 | Test prefix |
| `XsaYgPC6eUkzRxJl` | WIP - claude - sports email system | 2025-07-28 | WIP in name, old |
| `euVyRgQpelOuzsCR` | Quick Email Drafter | 2025-07-28 | Minimal nodes |
| `pG7VaRm5XnULFRFa` | Perplexity live | 2025-08-27 | Only 2 nodes |
| `wtWj2529HHJCTaXh` | RAG Chatbot for Company Documents | 2025-08-27 | Never customized |
| `zm7YlV3HEBTzPuHZ` | Redis Memory AI | 2025-08-27 | Experimental |

---

## Immediate Actions Recommended

### 1. Deactivate These Workflows (5 currently active that shouldn't be)

These are marked active but are clearly experimental/abandoned:

| ID | Name | Reason |
|----|------|--------|
| `nDfMeiaDA9efzeUS` | Article Summary Machine | Duncan tag, experimental |
| `7jNTezn0PARszFD5` | MCP Server Sender with anthropic | WIP, YouTube Tutorial |
| `Buei2hwuDxExUDkW` | MCP Server Trigger with Tools | WIP, YouTube Tutorial |
| `QfSYYHyLHaBBK7cY` | Apify Scrape | WIP, YouTube Tutorial |
| `y4TvG9juve4icnWo` | Scraper | WIP, YouTube Tutorial |
| `XV64hQFPQtNzkyZE` | Airtop - Full Features | WIP, experimental |

### 2. Activate When Ready (3 Claude Hub workflows)

- `btzTPdQPMQNBwujF` - System Health Check
- `w1st7CarxGp6LYM7` - Weekly Backup - Supabase & n8n
- `cSXBlzLBmD5KuFSJ` - Daily Memory Graph Backup

### 3. Consider for Batch Deletion (After Backup)

Export workflows before deletion. Priority for deletion:
1. **Duncan tag workflows** (15) - clearly abandoned experiments
2. **Jono series** (4) - abandoned project
3. **YouTube Tutorial only** (2) - learning exercises
4. **Stale WIP** (18) - no activity in 6+ months

---

## Workflow Stats by Tag

| Tag | Count | Active | Inactive |
|-----|-------|--------|----------|
| WIP | 30 | 6 | 24 |
| Duncan | 15 | 1 | 14 |
| l7 | 8 | 4 | 4 |
| JGL | 7 | 2 | 5 |
| active dev | 10 | 7 | 3 |
| PROBIS | 5 | 3 | 2 |
| YouTube Tutorial | 7 | 4 | 3 |
| approved | 1 | 0 | 1 |
| (no tags) | 34 | 9 | 25 |

---

## Notes

- **Created:** Analysis generated by Claude Code
- **Action Required:** Review this list and confirm before any deletions
- **Backup:** Export workflows to JSON before deletion
- **Location:** https://n8n.l7-partners.com
