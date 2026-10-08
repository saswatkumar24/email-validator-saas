export const SAMPLE_BENCHMARK_EMAILS = [
  // 1. Pristine Mailable (Valid Business & Personal)
  "elon.musk@x.com",
  "satya.nadella@microsoft.com",
  "tim.cook@apple.com",
  "jensen.huang@nvidia.com",
  "alex.developer@gmail.com",
  "maria.garcia@outlook.com",
  "david.miller@yahoo.com",

  // 2. Typos & Misspellings (Auto-Suggestion)
  "john.doe@gamil.com",
  "rachel.green@hotmial.com",
  "peter.parker@outlok.com",

  // 3. Disposable & Temporary Burner Emails
  "quicktest99@mailinator.com",
  "burner_account@guerrillamail.com",
  "throwaway77@10minutemail.com",
  "temp_agent@yopmail.com",

  // 4. Role-Based Accounts
  "admin@stripe.com",
  "support@shopify.com",
  "billing@zoom.us",
  "jobs@netflix.com",

  // 5. Spam Traps & Honeypots
  "spamtrap-network-probe@spamhaus-seed.org",
  "honeypot_trap_99@security-bait.com",

  // 6. Greymail (Low engagement / newsletters / promotional)
  "newsletter-daily@techdigest.com",
  "promotions-weekly@retailbrands.com",
  "updates-blast@medianews.org",

  // 7. Non-Mailable (Dead MX / Bogus Domain)
  "fakeuser@deadnonexistentdomain99881122.xyz",
  "ghost@nowhere-fake-zone-12345.org",

  // 8. Syntax Violation
  "user..double_dot@bad..syntax.com",
  "missing_at_symbol_domain.com",
];

export const SAMPLE_CSV_CONTENT = `Email Address,First Name,Company,Status
elon.musk@x.com,Elon,X,Active
satya.nadella@microsoft.com,Satya,Microsoft,Active
john.doe@gamil.com,John,Doe Corp,Prospect
quicktest99@mailinator.com,Tester,Burner Inc,Lead
admin@stripe.com,Admin,Stripe,Role
spamtrap-network-probe@spamhaus-seed.org,Trap,Unknown,Cold
newsletter-daily@techdigest.com,Digest,MediaHub,Subscriber
fakeuser@deadnonexistentdomain99881122.xyz,Ghost,Null LLC,Lead
alex.developer@gmail.com,Alex,DevCo,Customer
`;
