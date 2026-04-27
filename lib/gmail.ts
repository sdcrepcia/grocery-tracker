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

// Returns just the Gmail message IDs matching receipt emails — no PDF download.
export async function listReceiptEmailIds(refreshToken: string): Promise<string[]> {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: client });

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:"Your Order is Ready for Pickup" from:heinens.com',
    maxResults: 50,
  });

  return (listRes.data.messages ?? []).map((m) => m.id!).filter(Boolean);
}

// Downloads and returns one receipt email's PDF. Call only for message IDs not yet imported.
export async function fetchReceiptEmail(
  refreshToken: string,
  messageId: string,
): Promise<GmailMessage | null> {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: client });

  const fullMsg = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const payload = fullMsg.data.payload;
  if (!payload) return null;

  const dateHeader = payload.headers?.find((h) => h.name === 'Date')?.value ?? '';
  const receivedAt = dateHeader ? new Date(dateHeader) : new Date();
  const subject = payload.headers?.find((h) => h.name === 'Subject')?.value ?? '';

  const pdfBuffer = await findPdfAttachment(gmail, messageId, payload);
  if (!pdfBuffer) return null;

  return { id: messageId, pdfBuffer, subject, receivedAt };
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
