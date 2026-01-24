/**
 * Supabase RPC Function Registry
 * Auto-generated list of available RPC functions for validation
 *
 * This registry helps prevent "function not found" errors by validating
 * RPC calls before execution.
 */
// Core RPC functions used by l7-business
export const CORE_FUNCTIONS = [
    {
        name: 'exec_sql',
        arguments: 'sql_query text',
        returnType: 'json',
        description: 'Execute raw SQL queries (security definer)'
    },
    {
        name: 'get_tables',
        arguments: "schema_name text DEFAULT 'public'::text",
        returnType: 'TABLE(table_name text, table_type text, row_count bigint)',
        description: 'List tables in a schema with row counts'
    },
    {
        name: 'get_l7_tenants',
        arguments: '',
        returnType: 'TABLE(...)',
        description: 'Get all L7 tenants'
    },
    {
        name: 'get_l7_leases',
        arguments: '',
        returnType: 'TABLE(...)',
        description: 'Get all L7 leases'
    },
    {
        name: 'get_l7_properties',
        arguments: '',
        returnType: 'TABLE(...)',
        description: 'Get all L7 properties'
    },
    {
        name: 'get_l7_units',
        arguments: '',
        returnType: 'TABLE(...)',
        description: 'Get all L7 units'
    },
    {
        name: 'get_l7_payments',
        arguments: 'p_limit integer DEFAULT 100',
        returnType: 'TABLE(...)',
        description: 'Get L7 payments with limit'
    },
];
// All available RPC functions (for reference)
export const ALL_FUNCTIONS = [
    '_admin_guard',
    '_ensure_constraint',
    '_ensure_trigger',
    '_set_updated_at',
    'admin_attach_unit_to_lease',
    'admin_change_user_role',
    'admin_change_user_role_secure',
    'admin_detach_unit_from_lease',
    'admin_restore',
    'admin_soft_delete',
    'admin_update_profile',
    'admin_upsert_lease',
    'assert_admin',
    'audit_profile_modifications',
    'audit_role_changes',
    'audit_security_vulnerabilities',
    'can_access_financial_data',
    'can_access_tenant',
    'can_access_tenant_data',
    'check_access_request_security',
    'check_security_health',
    'cleanup_admin_ping',
    'cleanup_old_audit_logs',
    'cleanup_rate_limits',
    'comprehensive_audit_test',
    'create_tenant_notification',
    'current_org_id',
    'detect_advanced_suspicious_activity',
    'detect_suspicious_activity',
    'enforce_financial_data_security',
    'exec_sql',
    'final_audit_test',
    'get_authorized_lease_data',
    'get_authorized_lease_units',
    'get_authorized_tenant_details',
    'get_available_properties',
    'get_current_user_role',
    'get_enhanced_security_health',
    'get_l7_lease_units',
    'get_l7_leases',
    'get_l7_payments',
    'get_l7_properties',
    'get_l7_tenants',
    'get_l7_units',
    'get_my_profile',
    'get_open_balances_for_property',
    'get_payment_history_for_property',
    'get_property_mismatch_details',
    'get_property_occupancy_counts',
    'get_security_alerts',
    'get_security_dashboard',
    'get_security_summary',
    'get_tables',
    'get_tenant_dashboard_data',
    'get_tenant_details',
    'get_tenant_units_with_leases',
    'get_user_profile_secure',
    'get_user_tenant_access',
    'get_user_tenant_id',
    'handle_new_user',
    'has_role',
    'hash_email_sha256',
    'is_admin',
    'is_current_user_admin',
    'list_open_rent_for_month',
    'list_overdue_rent_before',
    'log_admin_action',
    'log_data_access',
    'log_document_template_access',
    'log_financial_data_access_attempt',
    'log_profile_changes',
    'log_security_remediation',
    'log_sensitive_access',
    'log_sensitive_data_access',
    'log_signup_request_changes',
    'log_vendor_data_changes',
    'prevent_profile_enumeration',
    'profiles_guard_role',
    'record_payment',
    'send_newsletter_signup_notification',
    'set_user_app_metadata_role',
    'simple_audit_log',
    'simple_audit_test',
    'system_audit_log',
    'test_audit_logging',
    'trigger_set_updated_at',
    'update_claude_updated_at',
    'update_l7_lease',
    'update_l7_tenant',
    'update_profile_full_name',
    'update_updated_at_column',
    'user_exists_secure',
    'user_has_tenant',
    'validate_access_request',
    'validate_access_request_enhanced',
    'validate_document_access',
    'validate_security_context',
];
/**
 * Validate that an RPC function exists before calling it
 */
export function validateRpcFunction(name) {
    return ALL_FUNCTIONS.includes(name);
}
/**
 * Get suggestions for similar function names (for typo handling)
 */
export function suggestSimilarFunctions(name) {
    const lowercaseName = name.toLowerCase();
    return ALL_FUNCTIONS
        .filter(fn => fn.toLowerCase().includes(lowercaseName) || lowercaseName.includes(fn.toLowerCase().substring(0, 5)))
        .slice(0, 5);
}
//# sourceMappingURL=rpc-registry.js.map