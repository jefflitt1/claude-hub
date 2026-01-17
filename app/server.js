const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Load data
const dataPath = path.join(__dirname, '..', 'data');

function loadJSON(filename) {
  const filePath = path.join(dataPath, filename);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
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

app.listen(PORT, () => {
  console.log(`Claude Hub running at http://localhost:${PORT}`);
});
