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
    
    const userResult = await sql`
      SELECT id, username, accent_color, theme, password_hash
      FROM users 
      WHERE username = ${username}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const user = userResult[0];

    // Support seamless migration from legacy plaintext to SHA-256
    const isValid = (user.password_hash === passwordHash) || (user.password_hash === password);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Auto-migrate plaintext passwords to SHA-256 on successful login
    if (user.password_hash === password) {
      await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${user.id}`;
    }

    return NextResponse.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        accent_color: user.accent_color, 
        theme: user.theme 
      } 
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
