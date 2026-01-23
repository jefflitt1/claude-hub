# Claude Memory

## Active Projects

| Project | Path | Description |
|---------|------|-------------|
| **Claude Hub** | `~/Documents/Claude Code/claude-agents/` | AI agent dashboard |
| **JGL Capital** | `~/Documents/Claude Code/claude-agents/projects/jgl-capital/` | Trading system |
| **L7 Partners** | `~/Documents/Claude Code/claude-agents/projects/l7partners-rewrite/` | Property management |
| **Meta-Tools** | `~/Documents/Claude Code/claude-agents/projects/meta-tools/` | Unified MCP servers |
| **Magic KB** | `~/magic.md` | Magic knowledge base |

## Quick Reference

### Key Skills
| Skill | Purpose |
|-------|---------|
| `/jeff` | Personal assistant (email triage, tasks, projects) |
| `/reading` | Feedly articles by category (markets, cre, learn) |
| `/consult` | Multi-model collaboration (Gemini, Codex second opinions) |
| `/context` | Load session context from Memory MCP |
| `/recap` | Save session progress |
| `/done` | End session (recap + commit) |
| `/deal-analysis` | CRE deal screening |
| `/n8n` | Manage n8n workflows |

### Core MCP Servers (Consolidated)
| Server | Purpose | Replaces |
|--------|---------|----------|
| **l7-business** | Supabase + n8n + GDrive routing | supabase-l7, n8n-mcp (for L7 ops) |
| **unified-comms** | Email with smart routing | gmail, gmail-l7 |
| **unified-browser** | Browser automation | playwright, puppeteer |
| **jeff-agent** | Task tracking, email threads | - |
| **session-context** | Session persistence, auto-context | memory (for session state) |
| **feedly** | RSS aggregation (149 feeds) | - |
| **sequential-thinking** | Enhanced multi-step reasoning | - |
| **context7** | Documentation indexing & retrieval | - |
| **apple-notes** | Apple Notes read/write/search/update (semantic) | - |
| **memory** | Knowledge graph (entities, relations, observations) | MCP_DOCKER |
| **tavily** | Deep research with citations (login: GitHub) | Brave search |
| **desktop-commander** | File ops, streaming search, PDF, processes | - |
| **deepwiki** | GitHub repo Q&A | - |
| **gemini-cli** | Google Gemini via OAuth (uses Gemini Advanced sub) | - |
| **codex-cli** | OpenAI Codex/GPT-5 via OAuth (uses ChatGPT Plus sub) | - |
| **grok-cli** | xAI Grok 4 with real-time X/Twitter access | - |
| **deepseek-cli** | DeepSeek R1/V3 (cheap reasoning, local option) | - |
| **imessage** | Apple Messages read/send via AppleScript | - |

**Redundant (keep as fallbacks):**
- `supabase-l7` (HTTP) - fallback only, use `l7-business`
- `n8n-mcp` (npx) - use `l7-business` for n8n ops
- `MCP_DOCKER playwright/puppeteer` - use `unified-browser`

### Specialized Subagents
| Agent | Purpose | Access |
|-------|---------|--------|
| `l7-analyst` | L7 property data analysis & reports | Read-only Supabase, GDrive |
| `trading-researcher` | Market research, Feedly Markets, quotes | Read-only TradeStation, Feedly |
| `email-drafter` | Draft responses, triage inbox | Read email, draft only (no send) |
| `code-reviewer` | Security & quality code review | Read-only file access |

**Usage**: "Use l7-analyst to query property data" or spawn via Task tool with `subagent_type`.

### Multi-Model Collaboration (5 Models)
Use these for second opinions, alternative approaches, and leveraging each model's strengths.

#### Model Strengths Comparison
> **Last Updated:** 2026-01-21 | **Update Frequency:** Weekly (Mondays) | **Reminder:** jeff-agent recurring task

| Capability | Claude Opus 4.5 | Gemini 2.5 Pro | GPT-5.2 Codex | Grok 4 | DeepSeek R1/V3 |
|------------|-----------------|----------------|---------------|--------|----------------|
| **Context Window** | 200K | **1M tokens** | 256K | 128K | 128K |
| **Reasoning** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (R1) |
| **Coding** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Security** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Multimodal** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Real-time Data** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Cost (per 1M tokens)** | $15/$75 | Free tier | Plus sub | $2/$10 | **$0.14/$0.28** |

