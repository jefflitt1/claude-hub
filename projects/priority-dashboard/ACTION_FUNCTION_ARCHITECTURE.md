# JGL Priority Dashboard - Action Function Architecture

## Overview

The Action Function system proposes intelligent next steps for tasks and emails, including auto-generated draft responses. It follows patterns from Superhuman (auto-reminders, draft suggestions), Linear (AI triage), and Notion AI (context-aware suggestions).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      JGL Priority Dashboard                          │
├─────────────────────────────────────────────────────────────────────┤
│  ProposedActionsPanel                                                │
│  ├── Overdue Tasks      → "Complete" / "Reschedule" / "Delegate"    │
│  ├── Pending Emails     → "Draft Reply" / "Create Task" / "Snooze"  │
│  ├── Stale Tasks        → "Update Status" / "Close" / "Reassign"    │
│  └── AI Suggestions     → Context-aware next steps                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Action Function API                              │
├─────────────────────────────────────────────────────────────────────┤
│  POST /api/actions/propose                                           │
│  ├── Input: { type, source_id, context }                            │
│  ├── Output: { actions[], draft_content?, priority, reasoning }     │
│  └── Caching: Redis/localStorage for repeated items                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   AI Generation Layer                                │
├─────────────────────────────────────────────────────────────────────┤
│  Production: n8n webhook → Claude API                                │
│  Future: Local LLM (Ollama + DeepSeek R1)                           │
│  ├── deepseek-r1:14b (fast, 10GB RAM)                               │
│  ├── deepseek-r1:32b (better reasoning, 20GB RAM)                   │
│  └── Fallback: Claude API when local unavailable                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Action Types

### 1. Task Actions

| Action | Trigger | Proposed Steps |
|--------|---------|----------------|
| `complete_task` | Overdue or near deadline | "Mark complete", "Update progress", "Extend deadline" |
| `followup` | Stale in_progress (>3 days) | "Add update note", "Move to blocked", "Close as done" |
| `review` | Due within 48h | "Start working", "Delegate", "Reschedule" |
| `delegate` | High priority + assignable | "Assign to...", "Create subtask" |

### 2. Email Actions

| Action | Trigger | Proposed Steps |
|--------|---------|----------------|
| `reply_email` | needs_response=true | "Draft reply", "Create follow-up task", "Archive" |
| `followup_sent` | Sent email, no reply >3 days | "Send follow-up", "Call instead", "Mark resolved" |
| `vip_response` | is_vip_sender=true | "Priority draft", "Escalate", "Schedule call" |

### 3. AI-Generated Drafts

For email actions, the system generates contextual draft responses:

```typescript
interface DraftProposal {
  type: 'email_reply' | 'followup' | 'introduction';
  subject: string;
  body: string;
  tone: 'professional' | 'friendly' | 'brief';
  confidence: number; // 0-1
  editSuggestions?: string[];
}
```

## Database Schema

### `jeff_action_proposals` Table

```sql
CREATE TABLE jeff_action_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL, -- 'task', 'email_thread'
    source_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',

    -- AI-generated content
    proposed_actions JSONB DEFAULT '[]',
    draft_content JSONB, -- For email drafts
    reasoning TEXT,
    confidence FLOAT,

    -- User interaction
    is_accepted BOOLEAN,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    accepted_action TEXT, -- Which action was taken

    -- Metadata
    model_used TEXT, -- 'claude-3.5-sonnet', 'deepseek-r1', etc.
    generation_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours'
);

CREATE INDEX idx_action_proposals_active
ON jeff_action_proposals(source_type, source_id)
WHERE is_dismissed = false AND expires_at > now();
```

### `jeff_draft_responses` Table

