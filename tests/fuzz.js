/**
 * Input Boundary Fuzzing Test Script
 * Generates mutated, unexpected payloads against REST API endpoints
 */

const http = require('http');

const FUZZ_PAYLOADS = [
  { cvssScore: -999, cveId: 'INVALID_CVE' }, // Out of bounds numbers
  { cvssScore: 9999999999999, cveId: 'CVE-2026-1042' },
  { title: "A".repeat(50000) }, // Buffer overflow attempt
  { cveId: "' OR '1'='1" }, // SQL Injection string
  { title: "<script>alert('xss')</script>" }, // XSS payload
  { assetId: null }, // Null dereference
  { assetId: { "$ne": null } }, // NoSQL Injection payload
  { cvssScore: "NOT_A_NUMBER" } // Type mismatch
];

async function runFuzzTests() {
  console.log('[*] Starting Automated Input Boundary Fuzzing Test Suite...');
  let unhandledCrashes = 0;
  let cleanRejections = 0;

  for (let i = 0; i < FUZZ_PAYLOADS.length; i++) {
    const payload = FUZZ_PAYLOADS[i];
    try {
      const res = await sendPayload(payload);
      if (res.status >= 400 && res.status < 500) {
        cleanRejections++;
        console.log(`  [✓] Fuzz Payload #${i + 1} cleanly rejected with HTTP ${res.status}`);
      } else if (res.status >= 500) {
        unhandledCrashes++;
        console.error(`  [✗] Fuzz Payload #${i + 1} caused Internal Server Error (HTTP 500)! Payload:`, payload);
      } else {
        console.log(`  [!] Fuzz Payload #${i + 1} accepted unexpectedly with HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(`  [!] Connection or socket error on Payload #${i + 1}:`, err.message);
    }
  }

  console.log('\n--- FUZZ TESTING OBSERVATIONS & RESULTS ---');
  console.log(`Total Fuzz Mutated Payloads Sent: ${FUZZ_PAYLOADS.length}`);
  console.log(`Clean 4xx Error Handling Responses: ${cleanRejections}`);
  console.log(`Unhandled Server Exception (500) Crashes: ${unhandledCrashes}`);
  console.log(`Resilience Score: ${((cleanRejections / FUZZ_PAYLOADS.length) * 100).toFixed(1)}%`);

  if (unhandledCrashes === 0) {
    console.log('[+] SUCCESS: Zero unhandled application crashes observed under fuzzing attacks.');
  }
}

function sendPayload(body) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/vulnerabilities/import',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake_jwt_for_fuzz_testing'
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

runFuzzTests();
