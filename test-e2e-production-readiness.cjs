const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

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
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

// Generate test tokens using standard HMAC-SHA256 matching server implementation
const TEST_AUTH_SECRET = 'test-prod-validation-auth-secret-32-chars-long!!';

function makeToken(user, expiresInMs = 3600 * 1000) {
  const now = Date.now();
  const fullPayload = { ...user, iat: now, exp: now + expiresInMs };
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const s = crypto.createHmac('sha256', TEST_AUTH_SECRET).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${s}`;
}

async function runVerification() {
  console.log('================================================================');
  console.log('HNDVR END-TO-END PRODUCTION READINESS VERIFICATION');
  console.log('================================================================\n');

  const results = [];
  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      results.push({ name, passed: true, details });
    } else {
      console.error(`❌ [FAIL] ${name} ${details}`);
      results.push({ name, passed: false, details });
    }
  }

  // 1. Scan production output files for secrets
  console.log('--- 1. Production Build & Secret Scan ---');
  const distDir = path.join(__dirname, 'dist');
  assert('dist/ directory exists', fs.existsSync(distDir));
  assert('dist/index.html exists', fs.existsSync(path.join(distDir, 'index.html')));
  assert('dist/server.cjs exists', fs.existsSync(path.join(distDir, 'server.cjs')));

  function scanDirForSecrets(dir) {
    const findings = [];
    const files = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
    for (const f of files) {
      if (!f.isFile()) continue;
      const fullPath = path.join(f.parentPath || dir, f.name);
      // Skip binary files if any, inspect text assets
      const ext = path.extname(f.name);
      if (['.js', '.cjs', '.map', '.html', '.css', '.json'].includes(ext)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('SUPABASE_SERVICE_ROLE_KEY') && !fullPath.includes('server.cjs')) {
          findings.push({ file: fullPath, pattern: 'SUPABASE_SERVICE_ROLE_KEY' });
        }
        if (content.includes('hndvr-ops-secure-salt-2026-auth')) {
          findings.push({ file: fullPath, pattern: 'hndvr-ops-secure-salt-2026-auth' });
        }
        if (content.includes('GEMINI_API_KEY')) {
          findings.push({ file: fullPath, pattern: 'GEMINI_API_KEY' });
        }
      }
    }
    return findings;
  }

  const clientFindings = scanDirForSecrets(path.join(distDir, 'assets'));
  assert('Client dist/assets contains NO backend secrets or hardcoded fallback salts', clientFindings.length === 0, JSON.stringify(clientFindings));

  const androidAssetsDir = path.join(__dirname, 'android/app/src/main/assets/public');
  if (fs.existsSync(androidAssetsDir)) {
    const androidFindings = scanDirForSecrets(androidAssetsDir);
    assert('Android packaged assets contain NO backend secrets', androidFindings.length === 0, JSON.stringify(androidFindings));
  }

  // 2. Start Production Server in realistic production configuration
  console.log('\n--- 2. Production Server Startup & Configuration ---');
  const serverProcess = spawn(process.execPath, ['dist/server.cjs'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3456',
      AUTH_SECRET: TEST_AUTH_SECRET,
      SUPABASE_URL: 'https://hpdmzmjuycmsuxmwodjv.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test_service_role_key_for_backend',
      APP_URL: 'https://hndvr-production.run.app',
      ALLOWED_ORIGINS: 'https://operations.mycompany.com,https://tablet.mycompany.com'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', d => serverOutput += d.toString());
  serverProcess.stderr.on('data', d => serverOutput += d.toString());

  // Wait for server to start
  await new Promise((resolve) => {
    const interval = setInterval(async () => {
      try {
        const res = await request({ hostname: '127.0.0.1', port: 3456, path: '/api/health', method: 'GET' });
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve();
        }
      } catch {}
    }, 200);
    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, 5000);
  });

  // 3. Health check
  console.log('\n--- 3. Backend Health & Service Status ---');
  const healthRes = await request({ hostname: '127.0.0.1', port: 3456, path: '/api/health', method: 'GET' });
  assert('GET /api/health returns 200 OK', healthRes.statusCode === 200);
  assert('Health response reports hasSupabase: true', healthRes.json?.hasSupabase === true);
  assert('Health response does NOT expose secret keys', !healthRes.body.includes('sb_secret') && !healthRes.body.includes(TEST_AUTH_SECRET));

  // 4. CORS verification
  console.log('\n--- 4. CORS Security Verification ---');
  // 4a. Approved APP_URL
  const corsAppUrl = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/health', method: 'OPTIONS',
    headers: { 'Origin': 'https://hndvr-production.run.app' }
  });
  assert('Configured APP_URL (https://hndvr-production.run.app) is allowed in CORS', corsAppUrl.headers['access-control-allow-origin'] === 'https://hndvr-production.run.app');

  // 4b. Approved ALLOWED_ORIGINS entry
  const corsCustom = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/health', method: 'OPTIONS',
    headers: { 'Origin': 'https://operations.mycompany.com' }
  });
  assert('Configured ALLOWED_ORIGINS entry is allowed in CORS', corsCustom.headers['access-control-allow-origin'] === 'https://operations.mycompany.com');

  // 4c. Android Capacitor WebView
  const corsCap = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/health', method: 'OPTIONS',
    headers: { 'Origin': 'capacitor://localhost' }
  });
  assert('Capacitor Android origin (capacitor://localhost) is allowed in CORS', corsCap.headers['access-control-allow-origin'] === 'capacitor://localhost');

  // 4d. Unapproved external origin
  const corsEvil = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/health', method: 'OPTIONS',
    headers: { 'Origin': 'https://evil-attacker.com' }
  });
  assert('Unauthorized origin (https://evil-attacker.com) is REJECTED (no allow header)', !corsEvil.headers['access-control-allow-origin']);

  // 4e. Unapproved .run.app origin (wildcard removal check)
  const corsEvilRunApp = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/health', method: 'OPTIONS',
    headers: { 'Origin': 'https://malicious-tenant.run.app' }
  });
  assert('Arbitrary .run.app domain (https://malicious-tenant.run.app) is REJECTED', !corsEvilRunApp.headers['access-control-allow-origin']);

  // 5. Authentication & Authorization Gates
  console.log('\n--- 5. Authentication & Authorization Security ---');
  // 5a. Unauthenticated access to protected endpoint
  const unauthReq = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/supabase/template', method: 'GET'
  });
  assert('Unauthenticated access to protected endpoint returns 401', unauthReq.statusCode === 401);

  // 5b. Malformed token
  const malformedReq = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/supabase/template', method: 'GET',
    headers: { 'Authorization': 'Bearer NOT.A.VALID.JWT.SIGNATURE' }
  });
  assert('Malformed token returns 401 without crashing server', malformedReq.statusCode === 401);

  // 5c. Expired token
  const expiredToken = makeToken({ userId: 'user-manager', name: 'Manager', role: 'MANAGER', venueId: 'venue-default' }, -5000);
  const expiredReq = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/supabase/template', method: 'GET',
    headers: { 'Authorization': `Bearer ${expiredToken}` }
  });
  assert('Expired token returns 401 Unauthorized', expiredReq.statusCode === 401);

  // 5d. Tampered signature
  const validMgrToken = makeToken({ userId: 'user-manager', name: 'Manager', role: 'MANAGER', venueId: 'venue-default' });
  const tamperedToken = validMgrToken.slice(0, -4) + 'abcd';
  const tamperedReq = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/supabase/template', method: 'GET',
    headers: { 'Authorization': `Bearer ${tamperedToken}` }
  });
  assert('Tampered signature token returns 401 Unauthorized', tamperedReq.statusCode === 401);

  // 5e. Token with different secret
  const fakeSecretToken = crypto.createHmac('sha256', 'wrong-secret').update('fake').digest('base64url');
  const wrongSecretReq = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/supabase/template', method: 'GET',
    headers: { 'Authorization': `Bearer ${fakeSecretToken}` }
  });
  assert('Token signed with different secret returns 401', wrongSecretReq.statusCode === 401);

  // 5f. Valid token /api/auth/me claims verification
  const meReq = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/auth/me', method: 'GET',
    headers: { 'Authorization': `Bearer ${validMgrToken}` }
  });
  assert('Valid token on /api/auth/me returns 200 and correct user claims', meReq.statusCode === 200 && meReq.json?.user?.role === 'MANAGER');

  // 5g. Role Gate: STAFF attempting MANAGER-only template modify -> 403
  const validStaffToken = makeToken({ userId: 'user-staff', name: 'Floor Staff', role: 'STAFF', venueId: 'venue-default' });
  const staffTemplateMod = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/supabase/template', method: 'POST',
    headers: { 'Authorization': `Bearer ${validStaffToken}`, 'Content-Type': 'application/json' },
  }, { template: { version: 1 } });
  assert('STAFF role attempting MANAGER template modify returns 403 Forbidden', staffTemplateMod.statusCode === 403);

  // 5h. Role Gate: STAFF attempting task delete -> 403
  const staffTaskDelete = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/supabase/daily-tasks/task-123', method: 'DELETE',
    headers: { 'Authorization': `Bearer ${validStaffToken}` }
  });
  assert('STAFF role attempting task deletion returns 403 Forbidden', staffTaskDelete.statusCode === 403);

  // 5i. Role Gate: Assistant Manager attempting template modify -> 403
  const validAsstToken = makeToken({ userId: 'user-asst', name: 'Asst Mgr', role: 'ASSISTANT_MANAGER', venueId: 'venue-default' });
  const asstTemplateMod = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/supabase/template', method: 'POST',
    headers: { 'Authorization': `Bearer ${validAsstToken}`, 'Content-Type': 'application/json' },
  }, { template: { version: 1 } });
  assert('ASSISTANT_MANAGER role attempting template modify returns 403 Forbidden', asstTemplateMod.statusCode === 403);

  // 5j. Venue Boundary Gate: User in venue-default trying to query venue-other -> 403
  const crossVenueReq = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/supabase/template?venueId=venue-unauthorized', method: 'GET',
    headers: { 'Authorization': `Bearer ${validMgrToken}` }
  });
  assert('User attempting cross-venue access returns 403 Forbidden', crossVenueReq.statusCode === 403);

  // 6. Production Error Sanitization
  console.log('\n--- 6. Production Error Sanitization ---');
  // Malformed POST body triggering error in photo upload without crashing
  const badUploadReq = await request({
    hostname: '127.0.0.1', port: 3456, path: '/api/supabase/storage/upload', method: 'POST',
    headers: { 'Authorization': `Bearer ${validMgrToken}`, 'Content-Type': 'application/json' },
  }, { dataUrl: 'invalid_data', storagePath: 'venues/venue-default/test.jpg' });
  assert('Invalid payload returns sanitized 400 without leaking stack traces or paths', 
    badUploadReq.statusCode === 400 && !badUploadReq.body.includes('at ') && !badUploadReq.body.includes('C:\\'));

  // Terminate test server
  serverProcess.kill();

  console.log('\n================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${results.filter(r => r.passed).length} | FAILED: ${results.filter(r => !r.passed).length}`);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL PRODUCTION VERIFICATIONS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
