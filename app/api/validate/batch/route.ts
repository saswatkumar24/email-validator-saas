import { NextRequest, NextResponse } from 'next/server';
import { validateBatch } from '@/lib/email-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emails } = body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Array of emails is required' }, { status: 400 });
    }

    // Unlimited testing mode: removed arbitrary 500 limit
    const summary = await validateBatch(emails);
    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Batch validation failed' }, { status: 500 });
  }
}
