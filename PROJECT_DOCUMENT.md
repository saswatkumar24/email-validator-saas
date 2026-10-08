# Product Requirements & Architecture Document: Enterprise Email Validation SaaS

> **Project Name:** TruthMail / VerifyPulse *(Working Title)*  
> **Market Target:** Alternative to ZeroBounce, NeverBounce, Debounce, Hunter.io  
> **Document Version:** 1.0.0  
> **Target Audience:** Product Managers, System Architects, Backend/Frontend Engineers, DevOps, Business Stakeholders  

---

## 1. Executive Summary & Vision

### 1.1 Product Vision
To build an enterprise-grade, high-throughput Email Validation & Deliverability Intelligence SaaS platform. The product ensures outbound sales teams, marketing departments, newsletters, and developers scrub their email contact lists to protect sender reputation, eliminate hard bounces, detect malicious spam traps/honeypots, filter disposable addresses, and identify low-engagement "greymail".

### 1.2 Core Value Proposition
- **99%+ Deliverability Guarantee:** Eliminate hard bounces and protect client domain sender scores.
- **Multidimensional Detection Engine:** 12-stage validation pipeline running in milliseconds per email or scaling to millions of bulk emails per hour.
- **Actionable Risk Intelligence:** Granular categorization into *Mailable*, *Non-Mailable (Undeliverable)*, *Risky*, and *Unknown*, with detailed sub-statuses (Spam Traps, Honeypots, Greymail, Catch-All, Role-based, DNS issues).
- **Flexible Monetization:** Hybrid pricing model combining recurring monthly/annual subscription tiers with pay-as-you-go rollover credit packs.
- **Developer-First API & Turnkey Dashboard:** Single real-time verification endpoint, bulk list async API, webhooks, and an intuitive drag-and-drop dashboard for non-technical users.

---

## 2. Competitive Benchmarking (vs. ZeroBounce)

| Feature / Capability | Industry Benchmark (ZeroBounce) | Our SaaS Architecture |
| :--- | :--- | :--- |
| **Verification Accuracy** | 99% accuracy | 99.2% multi-stage recursive verification |
| **Spam Trap Detection** | Proprietary trap network & honeypot DB | Heuristic + DNSBL + Seed network blacklists |
| **Greymail / Inactive Detection** | Identifies low-open rate addresses | Domain activity tracking & mailbox engagement scoring |
| **Catch-All Detection** | Flags accept-all servers | Advanced SMTP probe heuristics with confidence rating |
| **SMTP Verification** | Deep handshake without sending email | Distributed IP-rotated SMTP handshake workers with greylisting retry |
| **File Formats Supported** | CSV, TXT, XLSX | CSV, XLSX, TXT, TSV with auto-column detection |
| **API Latency** | ~400ms - 900ms per single check | Target <350ms with multi-tiered in-memory DNS/domain cache |
| **Data Privacy** | GDPR, SOC2 compliance | Zero-storage data scrubbing options (ephemeral list scrubbing) |
| **Pricing Strategy** | Credit packs + Monthly minimums | Competitive tiered plans + automatic credit rollover + pay-as-you-go |

---

## 3. The 12-Step Validation Engine Pipeline

Every single or bulk email passes through a staged verification funnel. If an early stage determines a definitive hard-fail, subsequent heavy operations (like SMTP handshakes) can be short-circuited to conserve server resources and maximize throughput.

```mermaid
flowchart TD
    A[Raw Email Input] --> B[1. Syntax & RFC 5322 Validator]
    B -->|Invalid| FAIL[Result: Non-Mailable / Invalid]
    B -->|Valid| C[2. Typo & Domain Suggester]
    C --> D[3. Disposable / Temp Mail Check]
    D -->|Match| RISKY[Result: Risky - Disposable]
    D -->|Clean| E[4. Role Account Detection]
    E --> F[5. Free / Consumer Provider Check]
    F --> G[6. DNS MX & A Record Resolution]
    G -->|No MX/A| FAIL
    G -->|Valid MX| H[7. DNSBL / Blacklist & Spam Trap Scoring]
    H -->|High Risk Trap| FAIL
    H -->|Clean| I[8. Catch-All / Accept-All Test]
    I --> J[9. SMTP Handshake Simulation RCPT TO]
    J -->|550 Mailbox Not Found| FAIL
    J -->|451 Greylisted| K[Retry Queue with Backoff]
    K --> J
    J -->|250 OK| L[10. Mailbox Full & Quota Check]
    L --> M[11. Greymail & Engagement Score]
    M --> N[12. Final Classification & Score Aggregation 0-100]
```