```sql
CREATE TABLE jeff_draft_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_thread_id UUID REFERENCES jeff_email_threads(id),
    proposal_id UUID REFERENCES jeff_action_proposals(id),

    -- Draft content
    subject TEXT,
    body TEXT,
    tone TEXT DEFAULT 'professional',

    -- Editing state
    is_edited BOOLEAN DEFAULT false,
    edited_body TEXT,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Implementation Phases

### Phase 1: Rule-Based Actions (Current)
- Overdue tasks → suggest completion
- Pending emails → suggest reply + create task
- Stale tasks → suggest status update
- No AI generation, just action suggestions

### Phase 2: Template-Based Drafts
- Email reply templates based on:
  - Sender category (VIP, vendor, personal)
  - Email type (question, request, FYI)
  - Historical patterns
- Stored in `jeff_email_templates` table

### Phase 3: AI-Generated Drafts (n8n + Claude)
- n8n webhook receives email context
- Claude generates contextual draft
- Draft stored in `jeff_draft_responses`
- User reviews/edits before sending

### Phase 4: Local LLM Integration
- Ollama running on Mac Studio (32GB)
- DeepSeek R1 for reasoning-heavy tasks
- Fallback chain: Local → n8n/Claude → Templates
- Latency target: <2s for suggestions, <5s for drafts

## API Endpoints

### `POST /api/actions/propose`

Request:
```json
{
  "source_type": "email_thread",
  "source_id": "uuid-here",
  "context": {
    "subject": "Re: Q1 Report Review",
    "from_email": "boss@company.com",
    "snippet": "Can you review this by Friday?",
    "is_vip": true,
    "thread_length": 3
  },
  "generate_draft": true
}
```

Response:
```json
{
  "proposal_id": "uuid",
  "actions": [
    {
      "type": "reply_email",
      "label": "Draft Reply",
      "priority": "high",
      "icon": "mail-reply"
    },
    {
      "type": "create_task",
      "label": "Create Review Task",
      "priority": "medium",
      "icon": "check-square"
    }
  ],
  "draft": {
    "subject": "Re: Q1 Report Review",
    "body": "Hi [Name],\n\nI'll have the Q1 report review completed by Friday. I'll send over my notes by EOD Thursday so you have time to review before the deadline.\n\nBest,\nJeff",
    "tone": "professional",
    "confidence": 0.85
  },
  "reasoning": "VIP sender requesting review with deadline. Suggested immediate acknowledgment."
}
```

### `POST /api/actions/execute`

Request:
```json
{
  "proposal_id": "uuid",
  "action_type": "reply_email",
  "modifications": {
    "body": "Custom edited response..."
  }
}
```

## Frontend Integration

### ProposedActionsPanel Enhancement

```tsx
// Enhanced ProposedActionsPanel with AI drafts
function ProposedActionsPanel() {
  const { data: proposals } = useActionProposals();

  return (
    <div>
      {proposals.map(proposal => (
        <ActionCard
          key={proposal.id}
          proposal={proposal}
          onAccept={(action) => executeAction(proposal.id, action)}
          onDismiss={() => dismissProposal(proposal.id)}
        />
      ))}
    </div>
  );
}

// Action card with draft preview
function ActionCard({ proposal, onAccept, onDismiss }) {
  const [showDraft, setShowDraft] = useState(false);

  return (
    <Card>
      <CardHeader>
        <Badge variant={proposal.priority}>{proposal.priority}</Badge>
        <span>{proposal.title}</span>
      </CardHeader>

      {proposal.draft && (
        <Collapsible open={showDraft}>
          <DraftPreview
            draft={proposal.draft}
            onEdit={(edited) => updateDraft(proposal.id, edited)}
            onSend={() => sendDraft(proposal.id)}
          />
        </Collapsible>
      )}

      <CardFooter>
        {proposal.actions.map(action => (
          <Button
            key={action.type}
            onClick={() => onAccept(action.type)}
          >
            {action.label}
          </Button>
        ))}
        <Button variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  );
}
```

## Local LLM Setup (Future)

### Ollama Configuration

```bash
# Install Ollama
brew install ollama

# Pull DeepSeek models
ollama pull deepseek-r1:14b  # Fast, fits easily
ollama pull deepseek-r1:32b  # Better reasoning

# Start server
ollama serve
```

### Integration Code

```typescript
// lib/ai/local-llm.ts
const OLLAMA_URL = 'http://localhost:11434';

async function generateWithLocal(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    body: JSON.stringify({
      model: 'deepseek-r1:14b',
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 500,
      }
    })
  });

  const data = await response.json();
  return data.response;
}

// Fallback chain
async function generateAction(context: ActionContext): Promise<ActionProposal> {
  try {
    // Try local first
    return await generateWithLocal(buildPrompt(context));
  } catch (e) {
    // Fallback to n8n/Claude
    return await generateWithCloud(context);
  }
}
```

## Metrics & Learning

Track action acceptance rates to improve suggestions:

```sql
-- Action effectiveness query
SELECT
  action_type,
  COUNT(*) as total_proposed,
  COUNT(*) FILTER (WHERE is_accepted) as accepted,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_accepted) / COUNT(*), 1) as acceptance_rate
FROM jeff_action_proposals
WHERE created_at > now() - interval '30 days'
GROUP BY action_type
ORDER BY acceptance_rate DESC;
```

## Security Considerations

1. **Draft Storage**: Drafts stored encrypted at rest
2. **Email Access**: Read-only until user explicitly sends
3. **Local LLM**: Sensitive data stays on-device
4. **Audit Log**: All actions logged with user attribution

## Next Steps

1. [ ] Create `jeff_action_proposals` table
2. [ ] Create `jeff_draft_responses` table
3. [ ] Implement `get_action_proposals()` SQL function
4. [ ] Add draft preview UI to ProposedActionsPanel
5. [ ] Create n8n workflow for draft generation
6. [ ] Set up Ollama with DeepSeek R1
7. [ ] Implement fallback chain (local → cloud)
