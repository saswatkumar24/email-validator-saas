import { NextRequest, NextResponse } from 'next/server';
import { validateEmail } from '@/lib/email-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    const result = await validateEmail(email);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Validation failed' }, { status: 500 });
  }
}
