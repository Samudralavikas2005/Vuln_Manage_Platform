# Stage 1 Deliverable: System Design & Architecture (Phases 1 – 6)

---

## Phase 1 – Agile Process and Development Approach

### 1.1 Selected Agile Approach & Justification
**Selected Framework**: **Scrum with Extreme Programming (XP) Practices**

#### Justification:
The **Vulnerability Management Platform** handles high-severity security data (e.g., zero-day vulnerabilities, active unpatched asset exposures, system credentials). Traditional Scrum provides fixed 2-week Sprint iterations, daily alignment, and structured backlog management. Integrating XP practices strengthens security engineering:
- **Test-Driven Development (TDD)**: Ensures security constraints (e.g., workflow state rules, authorization checks) are written as failing unit tests before implementation.
- **Pair Programming**: Promotes security code reviews in real-time, reducing single-developer blind spots and authorization bypass bugs.
- **Continuous Integration (CI)**: Executes SAST and fuzzing checks on every commit, preventing security regression.
- **Refactoring**: Continuously cleans security debt and refactors fragile logic into clean design patterns.

---

### 1.2 Agile Manifesto Principles Mapping
| # | Agile Manifesto Principle | Application to SSDLC Vulnerability Platform |
|---|---------------------------|---------------------------------------------|
| 1 | *Our highest priority is to satisfy the customer through early and continuous delivery of valuable software.* | Delivering working security workflow iterations early allows security teams to remediate critical vulnerabilities faster rather than waiting for monolithic releases. |
| 2 | *Welcome changing requirements, even late in development.* | Rapidly adapts the platform to ingest new CVE scanner formats, CVSS v4 updates, and emerging compliance standards. |
| 3 | *Deliver working software frequently, from a couple of weeks to a couple of months.* | 2-week Sprint releases deliver incremental features (Asset registration → Scanner import → Remediate → Verify) with security automated test suites. |
| 4 | *Business people and developers must work together daily throughout the project.* | Security analysts, remediation engineers, and developers align daily during Scrum standups to prioritize urgent high-risk vulnerabilities. |
| 5 | *Continuous attention to technical excellence and good design enhances agility.* | Applying clean security patterns (RBAC middleware, State pattern, tamper-evident audit chaining) ensures the code remains extensible and resilient. |

---

### 1.3 Refactoring Opportunities (Before & After)

#### Refactoring Opportunity 1: Direct Status Mutation vs. Enforced State Machine Pattern
- **Problem**: In initial code, vulnerability status could be overwritten directly by any user (e.g., setting a critical vulnerability directly to `CLOSED` without verification).
- **Refactoring**: Implemented an immutable `WorkflowEngine` that validates target state transitions against allowed paths.

##### Before Refactoring (Insecure Direct Mutation):
```javascript
// BAD: Unchecked direct status update allows skipping verification steps
app.patch('/api/vulnerabilities/:id/status', (req, res) => {
  const vuln = vulnerabilities.get(req.params.id);
  vuln.status = req.body.status; // No state machine check, no RBAC check!
  res.json(vuln);
});
```

##### After Refactoring (Enforced State Machine Pattern):
```javascript
// GOOD: State machine validates allowed transition paths
class WorkflowEngine {
  static validateTransition(currentState, targetState) {
    const allowed = ALLOWED_TRANSITIONS[currentState] || [];
    if (!allowed.includes(targetState)) {
      return {
        valid: false,
        reason: `Workflow Integrity Violation: Cannot transition from '${currentState}' directly to '${targetState}'.`
      };
    }
    return { valid: true };
  }
}
```

---

#### Refactoring Opportunity 2: Hardcoded Secrets & Raw Query vs. JWT RBAC & Zod Schema Validation
- **Problem**: Raw SQL or unvalidated input could lead to SQL Injection or unauthorized data tampering.
- **Refactoring**: Replaced with Zod validation schemas and JWT RBAC authorization middleware.

##### Before Refactoring (Raw Unvalidated Input):
```javascript
// BAD: Direct consumption of body parameters without schema validation
app.post('/api/assets', (req, res) => {
  const { name, ipAddress } = req.body;
  db.query(`INSERT INTO assets VALUES ('${name}', '${ipAddress}')`); // Vulnerable to SQLi!
});
```

