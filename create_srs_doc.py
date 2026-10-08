import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
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

def build_standard_srs(filename):
    doc = docx.Document()
    
    # Page Setup
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    # Standard Typography
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Arial'
    style_normal.font.size = Pt(10.5)
    style_normal.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    
    def add_title(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(36)
        p.paragraph_format.space_after = Pt(12)
        run = p.add_run(text)
        run.font.name = 'Arial'
        run.font.size = Pt(24)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        return p

    def add_subtitle(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(24)
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
        run.font.size = Pt(16)
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

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Arial'
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
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

    def add_callout(text, title="NOTE:"):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.left_indent = Inches(0.25)
        p.paragraph_format.right_indent = Inches(0.25)
        pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="12" w:color="1E3A8A"/></w:pBdr>')
        p._element.get_or_add_pPr().append(pBdr)
        r_title = p.add_run(f"{title} ")
        r_title.font.bold = True
        r_title.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
        r_text = p.add_run(text)
        r_text.font.italic = True
        r_text.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
        return p

    def format_table(table, headers, rows_data, col_widths=None):
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(table, color="CBD5E1", sz="4")
        
        # Header
        hdr_cells = table.rows[0].cells
        for idx, h_text in enumerate(headers):
            hdr_cells[idx].text = h_text
            set_cell_background(hdr_cells[idx], "0F172A")
            set_cell_margins(hdr_cells[idx], top=120, bottom=120, left=150, right=150)
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
                set_cell_margins(row_cells[c_idx], top=100, bottom=100, left=150, right=150)
                p = row_cells[c_idx].paragraphs[0]
                for run in p.runs:
                    run.font.name = 'Arial'
                    run.font.size = Pt(9.0)
                    run.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
                    
        if col_widths:
            for row in table.rows:
                for c_idx, w in enumerate(col_widths):
                    row.cells[c_idx].width = Inches(w)

    # DOCUMENT STRUCTURE (IEEE 830 Standard)
    add_title("Software Requirements Specification")
    add_subtitle("for Vulnerability Management Platform\nStandard IEEE 830-1998 / ISO/IEC/IEEE 29148 Compliance Document")
    
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_after = Pt(36)
    r_meta = p_meta.add_run("Version: 1.0.0\nPrepared by: Enterprise Security Engineering Team\nDate: October 2026\nStatus: Approved Requirement Specification")
    r_meta.font.size = Pt(10)
    r_meta.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
    
    doc.add_page_break()

    # Section 1: Introduction
    add_h1("1. Introduction")
    
    add_h2("1.1 Purpose")
    add_p("This document specifies the software requirements for the Vulnerability Management Platform (Version 1.0). It defines the complete functional, non-functional, security, and interface requirements to guide system developers, security engineers, quality assurance testers, and compliance auditors.")

    add_h2("1.2 Document Conventions")
    add_p("This specification follows standard IEEE 830 conventions:")
    add_bullet("Requirements are uniquely tagged using identifiers: FR (Functional Requirement), NFR (Non-Functional Requirement), SR (Security Requirement), and IF (Interface Requirement).", "Requirement IDs: ")
    add_bullet("Must Have (Mandatory for release), Should Have (High priority feature), Could Have (Desirable future capability).", "Priorities: ")
    add_bullet("All requirements are mapped to the CIA Triad (Confidentiality, Integrity, Availability).", "Security Mapping: ")

    add_h2("1.3 Intended Audience and Reading Suggestions")
    add_p("This document is intended for project managers, backend software engineers, frontend developers, security analysts, and external compliance auditors. Readers seeking functional capabilities should refer to Section 4; security and system constraint reviewers should consult Section 5.")

    add_h2("1.4 Product Scope")
    add_p("The Vulnerability Management Platform provides automated end-to-end management of enterprise cybersecurity exposures. Key capabilities include:")
    add_bullet("Centralized registration and management of organizational infrastructure assets.")
    add_bullet("Ingestion and normalization of vulnerability findings from automated scanners (e.g., Nessus, OpenVAS, Qualys).")
    add_bullet("Dynamic CVSS baseline scoring with mandatory manual severity override tracking.")
    add_bullet("Sequential workflow state machine enforcement (Imported -> Assigned -> In Progress -> Verification Pending -> Closed).")
    add_bullet("Cryptographically chained HMAC-SHA256 tamper-evident audit trail logging.")

    add_h2("1.5 References")
    add_bullet("IEEE Std 830-1998, IEEE Recommended Practice for Software Requirements Specifications.")
    add_bullet("ISO/IEC/IEEE 29148:2018 Systems and software engineering - Requirements engineering.")
    add_bullet("NIST Special Publication 800-115, Technical Guide to Information Security Testing.")
    add_bullet("OWASP Application Security Verification Standard (ASVS) v4.0.")

    # Section 2: Overall Description
    add_h1("2. Overall Description")
    
    add_h2("2.1 Product Perspective")
    add_p("The system is a standalone, web-based enterprise security application built using a Layered Clean Architecture. It interfaces with security scanners via REST API payloads and provides role-conditioned user interface views for security teams.")

    add_h2("2.2 Product Functions")
    add_bullet("Register assets with IP address, device type, owner, and business criticality rating.", "Asset Management: ")
    add_bullet("Ingest CVE findings, associate findings with registered assets, and store vulnerability telemetry.", "Vulnerability Ingestion: ")
    add_bullet("Compute baseline CVSS v3.1/v4 scores and permit security leads to adjust severity with required textual justification.", "Risk Evaluation: ")
    add_bullet("Enforce state transition logic ensuring vulnerabilities pass mandatory remediation and verification steps before closure.", "Workflow State Machine: ")
    add_bullet("Log every state change and administrative action into an immutable, cryptographically chained audit log.", "Tamper-Evident Audit: ")

    add_h2("2.3 User Classes and Characteristics")
    hdr_users = ["User Role", "Key Responsibilities", "Access Level"]
    data_users = [
        ["SYSTEM_ADMIN", "Manages users, authentication policies, role permissions, and platform settings.", "Full Administrative Access"],
        ["SECURITY_LEAD", "Registers assets, imports vulnerability findings, performs CVSS scoring, overrides severity, approves verification.", "Lead Operations Access"],
        ["REMEDIATION_ENGINEER", "Views assigned vulnerabilities, applies patches, and updates workflow status to VERIFICATION_PENDING.", "Remediation Access"],
        ["SECURITY_AUDITOR", "Reviews compliance posture, views assets, and verifies tamper-evident audit log integrity.", "Read-Only Compliance Access"]
    ]
    t_users = doc.add_table(rows=1, cols=3)
    format_table(t_users, hdr_users, data_users, col_widths=[1.8, 3.4, 1.3])

    add_h2("2.4 Operating Environment")
    add_bullet("Node.js runtime environment (v18.0 LTS or higher), Express framework.", "Server Environment: ")
    add_bullet("Modern HTML5 web browser (Chrome, Firefox, Edge, Safari) with JavaScript enabled.", "Client Environment: ")
    add_bullet("Containerized execution support via Docker and Kubernetes orchestration.", "Deployment: ")

    add_h2("2.5 Design and Implementation Constraints")
    add_callout("The platform must strictly prohibit direct status modification in the database. All state changes must pass through the Workflow Engine state machine validator to preserve audit integrity.", "MANDATORY DESIGN CONSTRAINT:")

    add_h2("2.6 User Documentation")
    add_p("User manuals, deployment guides, and API documentation (OpenAPI 3.0 specification) will be delivered alongside the production release.")

    add_h2("2.7 Assumptions and Dependencies")
    add_bullet("Users access the platform over encrypted TLS 1.3 network channels.")
    add_bullet("Automated vulnerability scanners supply valid CVE identifiers and numeric CVSS scores.")

    # Section 3: External Interface Requirements
    add_h1("3. External Interface Requirements")
    
    add_h2("3.1 User Interfaces")
    add_p("The web UI shall provide a responsive glassmorphism theme with distinct role-conditioned operational views: Dashboard Overview, Asset Management, Vulnerability Remediation Tracker, and Audit Log Inspector.")

    add_h2("3.2 Hardware Interfaces")
    add_p("No dedicated hardware interfaces are required. The software operates on standard x86-64 server infrastructure.")

    add_h2("3.3 Software Interfaces")
    add_bullet("Consumes JSON payloads from automated vulnerability scanners via standard HTTP POST endpoints.", "Scanner REST API: ")
    add_bullet("Integrates with standard relational/JSON state stores for persistent storage.", "Database Storage: ")

    add_h2("3.4 Communications Interfaces")
    add_p("All client-server communications shall enforce HTTPS (TLS 1.3) encryption. API authorization shall be transmitted via HTTP Authorization headers using Bearer JWT tokens.")

    # Section 4: System Features (Functional Requirements)
    add_h1("4. System Features (Functional Requirements)")
    
    add_h2("4.1 Feature 1: Asset Inventory Management")
    add_p("Security Leads shall be able to create, update, and categorize organizational assets.", "Description: ")
    add_bullet("FR-01.1: System shall validate asset IP addresses against standard IPv4/IPv6 formatting rules.", "FR-01: ")
    add_bullet("FR-01.2: System shall require asset type assignment (SERVER, DATABASE, WEB_APP, CONTAINER, NETWORK_DEVICE).")
    add_bullet("FR-01.3: System shall require criticality designation (LOW, MEDIUM, HIGH, CRITICAL).")

    add_h2("4.2 Feature 2: Vulnerability Scanner Ingestion")
    add_p("System shall ingest vulnerability findings from external scanner reports or manual security findings.", "Description: ")
    add_bullet("FR-02.1: System shall parse CVE IDs and validate format against standard CVE pattern rules.", "FR-02: ")
    add_bullet("FR-02.2: System shall reject duplicate finding submissions for the same asset and CVE combination.")

    add_h2("4.3 Feature 3: Risk Assessment & CVSS Scoring")
    add_p("System shall calculate severity based on CVSS metrics and track manual risk adjustments.", "Description: ")
    add_bullet("FR-03.1: System shall auto-calculate baseline severity: LOW (0.1-3.9), MEDIUM (4.0-6.9), HIGH (7.0-8.9), CRITICAL (9.0-10.0).", "FR-03: ")
    add_bullet("FR-03.2: System shall require mandatory textual justification when a Security Lead overrides auto-calculated severity.")

    add_h2("4.4 Feature 4: Enforced Workflow State Machine")
    add_p("System shall enforce rigid sequential state transitions for vulnerability lifecycle management.", "Description: ")
    add_bullet("FR-04.1: State transitions must strictly follow: VULNERABILITY_IMPORTED -> ASSIGNED -> REMEDIATION_IN_PROGRESS -> VERIFICATION_PENDING -> CLOSED.", "FR-04: ")
    add_bullet("FR-04.2: System shall block direct state transition attempts from ASSIGNED or REMEDIATION_IN_PROGRESS directly to CLOSED.")

    add_h2("4.5 Feature 5: Executive Dashboard & Compliance Reports")
    add_p("System shall render real-time summary statistics and exportable security audit reports.", "Description: ")
    add_bullet("FR-05.1: System shall display count metrics for active assets, critical vulnerabilities, and pending verifications.", "FR-05: ")
    add_bullet("FR-05.2: System shall render a real-time HMAC audit integrity verification badge.")

    # Section 5: Other Non-Functional Requirements
    add_h1("5. Other Non-Functional Requirements")
    
    add_h2("5.1 Performance Requirements")
    add_bullet("NFR-01.1: System shall respond to API read/write operations within 200ms under a load of 500 concurrent security users.")
    add_bullet("NFR-01.2: System background HMAC audit calculation shall not add more than 15ms latency per transaction.")

    add_h2("5.2 Safety & Reliability Requirements")
    add_bullet("NFR-02.1: Platform shall achieve 99.9% operational uptime.")
    add_bullet("NFR-02.2: System shall execute automated error handling to prevent application process crashes on malformed requests.")

    add_h2("5.3 Security Requirements")
    add_bullet("SR-01: All API endpoints shall enforce Role-Based Access Control (RBAC) verified via cryptographically signed JWT tokens.", "Authorization: ")
    add_bullet("SR-02: All data in transit shall be encrypted via TLS 1.3; sensitive stored tokens shall be encrypted at rest using AES-256.", "Encryption: ")
    add_bullet("SR-03: All state changes and severity alterations shall be written to an immutable, cryptographically chained HMAC-SHA256 audit log.", "Auditability: ")

    add_h2("5.4 Software Quality Attributes")
    add_bullet("Modular design adhering to Clean Architecture principles to facilitate maintenance.", "Maintainability: ")
    add_bullet("Cryptographically verifiable audit log ensuring tamper-evident record keeping.", "Auditability: ")
    add_bullet("Containerized application packaging enabling deployment across public/private cloud infrastructure.", "Portability: ")

    # Section 6: Requirements Traceability Matrix (RTM)
    add_h1("6. Requirements Traceability Matrix (RTM)")
    hdr_rtm = ["Req ID", "Requirement Description", "Category", "Priority", "CIA Mapping", "Enforcing Component"]
    data_rtm = [
        ["FR-01", "Register system assets with metadata and criticality", "Functional", "Must Have", "Integrity", "Asset Service & Zod Schema"],
        ["FR-02", "Ingest CVE findings from scanner reports", "Functional", "Must Have", "Confidentiality", "Ingestion Service & Router"],
        ["FR-03", "Calculate baseline CVSS & enforce override rationale", "Functional", "Must Have", "Integrity", "CVSS Risk Scoring Engine"],
        ["FR-04", "Enforce sequential state machine transitions", "Functional", "Must Have", "Integrity", "State Machine Workflow Engine"],
        ["FR-05", "Generate executive dashboard & compliance summaries", "Functional", "Should Have", "Availability", "Reporting & Dashboard View"],
        ["NFR-01", "Sub-200ms API response under 500 concurrent users", "Performance", "Must Have", "Availability", "Async I/O & Express Gateway"],
        ["NFR-02", "99.9% system uptime with fault-tolerant handlers", "Reliability", "Must Have", "Availability", "Node.js Process Exception Handler"],
        ["SR-01", "JWT token authentication & RBAC authorization", "Security", "Must Have", "Confidentiality", "JWT Middleware & Permission Guards"],
        ["SR-02", "Encryption in transit (TLS 1.3) and at rest (AES-256)", "Security", "Must Have", "Confidentiality", "TLS Terminal & Crypto Suite"],
        ["SR-03", "Immutable, cryptographically chained HMAC audit log", "Security", "Must Have", "Non-Repudiation", "HMAC Audit Logger Component"]
    ]
    t_rtm = doc.add_table(rows=1, cols=6)
    format_table(t_rtm, hdr_rtm, data_rtm, col_widths=[0.7, 2.2, 0.9, 0.8, 0.9, 1.5])

    doc.save(filename)
    print(f"Standard SRS Document successfully saved to: {filename}")

if __name__ == "__main__":
    build_standard_srs("/home/vikas/SSE_END_LAB/docs/Software_Requirements_Specification_SRS.docx")
