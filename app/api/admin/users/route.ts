import { NextRequest, NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await initDb();
    const res = await query(`
      SELECT id, name, email, role, email_verified, credits_balance, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({ users: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getCurrentUser(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await initDb();
    const { userId, creditsBalance, role } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (creditsBalance !== undefined) {
      await query('UPDATE users SET credits_balance = ? WHERE id = ?', [Number(creditsBalance), userId]);
    }

    if (role !== undefined) {
      await query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    }

    const updated = await query('SELECT id, name, email, role, credits_balance FROM users WHERE id = ?', [userId]);
    return NextResponse.json({ user: updated.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
