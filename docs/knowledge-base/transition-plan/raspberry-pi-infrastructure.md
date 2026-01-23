# Raspberry Pi Infrastructure — System Overview & Architecture

> **🔴 IT AGENT ATTENTION REQUIRED**
> This document contains critical infrastructure documentation for the Raspberry Pi system.
> Review before any maintenance or transition activities.

**Document Status:** Active - IT Agent Review Required
**Created:** 2026-01-23
**Category:** Transition Plan Knowledge Base

---

## 1. Executive Summary

This Raspberry Pi functions as a production-grade, self-hosted application and automation server. It consolidates:

- Workflow automation (n8n)
- Database + auth platform (Supabase)
- Search/vector intelligence (Weaviate)
- Caching & queues (Redis)
- Analytics & dashboards (Metabase, Appsmith)
- Search & observability (Elasticsearch + Kibana)
- Secure public access (Cloudflare Tunnel)
- Automated backups, monitoring, and self-healing

All services are containerized via Docker Compose, version-controlled, monitored, backed up nightly, and designed for long-term reliability, not experimentation.

---

## 2. Hardware & Base System

### Device
- Raspberry Pi 5
- 16GB RAM
- 128GB storage (primary)
- USB SSDs used for backup targets

### Operating System
- Raspberry Pi OS (64-bit)
- Headless, SSH-managed
- System services minimized (Docker-first model)

### Design Philosophy
- Treat the Pi like a small Linux server
- Immutable infrastructure mindset
- Everything reproducible from config + backups

---

## 3. Container Orchestration

### Container Runtime
- Docker
- Docker Compose (multi-file strategy)

### Compose File Structure
| File | Purpose |
|------|---------|
| `docker-compose.yml` | Base services |
| `docker-compose.override.yml` | Environment-specific overrides |
| `watchtower.yml` | Auto-updates |
| `labels.yml` | Cloudflare / routing labels |
| Auth-specific overrides | e.g. Weaviate API key stack |

### Networking
- Shared application network (`n8n-stack_appnet`)
- Cross-stack container attachment used intentionally
- No public ports exposed directly except where required internally

### Version Control
- Git repo in `~/n8n-stack`
- Tracks all compose files and infra changes
- Acts as disaster-recovery blueprint

---

## 4. Core Services

### 4.1 n8n (Automation Engine)

**Purpose:** Central automation and orchestration hub. Ties together Supabase, APIs, notifications, AI tools, and internal services.

**Configuration:**
- Persistent data directory: `/home/jeffn8n/n8n/data`
- Uses Redis for queueing
- Internal-only access; exposed via Cloudflare Tunnel

**Operational Notes:**
- Hourly health checks
- Nightly backups
- Restore script fully documented and tested

---

### 4.2 Supabase (Self-Hosted)

**Purpose:** Primary database + auth + storage layer. Used by internal apps and automations.

**Components:**
- Postgres
- Kong API Gateway
- Auth
- Storage
- Studio UI

**Key Design Decisions:**
- Demo JWTs intentionally used (stable, long-lived)
- Row-Level Security (RLS) fully enforced
- All functions use SECURITY INVOKER (no definer risk)

**Data & Backups:**
- Daily backup at 03:30
- 14-day retention
- Stored locally + verified
- Logged to `backup.log`

**Security Posture:**
- No public tables
- Views act as security barriers
- Single private storage bucket (documents)
- Access only via Supabase client APIs

---

### 4.3 Weaviate (Vector Database)

**Purpose:** Semantic search and AI memory. Used by n8n and internal copilots.

**Configuration:**
- API key authentication enforced
- Persistent volume: `/home/jeffn8n/weaviate/data`
- Schema backed up best-effort nightly

**Notes:**
- ARM64 limitations handled explicitly
- Schema exposure intentionally restricted

---

### 4.4 Redis

**Purpose:** Queue backend for n8n, Caching layer

**Configuration:**
- Password protected (central `.env`)
- Persistent volume: `/home/jeffn8n/redis/data`
- Included in nightly backups

---

### 4.5 Elasticsearch + Kibana

**Purpose:** Search indexing, Log exploration, Analytics visibility

