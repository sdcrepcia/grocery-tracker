import { NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/receipts
// Returns all receipts with their line items, plus computed weekly/monthly aggregates
export async function GET() {
  try {
  const receipts = await sql`
    SELECT
      r.id,
      r.order_id,
      r.store,
      r.order_date,
      r.total,
      r.item_count,
      json_agg(
        json_build_object(
          'id',          li.id,
          'name',        li.name,
          'quantity',    li.quantity,
          'unit',        li.unit,
          'total_price', li.total_price,
          'unit_price',  li.unit_price
        ) ORDER BY li.total_price DESC
      ) AS items
    FROM receipts r
    JOIN line_items li ON li.receipt_id = r.id
    GROUP BY r.id
    ORDER BY r.order_date DESC
  `;

  // Weekly spend (last 16 weeks)
  const weeklySpend = await sql`
    SELECT
      DATE_TRUNC('week', order_date)::date AS week_start,
      SUM(total)::numeric(10,2)            AS total,
      COUNT(*)::int                        AS order_count
    FROM receipts
    WHERE order_date >= NOW() - INTERVAL '16 weeks'
    GROUP BY 1
    ORDER BY 1
  `;

  // Top items by total spend across all time
  const topItems = await sql`
    SELECT
      name,
      COUNT(*)::int               AS times_bought,
      SUM(total_price)::numeric   AS total_spent,
      AVG(total_price)::numeric   AS avg_price,
      MIN(total_price)::numeric   AS min_price,
      MAX(total_price)::numeric   AS max_price
    FROM line_items
    GROUP BY name
    ORDER BY total_spent DESC
    LIMIT 20
  `;

  // Last sync time
  const [syncState] = await sql`SELECT last_synced_at, refresh_token FROM sync_state WHERE id = 1`;

  return NextResponse.json({
    receipts,
    weeklySpend,
    topItems,
    lastSyncedAt: syncState?.last_synced_at ?? null,
    gmailConnected: !!syncState?.refresh_token,
  });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
