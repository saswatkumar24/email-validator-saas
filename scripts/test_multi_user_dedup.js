const { initDb, query, canonicalizeEmail, upsertVerifiedLead } = require('../lib/db.ts');

async function runTest() {
  console.log('=====================================================');
  console.log('🧪 TRUTHMAIL MULTI-USER DEDUPLICATION & DB TEST');
  console.log('=====================================================\n');

  await initDb();

  // 1. Create User 1 and User 2
  const user1Email = 'alice.tester@truthmail.com';
  const user2Email = 'bob.tester@truthmail.com';

  await query('DELETE FROM users WHERE email IN (?, ?)', [user1Email, user2Email]);
  await query('DELETE FROM verified_leads WHERE canonical_email LIKE ?', ['%@tester-domain.com']);

  const u1Id = 'user_test_1';
  const u2Id = 'user_test_2';

  await query(
    "INSERT INTO users (id, name, email, password_hash, email_verified, role, credits_balance) VALUES (?, ?, ?, ?, 1, 'user', 500)",
    [u1Id, 'Alice Tester', user1Email, 'hash_test']
  );
  await query(
    "INSERT INTO users (id, name, email, password_hash, email_verified, role, credits_balance) VALUES (?, ?, ?, ?, 1, 'user', 500)",
    [u2Id, 'Bob Tester', user2Email, 'hash_test']
  );

  console.log('✅ Created User 1: Alice (Credits: 500)');
  console.log('✅ Created User 2: Bob (Credits: 500)\n');

  // Sample email batch with internal duplicates and case variances:
  // e.g. "Lead.One@tester-domain.com" vs "lead.one@tester-domain.com"
  const rawBatch = [
    'lead1@tester-domain.com',
    'lead2@tester-domain.com',
    'lead3@tester-domain.com',
    'lead4@tester-domain.com',
    'lead5@tester-domain.com',
    'Lead1@tester-domain.com', // Duplicate with different casing
    'lead6@tester-domain.com',
    'lead7@tester-domain.com',
    'lead8@tester-domain.com',
    'lead2@tester-domain.com', // Exact duplicate
  ];

  console.log(`📋 Total emails in raw upload list: ${rawBatch.length}`);

  // Test File-Level Deduplication
  const uniqueEmails = Array.from(new Set(rawBatch.map(e => canonicalizeEmail(e).canonical)));
  console.log(`🧹 In-memory normalized unique count: ${uniqueEmails.length} (2 duplicates filtered)\n`);

  // --- RUN 1: USER 1 (ALICE) ---
  console.log('▶️ Simulating Run 1 for User 1 (Alice)...');
  for (const email of uniqueEmails) {
    await upsertVerifiedLead({
      rawEmail: email,
      domain: 'tester-domain.com',
      localPart: email.split('@')[0],
      providerType: 'corporate_b2b',
      qualityScore: 98,
      hasSpf: true,
      hasDmarc: true,
    });
  }
  await query('UPDATE users SET credits_balance = credits_balance - ? WHERE id = ?', [uniqueEmails.length, u1Id]);

  const u1Row = (await query('SELECT credits_balance FROM users WHERE id = ?', [u1Id])).rows[0];
  const leadsAfterRun1 = (await query('SELECT canonical_email, times_seen FROM verified_leads WHERE domain = ?', ['tester-domain.com'])).rows;

  console.log(`  - Alice remaining credits: ${u1Row.credits_balance} (Deducted: ${uniqueEmails.length})`);
  console.log(`  - Verified leads in DB: ${leadsAfterRun1.length} rows`);
  console.log(`  - Sample times_seen for lead1: ${leadsAfterRun1[0]?.times_seen}`);

  // --- RUN 2: USER 2 (BOB) UPLOADING THE SAME EMAILS ---
  console.log('\n▶️ Simulating Run 2 for User 2 (Bob) with the EXACT SAME list...');
  for (const email of uniqueEmails) {
    await upsertVerifiedLead({
      rawEmail: email,
      domain: 'tester-domain.com',
      localPart: email.split('@')[0],
      providerType: 'corporate_b2b',
      qualityScore: 98,
      hasSpf: true,
      hasDmarc: true,
    });
  }
  await query('UPDATE users SET credits_balance = credits_balance - ? WHERE id = ?', [uniqueEmails.length, u2Id]);

  const u2Row = (await query('SELECT credits_balance FROM users WHERE id = ?', [u2Id])).rows[0];
  const leadsAfterRun2 = (await query('SELECT canonical_email, times_seen, last_verified_at FROM verified_leads WHERE domain = ?', ['tester-domain.com'])).rows;

  console.log(`  - Bob remaining credits: ${u2Row.credits_balance} (Deducted: ${uniqueEmails.length})`);
  console.log(`  - Total rows in verified_leads after Run 2: ${leadsAfterRun2.length} (MUST be 8, ZERO duplicates!)`);
  console.log(`  - Times seen counter for lead1: ${leadsAfterRun2[0]?.times_seen} (MUST be 2!)`);

  // --- ADMIN OPERATION: MODIFY CREDITS ---
  console.log('\n▶️ Simulating Admin credit modification for Alice...');
  await query('UPDATE users SET credits_balance = 50000 WHERE id = ?', [u1Id]);
  const u1Updated = (await query('SELECT credits_balance FROM users WHERE id = ?', [u1Id])).rows[0];
  console.log(`  - Alice new credit balance: ${u1Updated.credits_balance}`);

  // --- ASSERTIONS ---
  console.log('\n-----------------------------------------------------');
  const duplicateCheckPass = leadsAfterRun2.length === 8;
  const timesSeenCheckPass = leadsAfterRun2.every(r => r.times_seen === 2);
  const creditsCheckPass = u1Row.credits_balance === 492 && u2Row.credits_balance === 492;

  if (duplicateCheckPass && timesSeenCheckPass && creditsCheckPass) {
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 100% DEDUPLICATION VERIFIED.');
  } else {
    console.error('❌ TEST FAILED: Verification criteria not met.');
    process.exit(1);
  }
  console.log('=====================================================\n');
}

runTest().catch(console.error);
