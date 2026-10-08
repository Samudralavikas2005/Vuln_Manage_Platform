/**
 * Workflow State Machine for Vulnerability Management Platform
 * Enforces strict transitions:
 * Asset -> Vulnerability -> Risk Assessment -> Assignment -> Remediation -> Verification -> Closure
 */

const WORKFLOW_STATES = {
  ASSET_REGISTERED: 'ASSET_REGISTERED',
  VULNERABILITY_IMPORTED: 'VULNERABILITY_IMPORTED',
  RISK_ASSESSED: 'RISK_ASSESSED',
  ASSIGNED: 'ASSIGNED',
  REMEDIATION_IN_PROGRESS: 'REMEDIATION_IN_PROGRESS',
  VERIFICATION_PENDING: 'VERIFICATION_PENDING',
  CLOSED: 'CLOSED'
};

const ALLOWED_TRANSITIONS = {
  [WORKFLOW_STATES.ASSET_REGISTERED]: [WORKFLOW_STATES.VULNERABILITY_IMPORTED],
  [WORKFLOW_STATES.VULNERABILITY_IMPORTED]: [WORKFLOW_STATES.RISK_ASSESSED],
  [WORKFLOW_STATES.RISK_ASSESSED]: [WORKFLOW_STATES.ASSIGNED],
  [WORKFLOW_STATES.ASSIGNED]: [WORKFLOW_STATES.REMEDIATION_IN_PROGRESS],
  [WORKFLOW_STATES.REMEDIATION_IN_PROGRESS]: [WORKFLOW_STATES.VERIFICATION_PENDING],
  [WORKFLOW_STATES.VERIFICATION_PENDING]: [WORKFLOW_STATES.CLOSED, WORKFLOW_STATES.REMEDIATION_IN_PROGRESS],
  [WORKFLOW_STATES.CLOSED]: [] // Terminal state unless reopened by Security Lead
};

class WorkflowEngine {
  static validateTransition(currentState, targetState) {
    if (!WORKFLOW_STATES[currentState]) {
      return { valid: false, reason: `Invalid current state: ${currentState}` };
    }
    if (!WORKFLOW_STATES[targetState]) {
      return { valid: false, reason: `Invalid target state: ${targetState}` };
    }
    const allowed = ALLOWED_TRANSITIONS[currentState] || [];
    if (!allowed.includes(targetState)) {
      return {
        valid: false,
        reason: `Workflow Integrity Violation: Cannot transition from '${currentState}' directly to '${targetState}'. Required sequence: Asset -> Vulnerability -> Risk Assessment -> Assignment -> Remediation -> Verification -> Closure`
      };
    }
    return { valid: true };
  }
}

module.exports = {
  WORKFLOW_STATES,
  ALLOWED_TRANSITIONS,
  WorkflowEngine
};
