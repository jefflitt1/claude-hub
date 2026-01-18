/**
 * Metrics tracking for meta-tools
 * Tracks usage, cache hits, and estimates token savings
 */
import { MetricEntry, MetricsSummary } from './types.js';
declare class MetricsTracker {
    private entries;
    private loaded;
    /**
     * Load existing metrics from disk
     */
    private load;
    /**
     * Save metrics to disk
     */
    private save;
    /**
     * Record a tool invocation
     */
    record(entry: Omit<MetricEntry, 'timestamp'>): void;
    /**
     * Get summary statistics
     */
    getSummary(toolFilter?: string, hoursBack?: number): MetricsSummary;
    /**
     * Get recent entries for debugging
     */
    getRecentEntries(count?: number): MetricEntry[];
    /**
     * Clear all metrics
     */
    clear(): void;
}
export declare const metrics: MetricsTracker;
/**
 * Helper to wrap a tool handler with metrics tracking
 */
export declare function withMetrics<T extends (...args: any[]) => Promise<any>>(toolName: string, handler: T, options?: {
    provider?: string;
    checkCache?: () => boolean;
}): T;
export {};
//# sourceMappingURL=metrics.d.ts.map