### Detailed Pipeline Breakdown

1. **Syntax & RFC 5322 Engine:**
   - Validates regex compliance, length limits (local part <= 64 chars, total <= 254 chars), double dots (`..`), invalid special characters, unicode handling.
2. **Typo & Smart Domain Suggester:**
   - Detects common misspellings (e.g., `gamil.com` -> `gmail.com`, `hotmial.com` -> `hotmail.com`, `outlok.com` -> `outlook.com`) using Levenshtein distance against top 5,000 global mail provider domains.
3. **Disposable & Temporary Email Filter:**
   - Real-time matching against a dynamic blocklist of 30,000+ burner domains (Mailinator, GuerrillaMail, 10MinuteMail, TempMail) updated daily via automated feeds.
4. **Role-Based Account Identifier:**
   - Flags non-personal mailboxes (`admin@`, `support@`, `sales@`, `billing@`, `info@`, `contact@`, `team@`, `help@`, `jobs@`). While deliverable, they often cause high spam complaints or unmonitored dropoffs.
5. **Free Provider vs. Business Domain Classification:**
   - Classifies if the domain belongs to free consumer providers (Gmail, Yahoo, Outlook, Proton) vs. custom corporate domains.
6. **DNS & MX Record Verification:**
   - Queries authorative name servers for active MX records, fallback A records, and calculates priority ranking. Verifies TTL and domain status (parked, expired, NXDOMAIN).
7. **Spam Trap & Honeypot Detection:**
   - Identifies pristine spam traps, recycled spam traps, typosquatting traps, and known blacklisted bot trap addresses collected from seed networks and security blocklists.
8. **Catch-All (Accept-All) Domain Analysis:**
   - Probes domain with a randomized non-existent mailbox prefix (`probe_test_9x92@domain.com`). If the server returns HTTP/SMTP 250 OK, domain is designated as "Catch-All", meaning deliverability cannot be 100% verified via SMTP.
9. **SMTP Handshake Simulation (Deep Mailbox Check):**
   - Connects to recipient mail exchanger via port 25 without sending an email:
     - `HELO / EHLO mail.ourdomain.com`
     - `MAIL FROM: <verify@ourdomain.com>`
     - `RCPT TO: <target@clientdomain.com>`
     - Inspects RFC response code: `250 OK` (exists), `550 User unknown / No such recipient` (hard bounce), `450/451/452 Temporary failure / Greylisted`.
     - `RSET` and `QUIT` cleanly terminate session.
10. **Greylisting & Transient Failure Handler:**
    - Detects servers utilizing anti-spam greylisting (forcing initial deferred responses). Automatically puts transaction into an asynchronous delayed queue (re-checks in 5 to 15 minutes).
11. **Greymail & Activity Indexing:**
    - Flags addresses that are technically deliverable but exhibit low open rates, automated newsletters, dormant accounts, or high bounce probability based on historical domain activity.
12. **Deliverability Quality Score (0-100):**
    - Computes an aggregate deliverability score factoring MX health, spam trap distance, catch-all ambiguity, and mailbox response timings.

---

## 4. Categorization & Reporting Engine

### 4.1 Master Categorization Taxonomy

