import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS item_categories (
      id       SERIAL PRIMARY KEY,
      name     TEXT NOT NULL UNIQUE,
      keywords TEXT NOT NULL DEFAULT ''
    )
  `;
}

export async function GET() {
  await ensureTable();
  const categories = await sql`SELECT id, name, keywords FROM item_categories ORDER BY name`;
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  await ensureTable();
  const { name, keywords } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }
  const [cat] = await sql`
    INSERT INTO item_categories (name, keywords)
    VALUES (${name.trim()}, ${keywords ?? ''})
    ON CONFLICT (name) DO UPDATE SET keywords = EXCLUDED.keywords
    RETURNING id, name, keywords
  `;
  return NextResponse.json({ category: cat });
}

export async function DELETE(req: NextRequest) {
  await ensureTable();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await sql`DELETE FROM item_categories WHERE id = ${parseInt(id, 10)}`;
  return NextResponse.json({ success: true });
}
