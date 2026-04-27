import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { listReceiptEmailIds, fetchReceiptEmail } from '@/lib/gmail';
import { parseReceiptPdf } from '@/lib/parser';

export const maxDuration = 60;

// Called by Vercel Cron daily, or manually from the UI
export async function POST() {
  const [syncState] = await sql`SELECT refresh_token, last_synced_at FROM sync_state WHERE id = 1`;

  if (!syncState?.refresh_token) {
    return NextResponse.json({ error: 'Gmail not connected. Visit /setup to authorize.' }, { status: 401 });
  }

  // Auto-migrate: add gmail_message_id column if it doesn't exist yet
  await sql`
    ALTER TABLE receipts ADD COLUMN IF NOT EXISTS gmail_message_id TEXT UNIQUE
  `;

  // Step 1: list all matching Gmail message IDs (cheap — no PDF download)
  const allMessageIds = await listReceiptEmailIds(syncState.refresh_token);

  // Step 2: filter to IDs not yet in the DB
  const existingIds = allMessageIds.length > 0
    ? (await sql`
        SELECT gmail_message_id FROM receipts
        WHERE gmail_message_id = ANY(${allMessageIds}::text[])
      `).map((r: any) => r.gmail_message_id as string)
    : [];

  const newMessageIds = allMessageIds.filter((id) => !existingIds.includes(id));

  let imported = 0;
  let skipped = allMessageIds.length - newMessageIds.length;
  const errors: string[] = [];
  const emailsFound = allMessageIds.length;

  // Step 3: download PDFs in parallel (max 5 concurrent to avoid Gmail rate limits)
  const CONCURRENCY = 5;
  for (let i = 0; i < newMessageIds.length; i += CONCURRENCY) {
    const batch = newMessageIds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((id) => fetchReceiptEmail(syncState.refresh_token, id)),
    );

    for (let j = 0; j < batch.length; j++) {
      const messageId = batch[j];
      const result = results[j];

      if (result.status === 'rejected') {
        errors.push(`Email ${messageId}: ${result.reason?.message ?? result.reason}`);
        continue;
      }

      const email = result.value;
      if (!email) { skipped++; continue; }

      try {
        const receipt = await parseReceiptPdf(email.pdfBuffer);

        const [existing] = await sql`SELECT id FROM receipts WHERE order_id = ${receipt.orderId}`;
        if (existing) {
          await sql`UPDATE receipts SET gmail_message_id = ${messageId} WHERE order_id = ${receipt.orderId}`;
          skipped++;
          continue;
        }

        const [inserted] = await sql`
          INSERT INTO receipts (order_id, store, order_date, total, item_count, gmail_message_id)
          VALUES (${receipt.orderId}, ${receipt.store}, ${receipt.orderDate.toISOString()}, ${receipt.total}, ${receipt.itemCount}, ${messageId})
          RETURNING id
        `;

        for (const item of receipt.items) {
          await sql`
            INSERT INTO line_items (receipt_id, name, quantity, unit, total_price)
            VALUES (${inserted.id}, ${item.name}, ${item.quantity}, ${item.unit}, ${item.totalPrice})
          `;
        }

        imported++;
      } catch (err: any) {
        errors.push(`Email ${messageId}: ${err.message}`);
      }
    }
  }

  await sql`UPDATE sync_state SET last_synced_at = NOW() WHERE id = 1`;

  return NextResponse.json({ imported, skipped, errors, emailsFound });
}

// Vercel Cron calls GET
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return POST();
}