#### When to Use Each Model

| Task | Best Model | Why |
|------|------------|-----|
| **Planning & architecture** | Claude | Deep reasoning, maintains context across steps |
| **Full codebase analysis** | Gemini | 1M token window fits entire repos |
| **Large refactors/migrations** | Codex | Long-horizon work, maintains invariants |
| **Security review** | Claude + Codex | Both excel at vulnerability detection |
| **Document/research synthesis** | Gemini | Multimodal, handles massive docs |
| **UI/frontend development** | Gemini | Aesthetic web development strength |
| **Debugging complex issues** | Claude | Superior multi-step reasoning |
| **Code review (second opinion)** | Codex | Fresh perspective, different patterns |
| **Video/audio analysis** | Gemini | Native multimodal |
| **Agentic workflows** | Claude | Best tool orchestration |
| **Real-time X/Twitter context** | Grok | Only model with live X access |
| **Current events/news** | Grok | Real-time information retrieval |
| **Bulk reasoning tasks** | DeepSeek R1 | 10x cheaper than GPT-4, excellent reasoning |
| **Cost-sensitive coding** | DeepSeek V3 | GPT-4 quality at 1/10th cost |
| **Math/logic problems** | DeepSeek R1 | Chain-of-thought reasoning specialization |

#### Model-Specific Sweet Spots

**Claude Opus 4.5** - Your primary workhorse:
- Complex multi-step tasks requiring planning
- Tool orchestration and agentic workflows
- Security engineering and exploit analysis
- Tasks requiring maintained context over long sessions

**Gemini 2.5 Pro** - Consult for:
- Analyzing entire codebases at once (1M context)
- Research synthesis from large document sets
- Multimodal tasks (images, video, audio)
- Web/UI development with aesthetic focus
- When you need a "big picture" view

**GPT-5.2 Codex** - Consult for:
- Major refactoring projects
- Code migrations and large feature builds
- Security vulnerability scanning
- Alternative implementation approaches
- When Claude's approach isn't working

**Grok 4** - Consult for:
- Real-time X/Twitter analysis and sentiment
- Current events requiring live data
- Social media trend analysis
- News-driven market research
- When you need "what's happening right now"

**DeepSeek R1/V3** - Consult for:
- Bulk reasoning at low cost (10x cheaper)
- Math and logic-heavy problems (R1 excels)
- Cost-sensitive batch processing
- Local inference for sensitive data (via Ollama)
- When budget matters but quality can't suffer

**Example prompts:**
- "Ask Gemini to analyze the entire codebase and identify architectural issues"
- "Get Codex's opinion on this authentication implementation"
- "Have Gemini synthesize these 5 research papers into actionable insights"
- "Consult Codex for a security review of this API endpoint"
- "Ask Gemini to review this video for UI/UX issues"
- "Ask Grok what's trending on X about this topic"
- "Use DeepSeek R1 to solve this math optimization problem"
- "Run this bulk analysis through DeepSeek to save on API costs"

#### API Keys & Config
| Model | Config Location | Status |
|-------|-----------------|--------|
| Gemini | OAuth (`gemini` CLI) | ✅ Active |
| Codex | OAuth (`codex login`) | ✅ Active |
| Grok | `~/.config/grok-cli/config.json` | ✅ Configured |
| DeepSeek | `~/.config/deepseek/config.json` | ✅ Configured |

#### Local Models (Ollama - 32GB Mac Studio)
| Model | Size | RAM | Use Case |
|-------|------|-----|----------|
| `deepseek-r1:14b` | 14B | ~10GB | Fast reasoning, fits easily |
| `deepseek-r1:32b` | 32B | ~20GB | Best local reasoning |
| `llama3.3:latest` | 70B | ~28GB | General purpose, tight fit |
| `gemma3:27b` | 27B | ~18GB | Vision-capable local |

**Install Ollama:** `brew install ollama && ollama serve`

### Headless Automation Scripts
Located in `~/.claude/scripts/`:

| Script | Purpose | Usage |
|--------|---------|-------|
| `morning-digest.sh` | Feedly summary to Telegram | `./morning-digest.sh [--dry-run] [--email]` |
| `claude-automate.sh` | General automation wrapper | `claude-automate <preset> [--dry-run]` |

