/**
 * Client-Side JavaScript Logic with Dynamic Role-Based UI Rendering
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

  renderNavigationTabs();
}

function renderNavigationTabs() {
  const nav = document.getElementById('mainNav');
  const role = currentUser.role;

  let tabsHTML = '';

  if (role === 'REMEDIATION_ENGINEER') {
    tabsHTML = `
      <button class="nav-btn active" onclick="switchTab('remediationTab', event)">🛠️ Remediation Workstation</button>
      <button class="nav-btn" onclick="switchTab('dashboardTab', event)">Infrastructure Assets (DB1)</button>
    `;
  } else if (role === 'SECURITY_LEAD' || role === 'SYSTEM_ADMIN') {
    tabsHTML = `
      <button class="nav-btn active" onclick="switchTab('dashboardTab', event)">Dashboard & Assets</button>
      <button class="nav-btn" onclick="switchTab('vulnerabilitiesTab', event)">Vulnerabilities & Workflow</button>
      <button class="nav-btn" onclick="switchTab('managementTab', event)">Security Lead Management</button>
      <button class="nav-btn" onclick="switchTab('auditTab', event)">Audit Trail & Integrity (DB2)</button>
    `;
  } else if (role === 'SECURITY_AUDITOR') {
    tabsHTML = `
      <button class="nav-btn active" onclick="switchTab('dashboardTab', event)">Dashboard & Assets</button>
      <button class="nav-btn" onclick="switchTab('vulnerabilitiesTab', event)">Vulnerabilities Tracking</button>
      <button class="nav-btn" onclick="switchTab('auditTab', event)">Cryptographic Audit Trail (DB2)</button>
    `;
  }

  nav.innerHTML = tabsHTML;

  // Auto load first tab
  if (role === 'REMEDIATION_ENGINEER') {
    switchTab('remediationTab');
  } else {
    switchTab('dashboardTab');
  }
}

function switchTab(tabId, evt) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(tabId).classList.remove('hidden');
  if (evt && evt.target) {
    evt.target.classList.add('active');
  } else {
    const activeBtn = document.querySelector(`.nav-btn[onclick*="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  }

  if (tabId === 'dashboardTab') loadDashboard();
  if (tabId === 'remediationTab') loadRemediationWorkstation();
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

/**
 * Dedicated Remediation Workstation View for Remediation Engineers
 */
