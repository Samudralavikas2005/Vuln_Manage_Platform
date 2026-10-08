# Stage 4 Deliverable: Testing, Monitoring & Final Security Review (Phases 14 – 16)

---

## Phase 14 – CI/CD and Security Testing

### 14.1 Automated CI/CD Pipeline Configuration
The repository includes a declarative GitHub Actions workflow ([`.github/workflows/ci-cd.yml`](file:///home/vikas/SSE_END_LAB/.github/workflows/ci-cd.yml)) covering:
1. **Checkout & Setup**: Node.js 20 runtime environment initialization.
2. **SAST Security Scan**: `npm audit --audit-level=high` checking zero vulnerable dependencies.
3. **Automated Unit Tests**: Execution of `tests/unit.test.js`.
4. **Integration Tests**: Execution of `tests/integration.test.js` against active server.
5. **Input Fuzzing**: Execution of `tests/fuzz.js` testing input payload resilience.
6. **Container Packaging**: Multi-stage Docker build packaging application image.

---

### 14.2 Execution Evidence & Results

#### 1. Unit Test Results (`npm test`):
```
✔ Unit Test 1: JWT Token Generation & Verification (3.9ms)
✔ Unit Test 2: Workflow State Machine Allowed Transitions (0.2ms)
✔ Unit Test 3: Tamper-Evident HMAC Audit Logger Chain (0.5ms)
Summary: 3 Passed, 0 Failed (100% Pass Rate)
```

#### 2. API Integration Test Results (`npm run test:integration`):
```
✔ Integration Test 1: Unauthenticated Endpoint Rejection (19.2ms)
✔ Integration Test 2: Successful Authentication Flow (4.3ms)
✔ Integration Test 3: RBAC Authorization Enforcement (6.6ms)
Summary: 3 Passed, 0 Failed (100% Pass Rate)
```

#### 3. Fuzzing Test Results (`npm run fuzz`):
```
Total Fuzz Mutated Payloads Sent: 8
Clean 4xx Error Handling Responses: 8
Unhandled Server Exception (500) Crashes: 0
Resilience Score: 100.0%
Result: Zero unhandled application crashes observed under fuzzing attacks.
```

---

### 14.3 Defect Tracking Report

| Defect ID | Severity | Affected Module | Root Cause Description | Fix & Refactoring Applied | Retest Result |
|-----------|----------|-----------------|------------------------|---------------------------|---------------|
| **DEF-001**| High | `vulnerabilityService.js` | Severity override permitted empty string justification, violating audit traceability. | Added `.min(5, "Modification justification required")` check to Zod schema. | **PASSED** (Rejected empty string with HTTP 400). |
| **DEF-002**| Medium | `server.js` | Direct PATCH request allowed Remediation Engineers to attempt state transition to `CLOSED`. | Enforced role check restricting Engineers to `VERIFICATION_PENDING`. | **PASSED** (Returned HTTP 403 RBAC Violation). |

---

## Phase 15 – Logging, Monitoring, Hardening and Secure Deployment

### 15.1 Five Security-Relevant Log Events
1. `AUTH_FAILED`: Failed login attempts (tracks username, IP address, failure reason).
2. `SEVERITY_MODIFIED`: Adjustments to vulnerability CVSS scores (tracks previous severity, new severity, actor, justification).
3. `WORKFLOW_TRANSITION`: State transitions across the vulnerability lifecycle (tracks `fromState`, `toState`, remediation notes).
4. `RBAC_VIOLATION`: Unauthorized attempt by user to access restricted endpoint.
5. `CHAIN_TAMPER_DETECTED`: Failure of HMAC hash verification link during audit log inspection.

---

### 15.2 Logging & Monitoring Strategy (Metrics & Alerts)

| Metric / Alert Name | Target Threshold | Alerting Trigger Condition | Operational Action |
|---------------------|------------------|----------------------------|--------------------|
| **High Failed Auth Rate** | > 5 failures / min | 5 `AUTH_FAILED` events from single IP in 60s | Temporarily block IP address & notify SecOps. |
| **Unauthorized Severity Modification** | Any un-justified change | `SEVERITY_MODIFIED` missing justification string | Rollback severity & trigger security review. |
| **HTTP 500 Error Spike** | > 2 errors / min | Sudden increase in unhandled internal errors | Trigger immediate PagerDuty dev alert. |
| **RBAC Escalation Attempt** | > 3 violations / min | Multiple 403 Forbidden responses | Suspend user token & require password reset. |
| **Pod Container Restarts** | > 3 restarts in 10 mins | K8s liveness probe failure | Inspect container crash logs via `kubectl logs`. |

---

### 15.3 Target Environment Hardening Checklist

- [x] **Network Access**: Restrict API ingress to TLS 1.3 ports (443/3000); enforce zero-trust NetworkPolicy.
- [x] **Least Privilege**: Application container executes as unprivileged non-root user `nodejs` (UID 1001).
- [x] **Secret Isolation**: Zero secrets stored in git; loaded dynamically from environment / K8s Secrets.
- [x] **Security Headers**: Enabled Helmet middleware (HSTS, X-Frame-Options, X-Content-Type-Options).
- [x] **Rate Limiting**: Enforced API rate limiter capping requests at 300 / 15 minutes.
- [x] **System Updates**: Multi-stage Docker build pins minimal base OS `node:20-alpine`.

---

### 15.4 Physical and Operational Controls
- **Physical Controls**: Data center access restricted via biometric multi-factor access control; encrypted server disk drives (AES-256).
- **Operational Controls**: Enforced dual-control approval for production deployments; quarterly penetration testing; immutable log shipping to off-site SIEM repository.

---

## Phase 16 – Final Security Review

### 16.1 End-to-End Security Traceability Matrix

Traced Requirement: **FR-04 / SR-03 (Enforced Workflow Integrity & Tamper-Evident Audit Trail)**

```
+---------------------------------------------------------------------------------------------------------+
|                                END-TO-END SECURITY TRACEABILITY MATRIX                                 |
+--------------------------+------------------------------------------------------------------------------+
| 1. Requirement           | FR-04 (Workflow State Tracking) & SR-03 (Tamper-Evident HMAC Audit Log)       |
| 2. Use Case              | UC-02: Remediate & Verify Vulnerability Fix                                  |
| 3. DFD Boundary          | Process 4.0 (State Engine) across Trust Boundary 3 -> Data Store D2          |
| 4. STRIDE Threat         | T-02 (Tampering with severity/status) & T-03 (Repudiation of state changes)   |
| 5. Vulnerability         | V-04 (State controller privilege bypass / skipping verification step)        |
| 6. Attack Tree Goal      | Root Goal: "Force Unverified Closure of Critical Vulnerability"              |
| 7. User Story            | US-06 (Remediation submission) & US-07 (Evil Story: Status jump prevention)   |
| 8. Sprint Task           | Sprint 2 Task: Implement `WorkflowEngine` state validator & HMAC logger      |
| 9. Source Code           | `src/workflow.js` (`WorkflowEngine`) & `src/auditLogger.js` (`AuditLogger`)  |
| 10. Automated Tests      | `tests/unit.test.js` (Unit Test 2 & 3) & `tests/integration.test.js` (Test 3)|
| 11. Container Control    | `Dockerfile` (`USER nodejs`) & `k8s/deployment.yaml` (`runAsNonRoot: true`)  |
| 12. Deployment Control   | `k8s/security-context.yaml` (NetworkPolicy) & K8s Secret injection           |
+--------------------------+------------------------------------------------------------------------------+
```

---

### 16.2 Top Three Highest-Risk Issues & Applied Security Controls

1. **Risk 1: Unauthorized Severity Downgrade of Critical Vulnerabilities (Tampering)**
   - **Control Applied**: Cryptographic HMAC audit logging on all severity changes combined with mandatory textual justification validation via Zod.
2. **Risk 2: Skipping Remediation Verification Steps (Workflow Violation)**
   - **Control Applied**: Server-side enforced State Machine (`WorkflowEngine`) that strictly enforces sequential transitions (`Asset` → `Vulnerability` → `Risk Assessment` → `Assignment` → `Remediation` → `Verification` → `Closure`).
3. **Risk 3: Secret Leakage & Container Breakout (Elevation of Privilege)**
   - **Control Applied**: Environment variable secret injection, `.dockerignore` filters, multi-stage Alpine build, and non-root execution (`USER nodejs`, UID 1001).

---

### 16.3 Residual Limitations & Future Security Enhancements
1. **Limitation 1**: The initial prototype utilizes an in-memory database store (seeded with sample data).
   - *Future Roadmap*: Migrate data storage to PostgreSQL with transparent data encryption (TDE) and row-level security (RLS).
2. **Limitation 2**: MFA verification code is currently simulated on client login.
   - *Future Roadmap*: Integrate WebAuthn / FIDO2 hardware token support and TOTP authentication apps.
