# Stage 2 Deliverable: Threat Modeling, Attack Trees & Agile Planning (Phases 7 – 10)

---

## Phase 7 – Threat Modeling and Security Analysis

### 7.1 Asset Classification & CIA Matrix
At least 8 key assets identified and classified by Security Impact:

| Asset ID | Asset Name | Description | Confidentiality | Integrity | Availability |
|----------|------------|-------------|-----------------|-----------|--------------|
| **AST-01** | Vulnerability Ingestion Data | Raw scanner outputs containing unpatched zero-day flaws | High | High | Medium |
| **AST-02** | CVSS Severity Scores | Criticality ratings assigned to asset vulnerabilities | Medium | Critical | High |
| **AST-03** | User Session JWT Tokens | Cryptographic session tokens carrying role claims | Critical | Critical | High |
| **AST-04** | Tamper-Evident Audit Log | Cryptographically chained HMAC record of platform events | Medium | Critical | High |
| **AST-05** | Registered Asset Inventory | Database of network IPs, server hostnames, and owners | High | High | Medium |
| **AST-06** | Remediation Patch Verification Notes | Verification logs submitted by remediation engineers | Low | High | Medium |
| **AST-07** | HMAC Signing Secret Keys | Secret key used for signing JWTs and HMAC log chains | Critical | Critical | Critical |
| **AST-08** | Executive Compliance Reports | Aggregated SLA compliance metrics and export files | High | High | Low |

---

### 7.2 STRIDE Threat Identification on DFD Components

| Threat ID | DFD Element | Threat Description | STRIDE Category | Impact | Mitigation Strategy |
|-----------|-------------|--------------------|-----------------|--------|---------------------|
| **T-01** | API Gateway | Attacker spoofs JWT payload claims to impersonate `SECURITY_LEAD`. | **S**poofing | High | Cryptographic signature verification using HMAC-SHA256 with strong server-side secret. |
| **T-02** | Vuln Database | Malicious insider directly modifies vulnerability severity from `CRITICAL` to `LOW`. | **T**ampering | Critical | Enforce state machine check & require HMAC audit logging on all severity modifications. |
| **T-03** | Audit Logger | Disgruntled engineer denies making unauthorized state transitions. | **R**epudiation | High | Cryptographically chain log entries with HMAC-SHA256 (`prevHash` linkage). |
| **T-04** | API Endpoint | Unauthenticated attacker intercepts vulnerability scanner findings in transit. | **I**nformation Disclosure | High | Enforce TLS 1.3 encryption on all REST API communication. |
| **T-05** | API Router | Attacker launches high-frequency request flood to crash the platform. | **D**enial of Service | Medium | Implement IP rate limiting (`express-rate-limit`) capped at 300 requests per 15 mins. |
| **T-06** | Asset Controller | Remediation engineer escalates privileges to register new core servers. | **E**levation of Privilege | High | Enforce strict RBAC middleware (`authorizeRoles(ROLES.SECURITY_LEAD)`). |
| **T-07** | Vuln Import API | Attacker crafts oversized malicious JSON payload to consume server memory. | **D**enial of Service | Medium | Express body parser payload size limit capped at 500KB. |
| **T-08** | Client SPA | Cross-Site Scripting (XSS) payload injected via vulnerability title field. | **T**ampering | High | Context-aware HTML escaping and Helmet Content Security Policy headers. |
| **T-09** | Asset Data Store | IDOR attack allowing unauthorized user to access other tenant assets. | **I**nformation Disclosure | High | Object-level authorization checks validating asset ownership before returning data. |
| **T-10** | System Logs | Internal application exceptions leak raw database connection strings. | **I**nformation Disclosure | Medium | Global error handler suppressing internal stack traces in production responses. |

---

### 7.3 Information Flow Analysis for Sensitive Assets

