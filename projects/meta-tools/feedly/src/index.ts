/**
 * Feedly MCP Server
 * Access your Feedly RSS feeds, collections, and articles via Claude
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const FEEDLY_ACCESS_TOKEN = process.env.FEEDLY_ACCESS_TOKEN || '';
const FEEDLY_API_BASE = 'https://cloud.feedly.com';

// Cache settings
const CACHE_TTL = parseInt(process.env.FEEDLY_CACHE_TTL_MS || '60000');

// Simple cache
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

  clear(): void {
    this.cache.clear();
  }

  stats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

const cache = new SimpleCache<any>(100, CACHE_TTL);

// Initialize MCP Server
const server = new McpServer({
  name: "feedly",
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

// Feedly API helper
async function feedlyApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  if (!FEEDLY_ACCESS_TOKEN) {
    throw new Error('FEEDLY_ACCESS_TOKEN not configured. Get your token from Feedly developer settings.');
  }

  const url = `${FEEDLY_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${FEEDLY_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Feedly API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Generate cache key
function cacheKey(prefix: string, params: Record<string, any>): string {
  return `${prefix}:${JSON.stringify(params)}`;
}

// Schema definitions
const streamSchema = {
  streamId: z.string().describe('Stream ID (e.g., user/<userId>/category/global.all for all, or feed/<feedUrl> for specific feed)'),
  count: z.number().optional().default(20).describe('Number of articles to return (max 100)'),
  unreadOnly: z.boolean().optional().default(false).describe('Only return unread articles'),
  newerThan: z.number().optional().describe('Only articles newer than this timestamp (ms)'),
  continuation: z.string().optional().describe('Continuation token for pagination')
};

const markReadSchema = {
  entryIds: z.array(z.string()).optional().describe('Array of entry IDs to mark as read'),
  feedIds: z.array(z.string()).optional().describe('Array of feed IDs to mark all as read'),
  categoryIds: z.array(z.string()).optional().describe('Array of category IDs to mark all as read'),
  asOf: z.number().optional().describe('Mark items as read if older than this timestamp (ms)')
};

const searchFeedsSchema = {
  query: z.string().describe('Search query for finding feeds'),
  count: z.number().optional().default(20).describe('Number of results to return')
};

// Tool: Get user profile
server.tool(
  "feedly_profile",
  "Get your Feedly user profile information",
  {},
  async () => {
    try {
      const cached = cache.get('profile');
      if (cached) return formatResponse({ source: 'cache', ...cached });

      const profile = await feedlyApi('/v3/profile');
      cache.set('profile', profile);
      return formatResponse(profile);
    } catch (error: any) {
      return formatResponse(`Error getting profile: ${error.message}`, true);
    }
  }
);

// Tool: Get all collections (categories with their feeds)
server.tool(
  "feedly_collections",
  "Get all your Feedly collections (categories) with their subscribed feeds",
  {},
  async () => {
    try {
      const cached = cache.get('collections');
      if (cached) return formatResponse({ source: 'cache', ...cached });

      const collections = await feedlyApi('/v3/collections');
      cache.set('collections', collections);

      // Format for readability
      const summary = collections.map((col: any) => ({
        id: col.id,
        label: col.label,
        feedCount: col.feeds?.length || 0,
        feeds: col.feeds?.map((f: any) => ({ title: f.title, website: f.website })) || []
      }));

      return formatResponse(summary);
    } catch (error: any) {
      return formatResponse(`Error getting collections: ${error.message}`, true);
    }
  }
);

// Tool: Get all subscriptions
server.tool(
  "feedly_subscriptions",
  "Get all your Feedly feed subscriptions",
  {},
  async () => {
    try {
      const cached = cache.get('subscriptions');
      if (cached) return formatResponse({ source: 'cache', ...cached });

      const subscriptions = await feedlyApi('/v3/subscriptions');
      cache.set('subscriptions', subscriptions);

      // Format for readability
      const summary = subscriptions.map((sub: any) => ({
        id: sub.id,
        title: sub.title,
        website: sub.website,
        categories: sub.categories?.map((c: any) => c.label) || [],
        updated: sub.updated ? new Date(sub.updated).toISOString() : null
      }));

      return formatResponse(summary);
    } catch (error: any) {
      return formatResponse(`Error getting subscriptions: ${error.message}`, true);
    }
  }
);

// Tool: Get unread counts
server.tool(
  "feedly_unread_counts",
  "Get unread article counts for all your feeds and categories",
  {},
  async () => {
    try {
      const counts = await feedlyApi('/v3/markers/counts');

      // Format for readability
      const summary = {
        maxUpdated: counts.max ? new Date(counts.max).toISOString() : null,
        unreadCounts: counts.unreadcounts?.map((c: any) => ({
          id: c.id,
          count: c.count,
          updated: c.updated ? new Date(c.updated).toISOString() : null
        })) || []
      };

      return formatResponse(summary);
    } catch (error: any) {
      return formatResponse(`Error getting unread counts: ${error.message}`, true);
    }
  }
);

// Tool: Get stream contents (articles)
server.tool(
  "feedly_stream",
  "Get articles from a Feedly stream (feed, category, or all). Use feedly_collections to find stream IDs.",
  streamSchema,
  async (args) => {
    try {
      const { streamId, count, unreadOnly, newerThan, continuation } = args;

      const params = new URLSearchParams({
        streamId: streamId,
        count: Math.min(count || 20, 100).toString()
      });

      if (unreadOnly) params.append('unreadOnly', 'true');
      if (newerThan) params.append('newerThan', newerThan.toString());
      if (continuation) params.append('continuation', continuation);

      const stream = await feedlyApi(`/v3/streams/contents?${params}`);

      // Format articles for readability
      const articles = stream.items?.map((item: any) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        origin: item.origin?.title,
        published: item.published ? new Date(item.published).toISOString() : null,
        unread: item.unread,
        url: item.alternate?.[0]?.href || item.canonicalUrl,
        summary: item.summary?.content?.substring(0, 300) || item.content?.content?.substring(0, 300)
      })) || [];

      return formatResponse({
        id: stream.id,
        title: stream.title,
        continuation: stream.continuation,
        articleCount: articles.length,
        articles
      });
    } catch (error: any) {
      return formatResponse(`Error getting stream: ${error.message}`, true);
    }
  }
);

// Tool: Get articles from all feeds (global.all)
server.tool(
  "feedly_all_articles",
  "Get your most recent articles across all subscriptions",
  {
    count: z.number().optional().default(20).describe('Number of articles to return (max 100)'),
    unreadOnly: z.boolean().optional().default(true).describe('Only return unread articles')
  },
  async (args) => {
    try {
      // First get user ID from profile
      let profile = cache.get('profile');
      if (!profile) {
        profile = await feedlyApi('/v3/profile');
        cache.set('profile', profile);
      }

      const userId = profile.id;
      const streamId = `user/${userId}/category/global.all`;

      const params = new URLSearchParams({
        streamId: streamId,
        count: Math.min(args.count || 20, 100).toString()
      });

      if (args.unreadOnly) params.append('unreadOnly', 'true');

      const stream = await feedlyApi(`/v3/streams/contents?${params}`);

      const articles = stream.items?.map((item: any) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        origin: item.origin?.title,
        published: item.published ? new Date(item.published).toISOString() : null,
        unread: item.unread,
        url: item.alternate?.[0]?.href || item.canonicalUrl,
        summary: item.summary?.content?.substring(0, 300) || item.content?.content?.substring(0, 300)
      })) || [];

      return formatResponse({
        continuation: stream.continuation,
        articleCount: articles.length,
        articles
      });
    } catch (error: any) {
      return formatResponse(`Error getting all articles: ${error.message}`, true);
    }
  }
);

// Tool: Mark as read
server.tool(
  "feedly_mark_read",
  "Mark articles, feeds, or categories as read",
  markReadSchema,
  async (args) => {
    try {
      const { entryIds, feedIds, categoryIds, asOf } = args;

      if (!entryIds?.length && !feedIds?.length && !categoryIds?.length) {
        return formatResponse('Must provide entryIds, feedIds, or categoryIds', true);
      }

      const body: any = {
        action: 'markAsRead'
      };

      if (entryIds?.length) {
        body.type = 'entries';
        body.entryIds = entryIds;
      } else if (feedIds?.length) {
        body.type = 'feeds';
        body.feedIds = feedIds;
        if (asOf) body.asOf = asOf;
      } else if (categoryIds?.length) {
        body.type = 'categories';
        body.categoryIds = categoryIds;
        if (asOf) body.asOf = asOf;
      }

      await feedlyApi('/v3/markers', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      // Clear relevant caches
      cache.clear();

      return formatResponse({ success: true, message: 'Marked as read' });
    } catch (error: any) {
      return formatResponse(`Error marking as read: ${error.message}`, true);
    }
  }
);

// Tool: Save article for later
server.tool(
  "feedly_save_for_later",
  "Save an article to your 'Saved For Later' collection",
  {
    entryId: z.string().describe('The article entry ID to save')
  },
  async (args) => {
    try {
      // Get user ID
      let profile = cache.get('profile');
      if (!profile) {
        profile = await feedlyApi('/v3/profile');
        cache.set('profile', profile);
      }

      const tagId = `user/${profile.id}/tag/global.saved`;

      await feedlyApi(`/v3/tags/${encodeURIComponent(tagId)}`, {
        method: 'PUT',
        body: JSON.stringify({ entryId: args.entryId })
      });

      return formatResponse({ success: true, message: 'Article saved for later' });
    } catch (error: any) {
      return formatResponse(`Error saving article: ${error.message}`, true);
    }
  }
);

// Tool: Search for feeds to subscribe
server.tool(
  "feedly_search_feeds",
  "Search for RSS feeds to potentially subscribe to",
  searchFeedsSchema,
  async (args) => {
    try {
      const params = new URLSearchParams({
        query: args.query,
        count: (args.count || 20).toString()
      });

      const results = await feedlyApi(`/v3/search/feeds?${params}`);

      const feeds = results.results?.map((feed: any) => ({
        id: feed.id,
        title: feed.title,
        website: feed.website,
        description: feed.description,
        subscribers: feed.subscribers,
        velocity: feed.velocity,
        lastUpdated: feed.lastUpdated ? new Date(feed.lastUpdated).toISOString() : null
      })) || [];

      return formatResponse({
        query: args.query,
        resultCount: feeds.length,
        feeds
      });
    } catch (error: any) {
      return formatResponse(`Error searching feeds: ${error.message}`, true);
    }
  }
);

// Tool: Get saved articles
server.tool(
  "feedly_saved_articles",
  "Get articles you've saved for later",
  {
    count: z.number().optional().default(20).describe('Number of articles to return')
  },
  async (args) => {
    try {
      // Get user ID
      let profile = cache.get('profile');
      if (!profile) {
        profile = await feedlyApi('/v3/profile');
        cache.set('profile', profile);
      }

      const streamId = `user/${profile.id}/tag/global.saved`;
      const params = new URLSearchParams({
        streamId: streamId,
        count: (args.count || 20).toString()
      });

      const stream = await feedlyApi(`/v3/streams/contents?${params}`);

      const articles = stream.items?.map((item: any) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        origin: item.origin?.title,
        published: item.published ? new Date(item.published).toISOString() : null,
        url: item.alternate?.[0]?.href || item.canonicalUrl,
        summary: item.summary?.content?.substring(0, 300)
      })) || [];

      return formatResponse({
        articleCount: articles.length,
        continuation: stream.continuation,
        articles
      });
    } catch (error: any) {
      return formatResponse(`Error getting saved articles: ${error.message}`, true);
    }
  }
);

// Tool: Get MCP info/status
server.tool(
  "feedly_info",
  "Get Feedly MCP server status and configuration info",
  {},
  async () => {
    const configured = !!FEEDLY_ACCESS_TOKEN;
    return formatResponse({
      name: "feedly-mcp",
      version: "1.0.0",
      configured,
      tokenConfigured: configured,
      cacheStats: cache.stats(),
      apiBase: FEEDLY_API_BASE,
      help: configured
        ? "Use feedly_collections to see your feeds, feedly_all_articles to get recent articles"
        : "Set FEEDLY_ACCESS_TOKEN environment variable. Get your token from: Feedly > Settings > Developer Access Token"
    });
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Feedly MCP server running on stdio");
}

main().catch(console.error);
