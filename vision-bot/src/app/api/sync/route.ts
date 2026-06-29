import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

const syncSchema = z.object({
  username: z.string().min(3).max(30),
  profileData: z.any(), // The full JSON profile object matching localStorage
});

/**
 * Retrieves the user's profile data from the cloud database.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ profileData: null, offline: true }, { status: 200 });
    }

    // Ensure the profile_data column exists (safe idempotent migration)
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;`;

    const users = await sql`SELECT profile_data FROM users WHERE username = ${username} LIMIT 1`;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ profileData: users[0].profile_data }, { status: 200 });
  } catch (error) {
    console.error('Cloud Sync GET Error:', error);
    return NextResponse.json({ error: 'Database unavailable', offline: true }, { status: 500 });
  }
}

/**
 * Updates the user's profile data in the cloud database.
 */
export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ success: true, offline: true }, { status: 200 });
    }

    const body = await req.json();
    const result = syncSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    const { username, profileData } = result.data;

    // Ensure the profile_data column exists
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;`;

    const updateRes = await sql`
      UPDATE users 
      SET profile_data = ${profileData as any} 
      WHERE username = ${username}
      RETURNING id
    `;

    if (updateRes.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Cloud Sync POST Error:', error);
    return NextResponse.json({ error: 'Database unavailable', offline: true }, { status: 500 });
  }
}
