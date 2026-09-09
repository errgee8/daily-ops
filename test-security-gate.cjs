// Security Gate Verification Test Script for HNDVR 1.1
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body, json });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runSecurityAudit() {
  console.log('==================================================');
  console.log('HNDVR 1.1 FINAL SECURITY GATE AUDIT RUNNER');
  console.log('==================================================\n');

  const results = [];
  function assert(testName, condition, details) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      results.push({ testName, passed: true, details });
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      results.push({ testName, passed: false, details });
    }
  }

  // 1. Authenticate Manager (PIN: 8888)
  const mgrLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { userId: 'user-manager', pin: '8888', venueId: 'venue-default' });

  assert('Manager Login with PIN 8888', mgrLogin.statusCode === 200 && mgrLogin.json?.token, `Status: ${mgrLogin.statusCode}`);
  const mgrToken = mgrLogin.json?.token;

  // 2. Authenticate Staff (PIN: 5555)
  const staffLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { userId: 'user-staff', pin: '5555', venueId: 'venue-default' });

  assert('Staff Login with PIN 5555', staffLogin.statusCode === 200 && staffLogin.json?.token, `Status: ${staffLogin.statusCode}`);
  const staffToken = staffLogin.json?.token;

  // 3. Authenticate Assistant Manager (PIN: 1234)
  const asstLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { userId: 'user-asst-manager', pin: '1234', venueId: 'venue-default' });

  assert('Assistant Manager Login with PIN 1234', asstLogin.statusCode === 200 && asstLogin.json?.token, `Status: ${asstLogin.statusCode}`);
  const asstToken = asstLogin.json?.token;

  // 4. Test 1: Normal Manager request -> Allowed
  const mgrTmpl = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/template?venueId=venue-default',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${mgrToken}` }
  });
  assert('1. Normal Manager request (GET template) -> Allowed (200 OK)', mgrTmpl.statusCode === 200, `Status: ${mgrTmpl.statusCode}`);

  // 5. Test 2: Normal Assistant Manager request -> Allowed for permitted operations, 403 for Manager-only
  const asstTmplMod = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/template',
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${asstToken}`,
      'Content-Type': 'application/json'
    }
  }, { template: { areas: [], version: 1 } });
  assert('2a. Assistant Manager modifying template -> 403 Forbidden', asstTmplMod.statusCode === 403, `Status: ${asstTmplMod.statusCode}`);

  const asstTaskPermitted = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/daily-tasks',
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${asstToken}`,
      'Content-Type': 'application/json'
    }
  }, { id: 'task-asst-test-01', title: 'Assistant Manager Task', priority: 'NORMAL' });
  assert('2b. Assistant Manager creating task -> Allowed (200 OK)', asstTaskPermitted.statusCode === 200, `Status: ${asstTaskPermitted.statusCode}`);

  // 6. Test 3: STAFF attempting Manager-only operation -> HTTP 403
  const staffTmplMod = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/template',
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${staffToken}`,
      'Content-Type': 'application/json'
    }
  }, { template: { areas: [], version: 1 } });
  assert('3a. STAFF attempting template modify -> HTTP 403', staffTmplMod.statusCode === 403, `Status: ${staffTmplMod.statusCode}`);

  const staffDeleteTask = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/daily-tasks/task-asst-test-01',
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${staffToken}` }
  });
  assert('3b. STAFF attempting task delete -> HTTP 403', staffDeleteTask.statusCode === 403, `Status: ${staffDeleteTask.statusCode}`);

  // 7. Test 4: Client manually changing x-user-role to MANAGER -> still HTTP 403
  const spoofRoleReq = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/template',
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${staffToken}`,
      'Content-Type': 'application/json',
      'x-user-role': 'MANAGER'
    }
  }, { template: { areas: [], version: 1 } });
  assert('4. STAFF spoofing x-user-role: MANAGER -> still HTTP 403', spoofRoleReq.statusCode === 403, `Status: ${spoofRoleReq.statusCode}`);

  // 8. Test 5: Client manually changing x-venue-id or venueId -> cannot access another venue
  const spoofVenueReq = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/template?venueId=venue-malicious-target',
    method: 'GET',
    headers: { 
      'Authorization': `Bearer ${mgrToken}`,
      'x-venue-id': 'venue-malicious-target'
    }
  });
  assert('5a. Client attempting access to another venue -> HTTP 403 Forbidden', spoofVenueReq.statusCode === 403, `Status: ${spoofVenueReq.statusCode}`);

  const spoofStorageVenue = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/storage/photo?path=' + encodeURIComponent('venues/venue-unauthorized/defects/photo1.jpg'),
    method: 'GET',
    headers: { 'Authorization': `Bearer ${mgrToken}` }
  });
  assert('5b. Accessing photo belonging to another venue -> HTTP 403 Forbidden', spoofStorageVenue.statusCode === 403, `Status: ${spoofStorageVenue.statusCode}`);

  // 9. Test 6: Client manually changing x-user-id -> cannot impersonate another user
  const spoofUserIdReq = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/daily-tasks',
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${staffToken}`,
      'Content-Type': 'application/json',
      'x-user-id': 'user-manager',
      'x-user-role': 'MANAGER'
    }
  }, { 
    id: 'task-spoof-audit-test', 
    title: 'Spoofed Task Submission',
    createdByUserId: 'user-manager',
    createdByName: 'General Manager'
  });
  assert('6a. Task submission with spoofed x-user-id processed without crashing', spoofUserIdReq.statusCode === 200, `Status: ${spoofUserIdReq.statusCode}`);

  // Verify server attributed creation to staffToken user (user-staff) and NOT user-manager
  const verifyTaskRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/daily-tasks?venueId=venue-default',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${mgrToken}` }
  });
  const foundTask = (verifyTaskRes.json || []).find(t => t.id === 'task-spoof-audit-test');
  const wasProperlyAttributed = foundTask && foundTask.created_by_user_id === 'user-staff';
  assert('6b. Server authoritatively bound created_by_user_id to user-staff (spoof rejected)', wasProperlyAttributed, `Attributed creator: ${foundTask?.created_by_user_id}`);

  // Cleanup test task
  await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/daily-tasks/task-spoof-audit-test',
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${mgrToken}` }
  });

  // 10. Test 7: Private Photo Storage & Signed URL Verification
  const testPhotoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const photoUpload = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/storage/upload',
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${mgrToken}`,
      'Content-Type': 'application/json'
    }
  }, { 
    dataUrl: testPhotoDataUrl,
    storagePath: 'venues/venue-default/defects/security-gate-test.png'
  });
  const signedUrl = photoUpload.json?.signedUrl || photoUpload.json?.url;
  const isSigned = signedUrl && (signedUrl.includes('token=') || signedUrl.includes('sign'));
  assert('7a. Photo upload returns signed URL (token parameter in URL)', isSigned, `URL: ${signedUrl}`);

  // Verify unauthenticated storage access returns 401
  const unauthPhoto = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/supabase/storage/photo?path=' + encodeURIComponent('venues/venue-default/defects/security-gate-test.png'),
    method: 'GET'
  });
  assert('7b. Unauthenticated photo retrieval -> HTTP 401 Unauthorized', unauthPhoto.statusCode === 401, `Status: ${unauthPhoto.statusCode}`);

  // 11. Test 8: CORS Verification
  const corsEvil = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'OPTIONS',
    headers: { 'Origin': 'https://evil-attacker.com' }
  });
  const allowOriginHeader = corsEvil.headers['access-control-allow-origin'];
  assert('8a. Evil origin CORS denied (wildcard removed)', allowOriginHeader !== '*' && allowOriginHeader !== 'https://evil-attacker.com', `Header: ${allowOriginHeader}`);

  const corsCapacitor = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'OPTIONS',
    headers: { 'Origin': 'capacitor://localhost' }
  });
  assert('8b. Capacitor Android origin allowed', corsCapacitor.headers['access-control-allow-origin'] === 'capacitor://localhost', `Header: ${corsCapacitor.headers['access-control-allow-origin']}`);

  console.log('\n==================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.filter(r => r.passed).length} | FAILED: ${results.filter(r => !r.passed).length}`);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('==================================================');
  process.exit(allPassed ? 0 : 1);
}

runSecurityAudit().catch(err => {
  console.error('Test Runner Exception:', err);
  process.exit(1);
});