```
+-----------------------------------------------------------------------------------+
|                           INFORMATION FLOW ANALYSIS                               |
+-----------------------------------------------------------------------------------+

[ Sensitive Asset 1: Unpatched Zero-Day Vulnerability Data ]
  Client Browser (HTTPS) ---> API Gateway (JWT Check) ---> Zod Validator ---> Vuln Store (AES-256)
  * Flow Control: TLS 1.3 in transit, strict RBAC filter (`SECURITY_LEAD` only), AES-256 at rest.

[ Sensitive Asset 2: CVSS Severity Score Modifications ]
  Client Form ---> Endpoint Validator ---> Workflow State Machine ---> HMAC Audit Logger
  * Flow Control: Enforce mandatory text justification + state machine verification before storage.

[ Sensitive Asset 3: Admin & User JWT Authentication Tokens ]
  Auth Endpoint ---> Bcrypt Hash Check ---> Sign JWT (HS256) ---> Return HTTP Bearer Header
  * Flow Control: Tokens stored in local memory / HTTP-only headers; 8-hour auto-expiration.
```

---

### 7.4 Vulnerability Analysis Table

| Vuln ID | Affected Element | Related Threat | Root Cause & Business Impact | Technical Mitigation |
|---------|------------------|----------------|------------------------------|----------------------|
| **V-01** | Ingestion Parser | T-07 (DoS) | Missing request body payload bounds allows RAM exhaustion. | Set `express.json({ limit: '500kb' })`. |
| **V-02** | Severity Update API | T-02 (Tampering) | Lack of mandatory field validation allowed silent score downgrades. | Validate request against `SeverityScoreSchema` with Zod. |
| **V-03** | Auth Subsystem | T-01 (Spoofing) | Hardcoded weak JWT secret key allowed signature forging. | Inject JWT key from environment variable `JWT_SECRET`. |
| **V-04** | State Controller | T-06 (PrivEsc) | Direct status mutation skipped verification workflow step. | Enforce `WorkflowEngine.validateTransition()`. |
| **V-05** | Audit Storage | T-03 (Repudiation)| Standard plain-text logs could be deleted by system admins. | Implement HMAC-SHA256 cryptographic hash chaining. |
| **V-06** | Asset Endpoint | T-09 (IDOR) | Unchecked asset ID parameters exposed infrastructure hostnames. | Add explicit ownership checks in `vulnerabilityService`. |

---

## Phase 8 – Attack Tree and Security Architecture Refinement

### 8.1 Attack Tree Diagram
**Root Attacker Goal**: **"Force Unverified Closure of Critical Vulnerability to Obstruct Security Audit"**

```
                                  [ Root Goal: Unverified Closure of Critical Vulnerability ]
                                                                |
                                             +------------------+------------------+
                                             |                                     |
                                        [ OR Branch 1 ]                       [ OR Branch 2 ]
                             Direct Status Mutation Bypass               Compromise Security Lead Account
                                             |                                     |
                       +---------------------+---------------------+         +-----+-----+
                       |                                           |         |           |
                 [ AND Path 1A ]                             [ AND Path 1B ] [ Path 2A ] [ Path 2B ]
             Bypass Workflow Check                     Forge Admin JWT Session Credential Credential
                       |                                           |         Stuffing   Phishing
         +-------------+-------------+                 +-----------+-----------+
         |                           |                 |                       |
   Send Direct API           Manipulate Front        Brute-Force JWT        Steal Secret Key
   PATCH Request             End UI Buttons          Signing Key            from Repo
```

---

### 8.2 Attack Tree Analysis & Countermeasures

| Attack Path | Sub-Goal / Technical Vector | Feasibility | Preventive Control | Detective Control |
|-------------|-----------------------------|-------------|--------------------+-------------------|
| **Path 1A** | Send direct REST PATCH call attempting to jump state `ASSIGNED` → `CLOSED`. | Medium | Enforce `WorkflowEngine.validateTransition()` server-side. Reject with HTTP 400. | Log `WORKFLOW_INTEGRITY_VIOLATION` event to audit trail. |
| **Path 1B** | Brute-force weak JWT secret key to generate fake `SECURITY_LEAD` token. | Low | Use high-entropy 256-bit secret key stored in environment variables. | Rate limit `/api/auth/login` to 5 failed attempts per min. |
| **Path 2A** | Credential stuffing against platform login endpoint. | Medium | Mandatory multi-factor authentication (MFA) simulation token check. | Alert security team on > 10 failed logins within 5 mins. |
| **Path 2B** | Leak JWT secret key in public git repository. | Low | Pre-commit git hooks + `.gitignore` forbidding `.env` commits. | Automated SAST scan (TruffleHog / GitLeaks) in CI pipeline. |