##### After Refactoring (Zod Schema Validation & Parameterization):
```javascript
// GOOD: Strong type and format enforcement via Zod schema
const AssetSchema = z.object({
  name: z.string().min(2).max(100),
  ipAddress: z.string().ip({ version: "v4" }),
  type: z.enum(["SERVER", "DATABASE", "WEB_APP", "CONTAINER", "NETWORK_DEVICE"]),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
});

app.post('/api/assets', authenticateToken, authorizeRoles(ROLES.SECURITY_LEAD), (req, res) => {
  const validated = AssetSchema.parse(req.body);
  const asset = vulnerabilityService.registerAsset(validated, req.user);
  res.status(201).json(asset);
});
```

---

### 1.4 Agile Risks for Security-Critical Systems & Mitigations
| # | Agile Risk | Impact on System | Security Mitigation Strategy |
|---|------------|------------------|------------------------------|
| 1 | **Security Debt in Fast Sprints** | Developers prioritize rapid feature delivery over security controls, leading to unverified code. | **Security Definition of Done (DoD)**: Every story must pass automated SAST, 100% unit tests, zero critical vulnerabilities, and peer code review before marking DONE. |
| 2 | **Neglecting Abuse Cases in User Stories** | Standard user stories only focus on positive functional paths ("As a user I want to update severity..."). | **Evil User Stories & Abuse Cases**: Explicitly write threat actor stories ("As an attacker, I want to bypass severity checks...") into the Product Backlog. |

---

## Phase 2 – Requirements Engineering

### 2.1 Stakeholders and User Types
1. **System Administrator (`SYSTEM_ADMIN`)**: Manages system users, authentication settings, system configurations, and high-level platform integrations.
2. **Security Analyst / Lead (`SECURITY_LEAD`)**: Registers assets, imports scanner vulnerability findings, performs CVSS risk assessment, updates severity scores with justification, and approves final verification/closure.
3. **Remediation Engineer (`REMEDIATION_ENGINEER`)**: Views assigned asset vulnerabilities, implements technical patches, and updates workflow status to `VERIFICATION_PENDING`.
4. **Security Auditor (`SECURITY_AUDITOR`)**: Compliance reviewer with read-only access to assets, vulnerabilities, and cryptographically chained audit trails.

---

### 2.2 System Requirements Specifications (SRS Table)

| Req ID | Requirement Description | Category | Priority | CIA Mapping | AuthN / AuthZ / Audit |
|--------|-------------------------|----------|----------|-------------|-----------------------|
| **FR-01** | System shall allow Security Leads to register system assets with IP, type, owner, and criticality. | Functional | Must Have | Integrity | AuthN (JWT), AuthZ (`SECURITY_LEAD`), Audit Log |
| **FR-02** | System shall import CVE vulnerability findings from automated scanner outputs or manual entries. | Functional | Must Have | Confidentiality | AuthN (JWT), AuthZ (`SECURITY_LEAD`), Audit Log |
| **FR-03** | System shall calculate baseline severity from CVSS scores and permit manual override with mandatory justification. | Functional | Must Have | Integrity | AuthN (JWT), AuthZ (`SECURITY_LEAD`), Audit Log |
| **FR-04** | System shall track vulnerability remediation workflow through enforced sequential state machine transitions. | Functional | Must Have | Integrity | AuthN (JWT), AuthZ (Role-Dependent), Audit Log |
| **FR-05** | System shall generate compliance and executive vulnerability summary reports. | Functional | Should Have | Availability | AuthN (JWT), AuthZ (All Roles) |
| **NFR-01**| Platform shall respond to API requests within 200ms under 500 concurrent security users. | Non-Functional | Must Have | Availability | Performance Tuning |
| **NFR-02**| System shall achieve 99.9% operational uptime with zero unhandled system crashes. | Non-Functional | Must Have | Availability | Fault Tolerance |
| **SR-01** | All API endpoints must enforce Role-Based Access Control (RBAC) via cryptographically signed JWT tokens. | Security | Must Have | Confidentiality / Integrity | AuthN (JWT), AuthZ (Least Privilege) |
| **SR-02** | Vulnerability findings must be encrypted in transit (TLS 1.3) and at rest (AES-256). | Security | Must Have | Confidentiality | Encryption |
| **SR-03** | All state changes and severity alterations must be logged to an immutable, cryptographically chained HMAC audit log. | Security | Must Have | Integrity / Non-Repudiation | Tamper-Evident Audit Trail |

---

