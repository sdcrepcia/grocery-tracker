import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export function getOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getAuthUrl(): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

export interface GmailMessage {
  id: string;
  pdfBuffer: Buffer;
  subject: string;
  receivedAt: Date;
}

export async function fetchNewReceiptEmails(refreshToken: string, lastHistoryId?: string): Promise<GmailMessage[]> {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: client });
  const results: GmailMessage[] = [];

  // Search for Heinen's receipt emails not yet processed
  const query = 'subject:"Your Order is Ready for Pickup" from:heinens.com';

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  });

  const messages = listRes.data.messages ?? [];

  for (const msg of messages) {
    if (!msg.id) continue;

    const fullMsg = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    });

    const payload = fullMsg.data.payload;
    if (!payload) continue;

    // Get email date
    const dateHeader = payload.headers?.find((h) => h.name === 'Date')?.value ?? '';
    const receivedAt = dateHeader ? new Date(dateHeader) : new Date();

    // Find PDF attachment
    const pdfBuffer = await findPdfAttachment(gmail, msg.id, payload);
    if (!pdfBuffer) continue;

    const subject = payload.headers?.find((h) => h.name === 'Subject')?.value ?? '';

    results.push({ id: msg.id, pdfBuffer, subject, receivedAt });
  }

  return results;
}

async function findPdfAttachment(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string,
  payload: any,
): Promise<Buffer | null> {
  // Check parts recursively for PDF attachment
  const parts = payload.parts ?? (payload.mimeType === 'application/pdf' ? [payload] : []);

  for (const part of parts) {
    if (part.mimeType === 'application/pdf' && part.body?.attachmentId) {
      const attachment = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: part.body.attachmentId,
      });

      const data = attachment.data.data;
      if (data) {
        // Gmail uses URL-safe base64
        return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      }
    }

    // Recurse into nested parts
    if (part.parts) {
      const found = await findPdfAttachment(gmail, messageId, part);
      if (found) return found;
    }
  }

  return null;
}
