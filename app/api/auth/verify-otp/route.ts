import { NextRequest, NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';
import { verifyOtp, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP code are required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const isValid = await verifyOtp(lowerEmail, otp, 'signup');

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // Mark email verified
    await query('UPDATE users SET email_verified = 1, updated_at = datetime("now") WHERE email = ?', [lowerEmail]);

    const res = await query('SELECT id, name, email, role, credits_balance FROM users WHERE email = ?', [lowerEmail]);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = {
      id: res.rows[0].id,
      name: res.rows[0].name,
      email: res.rows[0].email,
      role: res.rows[0].role as 'user' | 'admin',
      creditsBalance: res.rows[0].credits_balance,
    };

    const token = signToken(user);
    const response = NextResponse.json({
      message: 'Account verified successfully!',
      user,
      token,
    });

    // Set secure cookie
    response.cookies.set('truthmail_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 });
  }
}
