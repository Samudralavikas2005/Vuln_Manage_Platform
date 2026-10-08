# Vulnerability Management Platform - Diagram Codes for Draw.io

This single file contains the complete code for all **6 required system diagrams** in both **Mermaid** and **PlantUML** formats.

## How to render these in Draw.io (https://app.diagrams.net):
1. Open **[draw.io](https://app.diagrams.net)**.
2. In the menu, go to: **`Arrange`** $\rightarrow$ **`Insert`** $\rightarrow$ **`Advanced`** $\rightarrow$ **`Mermaid`** (or **`PlantUML`**).
3. Copy any code block below and paste it into the draw.io text window.
4. Click **`Insert`** — draw.io will instantly generate the visual diagram image!

---

## 1. Entity-Relationship Diagram (ERD)

### Mermaid Code
```mermaid
erDiagram
    USER ||--o{ AUDIT_LOG : generates
    USER ||--o{ ASSET : owns
    ASSET ||--o{ VULNERABILITY : contains
    USER ||--o{ VULNERABILITY : assigned_to

    USER {
        string user_id PK
        string username
        string password_hash
        string role_id FK
    }
    ASSET {
        string asset_id PK
        string name
        string ip_address
        string type
        string criticality
    }
    VULNERABILITY {
        string vuln_id PK
        string asset_id FK
        string cve_id
        string title
        float cvss_score
        string severity
        string status
        string assigned_to FK
    }
    AUDIT_LOG {
        string log_id PK
        string actor_username FK
        string action
        string target_resource
        string details_json
        string hmac_hash
        string prev_hash
    }
```

### PlantUML Code
```plantuml
@startuml
entity "USER" as user {
  * user_id : VARCHAR(36) [PK]
  --
  username : VARCHAR(50)
  password_hash : VARCHAR(255)
  role_id : VARCHAR(20) [FK]
}

entity "ASSET" as asset {
  * asset_id : VARCHAR(36) [PK]
  --
  name : VARCHAR(100)
  ip_address : VARCHAR(45)
  type : ENUM
  criticality : ENUM
  owner_id : VARCHAR(36) [FK]
}

entity "VULNERABILITY" as vuln {
  * vuln_id : VARCHAR(36) [PK]
  --
  asset_id : VARCHAR(36) [FK]
  cve_id : VARCHAR(20)
  title : VARCHAR(200)
  cvss_score : FLOAT
  severity : ENUM
  status : ENUM
  assigned_to : VARCHAR(36) [FK]
}

entity "AUDIT_LOG" as audit {
  * log_id : VARCHAR(36) [PK]
  --
  actor_username : VARCHAR(50) [FK]
  action : VARCHAR(50)
  target_resource : VARCHAR(100)
  details_json : TEXT
  hmac_hash : VARCHAR(64)
  prev_hash : VARCHAR(64)
}

user ||--o{ asset : "owns"
user ||--o{ audit : "generates"
asset ||--o{ vuln : "contains"
user ||--o{ vuln : "assigned_to"
@enduml
```

---

## 2. UML Use Case Diagram

### PlantUML Code
```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle outline

actor "System Admin" as Admin
actor "Security Lead" as Lead
actor "Remediation Engineer" as Eng
actor "Security Auditor" as Auditor

rectangle "Vulnerability Management Platform" {
  usecase "Manage Users & Config" as UC_Admin
  usecase "Register System Asset" as UC_Register
  usecase "Import CVE Findings" as UC_Import
  usecase "Calculate CVSS Severity" as UC_CVSS
  usecase "Override Severity" as UC_Override
  usecase "Remediate Vulnerability" as UC_Remediate
  usecase "Update Workflow Status" as UC_UpdateStatus
  usecase "Verify Fix & Close" as UC_Verify
  usecase "Inspect HMAC Audit Trail" as UC_Audit
}

Admin --> UC_Admin
Lead --> UC_Register
Lead --> UC_Import
UC_Import ..> UC_CVSS : <<include>>
UC_Import ..> UC_Override : <<extend>>
Eng --> UC_Remediate
UC_Remediate ..> UC_UpdateStatus : <<include>>
Lead --> UC_Verify
Auditor --> UC_Audit
@enduml
```

### Mermaid Code
```mermaid
graph LR
    subgraph Actors
        Admin[System Admin]
        Lead[Security Lead]
        Eng[Remediation Engineer]
        Auditor[Security Auditor]
    end

    subgraph Platform [Vulnerability Management Platform]
        UC1((Manage Users & Config))
        UC2((Register System Asset))
        UC3((Import CVE Findings))
        UC4((Calculate CVSS Severity))
        UC5((Override Severity))
        UC6((Remediate Vulnerability))
        UC7((Update Workflow Status))
        UC8((Verify Fix & Close))
        UC9((Inspect HMAC Audit Trail))
    end

    Admin --> UC1
    Lead --> UC2
    Lead --> UC3
    UC3 -.->|include| UC4
    UC3 -.->|extend| UC5
    Eng --> UC6
    UC6 -.->|include| UC7
    Lead --> UC8
    Auditor --> UC9
```

---

## 3. Data Flow Diagram - Level 0 (Context Diagram)

### Mermaid Code
```mermaid
graph TD
    subgraph External_Entities [External Entities]
        A[Security Lead / CVE Scanner]
        B[Remediation Engineer]
        C[Security Auditor]
    end

    subgraph System_Boundary [Vulnerability Management Platform]
        S((1.0 Vulnerability Platform Core System))
    end

    subgraph Data_Stores [Data Storage]
        D1[(D1: Assets & Vulnerabilities Store)]
        D2[(D2: Immutable HMAC Audit Chain)]
    end

    A -->|Asset Registration & CVE Ingestion Payload| S
    B -->|Remediation Status Update Request| S
    S -->|Assigned Vulnerability Tasks| B
    C -->|Audit Verification Query| S
    S -->|Compliance & Audit Reports| C
    S <-->|Read / Write Operational State| D1
    S -->|Append Cryptographic HMAC Logs| D2
```

---

## 4. Data Flow Diagram - Level 1 (with 4 Trust Boundaries)

### Mermaid Code
```mermaid
graph TB
    subgraph TB1 [TRUST BOUNDARY 1: Untrusted Client Browser]
        ClientLead[Security Lead Browser]
        ClientEng[Remediation Engineer Browser]
        ClientAud[Auditor Browser]
    end

    subgraph TB2 [TRUST BOUNDARY 2: API Gateway & TLS Termination]
        P1[1.0 Express API Router & Helmet Security Headers]
        P2[2.0 JWT AuthN & RBAC Authorization Guard]
    end

    subgraph TB3 [TRUST BOUNDARY 3: Application Domain Core Engine]
        P3[3.0 Asset & Vulnerability Management Service]
        P4[4.0 State Machine Enforced Workflow Engine]
        P5[5.0 Cryptographic HMAC Audit Logger]
    end

    subgraph TB4 [TRUST BOUNDARY 4: Secure Storage Layer]
        D1[(D1: Assets & Vulnerabilities Database)]
        D2[(D2: Immutable HMAC Audit Chain Store)]
    end

    ClientLead -->|HTTPS Requests + Bearer JWT| P1
    ClientEng -->|HTTPS Requests + Bearer JWT| P1
    ClientAud -->|HTTPS Requests + Bearer JWT| P1

    P1 -->|Raw REST Payload| P2
    P2 -->|Validated User Context| P3
    P2 -->|Validated User Context| P4
    P2 -->|Audit Event Action| P5

    P3 -->|Store Assets & Findings| D1
    P4 -->|Enforce State Machine & Update State| D1
    P5 -->|Append Hash-Chained Log Record| D2
```

---

## 5. Data Flow Diagram - Level 2 (Decomposition of Process 4.0: Workflow Engine)

### Mermaid Code
```mermaid
graph TD
    subgraph DFD_Level_2 [Process 4.0: Enforced Workflow State Machine Engine]
        Req[Incoming Workflow Transition Request] --> P4_1[4.1 Transition Rule Validator]
        
        P4_1 -->|Allowed Transition Path| P4_2[4.2 Baseline CVSS & Severity Evaluator]
        P4_1 -->|Illegal Transition Path| Err[Return HTTP 400 Workflow Integrity Error]
        
        P4_2 --> P4_3[4.3 State Persistence Engine]
        P4_3 --> D1[(D1: Assets & Vulnerabilities Store)]
        
        P4_3 --> P4_4[4.4 Cryptographic Audit Event Trigger]
        P4_4 --> D2[(D2: Immutable HMAC Audit Chain Store)]
    end
```

---

## 6. Software Architecture Diagram

### Mermaid Code
```mermaid
graph TD
    subgraph Layer1 [Layer 1: Presentation Layer]
        UI[Single-Page Web Application\nHTML5 / Vanilla CSS Glassmorphism]
    end

    subgraph Layer2 [Layer 2: Security Gateway Layer]
        GW[Express API Gateway\nHelmet Security Headers / Rate Limiting / CORS]
    end

    subgraph Layer3 [Layer 3: Authentication & Authorization Layer]
        AUTH[JWT Middleware & RBAC Permission Guards]
    end

    subgraph Layer4 [Layer 4: Business Domain Core Layer]
        AM[Asset Manager]
        WE[State Machine Workflow Engine]
        CVSS[CVSS Scoring Engine]
    end

    subgraph Layer5 [Layer 5: Data & Cryptographic Audit Storage Layer]
        DB[(Assets & Vulnerabilities Database)]
        AUDIT[(Cryptographic HMAC Chained Audit Log)]
    end

    UI -->|HTTPS REST APIs / JSON| GW
    GW --> AUTH
    AUTH --> AM
    AUTH --> WE
    AUTH --> CVSS
    AM --> DB
    WE --> DB
    WE --> AUDIT
    CVSS --> WE
```
