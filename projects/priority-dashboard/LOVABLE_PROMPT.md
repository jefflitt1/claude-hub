# Lovable Prompt: Personal Priority Dashboard

## Project Overview

Build a personal task and email management dashboard that combines:
- Kanban board with drag-and-drop
- Priority scoring (auto + manual)
- Email thread linking from two Gmail accounts
- Cross-account task visibility
- **Proposed action items** - AI-suggested next steps based on tasks and emails

## Account Context

Two Gmail accounts to integrate:
- **Personal:** jglittell@gmail.com (Google Tasks synced here - 18 lists, 470+ tasks)
- **L7/Work:** jeff@l7-partners.com (business emails, L7 Partners tasks)

## Tech Stack Requirements

- React 18+ with TypeScript
- Tailwind CSS with shadcn/ui components
- Supabase client for backend connection
- @dnd-kit/core for drag-and-drop
- Real-time subscriptions via Supabase

## Supabase Connection

Already have an existing Supabase project. Connect to these tables:
- `jeff_tasks` - Main task data
- `jeff_email_threads` - Email thread context
- `jeff_kanban_columns` - Column configuration
- `jeff_priority_scores` - Priority breakdown

Use environment variables:
```
VITE_SUPABASE_URL=https://jzgxswemtbzodvvqoyxn.supabase.co
VITE_SUPABASE_ANON_KEY=[provided separately]
```

## Main Views

### 1. Kanban Board (Default View)

Layout:
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Filter: Account ▼] [Priority ▼] [Due Date ▼] [+ New Task]  🔍     │
├─────────────────────────────────────────────────────────────────────┤
│ Inbox (5)    │ Ready (3)    │ In Progress │ Review (1) │ Done (12) │
│              │              │ 2/3 ⚠️       │            │           │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │            │           │
│ │🟡5 Task 1│ │ │🟠7 Task 4│ │ │🔴9 Task 7│ │            │           │
│ │L7 • 3d   │ │ │Personal  │ │ │Due today │ │            │           │
│ │📧        │ │ └──────────┘ │ │📧        │ │            │           │
│ └──────────┘ │              │ └──────────┘ │            │           │
│ ┌──────────┐ │              │ ┌──────────┐ │            │           │
│ │🔵3 Task 2│ │              │ │🟠6 Task 8│ │            │           │
│ │JGL       │ │              │ │L7 • 1d   │ │            │           │
│ └──────────┘ │              │ └──────────┘ │            │           │
└─────────────────────────────────────────────────────────────────────┘
```

Features:
- Drag and drop tasks between columns
- WIP limit warning on In Progress (shows ⚠️ when at limit)
- Real-time updates via Supabase subscriptions
- Click task to open detail sidebar

### 2. Task Card Component

```typescript
interface TaskCard {
  id: string;
  title: string;
  priority_score: number; // 1-10
  project_id: string | null; // 'l7-partners', 'jgl-capital', 'personal'
  account: 'personal' | 'l7' | 'jgl';
  due_date: string | null;
  has_email: boolean; // Show 📧 icon
  tags: string[];
}
```

Design:
- Priority badge: colored circle with number
  - 🔴 Red: 8-10 (critical)
  - 🟠 Orange: 6-7 (high)
  - 🟡 Yellow: 4-5 (normal)
  - 🔵 Blue: 1-3 (low)
- Project name in muted text
- Due date with urgency styling (red if overdue, orange if due today)
- 📧 icon if email_thread_id is not null
- Hover: slight scale up, shadow increase

### 3. Task Detail Sidebar

When clicking a task, slide in a right sidebar (400px width):

```
┌────────────────────────────────────────┐
│ ← Back                      [🗑️] [✓]  │
├────────────────────────────────────────┤
│ Priority: [🔴 9 ▼]                     │
│ ┌────────────────────────────────────┐ │
│ │ Deadline factor:     8/10          │ │
│ │ Sender weight:       9/10 (VIP)    │ │
│ │ Urgency keywords:    6/10          │ │
│ │ Thread activity:     4/10          │ │
│ │ ─────────────────────────────      │ │
│ │ Auto score: 7.2                    │ │
│ │ Manual override: 9 ✏️               │ │
│ └────────────────────────────────────┘ │
├────────────────────────────────────────┤
│ Title:                                 │
│ [Fix tenant lease renewal issue      ] │
├────────────────────────────────────────┤
│ Description:                           │
│ [                                    ] │
│ [Multi-line text area                ] │
│ [                                    ] │
├────────────────────────────────────────┤
│ 📧 Linked Email Thread                 │
│ ┌────────────────────────────────────┐ │
│ │ Subject: RE: Lease renewal 2026    │ │
│ │ From: maria@tenant.com             │ │
│ │ Snippet: "I'd like to discuss..."  │ │
│ │ [Open in Gmail →]                  │ │
│ └────────────────────────────────────┘ │
├────────────────────────────────────────┤
│ Due Date: [Jan 25, 2026        📅]    │
│ Column:   [In Progress ▼]              │
│ Project:  [L7 Partners ▼]              │
│ Account:  [L7 ▼]                       │
│ Tags:     [urgent] [lease] [+]         │
├────────────────────────────────────────┤
│ [Mark Complete]                        │
└────────────────────────────────────────┘
```

### 4. Filters Bar

Top of page, sticky:
```
[All Accounts ▼] [All Priorities ▼] [All Dates ▼] [All Projects ▼] [☐ Show Completed]
```

Filter options:
- Account: All, Personal (jglittell@gmail.com), L7 (jeff@l7-partners.com), JGL
- Priority: All, High (8-10), Medium (5-7), Low (1-4)
- Due Date: All, Overdue, Today, This Week, This Month, No Date
- Project: All, L7 Partners, JGL Capital, Claude Hub, Personal

### 5. Quick Add Modal

Triggered by `+` button or `Cmd+K`:
```
┌────────────────────────────────────────┐
│ Quick Add Task                         │
├────────────────────────────────────────┤
│ Title: [                             ] │
│ Priority: [5 ▼]  Due: [None 📅]        │
│ Project: [Select... ▼]                 │
│ Account: [Personal ▼]                  │
│ Link Email: [Search email threads...▼] │
├────────────────────────────────────────┤
│               [Cancel]  [Create Task]  │
└────────────────────────────────────────┘
```

## Database Queries

### Fetch tasks for kanban:
```typescript
const { data: tasks } = await supabase
  .from('jeff_dashboard_tasks')
  .select('*')
  .order('kanban_position', { ascending: true });
