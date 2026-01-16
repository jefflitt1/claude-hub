# Lovable Prompt: Claude Hub Dashboard

## Overview
Build a dashboard for "Claude Hub" - a tool that tracks Claude AI agents, knowledge bases, MCP servers, prompts, and n8n workflows. The dashboard should visualize connections between these resources.

## Tech Stack
- React + TypeScript
- Tailwind CSS
- Dark theme (GitHub-inspired: #0d1117 background, #161b22 cards)

## Data Sources
The app fetches from these API endpoints (already built):

### GET /api/projects
```json
[
  {
    "id": "magic-agent",
    "name": "Magic Agent",
    "description": "Comprehensive magic assistant...",
    "type": "knowledge-base",
    "status": "active",
    "created": "2025-01-14",
    "updated": "2025-01-15",
    "files": [{ "path": "~/magic.md", "lines": 1945 }],
    "sections": ["App Ecosystem", "Major Retailers", "Close-Up Magic"],
    "connections": {
      "prompts": [],
      "workflows": [],
      "external": [{ "name": "Penguin Magic", "url": "...", "type": "retailer" }]
    }
  },
  {
    "id": "claude-hub",
    "name": "Claude Hub",
    "type": "app",
    "status": "building",
    "repo": "https://github.com/jefflitt1/claude-hub",
    "hosting": { "domain": "claude.l7-partners.com", "server": "Raspberry Pi" },
    "connections": { "mcpServers": ["n8n-mcp", "gdrive-JGL", "gdrive-L7"] }
  }
]
```

### GET /api/mcp-servers
```json
[
  {
    "id": "n8n-mcp",
    "name": "n8n MCP Server",
    "url": "https://n8n.l7-partners.com",
    "purpose": "Connect Claude Code to n8n workflows",
    "platforms": { "mac": "connected", "pi": "configuring" },
    "capabilities": ["List/create workflows", "Trigger webhooks"],
    "usedBy": ["claude-hub"]
  }
]
```

### GET /api/prompts
```json
[
  {
    "id": "magic-agent-context",
    "name": "Magic Agent Context",
    "type": "knowledge-base",
    "project": "magic-agent",
    "file": "~/magic.md"
  }
]
```

### GET /api/workflows
```json
[
  {
    "id": "n8n-health-check",
    "name": "n8n Health Check",
    "platform": "n8n",
    "status": "available",
    "triggers": ["manual", "mcp"],
    "project": "claude-hub"
  }
]
```

## Required Components

### 1. Header
- Title: "Claude Hub"
- Status indicators showing: MCP connected, n8n online
- Subtitle: "claude.l7-partners.com"

### 2. Project Cards Section
- Card grid layout (responsive)
- Each card shows:
  - Name and type badge (knowledge-base = blue, app = green)
  - Description
  - Expandable details: files, sections, connections, hosting info
  - Status indicator (active/building)
- Cards should expand on click to show full details

### 3. MCP Servers Section
- Smaller cards in a grid
- Show platform status for both Mac and Pi
- Use status dots: green = connected, yellow = configuring, red = disconnected
- Show capabilities on hover or expand

### 4. Knowledge Graph Visualization (key feature)
- Interactive node graph showing connections between:
  - Projects (large nodes)
  - MCP Servers (medium nodes)
  - Prompts (small nodes)
  - Workflows (small nodes)
- Edges show relationships (project uses MCP server, prompt belongs to project, etc.)
- Use a library like react-force-graph or vis-network
- Nodes should be clickable to show details panel

### 5. Prompts & Workflows Section
- Simple list or small cards
- Show which project each belongs to
- Link to source files

## Visual Style
- Dark theme: bg #0d1117, cards #161b22, borders #30363d
- Text: primary #f0f6fc, secondary #8b949e
- Accent colors:
  - Blue #58a6ff (links, knowledge-base badges)
  - Green #3fb950 (connected status, app badges)
  - Yellow #d29922 (configuring/warning)
- Rounded corners (6px)
- Subtle hover effects (border color change)
- Clean, minimal, developer-tool aesthetic

## Layout
```
┌─────────────────────────────────────────────────┐
│ Header: Claude Hub              [Status dots]   │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │         Knowledge Graph Visualization        │ │
│ │         (interactive node graph)             │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ Projects & Knowledge Bases                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│ │  Card 1  │ │  Card 2  │ │  Card 3  │         │
│ └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│ MCP Servers                                     │
│ ┌──────┐ ┌──────┐ ┌──────┐                     │
│ │ MCP  │ │ MCP  │ │ MCP  │                     │
│ └──────┘ └──────┘ └──────┘                     │
├─────────────────────────────────────────────────┤
│ Prompts          │ Workflows                    │
│ • prompt 1       │ • workflow 1                 │
│ • prompt 2       │ • workflow 2                 │
└─────────────────────────────────────────────────┘
```

## Notes for Lovable
- Fetch data from relative URLs (/api/projects, etc.) - backend already exists
- The knowledge graph is the main differentiator - make it interactive and visually appealing
- Mobile-responsive but desktop-first
- No authentication needed for MVP
