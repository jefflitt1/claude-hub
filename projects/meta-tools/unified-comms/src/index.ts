/**
 * Unified Communications MCP Server v2.0.0
 * Self-contained Gmail integration with OAuth support
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from 'dotenv';
import * as gmail from './providers/gmail.js';

dotenv.config();

// Configuration
const PERSONAL_EMAIL = process.env.PERSONAL_EMAIL || 'jglittell@gmail.com';
const L7_EMAIL = process.env.L7_EMAIL || 'jeff@jglcap.com';
const DEFAULT_ACCOUNT = process.env.DEFAULT_ACCOUNT || 'personal';

// Domain routing rules
const L7_DOMAINS = (process.env.L7_DOMAINS || 'jglcap.com,l7-partners.com')
  .split(',')
  .map(d => d.trim().toLowerCase());

// Keywords that suggest L7 business context
const L7_KEYWORDS = (process.env.L7_KEYWORDS || 'property,tenant,lease,rent,maintenance,l7,jgl capital')
  .split(',')
  .map(k => k.trim().toLowerCase());

type AccountType = 'personal' | 'l7';

// Account routing
interface RoutingDecision {
  account: AccountType;
  email: string;
  reason: string;
}

/**
 * Determine which account to use based on context
 */
function routeAccount(params: {
  to?: string;
  subject?: string;
  body?: string;
  preferredAccount?: AccountType | 'auto';
}): RoutingDecision {
  const { to, subject, body, preferredAccount } = params;

  // If explicitly specified, use that account
  if (preferredAccount && preferredAccount !== 'auto') {
    return {
      account: preferredAccount,
      email: preferredAccount === 'l7' ? L7_EMAIL : PERSONAL_EMAIL,
      reason: `Explicitly requested ${preferredAccount} account`
    };
  }

  // Check recipient domain for L7
  if (to) {
    const recipientDomain = to.split('@')[1]?.toLowerCase();
    if (recipientDomain && L7_DOMAINS.some(d => recipientDomain.includes(d))) {
      return {
        account: 'l7',
        email: L7_EMAIL,
        reason: `Recipient domain ${recipientDomain} matches L7 domains`
      };
    }
  }

  // Check content for L7 keywords
  const content = `${subject || ''} ${body || ''}`.toLowerCase();
  const matchedKeyword = L7_KEYWORDS.find(k => content.includes(k));
  if (matchedKeyword) {
    return {
      account: 'l7',
      email: L7_EMAIL,
      reason: `Content contains L7 keyword: "${matchedKeyword}"`
    };
  }

  // Default to configured default
  const defaultAcc = DEFAULT_ACCOUNT as AccountType;
  return {
    account: defaultAcc,
    email: defaultAcc === 'l7' ? L7_EMAIL : PERSONAL_EMAIL,
    reason: `Default account (${DEFAULT_ACCOUNT})`
  };
}

