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

    let sql = `SELECT * FROM threat_domains WHERE 1=1`;
    const params: any[] = [];

    if (search) {
      sql += ` AND domain LIKE ?`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY times_seen DESC, last_verified_at DESC LIMIT 100`;

    const domains = await query(sql, params);
    const emails = await query(`SELECT * FROM threat_emails ORDER BY reported_count DESC LIMIT 100`);

    return NextResponse.json({
      threatDomains: domains.rows,
      threatEmails: emails.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUser(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await initDb();
    const { domain, classification, reason } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const lower = domain.toLowerCase().trim();
    await query(
      `INSERT INTO threat_domains (domain, classification, reason, times_seen) 
       VALUES (?, ?, ?, 1)
       ON CONFLICT (domain) DO UPDATE SET classification = EXCLUDED.classification, reason = EXCLUDED.reason`,
      [lower, classification || 'no_mx', reason || 'Manually added by Admin']
    );

    return NextResponse.json({ message: 'Threat domain added' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getCurrentUser(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await initDb();
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    await query('DELETE FROM threat_domains WHERE domain = ?', [domain.toLowerCase().trim()]);
    return NextResponse.json({ message: 'Domain removed from threat list' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