Every verified email is tagged with a primary status and sub-status codes:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EMAIL VALIDATION STATUS                         │
├─────────────────┬───────────────────┬─────────────────┬────────────────┤
│    MAILABLE     │   NON-MAILABLE    │      RISKY      │    UNKNOWN     │
│    (Valid)      │   (Invalid)       │                 │                │
├─────────────────┼───────────────────┼─────────────────┼────────────────┤
│ • Valid Mailbox │ • Non-existent    │ • Catch-All     │ • Timeout      │
│ • Verified MX   │ • Syntax Error    │ • Disposable    │ • Greylist Max │
│ • 250 Response  │ • Domain Invalid  │ • Spam Trap     │ • Server Down  │
│                 │ • Mailbox Full    │ • Role-Based    │ • Blocked Port │
│                 │ • Blocked Domain  │ • Greymail      │ • Rate Limit   │
└─────────────────┴───────────────────┴─────────────────┴────────────────┘
```

### 4.2 Detailed Reporting & Analytics Metrics

When a user processes a list, the platform generates a comprehensive interactive report:

#### Summary Overview
- **Total Processed:** Raw count of scanned entries.
- **Mailable %:** Percentage of high-confidence deliverable emails (typically 80-95%).
- **Non-Mailable %:** Bounce-inducing addresses (hard bounces avoided).
- **Risky %:** High hazard emails that require caution (catch-all, role accounts, spam traps).
- **Unknown %:** Inconclusive addresses (credits refunded or discounted).
- **Estimated Bounce Prevention Rate:** Calculated bounce rate reduction (e.g., "Scrubbing saved you from an estimated 14.8% bounce rate").

#### Deep Risk & Breakdown Analytics
- **Spam Trap Counter:** Dangerous addresses that will instantly flag sender IPs on Spamhaus/Barracuda.
- **Disposable / Burner Addresses:** Disposable emails identified and removed.
- **Greymail Breakdown:** Deliverable addresses associated with low engagement or high complaint risks.
- **Role Accounts:** Distribution of generic mailboxes (`support@`, `sales@`, etc.).
- **Top Domain Distribution:** Breakdown of list composition (Gmail vs. Outlook vs. Yahoo vs. B2B Corporate Domains).
- **MX Server Health Matrix:** Distribution across Google Workspace, Microsoft 365, Proofpoint, Mimecast, self-hosted Postfix/Exim.

#### Advanced Export & Segmentation Tools
The reporting interface allows one-click custom filtering and export:
1. **Quick Clean Export:** Only "Mailable" (100% safe to send).
2. **Custom Segmented Export:**
   - Include/exclude Catch-All based on risk tolerance.
   - Include/exclude Role-based accounts.
   - Include/exclude Greymail.
3. **Appended Data Export:** Original columns retained + appended audit columns (`validation_status`, `sub_status`, `quality_score`, `mx_record`, `smtp_code`, `suggested_domain_typo`).
4. **Suppression List Generator:** Export non-mailable and spam traps directly formatted for importation into SendGrid, Mailchimp, Klaviyo, HubSpot, or ActiveCampaign as an unsubscribe/suppression list.

---

## 5. SaaS Business Model & Subscription Tiers

A hybrid monetization structure that maximizes Monthly Recurring Revenue (MRR) through subscription tiers while allowing low-barrier entry via Pay-As-You-Go credit packs.

### 5.1 Monthly & Annual Subscription Plans

| Tier Name | Price (Monthly / Annual) | Included Credits / Mo | Price Per Additional 1k | Key Features |
| :--- | :--- | :--- | :--- | :--- |
| **Free Trial** | \$0 | 100 free credits | N/A | Single & bulk upload, standard report, full export |
| **Starter** | \$29 / mo (\$24/mo billed annually) | 5,000 | \$4.00 | Bulk list upload, Single API (10 req/s), Spam trap detection, CSV export |
| **Growth** | \$79 / mo (\$65/mo billed annually) | 25,000 | \$3.00 | Real-time API (30 req/s), Auto-typo fixes, Greymail analysis, 3 team members |
| **Professional** | \$199 / mo (\$165/mo billed annually) | 100,000 | \$2.00 | High-speed processing, Unlimited team seats, Catch-all scoring, ESP integrations |
| **Enterprise** | \$599+ / mo (Custom) | 500,000+ | \$1.20 | Dedicated IP pools, SLA 99.9%, Custom webhooks, Zero-log security, Dedicated TAM |

### 5.2 Pay-As-You-Go Credit Packs (Non-Expiring)
For users who do not have recurring monthly volume:
- **2,000 Credits:** \$18 (\$0.0090 / credit)
- **10,000 Credits:** \$65 (\$0.0065 / credit)
- **50,000 Credits:** \$250 (\$0.0050 / credit)
- **250,000 Credits:** \$850 (\$0.0034 / credit)
- **1,000,000 Credits:** \$2,250 (\$0.00225 / credit)

### 5.3 Billing Rules & Policies
- **Unknown Status Policy:** Any email classified as "Unknown" due to internal system timeouts or unresponsive foreign servers automatically has its credit refunded back to the user balance.
- **Rollover Rule:** Active subscribers roll over unused monthly credits up to 2x their plan limit.
- **Auto-Recharge Safeguard:** Optional toggle to automatically purchase credit top-ups when account drops below 10% balance to prevent production API outages.

---

## 6. System Architecture & Technical Specifications

```mermaid
flowchart LR
    subgraph Clients
        WEB[Web Dashboard Next.js]
        API_CLIENT[Developer / Zapier / ESP API]
    end

    subgraph Edge & Gateway
        CF[Cloudflare CDN & WAF]
        GATEWAY[API Gateway & Rate Limiter Redis]
    end

    subgraph Application Core
        AUTH[Auth & Billing Service Stripe]
        JOBS[Job Orchestrator & File Processor]
        API_SRV[Validation API Service]
    end

    subgraph Distributed Engine
        QUEUE[BullMQ / Redis Task Queues]
        DNS_POOL[Dedicated Caching DNS Resolvers]
        WORKERS[Distributed SMTP Worker Nodes]
        PROXY[IP Warmup & Egress Proxy Pool]
    end

    subgraph Storage & Data
        PG[(PostgreSQL Users, Teams, Billing)]
        CLICKHOUSE[(ClickHouse Logs & Scan Records)]
        S3[(Object Storage R2/S3 Uploads & Reports)]
        REDIS_CACHE[(Redis Fast Cache & Blocklists)]
    end

    WEB --> CF --> GATEWAY
    API_CLIENT --> CF --> GATEWAY
    GATEWAY --> AUTH
    GATEWAY --> JOBS
    GATEWAY --> API_SRV

    JOBS --> S3
    JOBS --> QUEUE
    API_SRV --> QUEUE

    QUEUE --> WORKERS
    WORKERS --> DNS_POOL
    WORKERS --> PROXY
    WORKERS --> REDIS_CACHE

    WORKERS --> CLICKHOUSE
    JOBS --> PG
