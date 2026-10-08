/**
 * Authentication and RBAC Authorization Middleware
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ssdlc_vulnerability_platform_jwt_secret_2026';

const ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  SECURITY_LEAD: 'SECURITY_LEAD',
  REMEDIATION_ENGINEER: 'REMEDIATION_ENGINEER',
  SECURITY_AUDITOR: 'SECURITY_AUDITOR'
};

const USERS = [
  { id: 'usr-admin', username: 'admin', passwordHash: '$2a$10$wT8...fake', role: ROLES.SYSTEM_ADMIN, name: 'System Administrator' },
  { id: 'usr-lead', username: 'sec_lead', passwordHash: '$2a$10$wT8...fake', role: ROLES.SECURITY_LEAD, name: 'Lead Security Analyst' },
  { id: 'usr-eng', username: 'rem_eng', passwordHash: '$2a$10$wT8...fake', role: ROLES.REMEDIATION_ENGINEER, name: 'Remediation Specialist' },
  { id: 'usr-auditor', username: 'auditor', passwordHash: '$2a$10$wT8...fake', role: ROLES.SECURITY_AUDITOR, name: 'Compliance Auditor' }
];

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access Denied: Missing Authentication Bearer Token' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Access Denied: Invalid or Expired Session Token' });
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `RBAC Violation: Role '${req.user ? req.user.role : 'ANONYMOUS'}' lacks sufficient privilege. Allowed roles: [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  ROLES,
  USERS,
  generateToken,
  authenticateToken,
  authorizeRoles
};
