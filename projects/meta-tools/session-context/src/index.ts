/**
 * Session Context MCP Server
 * Provides session persistence, auto-context loading, and cross-session continuity
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import dotenv from 'dotenv';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

dotenv.config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://donnmhbwhpjlmpnwgdqr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SESSION_NOTES_PATH = join(homedir(), 'Documents/Claude Code/claude-agents/docs/session-notes.md');
const LOCAL_CONTEXT_PATH = join(homedir(), '.claude/session-context.json');

// Initialize Supabase client
let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Local context storage (persisted between sessions)
interface SessionContext {
  lastSessionId: string | null;
  lastSessionSummary: string | null;
  lastSessionDate: string | null;
  activeProject: string | null;
  activeFiles: string[];
  recentTasks: Array<{
    task: string;
    status: 'completed' | 'in_progress' | 'pending';
    timestamp: string;
  }>;
  workingContext: Record<string, any>;
  startedAt: string;
}

// Load local context
function loadLocalContext(): SessionContext {
  const defaultContext: SessionContext = {
    lastSessionId: null,
    lastSessionSummary: null,
    lastSessionDate: null,
    activeProject: null,
    activeFiles: [],
    recentTasks: [],
    workingContext: {},
    startedAt: new Date().toISOString()
  };

  try {
    if (existsSync(LOCAL_CONTEXT_PATH)) {
      const data = readFileSync(LOCAL_CONTEXT_PATH, 'utf-8');
      return { ...defaultContext, ...JSON.parse(data), startedAt: new Date().toISOString() };
    }
  } catch (error) {
    console.error('Error loading local context:', error);
  }

  return defaultContext;
}

// Save local context
function saveLocalContext(context: SessionContext): void {
  try {
    const dir = join(homedir(), '.claude');
    if (!existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    writeFileSync(LOCAL_CONTEXT_PATH, JSON.stringify(context, null, 2));
  } catch (error) {
    console.error('Error saving local context:', error);
  }
}

// Get last session from session notes
function getLastSessionFromNotes(): { date: string; summary: string } | null {
  try {
    if (!existsSync(SESSION_NOTES_PATH)) return null;

    const content = readFileSync(SESSION_NOTES_PATH, 'utf-8');
    const lines = content.split('\n');

    // Find the most recent session header (## Session X)
    let lastSessionStart = -1;
    let lastSessionDate = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^## Session \d+/)) {
        lastSessionStart = i;
        // Look for date in next few lines
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const dateLine = lines[j];
          if (dateLine.includes('**Date:**') || dateLine.match(/\d{4}-\d{2}-\d{2}/)) {
            const dateMatch = dateLine.match(/\d{4}-\d{2}-\d{2}/);
            if (dateMatch) {
              lastSessionDate = dateMatch[0];
              break;
            }
          }
        }
      }
    }

    if (lastSessionStart === -1) return null;

    // Extract summary (next 20 lines or until next session)
    const summaryLines: string[] = [];
    for (let i = lastSessionStart; i < Math.min(lastSessionStart + 30, lines.length); i++) {
      if (i > lastSessionStart && lines[i].match(/^## Session \d+/)) break;
      summaryLines.push(lines[i]);
    }

    return {
      date: lastSessionDate,
      summary: summaryLines.join('\n').trim()
    };
  } catch (error) {
    console.error('Error reading session notes:', error);
    return null;
  }
}

// Initialize context
let sessionContext = loadLocalContext();

// Initialize MCP Server
const server = new McpServer({
  name: "session-context",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {}
  }
});

// Helper function to format tool responses
function formatResponse(data: any, isError = false) {
  return {
    content: [{
      type: 'text' as const,
      text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    }],
    ...(isError && { isError: true })
  };
}

// Tools

server.tool(
  "session_start",
  "Initialize session context - call this at the start of each Claude Code session to load previous context",
  {},
  async () => {
    try {
      // Load last session info
      const lastSession = getLastSessionFromNotes();

      if (lastSession) {
        sessionContext.lastSessionSummary = lastSession.summary;
        sessionContext.lastSessionDate = lastSession.date;
      }

      // Try to load from Supabase if available
      let supabaseContext = null;
      if (supabase) {
        const { data } = await supabase
          .from('claude_session_context')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          supabaseContext = data;
          sessionContext.lastSessionId = data.session_id;
          sessionContext.activeProject = data.active_project || sessionContext.activeProject;
          sessionContext.workingContext = data.working_context || {};
        }
      }

      saveLocalContext(sessionContext);

      return formatResponse({
        action: 'session_started',
        startedAt: sessionContext.startedAt,
        lastSession: lastSession ? {
          date: lastSession.date,
          hasSummary: true,
          summaryPreview: lastSession.summary.substring(0, 200) + '...'
        } : null,
        activeProject: sessionContext.activeProject,
        recentTasks: sessionContext.recentTasks.slice(0, 5),
        supabaseConnected: !!supabaseContext,
        tip: lastSession
          ? `Last session was on ${lastSession.date}. Use session_get_last_summary for full context.`
          : 'No previous session found. This appears to be a fresh start.'
      });
    } catch (error) {
      return formatResponse(`Error starting session: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "session_get_last_summary",
  "Get the full summary from the last session for context continuity",
  {},
  async () => {
    try {
      const lastSession = getLastSessionFromNotes();

      if (!lastSession) {
        return formatResponse({
          found: false,
          message: 'No previous session summary found in session-notes.md'
        });
      }

      return formatResponse({
        found: true,
        date: lastSession.date,
        summary: lastSession.summary
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "session_set_project",
  "Set the active project for this session (affects context loading and coaching)",
  {
    project: z.string().describe('Project identifier (e.g., claude-hub, l7-partners, jgl-capital)'),
    reason: z.string().optional().describe('Why switching to this project')
  },
  async (args) => {
    try {
      const { project, reason } = args;
      const previousProject = sessionContext.activeProject;

      sessionContext.activeProject = project;
      saveLocalContext(sessionContext);

      // Persist to Supabase if available
      if (supabase) {
        await supabase.from('claude_session_context').upsert({
          session_id: sessionContext.startedAt,
          active_project: project,
          working_context: sessionContext.workingContext,
          updated_at: new Date().toISOString()
        }, { onConflict: 'session_id' });
      }

      return formatResponse({
        action: 'project_switched',
        from: previousProject,
        to: project,
        reason,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "session_add_file",
  "Track a file being actively worked on (for context preservation)",
  {
    filePath: z.string().describe('Path to the file being worked on')
  },
  async (args) => {
    try {
      const { filePath } = args;

      if (!sessionContext.activeFiles.includes(filePath)) {
        sessionContext.activeFiles.push(filePath);
        // Keep only last 20 files
        if (sessionContext.activeFiles.length > 20) {
          sessionContext.activeFiles = sessionContext.activeFiles.slice(-20);
        }
        saveLocalContext(sessionContext);
      }

      return formatResponse({
        action: 'file_tracked',
        filePath,
        totalActiveFiles: sessionContext.activeFiles.length
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "session_add_task",
  "Log a task being worked on or completed",
  {
    task: z.string().describe('Task description'),
    status: z.enum(['completed', 'in_progress', 'pending']).default('in_progress')
  },
  async (args) => {
    try {
      const { task, status } = args;

      sessionContext.recentTasks.unshift({
        task,
        status,
        timestamp: new Date().toISOString()
      });

      // Keep only last 50 tasks
      if (sessionContext.recentTasks.length > 50) {
        sessionContext.recentTasks = sessionContext.recentTasks.slice(0, 50);
      }

      saveLocalContext(sessionContext);

      return formatResponse({
        action: 'task_logged',
        task,
        status,
        totalTasks: sessionContext.recentTasks.length
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "session_set_context",
  "Store arbitrary context data for cross-session persistence",
  {
    key: z.string().describe('Context key'),
    value: z.any().describe('Context value (any JSON-serializable data)')
  },
  async (args) => {
    try {
      const { key, value } = args;

      sessionContext.workingContext[key] = value;
      saveLocalContext(sessionContext);

      // Persist to Supabase
      if (supabase) {
        await supabase.from('claude_session_context').upsert({
          session_id: sessionContext.startedAt,
          active_project: sessionContext.activeProject,
          working_context: sessionContext.workingContext,
          updated_at: new Date().toISOString()
        }, { onConflict: 'session_id' });
      }

      return formatResponse({
        action: 'context_set',
        key,
        valueType: typeof value
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "session_get_context",
  "Retrieve stored context data",
  {
    key: z.string().optional().describe('Specific key to retrieve (omit for all context)')
  },
  async (args) => {
    try {
      const { key } = args;

      if (key) {
        return formatResponse({
          key,
          value: sessionContext.workingContext[key] ?? null,
          found: key in sessionContext.workingContext
        });
      }

      return formatResponse({
        context: sessionContext.workingContext,
        keys: Object.keys(sessionContext.workingContext)
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "session_status",
  "Get current session status including active project, files, and tasks",
  {},
  async () => {
    try {
      const durationMs = Date.now() - new Date(sessionContext.startedAt).getTime();
      const durationMins = Math.round(durationMs / 60000);

      return formatResponse({
        startedAt: sessionContext.startedAt,
        durationMinutes: durationMins,
        activeProject: sessionContext.activeProject,
        activeFiles: sessionContext.activeFiles,
        recentTasks: sessionContext.recentTasks.slice(0, 10),
        contextKeys: Object.keys(sessionContext.workingContext),
        lastSessionDate: sessionContext.lastSessionDate,
        supabaseConnected: !!supabase
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "session_end",
  "Finalize session context before ending (call before /done or exit)",
  {
    summary: z.string().optional().describe('Brief summary of what was accomplished')
  },
  async (args) => {
    try {
      const { summary } = args;

      // Persist final state to Supabase
      if (supabase) {
        await supabase.from('claude_session_context').upsert({
          session_id: sessionContext.startedAt,
          active_project: sessionContext.activeProject,
          working_context: sessionContext.workingContext,
          active_files: sessionContext.activeFiles,
          recent_tasks: sessionContext.recentTasks,
          session_summary: summary,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'session_id' });
      }

      // Save locally
      saveLocalContext(sessionContext);

      const durationMs = Date.now() - new Date(sessionContext.startedAt).getTime();
      const durationMins = Math.round(durationMs / 60000);

      return formatResponse({
        action: 'session_ended',
        startedAt: sessionContext.startedAt,
        durationMinutes: durationMins,
        activeProject: sessionContext.activeProject,
        filesWorkedOn: sessionContext.activeFiles.length,
        tasksLogged: sessionContext.recentTasks.length,
        summary: summary || 'No summary provided',
        persistedTo: supabase ? ['local', 'supabase'] : ['local']
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "session_info",
  "Get information about the session-context MCP server",
  {},
  async () => {
    return formatResponse({
      name: 'session-context',
      version: '1.0.0',
      description: 'Session persistence and context continuity for Claude Code',
      tools: [
        'session_start - Initialize session, load previous context',
        'session_get_last_summary - Get full last session summary',
        'session_set_project - Set active project',
        'session_add_file - Track file being worked on',
        'session_add_task - Log task progress',
        'session_set_context - Store arbitrary context',
        'session_get_context - Retrieve context',
        'session_status - Current session status',
        'session_end - Finalize session before exit'
      ],
      persistence: {
        local: LOCAL_CONTEXT_PATH,
        supabase: !!supabase,
        sessionNotes: SESSION_NOTES_PATH
      }
    });
  }
);

// Start the server
async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer().catch(console.error);
