import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Invalid input provided' }, { status: 400 });
    }

    // Step 1: Check if user exists
    const existingUsers = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existingUsers.length > 0) {
      // GENERIC ERROR: Don't confirm they exist explicitly, just reject registration
      return NextResponse.json({ error: 'Registration failed. Please try a different username.' }, { status: 409 });
    }

    // TODO: Step 3 will replace this with bcrypt
    const password_hash = password;

    const newUsers = await sql`
      INSERT INTO users (username, password_hash, accent_color, theme)
      VALUES (${username}, ${password_hash}, 'violet', 'system')
      RETURNING id, username, accent_color, theme
    `;

    const user = newUsers[0];

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
