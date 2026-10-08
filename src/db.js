/**
 * Database Module: DB1 (Assets, Vulnerabilities & Users) and DB2 (Tamper-Evident Audit Logs)
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbDir = path.join(__dirname, '..', 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const DB1_PATH = path.join(dbDir, 'DB1_assets_vulnerabilities.sqlite');
const DB2_PATH = path.join(dbDir, 'DB2_tamper_evident_audit.sqlite');

const db1 = new sqlite3.Database(DB1_PATH);
const db2 = new sqlite3.Database(DB2_PATH);

// Initialize DB1 Tables
db1.serialize(() => {
  db1.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  db1.run(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ipAddress TEXT NOT NULL,
      type TEXT NOT NULL,
      owner TEXT NOT NULL,
      criticality TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  db1.run(`
    CREATE TABLE IF NOT EXISTS vulnerabilities (
      id TEXT PRIMARY KEY,
      assetId TEXT NOT NULL,
      cveId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cvssScore REAL NOT NULL,
      severity TEXT NOT NULL,
      assignedTeam TEXT NOT NULL,
      remediationNotes TEXT,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (assetId) REFERENCES assets(id)
    )
  `);

  // Seed sample Users in DB1
  db1.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
    if (!err && row.count === 0) {
      const now = new Date().toISOString();
      db1.run(`INSERT INTO users VALUES ('usr-admin', 'admin', 'System Administrator', 'SYSTEM_ADMIN', 'ACTIVE', '${now}')`);
      db1.run(`INSERT INTO users VALUES ('usr-lead', 'sec_lead', 'Lead Security Analyst', 'SECURITY_LEAD', 'ACTIVE', '${now}')`);
      db1.run(`INSERT INTO users VALUES ('usr-eng', 'rem_eng', 'Remediation Specialist', 'REMEDIATION_ENGINEER', 'ACTIVE', '${now}')`);
      db1.run(`INSERT INTO users VALUES ('usr-auditor', 'auditor', 'Compliance Auditor', 'SECURITY_AUDITOR', 'ACTIVE', '${now}')`);
    }
  });

  // Seed sample Assets & Vulnerabilities in DB1
  db1.get("SELECT COUNT(*) AS count FROM assets", (err, row) => {
    if (!err && row.count === 0) {
      db1.run(`INSERT INTO assets VALUES ('AST-001', 'Production Auth Server', '192.168.1.50', 'SERVER', 'SecOps Team', 'CRITICAL', 'ACTIVE', '${new Date().toISOString()}')`);
      db1.run(`INSERT INTO assets VALUES ('AST-002', 'Customer DB Cluster', '192.168.1.100', 'DATABASE', 'DBA Team', 'HIGH', 'ACTIVE', '${new Date().toISOString()}')`);
      
      db1.run(`INSERT INTO vulnerabilities VALUES ('VULN-2026-001', 'AST-001', 'CVE-2026-1042', 'Remote Code Execution in Auth Middleware', 'Buffer overflow in JWT verification', 9.8, 'CRITICAL', 'SecOps Dev Team', 'Patched dependency to v2.4.1', 'VERIFICATION_PENDING', '${new Date().toISOString()}')`);
      db1.run(`INSERT INTO vulnerabilities VALUES ('VULN-2026-002', 'AST-002', 'CVE-2026-8819', 'SQL Injection in Search Endpoint', 'Unsanitized input in search query', 8.1, 'HIGH', 'SecOps Dev Team', '', 'ASSIGNED', '${new Date().toISOString()}')`);
    }
  });
});

// Initialize DB2 Tables
db2.serialize(() => {
  db2.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      logId TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      targetResource TEXT NOT NULL,
      details TEXT NOT NULL,
      ipAddress TEXT NOT NULL,
      prevHash TEXT NOT NULL,
      hash TEXT NOT NULL
    )
  `);
});

// Helper Functions
const db1Query = (sql, params = []) => new Promise((resolve, reject) => {
  db1.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const db1Run = (sql, params = []) => new Promise((resolve, reject) => {
  db1.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});

const db2Query = (sql, params = []) => new Promise((resolve, reject) => {
  db2.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const db2Run = (sql, params = []) => new Promise((resolve, reject) => {
  db2.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});

module.exports = {
  DB1_PATH,
  DB2_PATH,
  db1Query,
  db1Run,
  db2Query,
  db2Run
};