## Phase 3 – Requirements Analysis and UML

### 3.1 UML Use Case Diagram

```
+-----------------------------------------------------------------------------------+
|                        Vulnerability Management Platform                          |
|                                                                                   |
|  +------------------------+            +---------------------------------------+  |
|  |   System Admin         |            |             Security Lead             |  |
|  +------------------------+            +---------------------------------------+  |
|              |                                     |           |                  |
|              v                                     v           v                  |
|     ( Manage System )                    ( Register Asset )  ( Import Findings )  |
|            Users                                                   |              |
|                                                                    | <<include>>  |
|                                                                    v              |
|                                                           ( Calculate CVSS )      |
|                                                                    |              |
|                                                                    | <<extend>>   |
|                                                                    v              |
|                                                           ( Override Severity )   |
|                                                                    |              |
|  +------------------------+                                        v              |
|  |  Remediation Engineer  |                            ( Assign to Remediation )  |
|  +------------------------+                                        |              |
|              |                                                     |              |
|              v                                                     v              |
|     ( Remediate Fix ) -------------> <<include>> ------------> ( Update Workflow ) |
|                                                                    ^              |
|  +------------------------+                                        |              |
|  |    Security Auditor    |                                        |              |
|  +------------------------+                                        |              |
|              |                                                     |              |
|              v                                                     v              |
|     ( Inspect Audit Log ) ---------> <<include>> ---------> ( Verify Fix & Close )|
+-----------------------------------------------------------------------------------+
```

---

### 3.2 Critical Use Case Specifications

#### Use Case Specification 1: `UC-01: Import Vulnerability Finding & Assign Severity`
- **Primary Actor**: Security Analyst / Lead (`SECURITY_LEAD`)
- **Preconditions**: Actor is authenticated via valid JWT and possesses `SECURITY_LEAD` role. Target Asset exists.
- **Main Success Flow**:
  1. Actor submits asset ID, CVE ID, title, CVSS score (0.0-10.0), and scanner source.
  2. System validates input format via Zod schema.
  3. System calculates baseline severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
  4. System initializes vulnerability state to `VULNERABILITY_IMPORTED`.
  5. System generates tamper-evident audit record with HMAC hash.
  6. System displays success response with generated Vulnerability ID.
- **Alternative Flow**: Actor overrides auto-calculated severity by providing mandatory textual justification.
- **Exception Flow**: Invalid CVE format or non-existent Asset ID returns HTTP 400 Bad Request with error details.
- **Postconditions**: Vulnerability is recorded in state store; audit log is updated with chained HMAC.

---

#### Use Case Specification 2: `UC-02: Remediate & Verify Vulnerability Fix`
- **Primary Actor**: Remediation Engineer & Security Lead
- **Preconditions**: Vulnerability is in state `ASSIGNED` or `REMEDIATION_IN_PROGRESS`.
- **Main Success Flow**:
  1. Remediation Engineer applies technical patch and updates status to `VERIFICATION_PENDING` with remediation notes.
  2. System validates state machine transition constraint (`REMEDIATION_IN_PROGRESS` → `VERIFICATION_PENDING`).
  3. Security Lead reviews fix notes and re-tests target asset.
  4. Security Lead approves fix, transitioning status to `CLOSED`.
  5. System updates state history and logs `WORKFLOW_TRANSITION` event to HMAC audit log.
- **Alternative Flow**: Security Lead rejects verification, returning status to `REMEDIATION_IN_PROGRESS` with rejection notes.
- **Exception Flow**: Remediation Engineer attempts to directly set status to `CLOSED`. System blocks transition with HTTP 403 RBAC Violation.
- **Postconditions**: Vulnerability fix is verified and permanently closed.

---

### 3.3 Scenario-Based Analysis Model (`Import & Process Findings`)

| Sequence Step | Actor / System Element | Message / Action | Validation / Security Control |
|---------------|------------------------|------------------|-------------------------------|
| 1 | Security Lead | Submit `POST /api/vulnerabilities/import` | TLS 1.3 Transport Encryption |
| 2 | API Gateway | Intercept request & verify Bearer token | JWT Signature & Expiration Check |
| 3 | RBAC Middleware | Evaluate `req.user.role` | Enforce `SECURITY_LEAD` permission |
| 4 | Input Validator | Parse request body against Zod Schema | Reject invalid CVE / CVSS numbers |
| 5 | Workflow Engine | Check asset existence & initialize state | Enforce state = `VULNERABILITY_IMPORTED` |
| 6 | Audit Logger | Compute HMAC-SHA256 chained hash | Append entry to immutable log chain |
| 7 | Application Store | Save vulnerability record | Commit transaction to database |
| 8 | Client Browser | Render success toast & refresh table | Update UI state without reload |

