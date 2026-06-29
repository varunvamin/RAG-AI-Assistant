import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Incorrect username or password' }, { status: 400 });
    }

    const { username, password } = result.data;

    // Step 1: Query the user from Neon DB
    const users = await sql`SELECT * FROM users WHERE username = ${username}`;
    
    if (users.length === 0) {
      // GENERIC ERROR MESSAGE: Do not leak that the username doesn't exist
      return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
    }

    const user = users[0];

    // Step 3: Verify password hash
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      // GENERIC ERROR MESSAGE: Same error as above
      return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
    }

    return NextResponse.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        accent_color: user.accent_color || 'violet', 
        theme: user.theme || 'system' 
      } 
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
