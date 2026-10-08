import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>\n'
            f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
            f'  <w:left w:val="none"/>\n'
            f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
            f'  <w:right w:val="none"/>\n'
            f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
            f'  <w:insideV w:val="none"/>\n'
            f'</w:tblBorders>'
        )
        tblPr[0].append(borders)

def format_table(table, headers, rows_data, col_widths=None):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table, color="CBD5E1", sz="4")
    
    # Header
    hdr_cells = table.rows[0].cells
    for idx, h_text in enumerate(headers):
        hdr_cells[idx].text = h_text
        set_cell_background(hdr_cells[idx], "0F172A")
        set_cell_margins(hdr_cells[idx], top=140, bottom=140, left=150, right=150)
        p = hdr_cells[idx].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.name = 'Arial'
            run.font.bold = True
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            
    # Rows
    for r_idx, r_vals in enumerate(rows_data):
        row_cells = table.add_row().cells
        bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(r_vals):
            row_cells[c_idx].text = val
            set_cell_background(row_cells[c_idx], bg)
            set_cell_margins(row_cells[c_idx], top=110, bottom=110, left=150, right=150)
            p = row_cells[c_idx].paragraphs[0]
            p.paragraph_format.line_spacing = 1.15
            for run in p.runs:
                run.font.name = 'Arial'
                run.font.size = Pt(9.0)
                run.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
                
    if col_widths:
        for row in table.rows:
            for c_idx, w in enumerate(col_widths):
                row.cells[c_idx].width = Inches(w)

