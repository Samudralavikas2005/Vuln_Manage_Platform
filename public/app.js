/**
 * Client-Side JavaScript Logic for Vulnerability Management Platform
 */

let authToken = localStorage.getItem('token') || '';
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

document.addEventListener('DOMContentLoaded', () => {
  if (authToken && currentUser) {
    showAuthenticatedUI();
  } else {
    showLoginUI();
  }

  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerAssetForm').addEventListener('submit', handleRegisterAsset);
  document.getElementById('importVulnForm').addEventListener('submit', handleImportVuln);
});

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('usernameSelect').value;
  const password = document.getElementById('passwordInput').value;
  const loginError = document.getElementById('loginError');
  loginError.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed');

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(currentUser));

    showAuthenticatedUI();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  }
}

function logout() {
  authToken = '';
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showLoginUI();
}

function showLoginUI() {
  document.getElementById('loginView').classList.remove('hidden');
  document.getElementById('mainHeader').classList.add('hidden');
  document.getElementById('mainNav').classList.add('hidden');
  document.getElementById('appContainer').classList.add('hidden');
}

function showAuthenticatedUI() {
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('mainHeader').classList.remove('hidden');
  document.getElementById('mainNav').classList.remove('hidden');
  document.getElementById('appContainer').classList.remove('hidden');

  document.getElementById('headerUserName').textContent = currentUser.name;
  document.getElementById('headerUserRole').textContent = currentUser.role;

  loadDashboard();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(tabId).classList.remove('hidden');
  event.target.classList.add('active');

  if (tabId === 'dashboardTab') loadDashboard();
  if (tabId === 'vulnerabilitiesTab') loadVulnerabilities();
  if (tabId === 'managementTab') loadManagementView();
  if (tabId === 'auditTab') loadAuditLogs();
}

async function fetchAPI(url, options = {}) {
  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Request Failed');
  return data;
}

async function loadDashboard() {
  try {
    const assets = await fetchAPI('/api/assets');
    const vulns = await fetchAPI('/api/vulnerabilities');

    document.getElementById('metricAssetsCount').textContent = assets.length;
    document.getElementById('metricCriticalCount').textContent = vulns.filter(v => v.severity === 'CRITICAL').length;
    document.getElementById('metricPendingCount').textContent = vulns.filter(v => v.status === 'VERIFICATION_PENDING').length;

    const tbody = document.getElementById('assetsTableBody');
    tbody.innerHTML = assets.map(a => `
      <tr>
        <td><strong>${a.id}</strong></td>
        <td>${a.name}</td>
        <td><code>${a.ipAddress}</code></td>
        <td><span class="badge badge-secondary">${a.type}</span></td>
        <td>${a.owner}</td>
        <td><span class="badge badge-${a.criticality.toLowerCase()}">${a.criticality}</span></td>
        <td><span class="badge badge-low">${a.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadVulnerabilities() {
  try {
    const vulns = await fetchAPI('/api/vulnerabilities');
    const tbody = document.getElementById('vulnsTableBody');

    tbody.innerHTML = vulns.map(v => `
      <tr>
        <td><strong>${v.id}</strong></td>
        <td><code>${v.cveId}</code></td>
        <td>${v.title}</td>
        <td>${v.assetId}</td>
        <td><span class="badge badge-${v.severity.toLowerCase()}">${v.severity} (CVSS ${v.cvssScore})</span></td>
        <td>${v.assignedTeam}</td>
        <td><span class="badge badge-secondary">${v.status}</span></td>
        <td>
          ${renderActions(v)}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

function renderActions(v) {
  if (v.status === 'VERIFICATION_PENDING' && (currentUser.role === 'SECURITY_LEAD' || currentUser.role === 'SYSTEM_ADMIN')) {
    return `<button class="btn btn-primary" onclick="transitionVuln('${v.id}', 'CLOSED')">Verify & Close Fix</button>`;
  }
  if (v.status === 'ASSIGNED' || v.status === 'REMEDIATION_IN_PROGRESS') {
    return `<button class="btn btn-secondary" onclick="transitionVuln('${v.id}', 'VERIFICATION_PENDING')">Mark Fix Ready</button>`;
  }
  return `<span style="color: var(--text-muted); font-size: 0.8rem;">No actions</span>`;
}

async function transitionVuln(vulnId, targetState) {
  const notes = prompt(`Enter remediation verification notes for transitioning ${vulnId} to ${targetState}:`);
  if (notes === null) return;
  try {
    await fetchAPI('/api/vulnerabilities/transition', {
      method: 'PATCH',
      body: JSON.stringify({ vulnerabilityId: vulnId, targetState, remediationNotes: notes })
    });
    alert(`Success: Vulnerability ${vulnId} state updated to ${targetState}`);
    loadVulnerabilities();
  } catch (err) {
    alert(`Transition Error: ${err.message}`);
  }
}

async function loadManagementView() {
  try {
    const assets = await fetchAPI('/api/assets');
    const select = document.getElementById('importAssetId');
    select.innerHTML = assets.map(a => `<option value="${a.id}">${a.id} - ${a.name} (${a.ipAddress})</option>`).join('');
  } catch (err) {
    console.error(err);
  }
}

async function handleRegisterAsset(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('assetName').value,
    ipAddress: document.getElementById('assetIp').value,
    type: document.getElementById('assetType').value,
    owner: 'Security Ops',
    criticality: document.getElementById('assetCriticality').value
  };

  try {
    await fetchAPI('/api/assets', { method: 'POST', body: JSON.stringify(payload) });
    alert('Asset successfully registered and logged!');
    document.getElementById('registerAssetForm').reset();
    loadDashboard();
  } catch (err) {
    alert(`Registration Failed: ${err.message}`);
  }
}

async function handleImportVuln(e) {
  e.preventDefault();
  const payload = {
    assetId: document.getElementById('importAssetId').value,
    cveId: document.getElementById('importCve').value,
    title: document.getElementById('importTitle').value,
    cvssScore: parseFloat(document.getElementById('importCvss').value),
    description: 'Imported scanner security vulnerability finding.',
    scannerName: document.getElementById('importScanner').value
  };

  try {
    await fetchAPI('/api/vulnerabilities/import', { method: 'POST', body: JSON.stringify(payload) });
    alert('Vulnerability finding successfully imported!');
    document.getElementById('importVulnForm').reset();
    loadVulnerabilities();
  } catch (err) {
    alert(`Import Failed: ${err.message}`);
  }
}

async function loadAuditLogs() {
  try {
    const data = await fetchAPI('/api/audit/logs');
    const tbody = document.getElementById('auditTableBody');

    const badge = document.getElementById('auditVerificationBadge');
    if (data.integrityStatus.intact) {
      badge.textContent = `HMAC Chain Intact (${data.integrityStatus.count} logs verified)`;
      badge.className = 'badge badge-low';
    } else {
      badge.textContent = `CHAIN TAMPERED! Broken at index ${data.integrityStatus.brokenIndex}`;
      badge.className = 'badge badge-critical';
    }

    tbody.innerHTML = data.logs.slice().reverse().map(l => `
      <tr>
        <td><code>${l.logId}</code></td>
        <td>${new Date(l.timestamp).toLocaleTimeString()}</td>
        <td><strong>${l.actor}</strong></td>
        <td><span class="badge badge-secondary">${l.action}</span></td>
        <td>${l.targetResource}</td>
        <td><small>${JSON.stringify(l.details)}</small></td>
        <td><code>${l.hash.substring(0, 16)}...</code></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}
