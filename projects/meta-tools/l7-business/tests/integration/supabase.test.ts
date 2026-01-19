/**
 * Integration tests for l7-business Supabase functionality
 * These tests hit the real Supabase instance to verify:
 * 1. Authentication works
 * 2. RPC functions exist
 * 3. Tables are accessible
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;

beforeAll(() => {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  supabase = createClient(url, key, {
    auth: { persistSession: false }
  });
});

describe('Supabase Connection', () => {
  it('should connect with service role key', async () => {
    // Simple query to verify connection
    const { error } = await supabase.from('_test_connection').select('*').limit(1);

    // Table might not exist, but auth error would be different
    if (error) {
      expect(error.code).not.toBe('PGRST301'); // Invalid API key
      expect(error.message).not.toContain('Invalid API key');
    }
  });
});

describe('RPC Functions', () => {
  it('exec_sql RPC should exist and work', async () => {
    // This is the function l7_list_tables uses
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: "SELECT 1 as test"
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('exec_sql should query information_schema', async () => {
    // This is what l7_list_tables actually does
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
        LIMIT 5
      `
    });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('Table Access', () => {
  it('should list tables in public schema', async () => {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `
    });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Log discovered tables for reference
    console.log('Discovered tables:', data.map((t: any) => t.table_name).join(', '));
  });

  it('should be able to query a known table', async () => {
    // First find a table that exists
    const { data: tables } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        LIMIT 1
      `
    });

    if (tables && tables.length > 0) {
      const tableName = tables[0].table_name;

      // Try to query it
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    }
  });
});

describe('Table Schema', () => {
  it('should be able to describe table columns', async () => {
    // Get columns for a table - this validates l7_describe_table would work
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        LIMIT 10
      `
    });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
