# Security Considerations

## Webhook URLs

**Issue:** Webhook URLs in `data/workflows.json` are stored in a git repository. While the repository is private, this is a security consideration.

**Current URLs exposed:**
- `https://webhooks.l7-partners.com/webhook/github-project-sync`
- `https://webhooks.l7-partners.com/webhook/29b8d0ff-ccf3-439e-a4b6-e4858f5809b0`

**Risk Level:** Low-Medium
- URLs are semi-random and not easily guessable
- n8n webhooks can be configured with authentication
- Repository is private

**Recommendations:**
1. **Environment Variables:** Move sensitive webhook URLs to environment variables
   ```bash
   # .env (not committed)
   GITHUB_SYNC_WEBHOOK_URL=https://webhooks.l7-partners.com/webhook/...
   ```

2. **n8n Webhook Authentication:** Enable authentication on n8n webhooks
   - Header Auth: Require `X-Webhook-Secret` header
   - Basic Auth: Username/password on webhook endpoint
   - JWT: Token-based authentication

3. **URL Obfuscation:** In `workflows.json`, store a reference instead of the full URL
   ```json
   {
     "webhookUrl": "env:GITHUB_SYNC_WEBHOOK"
   }
   ```

4. **Webhook Rotation:** Periodically regenerate webhook URLs if compromise is suspected

## API Security

**Current State:** No authentication on API endpoints

**Acceptable for:**
- Internal tools
- Development/staging
- Localhost-only access

**If public access needed, implement:**
1. API key authentication
2. Rate limiting
3. CORS restrictions
4. Request validation

## XSS Protection

**Implemented:** HTML escaping via `escapeHtml()` function

All user-controlled data is escaped before rendering:
- Project names and descriptions
- Agent names and capabilities
- Skill triggers and commands
- Workflow metadata

## Error Handling

**Implemented:**
- `Promise.allSettled` for graceful degradation
- Try-catch in JSON parsing
- Global error handler in Express
- Structured logging

## Data Validation

**Current State:** Minimal validation

**Recommended additions:**
1. JSON schema validation for data files
2. Input sanitization on any future write endpoints
3. Type checking for API responses

## Logging

**Implemented:** Structured JSON logging

```javascript
{
  "timestamp": "2026-01-17T...",
  "level": "info|warn|error",
  "message": "event_type",
  "path": "/api/projects",
  "status": 200,
  "duration": 15
}
```

**Not logged (sensitive):**
- Full request bodies
- Authentication tokens
- Full error stacks in production

## Deployment Security

1. **Cloudflare Tunnel:** Encrypts traffic, no exposed ports
2. **Private Repository:** Code not publicly accessible
3. **No Secrets in Code:** Use environment variables for sensitive data

## Checklist

- [x] XSS protection implemented
- [x] Error handling with graceful degradation
- [x] Structured logging
- [x] Private repository
- [ ] Webhook authentication (optional)
- [ ] API authentication (if public)
- [ ] Rate limiting (if public)
- [ ] Input validation (if write endpoints added)
