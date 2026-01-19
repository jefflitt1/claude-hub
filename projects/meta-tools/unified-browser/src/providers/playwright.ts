/**
 * Playwright provider for unified-browser
 * Direct browser automation without routing to external MCP
 */

import { chromium, Browser, BrowserContext, Page, ElementHandle } from 'playwright';

// Singleton browser instance
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

/**
 * Initialize or get the browser instance
 */
export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

/**
 * Initialize or get the browser context
 */
export async function getContext(): Promise<BrowserContext> {
  if (!context) {
    const b = await getBrowser();
    context = await b.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
  }
  return context;
}

/**
 * Initialize or get the current page
 */
export async function getPage(): Promise<Page> {
  if (!page || page.isClosed()) {
    const ctx = await getContext();
    page = await ctx.newPage();
  }
  return page;
}

/**
 * Navigate to a URL
 */
export async function navigate(url: string, options?: {
  waitFor?: string;
  timeout?: number;
}): Promise<{ url: string; title: string }> {
  const p = await getPage();

  await p.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: options?.timeout || 30000
  });

  if (options?.waitFor) {
    await p.waitForSelector(options.waitFor, { timeout: options.timeout || 10000 });
  }

  return {
    url: p.url(),
    title: await p.title()
  };
}

/**
 * Click an element
 */
export async function click(selector: string, options?: {
  button?: 'left' | 'right' | 'middle';
  doubleClick?: boolean;
}): Promise<void> {
  const p = await getPage();

  if (options?.doubleClick) {
    await p.dblclick(selector, { button: options?.button || 'left' });
  } else {
    await p.click(selector, { button: options?.button || 'left' });
  }
}

/**
 * Type text into an element
 */
export async function type(selector: string, text: string, options?: {
  submit?: boolean;
  slowly?: boolean;
}): Promise<void> {
  const p = await getPage();

  if (options?.slowly) {
    await p.type(selector, text, { delay: 50 });
  } else {
    await p.fill(selector, text);
  }

  if (options?.submit) {
    await p.press(selector, 'Enter');
  }
}

/**
 * Take a screenshot
 */
export async function screenshot(options?: {
  selector?: string;
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
  path?: string;
}): Promise<Buffer> {
  const p = await getPage();

  if (options?.selector) {
    const element = await p.$(options.selector);
    if (!element) {
      throw new Error(`Element not found: ${options.selector}`);
    }
    return await element.screenshot({
      type: options.type || 'png',
      path: options.path
    });
  }

  return await p.screenshot({
    fullPage: options?.fullPage || false,
    type: options?.type || 'png',
    path: options?.path
  });
}

/**
 * Get accessibility snapshot (simplified)
 */
export async function getSnapshot(): Promise<any> {
  const p = await getPage();

  // Get accessibility tree using locator aria snapshot (newer API)
  // Falls back to basic page info if not available
  let accessibilityTree = null;
  try {
    accessibilityTree = await p.locator('body').ariaSnapshot();
  } catch {
    // Fallback: get basic structure
    accessibilityTree = await p.evaluate(() => {
      const getTree = (el: Element, depth = 0): any => {
        if (depth > 5) return null;
        return {
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          name: el.getAttribute('aria-label') || (el as HTMLElement).innerText?.substring(0, 50),
          children: Array.from(el.children).slice(0, 10).map(c => getTree(c, depth + 1)).filter(Boolean)
        };
      };
      return getTree(document.body);
    });
  }

  return {
    url: p.url(),
    title: await p.title(),
    accessibilityTree
  };
}

/**
 * Get page content as text
 */
export async function getTextContent(): Promise<string> {
  const p = await getPage();
  return await p.innerText('body');
}

/**
 * Execute JavaScript on the page
 */
export async function evaluate<T>(fn: string | (() => T)): Promise<T> {
  const p = await getPage();
  return await p.evaluate(fn);
}

/**
 * Wait for selector
 */
export async function waitForSelector(selector: string, timeout?: number): Promise<void> {
  const p = await getPage();
  await p.waitForSelector(selector, { timeout: timeout || 30000 });
}

/**
 * Close browser
 */
export async function close(): Promise<void> {
  if (page && !page.isClosed()) {
    await page.close();
  }
  page = null;

  if (context) {
    await context.close();
  }
  context = null;

  if (browser) {
    await browser.close();
  }
  browser = null;
}

/**
 * Get current browser state
 */
export function getState(): {
  hasBrowser: boolean;
  hasPage: boolean;
  currentUrl: string | null;
} {
  return {
    hasBrowser: browser !== null,
    hasPage: page !== null && !page.isClosed(),
    currentUrl: page && !page.isClosed() ? page.url() : null
  };
}

/**
 * Hover over an element
 */
export async function hover(selector: string): Promise<void> {
  const p = await getPage();
  await p.hover(selector);
}

/**
 * Select option from a dropdown
 */
export async function selectOption(selector: string, values: string | string[]): Promise<string[]> {
  const p = await getPage();
  return await p.selectOption(selector, values);
}

/**
 * Press a key
 */
export async function pressKey(key: string): Promise<void> {
  const p = await getPage();
  await p.keyboard.press(key);
}

/**
 * Navigate back
 */
export async function goBack(): Promise<{ url: string; title: string } | null> {
  const p = await getPage();
  const response = await p.goBack();
  if (!response) return null;
  return {
    url: p.url(),
    title: await p.title()
  };
}

/**
 * List all tabs/pages
 */
export async function listTabs(): Promise<{ index: number; url: string; title: string; active: boolean }[]> {
  const ctx = await getContext();
  const pages = ctx.pages();
  const currentPage = page;

  return Promise.all(pages.map(async (p, index) => ({
    index,
    url: p.url(),
    title: await p.title(),
    active: p === currentPage
  })));
}

/**
 * Create a new tab
 */
export async function newTab(url?: string): Promise<{ index: number; url: string; title: string }> {
  const ctx = await getContext();
  const newPage = await ctx.newPage();
  page = newPage; // Make new tab active

  if (url) {
    await newPage.goto(url, { waitUntil: 'domcontentloaded' });
  }

  const pages = ctx.pages();
  return {
    index: pages.indexOf(newPage),
    url: newPage.url(),
    title: await newPage.title()
  };
}

/**
 * Close a tab
 */
export async function closeTab(index?: number): Promise<boolean> {
  const ctx = await getContext();
  const pages = ctx.pages();

  const targetIndex = index ?? pages.indexOf(page!);
  if (targetIndex < 0 || targetIndex >= pages.length) {
    return false;
  }

  const targetPage = pages[targetIndex];
  const wasActive = targetPage === page;

  await targetPage.close();

  // If we closed the active tab, switch to another
  if (wasActive && pages.length > 1) {
    const remainingPages = ctx.pages();
    page = remainingPages[Math.min(targetIndex, remainingPages.length - 1)] || null;
  }

  return true;
}

/**
 * Select/switch to a tab
 */
export async function selectTab(index: number): Promise<{ url: string; title: string } | null> {
  const ctx = await getContext();
  const pages = ctx.pages();

  if (index < 0 || index >= pages.length) {
    return null;
  }

  page = pages[index];
  await page.bringToFront();

  return {
    url: page.url(),
    title: await page.title()
  };
}
