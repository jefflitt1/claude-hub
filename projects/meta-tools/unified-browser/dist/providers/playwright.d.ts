/**
 * Playwright provider for unified-browser
 * Direct browser automation without routing to external MCP
 */
import { Browser, BrowserContext, Page } from 'playwright';
/**
 * Initialize or get the browser instance
 */
export declare function getBrowser(): Promise<Browser>;
/**
 * Initialize or get the browser context
 */
export declare function getContext(): Promise<BrowserContext>;
/**
 * Initialize or get the current page
 */
export declare function getPage(): Promise<Page>;
/**
 * Navigate to a URL
 */
export declare function navigate(url: string, options?: {
    waitFor?: string;
    timeout?: number;
}): Promise<{
    url: string;
    title: string;
}>;
/**
 * Click an element
 */
export declare function click(selector: string, options?: {
    button?: 'left' | 'right' | 'middle';
    doubleClick?: boolean;
}): Promise<void>;
/**
 * Type text into an element
 */
export declare function type(selector: string, text: string, options?: {
    submit?: boolean;
    slowly?: boolean;
}): Promise<void>;
/**
 * Take a screenshot
 */
export declare function screenshot(options?: {
    selector?: string;
    fullPage?: boolean;
    type?: 'png' | 'jpeg';
    path?: string;
}): Promise<Buffer>;
/**
 * Get accessibility snapshot (simplified)
 */
export declare function getSnapshot(): Promise<any>;
/**
 * Get page content as text
 */
export declare function getTextContent(): Promise<string>;
/**
 * Execute JavaScript on the page
 */
export declare function evaluate<T>(fn: string | (() => T)): Promise<T>;
/**
 * Wait for selector
 */
export declare function waitForSelector(selector: string, timeout?: number): Promise<void>;
/**
 * Close browser
 */
export declare function close(): Promise<void>;
/**
 * Get current browser state
 */
export declare function getState(): {
    hasBrowser: boolean;
    hasPage: boolean;
    currentUrl: string | null;
};
/**
 * Hover over an element
 */
export declare function hover(selector: string): Promise<void>;
/**
 * Select option from a dropdown
 */
export declare function selectOption(selector: string, values: string | string[]): Promise<string[]>;
/**
 * Press a key
 */
export declare function pressKey(key: string): Promise<void>;
/**
 * Navigate back
 */
export declare function goBack(): Promise<{
    url: string;
    title: string;
} | null>;
/**
 * List all tabs/pages
 */
export declare function listTabs(): Promise<{
    index: number;
    url: string;
    title: string;
    active: boolean;
}[]>;
/**
 * Create a new tab
 */
export declare function newTab(url?: string): Promise<{
    index: number;
    url: string;
    title: string;
}>;
/**
 * Close a tab
 */
export declare function closeTab(index?: number): Promise<boolean>;
/**
 * Select/switch to a tab
 */
export declare function selectTab(index: number): Promise<{
    url: string;
    title: string;
} | null>;
