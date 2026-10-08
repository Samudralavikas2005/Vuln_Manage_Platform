/**
 * API Integration Test Suite
 * Tests REST Endpoints, RBAC Access Controls, and Input Validation
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

// Helper to make local HTTP requests to running server
function makeRequest(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('Integration Test 1: Unauthenticated Endpoint Rejection', async () => {
  const res = await makeRequest('/api/assets');
  assert.strictEqual(res.status, 401);
  assert.match(res.data.error, /Missing Authentication/);
});

test('Integration Test 2: Successful Authentication Flow', async () => {
  const res = await makeRequest('/api/auth/login', 'POST', {}, { username: 'sec_lead', password: 'any' });
  assert.strictEqual(res.status, 200);
  assert.ok(res.data.token);
  assert.strictEqual(res.data.user.role, 'SECURITY_LEAD');
});

test('Integration Test 3: RBAC Authorization Enforcement', async () => {
  // Login as auditor (Read-Only)
  const loginRes = await makeRequest('/api/auth/login', 'POST', {}, { username: 'auditor', password: 'any' });
  const auditorToken = loginRes.data.token;

  // Attempt to register asset as Auditor (Should fail with 403)
  const registerRes = await makeRequest('/api/assets', 'POST', {
    'Authorization': `Bearer ${auditorToken}`
  }, {
    name: 'Unauthorized Server',
    ipAddress: '10.0.0.1',
    type: 'SERVER',
    owner: 'Auditor',
    criticality: 'LOW'
  });

  assert.strictEqual(registerRes.status, 403);
  assert.match(registerRes.data.error, /RBAC Violation/);
});
