---
name: n8n
description: Manage n8n workflows, executions, credentials on the self-hosted instance at n8n.l7-partners.com. Use when user mentions n8n, workflows, webhooks, or automation tasks.
allowed-tools: Bash, Read, Write
---

# n8n Workflow Agent Skill

Manage n8n workflows, executions, credentials, and system settings on the self-hosted n8n instance at `n8n.l7-partners.com`.

## Step 0: Log Skill Invocation

When this skill is invoked, log usage:

```bash
docker mcp tools call insert_row 'table=claude_skill_usage' 'data={
  "skill_id": "n8n",
  "command": "/n8n",
  "machine": "mac",
  "project_context": "PROJECT_ID",
  "success": true
}'
```

## Configuration

- **Base URL**: `https://n8n.l7-partners.com`
- **API Key**: Read from `N8N_API_KEY` environment variable
- **Authentication**: Bearer token via X-N8N-API-KEY header
- **Protection**: Cloudflare Access (API key bypasses for programmatic access)

## API Authentication

All API requests must include the API key header:

```bash
curl -H "X-N8N-API-KEY: $N8N_API_KEY" https://n8n.l7-partners.com/api/v1/...
```

## Available Operations

### Workflows

#### List all workflows
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/workflows" | jq
```

#### Get workflow by ID
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/workflows/{id}" | jq
```

#### Create a new workflow
```bash
curl -s -X POST -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Workflow Name",
    "nodes": [...],
    "connections": {...},
    "settings": {}
  }' \
  "https://n8n.l7-partners.com/api/v1/workflows" | jq
```

#### Update a workflow
```bash
curl -s -X PUT -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...workflow JSON...}' \
  "https://n8n.l7-partners.com/api/v1/workflows/{id}" | jq
```

#### Delete a workflow
```bash
curl -s -X DELETE -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/workflows/{id}" | jq
```

#### Activate a workflow
```bash
curl -s -X POST -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/workflows/{id}/activate" | jq
```

#### Deactivate a workflow
```bash
curl -s -X POST -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/workflows/{id}/deactivate" | jq
```

### Executions

#### List executions
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/executions" | jq
```

#### List executions for specific workflow
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/executions?workflowId={id}" | jq
```

#### Get execution details
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/executions/{id}" | jq
```

#### Delete an execution
```bash
curl -s -X DELETE -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/executions/{id}" | jq
```

#### Execute a workflow manually
```bash
curl -s -X POST -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"workflowId": "{id}"}' \
  "https://n8n.l7-partners.com/api/v1/executions" | jq
```

#### Execute workflow with input data
```bash
curl -s -X POST -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "{id}",
    "data": {
      "key": "value"
    }
  }' \
  "https://n8n.l7-partners.com/api/v1/executions" | jq
```

### Credentials

#### List all credentials
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/credentials" | jq
```

#### Get credential schema (available credential types)
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/credentials/schema/{credentialTypeName}" | jq
```

#### Create a credential
```bash
curl -s -X POST -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Credential Name",
    "type": "credentialType",
    "data": {...}
  }' \
  "https://n8n.l7-partners.com/api/v1/credentials" | jq
```

#### Delete a credential
```bash
curl -s -X DELETE -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/credentials/{id}" | jq
```

### Webhooks

Webhooks are created automatically when a workflow with a Webhook node is activated. To manage webhooks:

1. **List active webhooks**: Check which workflows have active webhook triggers
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/workflows?active=true" | jq '.data[] | select(.nodes[]?.type == "n8n-nodes-base.webhook")'
```

2. **Get webhook URL for a workflow**: The webhook URL format is:
   - Production: `https://n8n.l7-partners.com/webhook/{path}`
   - Test: `https://n8n.l7-partners.com/webhook-test/{path}`

3. **Trigger a webhook**:
```bash
curl -s -X POST "https://n8n.l7-partners.com/webhook/{path}" \
  -H "Content-Type: application/json" \
  -d '{"data": "your payload"}'
```

### Users (Admin)

#### List all users
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/users" | jq
```

#### Get current user
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/users/me" | jq
```

### Tags

