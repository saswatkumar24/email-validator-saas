import { NextRequest, NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentUser(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await initDb();
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const provider = searchParams.get('provider') || '';
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

    let sql = `SELECT * FROM verified_leads WHERE 1=1`;
    const params: any[] = [];

    if (search) {
      sql += ` AND (raw_email LIKE ? OR domain LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (provider) {
      sql += ` AND provider_type = ?`;
      params.push(provider);
    }

    sql += ` ORDER BY times_seen DESC, last_verified_at DESC LIMIT ?`;
    params.push(limit);

    const res = await query(sql, params);
    return NextResponse.json({ leads: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
