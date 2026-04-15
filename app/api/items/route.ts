import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/items?name=Beef+Strip+Steak
// Returns price history for a specific item across all receipts
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');

    if (!name) {
      const rows = await sql`
        SELECT
          name,
          COUNT(*)::int          AS times_bought,
          SUM(total_price)::text AS total_spent
        FROM line_items
        GROUP BY name
        ORDER BY times_bought DESC
      `;
      return NextResponse.json({
        names: rows.map((r: any) => r.name),
        allItems: rows,
      });
    }

    const history = await sql`
      SELECT
        li.name,
        li.quantity,
        li.unit,
        li.total_price,
        li.unit_price,
        r.order_date,
        r.order_id
      FROM line_items li
      JOIN receipts r ON r.id = li.receipt_id
      WHERE li.name ILIKE ${name}
      ORDER BY r.order_date ASC
    `;

    return NextResponse.json({ history });
}
