import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, initDb } from '@/lib/db';
import { createOtp, sendOtpEmail } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await query('SELECT id, email_verified FROM users WHERE email = ?', [lowerEmail]);
    if (existing.rows.length > 0) {
      if (existing.rows[0].email_verified) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }
      // If user exists but unverified, update name & password and re-send OTP
      const passwordHash = bcrypt.hashSync(password, 10);
      await query('UPDATE users SET name = ?, password_hash = ? WHERE email = ?', [name, passwordHash, lowerEmail]);
      const otp = await createOtp(lowerEmail, 'signup');
      const emailRes = await sendOtpEmail(lowerEmail, otp, 'signup');
      return NextResponse.json({
        message: 'Account created. Please verify your email with the OTP code.',
        email: lowerEmail,
        debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
        notice: emailRes.message,
      });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await query(
      `INSERT INTO users (id, name, email, password_hash, email_verified, role, credits_balance) 
       VALUES (?, ?, ?, ?, 0, 'user', 500)`,
      [id, name, lowerEmail, passwordHash]
    );

    const otp = await createOtp(lowerEmail, 'signup');
    const emailRes = await sendOtpEmail(lowerEmail, otp, 'signup');

    return NextResponse.json({
      message: 'Account registered! Please enter the 6-digit verification code.',
      email: lowerEmail,
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      notice: emailRes.message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 });
  }
}
