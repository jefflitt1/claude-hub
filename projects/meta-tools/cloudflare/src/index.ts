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
    }

    return formatResponse({
      name: "cloudflare-mcp",
      version: "1.0.0",
      dnsConfigured: configured,
      tunnelsConfigured,
      zone: zoneInfo,
      tunnelCount,
      tools: {
        dns: ['list_dns_records', 'get_dns_record', 'create_dns_record', 'update_dns_record', 'delete_dns_record'],
        tunnels: ['list_tunnels', 'get_tunnel', 'get_tunnel_config', 'create_tunnel', 'delete_tunnel', 'update_tunnel_config', 'cleanup_tunnel_connections']
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
