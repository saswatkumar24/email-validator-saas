import { NextRequest, NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { name, email, googleId, credential } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Google email is required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const displayName = name || lowerEmail.split('@')[0];

    // Check if user exists
    const res = await query('SELECT id, name, email, role, credits_balance FROM users WHERE email = ?', [lowerEmail]);

    let user: any;
    if (res.rows.length > 0) {
      const row = res.rows[0];
      // Update google_id and mark email_verified = 1
      await query('UPDATE users SET email_verified = 1, google_id = COALESCE(google_id, ?) WHERE id = ?', [googleId || 'google_auth', row.id]);
      user = {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        creditsBalance: row.credits_balance,
      };
    } else {
      // Create new Google verified user
      const id = `user_g_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await query(
        `INSERT INTO users (id, name, email, password_hash, email_verified, role, credits_balance, google_id)
         VALUES (?, ?, ?, NULL, 1, 'user', 500, ?)`,
        [id, displayName, lowerEmail, googleId || 'google_auth']
      );
      user = {
        id,
        name: displayName,
        email: lowerEmail,
        role: 'user',
        creditsBalance: 500,
      };
    }

    const token = signToken(user);
    const response = NextResponse.json({
      message: 'Google login successful',
      user,
      token,
    });

    response.cookies.set('truthmail_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Google authentication failed' }, { status: 500 });
  }
}
