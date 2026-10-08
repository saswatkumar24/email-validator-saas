import { NextRequest, NextResponse } from 'next/server';
import { query, initDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    await initDb();

    const usersCount = await query('SELECT COUNT(*) as count FROM users');
    const leadsCount = await query('SELECT COUNT(*) as count FROM verified_leads');
    const threatDomainsCount = await query('SELECT COUNT(*) as count FROM threat_domains');
    const threatEmailsCount = await query('SELECT COUNT(*) as count FROM threat_emails');
    const jobsCount = await query('SELECT COUNT(*) as count FROM validation_jobs');
    const totalCreditsSpent = await query('SELECT SUM(credits_spent) as total FROM validation_jobs');

    return NextResponse.json({
      totalUsers: usersCount.rows[0]?.count || 0,
      totalVerifiedLeads: leadsCount.rows[0]?.count || 0,
      totalThreatDomains: threatDomainsCount.rows[0]?.count || 0,
      totalThreatEmails: threatEmailsCount.rows[0]?.count || 0,
      totalJobs: jobsCount.rows[0]?.count || 0,
      totalCreditsSpent: totalCreditsSpent.rows[0]?.total || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
