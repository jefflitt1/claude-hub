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
export function selectProvider(context: RoutingContext): RoutingDecision {
  // If user explicitly specified a provider, use it
  if (context.preferredProvider) {
    return {
      provider: context.preferredProvider,
      reason: `User specified ${context.preferredProvider}`
    };
  }

  // Playwright is generally preferred for most tasks as it's more feature-rich
  // and has better MCP integration via the MCP_DOCKER gateway

  // Screenshot-only tasks can use either, but puppeteer is sometimes faster
  if (context.taskType === 'screenshot' && !context.requiresInteraction) {
    return {
      provider: 'puppeteer',
      reason: 'Puppeteer is efficient for standalone screenshots'
    };
  }

  // Interactive tasks always use playwright for better element handling
  if (context.requiresInteraction || context.taskType === 'click' || context.taskType === 'type') {
    return {
      provider: 'playwright',
      reason: 'Playwright has superior element interaction support'
    };
  }

  // Accessibility snapshots are playwright-specific
  if (context.taskType === 'snapshot') {
    return {
      provider: 'playwright',
      reason: 'Accessibility snapshots are a Playwright feature'
    };
  }

  // Session management uses playwright
  if (context.taskType === 'session') {
    return {
      provider: 'playwright',
      reason: 'Session management via Playwright tabs'
    };
  }

  // Default to playwright
  return {
    provider: 'playwright',
    reason: 'Default provider for navigation and general tasks'
  };
}

/**
 * Map unified tool names to provider-specific MCP tool names
 */
export function getProviderToolName(unifiedTool: string, provider: BrowserProvider): string {
  // The MCP_DOCKER gateway prefixes all tools with the provider name
  const toolMap: Record<string, Record<BrowserProvider, string>> = {
    'browser_navigate': {
      playwright: 'mcp__MCP_DOCKER__browser_navigate',
      puppeteer: 'mcp__MCP_DOCKER__browser_navigate'
    },
    'browser_click': {
      playwright: 'mcp__MCP_DOCKER__browser_click',
      puppeteer: 'mcp__MCP_DOCKER__browser_click'
    },
    'browser_type': {
      playwright: 'mcp__MCP_DOCKER__browser_type',
      puppeteer: 'mcp__MCP_DOCKER__browser_type'
    },
    'browser_screenshot': {
      playwright: 'mcp__MCP_DOCKER__browser_take_screenshot',
      puppeteer: 'mcp__MCP_DOCKER__browser_take_screenshot'
    },
    'browser_snapshot': {
      playwright: 'mcp__MCP_DOCKER__browser_snapshot',
      puppeteer: 'mcp__MCP_DOCKER__browser_snapshot'
    },
    'browser_session': {
      playwright: 'mcp__MCP_DOCKER__browser_tabs',
      puppeteer: 'mcp__MCP_DOCKER__browser_tabs'
    }
  };

  return toolMap[unifiedTool]?.[provider] ?? unifiedTool;
}

/**
 * Check if a URL is likely to need JavaScript interaction
 */
export function requiresJavaScript(url?: string): boolean {
  if (!url) return true; // Assume yes if unknown

  // Single Page Application indicators
  const spaIndicators = [
    'angular',
    'react',
    'vue',
    'next',
    'nuxt',
    'gatsby',
    'svelte'
  ];

  const lowerUrl = url.toLowerCase();

  // Check for common SPA platforms
  if (spaIndicators.some(indicator => lowerUrl.includes(indicator))) {
    return true;
  }

  // Common sites that need JS
  const jsRequiredSites = [
    'twitter.com',
    'x.com',
    'facebook.com',
    'instagram.com',
    'linkedin.com',
    'github.com',
    'gmail.com',
    'google.com/search',
    'youtube.com'
  ];

  return jsRequiredSites.some(site => lowerUrl.includes(site));
}