---

### 8.3 Security-Refined System Architecture

```
                       +-------------------------------------------------------+
                       |              SECURITY REFINED ARCHITECTURE            |
                       +-------------------------------------------------------+

                                        [ Client Application ]
                                                  |
                                                  v  (TLS 1.3 + CSP)
                                        [ Security Gateway ]
                                                  |
                         +------------------------+------------------------+
                         |                                                 |
             [ Rate Limiter (300/15m) ]                         [ Helmet Security Headers ]
                         |                                                 |
                         +------------------------+------------------------+
                                                  |
                                                  v
                                      [ JWT AuthN & RBAC Filter ]
                                                  |
                                                  v
                                     [ Zod Input Schema Validator ]
                                                  |
                                                  v
                                     [ Workflow State Machine ]
                                                  |
                         +------------------------+------------------------+
                         |                                                 |
            [ Enforced State Transitions ]                   [ Tamper-Evident Audit Chain ]
                         |                                                 |
                         v                                                 v
           [ Asset & Vuln Data Store ]                      [ HMAC-SHA256 Log Store ]
```

---

## Phase 9 – Product Backlog and Jira / Scrum Setup

### 9.1 Product Backlog (10 User & Evil User Stories)

| Story ID | Epic | User Story (`As a... I want... so that...`) | Priority | Acceptance Criteria |
|----------|------|---------------------------------------------|----------|---------------------|
| **US-01** | Ep-1: Auth | As a Security Lead, I want to authenticate via JWT so that I can access restricted management APIs securely. | Must | 1. Return 200 OK + JWT on valid login.<br>2. Reject invalid credentials with 401. |
| **US-02** | Ep-1: Auth | As a System Admin, I want RBAC permissions enforced so that unauthorized users cannot execute administrative functions. | Must | 1. Return 403 Forbidden when engineer accesses admin routes.<br>2. Pass role claim in JWT. |
| **US-03** | Ep-2: Asset| As a Security Lead, I want to register system assets with IP and criticality so that vulnerabilities can be mapped accurately. | Must | 1. Validate IP address v4 format.<br>2. Auto-generate asset ID `AST-xxx`. |
| **US-04** | Ep-3: Vuln | As a Security Lead, I want to import scanner findings so that zero-day vulnerabilities can be cataloged. | Must | 1. Validate CVE regex `CVE-YYYY-NNNN`.<br>2. Calculate baseline CVSS severity. |
| **US-05** | Ep-3: Vuln | As a Security Lead, I want to adjust vulnerability severity with justification so that contextual risk is reflected accurately. | High | 1. Require non-empty justification text.<br>2. Log change to audit trail. |
| **US-06** | Ep-4: Work | As a Remediation Engineer, I want to submit fix notes so that the vulnerability can be queued for verification. | Must | 1. Permit transition `REMEDIATION_IN_PROGRESS` → `VERIFICATION_PENDING`. |
| **US-07** | Ep-4: Work | As an Attacker (Evil Story), I want to jump status directly to CLOSED so that I can hide unpatched vulnerabilities. | High | 1. State machine rejects invalid jumps with 400.<br>2. Trigger audit alert. |
| **US-08** | Ep-5: Audit| As a Compliance Auditor, I want to inspect tamper-evident audit logs so that I can verify regulatory compliance. | Must | 1. Compute HMAC SHA-256 chain.<br>2. Render visual badge "HMAC Chain Intact". |
| **US-09** | Ep-6: Sec  | As a Security Engineer, I want rate limiting applied so that brute-force attacks are thwarted. | Medium | 1. Block client IP after exceeding 300 requests in 15 mins. |
| **US-10** | Ep-6: Sec  | As a DevOps Engineer, I want containerized execution under non-root users so that container breakout risks are mitigated. | High | 1. Container runs as `USER node`.<br>2. Zero root capabilities. |

---

### 9.2 Sprint Breakdown (2 Sprints)