**Security:**
- Bound to `127.0.0.1`
- Exposed externally only via Cloudflare Tunnel
- No raw public access

**Data Persistence:**
- `~/n8n-stack/es-data`
- Mongo (for related tooling): `~/n8n-stack/mongo-data`

---

### 4.6 Appsmith & Metabase

**Purpose:** Internal admin dashboards, Data exploration, Tenant / property insights

**Access:** Cloudflare-protected subdomains, Internal network access only

---

## 5. External Access & Security

### Cloudflare Tunnel

**Used For:**
- n8n
- Supabase Studio
- Supabase API
- Kibana
- Admin tools

**Benefits:**
- No inbound ports open on router
- TLS termination at Cloudflare
- Identity-aware access
- DDoS mitigation

---

## 6. Backup & Disaster Recovery

### Nightly Backups

**What's Backed Up:**
- n8n SQLite DB
- `.n8n` directory
- Workflow & credential exports
- Supabase Postgres
- Redis data
- Weaviate data + schema
- Docker container inspect JSONs
- docker-compose files

**Locations:**
| Location | Path |
|----------|------|
| Local | `/var/backups/n8n` |
| Remote | Google Drive (`gdrive:n8n-backups`) |
| Retention | 7–14 days depending on service |

**Restore Capability:**
- Fully scripted restore process
- Can restore to identical or new Pi
- Order-of-operations documented
- Verified in real recovery scenarios

---

## 7. Monitoring & Self-Healing

**Monitoring:**
- Supabase health script runs every 10 minutes
- Hourly system checks
- Logs persisted to disk

**Self-Healing:**
- Failed containers auto-restarted
- Watchtower used in label mode only
- Critical services excluded from blind updates

---

## 8. Automation & Scheduling (Cron)

Unified cron table at: `/etc/cron.d/n8n-jobs`

**Includes:**
| Schedule | Task |
|----------|------|
| Hourly | Health checks |
| 02:30 | Nightly n8n backup |
| 03:30 | Nightly Supabase backup |
| Weekly | SD / USB system clone |
| Weekly | Health reports |

---

## 9. Design Strengths

> **This is NOT a hobby Pi setup.**

**Strengths:**
- Zero exposed ports
- Full infra-as-code
- Reproducible
- Backed up
- Monitored
- Versioned
- Modular

**It behaves like:**
- A small production Linux VM
- A private PaaS
- A secure automation hub

---

## 10. Known Constraints & Tradeoffs

| Constraint | Mitigation |
|------------|------------|
| ARM64 limits certain containers | Handled explicitly |
| Single-node system | Mitigated via backups |
| Demo JWTs | Acceptable by design; not internet-facing |

All constraints are intentional and documented, not accidental.

---

## 11. What an IT Professional Should Know Immediately

1. **This system can be rebuilt from scratch**
2. **No mystery state lives outside Docker volumes**
3. **Failure recovery is scripted**
4. **Security model assumes zero trust**
5. **Cloudflare is a hard dependency for ingress**
6. **Supabase RLS is the core data-security layer**

---

## Quick Reference Cards

### Service Ports (Internal Only)
| Service | Port |
|---------|------|
| n8n | 5678 |
| Supabase Studio | 3000 |
| Supabase API | 8000 |
| Postgres | 5432 |
| Redis | 6379 |
| Weaviate | 8080 |
| Elasticsearch | 9200 |
| Kibana | 5601 |

### Critical Paths
| Component | Path |
|-----------|------|
| Docker Compose | `~/n8n-stack/` |
| n8n Data | `/home/jeffn8n/n8n/data` |
| Weaviate Data | `/home/jeffn8n/weaviate/data` |
| Redis Data | `/home/jeffn8n/redis/data` |
| Backups | `/var/backups/n8n` |
| Cron Jobs | `/etc/cron.d/n8n-jobs` |

### Emergency Contacts / Escalation
- Primary: Jeff Littell
- Backup documentation: This file + Apple Notes mirror

---

## Next Steps / Potential Deliverables

- [ ] 1-page executive PDF summary
- [ ] Network diagram (visual)
- [ ] IT admin handoff checklist
- [ ] Runbook format version

---

*Last Updated: 2026-01-23*