```

### 6.1 Recommended Technology Stack

- **Frontend Application:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui components, Recharts for data analytics, PapaParse for client-side preview parsing.
- **API & Backend Service:** Node.js (TypeScript) or Go (Golang) for ultra-low latency concurrency.
- **Distributed Worker Engine:** Go or Node.js workers orchestrated via BullMQ / Redis or Temporal.
- **Database Layer:**
  - **PostgreSQL:** Multi-tenant accounts, subscription plans, API keys, teams, billing history, upload job metadata.
  - **ClickHouse or PostgreSQL Partitioned Tables:** High-throughput logging of millions of individual email validation results.
  - **Redis Cluster:** Distributed rate-limiting, job queueing, DNS resolution caching, disposable domain sets, active session stores.
- **Object Storage:** Cloudflare R2 or AWS S3 with pre-signed URLs for customer file uploads and scrubbed report downloads.
- **Billing & Subscriptions:** Stripe Billing (Customer Portal, Webhooks, Invoicing, Tax).

### 6.2 Crucial Deliverability Infrastructure for SMTP Probes
To avoid our validation servers being blocked or blacklisted by Google, Yahoo, Microsoft, or Spamhaus:
1. **Warm Reverse DNS (PTR Records):** Every worker IP running SMTP handshakes must have a valid FQDN with matching forward (A) and reverse (PTR) DNS records.
2. **Strict Rate Limiting Per MX:** The worker pool must throttle connections to large providers (e.g., maximum 5 simultaneous connections to `*.aspmx.l.google.com` per worker IP) with jitter delays.
3. **Legitimate HELO Hostnames & SPF:** The handshake probe must identify itself with a legitimate, registered domain containing an active postmaster and contact policy.
4. **Proxy Egress Rotation:** In large-scale operations, rotate requests across clean, whitelisted residential/datacenter IPv4 and IPv6 egress pools to prevent temporary IP bans (`421 Service not available`).

---

## 7. Data Models & API Specifications

### 7.1 Database Schema (Simplified PostgreSQL)

```sql
-- Users and Multi-Tenant Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    plan_tier VARCHAR(50) DEFAULT 'free',
    credits_balance INTEGER DEFAULT 100,
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'owner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    prefix VARCHAR(16) NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk Validation Jobs
CREATE TABLE validation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_file_url TEXT NOT NULL,
    cleaned_file_url TEXT,
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    valid_count INTEGER DEFAULT 0,
    invalid_count INTEGER DEFAULT 0,
    risky_count INTEGER DEFAULT 0,
    unknown_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'queued', -- queued, processing, completed, failed
    credits_deducted INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validation Records (for single API or bulk detail inspect)
