/**
 * Jeff Agent MCP Server
 * Personal assistant for email management, task tracking, and project oversight
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://donnmhbwhpjlmpnwgdqr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Project configuration for auto-association
const PROJECT_DOMAINS: Record<string, string> = {
  'l7-partners.com': 'l7-partners',
  'jglcap.com': 'jgl-capital',
};

const PROJECT_KEYWORDS: Record<string, string[]> = {
  'l7-partners': ['property', 'tenant', 'lease', 'rent', 'maintenance', 'l7'],
  'jgl-capital': ['trade', 'trading', 'position', 'portfolio', 'market'],
  'claude-hub': ['claude', 'agent', 'mcp', 'workflow', 'dashboard'],
};

// Initialize Supabase client
let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Initialize MCP Server
const server = new McpServer({
  name: "jeff-agent",
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

// Association inference helpers
function inferProjectFromEmail(email: string): string | undefined {
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain) {
    for (const [domainPattern, projectId] of Object.entries(PROJECT_DOMAINS)) {
      if (domain.includes(domainPattern)) {
        return projectId;
      }
    }
  }
  return undefined;
}

function inferProjectFromContent(content: string): string | undefined {
  const lowerContent = content.toLowerCase();
  for (const [projectId, keywords] of Object.entries(PROJECT_KEYWORDS)) {
    const matchedKeyword = keywords.find(k => lowerContent.includes(k));
    if (matchedKeyword) {
      return projectId;
    }
  }
  return undefined;
}

// ============================================================================
// TASK TOOLS
// ============================================================================

server.tool(
  "jeff_create_task",
  "Create a new task with optional associations",
  {
    title: z.string().describe('Task title'),
    description: z.string().optional().describe('Task description'),
    priority: z.enum(['urgent', 'high', 'normal', 'low']).optional().default('normal'),
    project_id: z.string().optional().describe('Associated project ID'),
    source_type: z.enum(['manual', 'email', 'session', 'workflow']).optional().default('manual'),
    source_id: z.string().optional().describe('Source entity ID (e.g., email thread ID)'),
    due_date: z.string().optional().describe('Due date in ISO format'),
    tags: z.array(z.string()).optional().default([]).describe('Task tags'),
    context: z.record(z.any()).optional().default({}).describe('Additional context')
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const { title, description, priority, project_id, source_type, source_id, due_date, tags, context } = args;

      // Auto-infer project from content if not specified
      let inferredProject = project_id;
      if (!inferredProject && (title || description)) {
        inferredProject = inferProjectFromContent(`${title} ${description || ''}`);
      }

      const taskData = {
        title,
        description,
        priority,
        project_id: inferredProject,
        source_type,
        source_id,
        due_date: due_date ? new Date(due_date).toISOString() : undefined,
        tags,
        context,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('jeff_tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) {
        return formatResponse(`Create task error: ${error.message}`, true);
      }

      // Create association if source is provided
      if (source_type && source_id && data) {
        await supabase.from('jeff_associations').insert({
          entity_type: 'task',
          entity_id: data.id,
          related_type: source_type === 'email' ? 'email_thread' : source_type,
          related_id: source_id,
          relationship: 'spawned_from',
          confidence: 1.0
        });
      }

      return formatResponse({
        action: 'task_created',
        task: data,
        inferred: {
          project: inferredProject && !project_id ? inferredProject : undefined
        }
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "jeff_list_tasks",
  "List tasks with optional filters",
  {
    status: z.enum(['pending', 'in_progress', 'blocked', 'completed', 'cancelled', 'all']).optional().default('all'),
    priority: z.enum(['urgent', 'high', 'normal', 'low', 'all']).optional().default('all'),
    project_id: z.string().optional().describe('Filter by project'),
    limit: z.number().optional().default(20),
    include_completed: z.boolean().optional().default(false).describe('Include completed tasks')
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const { status, priority, project_id, limit, include_completed } = args;

      let query = supabase.from('jeff_tasks').select('*');

      if (status !== 'all') {
        query = query.eq('status', status);
      } else if (!include_completed) {
        query = query.not('status', 'in', '("completed","cancelled")');
      }

      if (priority !== 'all') {
        query = query.eq('priority', priority);
      }

      if (project_id) {
        query = query.eq('project_id', project_id);
      }

      query = query
        .order('priority', { ascending: true }) // urgent first
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data, error } = await query;

      if (error) {
        return formatResponse(`List tasks error: ${error.message}`, true);
      }

      // Group by priority for summary
      const summary = {
        urgent: data?.filter(t => t.priority === 'urgent').length || 0,
        high: data?.filter(t => t.priority === 'high').length || 0,
        normal: data?.filter(t => t.priority === 'normal').length || 0,
        low: data?.filter(t => t.priority === 'low').length || 0,
      };

      return formatResponse({
        action: 'tasks_listed',
        count: data?.length || 0,
        summary,
        tasks: data
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "jeff_update_task",
  "Update a task's status, priority, or other fields",
  {
    task_id: z.string().describe('Task UUID'),
    status: z.enum(['pending', 'in_progress', 'blocked', 'completed', 'cancelled']).optional(),
    priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    due_date: z.string().optional(),
    tags: z.array(z.string()).optional()
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const { task_id, ...updates } = args;

      // Build update object with only provided fields
      const updateData: Record<string, any> = {};
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.due_date !== undefined) updateData.due_date = new Date(updates.due_date).toISOString();
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      // Set completed_at if completing
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('jeff_tasks')
        .update(updateData)
        .eq('id', task_id)
        .select()
        .single();

      if (error) {
        return formatResponse(`Update task error: ${error.message}`, true);
      }

      return formatResponse({
        action: 'task_updated',
        task: data
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "jeff_complete_task",
  "Mark a task as completed",
  {
    task_id: z.string().describe('Task UUID')
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const { task_id } = args;

      const { data, error } = await supabase
        .from('jeff_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', task_id)
        .select()
        .single();

      if (error) {
        return formatResponse(`Complete task error: ${error.message}`, true);
      }

      return formatResponse({
        action: 'task_completed',
        task: data
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// ============================================================================
// EMAIL TOOLS
// ============================================================================

server.tool(
  "jeff_triage_inbox",
  "Scan inbox and classify emails, suggest actions. Returns email metadata for review.",
  {
    account: z.enum(['personal', 'l7', 'all']).optional().default('all'),
    count: z.number().optional().default(20),
    since_hours: z.number().optional().default(24).describe('Look back this many hours')
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const { account, count, since_hours } = args;

      // This tool provides instructions for using unified-comms
      // The actual email fetching happens via the unified-comms MCP
      return formatResponse({
        action: 'triage_instructions',
        description: 'Email triage requires calling unified-comms MCP tools',
        steps: [
          {
            step: 1,
            tool: 'mcp__unified-comms__message_list',
            params: { account, count },
            description: 'Fetch recent messages'
          },
          {
            step: 2,
            action: 'classify',
            description: 'For each email, determine: priority (urgent/high/normal/low), needs_response (boolean), project association'
          },
          {
            step: 3,
            tool: 'jeff_track_email_thread',
            description: 'Store classified threads in jeff_email_threads table'
          }
        ],
        classificationRules: {
          urgent: 'Time-sensitive, requires immediate attention',
          high: 'Important but not urgent, respond within 24h',
          normal: 'Standard business communication',
          low: 'FYI, newsletters, can be batched'
        },
        projectAssociation: PROJECT_DOMAINS,
        account,
        lookbackHours: since_hours
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "jeff_track_email_thread",
  "Track an email thread in the database for follow-up",
  {
    gmail_thread_id: z.string().describe('Gmail thread ID'),
    account: z.enum(['personal', 'l7']),
    subject: z.string(),
    participants: z.array(z.object({
      email: z.string(),
      name: z.string().optional()
    })).optional(),
    status: z.enum(['active', 'archived', 'snoozed', 'waiting']).optional().default('active'),
    priority: z.enum(['urgent', 'high', 'normal', 'low']).optional().default('normal'),
    needs_response: z.boolean().optional().default(false),
    project_id: z.string().optional(),
    summary: z.string().optional()
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const { gmail_thread_id, account, subject, participants, status, priority, needs_response, project_id, summary } = args;

      // Auto-infer project from participants or subject
      let inferredProject = project_id;
      if (!inferredProject && participants) {
        for (const p of participants) {
          inferredProject = inferProjectFromEmail(p.email);
          if (inferredProject) break;
        }
      }
      if (!inferredProject && subject) {
        inferredProject = inferProjectFromContent(subject);
      }

      const threadData = {
        gmail_thread_id,
        account,
        subject,
        participants,
        status,
        priority,
        needs_response,
        project_id: inferredProject,
        summary,
        last_message_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('jeff_email_threads')
        .upsert(threadData, { onConflict: 'gmail_thread_id,account' })
        .select()
        .single();

      if (error) {
        return formatResponse(`Track thread error: ${error.message}`, true);
      }

      return formatResponse({
        action: 'thread_tracked',
        thread: data,
        inferred: {
          project: inferredProject && !project_id ? inferredProject : undefined
        }
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "jeff_get_thread",
  "Get a tracked email thread with its summary and associations",
  {
    thread_id: z.string().describe('Jeff thread UUID or Gmail thread ID'),
    account: z.enum(['personal', 'l7']).optional().describe('Required if using Gmail thread ID')
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const { thread_id, account } = args;

      // Try to find by UUID first, then by Gmail thread ID
      let query = supabase.from('jeff_email_threads').select('*');

      // Check if it's a UUID format
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(thread_id);

      if (isUuid) {
        query = query.eq('id', thread_id);
      } else if (account) {
        query = query.eq('gmail_thread_id', thread_id).eq('account', account);
      } else {
        query = query.eq('gmail_thread_id', thread_id);
      }

      const { data: thread, error } = await query.single();

      if (error) {
        return formatResponse(`Get thread error: ${error.message}`, true);
      }

      // Get associations
      const { data: associations } = await supabase
        .from('jeff_associations')
        .select('*')
        .or(`entity_id.eq.${thread.id},related_id.eq.${thread.id}`);

      // Get related tasks
      const { data: tasks } = await supabase
        .from('jeff_tasks')
        .select('*')
        .eq('source_id', thread.gmail_thread_id);

      return formatResponse({
        action: 'thread_retrieved',
        thread,
        associations: associations || [],
        relatedTasks: tasks || []
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "jeff_draft_response",
  "Create a draft email response (stored in DB, not sent). Use unified-comms to send.",
  {
    thread_id: z.string().describe('Jeff thread UUID'),
    body: z.string().describe('Draft response body'),
    subject: z.string().optional().describe('Subject (defaults to Re: original subject)')
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const { thread_id, body, subject } = args;

      // Get the thread
      const { data: thread, error: threadError } = await supabase
        .from('jeff_email_threads')
        .select('*')
        .eq('id', thread_id)
        .single();

      if (threadError || !thread) {
        return formatResponse(`Thread not found: ${threadError?.message}`, true);
      }

      // Store draft in context
      const draftData = {
        draft_body: body,
        draft_subject: subject || `Re: ${thread.subject}`,
        draft_created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('jeff_email_threads')
        .update({
          context: { ...thread.context, ...draftData },
          status: 'waiting' // Mark as waiting (draft pending)
        })
        .eq('id', thread_id)
        .select()
        .single();

      if (error) {
        return formatResponse(`Draft error: ${error.message}`, true);
      }

      return formatResponse({
        action: 'draft_created',
        thread_id,
        draft: {
          subject: draftData.draft_subject,
          body: draftData.draft_body,
          created_at: draftData.draft_created_at
        },
        sendInstructions: {
          tool: 'mcp__unified-comms__message_reply',
          params: {
            messageId: thread.gmail_thread_id,
            body: body,
            account: thread.account
          }
        }
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// ============================================================================
// ASSOCIATION TOOLS
// ============================================================================

server.tool(
  "jeff_associate",
  "Create an association between two entities",
  {
    entity_type: z.enum(['email_thread', 'task', 'project', 'contact']),
    entity_id: z.string(),
    related_type: z.enum(['email_thread', 'task', 'project', 'contact']),
    related_id: z.string(),
    relationship: z.string().describe('Relationship type (e.g., spawned_from, belongs_to, related_to)'),
    confidence: z.number().optional().default(1.0).describe('Confidence score 0-1')
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const { entity_type, entity_id, related_type, related_id, relationship, confidence } = args;

      const { data, error } = await supabase
        .from('jeff_associations')
        .upsert({
          entity_type,
          entity_id,
          related_type,
          related_id,
          relationship,
          confidence
        }, { onConflict: 'entity_type,entity_id,related_type,related_id,relationship' })
        .select()
        .single();

      if (error) {
        return formatResponse(`Association error: ${error.message}`, true);
      }

      return formatResponse({
        action: 'association_created',
        association: data
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// ============================================================================
// CONTACT TOOLS
// ============================================================================

server.tool(
  "jeff_upsert_contact",
  "Create or update a contact",
  {
    email: z.string(),
    name: z.string().optional(),
    company: z.string().optional(),
    default_account: z.enum(['personal', 'l7']).optional(),
    project_ids: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional()
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const { email, name, company, default_account, project_ids, tags } = args;

      // Auto-infer default account from email domain
      let inferredAccount = default_account;
      if (!inferredAccount) {
        const project = inferProjectFromEmail(email);
        if (project === 'l7-partners' || project === 'jgl-capital') {
          inferredAccount = 'l7';
        }
      }

      const contactData = {
        email,
        name,
        company,
        default_account: inferredAccount,
        project_ids: project_ids || [],
        tags: tags || [],
        last_contact_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('jeff_contacts')
        .upsert(contactData, { onConflict: 'email' })
        .select()
        .single();

      if (error) {
        return formatResponse(`Contact error: ${error.message}`, true);
      }

      return formatResponse({
        action: 'contact_upserted',
        contact: data,
        inferred: {
          account: inferredAccount && !default_account ? inferredAccount : undefined
        }
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// ============================================================================
// PROJECT TOOLS
// ============================================================================

server.tool(
  "jeff_project_status",
  "Get project summary with associated tasks and email threads",
  {
    project_id: z.string().describe('Project ID (e.g., l7-partners, jgl-capital)')
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const { project_id } = args;

      // Get open tasks for project
      const { data: tasks } = await supabase
        .from('jeff_tasks')
        .select('*')
        .eq('project_id', project_id)
        .not('status', 'in', '("completed","cancelled")')
        .order('priority')
        .order('due_date', { nullsFirst: false });

      // Get active email threads for project
      const { data: threads } = await supabase
        .from('jeff_email_threads')
        .select('*')
        .eq('project_id', project_id)
        .eq('status', 'active')
        .order('priority')
        .order('last_message_at', { ascending: false });

      // Get threads needing response
      const needsResponse = threads?.filter(t => t.needs_response) || [];

      // Task summary
      const taskSummary = {
        total: tasks?.length || 0,
        urgent: tasks?.filter(t => t.priority === 'urgent').length || 0,
        high: tasks?.filter(t => t.priority === 'high').length || 0,
        blocked: tasks?.filter(t => t.status === 'blocked').length || 0,
      };

      return formatResponse({
        action: 'project_status',
        project_id,
        tasks: {
          summary: taskSummary,
          items: tasks || []
        },
        emails: {
          activeThreads: threads?.length || 0,
          needsResponse: needsResponse.length,
          threads: threads || []
        },
        attention: [
          ...(taskSummary.urgent > 0 ? [`${taskSummary.urgent} urgent task(s)`] : []),
          ...(taskSummary.blocked > 0 ? [`${taskSummary.blocked} blocked task(s)`] : []),
          ...(needsResponse.length > 0 ? [`${needsResponse.length} email(s) need response`] : [])
        ]
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// ============================================================================
// DIGEST TOOLS
// ============================================================================

server.tool(
  "jeff_daily_digest",
  "Generate a daily summary of tasks, emails, and priorities",
  {},
  async () => {
    if (!supabase) {
      return formatResponse('Supabase not configured', true);
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all open tasks
      const { data: tasks } = await supabase
        .from('jeff_tasks')
        .select('*')
        .not('status', 'in', '("completed","cancelled")')
        .order('priority')
        .order('due_date', { nullsFirst: false });

      // Get active threads needing response
      const { data: threads } = await supabase
        .from('jeff_email_threads')
        .select('*')
        .eq('needs_response', true)
        .eq('status', 'active')
        .order('priority')
        .order('last_message_at', { ascending: false });

      // Get overdue tasks
      const overdue = tasks?.filter(t => t.due_date && new Date(t.due_date) < today) || [];

      // Get due today
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueToday = tasks?.filter(t => {
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        return due >= today && due < tomorrow;
      }) || [];

      // Group by project
      const byProject: Record<string, any[]> = {};
      tasks?.forEach(t => {
        const proj = t.project_id || 'unassigned';
        if (!byProject[proj]) byProject[proj] = [];
        byProject[proj].push(t);
      });

      return formatResponse({
        action: 'daily_digest',
        date: today.toISOString().split('T')[0],
        summary: {
          totalTasks: tasks?.length || 0,
          overdue: overdue.length,
          dueToday: dueToday.length,
          emailsNeedingResponse: threads?.length || 0,
          urgent: tasks?.filter(t => t.priority === 'urgent').length || 0
        },
        priorities: {
          overdueTasks: overdue,
          dueTodayTasks: dueToday,
          urgentTasks: tasks?.filter(t => t.priority === 'urgent') || [],
          emailsAwaitingResponse: threads || []
        },
        byProject,
        recommendations: [
          ...(overdue.length > 0 ? ['Address overdue tasks first'] : []),
          ...(threads && threads.length > 0 ? ['Respond to pending emails'] : []),
          'Review project statuses for any blockers'
        ]
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// ============================================================================
// INFO TOOL
// ============================================================================

server.tool(
  "jeff_info",
  "Get information about Jeff Agent status and configuration",
  {},
  async () => {
    return formatResponse({
      name: 'jeff-agent',
      version: '1.0.0',
      description: 'Personal assistant for email management, task tracking, and project oversight',
      configured: !!supabase,
      supabaseUrl: SUPABASE_URL,
      projectDomains: PROJECT_DOMAINS,
      projectKeywords: PROJECT_KEYWORDS,
      tables: [
        'jeff_tasks - Task tracking',
        'jeff_email_threads - Email thread tracking',
        'jeff_associations - Entity relationships',
        'jeff_contacts - Contact directory'
      ],
      tools: [
        // Tasks
        'jeff_create_task - Create new task',
        'jeff_list_tasks - List tasks with filters',
        'jeff_update_task - Update task',
        'jeff_complete_task - Mark task complete',
        // Email
        'jeff_triage_inbox - Inbox triage instructions',
        'jeff_track_email_thread - Track email thread',
        'jeff_get_thread - Get thread with associations',
        'jeff_draft_response - Create draft reply',
        // Associations
        'jeff_associate - Link entities',
        // Contacts
        'jeff_upsert_contact - Create/update contact',
        // Projects
        'jeff_project_status - Project summary',
        // Digest
        'jeff_daily_digest - Daily summary'
      ]
    });
  }
);

// Start the server
async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer().catch(console.error);
