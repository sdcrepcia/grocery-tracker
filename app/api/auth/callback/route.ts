import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/gmail';
import sql from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/setup?error=' + error, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/setup?error=no_code', req.url));
  }

  const tokens = await exchangeCodeForTokens(code);

  if (!tokens.refresh_token) {
    // This happens if the user already authorized before — revoke and re-auth
    return NextResponse.redirect(new URL('/setup?error=no_refresh_token', req.url));
  }

  await sql`
    UPDATE sync_state SET refresh_token = ${tokens.refresh_token} WHERE id = 1
  `;

  return NextResponse.redirect(new URL('/?connected=1', req.url));
}
