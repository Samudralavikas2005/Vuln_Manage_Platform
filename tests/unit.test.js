/**
 * Automated Unit Test Suite
 * Tests Auth JWT, State Machine, and Severity Calculation
 */

const test = require('node:test');
const assert = require('node:assert');

const { generateToken, USERS, ROLES } = require('../src/auth');
const { WORKFLOW_STATES, WorkflowEngine } = require('../src/workflow');
const auditLogger = require('../src/auditLogger');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/auth');

test('Unit Test 1: JWT Token Generation & Verification', () => {
  const user = USERS[0];
  const token = generateToken(user);
  assert.ok(token, 'Token should be generated');

  const decoded = jwt.verify(token, JWT_SECRET);
  assert.strictEqual(decoded.username, user.username);
  assert.strictEqual(decoded.role, ROLES.SYSTEM_ADMIN);
});

test('Unit Test 2: Workflow State Machine Allowed Transitions', () => {
  // Valid transition
  const validCheck = WorkflowEngine.validateTransition(
    WORKFLOW_STATES.ASSET_REGISTERED,
    WORKFLOW_STATES.VULNERABILITY_IMPORTED
  );
  assert.strictEqual(validCheck.valid, true);

  // Invalid transition (Attempting to jump from ASSET_REGISTERED directly to CLOSED)
  const invalidCheck = WorkflowEngine.validateTransition(
    WORKFLOW_STATES.ASSET_REGISTERED,
    WORKFLOW_STATES.CLOSED
  );
  assert.strictEqual(invalidCheck.valid, false);
  assert.match(invalidCheck.reason, /Workflow Integrity Violation/);
});

test('Unit Test 3: Tamper-Evident HMAC Audit Logger Chain', () => {
  auditLogger.logEvent('test_user', 'TEST_ACTION', 'RESOURCE-1', { foo: 'bar' });
  auditLogger.logEvent('test_user_2', 'TEST_ACTION_2', 'RESOURCE-2', { foo: 'baz' });

  const integrity = auditLogger.verifyChainIntegrity();
  assert.strictEqual(integrity.intact, true);
  assert.ok(integrity.count >= 2);
});
