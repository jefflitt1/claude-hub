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

// API: Get all connections (for graph view)
app.get('/api/graph', (req, res) => {
  const projects = loadJSON('projects.json') || [];
  const prompts = loadJSON('prompts.json') || [];
  const mcpServers = loadJSON('mcp-servers.json') || [];
  const workflows = loadJSON('workflows.json') || [];

  res.json({
    nodes: { projects, prompts, mcpServers, workflows },
    // Connections are defined within each entity
  });
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Claude Hub running at http://localhost:${PORT}`);
});
