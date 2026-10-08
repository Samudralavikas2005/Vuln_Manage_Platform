/**
 * Cryptographically Chained Audit Logger
 * Implements tamper-evident logging using HMAC-SHA256 chaining.
 */

const crypto = require('crypto');

class AuditLogger {
  constructor() {
    this.logs = [];
    this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
    this.secretKey = process.env.AUDIT_HMAC_SECRET || 'ssdlc_super_secret_audit_key_2026';
  }

  logEvent(actor, action, targetResource, details, ipAddress = '127.0.0.1') {
    const timestamp = new Date().toISOString();
    const logId = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const entryData = {
      logId,
      timestamp,
      actor,
      action,
      targetResource,
      details,
      ipAddress,
      prevHash: this.lastHash
    };

    const entryString = JSON.stringify(entryData);
    const entryHash = crypto.createHmac('sha256', this.secretKey).update(entryString).digest('hex');

    const logRecord = {
      ...entryData,
      hash: entryHash
    };

    this.lastHash = entryHash;
    this.logs.push(logRecord);
    return logRecord;
  }

  getLogs() {
    return this.logs;
  }

  verifyChainIntegrity() {
    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (let i = 0; i < this.logs.length; i++) {
      const record = this.logs[i];
      if (record.prevHash !== previousHash) {
        return { intact: false, brokenIndex: i, reason: 'Previous hash mismatch (Link severed)' };
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
        return { intact: false, brokenIndex: i, reason: 'Record content tampered' };
      }
      previousHash = record.hash;
    }
    return { intact: true, count: this.logs.length };
  }
}

const auditLogger = new AuditLogger();
module.exports = auditLogger;
