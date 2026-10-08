# TruthMail — Enterprise Email Validation & Deliverability SaaS

An enterprise-grade, high-throughput email validation and deliverability intelligence SaaS platform modeled after industry leaders like **ZeroBounce**, **NeverBounce**, and **Debounce**.

---

## 📁 Repository Overview

- **[`PROJECT_DOCUMENT.md`](./PROJECT_DOCUMENT.md)**: Full Product Requirements Document (PRD), 12-Step Detection Engine Architecture, Subscription Pricing Models, Database Schemas, API Specifications, Risk Scoring, and Execution Roadmap.

---

## 🚀 Key Platform Capabilities

1. **12-Step Deep Validation Pipeline:**
   - Syntax & RFC 5322 compliance
   - Smart Typo & Domain Suggester (`gamil.com` → `gmail.com`)
   - 30,000+ Disposable & Burner domain blocklist
   - DNS MX & A Record authoritative lookups
   - Deep SMTP Socket Handshake simulation (`RCPT TO` check without sending)
   - Greylisting detection & automated retry queue
   - Spam trap, honeypot & toxic domain detection
   - Catch-all / Accept-all mailbox detection
   - Role-based accounts (`support@`, `sales@`, `admin@`)
   - Greymail & low engagement risk scoring
   - Overall Deliverability Quality Score (0 - 100)

2. **Categorization & Reporting Engine:**
   - **Mailable (Valid):** 100% safe to send, zero bounce risk.
   - **Non-Mailable (Invalid):** Hard bounce, mailbox does not exist, bad syntax, dead MX.
   - **Risky:** Catch-all, disposable, spam trap hazard, role-based, greymail.
   - **Unknown:** Server timeout or greylisted (credits automatically refunded).

3. **List Processing & Deliverability Analytics:**
   - Bulk upload support: **CSV**, **XLSX**, **TXT**, **TSV** with auto-column mapping.
   - Real-time progress tracker with interactive status donut charts.
   - Granular risk metrics breakdown (Spam Traps, Burner Emails, Greymail, Catch-All).
   - One-click segmented export (e.g. "Clean Only", "Include Catch-All", "Suppression List").

4. **SaaS Monetization & Credit Engine:**
   - **Tiered Subscriptions:** Starter (\$29/mo), Growth (\$79/mo), Pro (\$199/mo), Enterprise.
   - **Pay-As-You-Go:** Non-expiring rollover credit packages.
   - Team seat management, API keys with granular scopes, and webhook alerts.

---

## 🛠️ Recommended Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Backend API & Orchestration:** Node.js / Go microservices, Redis BullMQ for distributed queueing.
- **Database & Storage:** PostgreSQL (Accounts, billing, jobs), ClickHouse (Scan logs), Cloudflare R2 / S3 (Secure file storage).
- **Payment Processing:** Stripe Subscriptions & Billing Customer Portal.
