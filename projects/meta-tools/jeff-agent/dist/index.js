/**
 * Jeff Agent MCP Server
 * Personal assistant for email management, task tracking, and project oversight
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import dotenv from 'dotenv';
dotenv.config();
// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://donnmhbwhpjlmpnwgdqr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
// Project configuration for auto-association
const PROJECT_DOMAINS = {
    'l7-partners.com': 'l7-partners',
    'jglcap.com': 'jgl-capital',
};
const PROJECT_KEYWORDS = {
    'l7-partners': ['property', 'tenant', 'lease', 'rent', 'maintenance', 'l7'],
    'jgl-capital': ['trade', 'trading', 'position', 'portfolio', 'market'],
    'claude-hub': ['claude', 'agent', 'mcp', 'workflow', 'dashboard'],
    'personal': ['family', 'kids', 'hockey', 'school', 'doctor', 'appointment', 'birthday', 'home'],
};
// Family calendar configuration
const FAMILY_CALENDARS = {
    'primary': { id: 'jglittell@gmail.com', owner: 'Jeff', type: 'personal' },
    'family': { id: 'family02804126033589774900@group.calendar.google.com', owner: 'Family', type: 'shared' },
    'jgl-personal': { id: 'a4a6ea9f6da7d04f4dfd78cf1640959127b062ad3b8e010de045445c7bc7a9d8@group.calendar.google.com', owner: 'Jeff', type: 'personal' },
    'hockey': { id: 'hpsfktlnfc0oe7s5ha0hjc75a9k24epd@import.calendar.google.com', owner: 'Kids', type: 'sports' },
    'rinks': { id: 'gqcglqo63bc5tovangpb85kfs74cbk7l@import.calendar.google.com', owner: 'Jeff', type: 'sports' },
    'school': { id: 'io3o3a1u93mmgapkjc1k0oeo2j7dte1d@import.calendar.google.com', owner: 'Kids', type: 'school' },
    'mgl': { id: 'npv5par5k5t371514caqito57p276r1o@import.calendar.google.com', owner: 'MGL', type: 'personal' },
    'mpl': { id: 'b9ll1nmud2cp4blg620trefjboorlca2@import.calendar.google.com', owner: 'MPL', type: 'personal' },
};
// Personal task categories
const PERSONAL_CATEGORIES = [
    'work', 'personal', 'family', 'health', 'finance',
    'household', 'school', 'social', 'errands', 'other'
];
// Initialize Supabase client
let supabase = null;
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
function formatResponse(data, isError = false) {
    return {
        content: [{
                type: 'text',
                text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
            }],
        ...(isError && { isError: true })
    };
}
// Association inference helpers
function inferProjectFromEmail(email) {
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
function inferProjectFromContent(content) {
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
server.tool("jeff_create_task", "Create a new task with optional associations", {
    title: z.string().describe('Task title'),
    description: z.string().optional().describe('Task description'),
    priority: z.enum(['urgent', 'high', 'normal', 'low']).optional().default('normal'),
    project_id: z.string().optional().describe('Associated project ID'),
    source_type: z.enum(['manual', 'email', 'session', 'workflow']).optional().default('manual'),
    source_id: z.string().optional().describe('Source entity ID (e.g., email thread ID)'),
    due_date: z.string().optional().describe('Due date in ISO format'),
    tags: z.array(z.string()).optional().default([]).describe('Task tags'),
    context: z.record(z.any()).optional().default({}).describe('Additional context')
}, async (args) => {
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_list_tasks", "List tasks with optional filters", {
    status: z.enum(['pending', 'in_progress', 'blocked', 'completed', 'cancelled', 'all']).optional().default('all'),
    priority: z.enum(['urgent', 'high', 'normal', 'low', 'all']).optional().default('all'),
    project_id: z.string().optional().describe('Filter by project'),
    limit: z.number().optional().default(20),
    include_completed: z.boolean().optional().default(false).describe('Include completed tasks')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { status, priority, project_id, limit, include_completed } = args;
        let query = supabase.from('jeff_tasks').select('*');
        if (status !== 'all') {
            query = query.eq('status', status);
        }
        else if (!include_completed) {
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_update_task", "Update a task's status, priority, or other fields", {
    task_id: z.string().describe('Task UUID'),
    status: z.enum(['pending', 'in_progress', 'blocked', 'completed', 'cancelled']).optional(),
    priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    due_date: z.string().optional(),
    tags: z.array(z.string()).optional()
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { task_id, ...updates } = args;
        // Build update object with only provided fields
        const updateData = {};
        if (updates.status !== undefined)
            updateData.status = updates.status;
        if (updates.priority !== undefined)
            updateData.priority = updates.priority;
        if (updates.title !== undefined)
            updateData.title = updates.title;
        if (updates.description !== undefined)
            updateData.description = updates.description;
        if (updates.due_date !== undefined)
            updateData.due_date = new Date(updates.due_date).toISOString();
        if (updates.tags !== undefined)
            updateData.tags = updates.tags;
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_complete_task", "Mark a task as completed", {
    task_id: z.string().describe('Task UUID')
}, async (args) => {
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// EMAIL TOOLS
// ============================================================================
server.tool("jeff_triage_inbox", "Scan inbox and classify emails, suggest actions. Returns email metadata for review.", {
    account: z.enum(['personal', 'l7', 'all']).optional().default('all'),
    count: z.number().optional().default(20),
    since_hours: z.number().optional().default(24).describe('Look back this many hours')
}, async (args) => {
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_track_email_thread", "Track an email thread in the database for follow-up", {
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
}, async (args) => {
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
                if (inferredProject)
                    break;
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_get_thread", "Get a tracked email thread with its summary and associations", {
    thread_id: z.string().describe('Jeff thread UUID or Gmail thread ID'),
    account: z.enum(['personal', 'l7']).optional().describe('Required if using Gmail thread ID')
}, async (args) => {
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
        }
        else if (account) {
            query = query.eq('gmail_thread_id', thread_id).eq('account', account);
        }
        else {
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_draft_response", "Create a draft email response (stored in DB, not sent). Use unified-comms to send.", {
    thread_id: z.string().describe('Jeff thread UUID'),
    body: z.string().describe('Draft response body'),
    subject: z.string().optional().describe('Subject (defaults to Re: original subject)')
}, async (args) => {
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// ASSOCIATION TOOLS
// ============================================================================
server.tool("jeff_associate", "Create an association between two entities", {
    entity_type: z.enum(['email_thread', 'task', 'project', 'contact']),
    entity_id: z.string(),
    related_type: z.enum(['email_thread', 'task', 'project', 'contact']),
    related_id: z.string(),
    relationship: z.string().describe('Relationship type (e.g., spawned_from, belongs_to, related_to)'),
    confidence: z.number().optional().default(1.0).describe('Confidence score 0-1')
}, async (args) => {
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// CONTACT TOOLS
// ============================================================================
server.tool("jeff_upsert_contact", "Create or update a contact", {
    email: z.string(),
    name: z.string().optional(),
    company: z.string().optional(),
    default_account: z.enum(['personal', 'l7']).optional(),
    project_ids: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional()
}, async (args) => {
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// PROJECT TOOLS
// ============================================================================
server.tool("jeff_project_status", "Get project summary with associated tasks and email threads", {
    project_id: z.string().describe('Project ID (e.g., l7-partners, jgl-capital)')
}, async (args) => {
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// DIGEST TOOLS
// ============================================================================
server.tool("jeff_daily_digest", "Generate a daily summary of tasks, emails, and priorities", {}, async () => {
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
            if (!t.due_date)
                return false;
            const due = new Date(t.due_date);
            return due >= today && due < tomorrow;
        }) || [];
        // Group by project
        const byProject = {};
        tasks?.forEach(t => {
            const proj = t.project_id || 'unassigned';
            if (!byProject[proj])
                byProject[proj] = [];
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
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// INFO TOOL
// ============================================================================
server.tool("jeff_info", "Get information about Jeff Agent status and configuration", {}, async () => {
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
});
// ============================================================================
// PERSONAL/FAMILY TOOLS
// ============================================================================
server.tool("jeff_add_family_member", "Add or update a family member for calendar tracking", {
    name: z.string().describe('Family member name'),
    relationship: z.enum(['self', 'spouse', 'child', 'parent', 'sibling', 'other']),
    calendar_ids: z.array(z.string()).optional().describe('Google Calendar IDs for this person'),
    birth_date: z.string().optional().describe('Birth date (YYYY-MM-DD)'),
    color: z.string().optional().describe('Display color hex code'),
    preferences: z.record(z.any()).optional().describe('Additional preferences')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { name, relationship, calendar_ids, birth_date, color, preferences } = args;
        const memberData = {
            name,
            relationship,
            calendar_ids: calendar_ids || [],
            birth_date: birth_date || null,
            color: color || null,
            preferences: preferences || {},
            updated_at: new Date().toISOString()
        };
        const { data, error } = await supabase
            .from('jeff_family_members')
            .upsert(memberData, { onConflict: 'name' })
            .select()
            .single();
        if (error) {
            return formatResponse(`Add family member error: ${error.message}`, true);
        }
        // Auto-create birthday recurring item if birth_date provided
        if (birth_date && data) {
            const birthDate = new Date(birth_date);
            await supabase.from('jeff_recurring_items').upsert({
                title: `${name}'s Birthday`,
                category: 'birthday',
                recurrence_type: 'annual',
                recurrence_month: birthDate.getMonth() + 1,
                recurrence_day: birthDate.getDate(),
                remind_days_before: [14, 7, 1],
                family_member_id: data.id,
                next_occurrence: birth_date
            }, { onConflict: 'title' });
        }
        return formatResponse({
            action: 'family_member_added',
            member: data
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_list_family", "List all family members", {}, async () => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { data, error } = await supabase
            .from('jeff_family_members')
            .select('*')
            .eq('active', true)
            .order('relationship');
        if (error) {
            return formatResponse(`List family error: ${error.message}`, true);
        }
        return formatResponse({
            action: 'family_listed',
            count: data?.length || 0,
            members: data || [],
            calendarConfig: FAMILY_CALENDARS
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_today", "Get today's overview: calendar events, tasks, and priorities for the family", {
    include_all_calendars: z.boolean().optional().default(true).describe('Include all family calendars')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Get today's tasks
        const { data: tasks } = await supabase
            .from('jeff_tasks')
            .select('*')
            .not('status', 'in', '("completed","cancelled")')
            .or(`due_date.gte.${today.toISOString()},due_date.lt.${tomorrow.toISOString()},due_date.is.null`)
            .order('priority')
            .order('due_date', { nullsFirst: false });
        // Get overdue tasks
        const { data: overdueTasks } = await supabase
            .from('jeff_tasks')
            .select('*')
            .not('status', 'in', '("completed","cancelled")')
            .lt('due_date', today.toISOString());
        // Get emails needing response
        const { data: emails } = await supabase
            .from('jeff_email_threads')
            .select('*')
            .eq('needs_response', true)
            .eq('status', 'active')
            .limit(5);
        // Get upcoming recurring items (next 7 days)
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        const { data: upcoming } = await supabase
            .from('jeff_recurring_items')
            .select('*, jeff_family_members(name)')
            .eq('active', true)
            .gte('next_occurrence', today.toISOString().split('T')[0])
            .lte('next_occurrence', weekFromNow.toISOString().split('T')[0])
            .order('next_occurrence');
        // Get today's wellbeing log if exists
        const { data: wellbeing } = await supabase
            .from('jeff_wellbeing_logs')
            .select('*')
            .eq('log_date', today.toISOString().split('T')[0])
            .single();
        // Get habit status for today
        const { data: habits } = await supabase
            .from('jeff_habits')
            .select('*, jeff_habit_logs!inner(completed)')
            .eq('active', true);
        const todayStr = today.toISOString().split('T')[0];
        const { data: todayHabitLogs } = await supabase
            .from('jeff_habit_logs')
            .select('habit_id, completed')
            .eq('log_date', todayStr);
        const habitStatus = habits?.map(h => ({
            id: h.id,
            name: h.name,
            streak: h.current_streak,
            completedToday: todayHabitLogs?.find(l => l.habit_id === h.id)?.completed || false
        })) || [];
        return formatResponse({
            action: 'today_overview',
            date: today.toISOString().split('T')[0],
            dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
            calendarInstructions: {
                description: 'Use google-calendar MCP to fetch today\'s events',
                tool: 'mcp__google-calendar__list-events',
                suggestedParams: {
                    calendarId: Object.values(FAMILY_CALENDARS).map(c => c.id),
                    timeMin: today.toISOString(),
                    timeMax: tomorrow.toISOString()
                }
            },
            tasks: {
                dueToday: tasks?.filter(t => t.due_date) || [],
                overdue: overdueTasks || [],
                highPriority: tasks?.filter(t => t.priority === 'urgent' || t.priority === 'high') || []
            },
            emails: {
                needingResponse: emails || []
            },
            upcoming: {
                recurringItems: upcoming || [],
                description: 'Birthdays, anniversaries, renewals coming up'
            },
            wellbeing: wellbeing ? {
                logged: true,
                permaAverage: wellbeing.positive_emotion && wellbeing.engagement &&
                    wellbeing.relationships && wellbeing.meaning && wellbeing.accomplishment
                    ? Math.round((wellbeing.positive_emotion + wellbeing.engagement +
                        wellbeing.relationships + wellbeing.meaning + wellbeing.accomplishment) / 5)
                    : null
            } : {
                logged: false,
                suggestion: 'Consider doing a quick PERMA check-in with /jeff checkin'
            },
            habits: {
                total: habitStatus.length,
                completedToday: habitStatus.filter(h => h.completedToday).length,
                items: habitStatus
            },
            familyCalendars: FAMILY_CALENDARS
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_week", "Get week-ahead overview with conflict detection", {
    weeks_ahead: z.number().optional().default(1).describe('Number of weeks to look ahead')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { weeks_ahead } = args;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + (weeks_ahead * 7));
        // Get tasks due this week
        const { data: tasks } = await supabase
            .from('jeff_tasks')
            .select('*')
            .not('status', 'in', '("completed","cancelled")')
            .gte('due_date', today.toISOString())
            .lte('due_date', endDate.toISOString())
            .order('due_date');
        // Get recurring items this week
        const { data: recurring } = await supabase
            .from('jeff_recurring_items')
            .select('*, jeff_family_members(name)')
            .eq('active', true)
            .gte('next_occurrence', today.toISOString().split('T')[0])
            .lte('next_occurrence', endDate.toISOString().split('T')[0])
            .order('next_occurrence');
        // Group tasks by day
        const tasksByDay = {};
        tasks?.forEach(t => {
            if (t.due_date) {
                const day = new Date(t.due_date).toISOString().split('T')[0];
                if (!tasksByDay[day])
                    tasksByDay[day] = [];
                tasksByDay[day].push(t);
            }
        });
        return formatResponse({
            action: 'week_overview',
            startDate: today.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            calendarInstructions: {
                description: 'Use google-calendar MCP to fetch week events and detect conflicts',
                tool: 'mcp__google-calendar__list-events',
                suggestedParams: {
                    calendarId: Object.values(FAMILY_CALENDARS).map(c => c.id),
                    timeMin: today.toISOString(),
                    timeMax: endDate.toISOString()
                },
                conflictDetection: 'Look for overlapping events across family members'
            },
            tasks: {
                total: tasks?.length || 0,
                byDay: tasksByDay
            },
            recurring: recurring || [],
            summary: {
                totalTasks: tasks?.length || 0,
                upcomingBirthdays: recurring?.filter(r => r.category === 'birthday').length || 0,
                renewals: recurring?.filter(r => r.category === 'renewal').length || 0
            },
            familyCalendars: FAMILY_CALENDARS
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// RECURRING ITEMS TOOLS
// ============================================================================
server.tool("jeff_add_recurring", "Add a recurring item (birthday, anniversary, renewal, seasonal task)", {
    title: z.string().describe('Item title'),
    category: z.enum(['birthday', 'anniversary', 'renewal', 'seasonal', 'health', 'financial', 'household', 'school', 'custom']),
    recurrence_type: z.enum(['annual', 'monthly', 'weekly', 'quarterly', 'custom']),
    month: z.number().optional().describe('Month (1-12) for annual items'),
    day: z.number().optional().describe('Day of month (1-31)'),
    remind_days_before: z.array(z.number()).optional().default([7, 1]).describe('Days before to remind'),
    family_member_name: z.string().optional().describe('Associated family member name'),
    description: z.string().optional(),
    context: z.record(z.any()).optional().describe('Additional context (gift ideas, renewal details, etc.)')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { title, category, recurrence_type, month, day, remind_days_before, family_member_name, description, context } = args;
        // Look up family member if provided
        let family_member_id = null;
        if (family_member_name) {
            const { data: member } = await supabase
                .from('jeff_family_members')
                .select('id')
                .eq('name', family_member_name)
                .single();
            family_member_id = member?.id;
        }
        // Calculate next occurrence
        let next_occurrence = null;
        if (recurrence_type === 'annual' && month && day) {
            const today = new Date();
            const thisYear = today.getFullYear();
            let nextDate = new Date(thisYear, month - 1, day);
            if (nextDate <= today) {
                nextDate = new Date(thisYear + 1, month - 1, day);
            }
            next_occurrence = nextDate.toISOString().split('T')[0];
        }
        const recurringData = {
            title,
            category,
            recurrence_type,
            recurrence_month: month,
            recurrence_day: day,
            remind_days_before,
            family_member_id,
            description,
            context: context || {},
            next_occurrence
        };
        const { data, error } = await supabase
            .from('jeff_recurring_items')
            .insert(recurringData)
            .select()
            .single();
        if (error) {
            return formatResponse(`Add recurring error: ${error.message}`, true);
        }
        return formatResponse({
            action: 'recurring_added',
            item: data,
            nextOccurrence: next_occurrence
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_list_upcoming", "List upcoming recurring items (birthdays, renewals, etc.)", {
    days_ahead: z.number().optional().default(30).describe('Days to look ahead'),
    category: z.string().optional().describe('Filter by category')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { days_ahead, category } = args;
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + days_ahead);
        let query = supabase
            .from('jeff_recurring_items')
            .select('*, jeff_family_members(name)')
            .eq('active', true)
            .gte('next_occurrence', today.toISOString().split('T')[0])
            .lte('next_occurrence', endDate.toISOString().split('T')[0])
            .order('next_occurrence');
        if (category) {
            query = query.eq('category', category);
        }
        const { data, error } = await query;
        if (error) {
            return formatResponse(`List upcoming error: ${error.message}`, true);
        }
        // Group by category
        const byCategory = {};
        data?.forEach(item => {
            if (!byCategory[item.category])
                byCategory[item.category] = [];
            byCategory[item.category].push(item);
        });
        return formatResponse({
            action: 'upcoming_listed',
            dateRange: {
                start: today.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
            },
            total: data?.length || 0,
            byCategory,
            items: data || []
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// WELLBEING TOOLS (PERMA Framework)
// ============================================================================
server.tool("jeff_checkin", "Log a PERMA wellbeing check-in", {
    log_type: z.enum(['daily', 'weekly', 'reflection']).optional().default('daily'),
    positive_emotion: z.number().min(1).max(10).optional().describe('How positive/happy did you feel? (1-10)'),
    engagement: z.number().min(1).max(10).optional().describe('How engaged/absorbed were you in activities? (1-10)'),
    relationships: z.number().min(1).max(10).optional().describe('Quality of social connections? (1-10)'),
    meaning: z.number().min(1).max(10).optional().describe('Sense of purpose/meaning? (1-10)'),
    accomplishment: z.number().min(1).max(10).optional().describe('Sense of achievement? (1-10)'),
    energy_level: z.number().min(1).max(10).optional().describe('Energy level? (1-10)'),
    stress_level: z.number().min(1).max(10).optional().describe('Stress level? (1-10, 1=low stress)'),
    sleep_quality: z.number().min(1).max(10).optional().describe('Sleep quality? (1-10)'),
    gratitude: z.array(z.string()).optional().describe('3 things you\'re grateful for'),
    wins: z.array(z.string()).optional().describe('Today\'s wins/accomplishments'),
    challenges: z.array(z.string()).optional().describe('Current challenges'),
    intentions: z.array(z.string()).optional().describe('Intentions for tomorrow'),
    notes: z.string().optional()
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { log_type, ...metrics } = args;
        const today = new Date().toISOString().split('T')[0];
        const logData = {
            log_date: today,
            log_type,
            ...metrics
        };
        const { data, error } = await supabase
            .from('jeff_wellbeing_logs')
            .upsert(logData, { onConflict: 'log_date,log_type' })
            .select()
            .single();
        if (error) {
            return formatResponse(`Check-in error: ${error.message}`, true);
        }
        // Calculate PERMA average
        const permaScores = [
            data.positive_emotion,
            data.engagement,
            data.relationships,
            data.meaning,
            data.accomplishment
        ].filter(s => s !== null);
        const permaAverage = permaScores.length > 0
            ? Math.round(permaScores.reduce((a, b) => a + b, 0) / permaScores.length * 10) / 10
            : null;
        return formatResponse({
            action: 'checkin_logged',
            date: today,
            log: data,
            permaAverage,
            insight: permaAverage ? (permaAverage >= 8 ? 'Excellent! You\'re thriving.' :
                permaAverage >= 6 ? 'Good day. Keep nurturing what\'s working.' :
                    permaAverage >= 4 ? 'Moderate. Consider what might boost your wellbeing.' :
                        'Challenging day. Be kind to yourself and reach out if needed.') : 'Complete more PERMA dimensions for insights.'
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_wellbeing_summary", "Get wellbeing trends over time", {
    days: z.number().optional().default(7).describe('Number of days to analyze')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { days } = args;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const { data, error } = await supabase
            .from('jeff_wellbeing_logs')
            .select('*')
            .gte('log_date', startDate.toISOString().split('T')[0])
            .order('log_date', { ascending: true });
        if (error) {
            return formatResponse(`Summary error: ${error.message}`, true);
        }
        if (!data || data.length === 0) {
            return formatResponse({
                action: 'wellbeing_summary',
                message: 'No wellbeing logs found for this period. Try /jeff checkin to start tracking.',
                suggestion: 'Regular check-ins help identify patterns in your wellbeing.'
            });
        }
        // Calculate averages
        const dimensions = ['positive_emotion', 'engagement', 'relationships', 'meaning', 'accomplishment', 'energy_level', 'stress_level', 'sleep_quality'];
        const averages = {};
        dimensions.forEach(dim => {
            const values = data.map(d => d[dim]).filter(v => v !== null);
            if (values.length > 0) {
                averages[dim] = Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10;
            }
        });
        // Identify trends
        const trends = [];
        if (averages.positive_emotion >= 7)
            trends.push('Strong positive emotions');
        if (averages.stress_level >= 7)
            trends.push('Consider stress management techniques');
        if (averages.sleep_quality <= 5)
            trends.push('Sleep quality could use attention');
        if (averages.relationships >= 7)
            trends.push('Good social connections');
        return formatResponse({
            action: 'wellbeing_summary',
            period: {
                start: startDate.toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0],
                daysLogged: data.length
            },
            averages,
            trends,
            logs: data
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// HABIT TOOLS (Atomic Habits Inspired)
// ============================================================================
server.tool("jeff_add_habit", "Create a new habit to track", {
    name: z.string().describe('Habit name'),
    description: z.string().optional(),
    category: z.enum(['health', 'fitness', 'mindfulness', 'learning', 'productivity', 'relationships', 'finance', 'custom']).optional().default('custom'),
    frequency: z.enum(['daily', 'weekly', 'specific_days']).optional().default('daily'),
    target_days: z.array(z.number()).optional().describe('For specific_days: 0=Sun, 1=Mon, etc.'),
    identity_statement: z.string().optional().describe('I am the type of person who...'),
    cue: z.string().optional().describe('What triggers this habit?'),
    routine: z.string().optional().describe('The habit action itself'),
    reward: z.string().optional().describe('How do you reward yourself?')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const habitData = {
            ...args,
            target_days: args.target_days || [],
            current_streak: 0,
            longest_streak: 0,
            total_completions: 0
        };
        const { data, error } = await supabase
            .from('jeff_habits')
            .insert(habitData)
            .select()
            .single();
        if (error) {
            return formatResponse(`Add habit error: ${error.message}`, true);
        }
        return formatResponse({
            action: 'habit_created',
            habit: data,
            tip: 'Start small. Make it obvious, attractive, easy, and satisfying.'
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_log_habit", "Log habit completion for today", {
    habit_id: z.string().optional().describe('Habit UUID'),
    habit_name: z.string().optional().describe('Habit name (alternative to ID)'),
    completed: z.boolean().optional().default(true),
    notes: z.string().optional()
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { habit_id, habit_name, completed, notes } = args;
        const today = new Date().toISOString().split('T')[0];
        // Find habit by ID or name
        let habitId = habit_id;
        if (!habitId && habit_name) {
            const { data: habit } = await supabase
                .from('jeff_habits')
                .select('id')
                .ilike('name', habit_name)
                .single();
            habitId = habit?.id;
        }
        if (!habitId) {
            return formatResponse('Habit not found. Provide habit_id or habit_name.', true);
        }
        const { data, error } = await supabase
            .from('jeff_habit_logs')
            .upsert({
            habit_id: habitId,
            log_date: today,
            completed,
            notes
        }, { onConflict: 'habit_id,log_date' })
            .select()
            .single();
        if (error) {
            return formatResponse(`Log habit error: ${error.message}`, true);
        }
        // Get updated habit with streak
        const { data: habit } = await supabase
            .from('jeff_habits')
            .select('*')
            .eq('id', habitId)
            .single();
        return formatResponse({
            action: 'habit_logged',
            date: today,
            log: data,
            habit: habit,
            streak: habit?.current_streak || 0,
            message: completed ? `Great job! Streak: ${habit?.current_streak || 1} days` : 'Logged. Tomorrow is a new day!'
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_habit_status", "View all habits with streaks and today's status", {}, async () => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: habits, error } = await supabase
            .from('jeff_habits')
            .select('*')
            .eq('active', true)
            .order('category')
            .order('name');
        if (error) {
            return formatResponse(`Habit status error: ${error.message}`, true);
        }
        // Get today's logs
        const { data: todayLogs } = await supabase
            .from('jeff_habit_logs')
            .select('habit_id, completed')
            .eq('log_date', today);
        const habitsWithStatus = habits?.map(h => ({
            ...h,
            completedToday: todayLogs?.find(l => l.habit_id === h.id)?.completed || false
        })) || [];
        const completed = habitsWithStatus.filter(h => h.completedToday).length;
        const total = habitsWithStatus.length;
        return formatResponse({
            action: 'habit_status',
            date: today,
            summary: {
                total,
                completedToday: completed,
                percentage: total > 0 ? Math.round(completed / total * 100) : 0
            },
            habits: habitsWithStatus,
            encouragement: completed === total && total > 0
                ? 'Perfect day! All habits completed.'
                : completed > 0
                    ? `${completed}/${total} done. Keep going!`
                    : 'Start your first habit of the day!'
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// PERSONAL DAILY DIGEST (EXTENDED)
// ============================================================================
server.tool("jeff_personal_digest", "Generate a comprehensive personal/family daily digest with calendar, tasks, wellbeing, and habits", {}, async () => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        // Get all data in parallel
        const [tasksResult, overdueResult, emailsResult, recurringResult, wellbeingResult, habitsResult, habitLogsResult] = await Promise.all([
            supabase.from('jeff_tasks').select('*')
                .not('status', 'in', '("completed","cancelled")')
                .order('priority').order('due_date', { nullsFirst: false }),
            supabase.from('jeff_tasks').select('*')
                .not('status', 'in', '("completed","cancelled")')
                .lt('due_date', today.toISOString()),
            supabase.from('jeff_email_threads').select('*')
                .eq('needs_response', true).eq('status', 'active'),
            supabase.from('jeff_recurring_items').select('*, jeff_family_members(name)')
                .eq('active', true)
                .gte('next_occurrence', todayStr)
                .lte('next_occurrence', weekFromNow.toISOString().split('T')[0]),
            supabase.from('jeff_wellbeing_logs').select('*')
                .eq('log_date', todayStr).single(),
            supabase.from('jeff_habits').select('*').eq('active', true),
            supabase.from('jeff_habit_logs').select('habit_id, completed').eq('log_date', todayStr)
        ]);
        const tasks = tasksResult.data || [];
        const overdue = overdueResult.data || [];
        const emails = emailsResult.data || [];
        const recurring = recurringResult.data || [];
        const wellbeing = wellbeingResult.data;
        const habits = habitsResult.data || [];
        const habitLogs = habitLogsResult.data || [];
        // Due today tasks
        const dueToday = tasks.filter(t => {
            if (!t.due_date)
                return false;
            const due = new Date(t.due_date);
            return due >= today && due < tomorrow;
        });
        // Habit status
        const habitsCompleted = habits.filter(h => habitLogs.find(l => l.habit_id === h.id && l.completed)).length;
        // Group tasks by project
        const tasksByProject = {};
        tasks.forEach(t => {
            const proj = t.project_id || 'unassigned';
            tasksByProject[proj] = (tasksByProject[proj] || 0) + 1;
        });
        return formatResponse({
            action: 'personal_digest',
            date: todayStr,
            dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
            greeting: getTimeBasedGreeting(),
            // Priority section
            attention: {
                overdueTasks: overdue.length,
                urgentTasks: tasks.filter(t => t.priority === 'urgent').length,
                emailsNeedingResponse: emails.length,
                habitsPending: habits.length - habitsCompleted
            },
            // Calendar section
            calendar: {
                instructions: 'Use google-calendar MCP for today\'s events',
                tool: 'mcp__google-calendar__list-events',
                params: {
                    calendarId: Object.values(FAMILY_CALENDARS).map(c => c.id),
                    timeMin: today.toISOString(),
                    timeMax: tomorrow.toISOString()
                }
            },
            // Tasks section
            tasks: {
                overdue,
                dueToday,
                highPriority: tasks.filter(t => t.priority === 'urgent' || t.priority === 'high'),
                byProject: tasksByProject,
                total: tasks.length
            },
            // Emails section
            emails: {
                needingResponse: emails,
                count: emails.length
            },
            // Upcoming section
            upcoming: {
                thisWeek: recurring,
                birthdays: recurring.filter(r => r.category === 'birthday'),
                renewals: recurring.filter(r => r.category === 'renewal')
            },
            // Wellbeing section
            wellbeing: wellbeing ? {
                logged: true,
                permaScores: {
                    positive_emotion: wellbeing.positive_emotion,
                    engagement: wellbeing.engagement,
                    relationships: wellbeing.relationships,
                    meaning: wellbeing.meaning,
                    accomplishment: wellbeing.accomplishment
                },
                energy: wellbeing.energy_level,
                stress: wellbeing.stress_level
            } : {
                logged: false,
                suggestion: 'Start your day with a quick PERMA check-in'
            },
            // Habits section
            habits: {
                total: habits.length,
                completed: habitsCompleted,
                pending: habits.filter(h => !habitLogs.find(l => l.habit_id === h.id && l.completed)),
                streaks: habits.filter(h => h.current_streak >= 7).map(h => ({
                    name: h.name,
                    streak: h.current_streak
                }))
            },
            // Recommendations
            recommendations: generateRecommendations(overdue, dueToday, emails, habits, habitsCompleted, wellbeing),
            // Quick actions
            quickActions: [
                overdue.length > 0 ? 'Address overdue tasks first' : null,
                emails.length > 0 ? 'Respond to pending emails' : null,
                !wellbeing ? 'Do morning PERMA check-in' : null,
                habitsCompleted < habits.length ? 'Complete remaining habits' : null
            ].filter(Boolean)
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// Helper functions for personal digest
function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12)
        return 'Good morning';
    if (hour < 17)
        return 'Good afternoon';
    return 'Good evening';
}
function generateRecommendations(overdue, dueToday, emails, habits, habitsCompleted, wellbeing) {
    const recs = [];
    if (overdue.length > 0) {
        recs.push(`Tackle ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} first`);
    }
    if (emails.length > 3) {
        recs.push('Block time for email responses');
    }
    if (!wellbeing) {
        recs.push('5-minute PERMA check-in boosts self-awareness');
    }
    if (wellbeing?.stress_level >= 7) {
        recs.push('Consider a stress-reduction activity today');
    }
    if (habitsCompleted === 0 && habits.length > 0) {
        recs.push('Start with your easiest habit to build momentum');
    }
    if (dueToday.length > 5) {
        recs.push('Prioritize ruthlessly - pick your top 3');
    }
    return recs.length > 0 ? recs : ['Looking good! Focus on deep work today.'];
}
// Start the server
async function startServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
startServer().catch(console.error);
//# sourceMappingURL=index.js.map