**Presets for claude-automate:**
- `digest` - Morning Feedly digest
- `inbox-triage` - Email triage with priorities
- `portfolio` - L7 portfolio status
- `market-scan` - Quick market overview

**Cron examples:** `~/.claude/scripts/cron-examples.txt`

### Feedly Category Mapping
| Category | Feeds | Project | Auto-Surface When |
|----------|-------|---------|-------------------|
| Markets | 33 | jgl-capital | Trading research, strategy work |
| Real Estate | 58 | l7-partners | Deal analysis, market research |
| Other | 37 | claude-hub | Workflow optimization, learning |
| Local | 16 | personal | Family planning, CT/NY news |
| Sports | 5 | personal | Leisure reading |

**Reading Workflow:**
- `feedly_all_articles(count=10, unreadOnly=true)` - Top unread
- `feedly_stream(streamId=<category_id>)` - Category-specific
- `feedly_save_for_later(entryId)` - Bookmark for later
- `/reading` - Quick access skill

## Coaching Behaviors

**Interject when:**
- Same task done 2+ times → suggest `/command`
- Complex task → suggest Plan Mode
- Session ending → run `/recap`
- Context heavy (30+ turns) → suggest `/compact`
- Starting L7/CRE work → "X unread CRE articles. `/reading cre`?"
- Starting JGL/trading work → "X unread Markets articles. `/reading markets`?"
- Learning/optimization discussion → mention `/reading learn` if relevant

**Don't interject when:**
- User in flow state
- Simple task
- < 5 minutes into session

## Multi-Model Thinking (IMPORTANT)

**Proactively consider `/consult` for these situations:**

| Situation | Action |
|-----------|--------|
| Analyzing large codebase (>50 files) | `/consult gemini` - 1M context advantage |
| Security-sensitive code (auth, API, input handling) | `/consult security` or `/consult codex` |
| Architecture/design decisions | `/consult arch-review` for multiple perspectives |
| Stuck on implementation approach | `/consult second-opinion` |
| Large refactor or migration | `/consult codex` - long-horizon strength |
| Research synthesis needed | `/consult gemini` - multimodal research |
| Code review before merge | `/consult codex` - fresh eyes |
| UI/frontend aesthetic review | `/consult gemini` - web design strength |

**Mental checklist before complex tasks:**
1. Would a 1M context window help? → Gemini
2. Is this security-sensitive? → Codex
3. Am I uncertain about the approach? → Second opinion
4. Is this a major architectural decision? → Full arch-review

**Don't hesitate to consult** - the models are available and specialized. Using them is a strength, not a weakness.

## Reference Docs (load on demand)
- `~/Documents/Claude Code/claude-agents/docs/operations/mcp-servers.md` - Full MCP server details
- `~/Documents/Claude Code/claude-agents/docs/operations/workflow-patterns.md` - Tunguz research patterns
- `~/Documents/Claude Code/claude-agents/docs/operations/coaching-system.md` - Coaching system details
- `~/Documents/Claude Code/claude-agents/docs/operations/pending-sql.md` - Pending SQL migrations
- `~/Documents/Claude Code/claude-agents/ai-orchestration/` - Multi-agent orchestration configs & templates
- `~/Documents/Claude Code/claude-agents/GEMINI.md` - Gemini CLI context file
- `~/Documents/Claude Code/claude-agents/AGENTS.md` - Codex CLI context file

## Future Enhancements
- **n8n Feedly Digest** - Automated 6:30am email with top articles by category (requires Feedly API credential in n8n)
- **saved_articles table** - Supabase table for article archiving if `/reading` usage warrants persistence
- **Article-to-task associations** - Link saved articles to projects/tasks in jeff-agent
- **Home Automation Hub (Mac Studio)** - Self-hosted home automation monitoring:
  - **Home Assistant** via Docker - central hub for all smart devices, automations, dashboards
  - **Homebridge** - bridge non-HomeKit devices to Apple Home app
  - **MQTT broker (Mosquitto)** - lightweight messaging for IoT devices
  - **Node-RED** - visual automation flows (alternative/complement to n8n for home)
  - **Scrypted** - HomeKit camera integration with hardware transcoding
  - Setup: `brew install docker` → Home Assistant container → Homebridge container
  - Potential integrations: Telegram alerts, Feedly smart home feeds, Claude voice assistant

## Home Automation Setup (TODO)

