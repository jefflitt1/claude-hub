/**
 * L7 Business MCP Server
 * Consolidates supabase, gdrive-l7, and n8n-mcp into a unified business operations interface
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
const N8N_URL = process.env.N8N_URL || 'https://n8n.l7-partners.com';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

// Cache settings
const SUPABASE_CACHE_TTL = parseInt(process.env.SUPABASE_CACHE_TTL_MS || '60000');
const GDRIVE_CACHE_TTL = parseInt(process.env.GDRIVE_CACHE_TTL_MS || '300000');
const N8N_CACHE_TTL = parseInt(process.env.N8N_CACHE_TTL_MS || '600000');

// Simple LRU cache
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTtl: number;

  constructor(maxSize = 100, defaultTtlMs = 60000) {
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    this.cache.delete(key);
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtl)
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }

  stats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

// Initialize caches
const supabaseCache = new SimpleCache<any>(100, SUPABASE_CACHE_TTL);
const gdriveCache = new SimpleCache<any>(50, GDRIVE_CACHE_TTL);
const n8nCache = new SimpleCache<any>(30, N8N_CACHE_TTL);

// Initialize Supabase client
let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Initialize MCP Server
const server = new McpServer({
  name: "l7-business",
  version: "2.0.0",
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

// Generate cache key from parameters
function cacheKey(prefix: string, params: Record<string, any>): string {
  return `${prefix}:${JSON.stringify(params)}`;
}

// Schema definitions
const querySchema = {
  table: z.string().describe('Supabase table name'),
  columns: z.string().optional().default('*').describe('Columns to select (default: *)'),
  filters: z.record(z.any()).optional().describe('Key-value pairs for WHERE clause'),
  orderBy: z.string().optional().describe('Column to order by'),
  ascending: z.boolean().optional().default(true),
  limit: z.number().optional().default(100),
  offset: z.number().optional().default(0),
  useCache: z.boolean().optional().default(true).describe('Use cached result if available')
};

const insertSchema = {
  table: z.string().describe('Table name'),
  data: z.record(z.any()).describe('Data to insert')
};

const updateSchema = {
  table: z.string().describe('Table name'),
  data: z.record(z.any()).describe('Data to update'),
  filters: z.record(z.any()).describe('Filters to identify rows to update')
};

const deleteSchema = {
  table: z.string().describe('Table name'),
  filters: z.record(z.any()).describe('Filters to identify rows to delete')
};

const workflowTriggerSchema = {
  workflowId: z.string().describe('n8n workflow ID or webhook path'),
  data: z.record(z.any()).optional().describe('Data to send to workflow'),
  waitForResponse: z.boolean().optional().default(true)
};

const docSearchSchema = {
  query: z.string().describe('Search query'),
  type: z.enum(['docs', 'sheets', 'slides', 'all']).optional().default('all')
};

const sqlSchema = {
  query: z.string().describe('Raw SQL query to execute')
};

const listTablesSchema = {
  schema: z.string().optional().default('public')
};

// Supabase Tools

server.tool(
  "l7_query",
  "Query data from L7 Partners Supabase database with caching",
  querySchema,
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase client not configured. Set SUPABASE_URL and SUPABASE_KEY.', true);
    }

    try {
      const { table, columns, filters, orderBy, ascending, limit, offset, useCache } = args;

      // Check cache first
      const key = cacheKey('query', { table, columns, filters, orderBy, ascending, limit, offset });
      if (useCache) {
        const cached = supabaseCache.get(key);
        if (cached) {
          return formatResponse({
            source: 'cache',
            ...cached
          });
        }
      }

      // Build query
      let query = supabase.from(table).select(columns);

      if (filters) {
        for (const [column, value] of Object.entries(filters)) {
          query = query.eq(column, value);
        }
      }

      if (orderBy) {
        query = query.order(orderBy, { ascending });
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return formatResponse(`Query error: ${error.message}`, true);
      }

      const result = {
        source: 'database',
        table,
        rowCount: data?.length ?? 0,
        data
      };

      // Cache the result
      supabaseCache.set(key, result);

      return formatResponse(result);
    } catch (error) {
      return formatResponse(`Query error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "l7_insert",
  "Insert data into L7 Partners Supabase database",
  insertSchema,
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase client not configured.', true);
    }

    try {
      const { table, data } = args;

      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select();

      if (error) {
        return formatResponse(`Insert error: ${error.message}`, true);
      }

      // Invalidate related cache entries
      supabaseCache.clear();

      return formatResponse({
        action: 'insert',
        table,
        inserted: result
      });
    } catch (error) {
      return formatResponse(`Insert error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "l7_update",
  "Update data in L7 Partners Supabase database",
  updateSchema,
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase client not configured.', true);
    }

    try {
      const { table, data, filters } = args;

      let query = supabase.from(table).update(data);

      for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value);
      }

      const { data: result, error } = await query.select();

      if (error) {
        return formatResponse(`Update error: ${error.message}`, true);
      }

      // Invalidate cache
      supabaseCache.clear();

      return formatResponse({
        action: 'update',
        table,
        updated: result
      });
    } catch (error) {
      return formatResponse(`Update error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "l7_delete",
  "Delete data from L7 Partners Supabase database",
  deleteSchema,
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase client not configured.', true);
    }

    try {
      const { table, filters } = args;

      if (Object.keys(filters).length === 0) {
        return formatResponse('Filters required for delete operation to prevent accidental full table delete.', true);
      }

      let query = supabase.from(table).delete();

      for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value);
      }

      const { error } = await query;

      if (error) {
        return formatResponse(`Delete error: ${error.message}`, true);
      }

      // Invalidate cache
      supabaseCache.clear();

      return formatResponse({
        action: 'delete',
        table,
        filters,
        success: true
      });
    } catch (error) {
      return formatResponse(`Delete error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "l7_sql",
  "Execute raw SQL query on L7 Partners database (use with caution)",
  sqlSchema,
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase client not configured.', true);
    }

    try {
      const { query } = args;

      // Basic safety check - warn on dangerous operations
      const lowerQuery = query.toLowerCase().trim();
      if (lowerQuery.startsWith('drop') || lowerQuery.startsWith('truncate')) {
        return formatResponse('DROP and TRUNCATE operations are not allowed through this interface.', true);
      }

      const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });

      if (error) {
        return formatResponse(`SQL error: ${error.message}`, true);
      }

      return formatResponse({
        action: 'sql',
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        result: data
      });
    } catch (error) {
      return formatResponse(`SQL error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "l7_list_tables",
  "List tables in L7 Partners Supabase database",
  listTablesSchema,
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase client not configured.', true);
    }

    try {
      const { schema } = args;

      // Check cache
      const key = cacheKey('tables', { schema });
      const cached = supabaseCache.get(key);
      if (cached) {
        return formatResponse({ source: 'cache', ...cached });
      }

      // Use exec_sql RPC to query information_schema
      const sqlQuery = `
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = '${schema}'
        ORDER BY table_name
      `;

      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlQuery });

      if (error) {
        return formatResponse(`Error listing tables: ${error.message}`, true);
      }

      const result = { schema, tables: data };
      supabaseCache.set(key, result);
      return formatResponse({ source: 'database', ...result });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "l7_describe_table",
  "Get schema information for a table (columns, types, constraints)",
  {
    table: z.string().describe('Table name to describe'),
    schema: z.string().optional().default('public')
  },
  async (args) => {
    if (!supabase) {
      return formatResponse('Supabase client not configured.', true);
    }

    try {
      const { table, schema } = args;

      // Check cache
      const key = cacheKey('describe', { table, schema });
      const cached = supabaseCache.get(key);
      if (cached) {
        return formatResponse({ source: 'cache', ...cached });
      }

      // Get column information
      const columnsQuery = `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = '${schema}' AND table_name = '${table}'
        ORDER BY ordinal_position
      `;

      const { data: columns, error: colError } = await supabase.rpc('exec_sql', { sql_query: columnsQuery });

      if (colError) {
        return formatResponse(`Error describing table: ${colError.message}`, true);
      }

      // Get primary key info
      const pkQuery = `
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = '${schema}'
          AND tc.table_name = '${table}'
      `;

      const { data: pkData } = await supabase.rpc('exec_sql', { sql_query: pkQuery });
      const primaryKeys = pkData?.map((r: any) => r.column_name) || [];

      // Get foreign key info
      const fkQuery = `
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table,
          ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = '${schema}'
          AND tc.table_name = '${table}'
      `;

      const { data: fkData } = await supabase.rpc('exec_sql', { sql_query: fkQuery });

      const result = {
        schema,
        table,
        columns: columns?.map((col: any) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          maxLength: col.character_maximum_length,
          isPrimaryKey: primaryKeys.includes(col.column_name)
        })) || [],
        primaryKeys,
        foreignKeys: fkData || []
      };

      supabaseCache.set(key, result);
      return formatResponse({ source: 'database', ...result });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "l7_get_execution",
  "Get details of a specific n8n execution",
  {
    id: z.string().describe('Execution ID'),
    includeData: z.boolean().optional().default(false).describe('Include full execution data')
  },
  async (args) => {
    if (!N8N_API_KEY) {
      return formatResponse('n8n API key not configured.', true);
    }

    try {
      const { id, includeData } = args;

      const url = new URL(`${N8N_URL}/api/v1/executions/${id}`);
      if (includeData) url.searchParams.set('includeData', 'true');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY
        }
      });

      if (!response.ok) {
        return formatResponse(`n8n API error: ${response.status} ${response.statusText}`, true);
      }

      const execution = await response.json();

      return formatResponse({
        source: 'n8n_api',
        execution: {
          id: execution.id,
          workflowId: execution.workflowId,
          status: execution.status,
          mode: execution.mode,
          startedAt: execution.startedAt,
          stoppedAt: execution.stoppedAt,
          ...(includeData && { data: execution.data })
        }
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// n8n Tools

server.tool(
  "l7_workflow_trigger",
  "Trigger an n8n workflow via webhook",
  workflowTriggerSchema,
  async (args) => {
    try {
      const { workflowId, data, waitForResponse } = args;

      // Construct webhook URL
      const webhookUrl = workflowId.startsWith('http')
        ? workflowId
        : `${N8N_URL}/webhook/${workflowId}`;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(N8N_API_KEY && { 'Authorization': `Bearer ${N8N_API_KEY}` })
        },
        body: JSON.stringify(data || {})
      });

      if (!response.ok) {
        return formatResponse(`Workflow trigger failed: ${response.status} ${response.statusText}`, true);
      }

      const result = await response.json().catch(() => ({ success: true }));

      return formatResponse({
        action: 'workflow_trigger',
        workflowId,
        status: response.status,
        result
      });
    } catch (error) {
      return formatResponse(`Workflow trigger error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "l7_list_workflows",
  "List available n8n workflows",
  {
    active: z.boolean().optional().describe('Filter by active status'),
    limit: z.number().optional().default(100).describe('Max workflows to return')
  },
  async (args) => {
    if (!N8N_API_KEY) {
      return formatResponse('n8n API key not configured. Set N8N_API_KEY environment variable.', true);
    }

    try {
      const { active, limit } = args;

      // Check cache
      const key = cacheKey('workflows', { active, limit });
      const cached = n8nCache.get(key);
      if (cached) {
        return formatResponse({ source: 'cache', ...cached });
      }

      // Direct n8n API call
      const url = new URL(`${N8N_URL}/api/v1/workflows`);
      if (active !== undefined) url.searchParams.set('active', String(active));
      if (limit) url.searchParams.set('limit', String(limit));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY
        }
      });

      if (!response.ok) {
        return formatResponse(`n8n API error: ${response.status} ${response.statusText}`, true);
      }

      const data = await response.json();

      const result = {
        source: 'n8n_api',
        count: data.data?.length ?? 0,
        workflows: data.data?.map((w: any) => ({
          id: w.id,
          name: w.name,
          active: w.active,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
          tags: w.tags?.map((t: any) => t.name) ?? []
        })) ?? []
      };

      // Cache the result
      n8nCache.set(key, result);

      return formatResponse(result);
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "l7_get_workflow",
  "Get details of a specific n8n workflow",
  {
    id: z.string().describe('Workflow ID')
  },
  async (args) => {
    if (!N8N_API_KEY) {
      return formatResponse('n8n API key not configured. Set N8N_API_KEY environment variable.', true);
    }

    try {
      const { id } = args;

      // Check cache
      const key = cacheKey('workflow', { id });
      const cached = n8nCache.get(key);
      if (cached) {
        return formatResponse({ source: 'cache', ...cached });
      }

      const response = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY
        }
      });

      if (!response.ok) {
        return formatResponse(`n8n API error: ${response.status} ${response.statusText}`, true);
      }

      const workflow = await response.json();

      const result = {
        source: 'n8n_api',
        workflow: {
          id: workflow.id,
          name: workflow.name,
          active: workflow.active,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
          tags: workflow.tags?.map((t: any) => t.name) ?? [],
          nodes: workflow.nodes?.length ?? 0,
          nodeTypes: workflow.nodes?.map((n: any) => n.type).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i) ?? []
        }
      };

      n8nCache.set(key, result);
      return formatResponse(result);
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "l7_list_executions",
  "List recent n8n workflow executions",
  {
    workflowId: z.string().optional().describe('Filter by workflow ID'),
    status: z.enum(['success', 'error', 'waiting']).optional().describe('Filter by status'),
    limit: z.number().optional().default(20).describe('Max executions to return')
  },
  async (args) => {
    if (!N8N_API_KEY) {
      return formatResponse('n8n API key not configured. Set N8N_API_KEY environment variable.', true);
    }

    try {
      const { workflowId, status, limit } = args;

      const url = new URL(`${N8N_URL}/api/v1/executions`);
      if (workflowId) url.searchParams.set('workflowId', workflowId);
      if (status) url.searchParams.set('status', status);
      if (limit) url.searchParams.set('limit', String(limit));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY
        }
      });

      if (!response.ok) {
        return formatResponse(`n8n API error: ${response.status} ${response.statusText}`, true);
      }

      const data = await response.json();

      return formatResponse({
        source: 'n8n_api',
        count: data.data?.length ?? 0,
        executions: data.data?.map((e: any) => ({
          id: e.id,
          workflowId: e.workflowId,
          status: e.status,
          startedAt: e.startedAt,
          stoppedAt: e.stoppedAt,
          mode: e.mode
        })) ?? []
      });
    } catch (error) {
      return formatResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// Google Drive Tools (routes to gdrive-L7 - requires OAuth which isn't self-contained)

server.tool(
  "l7_doc_search",
  "Search L7 Partners Google Drive",
  docSearchSchema,
  async (args) => {
    try {
      const { query, type } = args;

      // Check cache
      const key = cacheKey('gdrive', { query, type });
      const cached = gdriveCache.get(key);
      if (cached) {
        return formatResponse({ source: 'cache', ...cached });
      }

      // This routes to the gdrive-L7 MCP server
      // In a full implementation, we'd call it directly
      return formatResponse({
        action: 'doc_search',
        query,
        type,
        instruction: 'Use mcp__gdrive-L7__search with the query to search Drive',
        underlyingTool: 'mcp__gdrive-L7__search'
      });
    } catch (error) {
      return formatResponse(`Search error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// Meta/Info Tools

server.tool(
  "l7_info",
  "Get information about L7 Business meta-tool status and caches",
  {},
  async () => {
    return formatResponse({
      name: 'l7-business',
      version: '2.0.0',
      description: 'Unified L7 Partners business operations with direct API integration',
      services: {
        supabase: {
          configured: !!supabase,
          selfContained: true,
          url: SUPABASE_URL,
          cache: supabaseCache.stats()
        },
        n8n: {
          configured: !!N8N_API_KEY,
          selfContained: true,
          url: N8N_URL,
          cache: n8nCache.stats()
        },
        gdrive: {
          configured: true,
          selfContained: false,
          note: 'Routes to gdrive-L7 MCP server (OAuth required)',
          cache: gdriveCache.stats()
        }
      },
      cacheTtls: {
        supabase: SUPABASE_CACHE_TTL,
        gdrive: GDRIVE_CACHE_TTL,
        n8n: N8N_CACHE_TTL
      }
    });
  }
);

server.tool(
  "l7_clear_cache",
  "Clear L7 Business caches",
  {
    target: z.enum(['all', 'supabase', 'gdrive', 'n8n']).optional().default('all')
  },
  async (args) => {
    const { target } = args;

    if (target === 'all' || target === 'supabase') supabaseCache.clear();
    if (target === 'all' || target === 'gdrive') gdriveCache.clear();
    if (target === 'all' || target === 'n8n') n8nCache.clear();

    return formatResponse({
      action: 'cache_cleared',
      target,
      newStats: {
        supabase: supabaseCache.stats(),
        gdrive: gdriveCache.stats(),
        n8n: n8nCache.stats()
      }
    });
  }
);

// Start the server
async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer().catch(console.error);
