# Lovable Prompt: Add Agents & Skills to Claude Catalog

## Context

The ClaudeCatalog page (`src/pages/ClaudeCatalog.tsx`) currently displays Projects, MCP Servers, Prompts, and Workflows from Supabase. We need to add **Agents** and **Skills** sections.

## Task

1. Create two new Supabase tables: `claude_agents` and `claude_skills`
2. Add queries for these tables in ClaudeCatalog
3. Add UI sections for Agents and Skills
4. Update the knowledge graph to include agent and skill nodes

---

## 1. Create Supabase Tables

### claude_agents
```sql
CREATE TABLE claude_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT, -- 'skill-based', 'knowledge-based', 'webhook-based', 'built-in'
  status TEXT DEFAULT 'active',
  trigger TEXT, -- '/recap', 'context-aware', 'automatic', 'chat-widget'
  webhook_url TEXT,
  capabilities TEXT[], -- array of capability strings
  project_id TEXT REFERENCES claude_projects(id),
  skills TEXT[], -- array of skill IDs
  knowledge_file TEXT,
  skill_file TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE claude_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON claude_agents FOR SELECT USING (true);
```

### claude_skills
```sql
CREATE TABLE claude_skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT, -- '/recap', 'context-aware', etc.
  location TEXT, -- file path or 'plugin'
  scope TEXT, -- 'personal', 'project', 'plugin'
  commands JSONB, -- array of {command, description}
  project_id TEXT REFERENCES claude_projects(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE claude_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read" ON claude_skills FOR SELECT USING (true);
```

---

## 2. TypeScript Interfaces

Add to ClaudeCatalog.tsx:

```typescript
interface ClaudeAgent {
  id: string;
  name: string;
  description: string | null;
  type: string; // 'skill-based' | 'knowledge-based' | 'webhook-based' | 'built-in'
  status: string;
  trigger: string | null;
  webhook_url: string | null;
  capabilities: string[];
  project_id: string | null;
  skills: string[];
  knowledge_file: string | null;
  skill_file: string | null;
  created_at: string;
  updated_at: string;
}

interface ClaudeSkill {
  id: string;
  name: string;
  description: string | null;
  trigger: string | null;
  location: string | null;
  scope: string; // 'personal' | 'project' | 'plugin'
  commands: { command: string; description: string }[];
  project_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
```

---

## 3. Add State & Fetch

Add to existing state:
```typescript
const [agents, setAgents] = useState<ClaudeAgent[]>([]);
const [skills, setSkills] = useState<ClaudeSkill[]>([]);
```

Update fetchData to include:
```typescript
const [projectsRes, mcpRes, promptsRes, workflowsRes, agentsRes, skillsRes] = await Promise.all([
  supabase.from('claude_projects').select('*').order('name'),
  supabase.from('claude_mcp_servers').select('*').order('name'),
  supabase.from('claude_prompts').select('*').order('name'),
  supabase.from('claude_workflows').select('*').order('name'),
  supabase.from('claude_agents').select('*').order('name'),
  supabase.from('claude_skills').select('*').order('name')
]);

// Add error checks for agentsRes and skillsRes
if (agentsRes.error) throw agentsRes.error;
if (skillsRes.error) throw skillsRes.error;

setAgents((agentsRes.data || []) as ClaudeAgent[]);
setSkills((skillsRes.data || []) as ClaudeSkill[]);
```

---

## 4. Update Filters

Add to TypeFilter:
```typescript
type TypeFilter = "all" | "project" | "mcp" | "prompt" | "workflow" | "agent" | "skill";
```

Add filter buttons:
```typescript
{ value: "agent", label: "Agents", icon: Bot },
{ value: "skill", label: "Skills", icon: Sparkles }
```

Add to filteredData:
```typescript
const filteredAgents = agents.filter(a =>
  (typeFilter === "all" || typeFilter === "agent") &&
  matchesStatus(a.status) &&
  (matchesSearch(a.name) || matchesSearch(a.description) || a.capabilities?.some(c => matchesSearch(c)))
);

const filteredSkills = skills.filter(s =>
  (typeFilter === "all" || typeFilter === "skill") &&
  matchesStatus(s.status) &&
  (matchesSearch(s.name) || matchesSearch(s.description) || matchesSearch(s.trigger))
);
```

---

## 5. Update Knowledge Graph

