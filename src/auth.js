/**
 * Authentication and RBAC Authorization Middleware (Integrated with DB1 SQLite Users)
 */

const jwt = require('jsonwebtoken');
const { db1Query, db1Run } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'ssdlc_vulnerability_platform_jwt_secret_2026';

const ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  SECURITY_LEAD: 'SECURITY_LEAD',
  REMEDIATION_ENGINEER: 'REMEDIATION_ENGINEER',
  SECURITY_AUDITOR: 'SECURITY_AUDITOR'
};

async function getUsersFromDB() {
  return await db1Query("SELECT * FROM users ORDER BY id ASC");
}

async function findUserByUsername(username) {
  const rows = await db1Query("SELECT * FROM users WHERE username = ?", [username]);
  return rows.length > 0 ? rows[0] : null;
}

async function createUserInDB(username, name, role) {
  const countRows = await db1Query("SELECT COUNT(*) AS count FROM users");
  const userId = `usr-${String(countRows[0].count + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();
  await db1Run("INSERT INTO users VALUES (?, ?, ?, ?, 'ACTIVE', ?)", [userId, username, name, role, now]);
  return { id: userId, username, name, role, status: 'ACTIVE', createdAt: now };
}

async function updateUserRoleInDB(username, newRole) {
  await db1Run("UPDATE users SET role = ? WHERE username = ?", [newRole, username]);
  return await findUserByUsername(username);
}

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
  getUsersFromDB,
  findUserByUsername,
  createUserInDB,
  updateUserRoleInDB,
  generateToken,
  authenticateToken,
  authorizeRoles
};
