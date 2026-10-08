/**
 * Enterprise Vulnerability Management Platform Server
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { generateToken, authenticateToken, authorizeRoles, ROLES, USERS } = require('./src/auth');
const { vulnerabilityService } = require('./src/vulnerabilityService');
const auditLogger = require('./src/auditLogger');
const { WORKFLOW_STATES } = require('./src/workflow');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Disabled for local inline SPA script execution
}));
app.use(cors());
app.use(express.json({ limit: '500kb' }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 300,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', apiLimiter);

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTHENTICATION API ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = USERS.find(u => u.username === username);
  if (!user) {
    auditLogger.logEvent('ANONYMOUS', 'AUTH_FAILED', 'LOGIN', { username, reason: 'Invalid username' }, req.ip);
    return res.status(401).json({ error: 'Invalid authentication credentials' });
  }

  // Simulated bcrypt password validation (In production: await bcrypt.compare(password, user.passwordHash))
  const token = generateToken(user);
  auditLogger.logEvent(user.username, 'AUTH_SUCCESS', 'LOGIN', { role: user.role }, req.ip);

  res.json({
    message: 'Authentication successful',
    token,
    user: { id: user.id, username: user.username, role: user.role, name: user.name }
  });
});

// --- ASSET MANAGEMENT APIS ---
app.get('/api/assets', authenticateToken, (req, res) => {
  res.json(vulnerabilityService.getAssets());
});

app.post('/api/assets', authenticateToken, authorizeRoles(ROLES.SYSTEM_ADMIN, ROLES.SECURITY_LEAD), (req, res) => {
  try {
    const asset = vulnerabilityService.registerAsset(req.body, req.user);
    res.status(201).json(asset);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Asset validation failed' });
  }
});

// --- VULNERABILITY MANAGEMENT APIS ---
app.get('/api/vulnerabilities', authenticateToken, (req, res) => {
  res.json(vulnerabilityService.getVulnerabilities());
});

app.post('/api/vulnerabilities/import', authenticateToken, authorizeRoles(ROLES.SECURITY_LEAD, ROLES.SYSTEM_ADMIN), (req, res) => {
  try {
    const vuln = vulnerabilityService.importVulnerability(req.body, req.user);
    res.status(201).json(vuln);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/vulnerabilities/severity', authenticateToken, authorizeRoles(ROLES.SECURITY_LEAD, ROLES.SYSTEM_ADMIN), (req, res) => {
  try {
    const updated = vulnerabilityService.updateSeverity(req.body, req.user);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/vulnerabilities/assign', authenticateToken, authorizeRoles(ROLES.SECURITY_LEAD, ROLES.SYSTEM_ADMIN), (req, res) => {
  try {
    const { vulnerabilityId, assignedTeam } = req.body;
    const updated = vulnerabilityService.assignVulnerability(vulnerabilityId, assignedTeam, req.user);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/vulnerabilities/transition', authenticateToken, (req, res) => {
  try {
    const { vulnerabilityId, targetState, remediationNotes } = req.body;
    
    // Authorization Check: Remediation Engineers can only transition to REMEDIATION_IN_PROGRESS or VERIFICATION_PENDING
    if (req.user.role === ROLES.REMEDIATION_ENGINEER) {
      if (targetState !== WORKFLOW_STATES.REMEDIATION_IN_PROGRESS && targetState !== WORKFLOW_STATES.VERIFICATION_PENDING) {
        return res.status(403).json({
          error: `RBAC Violation: Remediation Engineers cannot transition vulnerability directly to state '${targetState}'. Verification and Closure require Security Lead approval.`
        });
      }
    }

    // Auditors cannot make any state transitions
    if (req.user.role === ROLES.SECURITY_AUDITOR) {
      return res.status(403).json({ error: 'RBAC Violation: Auditors possess read-only privileges.' });
    }

    const updated = vulnerabilityService.transitionState(vulnerabilityId, targetState, remediationNotes, req.user);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- AUDIT & COMPLIANCE APIS ---
app.get('/api/audit/logs', authenticateToken, authorizeRoles(ROLES.SECURITY_AUDITOR, ROLES.SYSTEM_ADMIN, ROLES.SECURITY_LEAD), (req, res) => {
  res.json({
    integrityStatus: auditLogger.verifyChainIntegrity(),
    logs: auditLogger.getLogs()
  });
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
  });
}

module.exports = app;