```

### Move task to column:
```typescript
await supabase
  .from('jeff_tasks')
  .update({
    kanban_column: newColumn,
    kanban_position: newPosition,
    status: columnToStatus[newColumn]
  })
  .eq('id', taskId);
```

### Real-time subscription:
```typescript
supabase
  .channel('tasks')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'jeff_tasks'
  }, handleChange)
  .subscribe();
```

## Color Scheme

Use dark theme matching existing dashboard:
```css
:root {
  --background: 222.2 84% 4.9%;      /* slate-950 */
  --card: 222.2 84% 6.9%;            /* slate-900 */
  --card-hover: 215.3 25% 15.3%;     /* slate-800 */
  --primary: 217.2 91.2% 59.8%;      /* blue-500 */
  --destructive: 0 84.2% 60.2%;      /* red-500 */
  --warning: 38 92% 50%;             /* orange-500 */
  --success: 142.1 76.2% 36.3%;      /* green-500 */
  --muted: 215.3 25% 26.7%;          /* slate-700 */
}
```

## Component Library

Use these shadcn/ui components:
- Card, CardHeader, CardContent
- Button
- Select, SelectTrigger, SelectContent, SelectItem
- Badge
- Dialog, DialogTrigger, DialogContent
- Popover, PopoverTrigger, PopoverContent
- Calendar (for date picker)
- Textarea
- Separator
- ScrollArea
- Sheet, SheetTrigger, SheetContent (for sidebar)
- Tooltip

## File Structure

```
src/
├── components/
│   ├── kanban/
│   │   ├── KanbanBoard.tsx
│   │   ├── KanbanColumn.tsx
│   │   ├── TaskCard.tsx
│   │   └── TaskDetailSidebar.tsx
│   ├── filters/
│   │   ├── FiltersBar.tsx
│   │   └── FilterDropdown.tsx
│   ├── modals/
│   │   └── QuickAddModal.tsx
│   └── ui/ (shadcn components)
├── hooks/
│   ├── useTasks.ts
│   ├── useKanbanDnd.ts
│   └── useRealtimeSubscription.ts
├── lib/
│   ├── supabase.ts
│   └── utils.ts
├── types/
│   └── index.ts
└── App.tsx
```

## Priority Scoring Display

Show priority as a colored badge:
```tsx
function PriorityBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? 'bg-red-500' :
    score >= 6 ? 'bg-orange-500' :
    score >= 4 ? 'bg-yellow-500' :
    'bg-blue-500';

  return (
    <span className={`${color} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
      {score}
    </span>
  );
}
```

## Email Thread Preview

When a task has `email_thread_id`, show:
- Subject line
- Sender name/email
- Snippet (first 100 chars)
- "Open in Gmail" button linking to:
  `https://mail.google.com/mail/u/0/#inbox/{gmail_thread_id}`

## Responsive Behavior

- Desktop (>1024px): Full kanban with fixed sidebar
- Tablet (768-1024px): Kanban with slide-out sidebar
- Mobile (<768px): List view with swipe actions

## Initial Data Load

On mount:
1. Fetch kanban columns from `jeff_kanban_columns`
2. Fetch tasks from `jeff_dashboard_tasks` view
3. Set up real-time subscription
4. Group tasks by `kanban_column`

### 6. Proposed Action Items Panel

A collapsible right sidebar or top section showing AI-suggested next actions:

```
┌────────────────────────────────────────────────────────────────┐
│ 💡 Proposed Actions                              [Refresh] [×] │
├────────────────────────────────────────────────────────────────┤
│ ⚡ HIGH PRIORITY                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 📧 Reply to Maria about lease renewal                      │ │
│ │    Thread waiting 3 days • VIP sender • Due: Today         │ │
│ │    [Create Task] [Open Email] [Snooze]                     │ │
│ └────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ✅ Complete "PSEG incentives" task                         │ │
│ │    In Progress for 5 days • L7 Partners                    │ │
│ │    [Mark Done] [View Task] [Reschedule]                    │ │
│ └────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│ 📋 SUGGESTED                                                   │
│ • Schedule follow-up: Greenwich Hematology (from Tomorrow)     │
│ • Review 3 unread emails from @l7-partners.com                 │
│ • 2 tasks overdue in "Home" list                               │
└────────────────────────────────────────────────────────────────┘
```

**Action Item Sources:**
1. **Email threads needing response** - Threads marked `needs_response=true` or waiting >48hrs
2. **Overdue tasks** - Past due date
3. **Stale in-progress** - Tasks in "In Progress" >3 days without update
4. **VIP email alerts** - Emails from VIP senders without tasks linked
5. **Upcoming deadlines** - Tasks due within 24-48 hours

**Data model addition:**
```typescript
interface ProposedAction {
  id: string;
  type: 'reply_email' | 'complete_task' | 'create_task' | 'followup' | 'review';
  priority: 'high' | 'medium' | 'low';
  title: string;
  reason: string; // "Thread waiting 3 days", "VIP sender", etc.
  source_type: 'task' | 'email_thread';
  source_id: string;
  suggested_actions: ('create_task' | 'open_email' | 'mark_done' | 'snooze' | 'view')[];
  created_at: string;
}
```

**Query for proposed actions:**
```typescript
// Fetch action items from a Supabase function or computed client-side
const { data: actions } = await supabase
  .rpc('get_proposed_actions', { limit: 10 });
```

## Google Tasks Integration

The user has 18 Google Tasks lists to sync (~629 total tasks):
| List | Tasks | Category |
|------|-------|----------|
| My Tasks | 179 | Inbox/General |
| Magic | 179 | Knowledge Base |
| Psychology | 66 | Learning |
| L7 PARTNERS | 38 | Work |
| Names | 36 | Reference |
| N8N | 29 | Tech/Automation |
| Home | 27 | Personal |
| Costco | 15 | Shopping |
| M&M Posts | 13 | Content |
| Others | 47 | Various (7 lists) |

Tasks sync via `jeff_google_tasks_sync` table linking `google_task_id` to `jeff_tasks.id`.

## Success Criteria

1. Can view all tasks in kanban format
2. Can drag tasks between columns with persistence
3. Can filter by account, priority, due date, project
4. Can view task details with email context
5. Can create new tasks with priority and email linking
6. Updates appear in real-time across tabs
7. Dark theme matches existing dashboard aesthetic
8. **Proposed action items** surface high-priority next steps
9. **Google Tasks** sync status visible on task cards
