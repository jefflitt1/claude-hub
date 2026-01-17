const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple logging utility
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...data };
  console.log(JSON.stringify(logEntry));
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    log('info', 'request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start
    });
  });
  next();
});

// Load data
const dataPath = path.join(__dirname, '..', 'data');

function loadJSON(filename) {
  const filePath = path.join(dataPath, filename);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
    log('warn', 'file_not_found', { filename });
    return null;
  } catch (error) {
    log('error', 'json_parse_error', { filename, error: error.message });
    return null;
  }
}

// API: Get all projects
app.get('/api/projects', (req, res) => {
  const projects = loadJSON('projects.json') || [];
  res.json(projects);
});

// API: Get single project with its graph
app.get('/api/projects/:id', (req, res) => {
  const projects = loadJSON('projects.json') || [];
  const project = projects.find(p => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

// API: Get MCP servers
app.get('/api/mcp-servers', (req, res) => {
  const mcpServers = loadJSON('mcp-servers.json') || [];
  res.json(mcpServers);
});

// API: Get prompts
app.get('/api/prompts', (req, res) => {
  const prompts = loadJSON('prompts.json') || [];
  res.json(prompts);
});

// API: Get workflows
app.get('/api/workflows', (req, res) => {
  const workflows = loadJSON('workflows.json') || [];
  res.json(workflows);
});

// API: Get agents
app.get('/api/agents', (req, res) => {
  const agents = loadJSON('agents.json') || [];
  res.json(agents);
});

// API: Get skills
app.get('/api/skills', (req, res) => {
  const skills = loadJSON('skills.json') || [];
  res.json(skills);
});

// API: Get all connections (for graph view)
app.get('/api/graph', (req, res) => {
  const projects = loadJSON('projects.json') || [];
  const prompts = loadJSON('prompts.json') || [];
  const mcpServers = loadJSON('mcp-servers.json') || [];
  const workflows = loadJSON('workflows.json') || [];
  const agents = loadJSON('agents.json') || [];
  const skills = loadJSON('skills.json') || [];

  res.json({
    nodes: { projects, prompts, mcpServers, workflows, agents, skills },
    // Connections are defined within each entity
  });
});

// Supabase configuration
const SUPABASE_URL = 'https://donnmhbwhpjlmpnwgdqr.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbm5taGJ3aHBqbG1wbndnZHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjM4NDQ5MTQsImV4cCI6MjAzOTQyMDkxNH0.gaKTM-xnLEZOzGZ7pe22_9KZPOeUJtRh-T5T4lUxb4E';

// API: Get n8n workflows from Supabase (grouped by project)
app.get('/api/n8n-workflows', async (req, res) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/n8n_workflows?select=*&order=project.asc,name.asc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const workflows = await response.json();

    // Group by project
    const grouped = workflows.reduce((acc, workflow) => {
      const project = workflow.project || 'Uncategorized';
      if (!acc[project]) {
        acc[project] = {
          name: project,
          workflows: [],
          activeCount: 0,
          totalCount: 0
        };
      }
      acc[project].workflows.push(workflow);
      acc[project].totalCount++;
      if (workflow.active) acc[project].activeCount++;
      return acc;
    }, {});

    // Convert to array and sort by total count
    const projectGroups = Object.values(grouped).sort((a, b) => b.totalCount - a.totalCount);

    // Calculate stats
    const stats = {
      total: workflows.length,
      active: workflows.filter(w => w.active).length,
      production: workflows.filter(w => w.status === 'production').length,
      wip: workflows.filter(w => w.status === 'WIP').length,
      deprecated: workflows.filter(w => w.status === 'deprecated').length
    };

    res.json({ projectGroups, stats, workflows });
  } catch (error) {
    log('error', 'supabase_error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// API: Get workflow categories
app.get('/api/workflow-categories', async (req, res) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/workflow_categories?select=*&order=display_order.asc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const categories = await response.json();
    res.json(categories);
  } catch (error) {
    log('error', 'supabase_error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// API: Health check for n8n instance
app.get('/api/health/n8n', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://n8n.l7-partners.com/healthz', {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      res.json({ status: 'online', url: 'https://n8n.l7-partners.com' });
    } else {
      res.json({ status: 'degraded', url: 'https://n8n.l7-partners.com' });
    }
  } catch (error) {
    res.json({ status: 'offline', error: error.message });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  log('warn', 'not_found', { path: req.path });
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  log('error', 'unhandled_error', {
    path: req.path,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  log('info', 'server_started', { port: PORT, url: `http://localhost:${PORT}` });
});