Add agent nodes (use Bot icon color - cyan #22d3ee):
```typescript
agents.forEach(a => {
  nodes.push({
    id: a.id,
    name: a.name,
    type: "agent",
    status: a.status,
    val: 15,
    color: "#22d3ee" // cyan for agents
  });

  // Link to project
  if (a.project_id) {
    links.push({ source: a.project_id, target: a.id, type: "has-agent" });
  }

  // Link to skills
  a.skills?.forEach(skillId => {
    links.push({ source: a.id, target: skillId, type: "uses-skill" });
  });
});
```

Add skill nodes (use Sparkles icon color - yellow #facc15):
```typescript
skills.forEach(s => {
  nodes.push({
    id: s.id,
    name: s.name,
    type: "skill",
    status: s.status,
    val: 10,
    color: "#facc15" // yellow for skills
  });

  // Link to project
  if (s.project_id) {
    links.push({ source: s.project_id, target: s.id, type: "has-skill" });
  }
});
```

Update legend to include:
```typescript
<div className="flex items-center gap-1.5">
  <Circle className="h-3 w-3 fill-current" style={{ color: "#22d3ee" }} />
  <span style={{ color: "#8b949e" }}>Agent</span>
</div>
<div className="flex items-center gap-1.5">
  <Circle className="h-3 w-3 fill-current" style={{ color: "#facc15" }} />
  <span style={{ color: "#8b949e" }}>Skill</span>
</div>
```

---

## 6. Add Agents Section UI

Add after MCP Servers section:

```tsx
{/* Agents */}
{(typeFilter === "all" || typeFilter === "agent") && filteredData.agents.length > 0 && (
<section className="mb-8">
  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "#f0f6fc" }}>
    <Bot className="h-5 w-5" style={{ color: "#22d3ee" }} />
    Agents
    <span className="text-sm font-normal" style={{ color: "#8b949e" }}>({filteredData.agents.length})</span>
  </h2>
  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
    {filteredData.agents.map(agent => {
      const statusColor = statusColors[agent.status] || "#8b949e";
      const typeColor = {
        'skill-based': '#a371f7',
        'knowledge-based': '#58a6ff',
        'webhook-based': '#3fb950',
        'built-in': '#8b949e'
      }[agent.type] || '#8b949e';

      return (
        <div
          key={agent.id}
          className="rounded-lg border p-4"
          style={{ backgroundColor: "#161b22", borderColor: "#30363d" }}
        >
          <div className="flex items-center justify-between mb-2">
            <Badge
              variant="outline"
              className="text-xs"
              style={{ backgroundColor: `${typeColor}20`, color: typeColor, borderColor: `${typeColor}40` }}
            >
              {agent.type}
            </Badge>
            <span className="flex items-center gap-1.5">
              <Circle className="h-2 w-2 fill-current" style={{ color: statusColor }} />
              <span className="text-xs" style={{ color: "#8b949e" }}>{agent.status}</span>
            </span>
          </div>

          <h3 className="font-semibold mb-1" style={{ color: "#f0f6fc" }}>{agent.name}</h3>
          <p className="text-sm mb-3" style={{ color: "#8b949e" }}>{agent.description}</p>

          {agent.trigger && (
            <div className="mb-2">
              <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "#0d1117", color: "#22d3ee" }}>
                {agent.trigger}
              </code>
            </div>
          )}

          {agent.capabilities && agent.capabilities.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "#30363d" }}>
              <span className="text-xs uppercase tracking-wide" style={{ color: "#8b949e" }}>Capabilities</span>
              <ul className="mt-1 space-y-1">
                {agent.capabilities.slice(0, 4).map((cap, i) => (
                  <li key={i} className="text-xs flex items-center gap-2" style={{ color: "#f0f6fc" }}>
                    <span style={{ color: "#3fb950" }}>•</span>
                    {cap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {agent.project_id && (
            <div className="mt-2">
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ backgroundColor: "rgba(88, 166, 255, 0.15)", color: "#58a6ff" }}
              >
                {getProjectName(agent.project_id)}
              </span>
            </div>
          )}
        </div>
      );
    })}
  </div>
</section>
)}
```

---

## 7. Add Skills Section UI

Add after Agents section:

```tsx
{/* Skills */}
{(typeFilter === "all" || typeFilter === "skill") && filteredData.skills.length > 0 && (
<section className="mb-8">
  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: "#f0f6fc" }}>
    <Sparkles className="h-5 w-5" style={{ color: "#facc15" }} />
    Skills
    <span className="text-sm font-normal" style={{ color: "#8b949e" }}>({filteredData.skills.length})</span>
  </h2>
  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
    {filteredData.skills.map(skill => {
      const scopeColor = {
        'personal': '#a371f7',
        'project': '#58a6ff',
        'plugin': '#3fb950'
      }[skill.scope] || '#8b949e';

      return (
        <div
          key={skill.id}
          className="rounded-lg border p-4"
          style={{ backgroundColor: "#161b22", borderColor: "#30363d" }}
        >
          <div className="flex items-center justify-between mb-2">
            <Badge
              variant="outline"
              className="text-xs"
              style={{ backgroundColor: `${scopeColor}20`, color: scopeColor, borderColor: `${scopeColor}40` }}
            >
              {skill.scope}
            </Badge>
          </div>

          <h3 className="font-semibold mb-1" style={{ color: "#f0f6fc" }}>{skill.name}</h3>
          <p className="text-sm mb-2" style={{ color: "#8b949e" }}>{skill.description}</p>

          {skill.trigger && (
            <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "#0d1117", color: "#facc15" }}>
              {skill.trigger}
            </code>
          )}

          {skill.commands && skill.commands.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: "#30363d" }}>
              <span className="text-xs uppercase tracking-wide" style={{ color: "#8b949e" }}>Commands</span>
              <div className="mt-1 space-y-1">
                {skill.commands.map((cmd, i) => (
                  <div key={i} className="text-xs">
                    <code style={{ color: "#facc15" }}>{cmd.command}</code>
                    <span style={{ color: "#8b949e" }}> - {cmd.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    })}
  </div>
</section>
)}
```

---

## 8. Import Icons

Add to imports:
```typescript
import { Bot, Sparkles } from "lucide-react";
```

---

## Summary

After these changes, the ClaudeCatalog will display:
- **Projects** (green/blue nodes)
- **MCP Servers** (purple nodes)
- **Prompts** (pink nodes)
- **Workflows** (orange nodes)
- **Agents** (cyan nodes) - NEW
- **Skills** (yellow nodes) - NEW

The knowledge graph will show relationships:
- Project → Agent (has-agent)
- Project → Skill (has-skill)
- Agent → Skill (uses-skill)
