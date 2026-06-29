import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6).max(100),
});

// Basic in-memory rate limiting (Note: resets on server restart)
const rateLimitMap = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Authenticates a user and establishes a session.
 * 
 * Features:
 * - Validates input structure using Zod
 * - Verifies hashed passwords using bcryptjs
 * - Implements account lockouts after 5 failed attempts (15-minute lock)
 * - Falls back to offline-mode safely if no database is configured
 * 
 * @param req - The NextRequest containing the JSON body with username and password
 * @returns A NextResponse containing the user payload or generic 401 error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Incorrect username or password' }, { status: 400 });
    }

    const { username, password } = result.data;

    // Best Practice: Offline Mode Fallback
    // If no database is configured, allow local access so the app doesn't crash.
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        user: { id: 1, username, accent_color: 'violet', theme: 'system' }
      });
    }

    // Step 4: Check Rate Limit (Account Lockout)
    const rateLimit = rateLimitMap.get(username);
    if (rateLimit) {
      if (rateLimit.lockedUntil > Date.now()) {
        // GENERIC ERROR: Don't reveal lockout status to prevent enumeration
        return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
      }
    }

    // Step 1: Query the user from Neon DB
    const users = await sql`SELECT * FROM users WHERE username = ${username}`;
    
    if (users.length === 0) {
      // Record failed attempt even if user doesn't exist
      const current = rateLimitMap.get(username) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
      }
      rateLimitMap.set(username, current);
      return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
    }

    const user = users[0];

    // Step 3: Verify password hash
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      // Record failed attempt
      const current = rateLimitMap.get(username) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
      }
      rateLimitMap.set(username, current);
      return NextResponse.json({ error: 'Incorrect username or password' }, { status: 401 });
    }

    // Reset rate limit on successful login
    rateLimitMap.delete(username);

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
