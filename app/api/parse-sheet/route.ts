import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to temp file
    const ext = path.extname(file.name) || '.csv';
    const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
    fs.writeFileSync(tempFilePath, buffer);

    const scriptPath = path.join(process.cwd(), 'scripts', 'parse_sheet.py');

    return new Promise<NextResponse>((resolve) => {
      execFile('python3', [scriptPath, tempFilePath], (error, stdout, stderr) => {
        // Clean up temp file
        try {
          if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        } catch {}

        if (error) {
          console.error('Error executing parse_sheet.py:', stderr || error.message);
          return resolve(
            NextResponse.json({ error: 'Failed to parse sheet file' }, { status: 500 })
          );
        }

        try {
          const parsed = JSON.parse(stdout);
          return resolve(NextResponse.json(parsed));
        } catch (e) {
          return resolve(
            NextResponse.json({ error: 'Invalid response from parser' }, { status: 500 })
          );
        }
      });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'File processing failed' }, { status: 500 });
  }
}