// Initialize MCP Server
const server = new McpServer({
  name: "unified-comms",
  version: "2.0.0",
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

// Schema definitions
const sendMessageSchema = {
  to: z.string().describe('Recipient email address'),
  subject: z.string().optional().describe('Email subject'),
  body: z.string().describe('Email body content'),
  account: z.enum(['personal', 'l7', 'auto']).optional().default('auto')
    .describe('Which account to send from (auto for smart routing)'),
  cc: z.string().optional().describe('CC recipients'),
  bcc: z.string().optional().describe('BCC recipients')
};

const listMessagesSchema = {
  account: z.enum(['personal', 'l7', 'all']).optional().default('all')
    .describe('Which account(s) to list from'),
  count: z.number().optional().default(10).describe('Number of messages to retrieve')
};

const searchMessagesSchema = {
  query: z.string().describe('Search query (supports Gmail search syntax)'),
  account: z.enum(['personal', 'l7', 'all']).optional().default('all')
    .describe('Which account(s) to search')
};

const getMessageSchema = {
  messageId: z.string().describe('Message ID to retrieve'),
  account: z.enum(['personal', 'l7']).describe('Which account the message is in')
};

const resolveContactSchema = {
  identifier: z.string().describe('Name, email, or partial identifier to resolve')
};

const oauthSetupSchema = {
  account: z.enum(['personal', 'l7']).describe('Which account to set up'),
  authorizationCode: z.string().optional().describe('OAuth authorization code (if completing setup)')
};

// Tools

server.tool(
  "message_send",
  "Send an email with automatic account routing based on context",
  sendMessageSchema,
  async (args) => {
    try {
      const { to, subject, body, account, cc, bcc } = args;

      // Route to appropriate account
      const routing = routeAccount({
        to,
        subject,
        body,
        preferredAccount: account
      });

      // Check if account is configured
      if (!gmail.isAccountConfigured(routing.account)) {
        return formatResponse({
          error: `${routing.account} account not configured`,
          action: 'oauth_required',
          routing,
          instruction: `Run comms_oauth_setup with account="${routing.account}" to get the OAuth URL, then complete authentication.`
        }, true);
      }

      // Send the email directly
      const result = await gmail.sendEmail(routing.account, {
        to,
        subject: subject || '(No subject)',
        body,
        cc,
        bcc
      });

      if (!result.success) {
        return formatResponse({
          action: 'send_failed',
          routing,
          error: result.error
        }, true);
      }

      return formatResponse({
        action: 'message_sent',
        success: true,
        messageId: result.messageId,
        routing: {
          account: routing.account,
          fromEmail: routing.email,
          reason: routing.reason
        },
        to,
        subject: subject || '(No subject)'
      });
    } catch (error) {
      return formatResponse(`Send error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "message_list",
  "List recent messages from one or both email accounts",
  listMessagesSchema,
  async (args) => {
    try {
      const { account, count } = args;

      const results: any = {
        action: 'list_messages',
        accounts: []
      };

      if (account === 'all' || account === 'personal') {
        if (gmail.isAccountConfigured('personal')) {
          const personalMessages = await gmail.listMessages('personal', count);
          results.accounts.push({
            account: 'personal',
            email: PERSONAL_EMAIL,
            ...personalMessages
          });
        } else {
          results.accounts.push({
            account: 'personal',
            email: PERSONAL_EMAIL,
            configured: false,
            error: 'Account not configured. Run comms_oauth_setup.'
          });
        }
      }

      if (account === 'all' || account === 'l7') {
        if (gmail.isAccountConfigured('l7')) {
          const l7Messages = await gmail.listMessages('l7', count);
          results.accounts.push({
            account: 'l7',
            email: L7_EMAIL,
            ...l7Messages
          });
        } else {
          results.accounts.push({
            account: 'l7',
            email: L7_EMAIL,
            configured: false,
            error: 'Account not configured. Run comms_oauth_setup.'
          });
        }
      }

      return formatResponse(results);
    } catch (error) {
      return formatResponse(`List error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "message_search",
  "Search for messages across email accounts",
  searchMessagesSchema,
  async (args) => {
    try {
      const { query, account } = args;

      const results: any = {
        action: 'search_messages',
        query,
        accounts: []
      };

      if (account === 'all' || account === 'personal') {
        if (gmail.isAccountConfigured('personal')) {
          const personalResults = await gmail.searchMessages('personal', query);
          results.accounts.push({
            account: 'personal',
            email: PERSONAL_EMAIL,
            ...personalResults
          });
        } else {
          results.accounts.push({
            account: 'personal',
            email: PERSONAL_EMAIL,
            configured: false,
            error: 'Account not configured'
          });
        }
      }

      if (account === 'all' || account === 'l7') {
        if (gmail.isAccountConfigured('l7')) {
          const l7Results = await gmail.searchMessages('l7', query);
          results.accounts.push({
            account: 'l7',
            email: L7_EMAIL,
            ...l7Results
          });
        } else {
          results.accounts.push({
            account: 'l7',
            email: L7_EMAIL,
            configured: false,
            error: 'Account not configured'
          });
        }
      }

      return formatResponse(results);
    } catch (error) {
      return formatResponse(`Search error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "message_get",
  "Get full details of a specific message",
  getMessageSchema,
  async (args) => {
    try {
      const { messageId, account } = args;

      if (!gmail.isAccountConfigured(account)) {
        return formatResponse({
          error: `${account} account not configured`,
          action: 'oauth_required'
        }, true);
      }

      const result = await gmail.getMessage(account, messageId);

      if (!result.success) {
        return formatResponse({
          action: 'get_failed',
          error: result.error
        }, true);
      }

      return formatResponse({
        action: 'message_retrieved',
        account,
        message: result.message
      });
    } catch (error) {
      return formatResponse(`Get error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "contact_resolve",
  "Resolve a contact identifier to an email address and suggest the appropriate account",
  resolveContactSchema,
  async (args) => {
    try {
      const { identifier } = args;

      // Check if it's already an email
      if (identifier.includes('@')) {
        const routing = routeAccount({ to: identifier });
        return formatResponse({
          action: 'contact_resolved',
          input: identifier,
          resolved: {
            email: identifier,
            suggestedAccount: routing.account,
            reason: routing.reason
          }
        });
      }

      // Common contact resolution (could be extended with a contacts database)
      const knownContacts: Record<string, { email: string; account: AccountType }> = {
        'jeff': { email: L7_EMAIL, account: 'l7' },
        'personal': { email: PERSONAL_EMAIL, account: 'personal' }
      };

      const lowerIdentifier = identifier.toLowerCase();
      for (const [name, contact] of Object.entries(knownContacts)) {
        if (lowerIdentifier.includes(name)) {
          return formatResponse({
            action: 'contact_resolved',
            input: identifier,
            resolved: {
              email: contact.email,
              suggestedAccount: contact.account,
              matchedName: name
            }
          });
        }
      }

      return formatResponse({
        action: 'contact_not_found',
        input: identifier,
        suggestion: 'Could not resolve contact. Please provide a full email address.',
        searchSuggestion: `Try searching messages with: message_search(query: "from:${identifier}")`
      });
    } catch (error) {
      return formatResponse(`Resolve error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

server.tool(
  "comms_oauth_setup",
  "Set up or complete OAuth authentication for an email account",
  oauthSetupSchema,
  async (args) => {
    try {
      const { account, authorizationCode } = args;

      // If authorization code provided, complete the setup
      if (authorizationCode) {
        const success = await gmail.completeOAuthSetup(account, authorizationCode);

        if (success) {
          return formatResponse({
            action: 'oauth_complete',
            account,
            success: true,
            message: `${account} account successfully authenticated!`
          });
        } else {
          return formatResponse({
            action: 'oauth_failed',
            account,
            error: 'Failed to complete OAuth setup. The authorization code may be invalid or expired.'
          }, true);
        }
      }

      // Generate authorization URL
      const authUrl = gmail.getAuthUrl(account);

      return formatResponse({
        action: 'oauth_url_generated',
        account,
        authUrl,
        instructions: [
          `1. Open this URL in a browser: ${authUrl}`,
          `2. Sign in with the ${account} account (${account === 'l7' ? L7_EMAIL : PERSONAL_EMAIL})`,
          '3. Grant the requested permissions',
          '4. Copy the authorization code from the redirect URL',
          `5. Run this tool again with authorizationCode="<your-code>"`
        ]
      });
    } catch (error) {
      return formatResponse(`OAuth error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// Reply to message tool
server.tool(
  "message_reply",
  "Reply to an email message (stays in same thread)",
  {
    messageId: z.string().describe('Message ID to reply to'),
    body: z.string().describe('Reply body content'),
    account: z.enum(['personal', 'l7']).describe('Which account to reply from'),
    replyAll: z.boolean().optional().default(false).describe('Reply to all recipients')
  },
  async (args) => {
    try {
      const { messageId, body, account, replyAll } = args;

      if (!gmail.isAccountConfigured(account)) {
        return formatResponse({
          error: `${account} account not configured`,
          action: 'oauth_required'
        }, true);
      }

      const result = await gmail.replyToMessage(account, {
        messageId,
        body,
        replyAll
      });

      if (!result.success) {
        return formatResponse({
          action: 'reply_failed',
          error: result.error
        }, true);
      }

      return formatResponse({
        action: 'message_replied',
        success: true,
        messageId: result.messageId,
        replyAll,
        inReplyTo: messageId
      });
    } catch (error) {
      return formatResponse(`Reply error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// Get thread tool
server.tool(
  "message_thread",
  "Get all messages in a thread",
  {
    threadId: z.string().describe('Thread ID to retrieve'),
    account: z.enum(['personal', 'l7']).describe('Which account the thread is in')
  },
  async (args) => {
    try {
      const { threadId, account } = args;

      if (!gmail.isAccountConfigured(account)) {
        return formatResponse({
          error: `${account} account not configured`,
          action: 'oauth_required'
        }, true);
      }

      const result = await gmail.getThread(account, threadId);

      if (!result.success) {
        return formatResponse({
          action: 'get_thread_failed',
          error: result.error
        }, true);
      }

      return formatResponse({
        action: 'thread_retrieved',
        account,
        threadId,
        messageCount: result.messages?.length || 0,
        messages: result.messages
      });
    } catch (error) {
      return formatResponse(`Thread error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// Trash messages tool
server.tool(
  "message_trash",
  "Move messages to trash",
  {
    messageIds: z.array(z.string()).describe('Array of message IDs to trash'),
    account: z.enum(['personal', 'l7']).describe('Which account the messages are in')
  },
  async (args) => {
    try {
      const { messageIds, account } = args;

      if (!gmail.isAccountConfigured(account)) {
        return formatResponse({
          error: `${account} account not configured`,
          action: 'oauth_required'
        }, true);
      }

      const result = await gmail.trashMessages(account, messageIds);

      if (!result.success) {
        return formatResponse({
          action: 'trash_failed',
          error: result.error,
          ...(result.errors && { errors: result.errors }),
          trashedCount: result.trashedCount || 0
        }, true);
      }

      return formatResponse({
        action: 'messages_trashed',
        success: true,
        trashedCount: result.trashedCount,
        account
      });
    } catch (error) {
      return formatResponse(`Trash error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// Mark messages as read tool
server.tool(
  "message_mark_read",
  "Mark messages as read (removes UNREAD label)",
  {
    messageIds: z.array(z.string()).describe('Array of message IDs to mark as read'),
    account: z.enum(['personal', 'l7']).describe('Which account the messages are in')
  },
  async (args) => {
    try {
      const { messageIds, account } = args;

      if (!gmail.isAccountConfigured(account)) {
        return formatResponse({
          error: `${account} account not configured`,
          action: 'oauth_required'
        }, true);
      }

      const result = await gmail.modifyLabels(account, messageIds, {
        removeLabelIds: ['UNREAD']
      });

      if (!result.success) {
        return formatResponse({
          action: 'mark_read_failed',
          error: result.error,
          ...(result.errors && { errors: result.errors }),
          modifiedCount: result.modifiedCount || 0
        }, true);
      }

      return formatResponse({
        action: 'messages_marked_read',
        success: true,
        modifiedCount: result.modifiedCount,
        account
      });
    } catch (error) {
      return formatResponse(`Mark read error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
    }
  }
);

// Info tool
server.tool(
  "comms_info",
  "Get information about unified communications configuration and status",
  {},
  async () => {
    const status = gmail.getAccountStatus();

    return formatResponse({
      name: 'unified-comms',
      version: '2.0.0',
      description: 'Self-contained email communications with direct Gmail API integration',
      selfContained: true,
      accounts: {
        personal: {
          email: PERSONAL_EMAIL,
          configured: status.personal.configured,
          status: status.personal.configured ? 'ready' : 'needs_oauth_setup'
        },
        l7: {
          email: L7_EMAIL,
          configured: status.l7.configured,
          status: status.l7.configured ? 'ready' : 'needs_oauth_setup'
        }
      },
      routing: {
        defaultAccount: DEFAULT_ACCOUNT,
        l7Domains: L7_DOMAINS,
        l7Keywords: L7_KEYWORDS
      },
      routingLogic: [
        '1. If account explicitly specified, use that',
        '2. If recipient domain matches L7 domains, use L7',
        '3. If content contains L7 keywords, use L7',
        '4. Otherwise use default account'
      ],
      credentialsDir: status.credentialsDir,
      setup: {
        required: !status.personal.configured || !status.l7.configured,
        instructions: 'Use comms_oauth_setup tool to authenticate accounts'
      }
    });
  }
);

// Start the server
async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer().catch(console.error);
