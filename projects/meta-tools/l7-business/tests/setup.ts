/**
 * Test setup for l7-business integration tests
 * Loads environment variables from ~/.claude.json
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Load environment from ~/.claude.json
const claudeConfigPath = join(homedir(), '.claude.json');

if (existsSync(claudeConfigPath)) {
  try {
    const config = JSON.parse(readFileSync(claudeConfigPath, 'utf-8'));

    // Find l7-business MCP server config and extract env vars
    const mcpServers = config.mcpServers || {};
    const l7Business = mcpServers['l7-business'];

    if (l7Business?.env) {
      for (const [key, value] of Object.entries(l7Business.env)) {
        if (typeof value === 'string') {
          process.env[key] = value;
        }
      }
      console.log('✓ Loaded environment from ~/.claude.json');
    }
  } catch (error) {
    console.warn('Could not load ~/.claude.json:', error);
  }
}

// Verify required environment variables
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Ensure ~/.claude.json has l7-business MCP server configured');
  process.exit(1);
}

console.log('✓ Environment configured for integration tests');
