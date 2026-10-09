import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// 100% Pure JavaScript Dual-Adapter Architecture
// - In Production (Render / Cloud): Connects to PostgreSQL (Supabase / Neon / Render Postgres) via `pg`
// - In Local / Standalone: Fast, atomic, persistent file-based JSON store in data/truthmail_store.json
// Zero native C++ binaries, ZERO SIGSEGV crashes during Next.js static build!

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  email_verified: number;
  role: 'user' | 'admin';
  credits_balance: number;
  google_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbLead {
  id: string;
  canonical_email: string;
  raw_email: string;
  domain: string;
  local_part: string;
  provider_type: string;
  quality_score: number;
  has_spf: number;
  has_dmarc: number;
  times_seen: number;
  first_verified_at: string;
  last_verified_at: string;
}

export interface DbThreatDomain {
  domain: string;
  classification: string;
  reason: string;
  times_seen: number;
  last_verified_at: string;
}

interface LocalStore {
  users: DbUser[];
  verification_otps: Array<{ id: string; email: string; otp: string; type: string; expires_at: string; created_at: string }>;
  verified_leads: DbLead[];
  threat_domains: DbThreatDomain[];
  threat_emails: Array<{ email: string; category: string; reported_count: number; last_verified_at: string }>;
  validation_jobs: Array<{
    id: string;
    user_id: string;
    filename: string;
    total_emails: number;
    mailable_count: number;
    non_mailable_count: number;
    risky_count: number;
    unknown_count: number;
    credits_spent: number;
    created_at: string;
  }>;
}

let pgPool: any = null;
let memoryStore: LocalStore | null = null;
const isPostgres = Boolean(process.env.DATABASE_URL);

const STORE_PATH = path.join(process.cwd(), 'data', 'truthmail_store.json');

function getLocalStore(): LocalStore {
  if (!memoryStore) {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    }

    if (fs.existsSync(STORE_PATH)) {
      try {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        memoryStore = JSON.parse(raw);
      } catch {
        memoryStore = createInitialStore();
      }
    } else {
      memoryStore = createInitialStore();
      saveLocalStore(memoryStore);
    }
  }
  return memoryStore!;
}

let saveTimer: any = null;
function saveLocalStore(store: LocalStore) {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await fs.promises.writeFile(STORE_PATH, JSON.stringify(store), 'utf-8');
    } catch (err) {
      console.error('Failed to save local store:', err);
    }
  }, 500);
}

