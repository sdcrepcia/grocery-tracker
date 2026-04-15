import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const cwd = process.cwd();
  const envPath = path.join(cwd, '.env.local');
  const envExists = fs.existsSync(envPath);
  const envContent = envExists ? fs.readFileSync(envPath, 'utf8').slice(0, 50) + '...' : null;

  return NextResponse.json({
    DATABASE_URL: !!process.env.DATABASE_URL,
    NODE_VERSION: process.version,
    CWD: cwd,
    envFileExists: envExists,
    envFilePreview: envContent,
  });
}
