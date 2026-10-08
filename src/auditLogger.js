/**
 * Cryptographically Chained Audit Logger (Persisted to DB2 SQLite)
 */

const crypto = require('crypto');
const { db2Query, db2Run } = require('./db');

class AuditLogger {
  constructor() {
    this.secretKey = process.env.AUDIT_HMAC_SECRET || 'ssdlc_super_secret_audit_key_2026';
  }

  async getLastHash() {
    const rows = await db2Query("SELECT hash FROM audit_logs ORDER BY rowid DESC LIMIT 1");
    if (rows.length > 0) return rows[0].hash;
    return '0000000000000000000000000000000000000000000000000000000000000000';
  }

  async logEvent(actor, action, targetResource, details, ipAddress = '127.0.0.1') {
    const timestamp = new Date().toISOString();
    const logId = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const prevHash = await this.getLastHash();
    
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);

    const entryData = {
      logId,
      timestamp,
      actor,
      action,
      targetResource,
      details: detailsStr,
      ipAddress,
      prevHash
    };

    const entryString = JSON.stringify(entryData);
    const entryHash = crypto.createHmac('sha256', this.secretKey).update(entryString).digest('hex');

    await db2Run(
      `INSERT INTO audit_logs (logId, timestamp, actor, action, targetResource, details, ipAddress, prevHash, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, timestamp, actor, action, targetResource, detailsStr, ipAddress, prevHash, entryHash]
    );

    return { ...entryData, hash: entryHash };
  }

  async getLogs() {
    const rows = await db2Query("SELECT * FROM audit_logs ORDER BY rowid DESC");
    return rows.map(r => {
      let parsedDetails = r.details;
      try { parsedDetails = JSON.parse(r.details); } catch(e){}
      return {
        ...r,
        details: parsedDetails
      };
    });
  }

  async verifyChainIntegrity() {
    const rows = await db2Query("SELECT * FROM audit_logs ORDER BY rowid ASC");
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    
    for (let i = 0; i < rows.length; i++) {
      const record = rows[i];
      if (record.prevHash !== previousHash) {
        return { intact: false, brokenIndex: i, reason: `Previous hash mismatch at index ${i}` };
      }
      const entryData = {
        logId: record.logId,
        timestamp: record.timestamp,
        actor: record.actor,
        action: record.action,
        targetResource: record.targetResource,
        details: record.details,
        ipAddress: record.ipAddress,
        prevHash: record.prevHash
      };
      const computedHash = crypto.createHmac('sha256', this.secretKey).update(JSON.stringify(entryData)).digest('hex');
      if (computedHash !== record.hash) {
        return { intact: false, brokenIndex: i, reason: `Record content tampered at index ${i}` };
      }
      previousHash = record.hash;
    }
    return { intact: true, count: rows.length };
  }
}

const auditLogger = new AuditLogger();
module.exports = auditLogger;
