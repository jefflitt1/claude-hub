/**
 * Metrics tracking for meta-tools
 * Tracks usage, cache hits, and estimates token savings
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { MetricEntry, MetricsSummary } from './types.js';

const METRICS_FILE = join(homedir(), '.claude', 'meta-tool-metrics.json');

// Estimated tokens per tool call (based on typical response sizes)
const ESTIMATED_TOKENS_PER_CALL: Record<string, number> = {
  'browser_navigate': 500,
  'browser_click': 200,
  'browser_type': 200,
  'browser_screenshot': 1000,
  'browser_snapshot': 2000,
  'message_send': 300,
  'message_list': 1500,
  'message_search': 1000,
  'l7_query': 800,
  'l7_insert': 200,
  'l7_update': 200,
  'l7_workflow_trigger': 400,
  'l7_doc_search': 600,
  'default': 500
};

class MetricsTracker {
  private entries: MetricEntry[] = [];
  private loaded = false;

  /**
   * Load existing metrics from disk
   */
  private load(): void {
    if (this.loaded) return;

    try {
      if (existsSync(METRICS_FILE)) {
        const data = readFileSync(METRICS_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        this.entries = parsed.entries || [];
      }
    } catch {
      this.entries = [];
    }
    this.loaded = true;
  }

  /**
   * Save metrics to disk
   */
  private save(): void {
    try {
      // Keep only last 1000 entries to prevent unbounded growth
      if (this.entries.length > 1000) {
        this.entries = this.entries.slice(-1000);
      }

      writeFileSync(METRICS_FILE, JSON.stringify({
        lastUpdated: new Date().toISOString(),
        entries: this.entries
      }, null, 2));
    } catch (error) {
      // Silently fail - metrics are non-critical
    }
  }

  /**
   * Record a tool invocation
   */
  record(entry: Omit<MetricEntry, 'timestamp'>): void {
    this.load();

    const fullEntry: MetricEntry = {
      ...entry,
      timestamp: Date.now()
    };

    this.entries.push(fullEntry);
    this.save();
  }

  /**
   * Get summary statistics
   */
  getSummary(toolFilter?: string, hoursBack = 24): MetricsSummary {
    this.load();

    const cutoff = Date.now() - (hoursBack * 60 * 60 * 1000);
    let filtered = this.entries.filter(e => e.timestamp > cutoff);

    if (toolFilter) {
      filtered = filtered.filter(e => e.tool === toolFilter);
    }

    if (filtered.length === 0) {
      return {
        totalCalls: 0,
        cacheHits: 0,
        cacheHitRate: 0,
        providerCalls: {},
        avgDurationMs: 0,
        successRate: 0,
        estimatedTokensSaved: 0
      };
    }

    const cacheHits = filtered.filter(e => e.cacheHit).length;
    const successCount = filtered.filter(e => e.success).length;
    const totalDuration = filtered.reduce((sum, e) => sum + e.durationMs, 0);

    const providerCalls: Record<string, number> = {};
    for (const entry of filtered) {
      if (entry.provider) {
        providerCalls[entry.provider] = (providerCalls[entry.provider] || 0) + 1;
      }
    }

    // Estimate tokens saved from cache hits
    let tokensSaved = 0;
    for (const entry of filtered) {
      if (entry.cacheHit) {
        tokensSaved += ESTIMATED_TOKENS_PER_CALL[entry.tool] || ESTIMATED_TOKENS_PER_CALL.default;
      }
    }

    return {
      totalCalls: filtered.length,
      cacheHits,
      cacheHitRate: cacheHits / filtered.length,
      providerCalls,
      avgDurationMs: totalDuration / filtered.length,
      successRate: successCount / filtered.length,
      estimatedTokensSaved: tokensSaved
    };
  }

  /**
   * Get recent entries for debugging
   */
  getRecentEntries(count = 10): MetricEntry[] {
    this.load();
    return this.entries.slice(-count);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.entries = [];
    this.save();
  }
}

// Singleton instance
export const metrics = new MetricsTracker();

/**
 * Helper to wrap a tool handler with metrics tracking
 */
export function withMetrics<T extends (...args: any[]) => Promise<any>>(
  toolName: string,
  handler: T,
  options: { provider?: string; checkCache?: () => boolean } = {}
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const cacheHit = options.checkCache?.() ?? false;

    try {
      const result = await handler(...args);

      metrics.record({
        tool: toolName,
        provider: options.provider,
        cacheHit,
        durationMs: Date.now() - startTime,
        success: true
      });

      return result;
    } catch (error) {
      metrics.record({
        tool: toolName,
        provider: options.provider,
        cacheHit,
        durationMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }) as T;
}