#### **Sprint 1 Goal**: Core Asset Management, Scanner Ingestion & RBAC Infrastructure
- **Included Stories**: US-01, US-02, US-03, US-04, US-05
- **Sprint Commitment**: 24 Story Points

#### **Sprint 2 Goal**: Enforced State Machine, Tamper-Evident Audit Logging & Security Hardening
- **Included Stories**: US-06, US-07, US-08, US-09, US-10
- **Sprint Commitment**: 26 Story Points

---

## Phase 10 – Sprint Execution and Scrum Metrics

### 10.1 Sprint Board State Workflow
`TO DO` → `IN PROGRESS` → `TESTING` → `DONE`

```
+-----------------------------------------------------------------------------------+
|                                SPRINT BOARD STATUS                                |
+------------------+------------------+------------------+--------------------------+
|      TO DO       |   IN PROGRESS    |     TESTING      |           DONE           |
+------------------+------------------+------------------+--------------------------+
|                  |                  |                  | US-01: JWT Auth          |
|                  |                  |                  | US-02: RBAC Middleware   |
|                  |                  |                  | US-03: Asset Register    |
|                  |                  |                  | US-04: Vuln Ingestion    |
|                  |                  |                  | US-05: Severity Adjust   |
|                  |                  |                  | US-06: Fix Submission    |
|                  |                  |                  | US-07: State Machine Check|
|                  |                  |                  | US-08: HMAC Audit Chain  |
|                  |                  |                  | US-09: Rate Limiting     |
|                  |                  |                  | US-10: Non-Root Docker   |
+------------------+------------------+------------------+--------------------------+
```

---

### 10.2 Daily Scrum Standup Entries (Sample Logs)

#### Standup 1 (Sprint 1, Day 3):
- **Progress**: Completed JWT generation and bcrypt authentication controller.
- **Plan**: Build RBAC authorization middleware and Zod schema validator for asset registration.
- **Blockers**: None.

#### Standup 2 (Sprint 2, Day 2):
- **Progress**: Completed `WorkflowEngine` state transition validator.
- **Plan**: Implement HMAC-SHA256 log chaining in `auditLogger.js`.
- **Blockers**: Minor hash mismatch during array iteration; fixed by sorting JSON payload keys.

#### Standup 3 (Sprint 2, Day 8):
- **Progress**: Integrated rate-limiting middleware and Helmet security headers.
- **Plan**: Run automated fuzzing scripts and prepare container security context.
- **Blockers**: None.

---

### 10.3 Sprint Burndown Data & Metrics

#### Sprint 1 Burndown:
| Sprint Day | Ideal Burndown (Points) | Actual Remaining (Points) | Status |
|------------|-------------------------|---------------------------|--------|
| Day 1 | 24 | 24 | Sprint Start |
| Day 3 | 19 | 20 | In Progress |
| Day 5 | 14 | 12 | Ahead of schedule |
| Day 8 | 7 | 5 | Testing completed |
| Day 10 | 0 | 0 | **Sprint 1 Complete** |

#### Sprint 2 Burndown:
| Sprint Day | Ideal Burndown (Points) | Actual Remaining (Points) | Status |
|------------|-------------------------|---------------------------|--------|
| Day 1 | 26 | 26 | Sprint Start |
| Day 3 | 21 | 21 | In Progress |
| Day 5 | 15 | 14 | Ahead of schedule |
| Day 8 | 8 | 6 | Security Testing |
| Day 10 | 0 | 0 | **Sprint 2 Complete** |

---

### 10.4 Sprint Velocity & Defect Summary
- **Sprint 1 Velocity Delivered**: 24 Story Points
- **Sprint 2 Velocity Delivered**: 26 Story Points
- **Total Project Velocity**: 50 Story Points
- **Defects Found During Sprint**: 2 minor (Zod error format, timing inconsistency)
- **Defects Resolved**: 2
- **Defects Carried Over to Next Release**: 0

---

### 10.5 Sprint Review & Retrospective Action Items
1. **Action Item 1 (Process)**: Retain Security Definition of Done (DoD) requirement for mandatory unit tests before moving cards to `TESTING`.
2. **Action Item 2 (Technical)**: Expand automated fuzzing scripts in CI pipeline to test custom header boundary conditions.
