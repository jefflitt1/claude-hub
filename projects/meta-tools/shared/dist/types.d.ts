/**
 * Shared types for unified meta-tools
 */
export interface ToolResponse {
    content: Array<{
        type: 'text' | 'image';
        text?: string;
        data?: string;
        mimeType?: string;
    }>;
    isError?: boolean;
}
export interface ProviderSelection {
    provider: string;
    reason: string;
}
export interface MetricEntry {
    timestamp: number;
    tool: string;
    provider?: string;
    cacheHit: boolean;
    durationMs: number;
    success: boolean;
    error?: string;
}
export interface MetricsSummary {
    totalCalls: number;
    cacheHits: number;
    cacheHitRate: number;
    providerCalls: Record<string, number>;
    avgDurationMs: number;
    successRate: number;
    estimatedTokensSaved: number;
}
export interface CacheEntry<T> {
    value: T;
    expiresAt: number;
    createdAt: number;
}
export interface BrowserSession {
    id: string;
    provider: 'playwright' | 'puppeteer';
    createdAt: number;
    lastUsed: number;
    url?: string;
}
export interface NavigateParams {
    url: string;
    provider?: 'playwright' | 'puppeteer' | 'auto';
    waitFor?: string;
    timeout?: number;
}
export interface ClickParams {
    selector?: string;
    ref?: string;
    element?: string;
    button?: 'left' | 'right' | 'middle';
    doubleClick?: boolean;
}
export interface TypeParams {
    selector?: string;
    ref?: string;
    element?: string;
    text: string;
    submit?: boolean;
    slowly?: boolean;
}
export interface ScreenshotParams {
    selector?: string;
    ref?: string;
    element?: string;
    fullPage?: boolean;
    type?: 'png' | 'jpeg';
    filename?: string;
}
export interface SessionParams {
    action: 'create' | 'list' | 'close' | 'switch';
    sessionId?: string;
}
export interface SendMessageParams {
    to: string;
    subject?: string;
    body: string;
    account?: 'personal' | 'l7' | 'auto';
    cc?: string;
    bcc?: string;
}
export interface ListMessagesParams {
    account?: 'personal' | 'l7' | 'all';
    count?: number;
}
export interface SearchMessagesParams {
    query: string;
    account?: 'personal' | 'l7' | 'all';
}
export interface ResolveContactParams {
    identifier: string;
}
export interface L7QueryParams {
    source: 'supabase' | 'gdrive';
    query: string;
    table?: string;
    filters?: Record<string, any>;
    columns?: string;
    limit?: number;
}
export interface L7InsertParams {
    table: string;
    data: Record<string, any>;
}
export interface L7UpdateParams {
    table: string;
    data: Record<string, any>;
    filters: Record<string, any>;
}
export interface WorkflowTriggerParams {
    workflowId: string;
    data?: Record<string, any>;
}
export interface DocSearchParams {
    query: string;
    type?: 'docs' | 'sheets' | 'slides' | 'all';
}
export interface SyncParams {
    from: 'supabase' | 'gdrive';
    to: 'supabase' | 'gdrive';
    mapping: Record<string, string>;
}
//# sourceMappingURL=types.d.ts.map