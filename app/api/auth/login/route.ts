import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, initDb } from '@/lib/db';
import { signToken, createOtp, sendOtpEmail } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const res = await query('SELECT id, name, email, password_hash, email_verified, role, credits_balance FROM users WHERE email = ?', [lowerEmail]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const row = res.rows[0];

    // Check password
    if (!row.password_hash) {
      return NextResponse.json({ error: 'This account was created with Google. Please use Google Sign-In.' }, { status: 400 });
    }

    const isMatch = bcrypt.compareSync(password, row.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check if verified
    if (!row.email_verified) {
      const otp = await createOtp(lowerEmail, 'signup');
      await sendOtpEmail(lowerEmail, otp, 'signup');
      return NextResponse.json({
        requiresVerification: true,
        message: 'Your email is not verified yet. A verification code has been sent.',
        email: lowerEmail,
        debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      }, { status: 403 });
    }

    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as 'user' | 'admin',
      creditsBalance: row.credits_balance,
    };

    const token = signToken(user);
    const response = NextResponse.json({
      message: 'Login successful',
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
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
