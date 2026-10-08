import { NextRequest, NextResponse } from 'next/server';
import { validateBatch } from '@/lib/email-engine';
import { getCurrentUser } from '@/lib/auth';
import { query, initDb, upsertVerifiedLead, upsertThreatDomain } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const user = await getCurrentUser(req);
    const body = await req.json();
    const { emails, filename } = body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Array of emails is required' }, { status: 400 });
    }

    // Deduplicate emails in-memory so user is not double-charged for duplicate rows in their file
    const uniqueRawEmails = Array.from(new Set(emails.map((e: string) => (e || '').trim()).filter(Boolean)));

    // Check credits if logged in
    if (user) {
      if (user.creditsBalance < uniqueRawEmails.length) {
        return NextResponse.json(
          { error: `Insufficient credits. You need ${uniqueRawEmails.length} credits, but have ${user.creditsBalance}. Please top up your balance.` },
          { status: 402 }
        );
      }
    }

    // Execute 12-stage validation engine
    const summary = await validateBatch(uniqueRawEmails);

    // Asynchronously archive intelligence into DB (Deduplicated UPSERT)
    (async () => {
      try {
        for (const item of summary.results) {
          if (item.status === 'mailable') {
            const providerType = item.details.isFreeProvider
              ? item.details.domain.includes('google') || item.details.domain.includes('gmail')
                ? 'google'
                : item.details.domain.includes('yahoo')
                ? 'yahoo'
                : 'other_free'
              : 'corporate_b2b';

            await upsertVerifiedLead({
              rawEmail: item.email,
              domain: item.details.domain,
              localPart: item.email.split('@')[0],
              providerType,
              qualityScore: item.qualityScore,
              hasSpf: item.details.spfFound,
              hasDmarc: item.details.dmarcFound,
            });
          } else if (item.subStatus === 'no_mx_record') {
            await upsertThreatDomain(item.details.domain, 'no_mx', item.details.smtpMessage);
          } else if (item.subStatus === 'spam_trap_detected') {
            await upsertThreatDomain(item.details.domain, 'spam_trap', 'Identified honeypot / spam trap');
          }
        }
      } catch (e) {
        console.error('Async DB archiving error:', e);
      }
    })();

    // Deduct credits and log validation job
    let remainingCredits = user ? user.creditsBalance - uniqueRawEmails.length : 100000;
    if (user) {
      await query('UPDATE users SET credits_balance = credits_balance - ? WHERE id = ?', [uniqueRawEmails.length, user.id]);
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await query(
        `INSERT INTO validation_jobs (
          id, user_id, filename, total_emails, mailable_count, non_mailable_count, 
          risky_count, unknown_count, credits_spent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          jobId,
          user.id,
          filename || 'bulk_verification.csv',
          uniqueRawEmails.length,
          summary.mailable,
          summary.nonMailable,
          summary.risky,
          summary.unknown,
          uniqueRawEmails.length,
        ]
      );
    }

    return NextResponse.json({
      ...summary,
      remainingCredits,
      user: user ? { ...user, creditsBalance: remainingCredits } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Batch validation failed' }, { status: 500 });
  }
}
