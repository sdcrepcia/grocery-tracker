import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { fetchNewReceiptEmails } from '@/lib/gmail';
import { parseReceiptPdf } from '@/lib/parser';

// Called by Vercel Cron daily, or manually from the UI
export async function POST() {
  // Verify cron secret if called by Vercel (skip for manual UI calls in dev)
  // In production, Vercel automatically adds the CRON_SECRET header

  const [syncState] = await sql`SELECT refresh_token, last_synced_at FROM sync_state WHERE id = 1`;

  if (!syncState?.refresh_token) {
    return NextResponse.json({ error: 'Gmail not connected. Visit /setup to authorize.' }, { status: 401 });
  }

  // Fetch all receipt emails, then filter to ones we haven't imported yet
  const emails = await fetchNewReceiptEmails(syncState.refresh_token);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const emailsFound = emails.length;

  for (const email of emails) {
    try {
      const receipt = await parseReceiptPdf(email.pdfBuffer);

      // Skip if already imported
      const [existing] = await sql`SELECT id FROM receipts WHERE order_id = ${receipt.orderId}`;
      if (existing) {
        skipped++;
        continue;
      }

      // Insert receipt then line items sequentially
      const [inserted] = await sql`
        INSERT INTO receipts (order_id, store, order_date, total, item_count)
        VALUES (${receipt.orderId}, ${receipt.store}, ${receipt.orderDate.toISOString()}, ${receipt.total}, ${receipt.itemCount})
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
      errors.push(`Email ${email.id}: ${err.message}`);
    }
  }

  // Update last synced timestamp
  await sql`UPDATE sync_state SET last_synced_at = NOW() WHERE id = 1`;

  return NextResponse.json({ imported, skipped, errors, emailsFound });
}

// Vercel Cron calls GET
export async function GET(req: Request) {
  // Validate cron secret in production
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return POST();
}
