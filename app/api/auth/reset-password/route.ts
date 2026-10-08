import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, initDb } from '@/lib/db';
import { verifyOtp } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, reset code, and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const isValid = await verifyOtp(lowerEmail, otp, 'reset');

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired password reset code' }, { status: 400 });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await query('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE email = ?', [passwordHash, lowerEmail]);

    return NextResponse.json({
      message: 'Your password has been reset successfully! You can now log in.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Password reset failed' }, { status: 500 });
  }
}