### Core Stack
| Component | Purpose | Install Method |
|-----------|---------|----------------|
| **Home Assistant** | Central hub, automations, dashboards | Docker container |
| **Homebridge** | Non-HomeKit → Apple Home bridge | Docker or `npm install -g homebridge` |
| **Mosquitto** | MQTT broker for IoT messaging | `brew install mosquitto` or Docker |
| **Scrypted** | Camera NVR + HomeKit Secure Video | Docker container |
| **Node-RED** | Visual automation builder | Docker or `npm install -g node-red` |

### Quick Start Commands
```bash
# Create home automation directory
mkdir -p ~/home-automation/{homeassistant,homebridge,mosquitto,scrypted,nodered}

# Home Assistant (port 8123)
docker run -d --name homeassistant \
  --restart=unless-stopped \
  -v ~/home-automation/homeassistant:/config \
  -v /etc/localtime:/etc/localtime:ro \
  --network=host \
  ghcr.io/home-assistant/home-assistant:stable

# Homebridge (port 8581)
docker run -d --name homebridge \
  --restart=unless-stopped \
  --network=host \
  -v ~/home-automation/homebridge:/homebridge \
  homebridge/homebridge:latest

# Mosquitto MQTT (port 1883)
docker run -d --name mosquitto \
  --restart=unless-stopped \
  -p 1883:1883 -p 9001:9001 \
  -v ~/home-automation/mosquitto:/mosquitto/config \
  eclipse-mosquitto

# Scrypted NVR (port 10443)
docker run -d --name scrypted \
  --restart=unless-stopped \
  --network=host \
  -v ~/home-automation/scrypted:/server/volume \
  ghcr.io/koush/scrypted

# Node-RED (port 1880)
docker run -d --name nodered \
  --restart=unless-stopped \
  -p 1880:1880 \
  -v ~/home-automation/nodered:/data \
  nodered/node-red
```

### Access URLs (after setup)
| Service | URL | Default Login |
|---------|-----|---------------|
| Home Assistant | http://localhost:8123 | Create on first run |
| Homebridge | http://localhost:8581 | admin / admin |
| Node-RED | http://localhost:1880 | None (add auth!) |
| Scrypted | https://localhost:10443 | Create on first run |

### Recommended Integrations
- **Z-Wave/Zigbee**: USB stick (Zooz, HUSBZB-1) + Home Assistant ZHA/Z-Wave JS
- **Matter**: Native in Home Assistant 2023.x+
- **Ring/Nest/Wyze**: Via Homebridge plugins or Scrypted
- **Tesla/EV**: Home Assistant Tesla integration
- **Weather**: Home Assistant + OpenWeatherMap
- **Energy monitoring**: Home Assistant Energy dashboard

### Claude Integration Ideas
- n8n webhook → Home Assistant automation trigger
- Telegram bot for home status/control
- Morning digest includes home status (doors, temps, energy)
- Voice control via Siri Shortcuts → Homebridge

### Popular Homebridge Plugins
```bash
# Install via Homebridge UI or npm
homebridge-ring          # Ring doorbells/cameras
homebridge-nest          # Google Nest thermostats
homebridge-wyze          # Wyze cameras/sensors (unofficial)
homebridge-myq           # Chamberlain/LiftMaster garage doors
homebridge-tplink-smarthome  # TP-Link Kasa switches/plugs
homebridge-roku          # Roku TV control
homebridge-sonos         # Sonos speakers
homebridge-harmonyhub    # Logitech Harmony remotes
homebridge-camera-ffmpeg # Generic RTSP camera support
homebridge-dummy         # Virtual switches for automations
```

### Home Assistant Add-ons (HACS)
Popular community integrations via HACS (Home Assistant Community Store):
- **Alarmo** - Full alarm system with zones, codes, automations
- **Browser Mod** - Turn browsers into controllable devices
- **Frigate** - AI object detection for cameras (requires Coral TPU or CPU)
- **Mushroom Cards** - Modern, clean dashboard cards
- **Auto Entities** - Dynamic card population
- **Scheduler** - Visual scheduling for automations
- **Watchman** - Find broken integrations/entities

