/**
 * Enterprise Vulnerability Management Platform Server (Powered by DB1 & DB2 SQLite Databases)
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { generateToken, authenticateToken, authorizeRoles, ROLES, getUsersFromDB, findUserByUsername, createUserInDB, updateUserRoleInDB } = require('./src/auth');
const { vulnerabilityService } = require('./src/vulnerabilityService');
const auditLogger = require('./src/auditLogger');
const { WORKFLOW_STATES } = require('./src/workflow');
const { DB1_PATH, DB2_PATH } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '500kb' }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', apiLimiter);

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTHENTICATION API ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await findUserByUsername(username);
  if (!user) {
    await auditLogger.logEvent('ANONYMOUS', 'AUTH_FAILED', 'LOGIN', { username, reason: 'Invalid username' }, req.ip);
    return res.status(401).json({ error: 'Invalid authentication credentials' });
  }

  const token = generateToken(user);
  await auditLogger.logEvent(user.username, 'AUTH_SUCCESS', 'LOGIN', { role: user.role }, req.ip);

  res.json({
    message: 'Authentication successful',
    token,
    user: { id: user.id, username: user.username, role: user.role, name: user.name }
  });
});

// --- ADMIN USER MANAGEMENT APIS ---
app.get('/api/admin/users', authenticateToken, authorizeRoles(ROLES.SYSTEM_ADMIN), async (req, res) => {
  try {
    const users = await getUsersFromDB();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', authenticateToken, authorizeRoles(ROLES.SYSTEM_ADMIN), async (req, res) => {
  try {
    const { username, name, role } = req.body;
    if (!username || !name || !role) {
      return res.status(400).json({ error: 'Username, name, and role are required' });
    }
    if (!ROLES[role]) {
      return res.status(400).json({ error: `Invalid role '${role}'. Allowed: [${Object.keys(ROLES).join(', ')}]` });
    }

    const existing = await findUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: `Username '${username}' is already registered.` });
    }

    const newUser = await createUserInDB(username, name, role);
    await auditLogger.logEvent(req.user.username, 'USER_CREATED', newUser.username, { role: newUser.role, name: newUser.name });
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/admin/users/role', authenticateToken, authorizeRoles(ROLES.SYSTEM_ADMIN), async (req, res) => {
  try {
    const { username, newRole } = req.body;
    if (!username || !newRole) {
      return res.status(400).json({ error: 'Username and newRole are required' });
    }
    if (!ROLES[newRole]) {
      return res.status(400).json({ error: `Invalid role '${newRole}'.` });
    }

    const updated = await updateUserRoleInDB(username, newRole);
    await auditLogger.logEvent(req.user.username, 'USER_ROLE_MODIFIED', username, { newRole });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- ASSET MANAGEMENT APIS ---
app.get('/api/assets', authenticateToken, async (req, res) => {
  try {
    const assets = await vulnerabilityService.getAssets();
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/assets', authenticateToken, authorizeRoles(ROLES.SYSTEM_ADMIN, ROLES.SECURITY_LEAD), async (req, res) => {
  try {
    const asset = await vulnerabilityService.registerAsset(req.body, req.user);
    res.status(201).json(asset);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Asset validation failed' });
  }
});

// --- VULNERABILITY MANAGEMENT APIS ---
app.get('/api/vulnerabilities', authenticateToken, async (req, res) => {
  try {
    const vulns = await vulnerabilityService.getVulnerabilities();
    res.json(vulns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vulnerabilities/import', authenticateToken, authorizeRoles(ROLES.SECURITY_LEAD, ROLES.SYSTEM_ADMIN), async (req, res) => {
  try {
    const vuln = await vulnerabilityService.importVulnerability(req.body, req.user);
    res.status(201).json(vuln);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/vulnerabilities/severity', authenticateToken, authorizeRoles(ROLES.SECURITY_LEAD, ROLES.SYSTEM_ADMIN), async (req, res) => {
  try {
    const updated = await vulnerabilityService.updateSeverity(req.body, req.user);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/vulnerabilities/assign', authenticateToken, authorizeRoles(ROLES.SECURITY_LEAD, ROLES.SYSTEM_ADMIN), async (req, res) => {
  try {
    const { vulnerabilityId, assignedTeam } = req.body;
    const updated = await vulnerabilityService.assignVulnerability(vulnerabilityId, assignedTeam, req.user);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/vulnerabilities/transition', authenticateToken, async (req, res) => {
  try {
    const { vulnerabilityId, targetState, remediationNotes } = req.body;
    
    // RBAC Check for Remediation Engineer
    if (req.user.role === ROLES.REMEDIATION_ENGINEER) {
      if (targetState !== WORKFLOW_STATES.REMEDIATION_IN_PROGRESS && targetState !== WORKFLOW_STATES.VERIFICATION_PENDING) {
        return res.status(403).json({
          error: `RBAC Violation: Remediation Engineers cannot directly set state '${targetState}'. Verification and Closure require Security Lead approval.`
        });
      }
    }

    if (req.user.role === ROLES.SECURITY_AUDITOR) {
      return res.status(403).json({ error: 'RBAC Violation: Auditors possess read-only privileges.' });
    }

    const updated = await vulnerabilityService.transitionState(vulnerabilityId, targetState, remediationNotes, req.user);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- AUDIT & COMPLIANCE APIS ---
app.get('/api/audit/logs', authenticateToken, authorizeRoles(ROLES.SECURITY_AUDITOR, ROLES.SYSTEM_ADMIN, ROLES.SECURITY_LEAD), async (req, res) => {
  try {
    const integrityStatus = await auditLogger.verifyChainIntegrity();
    const logs = await auditLogger.getLogs();
    res.json({
      db2Path: DB2_PATH,
      integrityStatus,
      logs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all route to serve SPA frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled System Exception:', err);
  res.status(500).json({ error: 'Internal Server Error (Details suppressed for security)' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[+] Vulnerability Management Platform active on http://localhost:${PORT}`);
    console.log(`[+] DB1 SQLite Storage: ${DB1_PATH}`);
    console.log(`[+] DB2 SQLite Storage: ${DB2_PATH}`);
  });
}

module.exports = app;
