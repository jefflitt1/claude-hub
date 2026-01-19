/**
 * Gmail provider for unified-comms
 * Direct Gmail API integration with OAuth support
 */
import { gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
interface GmailAccount {
    email: string;
    client: OAuth2Client;
    gmail: gmail_v1.Gmail;
}
/**
 * Initialize a Gmail account
 */
export declare function initAccount(accountType: 'personal' | 'l7'): Promise<GmailAccount | null>;
/**
 * Get Gmail client for an account
 */
export declare function getGmailClient(accountType: 'personal' | 'l7'): Promise<gmail_v1.Gmail | null>;
/**
 * Check if an account is configured
 */
export declare function isAccountConfigured(accountType: 'personal' | 'l7'): boolean;
/**
 * Get OAuth authorization URL for setup
 */
export declare function getAuthUrl(accountType: 'personal' | 'l7'): string;
/**
 * Complete OAuth setup with authorization code
 */
export declare function completeOAuthSetup(accountType: 'personal' | 'l7', authorizationCode: string): Promise<boolean>;
/**
 * Send an email
 */
export declare function sendEmail(accountType: 'personal' | 'l7', params: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
}): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
/**
 * List recent messages
 */
export declare function listMessages(accountType: 'personal' | 'l7', count?: number): Promise<{
    success: boolean;
    messages?: any[];
    error?: string;
}>;
/**
 * Search messages
 */
export declare function searchMessages(accountType: 'personal' | 'l7', query: string): Promise<{
    success: boolean;
    messages?: any[];
    error?: string;
}>;
/**
 * Get message by ID
 */
export declare function getMessage(accountType: 'personal' | 'l7', messageId: string): Promise<{
    success: boolean;
    message?: any;
    error?: string;
}>;
/**
 * Get account status
 */
export declare function getAccountStatus(): {
    personal: {
        configured: boolean;
        email: string;
    };
    l7: {
        configured: boolean;
        email: string;
    };
    credentialsDir: string;
};
/**
 * Reply to a message (in same thread)
 */
export declare function replyToMessage(accountType: 'personal' | 'l7', params: {
    messageId: string;
    body: string;
    replyAll?: boolean;
}): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
/**
 * Get thread messages
 */
export declare function getThread(accountType: 'personal' | 'l7', threadId: string): Promise<{
    success: boolean;
    messages?: any[];
    error?: string;
}>;
export {};
