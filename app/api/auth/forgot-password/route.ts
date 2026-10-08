import { NextRequest, NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';
import { createOtp, sendOtpEmail } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const res = await query('SELECT id FROM users WHERE email = ?', [lowerEmail]);

    if (res.rows.length === 0) {
      // Security standard: don't reveal if email exists, return positive response
      return NextResponse.json({
        message: 'If an account exists with this email, a reset code has been sent.',
      });
    }

    const otp = await createOtp(lowerEmail, 'reset');
    const emailRes = await sendOtpEmail(lowerEmail, otp, 'reset');

    return NextResponse.json({
      message: 'Password reset code has been sent to your email.',
      email: lowerEmail,
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
      notice: emailRes.message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Request failed' }, { status: 500 });
  }
}
