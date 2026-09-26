#!/usr/bin/env python3
"""
NetSage AI — Cisco AICTE VIP Phase 3 Web Server
Serves the web-based interactive NetSage AI Troubleshooting Dashboard and REST APIs.
"""

import http.server
import socketserver
import json
import csv
import urllib.parse
from pathlib import Path
import rule_checker

PORT = 8000
BASE_DIR = Path(__file__).parent.resolve()
PUBLIC_DIR = BASE_DIR / "public"

class NetSageRequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Default route to index.html
        parsed = urllib.parse.urlparse(path)
        clean_path = parsed.path

        if clean_path == "/" or clean_path == "/index.html":
            return str(PUBLIC_DIR / "index.html")
        
        if clean_path.startswith("/public/"):
            rel_path = clean_path[len("/public/"):]
            return str(PUBLIC_DIR / rel_path)

        return str(PUBLIC_DIR / clean_path.lstrip("/"))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/cases":
            self.send_json(self.get_cases())
        elif path == "/api/rule-check":
            self.send_json(self.get_rule_checks())
        elif path == "/api/ai-diagnoses":
            self.send_json(self.get_ai_diagnoses())
        elif path == "/api/responsible-log":
            self.send_json(self.get_responsible_log())
        elif path == "/api/stats":
            self.send_json(self.get_stats())
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/review":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                result = self.save_review(payload)
                self.send_json({"success": True, "message": "Review recorded", "data": result})
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, status=400)
        else:
            self.send_error(404, "Endpoint not found")

    def send_json(self, data, status=200):
        body = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def get_cases(self):
        cases_file = BASE_DIR / "cases.csv"
        if not cases_file.exists():
            return []
        with open(cases_file, newline="", encoding="utf-8") as f:
            return list(csv.DictReader(f))

    def get_rule_checks(self):
        cases = self.get_cases()
        report = []
        for r in cases:
            findings = rule_checker.check_case(r)
            report.append({
                "case_id": r.get("case_id"),
                "checks": findings
            })
        return report

    def get_ai_diagnoses(self):
        diag_file = BASE_DIR / "ai_diagnosis_outputs.json"
        if not diag_file.exists():
            return []
        with open(diag_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_responsible_log(self):
        log_file = BASE_DIR / "responsible_ai_log.csv"
        if not log_file.exists():
            return []
        with open(log_file, newline="", encoding="utf-8") as f:
            return list(csv.DictReader(f))

    def save_review(self, payload):
        case_id = payload.get("case_id")
        review_status = payload.get("review_status", "Accepted")
        human_reason = payload.get("human_reason", "")
        final_decision = payload.get("final_decision", "")

        log_file = BASE_DIR / "responsible_ai_log.csv"
        existing = []
        fieldnames = ["case_id", "review_status", "human_reason", "final_decision"]
        
        if log_file.exists():
            with open(log_file, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                existing = list(reader)

        # Update if exists, else append
        updated = False
        for r in existing:
            if r["case_id"] == case_id:
                r["review_status"] = review_status
                r["human_reason"] = human_reason
                r["final_decision"] = final_decision
                updated = True
                break

        if not updated:
            existing.append({
                "case_id": case_id,
                "review_status": review_status,
                "human_reason": human_reason,
                "final_decision": final_decision
            })

        with open(log_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(existing)

        return existing

    def get_stats(self):
        cases = self.get_cases()
        rule_checks = self.get_rule_checks()
        resp_log = self.get_responsible_log()
        
        issue_types = {}
        severity_counts = {}
        osi_counts = {}

        for c in cases:
            itype = c.get("issue_type", "Other")
            sev = c.get("severity", "Medium")
            osi = f"Layer {c.get('osi_layer', '?')}"
            
            issue_types[itype] = issue_types.get(itype, 0) + 1
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
            osi_counts[osi] = osi_counts.get(osi, 0) + 1

        failed_rules = 0
        for r in rule_checks:
            for check in r.get("checks", []):
                if check[1] == "FAIL":
                    failed_rules += 1

        return {
            "total_cases": len(cases),
            "issue_types": issue_types,
            "severity_counts": severity_counts,
            "osi_counts": osi_counts,
            "rule_failures_detected": failed_rules,
            "human_reviews_logged": len(resp_log)
        }

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), NetSageRequestHandler) as httpd:
        print(f"NetSage AI Web Server running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    run_server()
