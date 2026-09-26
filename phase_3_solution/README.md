# NetSage AI — Cisco AICTE VIP Phase 3

This package implements the AI-domain problem statement supplied by the student.

## Included
- cases.csv — 30 troubleshooting cases covering VLAN, gateway, DHCP, DNS, routing, ACL, NAT, wireless and related basic faults.
- diagnose_prompt.md — structured JSON diagnosis prompt + worked examples.
- rule_checker.py — deterministic checks for duplicate IP, wrong masks, gateway mismatch, interface down, missing VLAN and missing routes.
- ai_diagnosis_outputs.json — sample diagnosis records.
- responsible_ai_log.csv — human review log with more than five reviewed/corrected cases.
- dashboard.py — runnable Python/Tkinter dashboard.
- packet_tracer_lab_guide.txt — topology/build guide for creating the Cisco Packet Tracer demonstration manually.

## Run
1. Install Python 3.
2. Open this folder in Command Prompt.
3. Run: python rule_checker.py
4. Run: python dashboard.py

## Important
The supplied problem statement is the AI-domain project. Its listed project deliverable is a code file, not a .pkt file. A native Cisco Packet Tracer `.pkt` is a proprietary project file and must be saved from Cisco Packet Tracer itself. This package therefore includes the runnable AI solution and a Packet Tracer lab guide for the required demonstration topology; it does not falsely label a non-Packet-Tracer file as `.pkt`.

## Human review
The dashboard/records are designed so the AI recommendation is not treated as an automatic fix. The reviewer must accept, edit or reject the diagnosis before a configuration change is considered final.
