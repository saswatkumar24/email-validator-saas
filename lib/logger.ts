import fs from 'fs';
import path from 'path';

export interface BatchLogInput {
  runId?: string;
  jobId: string;
  timestamp: string;
  filename: string;
  batchIndex?: number;
  totalBatches?: number;
  batchEmailCount: number;
  durationMs: number;
  mailableCount: number;
  nonMailableCount: number;
  riskyCount: number;
  unknownCount: number;
  noMxDomains: Array<{
    domain: string;
    dnsReason: string;
    affectedEmails: string[];
  }>;
  riskBreakdown?: Record<string, number>;
  providerBreakdown?: Record<string, number>;
}

interface RunSession {
  runId: string;
  startTime: number;
  filename: string;
  totalBatches: number;
  completedBatches: number;
  totalEmails: number;
  mailable: number;
  nonMailable: number;
  risky: number;
  unknown: number;
  noMxDomainsMap: Map<string, {
    domain: string;
    dnsReason: string;
    affectedEmails: Set<string>;
  }>;
  batches: Array<{
    batchIndex: number;
    emailCount: number;
    durationMs: number;
    mailable: number;
    nonMailable: number;
    risky: number;
    unknown: number;
    noMxCount: number;
  }>;
}

const activeSessions = new Map<string, RunSession>();