function createInitialStore(): LocalStore {
  const adminPass = bcrypt.hashSync('Admin@123456', 10);
  const demoPass = bcrypt.hashSync('Demo@123456', 10);
  const alicePass = bcrypt.hashSync('Alice@123456', 10);
  const bobPass = bcrypt.hashSync('Bob@123456', 10);

  const now = new Date().toISOString();

  return {
    users: [
      {
        id: 'user_admin_001',
        name: 'TruthMail Admin',
        email: 'admin@truthmail.com',
        password_hash: adminPass,
        email_verified: 1,
        role: 'admin',
        credits_balance: 100000,
        google_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'user_demo_002',
        name: 'Demo Member',
        email: 'demo@truthmail.com',
        password_hash: demoPass,
        email_verified: 1,
        role: 'user',
        credits_balance: 100000,
        google_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'user_test_1',
        name: 'Alice Tester',
        email: 'alice.tester@truthmail.com',
        password_hash: alicePass,
        email_verified: 1,
        role: 'user',
        credits_balance: 100000,
        google_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'user_test_2',
        name: 'Bob Tester',
        email: 'bob.tester@truthmail.com',
        password_hash: bobPass,
        email_verified: 1,
        role: 'user',
        credits_balance: 100000,
        google_id: null,
        created_at: now,
        updated_at: now,
      },
    ],
    verification_otps: [],
    verified_leads: [],
    threat_domains: [],
    threat_emails: [],
    validation_jobs: [],
  };
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
    let pSql = sql;
    let paramIndex = 1;
    pSql = pSql.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await pool.query(pSql, params);
    return { rows: res.rows };
  }

  // Local Pure-JS Query Handler
  const store = getLocalStore();
  const lowerSql = sql.toLowerCase().trim();

  if (lowerSql.startsWith('select count(*)')) {
    if (lowerSql.includes('from users')) return { rows: [{ count: store.users.length }] };
    if (lowerSql.includes('from verified_leads')) return { rows: [{ count: store.verified_leads.length }] };
    if (lowerSql.includes('from threat_domains')) return { rows: [{ count: store.threat_domains.length }] };
    if (lowerSql.includes('from threat_emails')) return { rows: [{ count: store.threat_emails.length }] };
    if (lowerSql.includes('from validation_jobs')) return { rows: [{ count: store.validation_jobs.length }] };
    return { rows: [{ count: 0 }] };
  }

  if (lowerSql.startsWith('select sum(credits_spent)')) {
    const total = store.validation_jobs.reduce((sum, j) => sum + (j.credits_spent || 0), 0);
    return { rows: [{ total }] };
  }

  if (lowerSql.includes('from users')) {
    if (lowerSql.includes('where email = ?')) {
      const email = String(params[0] || '').toLowerCase().trim();
      const u = store.users.find((x) => x.email.toLowerCase() === email);
      return { rows: u ? [u] : [] };
    }
    if (lowerSql.includes('where id = ?')) {
      const u = store.users.find((x) => x.id === params[0]);
      return { rows: u ? [u] : [] };
    }
    return { rows: [...store.users] };
  }

  if (lowerSql.includes('from verified_leads')) {
    if (lowerSql.includes('where canonical_email = ?')) {
      const u = store.verified_leads.find((x) => x.canonical_email === params[0]);
      return { rows: u ? [u] : [] };
    }
    if (lowerSql.includes('where domain = ?')) {
      const filtered = store.verified_leads.filter((x) => x.domain === params[0]);
      return { rows: filtered };
    }
    return { rows: [...store.verified_leads] };
  }

  if (lowerSql.includes('from threat_domains')) {
    if (lowerSql.includes('where domain = ?')) {
      const u = store.threat_domains.find((x) => x.domain === String(params[0]).toLowerCase().trim());
      return { rows: u ? [u] : [] };
    }
    return { rows: [...store.threat_domains] };
  }

  if (lowerSql.includes('from verification_otps')) {
    if (lowerSql.includes('where email = ? and otp = ? and type = ?')) {
      const r = store.verification_otps.find(
        (x) => x.email === params[0] && x.otp === params[1] && x.type === params[2]
      );
      return { rows: r ? [r] : [] };
    }
    return { rows: [...store.verification_otps] };
  }

  if (lowerSql.startsWith('update users')) {
    if (lowerSql.includes('set credits_balance = ? where id = ?')) {
      const u = store.users.find((x) => x.id === params[1]);
      if (u) {
        u.credits_balance = Number(params[0]);
        saveLocalStore(store);
      }
      return { rows: [] };
    }
    if (lowerSql.includes('set credits_balance = credits_balance - ? where id = ?')) {
      const u = store.users.find((x) => x.id === params[1]);
      if (u) {
        u.credits_balance = Math.max(0, u.credits_balance - Number(params[0]));
        saveLocalStore(store);
      }
      return { rows: [] };
    }
    if (lowerSql.includes('set email_verified = 1')) {
      const u = store.users.find((x) => x.email === params[0]);
      if (u) {
        u.email_verified = 1;
        saveLocalStore(store);
      }
      return { rows: [] };
    }
    if (lowerSql.includes('set password_hash = ?')) {
      const u = store.users.find((x) => x.email === params[1]);
      if (u) {
        u.password_hash = params[0];
        saveLocalStore(store);
      }
      return { rows: [] };
    }
  }

  if (lowerSql.startsWith('insert into users')) {
    const user: DbUser = {
      id: params[0],
      name: params[1],
      email: params[2],
      password_hash: params[3],
      email_verified: params[4] ? 1 : 0,
      role: params[5] || 'user',
      credits_balance: params[6] || 500,
      google_id: params[7] || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.users.push(user);
    saveLocalStore(store);
    return { rows: [user] };
  }

  if (lowerSql.startsWith('insert into verification_otps')) {
    store.verification_otps.push({
      id: params[0],
      email: params[1],
      otp: params[2],
      type: params[3],
      expires_at: params[4],
      created_at: new Date().toISOString(),
    });
    saveLocalStore(store);
    return { rows: [] };
  }

  if (lowerSql.startsWith('delete from verification_otps')) {
    store.verification_otps = store.verification_otps.filter((x) => x.id !== params[0]);
    saveLocalStore(store);
    return { rows: [] };
  }

  if (lowerSql.startsWith('insert into validation_jobs')) {
    store.validation_jobs.push({
      id: params[0],
      user_id: params[1],
      filename: params[2],
      total_emails: params[3],
      mailable_count: params[4],
      non_mailable_count: params[5],
      risky_count: params[6],
      unknown_count: params[7],
      credits_spent: params[8],
      created_at: new Date().toISOString(),
    });
    saveLocalStore(store);
    return { rows: [] };
  }

  return { rows: [] };
}