def generate_srs_docx(output_path):
    doc = docx.Document()
    
    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    # Typography Setup
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Arial'
    style_normal.font.size = Pt(10.5)
    style_normal.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    def add_main_header(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(24)
        p.paragraph_format.space_after = Pt(6)
        run = p.add_run(text)
        run.font.name = 'Arial'
        run.font.size = Pt(22)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        return p

    def add_sub_header(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(20)
        run = p.add_run(text)
        run.font.name = 'Arial'
        run.font.size = Pt(13)
        run.font.italic = True
        run.font.color.rgb = RGBColor(0x47, 0x55, 0x69)
        return p

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Arial'
        run.font.size = Pt(15)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Arial'
        run.font.size = Pt(12.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
        return p

    def add_p(text, bold_prefix=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            rb = p.add_run(bold_prefix)
            rb.font.bold = True
            rb.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        rt = p.add_run(text)
        rt.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
        return p

    def add_bullet(text, bold_prefix=None, level=0):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.left_indent = Inches(0.25 * (level + 1))
        if bold_prefix:
            rb = p.add_run(bold_prefix)
            rb.font.bold = True
            rb.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        rt = p.add_run(text)
        rt.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
        return p

    # --- TITLE ---
    add_main_header("# Phase 2: Requirements Engineering & SRS - \"VulnShield\"")
    add_sub_header("Enterprise Secure Vulnerability Management Platform")

    # --- SECTION 1 ---
    add_h1("1. Stakeholders and User Types")
    
    headers_sec1 = [
        "Stakeholder / User Type",
        "Role Category",
        "Primary Responsibilities & Operational Context",
        "Security Clearance & Privileges"
    ]
    data_sec1 = [
        [
            "Registered Security User (REMEDIATION_ENGINEER)",
            "Core Technical User",
            "Registers account, logs in, views assigned vulnerabilities, applies security patches, updates workflow status to REMEDIATION_IN_PROGRESS or VERIFICATION_PENDING, attaches remediation notes.",
            "Standard Privileges: Can view assigned findings, update status & notes. Strictly denied privilege to perform severity overrides, direct issue closure, or asset deletion."
        ],
        [
            "Lead Security Analyst (SECURITY_LEAD)",
            "Elevated Operations Lead",
            "Registers infrastructure assets, ingests vulnerability scanner reports, calculates/overrides CVSS severity with mandatory justification, manages assignments, approves verification & closure.",
            "Elevated Privileges: Full operational access to create assets, ingest CVE findings, override severity ratings, reassign issues, and perform final workflow closure."
        ],
        [
            "System Administrator (SYSTEM_ADMIN)",
            "Governance & Operations",
            "Manages user accounts, enforces RBAC policies, configures global authentication settings, monitors application health, and manages environment deployments.",
            "Administrative Privileges: Role-Based Access Control (RBAC) to manage accounts, configure security settings, access full audit logs, and trigger administrative system tasks."
        ],
        [
            "Security Auditor / Privacy Officer (SECURITY_AUDITOR)",
            "Compliance & Oversight",
            "Reviews security posture metrics, audits RBAC access violation logs, verifies HMAC-SHA256 tamper-evident audit log integrity, oversees compliance SLA reporting.",
            "Read-Only Audit Privilege: Access to immutable append-only HMAC-SHA256 audit trail and compliance reporting views. Zero write or data modification privileges."
        ],
        [
            "Unauthenticated Guest / External Scanner API",
            "Anonymous / External Interface",
            "Submits automated scanner JSON telemetry payloads or visits landing page and authentication login portal.",
            "Zero Authenticated Access: Denied access to internal APIs, asset database, vulnerability records, or audit logs. Authentication required via JWT Bearer tokens or API Keys."
        ]
    ]
    
    t1 = doc.add_table(rows=1, cols=4)
    format_table(t1, headers_sec1, data_sec1, col_widths=[1.5, 1.1, 2.4, 1.5])
    
    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # --- SECTION 2 ---
    add_h1("2. Requirements Classification")
    
    add_h2("A. Functional Requirements (FR)")
    add_bullet(" The system shall allow users to authenticate using valid credentials, issue short-lived cryptographically signed JSON Web Tokens (JWT), and enforce Role-Based Access Control (RBAC) across all protected API endpoints.", "FR-01 (Account Registration & JWT Authentication):")
    add_bullet(" The system shall allow authorized Security Leads and System Admins to register and manage infrastructure assets with metadata including IPv4/IPv6 address, asset type (SERVER, DATABASE, WEB_APP, CONTAINER, NETWORK_DEVICE), owner, and business criticality rating.", "FR-02 (Asset Inventory Registration & Management):")
    add_bullet(" The system shall ingest vulnerability scan reports, parse standardized CVE identifiers, match findings against registered assets, and prevent duplicate vulnerability entries.", "FR-03 (Vulnerability Ingestion & Automated CVE Matching):")
    add_bullet(" The system shall calculate baseline severity using CVSS v3.1/v4 scores (LOW: 0.1–3.9, MEDIUM: 4.0–6.9, HIGH: 7.0–8.9, CRITICAL: 9.0–10.0) and permit Security Leads to override severity levels only when providing mandatory textual justification.", "FR-04 (Dynamic CVSS Risk Scoring & Severity Overrides):")
    add_bullet(" The system shall strictly enforce a deterministic workflow lifecycle (VULNERABILITY_IMPORTED → ASSIGNED → REMEDIATION_IN_PROGRESS → VERIFICATION_PENDING → CLOSED) and reject illegal state jumps (e.g., direct closure without verification).", "FR-05 (Enforced Workflow State Machine):")
    add_bullet(" The system shall allow Security Leads to assign vulnerability findings to specific remediation teams/engineers, permitting engineers to track progress, record remediation notes, and submit items for verification.", "FR-06 (Vulnerability Assignment & Remediation Tracking):")
    add_bullet(" The system shall render real-time executive dashboard metrics, vulnerability severity distribution, SLA compliance tracking, and exportable audit reports.", "FR-07 (Executive Dashboard & SLA Compliance Reporting):")

    add_h2("B. Non-Functional Requirements (NFR)")
    add_bullet(" Vulnerability queries, status updates, and audit log retrievals must execute within ≤ 200 ms for 95% of requests under concurrent operational load (500 active security users).", "NFR-01 (Response Time & Query Latency):")
    add_bullet(" High availability target of 99.9% operational uptime for authentication, ingestion, and workflow state engine services.", "NFR-02 (High Availability & Operational Uptime):")
    add_bullet(" Cryptographic HMAC-SHA256 audit hashing must add ≤ 15 ms latency per transaction, with append-only storage supporting horizontal scaling up to millions of events.", "NFR-03 (Audit Chain Performance & Storage Scalability):")
    add_bullet(" Responsive dark-mode glassmorphism web interface providing role-tailored workspace views supporting clean interaction across desktop, tablet, and mobile viewports.", "NFR-04 (Mobile-Responsive Usability & Modern UI):")

    add_h2("C. Security Requirements (SR)")
    add_bullet(" Passwords must be hashed using industry-standard Bcrypt (work factor ≥ 10). Session management must utilize HMAC-SHA256 / RS256 signed JWTs with strict 8-hour expiration and Bearer HTTP header transmission.", "SR-01 (Secure Authentication & Session Management):")
    add_bullet(" Strict Broken Object Level Authorization (BOLA) and RBAC prevention: An authenticated user can only modify resources assigned to their role. The server must validate user role and asset assignment on every modifying action.", "SR-02 (Authorization & Anti-IDOR / Anti-BOLA Controls):")
    add_bullet(" Verify file MIME types using binary magic bytes (not trusting client-supplied file extension or Content-Type header). Enforce a maximum 500 KB payload limit, validate JSON schema via Zod, and rename uploads with random UUIDs to prevent directory traversal attacks.", "SR-03 (File Upload & Payload Hardening):")
    add_bullet(" All user-generated text inputs (remediation notes, severity override rationales, asset labels) must be HTML-escaped and parameterized to prevent Cross-Site Scripting (XSS - CWE-79) and Injection attacks (CWE-89).", "SR-04 (Content Sanitization & Anti-XSS / Anti-SQLi):")
    add_bullet(" Enforce access boundaries: Remediation Engineers can only update assigned items; Auditors have strict read-only access; Security Leads govern verification & closure.", "SR-05 (Privacy & Role Visibility Controls):")
    add_bullet(" Enforce token bucket rate limiting on sensitive API endpoints (e.g., maximum 300 requests per 15-minute window per IP, maximum 5 login attempts per minute) to mitigate brute force and automated denial-of-service attacks.", "SR-06 (Rate Limiting & Anti-Brute Force Protection):")
    add_bullet(" Security-sensitive events (failed logins, asset registrations, severity overrides, state transitions) must be logged into an immutable append-only chain where each entry contains timestamp, user ID, client IP, action type, and cryptographic HMAC-SHA256 hash chaining.", "SR-07 (Audit Logging & Cryptographic Traceability):")

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # --- SECTION 3 ---
    add_h1("3. Concise SRS and Prioritized Requirements Table")
    
    headers_sec3 = [
        "Req ID",
        "Requirement Description",
        "Category",
        "MoSCoW Priority",
        "CIA Dimension",
        "Authentication & Authorization",
        "Audit & Traceability"
    ]
    data_sec3 = [
        [
            "REQ-01",
            "User Registration & Bcrypt Hashing",
            "Security / FR",
            "Must Have",
            "Confidentiality, Integrity",
            "Pre-auth / JWT Auth; enforces strong password complexity & bcrypt hashing (work factor ≥ 10)",
            "Log authentication events with user ID, role, outcome, and client IP"
        ],
        [
            "REQ-02",
            "JWT Token Generation & Session Validation",
            "Security / FR",
            "Must Have",
            "Confidentiality, Integrity",
            "HMAC-SHA256 signed JWT token; Bearer header authentication & RBAC middleware guards",
            "Log failed login attempts, token rejections, and expired session access"
        ],
        [
            "REQ-03",
            "Asset Inventory Registration & IP Validation",
            "FR",
            "Must Have",
            "Integrity",
            "Authenticated SECURITY_LEAD / SYSTEM_ADMIN; IP formatting & Zod schema validation",
            "Log asset creation, update, and deletion events with author ID"
        ],
        [
            "REQ-04",
            "Vulnerability Ingestion & Magic Byte Payload Validation",
            "Security / FR",
            "Must Have",
            "Integrity, Availability",
            "Authenticated SECURITY_LEAD / SYSTEM_ADMIN; payload ceiling ≤ 500 KB, magic bytes check",
            "Log ingestion event, CVE ID, asset mapping, and duplicate rejection triggers"
        ],
        [
            "REQ-05",
            "Dynamic CVSS Scoring & Mandatory Severity Override Rationale",
            "Security / FR",
            "Must Have",
            "Integrity",
            "Authenticated SECURITY_LEAD; mandatory non-empty justification text check",
            "Log original CVSS score, overridden score, analyst ID, and justification string"
        ],
        [
            "REQ-06",
            "Enforced Sequential Workflow State Machine",
            "Security / FR",
            "Must Have",
            "Integrity",
            "Role-conditioned state transitions; strictly blocks illegal transitions & unauthorized closure",
            "Log state transitions with previous state, target state, user ID, and remediation notes"
        ],
        [
            "REQ-07",
            "Tamper-Evident HMAC-SHA256 Cryptographic Audit Log",
            "Security",
            "Must Have",
            "Integrity, Non-Repudiation",
            "Append-only logger; cryptographic HMAC-SHA256 audit verification endpoint",
            "Audit trail self-verifies cryptographic hash chain integrity on demand"
        ],
        [
            "REQ-08",
            "Executive Dashboard & Real-Time SLA Reporting",
            "FR",
            "Should Have",
            "Availability, Confidentiality",
            "Authenticated user; role-conditioned metric filtering & dashboard views",
            "Log compliance report generation and executive metrics query access"
        ],
        [
            "REQ-09",
            "Rate Limiting on Auth & API Endpoints",
            "Security / NFR",
            "Must Have",
            "Availability",
            "IP & Token bucket rate limiter (Express-rate-limit 300 requests / 15 mins)",
            "Log rate-limit threshold breaches and IP thottle events"
        ],
        [
            "REQ-10",
            "Content Security Policy & XSS / Injection Protection",
            "Security / NFR",
            "Must Have",
            "Integrity, Confidentiality",
            "Helmet HTTP security headers (CSP, X-Content-Type-Options) & HTML escaping on inputs",
            "Monitor and log browser CSP violation reports and input sanitization rejections"
        ]
    ]

    t3 = doc.add_table(rows=1, cols=7)
    format_table(t3, headers_sec3, data_sec3, col_widths=[0.7, 1.4, 0.8, 0.8, 0.9, 1.4, 1.5])

    p_end = doc.add_paragraph()
    p_end.paragraph_format.space_before = Pt(18)
    r_end = p_end.add_run("*End of Phase 2 Deliverable.*")
    r_end.font.italic = True
    r_end.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)

    # Save document
    doc.save(output_path)
    print(f"Successfully generated Word Document at: {output_path}")

if __name__ == "__main__":
    out_dir = "/home/vikas/SSE_END_LAB/docs"
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "Phase_2_SRS_Vulnerability_Management_Platform.docx")
    generate_srs_docx(out_file)
    # Also update Software_Requirements_Specification_SRS.docx so both are present
    out_file2 = os.path.join(out_dir, "Software_Requirements_Specification_SRS.docx")
    generate_srs_docx(out_file2)