CREATE TABLE validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES validation_jobs(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL, -- mailable, non_mailable, risky, unknown
    sub_status VARCHAR(50) NOT NULL, -- valid, mailbox_not_found, disposable, catch_all, spam_trap, role_based, greymail, syntax_error
    quality_score SMALLINT NOT NULL, -- 0 to 100
    is_free_provider BOOLEAN DEFAULT FALSE,
    is_role_account BOOLEAN DEFAULT FALSE,
    is_disposable BOOLEAN DEFAULT FALSE,
    is_catch_all BOOLEAN DEFAULT FALSE,
    is_spam_trap BOOLEAN DEFAULT FALSE,
    is_greymail BOOLEAN DEFAULT FALSE,
    domain VARCHAR(255) NOT NULL,
    mx_record VARCHAR(255),
    smtp_code VARCHAR(10),
    smtp_response TEXT,
    suggested_correction VARCHAR(255),
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7.2 Core REST API Endpoints

#### Single Real-Time Verification
```http
POST /v1/validate/single
Authorization: Bearer sec_live_abcdef123456
Content-Type: application/json

{
  "email": "sarah.connor@gmail.com",
  "ip_address": "203.0.113.195", // optional for geo-heuristic check
  "timeout_seconds": 3
}
```

**Response (200 OK):**
```json
{
  "email": "sarah.connor@gmail.com",
  "status": "mailable",
  "sub_status": "valid_mailbox",
  "quality_score": 98,
  "details": {
    "syntax_valid": true,
    "domain": "gmail.com",
    "mx_found": true,
    "mx_record": "gmail-smtp-in.l.google.com",
    "smtp_check": true,
    "smtp_code": "250",
    "is_catch_all": false,
    "is_disposable": false,
    "is_role_based": false,
    "is_free_email": true,
    "is_spam_trap": false,
    "is_greymail": false,
    "did_you_mean": null
  },
  "processed_at": "2026-10-07T17:48:22Z",
  "execution_time_ms": 142,
  "credits_remaining": 4982
}
```

#### Bulk List Upload Initiation
```http
POST /v1/validate/bulk
Authorization: Bearer sec_live_abcdef123456
Content-Type: multipart/form-data

file: leads_october.csv
email_column: "Email Address" // optional, auto-detected if empty
remove_duplicates: true
callback_url: "https://api.client.com/webhooks/verify-complete"
```

#### Get List Processing Status & Report
```http
GET /v1/validate/bulk/job_892348a0f9b1
Authorization: Bearer sec_live_abcdef123456
```

**Response (200 OK):**
```json
{
  "job_id": "job_892348a0f9b1",
  "status": "completed",
  "progress_percent": 100,
  "total_records": 10000,
  "processed_records": 10000,
  "results_summary": {
    "mailable": 8450,
    "non_mailable": 1120,
    "risky": 380,
    "unknown": 50
  },
  "risk_breakdown": {
    "spam_traps": 12,
    "disposable": 145,
    "catch_all": 210,
    "role_based": 280,
    "greymail": 195,
    "syntax_errors": 48
  },
  "download_urls": {
    "all_results": "https://cdn.ourdomain.com/reports/job_892348a0f9b1_all.csv?token=...",
    "only_mailable": "https://cdn.ourdomain.com/reports/job_892348a0f9b1_clean.csv?token=...",
    "suppression_list": "https://cdn.ourdomain.com/reports/job_892348a0f9b1_suppression.csv?token=..."
  }
}
```

---

## 8. User Experience & Dashboard Workflow

```
1. Dashboard Home
   ├── Credit balance card + Quick single-email test widget
   ├── Recent list uploads table with progress bars
   └── Monthly usage gauge and quota warning
2. List Verifier (Bulk)
   ├── Step 1: Drag-and-drop CSV / XLSX / TXT
   ├── Step 2: Auto-column detector & mapping preview (first 5 rows)
   ├── Step 3: Deduction quote ("This file contains 12,450 rows. 12,450 credits required.")
   └── Step 4: Live progress bar with real-time counters
3. Report & Deliverability Analytics View
   ├── Interactive Donut Chart (Mailable, Non-Mailable, Risky, Unknown)
   ├── Deep breakdown cards (Spam Traps, Greymail, Catch-All, Disposable)
   ├── Deliverability Index Gauge (Score: 88/100)
   ├── Filterable Search Table (search any email in the uploaded file)
   └── Customized Export Modal (Download Clean, Download All, or Custom Filters)
4. Developer Hub
   ├── API Keys management (Generate, Revoke, Permission scopes)
   ├── Real-time API logs with payload inspector
   └── Webhook setup with test ping triggers
5. Billing & Subscriptions
   ├── Plan upgrade / downgrade switch (Starter, Growth, Pro)
   ├── Pay-As-You-Go credit pack purchase buttons
   ├── Auto-recharge threshold configuration
   └── Stripe invoice history & tax receipts
```

---

## 9. Security, Privacy & Compliance

- **Zero-Data Retention (GDPR Mode):** Users can toggle "Scrub and Forget". After list processing and customer download (or after 24 hours), individual email addresses and PII are permanently purged from server disks and databases, leaving only aggregate count metrics.
- **Data Encryption:** TLS 1.3 in-transit; AES-256 for all stored CSVs in S3/R2 object storage with 7-day auto-expiry lifecycle rules.
- **SOC2 Type II & HIPAA Readiness:** Immutable audit logs, strict RBAC, and anonymized tokenized logs.
- **Anti-Abuse Engine:** Protection against malicious actors using our API to enumerate or brute-force user mailboxes on third-party domains.

---

## 10. Phased Implementation Roadmap

```mermaid
flowchart TD
    P1[Phase 1: MVP Core Engine & CLI] --> P2[Phase 2: SaaS Platform & Dashboard]
    P2 --> P3[Phase 3: High Scale & Enterprise Features]
    P3 --> P4[Phase 4: Integrations & Market Expansion]

    subgraph "Phase 1: Core Engine (Weeks 1-3)"
        P1_1[Syntax, Typo, Disposable, MX resolution]
        P1_2[SMTP Handshake Probe Engine with Greylist buffer]
        P1_3[Spam trap & Catch-all heuristics]
        P1_4[Local Single & CSV CLI validator]
    end

    subgraph "Phase 2: SaaS Platform (Weeks 4-7)"
        P2_1[Next.js Dashboard & Authentication]
        P2_2[Bulk File Upload & Async Worker Queue]
        P2_3[Analytics Dashboard & Segmented CSV Exporter]
        P2_4[Stripe Subscriptions & Credit System]
    end

    subgraph "Phase 3: Scale & Reliability (Weeks 8-10)"
        P3_1[Distributed Egress IP rotation & PTR warmup]
        P3_2[Public Developer REST API & Webhooks]
        P3_3[Zero-Data Retention GDPR auto-scrub]
        P3_4[Greymail & Domain Activity scoring]
    end

    subgraph "Phase 4: Integrations (Weeks 11-13)"
        P4_1[1-Click ESP Integrations HubSpot, Mailchimp, Klaviyo]
        P4_2[Chrome Extension for LinkedIn / Gmail validation]
        P4_3[Zapier & Make.com apps]
    end
```

---

## 11. Next Action Items

1. **Repository Setup:** Initialize the monorepo or project structure in `/Users/saswatpatro/Desktop/Saswat/AI Projects/email-validator-saas`.
2. **Core Engine Prototype:** Implement the verification pipeline module (DNS, SMTP socket handshake, Disposable list, Typo dictionary).
3. **Queue & Background Worker:** Setup Redis BullMQ worker pipeline for processing batches of 10,000+ emails reliably.
4. **Interactive UI Mockup / Dashboard:** Create the Next.js frontend with drag-and-drop file upload, real-time verification stats, and interactive visual reports.
