import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

// GET /api/items?name=Beef+Strip+Steak
// Returns price history for a specific item across all receipts
export async function GET(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name');

    if (!name) {
      const names = await sql`
        SELECT DISTINCT name FROM line_items ORDER BY name
      `;
      return NextResponse.json({ names: names.map((r: any) => r.name) });
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