### Automation Recipes
| Trigger | Action | How |
|---------|--------|-----|
| Sunset | Turn on porch lights | HA automation, sun trigger |
| Door opens + away | Send alert | HA + Telegram/Pushover |
| Motion + night | Turn on path lights 30% | HA motion sensor + light |
| Leave home | Set away mode, arm alarm | HA geofence + Alarmo |
| Arrive home | Disarm, unlock, lights on | HA geofence + automations |
| Washer done | Notify (power drop detected) | HA energy monitoring |
| Smoke/CO alarm | All lights on, unlock doors | HA + Z-Wave smoke detectors |
| Morning routine | Gradual lights, weather TTS | HA time trigger + script |

### Hardware Recommendations
| Category | Recommended | Why |
|----------|-------------|-----|
| **Zigbee/Z-Wave Stick** | HUSBZB-1, Zooz ZST39 | Dual-protocol, well-supported |
| **Smart Switches** | Lutron Caseta, Inovelli | Reliable, local control |
| **Sensors** | Aqara (Zigbee) | Cheap, tiny, long battery |
| **Cameras** | Reolink, Amcrest (RTSP) | Local storage, no cloud |
| **Doorbell** | Reolink, Amcrest | No subscription, RTSP |
| **Thermostat** | Ecobee | HomeKit native, good sensors |
| **Locks** | Yale Assure, Schlage | Z-Wave/Zigbee, no cloud |
| **Garage** | Ratgdo (local) | Replaces MyQ cloud dependency |

### Network Setup (recommended)
- **Separate IoT VLAN** - Isolate smart devices from main network
- **Pi-hole/AdGuard** - Block telemetry, ad tracking
- **Local DNS** - homeassistant.local, homebridge.local
- **Tailscale** - Secure remote access without port forwarding

### Backup Strategy
```bash
# Cron job for daily backups
0 3 * * * tar -czf ~/backups/home-automation-$(date +%Y%m%d).tar.gz ~/home-automation/
```

### Monitoring & Dashboards

**Home Assistant Dashboard Types:**
- **Overview** - Main control panel, room-by-room
- **Energy** - Solar, grid, device consumption
- **Floor Plan** - Interactive house map with device states
- **Security** - Cameras, locks, alarm status
- **Climate** - Thermostats, humidity, air quality

**External Monitoring:**
```bash
# Uptime Kuma - monitor all home services (port 3001)
docker run -d --name uptime-kuma \
  --restart=unless-stopped \
  -p 3001:3001 \
  -v ~/home-automation/uptime-kuma:/app/data \
  louislam/uptime-kuma

# Grafana + InfluxDB for historical data (optional)
# Home Assistant has native long-term statistics now
```

### Integration with Existing Stack

**n8n Workflows for Home:**
| Workflow | Trigger | Actions |
|----------|---------|---------|
| Morning Home Status | Cron 6:30am | HA API → format → Telegram digest |
| Security Alert | HA webhook (motion+away) | Telegram alert + camera snapshot |
| Energy Report | Weekly cron | HA energy data → email summary |
| Guest Mode | Manual/Telegram | Set temps, unlock, send WiFi info |

**Home Assistant → n8n Webhook:**
```yaml
# Home Assistant automation.yaml
- alias: "Alert n8n on door open"
  trigger:
    - platform: state
      entity_id: binary_sensor.front_door
      to: "on"
  action:
    - service: rest_command.n8n_webhook
      data:
        event: door_open
        door: front
        timestamp: "{{ now().isoformat() }}"
```

**Telegram Bot Commands (via n8n or HA):**
- `/home status` - Quick overview
- `/home arm` - Arm alarm system
- `/home cameras` - Get camera snapshots
- `/home lights off` - All lights off
- `/home temp 72` - Set thermostat

### Mobile Access
| Method | Pros | Cons |
|--------|------|------|
| **Home Assistant Companion** | Full control, notifications, sensors | Requires HA |
| **Apple Home** | Native iOS, Siri, widgets | Limited to HomeKit |
| **Tailscale** | Secure remote, no port forward | Extra app |
| **Nabu Casa** | HA cloud, easy setup | $6.50/mo subscription |

### Project Path
`~/home-automation/` - All Docker volumes and configs

### Setup Checklist
- [ ] Install Docker Desktop for Mac
- [ ] Create directory structure
- [ ] Deploy Home Assistant container
- [ ] Deploy Homebridge container
- [ ] Configure HACS in Home Assistant
- [ ] Add Zigbee/Z-Wave USB stick
- [ ] Onboard devices
- [ ] Create basic automations
- [ ] Set up Telegram notifications
- [ ] Connect to n8n for advanced workflows
- [ ] Configure backups
- [ ] Set up remote access (Tailscale or Nabu Casa)