---

## Phase 4 – Data and Information Flow Modeling

### 4.1 Entity-Relationship Diagram (ERD)

```
 +------------------+          1:N         +----------------------+
 |      USER        |--------------------->|      AUDIT_LOG       |
 +------------------+                      +----------------------+
 | PK | user_id     |                      | PK | log_id          |
 |    | username    |                      | FK | actor_username  |
 |    | password_hash|                     |    | action           |
 | FK | role_id     |                      |    | target_resource  |
 +------------------+                      |    | details_json     |
          | 1:N                            |    | hmac_hash        |
          v                                |    | prev_hash        |
 +------------------+                      +----------------------+
 |      ASSET       |                                 ^
 +------------------+                                 | 1:N
 | PK | asset_id    |                                 |
 |    | name        |          1:N         +----------------------+
 |    | ip_address  |<---------------------|    VULNERABILITY     |
 |    | type        |                      +----------------------+
 |    | criticality |                      | PK | vuln_id         |
 +------------------+                      | FK | asset_id        |
                                           |    | cve_id          |
                                           |    | title           |
                                           |    | cvss_score      |
                                           |    | severity        |
                                           |    | assigned_team   |
                                           |    | status (Enum)   |
                                           +----------------------+
```

---

### 4.2 Data Flow Diagrams (DFD Level-0 & Level-1) with Trust Boundaries

#### DFD Level-0 (Context Diagram):
```
                       +-----------------------------------+
                       |    Vulnerability Platform         |
 [ Scanner / Analyst ]--->|  1.0 Authenticate & Ingest Findings|---> [ Audit Store ]
                       |  2.0 State Machine & Remediation  |
 [ Compliance Auditor ]<--|  3.0 Compliance & Audit Reports  |<--- [ Database ]
                       +-----------------------------------+
```

#### DFD Level-1 Diagram with 4 Trust Boundaries:
```
========= TRUST BOUNDARY 1: PUBLIC / UNTRUSTED CLIENT BROWSER =========
   [ Security Analyst ]        [ Remediation Engineer ]       [ Auditor ]
            |                             |                        |
------------|-----------------------------|------------------------|------------
========= TRUST BOUNDARY 2: API GATEWAY / TLS TERMINATION =============
            v                             v                        v
   +-------------------------------------------------------------------+
   | Process 1.0: Express API Router & Helmet Security Headers         |
   +-------------------------------------------------------------------+
                                   |
                                   v
   +-------------------------------------------------------------------+
   | Process 2.0: JWT AuthN & RBAC Authorization Middleware            |
   +-------------------------------------------------------------------+
                                   |
------------|----------------------|-----------------------------------|------------
========= TRUST BOUNDARY 3: APPLICATION LOGIC ENGINE ==================
            v                      v                                   v
   +--------------------+ +------------------------+        +--------------------+
   | Process 3.0: Asset | | Process 4.0: Workflow  |        | Process 5.0: Audit |
   | & Vuln Management  | | Enforced State Engine |        | Logger & HMAC Chain|
   +--------------------+ +------------------------+        +--------------------+
             |                       |                                 |
------------|-----------------------|---------------------------------|------------
========= TRUST BOUNDARY 4: SECURE DATA STORAGE =======================
             v                       v                                 v
   +-------------------------------------------------------------------+
   | Data Store D1: Assets & Vulnerabilities Database                  |
   | Data Store D2: Tamper-Evident HMAC Audit Log Chain                |
   +-------------------------------------------------------------------+
```

---

### 4.3 Consistency Mapping Across Use Case, ER, and DFD Models
| Use Case Symbol | ER Entity | DFD Process / Data Store | Integrity Status |
|-----------------|-----------|--------------------------|------------------|
| `UC-01: Import Vuln` | `VULNERABILITY`, `ASSET` | Process 3.0 -> Data Store D1 | Verified Consistent |
| `UC-02: Remediate & Verify` | `VULNERABILITY`, `USER` | Process 4.0 -> Data Store D1 | Verified Consistent |
| `UC-03: View Audit Trail` | `AUDIT_LOG`, `USER` | Process 5.0 -> Data Store D2 | Verified Consistent |

