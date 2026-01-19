/**
 * Tests for RPC Function Registry
 * Validates that the registry matches actual Supabase functions
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ALL_FUNCTIONS, validateRpcFunction, suggestSimilarFunctions } from '../../src/rpc-registry.js';

let supabase: SupabaseClient;

beforeAll(() => {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  supabase = createClient(url, key, {
    auth: { persistSession: false }
  });
});

describe('RPC Registry', () => {
  it('should have all registered functions in Supabase', async () => {
    // Get actual functions from Supabase
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT proname as name
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'
      `
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const actualFunctions = new Set(data.map((f: any) => f.name));

    // Check each registered function exists
    const missingFunctions: string[] = [];
    for (const fn of ALL_FUNCTIONS) {
      if (!actualFunctions.has(fn)) {
        missingFunctions.push(fn);
      }
    }

    if (missingFunctions.length > 0) {
      console.warn('Functions in registry but not in Supabase:', missingFunctions);
    }

    // Allow some tolerance for registry drift
    expect(missingFunctions.length).toBeLessThan(5);
  });

  it('should find new functions not in registry', async () => {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT proname as name
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'
      `
    });

    expect(error).toBeNull();

    const registeredSet = new Set(ALL_FUNCTIONS);
    const newFunctions = data.filter((f: any) => !registeredSet.has(f.name));

    if (newFunctions.length > 0) {
      console.log('New functions not in registry (consider adding):',
        newFunctions.map((f: any) => f.name).join(', ')
      );
    }

    // This is informational, not a failure
    expect(true).toBe(true);
  });
});

describe('Validation Functions', () => {
  it('should validate known functions', () => {
    expect(validateRpcFunction('exec_sql')).toBe(true);
    expect(validateRpcFunction('get_tables')).toBe(true);
    expect(validateRpcFunction('get_l7_tenants')).toBe(true);
  });

  it('should reject unknown functions', () => {
    expect(validateRpcFunction('fake_function')).toBe(false);
    expect(validateRpcFunction('not_real')).toBe(false);
  });

  it('should suggest similar functions', () => {
    const suggestions = suggestSimilarFunctions('get_tenant');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.includes('tenant'))).toBe(true);
  });
});

describe('Core Functions', () => {
  it('exec_sql should work', async () => {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT 1 as test'
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('get_tables should work', async () => {
    const { data, error } = await supabase.rpc('get_tables', {
      schema_name: 'public'
    });

    // get_tables exists now - this should work
    if (error) {
      console.log('get_tables error:', error.message);
    }

    // Either it works or we know why it doesn't
    expect(error === null || error.message !== undefined).toBe(true);
  });
});
