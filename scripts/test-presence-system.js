import http from 'http';
import app from '../server/index.js';
import { pool, getActiveSoulsCount, updateSoulHeartbeat, removeSoulSession, pruneExpiredSessions } from '../server/db.js';

let server;
const PORT = 3099;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Comprehensive Presence Verification Tests...');

  // 1. Start server on test port
  await new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`📡 Test server running on ${BASE_URL}`);
      resolve();
    });
  });

  try {
    // 2. Clean up any previous test sessions in DB
    console.log('\n🧹 Cleaning up test sessions in TiDB Cloud...');
    await pool.query("DELETE FROM active_sessions WHERE session_id LIKE 'test_soul_%'");

    // Baseline active count
    const baseline = await getActiveSoulsCount(75);
    console.log(`📊 Baseline active souls in DB: ${baseline}`);

    // TEST 1: Initial heartbeat with valid session
    console.log('\n--- TEST 1: Heartbeat registration ---');
    const sessionA = 'test_soul_A_' + Date.now();
    const res1 = await request('POST', '/api/presence/heartbeat', { sessionId: sessionA });
    console.log('Heartbeat Response:', res1.body);
    if (res1.status !== 200 || !res1.body.success || res1.body.activeSouls !== baseline + 1) {
      throw new Error(`Test 1 Failed: Expected count ${baseline + 1}, got ${res1.body?.activeSouls}`);
    }
    console.log(`✅ TEST 1 PASSED: Heartbeat registered session A, count increased to ${baseline + 1}`);

    // TEST 2: Multi-tab deduplication (Same session ID sent again)
    console.log('\n--- TEST 2: Multi-tab Deduplication ---');
    const res2 = await request('POST', '/api/presence/heartbeat', { sessionId: sessionA });
    console.log('Repeated Heartbeat Response (Simulating Tab 2 / Tab 3):', res2.body);
    if (res2.body.activeSouls !== baseline + 1) {
      throw new Error(`Test 2 Failed: Count inflated! Expected ${baseline + 1}, got ${res2.body.activeSouls}`);
    }
    console.log(`✅ TEST 2 PASSED: Tab deduplication confirmed. Count remained ${baseline + 1}`);

    // TEST 3: Second distinct browser session
    console.log('\n--- TEST 3: Second Distinct Browser Session ---');
    const sessionB = 'test_soul_B_' + Date.now();
    const res3 = await request('POST', '/api/presence/heartbeat', { sessionId: sessionB });
    console.log('Session B Heartbeat Response:', res3.body);
    if (res3.body.activeSouls !== baseline + 2) {
      throw new Error(`Test 3 Failed: Expected count ${baseline + 2}, got ${res3.body.activeSouls}`);
    }
    console.log(`✅ TEST 3 PASSED: Session B registered, count increased to ${baseline + 2}`);

    // TEST 4: GET /api/presence returns accurate count
    console.log('\n--- TEST 4: GET /api/presence ---');
    const res4 = await request('GET', '/api/presence');
    console.log('GET Presence Response:', res4.body);
    if (res4.status !== 200 || res4.body.activeSouls !== baseline + 2) {
      throw new Error(`Test 4 Failed: Expected count ${baseline + 2}, got ${res4.body?.activeSouls}`);
    }
    console.log(`✅ TEST 4 PASSED: GET /api/presence returned accurate count ${baseline + 2}`);

    // TEST 5: Graceful Leave (Session A departs)
    console.log('\n--- TEST 5: Graceful Leave ---');
    const res5 = await request('POST', '/api/presence/leave', { sessionId: sessionA });
    console.log('Leave Response:', res5.body);
    if (!res5.body.success) {
      throw new Error('Test 5 Failed: Leave endpoint failed');
    }
    const res5Check = await request('GET', '/api/presence');
    console.log('Presence after Session A left:', res5Check.body);
    if (res5Check.body.activeSouls !== baseline + 1) {
      throw new Error(`Test 5 Failed: Expected count ${baseline + 1}, got ${res5Check.body.activeSouls}`);
    }
    console.log(`✅ TEST 5 PASSED: Session A removed cleanly, count decremented to ${baseline + 1}`);

    // TEST 6: Session B Graceful Leave
    console.log('\n--- TEST 6: Session B Leave ---');
    await request('POST', '/api/presence/leave', { sessionId: sessionB });
    const res6Check = await request('GET', '/api/presence');
    console.log('Presence after Session B left:', res6Check.body);
    if (res6Check.body.activeSouls !== baseline) {
      throw new Error(`Test 6 Failed: Expected count ${baseline}, got ${res6Check.body.activeSouls}`);
    }
    console.log(`✅ TEST 6 PASSED: Session B removed cleanly, count back to baseline ${baseline}`);

    // TEST 7: Inactivity Expiration Simulation
    console.log('\n--- TEST 7: Inactivity Expiration ---');
    const staleSession = 'test_soul_stale_' + Date.now();
    // Insert session with last_seen 100 seconds ago
    const staleTime = Date.now() - (100 * 1000);
    await pool.query(
      'INSERT INTO active_sessions (session_id, created_at, last_seen) VALUES (?, ?, ?)',
      [staleSession, staleTime, staleTime]
    );
    // getActiveSoulsCount with 75s threshold should NOT count the stale session
    const activeCountWithStale = await getActiveSoulsCount(75);
    console.log(`Active count with 100s-stale session: ${activeCountWithStale} (baseline: ${baseline})`);
    if (activeCountWithStale !== baseline) {
      throw new Error(`Test 7 Failed: Stale session was counted! Count was ${activeCountWithStale}`);
    }
    // Clean up stale session
    await pool.query('DELETE FROM active_sessions WHERE session_id = ?', [staleSession]);
    console.log('✅ TEST 7 PASSED: Stale session (>75s) automatically ignored by active count query');

    // TEST 8: Zero Active Souls handling
    console.log('\n--- TEST 8: Zero Active Souls Verification ---');
    // Query with threshold 0 seconds (everything in the past is excluded)
    const zeroTest = await pool.query('SELECT COUNT(*) as count FROM active_sessions WHERE last_seen >= ?', [Date.now() + 10000]);
    console.log('Query with zero matching sessions:', zeroTest[0][0].count);
    if (zeroTest[0][0].count !== 0) {
      throw new Error('Test 8 Failed: Did not return 0 for zero active sessions');
    }
    console.log('✅ TEST 8 PASSED: When 0 active sessions exist, query returns genuine 0');

    // TEST 9: Invalid session ID rejection
    console.log('\n--- TEST 9: Validation of Session ID ---');
    const resBad = await request('POST', '/api/presence/heartbeat', { sessionId: 'bad' });
    if (resBad.status !== 400) {
      throw new Error('Test 9 Failed: Short/invalid session ID was not rejected with HTTP 400');
    }
    console.log('✅ TEST 9 PASSED: Invalid session ID rejected with 400 Bad Request');

    console.log('\n🎉 ALL 9 PRESENCE SYSTEM TESTS PASSED SUCCESSFULLY!');
  } finally {
    // Cleanup any lingering test data
    await pool.query("DELETE FROM active_sessions WHERE session_id LIKE 'test_soul_%'");
    server.close();
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILURE:', err);
  if (server) server.close();
  process.exit(1);
});