async function loadRemediationWorkstation() {
  try {
    const vulns = await fetchAPI('/api/vulnerabilities');
    const tbody = document.getElementById('remediationTableBody');

    if (vulns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No assigned vulnerabilities found in DB1.</td></tr>`;
      return;
    }

    tbody.innerHTML = vulns.map(v => `
      <tr>
        <td><strong>${v.id}</strong></td>
        <td><code>${v.cveId}</code></td>
        <td>${v.title}</td>
        <td>${v.assetId}</td>
        <td><span class="badge badge-${v.severity.toLowerCase()}">${v.severity}</span></td>
        <td><span class="badge badge-secondary">${v.status}</span></td>
        <td><small>${v.remediationNotes || '<em>No notes yet</em>'}</small></td>
        <td>
          ${renderEngineerWorkflowActions(v)}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

function renderEngineerWorkflowActions(v) {
  if (v.status === 'ASSIGNED' || v.status === 'VULNERABILITY_IMPORTED' || v.status === 'RISK_ASSESSED') {
    return `<button class="btn btn-primary" onclick="transitionEngineerView('${v.id}', 'REMEDIATION_IN_PROGRESS')">▶ Start Remediation</button>`;
  }
  if (v.status === 'REMEDIATION_IN_PROGRESS') {
    return `<button class="btn btn-primary" style="background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));" onclick="transitionEngineerView('${v.id}', 'VERIFICATION_PENDING')">✔ Submit Patch for Verification</button>`;
  }
  if (v.status === 'VERIFICATION_PENDING') {
    return `<span class="badge badge-medium">⏳ Pending Security Lead Verification</span>`;
  }
  if (v.status === 'CLOSED') {
    return `<span class="badge badge-low">✅ Fix Verified & Closed</span>`;
  }
  return `<span style="color: var(--text-muted); font-size: 0.8rem;">State: ${v.status}</span>`;
}

async function transitionEngineerView(vulnId, targetState) {
  let notes = '';
  if (targetState === 'VERIFICATION_PENDING') {
    notes = prompt(`Enter remediation patch details for ${vulnId} (e.g. "Applied vendor patch v2.4.1 to nginx config"):`);
    if (notes === null || notes.trim() === '') {
      alert('Remediation notes are required to submit a patch for verification.');
      return;
    }
  }

  try {
    await fetchAPI('/api/vulnerabilities/transition', {
      method: 'PATCH',
      body: JSON.stringify({ vulnerabilityId: vulnId, targetState, remediationNotes: notes })
    });
    alert(`Success: Workflow transition to '${targetState}' saved to DB1 and logged to DB2!`);
    loadRemediationWorkstation();
  } catch (err) {
    alert(`Transition Blocked: ${err.message}`);
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
          ${renderSecLeadActions(v)}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

function renderSecLeadActions(v) {
  if (currentUser.role !== 'SECURITY_LEAD' && currentUser.role !== 'SYSTEM_ADMIN') {
    return `<span style="color: var(--text-muted); font-size: 0.8rem;">Read-only view</span>`;
  }
  if (v.status === 'VERIFICATION_PENDING') {
    return `<button class="btn btn-primary" onclick="secLeadCloseFix('${v.id}')">Approve & Close Fix</button>`;
  }
  if (v.status === 'VULNERABILITY_IMPORTED') {
    return `<button class="btn btn-secondary" onclick="secLeadAdjustSeverity('${v.id}')">Assess Severity</button>`;
  }
  return `<span style="color: var(--text-muted); font-size: 0.8rem;">Active Workflow</span>`;
}

async function secLeadCloseFix(vulnId) {
  const notes = prompt(`Confirm verification results for closing ${vulnId}:`, 'Re-scanned asset with OpenVAS, zero vulnerabilities detected.');
  if (notes === null) return;
  try {
    await fetchAPI('/api/vulnerabilities/transition', {
      method: 'PATCH',
      body: JSON.stringify({ vulnerabilityId: vulnId, targetState: 'CLOSED', remediationNotes: notes })
    });
    alert(`Success: Vulnerability ${vulnId} closed in DB1 and audit logged in DB2.`);
    loadVulnerabilities();
  } catch (err) {
    alert(`Close Error: ${err.message}`);
  }
}

async function secLeadAdjustSeverity(vulnId) {
  const severity = prompt(`Select new severity (LOW, MEDIUM, HIGH, CRITICAL):`, 'HIGH');
  if (!severity) return;
  const justification = prompt(`Enter mandatory severity adjustment justification:`, 'Adjusted based on internal network isolation.');
  if (!justification) return;

  try {
    await fetchAPI('/api/vulnerabilities/severity', {
      method: 'PATCH',
      body: JSON.stringify({ vulnerabilityId: vulnId, assignedSeverity: severity.toUpperCase(), justification })
    });
    alert('Severity successfully updated in DB1!');
    loadVulnerabilities();
  } catch (err) {
    alert(`Severity Update Failed: ${err.message}`);
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
    alert('Asset successfully registered into DB1 SQLite database!');
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
    alert('Vulnerability finding successfully saved to DB1 SQLite database!');
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
      badge.textContent = `HMAC Chain Intact (${data.integrityStatus.count} logs verified in DB2)`;
      badge.className = 'badge badge-low';
    } else {
      badge.textContent = `CHAIN TAMPERED! Broken at index ${data.integrityStatus.brokenIndex}`;
      badge.className = 'badge badge-critical';
    }

    tbody.innerHTML = data.logs.map(l => `
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