---

## Phase 5 – Software Architecture and Design Engineering

### 5.1 Architecture Style & Tiered Structure
**Selected Pattern**: **Layered Clean Architecture with REST API Separation**

```
+-----------------------------------------------------------------------------+
| Presentation Layer: Single-Page Web App (HTML5 / Vanilla CSS Glassmorphism) |
+-----------------------------------------------------------------------------+
                                       | HTTPS / JSON REST APIs
+-----------------------------------------------------------------------------+
| Security Gateway Layer: Helmet Headers, Rate Limiting, CORS Controls        |
+-----------------------------------------------------------------------------+
                                       |
+-----------------------------------------------------------------------------+
| Authentication & AuthZ Layer: JWT Middleware & RBAC Permission Validator   |
+-----------------------------------------------------------------------------+
                                       |
+-----------------------------------------------------------------------------+
| Core Business Domain: Asset Manager, State Machine Engine, CVSS Calculator   |
+-----------------------------------------------------------------------------+
                                       |
+-----------------------------------------------------------------------------+
| Security Audit Layer: Cryptographic HMAC Chained Logger                     |
+-----------------------------------------------------------------------------+
```

---

### 5.2 Applicable Design Patterns
1. **State Design Pattern**: Enforces rigid workflow state transitions (`Asset` → `Vulnerability` → `Risk Assessment` → `Assignment` → `Remediation` → `Verification` → `Closure`), preventing illegal transition skips.
2. **RBAC Middleware / Decorator Pattern**: Wraps REST endpoints with explicit role-checking functions (`authorizeRoles(ROLES.SECURITY_LEAD)`).
3. **Observer Pattern**: Triggers tamper-evident HMAC audit logger calls whenever asset or vulnerability states are modified.
4. **Strategy Pattern**: Provides flexible scanner import parsers for different scanner outputs (e.g., OpenVAS, Nessus, Qualys).

---

## Phase 6 – User Interface Design

### 6.1 Screen Wireframes & Rationale

#### Screen 1: Authenticated Login Screen (with MFA simulation)
- **User**: All Roles
- **Goal**: Secure session authentication with role selection and MFA token validation.
- **Security Considerations**: Rate-limiting on login attempts, generic error messages on failure, HTTPS transmission.

#### Screen 2: Asset & Vulnerability Dashboard (Engineer / Student View)
- **User**: Remediation Engineer, Security Lead, Auditor
- **Goal**: Overview of registered assets, active vulnerability counts, and pending verifications.
- **Security Considerations**: Masked credentials, RBAC-conditioned action buttons.

#### Screen 3: Security Lead Vulnerability Management Screen
- **User**: `SECURITY_LEAD`, `SYSTEM_ADMIN`
- **Goal**: Asset registration, scanner vulnerability finding import, severity override.
- **Security Considerations**: Strict input field sanitization, client + server side validation.

#### Screen 4: Results & Audit Trail Verification Screen
- **User**: `SECURITY_AUDITOR`, `SECURITY_LEAD`, `SYSTEM_ADMIN`
- **Goal**: Real-time inspection of tamper-evident HMAC audit log chain.
- **Security Considerations**: Read-only display, cryptographic verification status badge (`HMAC Chain Intact`).

---

### 6.2 Application of Shneiderman's 8 Golden Rules
1. **Strive for Consistency**: Uniform color palette (dark glassmorphism theme, standard severity badges).
2. **Enable Frequent Users to Use Shortcuts**: One-click state transition buttons for engineers and leads.
3. **Offer Informative Feedback**: Instant visual toast notifications on registration, import, or workflow transitions.
4. **Design Dialogs to Yield Closure**: Confirmation dialogs for critical state changes (e.g., verifying fix and closing vulnerability).
5. **Prevent Errors**: Form fields use constrained select dropdowns (Asset Type, Criticality, Roles) and strict input pattern regexes.
6. **Permit Easy Reversal of Actions**: Clear state history log allowing leads to request re-work if verification fails.
7. **Support Internal Locus of Control**: Clear tab navigation permitting users to navigate between views seamlessly.
8. **Reduce Short-Term Memory Load**: Dashboard displays real-time metrics cards for active assets, critical findings, and audit status.
