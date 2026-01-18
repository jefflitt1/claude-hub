/**
 * Unified Browser MCP Server
 * Self-contained browser automation using embedded Playwright
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as playwright from './providers/playwright.js';
// Initialize MCP Server
const server = new McpServer({
    name: "unified-browser",
    version: "2.0.0",
}, {
    capabilities: {
        tools: {}
    }
});
// Schema definitions
const navigateSchema = {
    url: z.string().describe('The URL to navigate to'),
    waitFor: z.string().optional().describe('CSS selector to wait for after navigation'),
    timeout: z.number().optional().describe('Navigation timeout in milliseconds')
};
const clickSchema = {
    selector: z.string().describe('CSS selector for element to click'),
    button: z.enum(['left', 'right', 'middle']).optional().default('left'),
    doubleClick: z.boolean().optional().default(false)
};
const typeSchema = {
    selector: z.string().describe('CSS selector for input element'),
    text: z.string().describe('Text to type'),
    submit: z.boolean().optional().default(false).describe('Press Enter after typing'),
    slowly: z.boolean().optional().default(false).describe('Type character by character')
};
const screenshotSchema = {
    selector: z.string().optional().describe('CSS selector (viewport if not provided)'),
    fullPage: z.boolean().optional().default(false),
    type: z.enum(['png', 'jpeg']).optional().default('png')
};
const waitSchema = {
    selector: z.string().describe('CSS selector to wait for'),
    timeout: z.number().optional().describe('Timeout in milliseconds')
};
const evaluateSchema = {
    script: z.string().describe('JavaScript code to execute on the page')
};
// Helper function to format tool responses
function formatResponse(data, isError = false) {
    return {
        content: [{
                type: 'text',
                text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
            }],
        ...(isError && { isError: true })
    };
}
// Tools
server.tool("browser_navigate", "Navigate to a URL and wait for page load", navigateSchema, async (args) => {
    try {
        const { url, waitFor, timeout } = args;
        const result = await playwright.navigate(url, { waitFor, timeout });
        return formatResponse({
            action: 'navigate',
            success: true,
            url: result.url,
            title: result.title
        });
    }
    catch (error) {
        return formatResponse(`Navigation error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("browser_click", "Click an element on the page", clickSchema, async (args) => {
    try {
        const { selector, button, doubleClick } = args;
        await playwright.click(selector, { button, doubleClick });
        return formatResponse({
            action: 'click',
            success: true,
            selector,
            button,
            doubleClick
        });
    }
    catch (error) {
        return formatResponse(`Click error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("browser_type", "Type text into an input element", typeSchema, async (args) => {
    try {
        const { selector, text, submit, slowly } = args;
        await playwright.type(selector, text, { submit, slowly });
        return formatResponse({
            action: 'type',
            success: true,
            selector,
            textLength: text.length,
            submitted: submit
        });
    }
    catch (error) {
        return formatResponse(`Type error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("browser_screenshot", "Take a screenshot of the page or element", screenshotSchema, async (args) => {
    try {
        const { selector, fullPage, type } = args;
        const buffer = await playwright.screenshot({
            selector,
            fullPage,
            type
        });
        // Return as base64 image
        return {
            content: [{
                    type: 'image',
                    data: buffer.toString('base64'),
                    mimeType: type === 'jpeg' ? 'image/jpeg' : 'image/png'
                }]
        };
    }
    catch (error) {
        return formatResponse(`Screenshot error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("browser_snapshot", "Get accessibility snapshot and page structure", {}, async () => {
    try {
        const snapshot = await playwright.getSnapshot();
        return formatResponse({
            action: 'snapshot',
            success: true,
            ...snapshot
        });
    }
    catch (error) {
        return formatResponse(`Snapshot error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("browser_wait", "Wait for an element to appear", waitSchema, async (args) => {
    try {
        const { selector, timeout } = args;
        await playwright.waitForSelector(selector, timeout);
        return formatResponse({
            action: 'wait',
            success: true,
            selector,
            found: true
        });
    }
    catch (error) {
        return formatResponse(`Wait error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("browser_evaluate", "Execute JavaScript on the page", evaluateSchema, async (args) => {
    try {
        const { script } = args;
        const result = await playwright.evaluate(script);
        return formatResponse({
            action: 'evaluate',
            success: true,
            result
        });
    }
    catch (error) {
        return formatResponse(`Evaluate error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("browser_content", "Get the text content of the current page", {}, async () => {
    try {
        const content = await playwright.getTextContent();
        return formatResponse({
            action: 'content',
            success: true,
            content: content.substring(0, 10000), // Limit to 10k chars
            truncated: content.length > 10000
        });
    }
    catch (error) {
        return formatResponse(`Content error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("browser_close", "Close the browser session", {}, async () => {
    try {
        await playwright.close();
        return formatResponse({
            action: 'close',
            success: true,
            message: 'Browser session closed'
        });
    }
    catch (error) {
        return formatResponse(`Close error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
});
server.tool("browser_info", "Get browser session status", {}, async () => {
    const state = playwright.getState();
    return formatResponse({
        name: 'unified-browser',
        version: '2.0.0',
        description: 'Self-contained browser automation with embedded Playwright',
        state,
        capabilities: [
            'navigate', 'click', 'type', 'screenshot', 'snapshot',
            'wait', 'evaluate', 'content', 'close'
        ]
    });
});
// Cleanup on exit
process.on('SIGINT', async () => {
    await playwright.close();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await playwright.close();
    process.exit(0);
});
// Start the server
async function startServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
startServer().catch(console.error);
//# sourceMappingURL=index.js.map