let initialized = false;

export async function initDb() {
  if (initialized) return;

  if (isPostgres) {
    try {
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

      // Seed default accounts
      const adminCheck = await query('SELECT id FROM users WHERE email = ?', ['admin@truthmail.com']);
      if (adminCheck.rows.length === 0) {
        const adminPassHash = bcrypt.hashSync('Admin@123456', 10);
        await query(
          `INSERT INTO users (id, name, email, password_hash, email_verified, role, credits_balance) 
           VALUES (?, ?, ?, ?, TRUE, 'admin', 100000)`,
          ['user_admin_001', 'TruthMail Admin', 'admin@truthmail.com', adminPassHash]
        );
      }
    } catch (err) {
      console.error('PostgreSQL init error:', err);
    }
  } else {
    // Pure JS local storage auto-loads
    getLocalStore();
  }

  initialized = true;
}

export function canonicalizeEmail(email: string): { canonical: string; domain: string; localPart: string } {
  const trimmed = (email || '').trim().toLowerCase();
  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { canonical: trimmed, domain: '', localPart: trimmed };
  }
  let [localPart, domain] = parts;

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    localPart = localPart.split('+')[0].replace(/\./g, '');
  }

  return {
    canonical: `${localPart}@${domain}`,
    domain,
    localPart,
  };
}

export async function batchUpsertVerifiedLeads(leads: Array<{
  rawEmail: string;
  domain: string;
  localPart: string;
  providerType: string;
  qualityScore: number;
  hasSpf: boolean;
  hasDmarc: boolean;
}>) {
  if (!leads || leads.length === 0) return;
  await initDb();

  if (isPostgres) {
    for (const lead of leads) {
      const { canonical } = canonicalizeEmail(lead.rawEmail);
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
    }
  } else {
    const store = getLocalStore();
    const now = new Date().toISOString();

    for (const lead of leads) {
      const { canonical } = canonicalizeEmail(lead.rawEmail);
      const existing = store.verified_leads.find((x) => x.canonical_email === canonical);
      if (existing) {
        existing.times_seen += 1;
        existing.last_verified_at = now;
        existing.quality_score = lead.qualityScore;
      } else {
        store.verified_leads.push({
          id: `lead_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          canonical_email: canonical,
          raw_email: lead.rawEmail,
          domain: lead.domain,
          local_part: lead.localPart,
          provider_type: lead.providerType,
          quality_score: lead.qualityScore,
          has_spf: lead.hasSpf ? 1 : 0,
          has_dmarc: lead.hasDmarc ? 1 : 0,
          times_seen: 1,
          first_verified_at: now,
          last_verified_at: now,
        });
      }
    }
    saveLocalStore(store);
  }
}

export async function batchUpsertThreatDomains(threats: Array<{ domain: string; classification: string; reason: string }>) {
  if (!threats || threats.length === 0) return;
  await initDb();

  if (isPostgres) {
    for (const t of threats) {
      const lower = t.domain.toLowerCase().trim();
      await query(
        `INSERT INTO threat_domains (domain, classification, reason, times_seen, last_verified_at)
         VALUES (?, ?, ?, 1, NOW())
         ON CONFLICT (domain) DO UPDATE SET
          times_seen = threat_domains.times_seen + 1,
          last_verified_at = NOW()`,
        [lower, t.classification, t.reason]
      );
    }
  } else {
    const store = getLocalStore();
    const now = new Date().toISOString();

    for (const t of threats) {
      const lower = t.domain.toLowerCase().trim();
      const existing = store.threat_domains.find((x) => x.domain === lower);
      if (existing) {
        existing.times_seen += 1;
        existing.last_verified_at = now;
      } else {
        store.threat_domains.push({
          domain: lower,
          classification: t.classification,
          reason: t.reason,
          times_seen: 1,
          last_verified_at: now,
        });
      }
    }
    saveLocalStore(store);
  }
}

export async function upsertVerifiedLead(lead: {
  rawEmail: string;
  domain: string;
  localPart: string;
  providerType: string;
  qualityScore: number;
  hasSpf: boolean;
  hasDmarc: boolean;
}) {
  await batchUpsertVerifiedLeads([lead]);
}

export async function upsertThreatDomain(domain: string, classification: string, reason: string) {
  await batchUpsertThreatDomains([{ domain, classification, reason }]);
}
