import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Universal database abstraction:
// - Uses PostgreSQL (Supabase / Neon) when DATABASE_URL is set
// - Uses SQLite (better-sqlite3) when running locally without DATABASE_URL
// Zero config, zero vendor lock-in!

let pgPool: any = null;
let sqliteDb: any = null;

const isPostgres = Boolean(process.env.DATABASE_URL);

function getSqliteDb() {
  if (!sqliteDb) {
    const Database = require('better-sqlite3');
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'truthmail.db');
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
  }
  return sqliteDb;
}

function getPgPool() {
  if (!pgPool) {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return pgPool;
}

export async function query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
  if (isPostgres) {
    const pool = getPgPool();
    // Convert ? to $1, $2, etc for Postgres
    let pSql = sql;
    let paramIndex = 1;
    pSql = pSql.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await pool.query(pSql, params);
    return { rows: res.rows };
  } else {
    const db = getSqliteDb();
    const isSelect = /^\s*(SELECT|PRAGMA)/i.test(sql);
    if (isSelect) {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      return { rows };
    } else {
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      return { rows: [info] };
    }
  }
}

let initialized = false;

export async function initDb() {
  if (initialized) return;

  if (isPostgres) {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        email_verified BOOLEAN DEFAULT FALSE,
        role VARCHAR(32) DEFAULT 'user',
        credits_balance INT DEFAULT 500,
        google_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS verification_otps (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(16) NOT NULL,
        type VARCHAR(32) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS verified_leads (
        id VARCHAR(64) PRIMARY KEY,
        canonical_email VARCHAR(255) UNIQUE NOT NULL,
        raw_email VARCHAR(255) NOT NULL,
        domain VARCHAR(255) NOT NULL,
        local_part VARCHAR(128) NOT NULL,
        provider_type VARCHAR(64),
        quality_score INT DEFAULT 98,
        has_spf BOOLEAN DEFAULT TRUE,
        has_dmarc BOOLEAN DEFAULT TRUE,
        times_seen INT DEFAULT 1,
        first_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS threat_domains (
        domain VARCHAR(255) PRIMARY KEY,
        classification VARCHAR(64) NOT NULL,
        reason VARCHAR(255),
        times_seen INT DEFAULT 1,
        last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS threat_emails (
        email VARCHAR(255) PRIMARY KEY,
        category VARCHAR(64) NOT NULL,
        reported_count INT DEFAULT 1,
        last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS validation_jobs (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        filename VARCHAR(255),
        total_emails INT DEFAULT 0,
        mailable_count INT DEFAULT 0,
        non_mailable_count INT DEFAULT 0,
        risky_count INT DEFAULT 0,
        unknown_count INT DEFAULT 0,
        credits_spent INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  } else {
    const db = getSqliteDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        email_verified INTEGER DEFAULT 0,
        role TEXT DEFAULT 'user',
        credits_balance INTEGER DEFAULT 500,
        google_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS verification_otps (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        otp TEXT NOT NULL,
        type TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS verified_leads (
        id TEXT PRIMARY KEY,
        canonical_email TEXT UNIQUE NOT NULL,
        raw_email TEXT NOT NULL,
        domain TEXT NOT NULL,
        local_part TEXT NOT NULL,
        provider_type TEXT,
        quality_score INTEGER DEFAULT 98,
        has_spf INTEGER DEFAULT 1,
        has_dmarc INTEGER DEFAULT 1,
        times_seen INTEGER DEFAULT 1,
        first_verified_at TEXT DEFAULT (datetime('now')),
        last_verified_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS threat_domains (
        domain TEXT PRIMARY KEY,
        classification TEXT NOT NULL,
        reason TEXT,
        times_seen INTEGER DEFAULT 1,
        last_verified_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS threat_emails (
        email TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        reported_count INTEGER DEFAULT 1,
        last_verified_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS validation_jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        filename TEXT,
        total_emails INTEGER DEFAULT 0,
        mailable_count INTEGER DEFAULT 0,
        non_mailable_count INTEGER DEFAULT 0,
        risky_count INTEGER DEFAULT 0,
        unknown_count INTEGER DEFAULT 0,
        credits_spent INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_leads_canonical_email ON verified_leads(canonical_email);
      CREATE INDEX IF NOT EXISTS idx_leads_domain ON verified_leads(domain);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
  }

  // Seed default admin and demo user
  const bcrypt = require('bcryptjs');
  const adminCheck = await query('SELECT id FROM users WHERE email = ?', ['admin@truthmail.com']);
  if (adminCheck.rows.length === 0) {
    const adminPassHash = bcrypt.hashSync('Admin@123456', 10);
    await query(
      `INSERT INTO users (id, name, email, password_hash, email_verified, role, credits_balance) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['user_admin_001', 'TruthMail Admin', 'admin@truthmail.com', adminPassHash, 1, 'admin', 100000]
    );
  }

  const demoCheck = await query('SELECT id FROM users WHERE email = ?', ['demo@truthmail.com']);
  if (demoCheck.rows.length === 0) {
    const demoPassHash = bcrypt.hashSync('Demo@123456', 10);
    await query(
      `INSERT INTO users (id, name, email, password_hash, email_verified, role, credits_balance) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['user_demo_002', 'Demo Member', 'demo@truthmail.com', demoPassHash, 1, 'user', 500]
    );
  }

  initialized = true;
}

// Canonical Email Normalizer for 100% duplicate protection
export function canonicalizeEmail(email: string): { canonical: string; domain: string; localPart: string } {
  const trimmed = (email || '').trim().toLowerCase();
  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { canonical: trimmed, domain: '', localPart: trimmed };
  }
  let [localPart, domain] = parts;

  // Gmail / Google Workspace canonicalization (remove dots and +subaddresses)
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    localPart = localPart.split('+')[0].replace(/\./g, '');
  }

  return {
    canonical: `${localPart}@${domain}`,
    domain,
    localPart,
  };
}

// Atomic Upsert for Verified Leads (Prevents duplicate rows across all users)
export async function upsertVerifiedLead(lead: {
  rawEmail: string;
  domain: string;
  localPart: string;
  providerType: string;
  qualityScore: number;
  hasSpf: boolean;
  hasDmarc: boolean;
}) {
  await initDb();
  const { canonical } = canonicalizeEmail(lead.rawEmail);

  if (isPostgres) {
    await query(
      `INSERT INTO verified_leads (
        id, canonical_email, raw_email, domain, local_part, provider_type, 
        quality_score, has_spf, has_dmarc, times_seen, first_verified_at, last_verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      ON CONFLICT (canonical_email) DO UPDATE SET
        times_seen = verified_leads.times_seen + 1,
        last_verified_at = NOW(),
        quality_score = EXCLUDED.quality_score`,
      [
        `lead_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        canonical,
        lead.rawEmail,
        lead.domain,
        lead.localPart,
        lead.providerType,
        lead.qualityScore,
        lead.hasSpf,
        lead.hasDmarc,
      ]
    );
  } else {
    // SQLite upsert
    const existing = await query('SELECT id, times_seen FROM verified_leads WHERE canonical_email = ?', [canonical]);
    if (existing.rows.length > 0) {
      await query(
        `UPDATE verified_leads SET 
          times_seen = times_seen + 1, 
          last_verified_at = datetime('now'),
          quality_score = ?
         WHERE canonical_email = ?`,
        [lead.qualityScore, canonical]
      );
    } else {
      await query(
        `INSERT INTO verified_leads (
          id, canonical_email, raw_email, domain, local_part, provider_type, 
          quality_score, has_spf, has_dmarc, times_seen, first_verified_at, last_verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
        [
          `lead_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          canonical,
          lead.rawEmail,
          lead.domain,
          lead.localPart,
          lead.providerType,
          lead.qualityScore,
          lead.hasSpf ? 1 : 0,
          lead.hasDmarc ? 1 : 0,
        ]
      );
    }
  }
}

// Atomic Upsert for Threat Domains
export async function upsertThreatDomain(domain: string, classification: string, reason: string) {
  await initDb();
  const lowerDomain = domain.toLowerCase().trim();

  if (isPostgres) {
    await query(
      `INSERT INTO threat_domains (domain, classification, reason, times_seen, last_verified_at)
       VALUES (?, ?, ?, 1, NOW())
       ON CONFLICT (domain) DO UPDATE SET
        times_seen = threat_domains.times_seen + 1,
        last_verified_at = NOW()`,
      [lowerDomain, classification, reason]
    );
  } else {
    const existing = await query('SELECT domain FROM threat_domains WHERE domain = ?', [lowerDomain]);
    if (existing.rows.length > 0) {
      await query(
        `UPDATE threat_domains SET times_seen = times_seen + 1, last_verified_at = datetime('now') WHERE domain = ?`,
        [lowerDomain]
      );
    } else {
      await query(
        `INSERT INTO threat_domains (domain, classification, reason, times_seen, last_verified_at)
         VALUES (?, ?, ?, 1, datetime('now'))`,
        [lowerDomain, classification, reason]
      );
    }
  }
}
