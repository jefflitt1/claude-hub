/**
 * Smart routing logic for browser provider selection
 * Routes requests to the most appropriate browser backend
 */
export type BrowserProvider = 'playwright' | 'puppeteer';
export interface RoutingContext {
    taskType: 'navigate' | 'click' | 'type' | 'screenshot' | 'snapshot' | 'session';
    url?: string;
    requiresInteraction?: boolean;
    requiresScreenshot?: boolean;
    preferredProvider?: BrowserProvider;
}
export interface RoutingDecision {
    provider: BrowserProvider;
    reason: string;
}
/**
 * Select the best browser provider based on task context
 */
export declare function selectProvider(context: RoutingContext): RoutingDecision;
/**
 * Map unified tool names to provider-specific MCP tool names
 */
export declare function getProviderToolName(unifiedTool: string, provider: BrowserProvider): string;
/**
 * Check if a URL is likely to need JavaScript interaction
 */
export declare function requiresJavaScript(url?: string): boolean;
