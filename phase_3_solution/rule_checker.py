#!/usr/bin/env python3
"""
NetSage AI deterministic rule checker.
Checks duplicate IPs, wrong masks, gateway mismatch, interface down,
missing VLAN, and missing routes using simple lab evidence text.
"""

import re, json, csv, sys

def check_case(row):
    evidence = (row.get("evidence") or "").lower()
    symptom = (row.get("symptom") or "").lower()
    findings = []

    if "same ip" in evidence and "different mac" in evidence:
        findings.append(("duplicate_ip", "FAIL", "Duplicate IP evidence detected."))

    if "mask" in evidence and ("incorrect" in evidence or "/16" in evidence):
        findings.append(("wrong_mask", "FAIL", "Possible subnet mask mismatch."))

    if "gateway" in evidence and ("outside" in evidence or "mismatch" in evidence):
        findings.append(("gateway_mismatch", "FAIL", "Default gateway does not match the client subnet."))

    if "administratively down" in evidence or "shutdown" in evidence:
        findings.append(("interface_down", "FAIL", "Interface is administratively down."))

    if "does not list vlan" in evidence or "missing" in evidence and "vlan" in evidence:
        findings.append(("missing_vlan", "FAIL", "Required VLAN appears to be missing."))

    if "no route" in evidence or "no route" in symptom:
        findings.append(("missing_route", "FAIL", "Required route is absent."))

    if not findings:
        findings.append(("basic_checks", "PASS", "No deterministic fault matched; human/AI review required."))

    return findings

def main(path="cases.csv"):
    with open(path, newline="", encoding="utf-8") as f:
        rows=list(csv.DictReader(f))
    report=[]
    for r in rows:
        report.append({"case_id":r["case_id"],"checks":check_case(r)})
    print(json.dumps(report, indent=2))
    with open("checker_output.json","w",encoding="utf-8") as f:
        json.dump(report,f,indent=2)

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv)>1 else "cases.csv")
