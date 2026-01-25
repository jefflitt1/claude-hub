# IT Agent Skill

## Purpose
Assess networks, manage tech stack inventory, monitor infrastructure health, and provide security recommendations.

## Trigger
- User says "/it" or "it agent" or asks about infrastructure, network, tech stack, credentials, security posture
- Proactively when security issues detected

## Capabilities

### 1. Infrastructure Inventory
Query and display current infrastructure:
```
- Cloudflare DNS records & tunnel status
- Supabase tables and health
- n8n workflows (active/inactive)
- MCP servers available
- External service integrations
```

### 2. Credentials Management
Track credentials via `credentials_inventory` table:
```sql
-- Check credential status
SELECT service, key_type, status,
       CASE WHEN expires_at < NOW() THEN 'EXPIRED'
            WHEN expires_at < NOW() + INTERVAL '30 days' THEN 'EXPIRING SOON'
            ELSE 'OK' END as expiry_status,
       last_rotated_at
FROM credentials_inventory
ORDER BY status DESC, expires_at;
```

### 3. Security Assessment
Check for common issues:
- [ ] Exposed services without Access protection
- [ ] Credentials needing rotation (>90 days)
- [ ] Compromised credentials
- [ ] Tunnel health status
- [ ] WAF rules effectiveness
- [ ] Access policy coverage

### 4. Network Discovery
Available tools:
- `dig` / `nslookup` - DNS resolution
- **Cloudflare MCP** (direct API access):
  - DNS: `list_dns_records`, `get_dns_record`, `create_dns_record`, `update_dns_record`, `delete_dns_record`
  - Tunnels: `list_tunnels`, `get_tunnel`, `get_tunnel_config`, `create_tunnel`, `delete_tunnel`, `update_tunnel_config`, `cleanup_tunnel_connections`
  - Info: `cloudflare_info` - Server status and config
- `mcp__l7-business__l7_list_tables` - Database inventory
- `mcp__l7-business__l7_list_workflows` - n8n inventory
- `mcp__n8n-mcp__n8n_health_check` - n8n status

### 5. Health Monitoring
Check via:
- Uptime Kuma (kuma.l7-partners.com)
- n8n System Health Check workflow
- `system_health_checks` table

## Quick Commands

### `/it status`
Show overall infrastructure health:
1. Tunnel status (healthy/down)
2. Critical services status
3. Credentials needing attention
4. Recent security events

### `/it credentials`
List all tracked credentials with rotation status

### `/it inventory`
Full tech stack inventory report

### `/it security`
Security posture assessment

### `/it add-credential`
Add new credential to tracking:
```
Service: [name]
Key Type: [api_key|oauth_token|password|certificate]
Description: [what it's for]
Rotation Days: [90]
Notes: [where it's stored]
```

## Data Sources

### Supabase Tables
- `credentials_inventory` - Credential tracking
- `security_audit_log` - Security events
- `system_health_checks` - Health check results
- `claude_mcp_servers` - MCP server registry

### n8n Workflows
- System Health Check
- Daily Workflow Health Report
- Error trigger

### External
- Cloudflare Dashboard (manual)
- Uptime Kuma dashboard

## Security Alerts

Automatically flag:
1. **CRITICAL**: Compromised credentials
2. **HIGH**: Expired or expiring credentials
3. **MEDIUM**: Services without Access protection
4. **LOW**: Credentials not rotated in 90+ days

## Example Responses

### Status Check
```
🖥️ IT Infrastructure Status

Tunnels:
  ✅ n8n-tunnel: Healthy (2 days uptime)
  ✅ mac-ssh: Healthy (7 hours uptime)
  ❌ pi-vnc: Down

Credentials (8 tracked):
  🔴 1 compromised (Supabase - ROTATE NOW)
  🟡 1 needs config (Gmail L7)
  🟢 6 active

Services:
  ✅ n8n: Healthy
  ✅ Supabase: Connected
  ✅ 9 Access-protected apps

Last security scan: Never
```

## Future Enhancements
- [ ] Automated credential rotation reminders
- [ ] Network scanning integration
- [x] ~~Cloudflare API integration for programmatic checks~~ ✅ Done (cloudflare MCP)
- [ ] Dependency mapping between services
- [ ] Automated security scanning schedule
