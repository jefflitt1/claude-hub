/**
 * Gmail provider for unified-comms
 * Direct Gmail API integration with OAuth support
 */

import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

// Credentials storage location
const CREDENTIALS_DIR = process.env.GMAIL_CREDENTIALS_DIR ||
  path.join(process.env.HOME || '', '.config', 'unified-comms');

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify'
];

interface AccountConfig {
  email: string;
  credentialsPath: string;
  tokenPath: string;
}

interface GmailAccount {
  email: string;
  client: OAuth2Client;
  gmail: gmail_v1.Gmail;
}

// Account configurations
const accounts: Map<string, GmailAccount> = new Map();

/**
 * Get OAuth client configuration from file or environment
 */
function getOAuthConfig(): { clientId: string; clientSecret: string; redirectUri: string } {
  // Try environment variables first
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback'
    };
  }

  // Try credentials file
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH ||
    path.join(CREDENTIALS_DIR, 'oauth-credentials.json');

  if (fs.existsSync(credentialsPath)) {
    const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    const installed = creds.installed || creds.web || creds;
    return {
      clientId: installed.client_id,
      clientSecret: installed.client_secret,
      redirectUri: installed.redirect_uris?.[0] || 'http://localhost:3000/oauth/callback'
    };
  }

  throw new Error(
    'Google OAuth credentials not found. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, ' +
    'or provide credentials file at ' + credentialsPath
  );
}

/**
 * Get account configuration
 */
function getAccountConfig(accountType: 'personal' | 'l7'): AccountConfig {
  const email = accountType === 'l7'
    ? (process.env.L7_EMAIL || 'jeff@jglcap.com')
    : (process.env.PERSONAL_EMAIL || 'jglittell@gmail.com');

  return {
    email,
    credentialsPath: path.join(CREDENTIALS_DIR, `${accountType}-credentials.json`),
    tokenPath: path.join(CREDENTIALS_DIR, `${accountType}-token.json`)
  };
}

/**
 * Load saved token for an account
 */
function loadToken(tokenPath: string): any | null {
  if (fs.existsSync(tokenPath)) {
    return JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
  }
  return null;
}

/**
 * Save token for an account
 */
function saveToken(tokenPath: string, token: any): void {
  // Ensure directory exists
  const dir = path.dirname(tokenPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2));
}

/**
 * Initialize a Gmail account
 */
export async function initAccount(accountType: 'personal' | 'l7'): Promise<GmailAccount | null> {
  // Check if already initialized
  const existing = accounts.get(accountType);
  if (existing) {
    return existing;
  }

  try {
    const config = getAccountConfig(accountType);
    const oauthConfig = getOAuthConfig();

    const client = new google.auth.OAuth2(
      oauthConfig.clientId,
      oauthConfig.clientSecret,
      oauthConfig.redirectUri
    );

    // Load saved token
    const token = loadToken(config.tokenPath);
    if (!token) {
      return null; // Need OAuth setup
    }

    client.setCredentials(token);

    // Set up automatic token refresh
    client.on('tokens', (newTokens) => {
      const merged = { ...token, ...newTokens };
      saveToken(config.tokenPath, merged);
    });

    const gmail = google.gmail({ version: 'v1', auth: client });

    const account: GmailAccount = {
      email: config.email,
      client,
      gmail
    };

    accounts.set(accountType, account);
    return account;
  } catch (error) {
    console.error(`Failed to initialize ${accountType} account:`, error);
    return null;
  }
}

/**
 * Get Gmail client for an account
 */
export async function getGmailClient(accountType: 'personal' | 'l7'): Promise<gmail_v1.Gmail | null> {
  const account = await initAccount(accountType);
  return account?.gmail || null;
}

/**
 * Check if an account is configured
 */
export function isAccountConfigured(accountType: 'personal' | 'l7'): boolean {
  const config = getAccountConfig(accountType);
  return fs.existsSync(config.tokenPath);
}

/**
 * Get OAuth authorization URL for setup
 */
export function getAuthUrl(accountType: 'personal' | 'l7'): string {
  const oauthConfig = getOAuthConfig();
  const client = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    oauthConfig.redirectUri
  );

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state: accountType // Pass account type through OAuth flow
  });
}

/**
 * Complete OAuth setup with authorization code
 */
export async function completeOAuthSetup(
  accountType: 'personal' | 'l7',
  authorizationCode: string
): Promise<boolean> {
  try {
    const config = getAccountConfig(accountType);
    const oauthConfig = getOAuthConfig();

    const client = new google.auth.OAuth2(
      oauthConfig.clientId,
      oauthConfig.clientSecret,
      oauthConfig.redirectUri
    );

    const { tokens } = await client.getToken(authorizationCode);
    saveToken(config.tokenPath, tokens);

    // Reinitialize the account
    accounts.delete(accountType);
    await initAccount(accountType);

    return true;
  } catch (error) {
    console.error(`OAuth setup failed for ${accountType}:`, error);
    return false;
  }
}

/**
 * Send an email
 */
