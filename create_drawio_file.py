import xml.etree.ElementTree as ET
from xml.dom import minidom

def build_perfect_drawio_xml():
    mxfile = ET.Element('mxfile', {
        'host': 'app.diagrams.net',
        'modified': '2026-10-08T12:15:00.000Z',
        'agent': 'Antigravity',
        'version': '21.0.0',
        'type': 'device'
    })

    def create_page(page_id, page_name):
        diagram = ET.SubElement(mxfile, 'diagram', {'id': page_id, 'name': page_name})
        model = ET.SubElement(diagram, 'mxGraphModel', {
            'dx': '1400', 'dy': '900', 'grid': '1', 'gridSize': '10',
            'guides': '1', 'tooltips': '1', 'connect': '1', 'arrows': '1',
            'fold': '1', 'page': '1', 'pageScale': '1', 'pageWidth': '1200',
            'pageHeight': '850', 'math': '0', 'shadow': '1'
        })
        root = ET.SubElement(model, 'root')
        ET.SubElement(root, 'mxCell', {'id': '0'})
        ET.SubElement(root, 'mxCell', {'id': '1', 'parent': '0'})
        return root

    def add_node(root, cell_id, value, style, x, y, w, h, parent="1"):
        cell = ET.SubElement(root, 'mxCell', {
            'id': cell_id,
            'value': value,
            'style': style,
            'vertex': '1',
            'parent': parent
        })
        ET.SubElement(cell, 'mxGeometry', {
            'x': str(x), 'y': str(y), 'width': str(w), 'height': str(h), 'as': 'geometry'
        })
        return cell

    def add_edge(root, edge_id, value, style, source_id, target_id, parent="1"):
        cell_attrs = {
            'id': edge_id,
            'value': value,
            'style': style,
            'edge': '1',
            'parent': parent,
            'source': source_id,
            'target': target_id
        }
        cell = ET.SubElement(root, 'mxCell', cell_attrs)
        ET.SubElement(cell, 'mxGeometry', {'relative': '1', 'as': 'geometry'})
        return cell

    # -------------------------------------------------------------
    # PAGE 1: ER Diagram
    # -------------------------------------------------------------
    root1 = create_page('erd_page', '1. ER Diagram')
    er_card_style = "text;html=1;overflow=hidden;rounded=1;dropShadow=1;fillColor=#FFFFFF;strokeColor=#CBD5E1;strokeWidth=1;"
    er_edge_style = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#2563EB;strokeWidth=2;fontSize=11;fontColor=#1E3A8A;fontStyle=1;"

    def make_entity_html(entity_name, color, rows):
        html_code = f'''<table border="0" cellspacing="0" cellpadding="0" style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:11px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
  <tr style="background:{color}; color:#FFFFFF; font-weight:bold; font-size:13px; height:36px;">
    <td colspan="3" style="padding:0 12px; text-align:center; letter-spacing:0.5px; border-radius:6px 6px 0 0;">{entity_name}</td>
  </tr>'''
        for idx, (ktype, name, dtype) in enumerate(rows):
            bg = "#F8FAFC" if idx % 2 == 1 else "#FFFFFF"
            k_color = "#2563EB" if ktype == "PK" else ("#D97706" if ktype == "FK" else "#94A3B8")
            k_badge = f'<span style="color:{k_color}; font-weight:bold; font-size:10px;">{ktype}</span>' if ktype else ''
            html_code += f'''
  <tr style="background:{bg}; border-bottom:1px solid #E2E8F0; height:26px;">
    <td style="padding:0 8px; width:28px; text-align:center;">{k_badge}</td>
    <td style="padding:0 8px; font-weight:bold; color:#1E293B;">{name}</td>
    <td style="padding:0 8px; text-align:right; color:#64748B; font-size:10px;">{dtype}</td>
  </tr>'''
        html_code += '</table>'
        return html_code

    user_rows = [("PK", "user_id", "VARCHAR(36)"), ("", "username", "VARCHAR(50)"), ("", "password_hash", "VARCHAR(255)"), ("FK", "role_id", "VARCHAR(20)")]
    asset_rows = [("PK", "asset_id", "VARCHAR(36)"), ("", "name", "VARCHAR(100)"), ("", "ip_address", "VARCHAR(45)"), ("", "type", "ENUM"), ("", "criticality", "ENUM"), ("FK", "owner_id", "VARCHAR(36)")]
    vuln_rows = [("PK", "vuln_id", "VARCHAR(36)"), ("FK", "asset_id", "VARCHAR(36)"), ("", "cve_id", "VARCHAR(20)"), ("", "title", "VARCHAR(200)"), ("", "cvss_score", "FLOAT"), ("", "severity", "ENUM"), ("", "status", "ENUM"), ("FK", "assigned_to", "VARCHAR(36)")]
    audit_rows = [("PK", "log_id", "VARCHAR(36)"), ("FK", "actor_username", "VARCHAR(50)"), ("", "action", "VARCHAR(50)"), ("", "target_resource", "VARCHAR(100)"), ("", "details_json", "TEXT"), ("", "hmac_hash", "VARCHAR(64)"), ("", "prev_hash", "VARCHAR(64)")]

    add_node(root1, 'erd_user', make_entity_html('USER', '#0F172A', user_rows), er_card_style, 80, 80, 280, 150)
    add_node(root1, 'erd_asset', make_entity_html('ASSET', '#1E3A8A', asset_rows), er_card_style, 640, 80, 290, 200)
    add_node(root1, 'erd_audit', make_entity_html('AUDIT_LOG', '#0F172A', audit_rows), er_card_style, 80, 400, 300, 230)
    add_node(root1, 'erd_vuln', make_entity_html('VULNERABILITY', '#1E3A8A', vuln_rows), er_card_style, 640, 380, 300, 260)

    add_edge(root1, 'er_e1', '1 : N (owns)', er_edge_style, 'erd_user', 'erd_asset')
    add_edge(root1, 'er_e2', '1 : N (contains)', er_edge_style, 'erd_asset', 'erd_vuln')
    add_edge(root1, 'er_e3', '1 : N (assigned_to)', er_edge_style, 'erd_user', 'erd_vuln')
    add_edge(root1, 'er_e4', '1 : N (generates)', er_edge_style, 'erd_user', 'erd_audit')

    # -------------------------------------------------------------
    # PAGE 2: Use Case Diagram
    # -------------------------------------------------------------
    root2 = create_page('usecase_page', '2. Use Case Diagram')
    actor_style = "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#1E3A8A;strokeColor=#1E3A8A;fontStyle=1;fontSize=12;"
    uc_style = "ellipse;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#2563EB;strokeWidth=2;fontSize=11;fontColor=#1E3A8A;fontStyle=1;dropShadow=1;"
    box_style = "shape=swimlane;startSize=30;horizontal=1;fillColor=#F8FAFC;strokeColor=#475569;fontStyle=1;fontSize=13;fontColor=#0F172A;rounded=1;"
    uc_edge = "endArrow=open;endSize=8;strokeColor=#475569;strokeWidth=1.5;html=1;"
    inc_edge = "endArrow=open;endSize=8;dashed=1;strokeColor=#2563EB;strokeWidth=1.5;html=1;fontSize=10;fontColor=#2563EB;"

    add_node(root2, 'sys_box', 'Vulnerability Management Platform System Boundary', box_style, 240, 40, 600, 720)
    add_node(root2, 'act_admin', 'System Admin', actor_style, 80, 90, 40, 70)
    add_node(root2, 'act_lead', 'Security Lead', actor_style, 80, 270, 40, 70)
    add_node(root2, 'act_eng', 'Remediation Engineer', actor_style, 80, 480, 40, 70)
    add_node(root2, 'act_aud', 'Security Auditor', actor_style, 80, 650, 40, 70)

    add_node(root2, 'uc1', 'Manage Users & Config', uc_style, 310, 90, 190, 50)
    add_node(root2, 'uc2', 'Register System Asset', uc_style, 310, 180, 190, 50)
    add_node(root2, 'uc3', 'Import CVE Findings', uc_style, 310, 270, 190, 50)
    add_node(root2, 'uc4', 'Calculate CVSS Severity', uc_style, 590, 230, 190, 50)
    add_node(root2, 'uc5', 'Override Severity', uc_style, 590, 310, 190, 50)
    add_node(root2, 'uc6', 'Remediate Vulnerability', uc_style, 310, 460, 190, 50)
    add_node(root2, 'uc7', 'Update Workflow Status', uc_style, 590, 460, 190, 50)
    add_node(root2, 'uc8', 'Verify Fix & Close', uc_style, 310, 550, 190, 50)
    add_node(root2, 'uc9', 'Inspect HMAC Audit Trail', uc_style, 310, 640, 190, 50)

    add_edge(root2, 'ue1', '', uc_edge, 'act_admin', 'uc1')
    add_edge(root2, 'ue2', '', uc_edge, 'act_lead', 'uc2')
    add_edge(root2, 'ue3', '', uc_edge, 'act_lead', 'uc3')
    add_edge(root2, 'ue4', '', uc_edge, 'act_lead', 'uc8')
    add_edge(root2, 'ue5', '', uc_edge, 'act_eng', 'uc6')
    add_edge(root2, 'ue6', '', uc_edge, 'act_aud', 'uc9')

    add_edge(root2, 'ie1', '<<include>>', inc_edge, 'uc3', 'uc4')
    add_edge(root2, 'ie2', '<<extend>>', inc_edge, 'uc3', 'uc5')
    add_edge(root2, 'ie3', '<<include>>', inc_edge, 'uc6', 'uc7')

    # -------------------------------------------------------------
    # PAGE 3: DFD Level 0 (Context Diagram)
    # -------------------------------------------------------------
    root3 = create_page('dfd0_page', '3. DFD Level 0')
    ext_style = "shape=rectangle;whiteSpace=wrap;html=1;fillColor=#1E293B;strokeColor=#0F172A;fontColor=#FFFFFF;fontStyle=1;fontSize=12;rounded=1;dropShadow=1;"
    proc_style = "ellipse;whiteSpace=wrap;html=1;fillColor=#1E3A8A;strokeColor=#0F172A;fontColor=#FFFFFF;fontStyle=1;fontSize=13;dropShadow=1;"
    ds_style = "shape=partialRectangle;right=0;left=0;html=1;whiteSpace=wrap;fillColor=#F1F5F9;strokeColor=#475569;strokeWidth=2;fontColor=#0F172A;fontStyle=1;fontSize=11;"
    dfd_edge1 = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#2563EB;strokeWidth=2;fontSize=10;fontColor=#1E3A8A;fontStyle=1;"
    dfd_edge2 = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#0D9488;strokeWidth=2;fontSize=10;fontColor=#0F766E;fontStyle=1;"

    add_node(root3, 'ext_lead', 'Security Lead / Scanner', ext_style, 80, 80, 200, 60)
    add_node(root3, 'ext_eng', 'Remediation Engineer', ext_style, 80, 270, 200, 60)
    add_node(root3, 'ext_aud', 'Security Auditor', ext_style, 80, 460, 200, 60)

    add_node(root3, 'p_core', '1.0\nVulnerability Management\nPlatform Core System', proc_style, 440, 230, 220, 140)

    add_node(root3, 'ds1', 'D1: Assets & Vulnerabilities Store', ds_style, 800, 190, 250, 50)
    add_node(root3, 'ds2', 'D2: Immutable HMAC Audit Chain', ds_style, 800, 360, 250, 50)

    add_edge(root3, 'fe1', 'Asset & CVE Payload', dfd_edge1, 'ext_lead', 'p_core')
    add_edge(root3, 'fe2', 'Status Update Request', dfd_edge1, 'ext_eng', 'p_core')
    add_edge(root3, 'fe3', 'Assigned Tasks', dfd_edge2, 'p_core', 'ext_eng')
    add_edge(root3, 'fe4', 'Audit Query', dfd_edge1, 'ext_aud', 'p_core')
    add_edge(root3, 'fe5', 'Compliance Reports', dfd_edge2, 'p_core', 'ext_aud')
    add_edge(root3, 'fe6', 'Read/Write State', dfd_edge1, 'p_core', 'ds1')
    add_edge(root3, 'fe7', 'Append HMAC Logs', dfd_edge1, 'p_core', 'ds2')

    # -------------------------------------------------------------
    # PAGE 4: DFD Level 1
    # -------------------------------------------------------------
    root4 = create_page('dfd1_page', '4. DFD Level 1')
    tb_style = "shape=swimlane;startSize=28;dashed=1;dashPattern=5 5;fillColor=#F8FAFC;strokeColor=#64748B;strokeWidth=2;fontStyle=1;fontSize=11;fontColor=#334155;rounded=1;"

    add_node(root4, 'tb1', 'TRUST BOUNDARY 1: Untrusted Client Browser', tb_style, 40, 40, 220, 560)
    add_node(root4, 'tb2', 'TRUST BOUNDARY 2: API Gateway & TLS', tb_style, 300, 40, 250, 560)
    add_node(root4, 'tb3', 'TRUST BOUNDARY 3: Application Core Engine', tb_style, 590, 40, 260, 560)
    add_node(root4, 'tb4', 'TRUST BOUNDARY 4: Secure Data Storage Layer', tb_style, 890, 40, 250, 560)

    add_node(root4, 'cli_lead', 'Security Lead Browser', ext_style, 60, 90, 180, 50)
    add_node(root4, 'cli_eng', 'Engineer Browser', ext_style, 60, 250, 180, 50)
    add_node(root4, 'cli_aud', 'Auditor Browser', ext_style, 60, 410, 180, 50)

    add_node(root4, 'p1_1', '1.0 Express API Router\n& Helmet Security Headers', proc_style, 320, 120, 210, 80)
    add_node(root4, 'p1_2', '2.0 JWT AuthN & RBAC\nPermission Guard', proc_style, 320, 330, 210, 80)

    add_node(root4, 'p1_3', '3.0 Asset & Vuln\nManagement Service', proc_style, 610, 90, 220, 70)
    add_node(root4, 'p1_4', '4.0 Enforced Workflow\nState Machine Engine', proc_style, 610, 250, 220, 70)
    add_node(root4, 'p1_5', '5.0 Cryptographic HMAC\nAudit Logger', proc_style, 610, 410, 220, 70)

    add_node(root4, 'ds1_l1', 'D1: Assets & Vulns DB', ds_style, 910, 170, 210, 50)
    add_node(root4, 'ds2_l1', 'D2: HMAC Audit Chain', ds_style, 910, 380, 210, 50)

    add_edge(root4, 'l1_e1', 'HTTPS + JWT', dfd_edge1, 'cli_lead', 'p1_1')
    add_edge(root4, 'l1_e2', 'HTTPS + JWT', dfd_edge1, 'cli_eng', 'p1_1')
    add_edge(root4, 'l1_e3', 'HTTPS + JWT', dfd_edge1, 'cli_aud', 'p1_1')
    add_edge(root4, 'l1_e4', 'Raw Payload', dfd_edge1, 'p1_1', 'p1_2')
    add_edge(root4, 'l1_e5', 'Validated Context', dfd_edge1, 'p1_2', 'p1_3')
    add_edge(root4, 'l1_e6', 'Validated Context', dfd_edge1, 'p1_2', 'p1_4')
    add_edge(root4, 'l1_e7', 'Audit Action', dfd_edge1, 'p1_2', 'p1_5')
    add_edge(root4, 'l1_e8', 'Write Data', dfd_edge1, 'p1_3', 'ds1_l1')
    add_edge(root4, 'l1_e9', 'Validate & Update', dfd_edge1, 'p1_4', 'ds1_l1')
    add_edge(root4, 'l1_e10', 'Append Hash Log', dfd_edge1, 'p1_5', 'ds2_l1')

    # -------------------------------------------------------------
    # PAGE 5: DFD Level 2
    # -------------------------------------------------------------
    root5 = create_page('dfd2_page', '5. DFD Level 2')
    box_l2 = "shape=swimlane;startSize=30;fillColor=#F8FAFC;strokeColor=#475569;fontStyle=1;fontSize=12;fontColor=#0F172A;rounded=1;"
    p2_style = "ellipse;whiteSpace=wrap;html=1;fillColor=#1E3A8A;strokeColor=#0F172A;fontColor=#FFFFFF;fontStyle=1;fontSize=11;dropShadow=1;"
    err_style = "shape=rectangle;whiteSpace=wrap;html=1;fillColor=#991B1B;strokeColor=#7F1D1D;fontColor=#FFFFFF;fontStyle=1;fontSize=11;rounded=1;dropShadow=1;"

    add_node(root5, 'l2_box', 'Process 4.0: Enforced Workflow State Machine Engine Sub-system', box_l2, 80, 50, 1000, 540)
    add_node(root5, 'req_in', 'Incoming Transition Request', ext_style, 120, 150, 190, 50)
    add_node(root5, 'p4_1', '4.1 Transition Rule\nValidator', p2_style, 380, 140, 170, 70)
    add_node(root5, 'err_box', 'HTTP 400 Workflow\nIntegrity Violation', err_style, 380, 280, 170, 50)
    add_node(root5, 'p4_2', '4.2 Baseline CVSS &\nSeverity Evaluator', p2_style, 620, 140, 170, 70)
    add_node(root5, 'p4_3', '4.3 State Persistence\nEngine', p2_style, 620, 280, 170, 70)
    add_node(root5, 'p4_4', '4.4 HMAC Audit Event\nTrigger', p2_style, 620, 420, 170, 70)

    add_node(root5, 'ds1_l2', 'D1: Assets & Vulns DB', ds_style, 860, 290, 190, 50)
    add_node(root5, 'ds2_l2', 'D2: HMAC Audit Chain', ds_style, 860, 430, 190, 50)

    add_edge(root5, 'l2_e1', '', dfd_edge1, 'req_in', 'p4_1')
    add_edge(root5, 'l2_e2', 'Valid Path', dfd_edge1, 'p4_1', 'p4_2')
    add_edge(root5, 'l2_e3', 'Illegal Path', dfd_edge1, 'p4_1', 'err_box')
    add_edge(root5, 'l2_e4', '', dfd_edge1, 'p4_2', 'p4_3')
    add_edge(root5, 'l2_e5', 'Save State', dfd_edge1, 'p4_3', 'ds1_l2')
    add_edge(root5, 'l2_e6', 'Trigger Event', dfd_edge1, 'p4_3', 'p4_4')
    add_edge(root5, 'l2_e7', 'Write HMAC', dfd_edge1, 'p4_4', 'ds2_l2')

    # -------------------------------------------------------------
    # PAGE 6: Software Architecture Diagram (Fixed Crisp Database Cylinder Style)
    # -------------------------------------------------------------
    root6 = create_page('arch_page', '6. Software Architecture')
    layer_style = "shape=swimlane;startSize=28;horizontal=1;fillColor=#F8FAFC;strokeColor=#334155;strokeWidth=2;fontStyle=1;fontSize=12;fontColor=#0F172A;rounded=1;"
    comp_style = "shape=rectangle;whiteSpace=wrap;html=1;fillColor=#1E3A8A;strokeColor=#0F172A;fontColor=#FFFFFF;fontStyle=1;fontSize=12;rounded=1;dropShadow=1;"
    db_comp_style = "shape=partialRectangle;right=0;left=0;html=1;whiteSpace=wrap;fillColor=#1E293B;strokeColor=#0F172A;strokeWidth=2;fontColor=#FFFFFF;fontStyle=1;fontSize=11;dropShadow=1;rounded=1;"
    arch_edge = "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#2563EB;strokeWidth=2.5;fontSize=10;fontColor=#1E3A8A;fontStyle=1;"

    add_node(root6, 'lay1', 'Layer 1: Presentation Layer (Frontend SPA)', layer_style, 80, 40, 940, 90)
    add_node(root6, 'lay2', 'Layer 2: Security Gateway Layer (Express API Gateway)', layer_style, 80, 170, 940, 90)
    add_node(root6, 'lay3', 'Layer 3: Authentication & Authorization Layer', layer_style, 80, 300, 940, 90)
    add_node(root6, 'lay4', 'Layer 4: Business Domain Core Layer', layer_style, 80, 430, 940, 100)
    add_node(root6, 'lay5', 'Layer 5: Data & Cryptographic Audit Storage Layer', layer_style, 80, 570, 940, 100)

    add_node(root6, 'c_ui', 'Single-Page Web Application (HTML5 / Vanilla CSS Glassmorphism)', comp_style, 220, 75, 660, 45)
    add_node(root6, 'c_gw', 'Express API Gateway (Helmet Security Headers / Rate Limiting / CORS Controls)', comp_style, 220, 205, 660, 45)
    add_node(root6, 'c_auth', 'JWT Authentication Middleware & RBAC Permission Guards', comp_style, 220, 335, 660, 45)

    add_node(root6, 'c_am', 'Asset Manager Service', comp_style, 120, 470, 260, 45)
    add_node(root6, 'c_we', 'State Machine Workflow Engine', comp_style, 420, 470, 260, 45)
    add_node(root6, 'c_cvss', 'CVSS Risk Scoring Engine', comp_style, 720, 470, 260, 45)

    add_node(root6, 'c_db', 'Assets & Vulnerabilities DB', db_comp_style, 220, 605, 280, 50)
    add_node(root6, 'c_hmac', 'Cryptographic HMAC Audit Log Store', db_comp_style, 580, 605, 280, 50)

    add_edge(root6, 'ae1', 'HTTPS REST API / JSON', arch_edge, 'c_ui', 'c_gw')
    add_edge(root6, 'ae2', '', arch_edge, 'c_gw', 'c_auth')
    add_edge(root6, 'ae3', '', arch_edge, 'c_auth', 'c_we')
    add_edge(root6, 'ae4', '', arch_edge, 'c_am', 'c_db')
    add_edge(root6, 'ae5', '', arch_edge, 'c_we', 'c_db')
    add_edge(root6, 'ae6', '', arch_edge, 'c_we', 'c_hmac')
    add_edge(root6, 'ae7', '', arch_edge, 'c_cvss', 'c_we')

    xml_str = ET.tostring(mxfile, encoding='utf-8')
    parsed = minidom.parseString(xml_str)
    pretty_xml = parsed.toprettyxml(indent="  ")
    
    with open('/home/vikas/SSE_END_LAB/docs/all_diagrams.drawio', 'w', encoding='utf-8') as f:
        f.write(pretty_xml)
        
    with open('/home/vikas/SSE_END_LAB/docs/all_diagrams.drawio.xml', 'w', encoding='utf-8') as f:
        f.write(pretty_xml)

    print("Successfully built crisp database node style in Layer 5!")

if __name__ == "__main__":
    build_perfect_drawio_xml()
