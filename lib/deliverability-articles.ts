export interface DeliverabilityArticle {
  id: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  author: {
    name: string;
    role: string;
  };
  summary: string;
  tags: string[];
  content: {
    introduction: string;
    sections: {
      heading: string;
      body: string;
      tip?: string;
    }[];
    conclusion: string;
    checklist: string[];
  };
}

export const DELIVERABILITY_ARTICLES: DeliverabilityArticle[] = [
  {
    id: 'google-yahoo-2024-sender-requirements',
    title: 'The 2024 Google & Yahoo Bulk Sender Guidelines: Surviving the 0.3% Spam Threshold',
    category: 'Compliance & Rules',
    readTime: '6 min read',
    date: 'Updated Oct 2026',
    author: {
      name: 'Elena Rostova',
      role: 'Principal Deliverability Architect',
    },
    summary: 'Google and Yahoo now strictly enforce mandatory SPF, DKIM, DMARC, 1-click list-unsubscribe headers, and an unprecedented 0.3% spam complaint ceiling.',
    tags: ['Google Guidelines', 'Yahoo Mail', 'DMARC', 'Spam Rate'],
    content: {
      introduction: 'In early 2024, Google and Yahoo enacted the strictest sender enforcement update in internet history. For any organization dispatching over 5,000 messages daily to @gmail.com or @yahoo.com addresses, deliverability is no longer about sender volume—it is about cryptographically proven authentication and surgical complaint suppression.',
      sections: [
        {
          heading: '1. The Rigid 0.3% Spam Complaint Threshold',
          body: 'Google now requires bulk senders to keep spam complaint rates reported in Google Postmaster Tools strictly below 0.10%, with a hard enforcement threshold at 0.30%. If your complaints reach 3 out of every 1,000 recipients, Google throttles incoming SMTP connections or redirects all traffic directly to spam folders.',
          tip: 'Always scrub dead accounts and unengaged recipients before launching campaigns. Sending to inactive addresses increases complaints by 400% because users report spam instead of seeking an unsubscribe link.'
        },
        {
          heading: '2. Cryptographic Triad: SPF, DKIM, and DMARC',
          body: 'Every domain must have valid SPF (Sender Policy Framework) and DKIM (DomainKeys Identified Mail) records that align with the RFC 5322 From address header. Crucially, a DMARC policy (at minimum p=none with rua reporting) is now mandatory.',
          tip: 'Ensure your DMARC alignment uses strict or relaxed alignment that matches the root domain of your sending server.'
        },
        {
          heading: '3. Mandatory RFC 8058 One-Click Unsubscribe',
          body: 'Marketing and promotional messages must incorporate RFC 8058 headers (List-Unsubscribe and List-Unsubscribe-Post). When a recipient clicks "Unsubscribe" in the Gmail web UI, your server must process the request within 48 hours without requiring login or survey forms.',
        }
      ],
      conclusion: 'The Google & Yahoo policies represent the permanent maturation of email ecosystems. By combining TruthMail pre-send validation with strict DNS hygiene, high-volume senders maintain 99%+ primary inbox placement.',
      checklist: [
        'Validate SPF record syntax and keep DNS lookups under 10',
        'Deploy 2048-bit DKIM keys on all outbound mail servers',
        'Publish DMARC TXT record with active rua reporting mailbox',
        'Add List-Unsubscribe and List-Unsubscribe-Post headers to marketing templates',
        'Scrub mailing lists through TruthMail before every blast to eliminate dead MX and traps'
      ]
    }
  },
  {
    id: 'understanding-greymail-engagement-risks',
    title: 'What is Greymail? The Hidden Reason Your Open Rates Are Plunging',
    category: 'Sender Reputation',
    readTime: '5 min read',
    date: 'Updated Oct 2026',
    author: {
      name: 'Marcus Vance',
      role: 'Head of Email Intelligence',
    },
    summary: 'Unlike hard bounces that fail instantly, greymail represents technically valid addresses that recipients never open, triggering algorithmic ISP penalties.',
    tags: ['Greymail', 'Open Rates', 'Spam Filters', 'Mailbox Quality'],
    content: {
      introduction: 'Most email marketers celebrate a 0% bounce rate, assuming their list is pristine. Yet over time, their open rates slide from 38% down to 11%. The culprit is almost always Greymail—solicited or opted-in emails that recipients gradually ignore over months or route to automated secondary filters.',
      sections: [
        {
          heading: '1. How Modern ISP Algorithms Evaluate Engagement',
          body: 'Gmail, Microsoft Outlook, and Apple Mail do not just look at your server IP. They monitor user interaction metrics in real time: open frequency, read time, scroll depth, replies, and whether messages are moved to trash unread. When an ISP sees hundreds of recipients deleting your emails without opening them, your domain reputation drops.',
          tip: 'TruthMail analyzes mailbox behavioral patterns and broadcast alias signatures (e.g. deals@, newsletter@, digests@) to highlight greymail before you send.'
        },
        {
          heading: '2. The Danger of "Secondary Junk" Mailboxes',
          body: 'Consumers frequently maintain secondary throwaway mailboxes specifically to sign up for whitepapers, webinars, and discounts. While these addresses pass basic SMTP checks, they are checked once a month or never at all, creating a massive engagement drag.',
        },
        {
          heading: '3. Sunset Policies: The Cure for Greymail',
          body: 'Implement a strict 60-day or 90-day sunset policy. If a contact has not opened or clicked any email within 60 days, move them to a re-engagement flow or scrub them permanently from your primary cold outreach sequences.',
        }
      ],
      conclusion: 'A smaller, highly engaged list of 15,000 active subscribers will generate 3x more conversions and zero deliverability penalties compared to a stale list of 100,000 unscrubbed contacts filled with greymail.',
      checklist: [
        'Isolate contacts with 0 opens over the past 90 days',
        'Use TruthMail greymail heuristic detection to flag broadcast aliases',
        'Set up automatic sunset suppression rules in your ESP / CRM',
        'Test engaging plain-text re-activation emails before deleting inactive contacts'
      ]
    }
  },
  {
    id: 'spam-traps-honeypots-guide',
    title: 'Pristine vs. Recycled Spam Traps: How Blocklists (Spamhaus, Barracuda) Catch Scrapers',
    category: 'Spam Protection',
    readTime: '7 min read',
    date: 'Updated Oct 2026',
    author: {
      name: 'Dr. Aris Thorne',
      role: 'Cybersecurity & Anti-Abuse Lead',
    },
    summary: 'Spam traps are designed specifically to catch senders who scrape websites or buy stale third-party databases. Hitting a single pristine trap can blacklist your domain overnight.',
    tags: ['Spamhaus', 'Honeypots', 'Blacklists', 'Domain Reputation'],
    content: {
      introduction: 'Spam traps look like ordinary email addresses. They have standard formats like info@, john.smith@, or sales@. However, they are secretly operated by anti-spam organizations like Spamhaus, Barracuda, and Invaluement to catch unauthorized senders in the act.',
      sections: [
        {
          heading: '1. Pristine Spam Traps (The Most Dangerous Threat)',
          body: 'Pristine traps are email addresses created by blocklist operators that have NEVER signed up for any service, opted into any newsletter, or submitted a form. They are embedded as hidden seeds in public web pages to catch scrapers. Hitting even one pristine trap often results in instant SBL (Spamhaus Block List) listing.',
          tip: 'Never use web scrapers that harvest raw mailto: links from public HTML pages without real-time verification.'
        },
        {
          heading: '2. Recycled Spam Traps (The Zombie Mailboxes)',
          body: 'Recycled traps are genuine user mailboxes that were abandoned years ago. After a dormancy period (typically 6 to 12 months) of returning 550 User Not Found bounces, the ISP silently re-activates the address as a trap. If you continue sending to it, the ISP knows you do not clean your database.',
        },
        {
          heading: '3. Typo Spam Traps',
          body: 'Security firms register common misspelled domains of popular providers (e.g., hotmial.com, gmai.com). Any email landing on these domains without explicit double-opt-in confirmation is flagged as negligent list hygiene.',
        }
      ],
      conclusion: 'Spam traps do not announce themselves with hard bounces. They silently accept the message, log the sending IP, and notify blacklist networks. TruthMail cross-references known honeypot seed clusters to protect your sending infrastructure.',
      checklist: [
        'Never purchase third-party email lists or scrape unverified directories',
        'Run TruthMail spam trap & honeypot scrubber before cold outreach campaigns',
        'Enforce double opt-in on all inbound website signup forms',
        'Monitor IP and domain listings weekly on Spamhaus ZEN and Barracuda Central'
      ]
    }
  },
  {
    id: 'catch-all-accept-all-servers-explained',
    title: 'Catch-All (Accept-All) Mail Servers: How to Protect Your Domain Without Losing Good Leads',
    category: 'Deliverability Intelligence',
    readTime: '5 min read',
    date: 'Updated Oct 2026',
    author: {
      name: 'Elena Rostova',
      role: 'Principal Deliverability Architect',
    },
    summary: 'Over 30% of Fortune 500 corporate domains configure their mail servers as catch-all. Learn how to verify and send to accept-all domains safely.',
    tags: ['Catch-All', 'SMTP Simulation', 'B2B Sales', 'Risk Scoring'],
    content: {
      introduction: 'A catch-all (accept-all) mail server is configured to accept incoming emails sent to ANY address on the domain, even if the mailbox does not exist (e.g. randomxyz99@apple.com will return 250 OK). This creates a dilemma for sales teams: discard potential executive leads, or risk high bounce rates?',
      sections: [
        {
          heading: '1. Why Companies Use Catch-All Configurations',
          body: 'Enterprises configure catch-all servers to prevent missed business opportunities from customer typos, protect employee email structures from discovery by scrapers, and route misspelled customer inquiries to internal triage teams.',
        },
        {
          heading: '2. The Danger of Sending Blindly to Catch-Alls',
          body: 'While the server returns 250 OK during the initial SMTP handshake, the internal mail filter evaluates the address seconds later. If the person does not work there, the server sends a delayed hard bounce or silently discards the email.',
          tip: 'TruthMail applies deep heuristic scoring to catch-all domains, verifying domain MX depth, server software (Microsoft Exchange, Google Workspace, Proofpoint), and historical deliverability.'
        },
        {
          heading: '3. Safe Segmentation Strategy for Catch-Alls',
          body: 'Do not send high-volume cold blast campaigns to catch-all addresses. Instead, isolate catch-all leads into a separate nurturing queue with lower sending cadence (e.g. 10-20 emails/day) to preserve your primary domain reputation.',
        }
      ],
      conclusion: 'With proper risk intelligence and isolated sending cadences, catch-all domains can be safely mined for high-value B2B enterprise sales without jeopardizing overall sender score.',
      checklist: [
        'Filter catch-all emails into a distinct segment in your CRM or outreach tool',
        'Verify employee tenure on LinkedIn before dispatching cold sequences',
        'Send catch-all emails from secondary subdomains rather than your primary corporate domain',
        'Maintain a strict limit of no more than 15% catch-all leads per outbound batch'
      ]
    }
  },
  {
    id: 'spf-dkim-dmarc-setup-checklist',
    title: 'SPF, DKIM, and DMARC: The Three Pillars of Modern Email Authentication',
    category: 'Authentication',
    readTime: '8 min read',
    date: 'Updated Oct 2026',
    author: {
      name: 'Marcus Vance',
      role: 'Head of Email Intelligence',
    },
    summary: 'A step-by-step technical breakdown of DNS records required to authenticate outbound emails and guarantee delivery to Google, Microsoft, and Yahoo inboxes.',
    tags: ['SPF', 'DKIM', 'DMARC', 'DNS Records'],
    content: {
      introduction: 'Email was originally designed in the 1980s without any built-in identity verification. Anyone could forge the "From" header to impersonate any domain. Today, SPF, DKIM, and DMARC form the cryptographic security chain that verifies your emails are genuinely authorized.',
      sections: [
        {
          heading: '1. SPF (Sender Policy Framework)',
          body: 'SPF is a DNS TXT record listing all IP addresses and third-party services (Google Workspace, SendGrid, Mailgun) authorized to send mail on behalf of your domain. Remember the 10-lookup DNS limit: exceeding 10 lookups causes an SPF PermError and instant delivery failure.',
          tip: 'Use TruthMail DNS lookup to ensure your SPF record resolves cleanly without circular includes.'
        },
        {
          heading: '2. DKIM (DomainKeys Identified Mail)',
          body: 'DKIM attaches a digital cryptographic signature to the header of every outbound message. The receiving mail server uses the public key in your DNS to verify that the message has not been altered or tampered with in transit.',
        },
        {
          heading: '3. DMARC (Domain-based Message Authentication, Reporting & Conformance)',
          body: 'DMARC ties SPF and DKIM together and instructs receiving mail servers what to do if validation fails: do nothing (p=none), quarantine to spam (p=quarantine), or reject outright (p=reject).',
        }
      ],
      conclusion: 'Proper DNS authentication is the bedrock of modern deliverability. Without full alignment, even the cleanest email content will be routed to spam folders.',
      checklist: [
        'Audit all outbound sending services and consolidate them into your SPF record',
        'Deploy 2048-bit DKIM selector keys across all email platforms',
        'Ensure the "From" domain header strictly aligns with SPF/DKIM domains',
        'Start DMARC with p=none and monitor XML aggregate reports before upgrading to p=quarantine'
      ]
    }
  },
  {
    id: 'domain-warmup-guide-14-days',
    title: '14-Day Cold Outreach Domain Warm-Up Strategy for High-Growth Sales Teams',
    category: 'Cold Outreach',
    readTime: '6 min read',
    date: 'Updated Oct 2026',
    author: {
      name: 'Dr. Aris Thorne',
      role: 'Cybersecurity & Anti-Abuse Lead',
    },
    summary: 'A structured day-by-day roadmap for warming up new sending domains and dedicated IPs to avoid spam filters and establish high sender trust.',
    tags: ['Domain Warmup', 'Cold Email', 'Sender Score', 'Outreach'],
    content: {
      introduction: 'Buying a fresh domain and immediately sending 500 cold emails is the fastest way to get your domain permanently blacklisted. Inbox providers monitor domain age and sender acceleration curves. Here is our battle-tested 14-day warm-up roadmap.',
      sections: [
        {
          heading: 'Days 1–3: DNS Configuration & Baseline Activity',
          body: 'Set up SPF, DKIM, DMARC, custom tracking domains, and MX records. Send 5–10 manual emails to friends or colleagues and have them reply, star, and mark as important to trigger positive engagement signals.',
        },
        {
          heading: 'Days 4–7: Controlled Peer-to-Peer Warmup',
          body: 'Connect the inbox to an automated peer warm-up network with human-like conversation threads. Send 15–25 warm-up emails daily with randomized send times and 100% reply rates.',
          tip: 'Never start cold prospecting before day 10. Initial sender reputation requires at least two weeks of zero-complaint activity.'
        },
        {
          heading: 'Days 8–14: Gradual Cold Volume Introduction',
          body: 'On Day 8, begin introducing 10 real, validated prospect emails per day. Clean every single address with TruthMail first. Ramp up volume by no more than 20% every two days until reaching your target volume of 50 emails/day per inbox.',
        }
      ],
      conclusion: 'Patient warmup combined with TruthMail 12-step list scrubbing guarantees healthy sender scores and keeps your outreach landing directly in prospective buyers\' inboxes.',
      checklist: [
        'Wait at least 14 days after domain registration before launching cold outreach',
        'Keep daily volume strictly under 50 outbound cold emails per individual inbox',
        'Use secondary lookalike domains (e.g. getcompany.com) to protect your main corporate domain',
        'Validate every single lead through TruthMail before it enters any sales cadence'
      ]
    }
  }
];