#### List all tags
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/tags" | jq
```

#### Create a tag
```bash
curl -s -X POST -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Tag Name"}' \
  "https://n8n.l7-partners.com/api/v1/tags" | jq
```

### Variables

#### List all variables
```bash
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
  "https://n8n.l7-partners.com/api/v1/variables" | jq
```

#### Create a variable
```bash
curl -s -X POST -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "VAR_NAME", "value": "var_value"}' \
  "https://n8n.l7-partners.com/api/v1/variables" | jq
```

## Common Workflow Patterns

### Creating a Webhook-triggered workflow

```json
{
  "name": "Webhook Handler",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "my-webhook",
        "responseMode": "responseNode"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify({ success: true, received: $json }) }}"
      },
      "name": "Respond",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [450, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Respond", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}
```

### Creating a Scheduled workflow

```json
{
  "name": "Scheduled Task",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [{"field": "hours", "hoursInterval": 1}]
        }
      },
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [250, 300]
    }
  ],
  "connections": {},
  "settings": {
    "executionOrder": "v1"
  }
}
```

## Workflow Error Handling Best Practices

### Always Configure Error Workflow

Every production workflow MUST have an error workflow configured. This ensures you're notified when workflows fail.

**Default Error Workflow**: `OSKEDUq7HqOKiwWw` ("error trigger")
- Sends email to jglittell@gmail.com with workflow name, error message, and execution URL

**Required Settings for New Workflows**:
```json
{
  "settings": {
    "executionOrder": "v1",
    "errorWorkflow": "OSKEDUq7HqOKiwWw",
    "saveExecutionProgress": true,
    "saveDataSuccessExecution": "all"
  }
}
```

### Node Structure Best Practices

When creating workflows via API, use this node structure (parameters first):

```json
{
  "parameters": { ... },
  "id": "uuid-format-id",
  "name": "Node Name",
  "type": "n8n-nodes-base.nodeType",
  "typeVersion": 2,
  "position": [x, y]
}
```

### Error Escalation Tiers

| Tier | Trigger | Action |
|------|---------|--------|
| 1 | Any workflow error | Email notification (error workflow) |
| 2 | Critical workflow | SMS via email-to-SMS gateway |
| 3 | Repeated failures | Slack #claude-alerts channel |

### Enhancing the Error Workflow

Consider adding to the error workflow:
1. **Slack notification** for immediate visibility
2. **Error categorization** by workflow type/severity
3. **Rate limiting** to prevent notification floods
4. **Supabase logging** for error analytics

### Individual Node Error Handling

For critical nodes, enable "Continue on Fail" and add error handling:

```json
{
  "parameters": { ... },
  "continueOnFail": true,
  "onError": "continueErrorOutput"
}
```

Then add a branch to handle the error case.

### Checklist for New Workflows

- [ ] Set `errorWorkflow: "OSKEDUq7HqOKiwWw"`
- [ ] Set `saveExecutionProgress: true`
- [ ] Set `saveDataSuccessExecution: "all"`
- [ ] Test error handling by intentionally triggering an error
- [ ] Verify email notification is received
- [ ] Add manual test webhook trigger for debugging

---

## API Error Handling

API errors return JSON with error details:
```json
{
  "code": 404,
  "message": "Workflow not found"
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request (invalid input)
- `401` - Unauthorized (check API key)
- `404` - Resource not found
- `500` - Server error

## Quick Reference Commands

```bash
# Check API connectivity
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.l7-partners.com/api/v1/workflows" | jq '.data | length'

# List active workflows only
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.l7-partners.com/api/v1/workflows?active=true" | jq '.data[] | {id, name}'

# Get recent executions with status
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.l7-partners.com/api/v1/executions?limit=10" | jq '.data[] | {id, workflowId, status: .finished, startedAt}'

# Count failed executions
curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" "https://n8n.l7-partners.com/api/v1/executions?status=error" | jq '.data | length'
```

## Infrastructure Notes

- **Hosted on**: Raspberry Pi (self-hosted)
- **Container**: Docker (docker-compose)
- **Access Protection**: Cloudflare Access
- **Infrastructure designed by**: Claude

For infrastructure changes (Docker, system services), use VNC Viewer to access the Pi directly.