export async function writeBatchRunLog(input: BatchLogInput) {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      await fs.promises.mkdir(logsDir, { recursive: true });
    }

    const safeFilename = (input.filename || 'batch_upload')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.[^/.]+$/, '');

    const runIdentifier = input.runId || `${new Date().toISOString().replace(/[:.]/g, '-')}_${safeFilename}`;

    let session = activeSessions.get(runIdentifier);
    if (!session) {
      session = {
        runId: runIdentifier,
        startTime: Date.now(),
        filename: input.filename || 'bulk_verification.csv',
        totalBatches: input.totalBatches || 1,
        completedBatches: 0,
        totalEmails: 0,
        mailable: 0,
        nonMailable: 0,
        risky: 0,
        unknown: 0,
        noMxDomainsMap: new Map(),
        batches: [],
      };
      activeSessions.set(runIdentifier, session);
    }

    session.completedBatches += 1;
    session.totalEmails += input.batchEmailCount;
    session.mailable += input.mailableCount;
    session.nonMailable += input.nonMailableCount;
    session.risky += input.riskyCount;
    session.unknown += input.unknownCount;

    for (const d of input.noMxDomains) {
      if (!session.noMxDomainsMap.has(d.domain)) {
        session.noMxDomainsMap.set(d.domain, {
          domain: d.domain,
          dnsReason: d.dnsReason,
          affectedEmails: new Set(d.affectedEmails),
        });
      } else {
        const existing = session.noMxDomainsMap.get(d.domain)!;
        d.affectedEmails.forEach((e) => existing.affectedEmails.add(e));
        if (d.dnsReason && (!existing.dnsReason || existing.dnsReason.includes('No active MX'))) {
          existing.dnsReason = d.dnsReason;
        }
      }
    }

    session.batches.push({
      batchIndex: input.batchIndex || session.completedBatches,
      emailCount: input.batchEmailCount,
      durationMs: input.durationMs,
      mailable: input.mailableCount,
      nonMailable: input.nonMailableCount,
      risky: input.riskyCount,
      unknown: input.unknownCount,
      noMxCount: input.noMxDomains.length,
    });

    const isComplete = session.completedBatches >= session.totalBatches;
    const elapsedSeconds = ((Date.now() - session.startTime) / 1000).toFixed(1);
    const speed = session.totalEmails > 0 && parseFloat(elapsedSeconds) > 0
      ? Math.round(session.totalEmails / parseFloat(elapsedSeconds))
      : 0;

    // Convert dead domains map to list
    const deadDomainList = Array.from(session.noMxDomainsMap.values()).map((d) => ({
      domain: d.domain,
      dnsReason: d.dnsReason,
      affectedEmails: Array.from(d.affectedEmails),
      affectedCount: d.affectedEmails.size,
    }));

    // 1. Structured JSON output
    const jsonOutput = {
      runId: session.runId,
      filename: session.filename,
      status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
      startedAt: new Date(session.startTime).toISOString(),
      updatedAt: new Date().toISOString(),
      elapsedSeconds: parseFloat(elapsedSeconds),
      emailsPerSecond: speed,
      progress: {
        completedBatches: session.completedBatches,
        totalBatches: session.totalBatches,
        totalEmailsProcessed: session.totalEmails,
      },
      summary: {
        mailable: session.mailable,
        nonMailable: session.nonMailable,
        risky: session.risky,
        unknown: session.unknown,
        uniqueDeadDomainsCount: deadDomainList.length,
      },
      deadDomains: deadDomainList,
      batches: session.batches,
    };

    const jsonFilePath = path.join(logsDir, `${session.runId}.json`);
    const logFilePath = path.join(logsDir, `${session.runId}.log`);

    await fs.promises.writeFile(jsonFilePath, JSON.stringify(jsonOutput, null, 2), 'utf-8');

    // 2. Human-Readable Audit Log
    const textLines: string[] = [
      `================================================================================`,
      `TRUTHMAIL VALIDATION RUN AUDIT LOG`,
      `================================================================================`,
      `Input File:            ${session.filename}`,
      `Run ID:                ${session.runId}`,
      `Started At:            ${new Date(session.startTime).toISOString()}`,
      `Status:                ${isComplete ? 'COMPLETED [All batches verified]' : `IN PROGRESS (Batch ${session.completedBatches} of ${session.totalBatches})`}`,
      `Emails Processed:      ${session.totalEmails.toLocaleString()}`,
      `Elapsed Time:          ${elapsedSeconds}s (${speed.toLocaleString()} emails/sec)`,
      `--------------------------------------------------------------------------------`,
      `RESULTS SUMMARY:`,
      `  [✓] Mailable (Valid):     ${session.mailable.toLocaleString()} (${session.totalEmails ? ((session.mailable / session.totalEmails) * 100).toFixed(1) : 0}%)`,
      `  [✗] Non-Mailable:         ${session.nonMailable.toLocaleString()} (${session.totalEmails ? ((session.nonMailable / session.totalEmails) * 100).toFixed(1) : 0}%)`,
      `  [!] Risky:                ${session.risky.toLocaleString()} (${session.totalEmails ? ((session.risky / session.totalEmails) * 100).toFixed(1) : 0}%)`,
      `  [?] Unknown:              ${session.unknown.toLocaleString()} (${session.totalEmails ? ((session.unknown / session.totalEmails) * 100).toFixed(1) : 0}%)`,
      `--------------------------------------------------------------------------------`,
      `DOMAINS FLAGGED AS 'NO MX RECORD' (${deadDomainList.length} unique domains):`,
      `--------------------------------------------------------------------------------`,
    ];

    if (deadDomainList.length === 0) {
      textLines.push(`  (None! All checked domains in this run had active MX mail servers)`);
    } else {
      deadDomainList.forEach((d, idx) => {
        textLines.push(`  ${idx + 1}. [${d.domain}]`);
        textLines.push(`     DNS Reason:       ${d.dnsReason}`);
        textLines.push(`     Affected Emails:  ${d.affectedCount} address(es) -> ${d.affectedEmails.slice(0, 3).join(', ')}${d.affectedCount > 3 ? ` ... +${d.affectedCount - 3} more` : ''}`);
        textLines.push(``);
      });
    }

    textLines.push(`--------------------------------------------------------------------------------`);
    textLines.push(`BATCH EXECUTION TIMELINE:`);
    textLines.push(`--------------------------------------------------------------------------------`);
    for (const b of session.batches) {
      textLines.push(
        `  Batch ${String(b.batchIndex).padStart(2, ' ')}/${session.totalBatches}: ${b.emailCount} emails in ${(b.durationMs / 1000).toFixed(2)}s | Mailable: ${b.mailable} | Dead Domains: ${b.noMxCount}`
      );
    }
    textLines.push(`================================================================================\n`);

    await fs.promises.writeFile(logFilePath, textLines.join('\n'), 'utf-8');
    console.log(`[TruthMail Audit] Updated run log: ${logFilePath}`);
  } catch (err) {
    console.error('Failed to write run log:', err);
  }
}
