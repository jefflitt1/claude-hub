# Dashboard Quick Actions Enhancement

**Purpose:** Make every dashboard item actionable instead of view-only.

## 1. Workflow Cards - Add Action Buttons

Current workflow cards show info but require manual navigation to n8n. Add these buttons:

```jsx
// In WorkflowCard component, add action buttons row:
<div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
  <a
    href={`https://n8n.l7-partners.com/workflow/${workflow.n8n_id}`}
    target="_blank"
    className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30"
  >
    Edit in n8n
  </a>
  <button
    onClick={() => triggerWorkflow(workflow.webhook_url)}
    className="text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30"
    disabled={!workflow.webhook_url}
  >
    Run Now
  </button>
  <a
    href={`https://n8n.l7-partners.com/workflow/${workflow.n8n_id}/executions`}
    target="_blank"
    className="text-xs px-2 py-1 bg-gray-600/20 text-gray-400 rounded hover:bg-gray-600/30"
  >
    View Logs
  </a>
</div>
```

## 2. Project Cards - Add Quick Launch

```jsx
// In ProjectCard component:
<div className="flex gap-2 mt-3">
  {project.repo_url && (
    <a
      href={project.repo_url}
      target="_blank"
      className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded"
    >
      GitHub
    </a>
  )}
  {project.url && (
    <a
      href={project.url}
      target="_blank"
      className="text-xs px-2 py-1 bg-cyan-600/20 text-cyan-400 rounded"
    >
      Open App
    </a>
  )}
</div>
```

## 3. MCP Server Cards - Add Status Check

```jsx
// Add connection status indicator that pings on load:
<div className="flex items-center gap-2">
  <span className={`w-2 h-2 rounded-full ${
    server.status === 'connected' ? 'bg-green-500' :
    server.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
  }`} />
  <span className="text-xs text-gray-400">
    {server.status === 'connected' ? 'Online' : 'Check needed'}
  </span>
</div>
```

## 4. Global Command Palette (Cmd+K)

Add a search overlay that searches across ALL entities:

```jsx
// New component: CommandPalette.tsx
import { useState, useEffect } from 'react';

export function CommandPalette({
  workflows, projects, agents, skills, mcpServers
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const allItems = [
    ...workflows.map(w => ({ ...w, type: 'workflow', icon: '⚡' })),
    ...projects.map(p => ({ ...p, type: 'project', icon: '📁' })),
    ...agents.map(a => ({ ...a, type: 'agent', icon: '🤖' })),
    ...skills.map(s => ({ ...s, type: 'skill', icon: '✨' })),
    ...mcpServers.map(m => ({ ...m, type: 'mcp', icon: '🔌' })),
  ];

  const filtered = query
    ? allItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase())
      )
    : allItems.slice(0, 10);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-24 z-50">
      <div className="bg-gray-800 rounded-lg w-[600px] max-h-[400px] overflow-hidden">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search workflows, projects, agents..."
          className="w-full px-4 py-3 bg-transparent border-b border-gray-700 text-white"
        />
        <div className="max-h-[300px] overflow-y-auto">
          {filtered.map((item, i) => (
            <a
              key={i}
              href={getItemUrl(item)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-700"
            >
              <span>{item.icon}</span>
              <span className="text-white">{item.name}</span>
              <span className="text-xs text-gray-500 ml-auto">{item.type}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function getItemUrl(item) {
  switch (item.type) {
    case 'workflow':
      return `https://n8n.l7-partners.com/workflow/${item.n8n_id}`;
    case 'project':
      return item.url || `#project-${item.id}`;
    default:
      return `#${item.type}-${item.id}`;
  }
}
```

## 5. Pinned Items Section

Add a "Favorites" section at the top of the dashboard:

```jsx
// Store pinned items in localStorage
const [pinned, setPinned] = useState(() =>
  JSON.parse(localStorage.getItem('dashboard-pinned') || '[]')
);

// Add pin button to each card
<button
  onClick={() => togglePin(item.id)}
  className={`text-yellow-400 ${pinned.includes(item.id) ? 'opacity-100' : 'opacity-30'}`}
>
  ⭐
</button>

// Render pinned section at top
{pinned.length > 0 && (
  <section className="mb-8">
    <h2 className="text-lg font-semibold mb-4">⭐ Favorites</h2>
    <div className="grid grid-cols-4 gap-4">
      {pinnedItems.map(item => <MiniCard key={item.id} item={item} />)}
    </div>
  </section>
)}
```

## 6. Collapse State Persistence

Save expand/collapse state to localStorage:

```jsx
const [collapsed, setCollapsed] = useState(() =>
  JSON.parse(localStorage.getItem('dashboard-collapsed') || '{}')
);

useEffect(() => {
  localStorage.setItem('dashboard-collapsed', JSON.stringify(collapsed));
}, [collapsed]);
```

---

## Implementation Priority

1. **Workflow action buttons** - Highest impact, 15 min
2. **Command palette** - High impact, 30 min
3. **Pinned items** - Medium impact, 20 min
4. **Collapse persistence** - Low effort, 5 min
5. **Project quick launch** - Low effort, 10 min

Copy this to Lovable and ask it to implement these changes.
