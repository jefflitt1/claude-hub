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
// ============================================================================
// EMAIL RULES TOOLS (Enhancement #1)
// ============================================================================
server.tool("jeff_add_email_rule", "Add a new email triage rule for auto-categorization", {
    name: z.string().describe('Rule name'),
    description: z.string().optional(),
    sender_pattern: z.string().optional().describe('Pattern to match sender (e.g., %n8n%)'),
    from_domain: z.string().optional().describe('Exact domain to match (e.g., profesia.sk)'),
    subject_pattern: z.string().optional().describe('Pattern to match subject'),
    keyword_patterns: z.array(z.string()).optional().describe('Keywords to match in body/subject'),
    action: z.enum(['auto_archive', 'auto_low_priority', 'auto_urgent', 'auto_high', 'skip_inbox', 'suggest_unsubscribe', 'auto_categorize', 'custom']),
    priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
    project_id: z.string().optional().describe('Auto-assign to project'),
    tags: z.array(z.string()).optional().describe('Auto-apply tags'),
    auto_archive_days: z.number().optional().describe('Archive after X days'),
    apply_to_account: z.enum(['personal', 'l7', 'all']).optional().default('all')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const ruleData = {
            name: args.name,
            description: args.description,
            sender_pattern: args.sender_pattern,
            from_domain: args.from_domain,
            subject_pattern: args.subject_pattern,
            keyword_patterns: args.keyword_patterns || [],
            action: args.action,
            priority: args.priority,
            project_id: args.project_id,
            tags: args.tags || [],
            auto_archive_days: args.auto_archive_days,
            apply_to_account: args.apply_to_account
        };
        const { data, error } = await supabase
            .from('jeff_email_rules')
            .insert(ruleData)
            .select()
            .single();
        if (error) {
            return formatResponse(`Add rule error: ${error.message}`, true);
        }
        return formatResponse({
            action: 'email_rule_created',
            rule: data
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_list_email_rules", "List all email triage rules", {
    active_only: z.boolean().optional().default(true)
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        let query = supabase
            .from('jeff_email_rules')
            .select('*')
            .order('match_count', { ascending: false });
        if (args.active_only) {
            query = query.eq('active', true);
        }
        const { data, error } = await query;
        if (error) {
            return formatResponse(`List rules error: ${error.message}`, true);
        }
        return formatResponse({
            action: 'email_rules_listed',
            count: data?.length || 0,
            rules: data || []
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_apply_email_rules", "Apply email rules to classify an email and return matching rules", {
    sender: z.string().describe('Email sender address'),
    subject: z.string().describe('Email subject'),
    body: z.string().optional().describe('Email body (first 500 chars)'),
    account: z.enum(['personal', 'l7'])
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { sender, subject, body, account } = args;
        const emailBody = body || '';
        // Get all active rules
        const { data: rules, error } = await supabase
            .from('jeff_email_rules')
            .select('*')
            .eq('active', true)
            .or(`apply_to_account.eq.all,apply_to_account.eq.${account}`);
        if (error) {
            return formatResponse(`Apply rules error: ${error.message}`, true);
        }
        // Apply rules manually (matching logic)
        const matchingRules = [];
        for (const rule of rules || []) {
            let matches = false;
            // Domain match
            if (rule.from_domain && sender.toLowerCase().includes(`@${rule.from_domain.toLowerCase()}`)) {
                matches = true;
            }
            // Sender pattern match
            if (rule.sender_pattern) {
                const pattern = rule.sender_pattern.replace(/%/g, '.*');
                if (new RegExp(pattern, 'i').test(sender)) {
                    matches = true;
                }
            }
            // Subject pattern match
            if (rule.subject_pattern) {
                const pattern = rule.subject_pattern.replace(/%/g, '.*');
                if (new RegExp(pattern, 'i').test(subject)) {
                    matches = true;
                }
            }
            // Keyword match
            if (rule.keyword_patterns && rule.keyword_patterns.length > 0) {
                const combinedText = `${subject} ${emailBody}`.toLowerCase();
                for (const keyword of rule.keyword_patterns) {
                    if (combinedText.includes(keyword.toLowerCase())) {
                        matches = true;
                        break;
                    }
                }
            }
            if (matches) {
                matchingRules.push(rule);
                // Update match count
                await supabase
                    .from('jeff_email_rules')
                    .update({
                    match_count: (rule.match_count || 0) + 1,
                    last_matched_at: new Date().toISOString()
                })
                    .eq('id', rule.id);
            }
        }
        // Determine overall recommendation
        const recommendation = matchingRules.length > 0 ? {
            priority: matchingRules[0].priority || 'normal',
            action: matchingRules[0].action,
            project_id: matchingRules.find(r => r.project_id)?.project_id,
            tags: [...new Set(matchingRules.flatMap(r => r.tags || []))],
            suggestUnsubscribe: matchingRules.some(r => r.action === 'suggest_unsubscribe')
        } : null;
        return formatResponse({
            action: 'rules_applied',
            matchingRules: matchingRules.map(r => ({
                id: r.id,
                name: r.name,
                action: r.action,
                priority: r.priority
            })),
            recommendation,
            noMatch: matchingRules.length === 0
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_delete_email_rule", "Delete or deactivate an email rule", {
    rule_id: z.string().describe('Rule UUID'),
    hard_delete: z.boolean().optional().default(false).describe('Permanently delete vs deactivate')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { rule_id, hard_delete } = args;
        if (hard_delete) {
            const { error } = await supabase
                .from('jeff_email_rules')
                .delete()
                .eq('id', rule_id);
            if (error) {
                return formatResponse(`Delete rule error: ${error.message}`, true);
            }
            return formatResponse({
                action: 'email_rule_deleted',
                rule_id
            });
        }
        else {
            const { data, error } = await supabase
                .from('jeff_email_rules')
                .update({ active: false, updated_at: new Date().toISOString() })
                .eq('id', rule_id)
                .select()
                .single();
            if (error) {
                return formatResponse(`Deactivate rule error: ${error.message}`, true);
            }
            return formatResponse({
                action: 'email_rule_deactivated',
                rule: data
            });
        }
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// CALENDAR CONFLICT DETECTION (Enhancement #4)
// ============================================================================
server.tool("jeff_detect_conflicts", "Detect calendar conflicts across family calendars for a given time range", {
    start_date: z.string().describe('Start date in ISO format'),
    end_date: z.string().describe('End date in ISO format'),
    calendars: z.array(z.string()).optional().describe('Calendar IDs to check (defaults to all family calendars)')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { start_date, end_date, calendars } = args;
        const calendarIds = calendars || Object.values(FAMILY_CALENDARS).map(c => c.id);
        // Return instructions for checking conflicts via Google Calendar MCP
        // The actual conflict detection happens by comparing events
        return formatResponse({
            action: 'conflict_detection_instructions',
            description: 'Calendar conflict detection requires fetching events from Google Calendar MCP',
            steps: [
                {
                    step: 1,
                    tool: 'mcp__google-calendar__list-events',
                    params: {
                        calendarId: calendarIds,
                        timeMin: start_date,
                        timeMax: end_date
                    },
                    description: 'Fetch events from all family calendars'
                },
                {
                    step: 2,
                    action: 'detect_overlaps',
                    description: 'Group events by time slot, identify overlaps across different calendars/family members',
                    conflictTypes: [
                        'time_overlap: Same person has two events at same time',
                        'double_booking: Multiple family members need to be in different places',
                        'transportation: Not enough travel time between locations',
                        'resource: Multiple events need same resource (car, equipment)'
                    ]
                },
                {
                    step: 3,
                    action: 'format_conflicts',
                    description: 'Present conflicts with suggested resolutions'
                }
            ],
            calendarsToCheck: calendarIds.map(id => {
                const config = Object.entries(FAMILY_CALENDARS).find(([, c]) => c.id === id);
                return {
                    id,
                    owner: config ? config[1].owner : 'Unknown',
                    type: config ? config[1].type : 'Unknown'
                };
            }),
            timeRange: {
                start: start_date,
                end: end_date
            }
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_analyze_conflicts", "Analyze a list of calendar events and identify conflicts", {
    events: z.array(z.object({
        id: z.string(),
        summary: z.string(),
        start: z.string(),
        end: z.string(),
        calendar_id: z.string().optional(),
        calendar_owner: z.string().optional(),
        location: z.string().optional()
    })).describe('Events to analyze for conflicts')
}, async (args) => {
    try {
        const { events } = args;
        // Sort events by start time
        const sortedEvents = events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        const conflicts = [];
        // Check for overlaps
        for (let i = 0; i < sortedEvents.length; i++) {
            const eventA = sortedEvents[i];
            const startA = new Date(eventA.start).getTime();
            const endA = new Date(eventA.end).getTime();
            for (let j = i + 1; j < sortedEvents.length; j++) {
                const eventB = sortedEvents[j];
                const startB = new Date(eventB.start).getTime();
                const endB = new Date(eventB.end).getTime();
                // Check if events overlap
                if (startA < endB && startB < endA) {
                    // Same calendar = double booking for same person
                    // Different calendars = potential family conflict
                    const sameCalendar = eventA.calendar_id === eventB.calendar_id;
                    conflicts.push({
                        type: sameCalendar ? 'double_booking' : 'family_conflict',
                        severity: sameCalendar ? 'high' : 'medium',
                        event1: {
                            summary: eventA.summary,
                            start: eventA.start,
                            end: eventA.end,
                            owner: eventA.calendar_owner || 'Unknown',
                            location: eventA.location
                        },
                        event2: {
                            summary: eventB.summary,
                            start: eventB.start,
                            end: eventB.end,
                            owner: eventB.calendar_owner || 'Unknown',
                            location: eventB.location
                        },
                        overlapMinutes: Math.round((Math.min(endA, endB) - Math.max(startA, startB)) / 60000),
                        suggestion: sameCalendar
                            ? 'Reschedule one of these events'
                            : 'Coordinate who attends which event or arrange transportation'
                    });
                }
            }
        }
        // Group by severity
        const highSeverity = conflicts.filter(c => c.severity === 'high');
        const mediumSeverity = conflicts.filter(c => c.severity === 'medium');
        return formatResponse({
            action: 'conflicts_analyzed',
            summary: {
                totalEvents: events.length,
                totalConflicts: conflicts.length,
                highSeverity: highSeverity.length,
                mediumSeverity: mediumSeverity.length
            },
            conflicts,
            recommendations: conflicts.length > 0 ? [
                highSeverity.length > 0 ? 'Address high-severity conflicts first (same-person double bookings)' : null,
                mediumSeverity.length > 0 ? 'Review family conflicts and coordinate coverage' : null,
                'Consider adding travel time buffers between events'
            ].filter(Boolean) : ['No conflicts detected']
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// HABIT STREAK NOTIFICATIONS (Enhancement #5)
// ============================================================================
server.tool("jeff_habits_at_risk", "Get habits with streaks that are at risk of breaking (not completed today)", {
    min_streak: z.number().optional().default(3).describe('Minimum streak days to consider at risk')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { min_streak } = args;
        const today = new Date().toISOString().split('T')[0];
        // Get habits with streaks above minimum
        const { data: habits, error } = await supabase
            .from('jeff_habits')
            .select('*')
            .eq('active', true)
            .gte('current_streak', min_streak)
            .order('current_streak', { ascending: false });
        if (error) {
            return formatResponse(`Habits at risk error: ${error.message}`, true);
        }
        // Check which ones haven't been completed today
        const { data: todayLogs } = await supabase
            .from('jeff_habit_logs')
            .select('habit_id, completed')
            .eq('log_date', today)
            .eq('completed', true);
        const completedToday = new Set(todayLogs?.map(l => l.habit_id) || []);
        const atRiskHabits = habits?.filter(h => !completedToday.has(h.id)).map(h => ({
            id: h.id,
            name: h.name,
            current_streak: h.current_streak,
            longest_streak: h.longest_streak,
            category: h.category,
            identity_statement: h.identity_statement,
            urgency: h.current_streak >= 30 ? 'critical' :
                h.current_streak >= 14 ? 'high' :
                    h.current_streak >= 7 ? 'medium' : 'normal'
        })) || [];
        // Milestone celebrations (habits that reached milestones)
        const milestones = habits?.filter(h => [7, 14, 21, 30, 60, 90, 100, 365].includes(h.current_streak)).map(h => ({
            name: h.name,
            streak: h.current_streak,
            message: getMilestoneMessage(h.current_streak)
        })) || [];
        return formatResponse({
            action: 'habits_at_risk',
            date: today,
            atRisk: {
                count: atRiskHabits.length,
                habits: atRiskHabits
            },
            milestones: {
                count: milestones.length,
                celebrations: milestones
            },
            motivations: atRiskHabits.length > 0 ? [
                'Every day counts - protect your streaks!',
                'Missing one day makes it easier to miss the next.',
                'You\'ve worked hard to build these habits.'
            ] : ['All habit streaks are safe! Great job maintaining your routines.']
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
function getMilestoneMessage(streak) {
    switch (streak) {
        case 7: return '🎉 One week streak! You\'re building momentum.';
        case 14: return '🌟 Two weeks! The habit is taking root.';
        case 21: return '💪 Three weeks! Scientists say habits form around now.';
        case 30: return '🏆 One month! You\'re proving who you are.';
        case 60: return '🚀 Two months! This is becoming part of your identity.';
        case 90: return '⭐ Three months! You\'ve truly transformed.';
        case 100: return '💯 100 days! Incredible dedication!';
        case 365: return '🎊 ONE YEAR! You are the embodiment of this habit!';
        default: return `Great job maintaining your ${streak}-day streak!`;
    }
}
// ============================================================================
// PROACTIVE DAILY DIGEST (Enhancement #2)
// ============================================================================
server.tool("jeff_generate_digest_payload", "Generate a structured digest payload for external delivery (n8n webhook, Telegram, email)", {
    format: z.enum(['json', 'markdown', 'telegram']).optional().default('json'),
    include_calendar: z.boolean().optional().default(true).describe('Whether to include calendar instructions')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { format } = args;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        // Parallel data fetching
        const [tasksResult, overdueResult, emailsResult, habitsResult, habitLogsResult, recurringResult, wellbeingResult] = await Promise.all([
            supabase.from('jeff_tasks').select('*')
                .not('status', 'in', '("completed","cancelled")')
                .order('priority').order('due_date', { nullsFirst: false }),
            supabase.from('jeff_tasks').select('*')
                .not('status', 'in', '("completed","cancelled")')
                .lt('due_date', today.toISOString()),
            supabase.from('jeff_email_threads').select('*')
                .eq('needs_response', true).eq('status', 'active'),
            supabase.from('jeff_habits').select('*').eq('active', true),
            supabase.from('jeff_habit_logs').select('habit_id, completed').eq('log_date', todayStr),
            supabase.from('jeff_recurring_items').select('*, jeff_family_members(name)')
                .eq('active', true)
                .gte('next_occurrence', todayStr)
                .lte('next_occurrence', weekFromNow.toISOString().split('T')[0]),
            supabase.from('jeff_wellbeing_logs').select('*')
                .eq('log_date', todayStr).single()
        ]);
        const tasks = tasksResult.data || [];
        const overdue = overdueResult.data || [];
        const emails = emailsResult.data || [];
        const habits = habitsResult.data || [];
        const habitLogs = habitLogsResult.data || [];
        const recurring = recurringResult.data || [];
        const wellbeing = wellbeingResult.data;
        // Get at-risk habits
        const completedHabitIds = new Set(habitLogs.filter(l => l.completed).map(l => l.habit_id));
        const atRiskHabits = habits
            .filter(h => h.current_streak >= 3 && !completedHabitIds.has(h.id))
            .sort((a, b) => b.current_streak - a.current_streak);
        // Due today
        const dueToday = tasks.filter(t => {
            if (!t.due_date)
                return false;
            const due = new Date(t.due_date);
            return due >= today && due < tomorrow;
        });
        // Urgent tasks
        const urgent = tasks.filter(t => t.priority === 'urgent');
        const payload = {
            date: todayStr,
            dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
            greeting: getTimeBasedGreeting(),
            // Summary counts
            summary: {
                overdueTasks: overdue.length,
                urgentTasks: urgent.length,
                dueTodayTasks: dueToday.length,
                emailsNeedingResponse: emails.length,
                habitsAtRisk: atRiskHabits.length,
                habitsPending: habits.length - completedHabitIds.size,
                upcomingRecurring: recurring.length
            },
            // Priority items
            priorities: {
                overdue: overdue.slice(0, 5).map(t => ({ title: t.title, due_date: t.due_date, project: t.project_id })),
                urgent: urgent.slice(0, 5).map(t => ({ title: t.title, due_date: t.due_date, project: t.project_id })),
                dueToday: dueToday.slice(0, 5).map(t => ({ title: t.title, project: t.project_id })),
                emailsAwaitingResponse: emails.slice(0, 5).map(e => ({ subject: e.subject, account: e.account })),
                habitsAtRisk: atRiskHabits.slice(0, 5).map(h => ({ name: h.name, streak: h.current_streak }))
            },
            // Upcoming
            upcoming: recurring.slice(0, 5).map(r => ({
                title: r.title,
                category: r.category,
                date: r.next_occurrence,
                familyMember: r.jeff_family_members?.name
            })),
            // Wellbeing
            wellbeing: wellbeing ? {
                logged: true,
                permaAverage: [
                    wellbeing.positive_emotion,
                    wellbeing.engagement,
                    wellbeing.relationships,
                    wellbeing.meaning,
                    wellbeing.accomplishment
                ].filter(Boolean).reduce((a, b) => a + b, 0) /
                    [wellbeing.positive_emotion, wellbeing.engagement, wellbeing.relationships,
                        wellbeing.meaning, wellbeing.accomplishment].filter(Boolean).length || 0,
                stressLevel: wellbeing.stress_level
            } : { logged: false },
            // Calendar fetch instructions for external systems
            calendarFetch: {
                tool: 'mcp__google-calendar__list-events',
                calendarIds: Object.values(FAMILY_CALENDARS).map(c => c.id),
                timeMin: today.toISOString(),
                timeMax: tomorrow.toISOString()
            }
        };
        // Format based on requested output
        if (format === 'markdown' || format === 'telegram') {
            const md = formatDigestAsMarkdown(payload, format === 'telegram');
            return formatResponse({
                action: 'digest_generated',
                format,
                payload: md
            });
        }
        return formatResponse({
            action: 'digest_generated',
            format: 'json',
            payload
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
function formatDigestAsMarkdown(payload, isTelegram) {
    const emoji = isTelegram;
    const lines = [];
    lines.push(`${emoji ? '📅 ' : ''}**Daily Digest - ${payload.dayOfWeek}, ${payload.date}**`);
    lines.push('');
    lines.push(`${payload.greeting}!`);
    lines.push('');
    // Summary
    const { summary } = payload;
    if (summary.overdueTasks > 0 || summary.urgentTasks > 0 || summary.emailsNeedingResponse > 0) {
        lines.push(`${emoji ? '⚠️ ' : ''}**Attention Needed:**`);
        if (summary.overdueTasks > 0)
            lines.push(`• ${summary.overdueTasks} overdue task(s)`);
        if (summary.urgentTasks > 0)
            lines.push(`• ${summary.urgentTasks} urgent task(s)`);
        if (summary.emailsNeedingResponse > 0)
            lines.push(`• ${summary.emailsNeedingResponse} email(s) need response`);
        if (summary.habitsAtRisk > 0)
            lines.push(`• ${summary.habitsAtRisk} habit streak(s) at risk`);
        lines.push('');
    }
    // Due Today
    if (payload.priorities.dueToday.length > 0) {
        lines.push(`${emoji ? '📋 ' : ''}**Due Today (${payload.priorities.dueToday.length}):**`);
        payload.priorities.dueToday.forEach((t) => {
            lines.push(`• ${t.title}${t.project ? ` [${t.project}]` : ''}`);
        });
        lines.push('');
    }
    // Habits at risk
    if (payload.priorities.habitsAtRisk.length > 0) {
        lines.push(`${emoji ? '🔥 ' : ''}**Habits at Risk:**`);
        payload.priorities.habitsAtRisk.forEach((h) => {
            lines.push(`• ${h.name} - ${h.streak} day streak!`);
        });
        lines.push('');
    }
    // Upcoming
    if (payload.upcoming.length > 0) {
        lines.push(`${emoji ? '📆 ' : ''}**Upcoming:**`);
        payload.upcoming.forEach((r) => {
            lines.push(`• ${r.date}: ${r.title}${r.familyMember ? ` (${r.familyMember})` : ''}`);
        });
        lines.push('');
    }
    // Wellbeing
    if (!payload.wellbeing.logged) {
        lines.push(`${emoji ? '💚 ' : ''}Consider doing a PERMA check-in today.`);
    }
    return lines.join('\n');
}
// ============================================================================
// PERMA TREND ANALYSIS (Enhancement #7)
// ============================================================================
server.tool("jeff_perma_trends", "Analyze PERMA wellbeing trends over time with dimension-specific insights", {
    period: z.enum(['week', 'month', 'quarter']).optional().default('week')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { period } = args;
        const today = new Date();
        const startDate = new Date(today);
        switch (period) {
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
        }
        const { data, error } = await supabase
            .from('jeff_wellbeing_logs')
            .select('*')
            .gte('log_date', startDate.toISOString().split('T')[0])
            .order('log_date', { ascending: true });
        if (error) {
            return formatResponse(`PERMA trends error: ${error.message}`, true);
        }
        if (!data || data.length === 0) {
            return formatResponse({
                action: 'perma_trends',
                period,
                message: 'No wellbeing data found for this period',
                suggestion: 'Start tracking with /jeff checkin to see trends over time'
            });
        }
        // Calculate dimension averages
        const dimensions = ['positive_emotion', 'engagement', 'relationships', 'meaning', 'accomplishment'];
        const averages = {};
        const trends = {};
        dimensions.forEach(dim => {
            const values = data.map(d => d[dim]).filter(v => v !== null);
            if (values.length > 0) {
                averages[dim] = Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10;
                // Calculate trend (compare first half to second half)
                if (values.length >= 4) {
                    const midpoint = Math.floor(values.length / 2);
                    const firstHalf = values.slice(0, midpoint);
                    const secondHalf = values.slice(midpoint);
                    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                    const diff = secondAvg - firstAvg;
                    if (diff > 0.5)
                        trends[dim] = 'improving';
                    else if (diff < -0.5)
                        trends[dim] = 'declining';
                    else
                        trends[dim] = 'stable';
                }
                else {
                    trends[dim] = 'stable';
                }
            }
        });
        // Find lowest and highest dimensions
        const sortedDimensions = dimensions
            .filter(d => averages[d] !== undefined)
            .sort((a, b) => averages[a] - averages[b]);
        const lowestDimension = sortedDimensions[0];
        const highestDimension = sortedDimensions[sortedDimensions.length - 1];
        // Generate recommendations based on lowest dimension
        const recommendations = getDimensionRecommendations(lowestDimension, averages[lowestDimension]);
        // Overall PERMA score
        const permaValues = dimensions.map(d => averages[d]).filter(v => v !== undefined);
        const overallScore = permaValues.length > 0
            ? Math.round(permaValues.reduce((a, b) => a + b, 0) / permaValues.length * 10) / 10
            : null;
        // Additional metrics
        const stressValues = data.map(d => d.stress_level).filter(v => v !== null);
        const energyValues = data.map(d => d.energy_level).filter(v => v !== null);
        const sleepValues = data.map(d => d.sleep_quality).filter(v => v !== null);
        return formatResponse({
            action: 'perma_trends',
            period,
            dateRange: {
                start: startDate.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0],
                daysLogged: data.length
            },
            overallScore,
            dimensions: {
                averages,
                trends,
                lowest: lowestDimension ? { dimension: lowestDimension, score: averages[lowestDimension] } : null,
                highest: highestDimension ? { dimension: highestDimension, score: averages[highestDimension] } : null
            },
            additionalMetrics: {
                avgStress: stressValues.length > 0 ? Math.round(stressValues.reduce((a, b) => a + b, 0) / stressValues.length * 10) / 10 : null,
                avgEnergy: energyValues.length > 0 ? Math.round(energyValues.reduce((a, b) => a + b, 0) / energyValues.length * 10) / 10 : null,
                avgSleep: sleepValues.length > 0 ? Math.round(sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length * 10) / 10 : null
            },
            recommendations,
            insight: getOverallInsight(overallScore, lowestDimension, trends)
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
function getDimensionRecommendations(dimension, score) {
    const recommendations = {
        positive_emotion: [
            'Start a gratitude journal - write 3 things daily',
            'Schedule activities you enjoy',
            'Practice savoring positive moments',
            'Connect with uplifting people'
        ],
        engagement: [
            'Find activities that create flow state',
            'Match challenges to your skill level',
            'Minimize distractions during focused work',
            'Pursue hobbies that absorb your attention'
        ],
        relationships: [
            'Schedule quality time with loved ones',
            'Practice active listening in conversations',
            'Reach out to someone you haven\'t talked to',
            'Join groups aligned with your interests'
        ],
        meaning: [
            'Connect daily tasks to larger purpose',
            'Volunteer or help others',
            'Reflect on your core values',
            'Set goals aligned with what matters to you'
        ],
        accomplishment: [
            'Set and track small daily wins',
            'Celebrate progress, not just completion',
            'Break big goals into manageable steps',
            'Review accomplishments weekly'
        ]
    };
    return recommendations[dimension] || ['Continue regular check-ins to track your wellbeing'];
}
function getOverallInsight(score, lowestDimension, trends) {
    if (!score)
        return 'Complete more check-ins to get personalized insights.';
    const improvingCount = Object.values(trends).filter(t => t === 'improving').length;
    const decliningCount = Object.values(trends).filter(t => t === 'declining').length;
    if (score >= 8 && decliningCount === 0) {
        return 'Excellent! You\'re flourishing across all dimensions.';
    }
    else if (score >= 6) {
        if (improvingCount > decliningCount) {
            return 'Good progress! Your wellbeing is trending upward.';
        }
        else if (lowestDimension) {
            return `Consider focusing on ${lowestDimension.replace('_', ' ')} - it\'s your growth area.`;
        }
        return 'Solid foundation. Small improvements can make a big difference.';
    }
    else {
        return `Focus on building up ${lowestDimension?.replace('_', ' ') || 'one dimension at a time'}. Small consistent actions lead to lasting change.`;
    }
}
// ============================================================================
// RECURRING ITEM SMART REMINDERS (Enhancement #9)
// ============================================================================
server.tool("jeff_upcoming_with_actions", "Get upcoming recurring items with suggested actions and context", {
    days_ahead: z.number().optional().default(30)
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { days_ahead } = args;
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + days_ahead);
        const { data, error } = await supabase
            .from('jeff_recurring_items')
            .select('*, jeff_family_members(name, birth_date)')
            .eq('active', true)
            .gte('next_occurrence', today.toISOString().split('T')[0])
            .lte('next_occurrence', endDate.toISOString().split('T')[0])
            .order('next_occurrence');
        if (error) {
            return formatResponse(`Upcoming with actions error: ${error.message}`, true);
        }
        // Enrich items with suggested actions
        const enrichedItems = data?.map(item => {
            const daysUntil = Math.ceil((new Date(item.next_occurrence).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            let suggestedActions = [];
            let urgency = 'normal';
            switch (item.category) {
                case 'birthday':
                    if (daysUntil <= 1)
                        urgency = 'critical';
                    else if (daysUntil <= 7)
                        urgency = 'high';
                    suggestedActions = [
                        daysUntil > 7 ? 'Order gift online' : 'Get same-day gift or gift card',
                        'Send birthday message/card',
                        item.jeff_family_members?.name ? `Wish ${item.jeff_family_members.name} happy birthday` : 'Send wishes'
                    ];
                    if (item.context?.giftIdeas) {
                        suggestedActions.unshift(`Gift ideas: ${item.context.giftIdeas}`);
                    }
                    break;
                case 'anniversary':
                    if (daysUntil <= 1)
                        urgency = 'critical';
                    else if (daysUntil <= 7)
                        urgency = 'high';
                    suggestedActions = [
                        'Make dinner reservation',
                        'Plan special activity',
                        'Get card/gift',
                        'Arrange childcare if needed'
                    ];
                    break;
                case 'renewal':
                    if (daysUntil <= 3)
                        urgency = 'critical';
                    else if (daysUntil <= 14)
                        urgency = 'high';
                    suggestedActions = [
                        'Review renewal terms',
                        item.context?.amount ? `Budget $${item.context.amount} for renewal` : 'Check renewal cost',
                        item.context?.vendor ? `Visit ${item.context.vendor} to renew` : 'Complete renewal process',
                        'Set calendar reminder for next year'
                    ];
                    break;
                case 'health':
                    if (daysUntil <= 3)
                        urgency = 'high';
                    suggestedActions = [
                        'Confirm appointment',
                        'Prepare questions/concerns',
                        'Gather relevant documents/records'
                    ];
                    break;
                case 'financial':
                    if (daysUntil <= 3)
                        urgency = 'critical';
                    else if (daysUntil <= 7)
                        urgency = 'high';
                    suggestedActions = [
                        'Review financial documents',
                        'Prepare payment if needed',
                        'Contact advisor if questions'
                    ];
                    break;
                default:
                    suggestedActions = ['Review and prepare', 'Set specific reminders'];
            }
            return {
                ...item,
                daysUntil,
                urgency,
                suggestedActions,
                familyMemberName: item.jeff_family_members?.name
            };
        }) || [];
        // Group by urgency
        const critical = enrichedItems.filter(i => i.urgency === 'critical');
        const high = enrichedItems.filter(i => i.urgency === 'high');
        const normal = enrichedItems.filter(i => i.urgency === 'normal' || i.urgency === 'low');
        return formatResponse({
            action: 'upcoming_with_actions',
            dateRange: {
                start: today.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
            },
            summary: {
                total: enrichedItems.length,
                critical: critical.length,
                high: high.length,
                normal: normal.length
            },
            byUrgency: {
                critical,
                high,
                normal
            },
            items: enrichedItems
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// PROJECT CONTEXT AWARENESS (Enhancement #8)
// ============================================================================
server.tool("jeff_project_context", "Get recent project activity and context for intelligent follow-ups", {
    project_id: z.string().describe('Project ID'),
    days: z.number().optional().default(7).describe('Days of activity to retrieve')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { project_id, days } = args;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // Get project activity
        const { data: activity, error: activityError } = await supabase
            .from('jeff_project_activity')
            .select('*')
            .eq('project_id', project_id)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false });
        // Get tasks for this project
        const { data: tasks } = await supabase
            .from('jeff_tasks')
            .select('*')
            .eq('project_id', project_id)
            .order('created_at', { ascending: false })
            .limit(20);
        // Get email threads for this project
        const { data: threads } = await supabase
            .from('jeff_email_threads')
            .select('*')
            .eq('project_id', project_id)
            .order('last_message_at', { ascending: false })
            .limit(10);
        // Calculate momentum (activity frequency)
        const activityCount = activity?.length || 0;
        const momentum = activityCount >= 10 ? 'high' :
            activityCount >= 5 ? 'medium' :
                activityCount >= 1 ? 'low' : 'stale';
        // Identify stale items
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const staleThreads = threads?.filter(t => t.status === 'active' &&
            new Date(t.last_message_at) < fiveDaysAgo) || [];
        const staleTasks = tasks?.filter(t => t.status !== 'completed' &&
            t.status !== 'cancelled' &&
            new Date(t.created_at) < fiveDaysAgo &&
            !t.due_date) || [];
        // Generate follow-up suggestions
        const suggestions = [];
        if (momentum === 'stale') {
            suggestions.push('Project has been inactive - consider reviewing priorities');
        }
        if (staleThreads.length > 0) {
            suggestions.push(`${staleThreads.length} email thread(s) need follow-up`);
        }
        if (staleTasks.length > 0) {
            suggestions.push(`${staleTasks.length} task(s) may need attention or closure`);
        }
        if (threads?.some(t => t.needs_response)) {
            suggestions.push('Pending email responses in this project');
        }
        const openTasks = tasks?.filter(t => t.status !== 'completed' && t.status !== 'cancelled') || [];
        return formatResponse({
            action: 'project_context',
            project_id,
            period: {
                start: startDate.toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0],
                days
            },
            momentum: {
                level: momentum,
                activityCount,
                description: momentum === 'high' ? 'Very active' :
                    momentum === 'medium' ? 'Moderately active' :
                        momentum === 'low' ? 'Limited activity' : 'No recent activity'
            },
            summary: {
                openTasks: openTasks.length,
                completedTasks: tasks?.filter(t => t.status === 'completed').length || 0,
                activeThreads: threads?.filter(t => t.status === 'active').length || 0,
                needsResponse: threads?.filter(t => t.needs_response).length || 0
            },
            recentActivity: activity?.slice(0, 10) || [],
            staleItems: {
                threads: staleThreads.map(t => ({ id: t.id, subject: t.subject, lastActivity: t.last_message_at })),
                tasks: staleTasks.map(t => ({ id: t.id, title: t.title, created: t.created_at }))
            },
            suggestions,
            openTasks: openTasks.slice(0, 5),
            recentThreads: threads?.slice(0, 5) || []
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_log_project_activity", "Log an activity for a project (for tracking momentum)", {
    project_id: z.string(),
    activity_type: z.enum([
        'task_created', 'task_completed', 'task_updated',
        'email_sent', 'email_received', 'email_responded',
        'file_created', 'file_modified', 'meeting',
        'note', 'milestone', 'other'
    ]),
    entity_type: z.string().optional(),
    entity_id: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.any()).optional()
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { project_id, activity_type, entity_type, entity_id, description, metadata } = args;
        const { data, error } = await supabase
            .from('jeff_project_activity')
            .insert({
            project_id,
            activity_type,
            entity_type,
            entity_id,
            description,
            metadata: metadata || {}
        })
            .select()
            .single();
        if (error) {
            return formatResponse(`Log activity error: ${error.message}`, true);
        }
        return formatResponse({
            action: 'activity_logged',
            activity: data
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// EMAIL THREAD MEMORY (Enhancement #3)
// ============================================================================
server.tool("jeff_summarize_thread", "Store an AI-generated summary for an email thread", {
    thread_id: z.string().describe('Jeff thread UUID'),
    ai_summary: z.string().describe('AI-generated summary of the thread'),
    key_points: z.array(z.string()).optional().describe('Key points from the thread'),
    action_items: z.array(z.string()).optional().describe('Action items identified'),
    sentiment: z.enum(['positive', 'neutral', 'negative', 'urgent']).optional()
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { thread_id, ai_summary, key_points, action_items, sentiment } = args;
        const { data, error } = await supabase
            .from('jeff_email_threads')
            .update({
            ai_summary,
            key_points: key_points || [],
            action_items: action_items || [],
            sentiment,
            summary_updated_at: new Date().toISOString()
        })
            .eq('id', thread_id)
            .select()
            .single();
        if (error) {
            return formatResponse(`Summarize thread error: ${error.message}`, true);
        }
        // Auto-create tasks from action items if provided
        const createdTasks = [];
        if (action_items && action_items.length > 0) {
            for (const item of action_items) {
                const { data: task } = await supabase
                    .from('jeff_tasks')
                    .insert({
                    title: item,
                    source_type: 'email',
                    source_id: data.gmail_thread_id,
                    project_id: data.project_id,
                    priority: sentiment === 'urgent' ? 'high' : 'normal',
                    status: 'pending'
                })
                    .select()
                    .single();
                if (task)
                    createdTasks.push(task);
            }
        }
        return formatResponse({
            action: 'thread_summarized',
            thread: data,
            tasksCreated: createdTasks.length,
            tasks: createdTasks
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// QUICK ACTIONS (Enhancement #6)
// ============================================================================
server.tool("jeff_quick", "Get only urgent/critical items for quick review", {}, async () => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        today.setHours(0, 0, 0, 0);
        // Parallel fetch of urgent items
        const [overdueResult, urgentResult, emailsResult, atRiskHabitsResult] = await Promise.all([
            // Overdue tasks
            supabase.from('jeff_tasks').select('id, title, due_date, project_id')
                .not('status', 'in', '("completed","cancelled")')
                .lt('due_date', today.toISOString())
                .order('due_date'),
            // Urgent priority tasks
            supabase.from('jeff_tasks').select('id, title, due_date, project_id')
                .not('status', 'in', '("completed","cancelled")')
                .eq('priority', 'urgent'),
            // Emails needing response
            supabase.from('jeff_email_threads').select('id, subject, account, priority')
                .eq('needs_response', true)
                .eq('status', 'active')
                .in('priority', ['urgent', 'high']),
            // Habits at risk
            supabase.from('jeff_habits').select('id, name, current_streak')
                .eq('active', true)
                .gte('current_streak', 5)
        ]);
        // Check which habits are incomplete today
        const { data: todayLogs } = await supabase
            .from('jeff_habit_logs')
            .select('habit_id')
            .eq('log_date', todayStr)
            .eq('completed', true);
        const completedIds = new Set(todayLogs?.map(l => l.habit_id) || []);
        const atRiskHabits = (atRiskHabitsResult.data || [])
            .filter(h => !completedIds.has(h.id));
        const overdue = overdueResult.data || [];
        const urgent = urgentResult.data || [];
        const emails = emailsResult.data || [];
        const totalIssues = overdue.length + urgent.length + emails.length + atRiskHabits.length;
        return formatResponse({
            action: 'quick_status',
            allClear: totalIssues === 0,
            summary: {
                overdue: overdue.length,
                urgent: urgent.length,
                emailsUrgent: emails.length,
                habitsAtRisk: atRiskHabits.length
            },
            items: {
                overdueTasks: overdue.slice(0, 5),
                urgentTasks: urgent.slice(0, 5),
                urgentEmails: emails.slice(0, 5),
                habitsAtRisk: atRiskHabits.slice(0, 5).map(h => ({
                    name: h.name,
                    streak: h.current_streak
                }))
            },
            message: totalIssues === 0
                ? 'All clear! No urgent items need attention.'
                : `${totalIssues} item(s) need your attention.`
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// ============================================================================
// EMAIL CLASSIFICATION & ACTION PROPOSAL TOOLS
// ============================================================================
// Ollama endpoint for local LLM inference (Mac Studio via Tailscale)
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://mac-studio.tail8e9f4b.ts.net:11434';
server.tool("jeff_classify_email", "Classify an email using local LLM (DeepSeek R1) or rule-based matching. Returns classification, confidence, and suggested action.", {
    thread_id: z.string().optional().describe('Existing jeff_email_threads UUID to re-classify'),
    gmail_thread_id: z.string().optional().describe('Gmail thread ID (creates new thread if needed)'),
    account: z.enum(['personal', 'l7']).optional().default('personal'),
    subject: z.string().optional().describe('Email subject'),
    from_email: z.string().optional().describe('Sender email'),
    from_name: z.string().optional().describe('Sender name'),
    snippet: z.string().optional().describe('Email body preview (first ~500 chars)'),
    use_llm: z.boolean().optional().default(true).describe('Use Ollama LLM (false = rule-based only)')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { thread_id, gmail_thread_id, account, subject, from_email, from_name, snippet, use_llm } = args;
        // Get existing thread if thread_id provided
        let thread = null;
        if (thread_id) {
            const { data } = await supabase.from('jeff_email_threads').select('*').eq('id', thread_id).single();
            thread = data;
        }
        const emailSubject = subject || thread?.subject || '(no subject)';
        const emailFrom = from_email || thread?.from_email || 'unknown';
        const emailName = from_name || thread?.from_name || '';
        const emailSnippet = snippet || thread?.snippet || '';
        // Step 1: Try rule-based classification first
        let classification = null;
        let confidence = 0;
        let suggestedAction = 'read';
        let reasoning = '';
        let model = 'rule-based';
        const { data: ruleMatches } = await supabase.rpc('apply_email_rules', {
            p_sender: emailFrom,
            p_subject: emailSubject,
            p_body: emailSnippet,
            p_account: account || 'personal'
        });
        if (ruleMatches && ruleMatches.length > 0) {
            const topRule = ruleMatches[0];
            const ruleToClassification = {
                'auto_archive': 'spam', 'auto_low_priority': 'marketing',
                'auto_urgent': 'urgent', 'auto_high': 'needs_response',
                'skip_inbox': 'spam', 'suggest_unsubscribe': 'marketing',
                'auto_categorize': 'fyi'
            };
            const ruleToAction = {
                'auto_archive': 'archive', 'auto_low_priority': 'read',
                'auto_urgent': 'reply', 'auto_high': 'reply',
                'skip_inbox': 'archive', 'suggest_unsubscribe': 'archive',
                'auto_categorize': 'read'
            };
            classification = ruleToClassification[topRule.action] || 'fyi';
            confidence = 0.95;
            suggestedAction = ruleToAction[topRule.action] || 'read';
            reasoning = `Matched rule: ${topRule.rule_name}`;
        }
        // Step 2: Use LLM if no rule match and use_llm is true
        if (!classification && use_llm) {
            try {
                const prompt = `Analyze this email and classify it. Output ONLY valid JSON, no other text.

From: ${emailName} <${emailFrom}>
Subject: ${emailSubject}
Body preview: ${emailSnippet}

Respond with this exact JSON structure:
{"classification":"spam|marketing|fyi|needs_response|urgent","confidence":0.0,"suggested_action":"archive|read|reply|create_task|escalate","reasoning":"brief explanation"}`;
                const startTime = Date.now();
                const response = await fetch(`${OLLAMA_URL}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'deepseek-r1:14b',
                        prompt,
                        stream: false,
                        options: { temperature: 0.1, num_predict: 200 }
                    })
                });
                const ollamaResult = await response.json();
                const inferenceTime = Date.now() - startTime;
                model = 'deepseek-r1:14b';
                // Parse JSON from response
                const jsonMatch = (ollamaResult.response || '').match(/\{[\s\S]*?"classification"[\s\S]*?\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const validClassifications = ['spam', 'marketing', 'fyi', 'needs_response', 'urgent'];
                    const validActions = ['archive', 'read', 'reply', 'create_task', 'escalate'];
                    classification = validClassifications.includes(parsed.classification) ? parsed.classification : 'fyi';
                    confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5;
                    suggestedAction = validActions.includes(parsed.suggested_action) ? parsed.suggested_action : 'read';
                    reasoning = parsed.reasoning || '';
                }
                // Store classification record
                await supabase.from('jeff_email_classifications').insert({
                    email_thread_id: thread?.id || null,
                    classification,
                    confidence,
                    suggested_action: suggestedAction,
                    model,
                    reasoning,
                    inference_time_ms: inferenceTime,
                    input_sender: emailFrom,
                    input_subject: emailSubject,
                    input_snippet: emailSnippet
                });
            }
            catch (llmError) {
                // Fallback on LLM failure
                classification = 'fyi';
                confidence = 0.3;
                suggestedAction = 'read';
                reasoning = `LLM error: ${llmError instanceof Error ? llmError.message : 'Unknown'}`;
                model = 'fallback';
            }
        }
        // Default if nothing matched
        if (!classification) {
            classification = 'fyi';
            confidence = 0.5;
            suggestedAction = 'read';
            reasoning = 'No rule match, LLM disabled';
        }
        // Step 3: Update or create thread with classification
        let resultThread = thread;
        if (thread_id && thread) {
            const { data } = await supabase.from('jeff_email_threads')
                .update({
                classification, classification_confidence: confidence,
                suggested_action: suggestedAction, classified_by: model,
                classified_at: new Date().toISOString(),
                needs_response: ['needs_response', 'urgent'].includes(classification)
            })
                .eq('id', thread_id).select().single();
            resultThread = data;
        }
        else if (gmail_thread_id) {
            const { data } = await supabase.from('jeff_email_threads')
                .upsert({
                gmail_thread_id, account: account || 'personal',
                subject: emailSubject, from_email: emailFrom, from_name: emailName,
                snippet: emailSnippet, classification,
                classification_confidence: confidence,
                suggested_action: suggestedAction, classified_by: model,
                classified_at: new Date().toISOString(),
                needs_response: ['needs_response', 'urgent'].includes(classification),
                status: 'active', last_message_at: new Date().toISOString()
            }, { onConflict: 'gmail_thread_id,account' })
                .select().single();
            resultThread = data;
        }
        return formatResponse({
            action: 'email_classified',
            classification,
            confidence,
            suggested_action: suggestedAction,
            reasoning,
            model,
            thread: resultThread
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_propose_action", "Generate an AI action proposal for a task or email thread. Creates a proposal with optional draft content.", {
    source_type: z.enum(['task', 'email_thread']).describe('Type of entity to propose action for'),
    source_id: z.string().describe('UUID of the task or email thread'),
    action_type: z.enum(['complete_task', 'reply_email', 'followup', 'review', 'create_task', 'escalate']).optional(),
    generate_draft: z.boolean().optional().default(false).describe('Generate a draft email reply using LLM'),
    priority: z.enum(['urgent', 'high', 'medium', 'low']).optional().default('medium')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { source_type, source_id, action_type, generate_draft, priority } = args;
        // Fetch source entity for context
        let sourceContext = {};
        let inferredAction = action_type;
        if (source_type === 'email_thread') {
            const { data: thread } = await supabase.from('jeff_email_threads')
                .select('*').eq('id', source_id).single();
            if (!thread)
                return formatResponse('Email thread not found', true);
            sourceContext = thread;
            if (!inferredAction) {
                inferredAction = thread.needs_response ? 'reply_email' : 'review';
            }
        }
        else {
            const { data: task } = await supabase.from('jeff_tasks')
                .select('*').eq('id', source_id).single();
            if (!task)
                return formatResponse('Task not found', true);
            sourceContext = task;
            if (!inferredAction) {
                inferredAction = task.status === 'in_progress' ? 'complete_task' : 'review';
            }
        }
        // Generate draft if requested and source is email
        let draftContent = null;
        if (generate_draft && source_type === 'email_thread' && sourceContext) {
            try {
                const prompt = `Draft a brief, professional email reply.

Original email:
From: ${sourceContext.from_name || ''} <${sourceContext.from_email || ''}>
Subject: ${sourceContext.subject || ''}
Body: ${sourceContext.snippet || sourceContext.ai_summary || ''}

Write ONLY the reply body (no subject, no greeting, no signature - those are added automatically). Keep it concise (2-4 sentences). Be professional but not overly formal. Jeff's tone is direct and friendly.`;
                const response = await fetch(`${OLLAMA_URL}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'deepseek-r1:32b',
                        prompt,
                        stream: false,
                        options: { temperature: 0.7, num_predict: 300 }
                    })
                });
                const result = await response.json();
                if (result.response) {
                    draftContent = {
                        subject: `Re: ${sourceContext.subject || ''}`,
                        body: result.response.trim(),
                        tone: 'professional'
                    };
                }
            }
            catch (draftError) {
                // Draft generation failed, continue without draft
                draftContent = null;
            }
        }
        // Create proposal
        const { data: proposal, error } = await supabase.from('jeff_action_proposals')
            .insert({
            source_type,
            source_id,
            action_type: inferredAction,
            priority,
            draft_content: draftContent,
            confidence: draftContent ? 0.7 : 0.5,
            model_used: generate_draft ? 'deepseek-r1:32b' : 'manual',
            reasoning: `Proposed ${inferredAction} for ${source_type} based on current state`
        })
            .select().single();
        if (error) {
            return formatResponse(`Proposal creation error: ${error.message}`, true);
        }
        // Also store draft in jeff_draft_responses if email
        if (draftContent && source_type === 'email_thread') {
            await supabase.from('jeff_draft_responses').insert({
                email_thread_id: source_id,
                proposal_id: proposal.id,
                subject: draftContent.subject,
                body: draftContent.body,
                tone: draftContent.tone
            });
        }
        return formatResponse({
            action: 'proposal_created',
            proposal,
            draft: draftContent,
            source: {
                type: source_type,
                subject: sourceContext.subject || sourceContext.title,
                from: sourceContext.from_email
            }
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_execute_action", "Execute an action proposal: accept, dismiss, snooze, or modify. For email replies, returns send instructions for unified-comms.", {
    proposal_id: z.string().describe('Action proposal UUID'),
    action: z.enum(['accept', 'dismiss', 'snooze', 'modify']).describe('What to do with the proposal'),
    snooze_hours: z.number().optional().default(4).describe('Hours to snooze (if action=snooze)'),
    modifications: z.record(z.any()).optional().describe('Modified draft content (if action=modify)')
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { proposal_id, action, snooze_hours, modifications } = args;
        // Get proposal
        const { data: proposal, error: fetchError } = await supabase.from('jeff_action_proposals')
            .select('*').eq('id', proposal_id).single();
        if (fetchError || !proposal) {
            return formatResponse(`Proposal not found: ${fetchError?.message}`, true);
        }
        if (action === 'dismiss') {
            await supabase.rpc('record_action_taken', {
                p_proposal_id: proposal_id,
                p_action_type: 'dismissed',
                p_was_accepted: false
            });
            return formatResponse({ action: 'proposal_dismissed', proposal_id });
        }
        if (action === 'snooze') {
            await supabase.rpc('snooze_proposal', {
                p_proposal_id: proposal_id,
                p_snooze_hours: snooze_hours
            });
            return formatResponse({
                action: 'proposal_snoozed',
                proposal_id,
                snoozed_until: new Date(Date.now() + snooze_hours * 3600000).toISOString()
            });
        }
        if (action === 'modify' && modifications) {
            // Update draft content
            const updatedDraft = { ...proposal.draft_content, ...modifications };
            await supabase.from('jeff_action_proposals')
                .update({ draft_content: updatedDraft })
                .eq('id', proposal_id);
            // Update draft response if exists
            if (proposal.source_type === 'email_thread') {
                await supabase.from('jeff_draft_responses')
                    .update({
                    body: modifications.body || updatedDraft.body,
                    subject: modifications.subject || updatedDraft.subject,
                    is_edited: true,
                    edit_count: 1
                })
                    .eq('proposal_id', proposal_id);
            }
            return formatResponse({
                action: 'proposal_modified',
                proposal_id,
                updated_draft: updatedDraft
            });
        }
        if (action === 'accept') {
            // Record acceptance
            await supabase.rpc('record_action_taken', {
                p_proposal_id: proposal_id,
                p_action_type: proposal.action_type,
                p_was_accepted: true
            });
            // Handle based on action type
            if (proposal.action_type === 'reply_email' && proposal.source_type === 'email_thread') {
                // Get thread for send instructions
                const { data: thread } = await supabase.from('jeff_email_threads')
                    .select('*').eq('id', proposal.source_id).single();
                if (thread) {
                    // Update thread status
                    await supabase.from('jeff_email_threads')
                        .update({ needs_response: false, status: 'waiting' })
                        .eq('id', proposal.source_id);
                    return formatResponse({
                        action: 'proposal_accepted',
                        proposal_id,
                        nextStep: 'send_email',
                        sendInstructions: {
                            tool: 'mcp__unified-comms__message_reply',
                            params: {
                                messageId: thread.gmail_thread_id,
                                body: proposal.draft_content?.body,
                                account: thread.account
                            }
                        },
                        draft: proposal.draft_content,
                        thread: { id: thread.id, subject: thread.subject, account: thread.account }
                    });
                }
            }
            if (proposal.action_type === 'complete_task' && proposal.source_type === 'task') {
                await supabase.from('jeff_tasks')
                    .update({ status: 'completed', completed_at: new Date().toISOString() })
                    .eq('id', proposal.source_id);
                return formatResponse({
                    action: 'proposal_accepted',
                    proposal_id,
                    taskCompleted: true,
                    source_id: proposal.source_id
                });
            }
            // Generic acceptance
            return formatResponse({
                action: 'proposal_accepted',
                proposal_id,
                action_type: proposal.action_type
            });
        }
        return formatResponse('Invalid action', true);
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("jeff_get_email_context", "Get full context for an email thread: thread data, sender history, related tasks, associations, and classification analytics.", {
    thread_id: z.string().describe('Jeff email thread UUID'),
    include_sender_history: z.boolean().optional().default(true),
    include_classifications: z.boolean().optional().default(false)
}, async (args) => {
    if (!supabase) {
        return formatResponse('Supabase not configured', true);
    }
    try {
        const { thread_id, include_sender_history, include_classifications } = args;
        // Get thread
        const { data: thread, error } = await supabase.from('jeff_email_threads')
            .select('*').eq('id', thread_id).single();
        if (error || !thread) {
            return formatResponse(`Thread not found: ${error?.message}`, true);
        }
        const result = { thread };
        // Get related tasks
        const { data: tasks } = await supabase.from('jeff_tasks')
            .select('id, title, status, priority, due_date')
            .eq('source_id', thread.gmail_thread_id);
        result.relatedTasks = tasks || [];
        // Get associations
        const { data: associations } = await supabase.from('jeff_associations')
            .select('*')
            .or(`entity_id.eq.${thread.id},related_id.eq.${thread.id}`);
        result.associations = associations || [];
        // Get active proposals for this thread
        const { data: proposals } = await supabase.from('jeff_action_proposals')
            .select('*')
            .eq('source_type', 'email_thread')
            .eq('source_id', thread.id)
            .eq('is_dismissed', false)
            .gt('expires_at', new Date().toISOString());
        result.activeProposals = proposals || [];
        // Get draft responses
        const { data: drafts } = await supabase.from('jeff_draft_responses')
            .select('*')
            .eq('email_thread_id', thread.id)
            .eq('is_sent', false);
        result.pendingDrafts = drafts || [];
        // Sender history
        if (include_sender_history && thread.from_email) {
            const { data: contact } = await supabase.from('jeff_contacts')
                .select('*').eq('email', thread.from_email).single();
            result.senderContact = contact || null;
            // Count threads from this sender
            const { count } = await supabase.from('jeff_email_threads')
                .select('id', { count: 'exact', head: true })
                .eq('from_email', thread.from_email);
            result.senderThreadCount = count || 0;
            // Check VIP status
            const { data: vip } = await supabase.from('jeff_vip_senders')
                .select('*')
                .eq('is_active', true);
            const isVip = (vip || []).some((v) => thread.from_email && thread.from_email.toLowerCase().includes(v.pattern?.toLowerCase() || ''));
            result.isVipSender = isVip;
        }
        // Classification history
        if (include_classifications) {
            const { data: classifications } = await supabase.from('jeff_email_classifications')
                .select('*')
                .eq('email_thread_id', thread.id)
                .order('created_at', { ascending: false })
                .limit(5);
            result.classificationHistory = classifications || [];
        }
        return formatResponse({
            action: 'email_context_retrieved',
            ...result
        });
    }
    catch (error) {
        return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
// Update jeff_info to include new tools
server.tool("jeff_info", "Get information about Jeff Agent status and configuration", {}, async () => {
    return formatResponse({
        name: 'jeff-agent',
        version: '3.0.0',
        description: 'Personal assistant for email management, task tracking, project oversight, family calendar, wellbeing, habits, and AI-powered email classification with action proposals',
        configured: !!supabase,
        supabaseUrl: SUPABASE_URL,
        projectDomains: PROJECT_DOMAINS,
        projectKeywords: PROJECT_KEYWORDS,
        familyCalendars: FAMILY_CALENDARS,
        tables: [
            'jeff_tasks - Task tracking',
            'jeff_email_threads - Email thread tracking with AI summaries',
            'jeff_email_rules - Auto-triage rules',
            'jeff_associations - Entity relationships',
            'jeff_contacts - Contact directory',
            'jeff_family_members - Family member tracking',
            'jeff_recurring_items - Birthdays, renewals, etc.',
            'jeff_wellbeing_logs - PERMA wellbeing tracking',
            'jeff_habits - Habit tracking with streaks',
            'jeff_habit_logs - Daily habit completions',
            'jeff_calendar_cache - Calendar event cache',
            'jeff_project_activity - Project momentum tracking',
            'jeff_email_classifications - LLM classification results & feedback',
            'jeff_action_proposals - AI-generated action suggestions',
            'jeff_draft_responses - Email draft storage with editing',
            'jeff_email_templates - Reusable email response templates'
        ],
        ollamaEndpoint: OLLAMA_URL,
        tools: {
            // Tasks
            tasks: [
                'jeff_create_task', 'jeff_list_tasks', 'jeff_update_task', 'jeff_complete_task'
            ],
            // Email
            email: [
                'jeff_triage_inbox', 'jeff_track_email_thread', 'jeff_get_thread', 'jeff_draft_response',
                'jeff_add_email_rule', 'jeff_list_email_rules', 'jeff_apply_email_rules', 'jeff_delete_email_rule',
                'jeff_summarize_thread', 'jeff_classify_email', 'jeff_get_email_context'
            ],
            // Action Proposals
            proposals: [
                'jeff_propose_action', 'jeff_execute_action'
            ],
            // Calendar
            calendar: [
                'jeff_detect_conflicts', 'jeff_analyze_conflicts'
            ],
            // Habits & Wellbeing
            wellbeing: [
                'jeff_checkin', 'jeff_wellbeing_summary', 'jeff_perma_trends',
                'jeff_add_habit', 'jeff_log_habit', 'jeff_habit_status', 'jeff_habits_at_risk'
            ],
            // Family & Recurring
            family: [
                'jeff_add_family_member', 'jeff_list_family', 'jeff_add_recurring',
                'jeff_list_upcoming', 'jeff_upcoming_with_actions'
            ],
            // Project
            project: [
                'jeff_project_status', 'jeff_project_context', 'jeff_log_project_activity'
            ],
            // Digest & Quick
            digest: [
                'jeff_daily_digest', 'jeff_personal_digest', 'jeff_generate_digest_payload',
                'jeff_today', 'jeff_week', 'jeff_quick'
            ],
            // Other
            other: [
                'jeff_associate', 'jeff_upsert_contact', 'jeff_info'
            ]
        },
        modelHints: {
            haiku: [
                'jeff_log_habit', 'jeff_habit_status', 'jeff_quick', 'jeff_list_tasks',
                'jeff_list_email_rules', 'jeff_list_family', 'jeff_list_upcoming',
                'jeff_execute_action'
            ],
            sonnet: [
                'jeff_perma_trends', 'jeff_analyze_conflicts', 'jeff_summarize_thread',
                'jeff_draft_response', 'jeff_project_context', 'jeff_generate_digest_payload',
                'jeff_classify_email', 'jeff_propose_action', 'jeff_get_email_context'
            ]
        }
    });
});
// Start the server
async function startServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
startServer().catch(console.error);
//# sourceMappingURL=index.js.map