### Mac Studio Advantages (32GB RAM)
Your Mac Studio can easily run the full stack plus AI features:

| Service | RAM | Notes |
|---------|-----|-------|
| Home Assistant | ~500MB | Core hub |
| Homebridge | ~200MB | Bridge layer |
| Scrypted | ~1GB | Camera processing |
| Node-RED | ~300MB | Automations |
| Frigate (CPU) | ~2GB | AI object detection |
| Ollama (local AI) | ~10GB | Voice/chat assistant |
| **Total** | ~14GB | Plenty of headroom |

**AI-Enhanced Home Automation:**
```bash
# Frigate with CPU detection (no Coral TPU needed on M-series)
docker run -d --name frigate \
  --restart=unless-stopped \
  --shm-size=256mb \
  -p 5000:5000 -p 8554:8554 \
  -v ~/home-automation/frigate:/config \
  -v ~/home-automation/frigate/media:/media/frigate \
  ghcr.io/blakeblackshear/frigate:stable

# Local voice assistant with Whisper + Ollama
# Home Assistant has Wyoming protocol for local voice
```

**Scrypted + Apple Silicon:**
- Hardware video transcoding via VideoToolbox
- Efficient H.265/HEVC encoding
- HomeKit Secure Video without cloud

### Voice Assistant Options
| Option | Cloud | Local | Setup |
|--------|-------|-------|-------|
| **Siri + HomeKit** | Partial | Via Homebridge | Native |
| **Alexa** | Yes | No | Skill or HA Cloud |
| **Google Assistant** | Yes | No | HA Cloud |
| **Home Assistant Voice** | No | Yes | Wyoming + Whisper |
| **Ollama + Whisper** | No | Yes | Custom integration |

**Local Voice (Wyoming Protocol):**
```yaml
# Home Assistant configuration.yaml
wyoming:
  - name: "Local Whisper"
    host: localhost
    port: 10300
```

### Docker Compose (All-in-One)
```yaml
# ~/home-automation/docker-compose.yml
version: '3.8'
services:
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    container_name: homeassistant
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./homeassistant:/config
      - /etc/localtime:/etc/localtime:ro

  homebridge:
    image: homebridge/homebridge:latest
    container_name: homebridge
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./homebridge:/homebridge

  mosquitto:
    image: eclipse-mosquitto
    container_name: mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto:/mosquitto/config

  scrypted:
    image: ghcr.io/koush/scrypted
    container_name: scrypted
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./scrypted:/server/volume

  nodered:
    image: nodered/node-red
    container_name: nodered
    restart: unless-stopped
    ports:
      - "1880:1880"
    volumes:
      - ./nodered:/data

  uptime-kuma:
    image: louislam/uptime-kuma
    container_name: uptime-kuma
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - ./uptime-kuma:/app/data
```

**Start everything:**
```bash
cd ~/home-automation && docker compose up -d
```

### Useful Commands
```bash
# View all home automation containers
docker ps --filter "name=homeassistant|homebridge|mosquitto|scrypted|nodered"

# View logs
docker logs -f homeassistant
docker logs -f homebridge

# Restart a service
docker restart homeassistant

# Update all containers
docker compose pull && docker compose up -d

# Check resource usage
docker stats
```

### Skill Integration
Add to `/jeff` or create `/home` skill:
- "What's the status of my home?"
- "Turn off all lights"
- "Set thermostat to 70"
- "Show me the front door camera"
- "Arm the alarm system"

## API Credentials (MCP Docker Secrets)
| Service | Key Location | Login Method |
|---------|--------------|--------------|
| **Tavily** | `docker mcp secret` / MCP URL | GitHub OAuth |
| **Gemini CLI** | OAuth token | Google account (Gemini Advanced) |
| **Codex CLI** | OAuth token | ChatGPT account (Plus/Pro) |

**Tavily MCP URL:** `https://mcp.tavily.com/mcp/?tavilyApiKey=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`

**Re-authenticate CLIs if needed:**
- Gemini: `gemini` (opens browser)
- Codex: `codex login` (opens browser)

## Session Notes
See `~/Documents/Claude Code/claude-agents/docs/session-notes.md`