export async function sendEmail(
  accountType: 'personal' | 'l7',
  params: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const gmail = await getGmailClient(accountType);
  if (!gmail) {
    return { success: false, error: `${accountType} account not configured. Run OAuth setup first.` };
  }

  try {
    const config = getAccountConfig(accountType);

    // Build email in RFC 2822 format
    const emailLines = [
      `From: ${config.email}`,
      `To: ${params.to}`,
      ...(params.cc ? [`Cc: ${params.cc}`] : []),
      ...(params.bcc ? [`Bcc: ${params.bcc}`] : []),
      `Subject: ${params.subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      params.body
    ];

    const email = emailLines.join('\r\n');
    const encodedEmail = Buffer.from(email).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    return {
      success: true,
      messageId: response.data.id || undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * List recent messages
 */
export async function listMessages(
  accountType: 'personal' | 'l7',
  count: number = 10
): Promise<{ success: boolean; messages?: any[]; error?: string }> {
  const gmail = await getGmailClient(accountType);
  if (!gmail) {
    return { success: false, error: `${accountType} account not configured. Run OAuth setup first.` };
  }

  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: count
    });

    const messages = response.data.messages || [];

    // Get message details
    const messageDetails = await Promise.all(
      messages.slice(0, count).map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });

        const headers = detail.data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;

        return {
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader('from'),
          to: getHeader('to'),
          subject: getHeader('subject'),
          date: getHeader('date'),
          snippet: detail.data.snippet
        };
      })
    );

    return { success: true, messages: messageDetails };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Search messages
 */
export async function searchMessages(
  accountType: 'personal' | 'l7',
  query: string
): Promise<{ success: boolean; messages?: any[]; error?: string }> {
  const gmail = await getGmailClient(accountType);
  if (!gmail) {
    return { success: false, error: `${accountType} account not configured. Run OAuth setup first.` };
  }

  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 20
    });

    const messages = response.data.messages || [];

    // Get message details
    const messageDetails = await Promise.all(
      messages.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date']
        });

        const headers = detail.data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;

        return {
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader('from'),
          to: getHeader('to'),
          subject: getHeader('subject'),
          date: getHeader('date'),
          snippet: detail.data.snippet
        };
      })
    );

    return { success: true, messages: messageDetails };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get message by ID
 */
export async function getMessage(
  accountType: 'personal' | 'l7',
  messageId: string
): Promise<{ success: boolean; message?: any; error?: string }> {
  const gmail = await getGmailClient(accountType);
  if (!gmail) {
    return { success: false, error: `${accountType} account not configured. Run OAuth setup first.` };
  }

  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    const headers = response.data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;

    // Extract body
    let body = '';
    const payload = response.data.payload;
    if (payload?.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    } else if (payload?.parts) {
      const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      success: true,
      message: {
        id: response.data.id,
        threadId: response.data.threadId,
        from: getHeader('from'),
        to: getHeader('to'),
        subject: getHeader('subject'),
        date: getHeader('date'),
        body,
        snippet: response.data.snippet
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get account status
 */
export function getAccountStatus(): {
  personal: { configured: boolean; email: string };
  l7: { configured: boolean; email: string };
  credentialsDir: string;
} {
  const personalConfig = getAccountConfig('personal');
  const l7Config = getAccountConfig('l7');

  return {
    personal: {
      configured: isAccountConfigured('personal'),
      email: personalConfig.email
    },
    l7: {
      configured: isAccountConfigured('l7'),
      email: l7Config.email
    },
    credentialsDir: CREDENTIALS_DIR
  };
}

/**
 * Reply to a message (in same thread)
 */
export async function replyToMessage(
  accountType: 'personal' | 'l7',
  params: {
    messageId: string;
    body: string;
    replyAll?: boolean;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const gmail = await getGmailClient(accountType);
  if (!gmail) {
    return { success: false, error: `${accountType} account not configured. Run OAuth setup first.` };
  }

  try {
    // Get original message to extract thread info and headers
    const original = await gmail.users.messages.get({
      userId: 'me',
      id: params.messageId,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Message-ID', 'References', 'In-Reply-To']
    });

    const headers = original.data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;

    const threadId = original.data.threadId;
    const originalFrom = getHeader('from');
    const originalTo = getHeader('to');
    const originalCc = getHeader('cc');
    const originalSubject = getHeader('subject') || '';
    const originalMessageId = getHeader('message-id');
    const originalReferences = getHeader('references');

    // Determine recipients
    const config = getAccountConfig(accountType);
    let replyTo = originalFrom || '';
    let cc = '';

    if (params.replyAll) {
      // Include original To and Cc, excluding our own email
      const allRecipients = [originalTo, originalCc]
        .filter(Boolean)
        .join(',')
        .split(',')
        .map(e => e.trim())
        .filter(e => !e.toLowerCase().includes(config.email.toLowerCase()));
      cc = allRecipients.join(', ');
    }

    // Build reply subject
    const subject = originalSubject.toLowerCase().startsWith('re:')
      ? originalSubject
      : `Re: ${originalSubject}`;

    // Build References header for threading
    const references = originalReferences
      ? `${originalReferences} ${originalMessageId}`
      : originalMessageId;

    // Build email in RFC 2822 format
    const emailLines = [
      `From: ${config.email}`,
      `To: ${replyTo}`,
      ...(cc ? [`Cc: ${cc}`] : []),
      `Subject: ${subject}`,
      ...(originalMessageId ? [`In-Reply-To: ${originalMessageId}`] : []),
      ...(references ? [`References: ${references}`] : []),
      'Content-Type: text/plain; charset=utf-8',
      '',
      params.body
    ];

    const email = emailLines.join('\r\n');
    const encodedEmail = Buffer.from(email).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
        threadId: threadId || undefined
      }
    });

    return {
      success: true,
      messageId: response.data.id || undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get thread messages
 */
export async function getThread(
  accountType: 'personal' | 'l7',
  threadId: string
): Promise<{ success: boolean; messages?: any[]; error?: string }> {
  const gmail = await getGmailClient(accountType);
  if (!gmail) {
    return { success: false, error: `${accountType} account not configured. Run OAuth setup first.` };
  }

  try {
    const response = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Subject', 'Date']
    });

    const messages = response.data.messages?.map(msg => {
      const headers = msg.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;

      return {
        id: msg.id,
        from: getHeader('from'),
        to: getHeader('to'),
        subject: getHeader('subject'),
        date: getHeader('date'),
        snippet: msg.snippet
      };
    }) || [];

    return { success: true, messages };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
