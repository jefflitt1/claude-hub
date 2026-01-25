/**
 * Cloudflare MCP Server
 * DNS records and tunnel management via Claude
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || '';
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

// Initialize MCP Server
const server = new McpServer({
  name: "cloudflare",
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

// Cloudflare API helper
async function cloudflareApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  if (!CLOUDFLARE_API_TOKEN) {
    throw new Error('CLOUDFLARE_API_TOKEN not configured');
  }

  const url = `${CLOUDFLARE_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const data = await response.json();

  if (!data.success) {
    const errors = data.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
    throw new Error(`Cloudflare API error: ${errors}`);
  }

  return data;
}

// =============================================================================
// DNS RECORD TOOLS
// =============================================================================

const dnsRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR'] as const;

// Tool: List DNS records
server.tool(
  "list_dns_records",
  "List all DNS records for the configured zone. Optionally filter by type or name.",
  {
    type: z.enum(dnsRecordTypes).optional().describe('Filter by record type'),
    name: z.string().optional().describe('Filter by record name (exact match)')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ZONE_ID) {
        return formatResponse('CLOUDFLARE_ZONE_ID not configured', true);
      }

      const params = new URLSearchParams();
      if (args.type) params.append('type', args.type);
      if (args.name) params.append('name', args.name);

      const queryString = params.toString() ? `?${params}` : '';
      const data = await cloudflareApi(`/zones/${CLOUDFLARE_ZONE_ID}/dns_records${queryString}`);

      const records = data.result.map((r: any) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        content: r.content,
        proxied: r.proxied,
        ttl: r.ttl,
        priority: r.priority
      }));

      return formatResponse({
        count: records.length,
        records
      });
    } catch (error: any) {
      return formatResponse(`Error listing DNS records: ${error.message}`, true);
    }
  }
);

// Tool: Get DNS record
server.tool(
  "get_dns_record",
  "Get a specific DNS record by ID",
  {
    recordId: z.string().describe('The DNS record ID')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ZONE_ID) {
        return formatResponse('CLOUDFLARE_ZONE_ID not configured', true);
      }

      const data = await cloudflareApi(`/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${args.recordId}`);
      return formatResponse(data.result);
    } catch (error: any) {
      return formatResponse(`Error getting DNS record: ${error.message}`, true);
    }
  }
);

// Tool: Create DNS record
server.tool(
  "create_dns_record",
  "Create a new DNS record",
  {
    type: z.enum(dnsRecordTypes).describe('DNS record type'),
    name: z.string().describe('DNS record name (e.g., subdomain.example.com)'),
    content: z.string().describe('DNS record content (IP address, hostname, etc.)'),
    ttl: z.number().optional().default(1).describe('TTL in seconds (1 = auto)'),
    proxied: z.boolean().optional().default(false).describe('Whether to proxy through Cloudflare'),
    priority: z.number().optional().describe('Priority (for MX records)')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ZONE_ID) {
        return formatResponse('CLOUDFLARE_ZONE_ID not configured', true);
      }

      const body: any = {
        type: args.type,
        name: args.name,
        content: args.content,
        ttl: args.ttl,
        proxied: args.proxied
      };
      if (args.priority !== undefined) body.priority = args.priority;

      const data = await cloudflareApi(`/zones/${CLOUDFLARE_ZONE_ID}/dns_records`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      return formatResponse({
        success: true,
        message: 'DNS record created',
        record: {
          id: data.result.id,
          type: data.result.type,
          name: data.result.name,
          content: data.result.content
        }
      });
    } catch (error: any) {
      return formatResponse(`Error creating DNS record: ${error.message}`, true);
    }
  }
);

// Tool: Update DNS record
server.tool(
  "update_dns_record",
  "Update an existing DNS record",
  {
    recordId: z.string().describe('The DNS record ID to update'),
    type: z.enum(dnsRecordTypes).optional().describe('DNS record type'),
    name: z.string().optional().describe('DNS record name'),
    content: z.string().optional().describe('DNS record content'),
    ttl: z.number().optional().describe('TTL in seconds'),
    proxied: z.boolean().optional().describe('Whether to proxy through Cloudflare'),
    priority: z.number().optional().describe('Priority (for MX records)')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ZONE_ID) {
        return formatResponse('CLOUDFLARE_ZONE_ID not configured', true);
      }

      const { recordId, ...updates } = args;
      const body = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );

      if (Object.keys(body).length === 0) {
        return formatResponse('No updates provided', true);
      }

      const data = await cloudflareApi(`/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });

      return formatResponse({
        success: true,
        message: 'DNS record updated',
        record: {
          id: data.result.id,
          type: data.result.type,
          name: data.result.name,
          content: data.result.content
        }
      });
    } catch (error: any) {
      return formatResponse(`Error updating DNS record: ${error.message}`, true);
    }
  }
);

// Tool: Delete DNS record
server.tool(
  "delete_dns_record",
  "Delete a DNS record by ID",
  {
    recordId: z.string().describe('The DNS record ID to delete')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ZONE_ID) {
        return formatResponse('CLOUDFLARE_ZONE_ID not configured', true);
      }

      await cloudflareApi(`/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${args.recordId}`, {
        method: 'DELETE'
      });

      return formatResponse({
        success: true,
        message: `DNS record ${args.recordId} deleted`
      });
    } catch (error: any) {
      return formatResponse(`Error deleting DNS record: ${error.message}`, true);
    }
  }
);

// =============================================================================
// TUNNEL TOOLS
// =============================================================================

// Tool: List tunnels
server.tool(
  "list_tunnels",
  "List all Cloudflare tunnels for the account",
  {
    status: z.enum(['healthy', 'down', 'degraded']).optional().describe('Filter by tunnel status'),
    includeDeleted: z.boolean().optional().default(false).describe('Include deleted tunnels')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      const params = new URLSearchParams();
      if (!args.includeDeleted) params.append('is_deleted', 'false');

      const queryString = params.toString() ? `?${params}` : '';
      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel${queryString}`);

      let tunnels = data.result.map((t: any) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        createdAt: t.created_at,
        configSource: t.config_src,
        connections: t.connections?.length || 0,
        activeConnections: t.connections?.filter((c: any) => !c.is_pending_reconnect).length || 0
      }));

      // Filter by status if requested
      if (args.status) {
        tunnels = tunnels.filter((t: any) => t.status === args.status);
      }

      return formatResponse({
        count: tunnels.length,
        tunnels
      });
    } catch (error: any) {
      return formatResponse(`Error listing tunnels: ${error.message}`, true);
    }
  }
);

// Tool: Get tunnel details
server.tool(
  "get_tunnel",
  "Get detailed information about a specific tunnel",
  {
    tunnelId: z.string().describe('The tunnel ID or name')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${args.tunnelId}`);
      const t = data.result;

      return formatResponse({
        id: t.id,
        name: t.name,
        status: t.status,
        createdAt: t.created_at,
        configSource: t.config_src,
        remoteConfig: t.remote_config,
        connections: t.connections?.map((c: any) => ({
          id: c.id,
          colo: c.colo_name,
          originIp: c.origin_ip,
          openedAt: c.opened_at,
          clientVersion: c.client_version,
          isPendingReconnect: c.is_pending_reconnect
        })) || []
      });
    } catch (error: any) {
      return formatResponse(`Error getting tunnel: ${error.message}`, true);
    }
  }
);

// Tool: Get tunnel configuration
server.tool(
  "get_tunnel_config",
  "Get the configuration for a remotely-managed tunnel",
  {
    tunnelId: z.string().describe('The tunnel ID')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${args.tunnelId}/configurations`);
      return formatResponse(data.result);
    } catch (error: any) {
      return formatResponse(`Error getting tunnel config: ${error.message}`, true);
    }
  }
);

// Tool: Create tunnel
server.tool(
  "create_tunnel",
  "Create a new Cloudflare tunnel",
  {
    name: z.string().describe('Name for the tunnel'),
    configSource: z.enum(['local', 'cloudflare']).optional().default('cloudflare')
      .describe('Configuration source: local (config.yaml) or cloudflare (dashboard)')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      // Generate a random tunnel secret
      const secret = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel`, {
        method: 'POST',
        body: JSON.stringify({
          name: args.name,
          tunnel_secret: secret,
          config_src: args.configSource
        })
      });

      return formatResponse({
        success: true,
        message: 'Tunnel created',
        tunnel: {
          id: data.result.id,
          name: data.result.name,
          token: data.result.token // Used to run cloudflared
        },
        nextSteps: [
          `Run: cloudflared tunnel run --token ${data.result.token}`,
          'Or add the token to your cloudflared config'
        ]
      });
    } catch (error: any) {
      return formatResponse(`Error creating tunnel: ${error.message}`, true);
    }
  }
);

// Tool: Delete tunnel
server.tool(
  "delete_tunnel",
  "Delete a Cloudflare tunnel (must have no active connections)",
  {
    tunnelId: z.string().describe('The tunnel ID to delete')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${args.tunnelId}`, {
        method: 'DELETE'
      });

      return formatResponse({
        success: true,
        message: `Tunnel ${args.tunnelId} deleted`
      });
    } catch (error: any) {
      return formatResponse(`Error deleting tunnel: ${error.message}`, true);
    }
  }
);

// Tool: Update tunnel configuration (for remote-managed tunnels)
server.tool(
  "update_tunnel_config",
  "Update the configuration for a remotely-managed tunnel (add/remove ingress rules)",
  {
    tunnelId: z.string().describe('The tunnel ID'),
    ingress: z.array(z.object({
      hostname: z.string().optional().describe('Public hostname (e.g., app.example.com)'),
      service: z.string().describe('Local service URL (e.g., http://localhost:8080 or ssh://localhost:22)'),
      path: z.string().optional().describe('Path prefix to match')
    })).describe('Ingress rules (last rule should be catch-all with service: http_status:404)')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${args.tunnelId}/configurations`, {
        method: 'PUT',
        body: JSON.stringify({
          config: {
            ingress: args.ingress
          }
        })
      });

      return formatResponse({
        success: true,
        message: 'Tunnel configuration updated',
        config: data.result
      });
    } catch (error: any) {
      return formatResponse(`Error updating tunnel config: ${error.message}`, true);
    }
  }
);

// Tool: Clean up connections for a tunnel
server.tool(
  "cleanup_tunnel_connections",
  "Clean up stale connections for a tunnel",
  {
    tunnelId: z.string().describe('The tunnel ID')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel/${args.tunnelId}/connections`, {
        method: 'DELETE'
      });

      return formatResponse({
        success: true,
        message: 'Tunnel connections cleaned up'
      });
    } catch (error: any) {
      return formatResponse(`Error cleaning up connections: ${error.message}`, true);
    }
  }
);

// =============================================================================
// ZERO TRUST ACCESS TOOLS
// =============================================================================

// Tool: List Access applications
server.tool(
  "list_access_apps",
  "List all Cloudflare Access applications (Zero Trust)",
  {},
  async () => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps`);

      const apps = data.result.map((app: any) => ({
        id: app.id,
        name: app.name,
        domain: app.domain,
        type: app.type,
        sessionDuration: app.session_duration,
        allowedIdps: app.allowed_idps,
        autoRedirectToIdentity: app.auto_redirect_to_identity,
        createdAt: app.created_at,
        updatedAt: app.updated_at
      }));

      return formatResponse({
        count: apps.length,
        apps
      });
    } catch (error: any) {
      return formatResponse(`Error listing Access apps: ${error.message}`, true);
    }
  }
);

// Tool: Get Access application
server.tool(
  "get_access_app",
  "Get details of a specific Cloudflare Access application",
  {
    appId: z.string().describe('The Access application ID')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps/${args.appId}`);
      return formatResponse(data.result);
    } catch (error: any) {
      return formatResponse(`Error getting Access app: ${error.message}`, true);
    }
  }
);

// Tool: Create Access application
server.tool(
  "create_access_app",
  "Create a new Cloudflare Access application (self-hosted)",
  {
    name: z.string().describe('Application name'),
    domain: z.string().describe('The domain to protect (e.g., app.example.com)'),
    sessionDuration: z.string().optional().default('24h').describe('Session duration (e.g., 24h, 30m, 7d)'),
    autoRedirectToIdentity: z.boolean().optional().default(true).describe('Auto redirect to identity provider'),
    appLauncherVisible: z.boolean().optional().default(true).describe('Show in App Launcher'),
    logoUrl: z.string().optional().describe('URL for application logo')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      const body: any = {
        name: args.name,
        domain: args.domain,
        type: 'self_hosted',
        session_duration: args.sessionDuration,
        auto_redirect_to_identity: args.autoRedirectToIdentity,
        app_launcher_visible: args.appLauncherVisible
      };
      if (args.logoUrl) body.logo_url = args.logoUrl;

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      return formatResponse({
        success: true,
        message: 'Access application created',
        app: {
          id: data.result.id,
          name: data.result.name,
          domain: data.result.domain,
          aud: data.result.aud
        },
        nextSteps: [
          'Create an Access policy to define who can access this application',
          `Use create_access_policy with appId: "${data.result.id}"`
        ]
      });
    } catch (error: any) {
      return formatResponse(`Error creating Access app: ${error.message}`, true);
    }
  }
);

// Tool: Update Access application
server.tool(
  "update_access_app",
  "Update a Cloudflare Access application",
  {
    appId: z.string().describe('The Access application ID'),
    name: z.string().optional().describe('Application name'),
    domain: z.string().optional().describe('The domain to protect'),
    sessionDuration: z.string().optional().describe('Session duration (e.g., 24h, 30m, 7d)'),
    autoRedirectToIdentity: z.boolean().optional().describe('Auto redirect to identity provider'),
    appLauncherVisible: z.boolean().optional().describe('Show in App Launcher')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      const { appId, ...updates } = args;
      const body: any = {};
      if (updates.name !== undefined) body.name = updates.name;
      if (updates.domain !== undefined) body.domain = updates.domain;
      if (updates.sessionDuration !== undefined) body.session_duration = updates.sessionDuration;
      if (updates.autoRedirectToIdentity !== undefined) body.auto_redirect_to_identity = updates.autoRedirectToIdentity;
      if (updates.appLauncherVisible !== undefined) body.app_launcher_visible = updates.appLauncherVisible;

      if (Object.keys(body).length === 0) {
        return formatResponse('No updates provided', true);
      }

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps/${appId}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      return formatResponse({
        success: true,
        message: 'Access application updated',
        app: {
          id: data.result.id,
          name: data.result.name,
          domain: data.result.domain
        }
      });
    } catch (error: any) {
      return formatResponse(`Error updating Access app: ${error.message}`, true);
    }
  }
);

// Tool: Delete Access application
server.tool(
  "delete_access_app",
  "Delete a Cloudflare Access application",
  {
    appId: z.string().describe('The Access application ID to delete')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps/${args.appId}`, {
        method: 'DELETE'
      });

      return formatResponse({
        success: true,
        message: `Access application ${args.appId} deleted`
      });
    } catch (error: any) {
      return formatResponse(`Error deleting Access app: ${error.message}`, true);
    }
  }
);

// Tool: List Access policies for an application
server.tool(
  "list_access_policies",
  "List all policies for a Cloudflare Access application",
  {
    appId: z.string().describe('The Access application ID')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps/${args.appId}/policies`);

      const policies = data.result.map((p: any) => ({
        id: p.id,
        name: p.name,
        decision: p.decision,
        precedence: p.precedence,
        include: p.include,
        exclude: p.exclude,
        require: p.require,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));

      return formatResponse({
        count: policies.length,
        policies
      });
    } catch (error: any) {
      return formatResponse(`Error listing Access policies: ${error.message}`, true);
    }
  }
);

// Tool: Create Access policy
server.tool(
  "create_access_policy",
  "Create a policy for a Cloudflare Access application",
  {
    appId: z.string().describe('The Access application ID'),
    name: z.string().describe('Policy name'),
    decision: z.enum(['allow', 'deny', 'bypass', 'non_identity']).default('allow').describe('Policy decision'),
    precedence: z.number().optional().describe('Policy precedence (lower = higher priority)'),
    includeEmails: z.array(z.string()).optional().describe('Allow specific email addresses'),
    includeEmailDomains: z.array(z.string()).optional().describe('Allow email domains (e.g., example.com)'),
    includeEveryone: z.boolean().optional().describe('Allow everyone (use with caution)'),
    includeGroups: z.array(z.string()).optional().describe('Allow Access group IDs'),
    excludeEmails: z.array(z.string()).optional().describe('Exclude specific email addresses'),
    excludeEmailDomains: z.array(z.string()).optional().describe('Exclude email domains'),
    requireMfa: z.boolean().optional().describe('Require multi-factor authentication')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      // Build include rules
      const include: any[] = [];
      if (args.includeEmails?.length) {
        args.includeEmails.forEach(email => {
          include.push({ email: { email } });
        });
      }
      if (args.includeEmailDomains?.length) {
        args.includeEmailDomains.forEach(domain => {
          include.push({ email_domain: { domain } });
        });
      }
      if (args.includeEveryone) {
        include.push({ everyone: {} });
      }
      if (args.includeGroups?.length) {
        args.includeGroups.forEach(id => {
          include.push({ group: { id } });
        });
      }

      // Build exclude rules
      const exclude: any[] = [];
      if (args.excludeEmails?.length) {
        args.excludeEmails.forEach(email => {
          exclude.push({ email: { email } });
        });
      }
      if (args.excludeEmailDomains?.length) {
        args.excludeEmailDomains.forEach(domain => {
          exclude.push({ email_domain: { domain } });
        });
      }

      // Build require rules
      const require: any[] = [];
      if (args.requireMfa) {
        require.push({ mfa: {} });
      }

      if (include.length === 0) {
        return formatResponse('At least one include rule is required (includeEmails, includeEmailDomains, includeEveryone, or includeGroups)', true);
      }

      const body: any = {
        name: args.name,
        decision: args.decision,
        include
      };
      if (args.precedence !== undefined) body.precedence = args.precedence;
      if (exclude.length > 0) body.exclude = exclude;
      if (require.length > 0) body.require = require;

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps/${args.appId}/policies`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      return formatResponse({
        success: true,
        message: 'Access policy created',
        policy: {
          id: data.result.id,
          name: data.result.name,
          decision: data.result.decision,
          precedence: data.result.precedence
        }
      });
    } catch (error: any) {
      return formatResponse(`Error creating Access policy: ${error.message}`, true);
    }
  }
);

// Tool: Update Access policy
server.tool(
  "update_access_policy",
  "Update a policy for a Cloudflare Access application",
  {
    appId: z.string().describe('The Access application ID'),
    policyId: z.string().describe('The policy ID to update'),
    name: z.string().optional().describe('Policy name'),
    decision: z.enum(['allow', 'deny', 'bypass', 'non_identity']).optional().describe('Policy decision'),
    precedence: z.number().optional().describe('Policy precedence')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      const { appId, policyId, ...updates } = args;
      const body: any = {};
      if (updates.name !== undefined) body.name = updates.name;
      if (updates.decision !== undefined) body.decision = updates.decision;
      if (updates.precedence !== undefined) body.precedence = updates.precedence;

      if (Object.keys(body).length === 0) {
        return formatResponse('No updates provided', true);
      }

      const data = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps/${appId}/policies/${policyId}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      return formatResponse({
        success: true,
        message: 'Access policy updated',
        policy: {
          id: data.result.id,
          name: data.result.name,
          decision: data.result.decision
        }
      });
    } catch (error: any) {
      return formatResponse(`Error updating Access policy: ${error.message}`, true);
    }
  }
);

// Tool: Delete Access policy
server.tool(
  "delete_access_policy",
  "Delete a policy from a Cloudflare Access application",
  {
    appId: z.string().describe('The Access application ID'),
    policyId: z.string().describe('The policy ID to delete')
  },
  async (args) => {
    try {
      if (!CLOUDFLARE_ACCOUNT_ID) {
        return formatResponse('CLOUDFLARE_ACCOUNT_ID not configured', true);
      }

      await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps/${args.appId}/policies/${args.policyId}`, {
        method: 'DELETE'
      });

      return formatResponse({
        success: true,
        message: `Access policy ${args.policyId} deleted`
      });
    } catch (error: any) {
      return formatResponse(`Error deleting Access policy: ${error.message}`, true);
    }
  }
);

// =============================================================================
// INFO/STATUS TOOL
// =============================================================================

server.tool(
  "cloudflare_info",
  "Get Cloudflare MCP server status and configuration info",
  {},
  async () => {
    const configured = !!(CLOUDFLARE_API_TOKEN && CLOUDFLARE_ZONE_ID);
    const tunnelsConfigured = !!CLOUDFLARE_ACCOUNT_ID;

    let zoneInfo = null;
    let tunnelCount = 0;
    let accessAppCount = 0;

    if (configured) {
      try {
        const zoneData = await cloudflareApi(`/zones/${CLOUDFLARE_ZONE_ID}`);
        zoneInfo = {
          name: zoneData.result.name,
          status: zoneData.result.status
        };
      } catch (e) {
        // Ignore
      }
    }

    if (tunnelsConfigured) {
      try {
        const tunnelData = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel?is_deleted=false`);
        tunnelCount = tunnelData.result?.length || 0;
      } catch (e) {
        // Ignore
      }

      try {
        const accessData = await cloudflareApi(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps`);
        accessAppCount = accessData.result?.length || 0;
      } catch (e) {
        // Ignore
      }
    }

    return formatResponse({
      name: "cloudflare-mcp",
      version: "1.1.0",
      dnsConfigured: configured,
      tunnelsConfigured,
      zone: zoneInfo,
      tunnelCount,
      accessAppCount,
      tools: {
        dns: ['list_dns_records', 'get_dns_record', 'create_dns_record', 'update_dns_record', 'delete_dns_record'],
        tunnels: ['list_tunnels', 'get_tunnel', 'get_tunnel_config', 'create_tunnel', 'delete_tunnel', 'update_tunnel_config', 'cleanup_tunnel_connections'],
        access: ['list_access_apps', 'get_access_app', 'create_access_app', 'update_access_app', 'delete_access_app', 'list_access_policies', 'create_access_policy', 'update_access_policy', 'delete_access_policy']
      }
    });
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cloudflare MCP server running on stdio");
}

main().catch(console.error);
