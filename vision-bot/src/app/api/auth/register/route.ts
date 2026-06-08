import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import crypto from 'crypto';

function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    
    // Check if user already exists
    const existingUser = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Insert new user
    const newUser = await sql`
      INSERT INTO users (username, password_hash)
      VALUES (${username}, ${passwordHash})
      RETURNING id, username, accent_color, theme;
    `;

    return NextResponse.json({ user: newUser[0] });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
