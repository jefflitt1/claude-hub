/**
 * Supabase RPC Function Registry
 * Auto-generated list of available RPC functions for validation
 *
 * This registry helps prevent "function not found" errors by validating
 * RPC calls before execution.
 */
export interface RpcFunction {
    name: string;
    arguments: string;
    returnType: string;
    description?: string;
}
export declare const CORE_FUNCTIONS: RpcFunction[];
export declare const ALL_FUNCTIONS: string[];
/**
 * Validate that an RPC function exists before calling it
 */
export declare function validateRpcFunction(name: string): boolean;
/**
 * Get suggestions for similar function names (for typo handling)
 */
export declare function suggestSimilarFunctions(name: string): string[];
