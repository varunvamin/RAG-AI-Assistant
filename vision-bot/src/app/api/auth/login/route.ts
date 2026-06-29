import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Incorrect username or password' }, { status: 400 });
    }

    // Step 1: Query the user from Neon DB
    const users = await sql`SELECT * FROM users WHERE username = ${username}`;
    
    if (users.length === 0) {
      // GENERIC ERROR MESSAGE: Do not leak that the username doesn't exist
      return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
    }

    const user = users[0];

    // TODO: Step 3 will replace this basic check with bcrypt
    if (user.password_hash !== password) {
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
