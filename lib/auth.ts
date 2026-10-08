import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, initDb } from './db';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'truthmail-secure-enterprise-jwt-token-998877';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  creditsBalance: number;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      creditsBalance: user.creditsBalance,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
      creditsBalance: decoded.creditsBalance,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(req: NextRequest): Promise<AuthUser | null> {
  await initDb();
  // Check authorization header or cookie
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/truthmail_token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Refresh latest user record from DB
  const res = await query('SELECT id, name, email, role, credits_balance FROM users WHERE id = ?', [payload.id]);
  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    creditsBalance: row.credits_balance,
  };
}

// Generate 6-digit OTP code for sign-up and password reset
export async function createOtp(email: string, type: 'signup' | 'reset'): Promise<string> {
  await initDb();
  const lowerEmail = email.toLowerCase().trim();
  // Generate a random 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Expire in 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const id = `otp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Delete previous expired OTPs for this email and type
  await query('DELETE FROM verification_otps WHERE email = ? AND type = ?', [lowerEmail, type]);

  await query(
    'INSERT INTO verification_otps (id, email, otp, type, expires_at) VALUES (?, ?, ?, ?, ?)',
    [id, lowerEmail, otp, type, expiresAt]
  );

  return otp;
}

// Verify entered OTP
export async function verifyOtp(email: string, otp: string, type: 'signup' | 'reset'): Promise<boolean> {
  await initDb();
  const lowerEmail = email.toLowerCase().trim();
  const res = await query(
    'SELECT id, expires_at FROM verification_otps WHERE email = ? AND otp = ? AND type = ?',
    [lowerEmail, otp.trim(), type]
  );

  if (res.rows.length === 0) return false;

  const record = res.rows[0];
  const isExpired = new Date(record.expires_at).getTime() < Date.now();
  if (isExpired) return false;

  // Consume OTP once verified
  await query('DELETE FROM verification_otps WHERE id = ?', [record.id]);
  return true;
}

// Send OTP via SMTP (if configured) or print to server console for free immediate testing
export async function sendOtpEmail(email: string, otp: string, type: 'signup' | 'reset'): Promise<{ sent: boolean; message: string }> {
  const isSmtpConfigured = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

  if (isSmtpConfigured) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const subject = type === 'signup' ? 'Verify your TruthMail Account' : 'Reset your TruthMail Password';
      const text = `Your TruthMail verification code is: ${otp}. It is valid for 10 minutes.`;

      await transporter.sendMail({
        from: `"TruthMail Security" <${process.env.GMAIL_USER}>`,
        to: email,
        subject,
        text,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a;">TruthMail Security Code</h2>
            <p style="color: #475569;">Please use the following 6-digit OTP code to complete your ${type === 'signup' ? 'sign-up' : 'password reset'}:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #10b981; margin: 20px 0; background: #f8fafc; padding: 12px; text-align: center; border-radius: 6px;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 13px;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });

      return { sent: true, message: 'OTP sent to your email.' };
    } catch (err: any) {
      console.error('SMTP sending error:', err);
      // Fallback
    }
  }

  // Developer / Free test mode: logged to server console
  console.log(`[TruthMail Auth] Verification code for ${email} (${type}): >>> ${otp} <<<`);
  return {
    sent: true,
    message: `[Dev Mode] Verification code generated: ${otp} (Also logged in server console).`,
  };
}
