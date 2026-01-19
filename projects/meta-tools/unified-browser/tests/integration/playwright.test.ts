/**
 * Integration tests for unified-browser Playwright functionality
 * Verifies:
 * 1. Playwright is installed
 * 2. Browser can launch
 * 3. Basic navigation works
 */

import { describe, it, expect, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';

let browser: Browser | null = null;
let page: Page | null = null;

afterAll(async () => {
  if (page) await page.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
});

describe('Playwright Installation', () => {
  it('should have chromium available', async () => {
    // This will throw if playwright browsers aren't installed
    browser = await chromium.launch({ headless: true });
    expect(browser).toBeDefined();
    expect(browser.isConnected()).toBe(true);
  });
});

describe('Browser Operations', () => {
  it('should create a new page', async () => {
    if (!browser) {
      browser = await chromium.launch({ headless: true });
    }

    page = await browser.newPage();
    expect(page).toBeDefined();
  });

  it('should navigate to a URL', async () => {
    if (!page) {
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();
    }

    // Use a reliable test URL
    await page.goto('https://example.com');

    const title = await page.title();
    expect(title).toContain('Example');
  });

  it('should take a screenshot', async () => {
    if (!page) {
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();
      await page.goto('https://example.com');
    }

    const screenshot = await page.screenshot({ type: 'png' });
    expect(screenshot).toBeInstanceOf(Buffer);
    expect(screenshot.length).toBeGreaterThan(0);
  });

  it('should get page content', async () => {
    if (!page) {
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();
      await page.goto('https://example.com');
    }

    const content = await page.content();
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('Example Domain');
  });

  it('should evaluate JavaScript', async () => {
    if (!page) {
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();
      await page.goto('https://example.com');
    }

    const result = await page.evaluate(() => {
      return document.title;
    });

    expect(result).toContain('Example');
  });
});

describe('Tab Management', () => {
  it('should create multiple tabs', async () => {
    if (!browser) {
      browser = await chromium.launch({ headless: true });
    }

    // Create a fresh context for tab testing
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    expect(context.pages().length).toBeGreaterThanOrEqual(2);

    await context.close();
  });
});
