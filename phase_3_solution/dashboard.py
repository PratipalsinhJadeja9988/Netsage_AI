import csv, tkinter as tk
from tkinter import ttk, messagebox
from pathlib import Path

BASE=Path(__file__).parent

def load():
    with open(BASE/"cases.csv",newline="",encoding="utf-8") as f:
        return list(csv.DictReader(f))

rows=load()

root=tk.Tk()
root.title("NetSage AI - Troubleshooting Dashboard")
root.geometry("1050x650")

top=ttk.Frame(root,padding=12); top.pack(fill="x")
ttk.Label(top,text="NetSage AI",font=("Segoe UI",20,"bold")).pack(anchor="w")
ttk.Label(top,text="AI-assisted Cisco lab troubleshooting with mandatory human review").pack(anchor="w")

stats=ttk.Frame(root,padding=12); stats.pack(fill="x")
types={}
for r in rows: types[r["issue_type"]]=types.get(r["issue_type"],0)+1
ttk.Label(stats,text=f"Cases: {len(rows)}    Issue types: {len(types)}    Human-correction cases: 5+").pack(anchor="w")

frame=ttk.Frame(root,padding=12); frame.pack(fill="both",expand=True)
cols=("case_id","issue_type","severity","osi_layer","expected_fault")
tree=ttk.Treeview(frame,columns=cols,show="headings")
for c in cols:
    tree.heading(c,text=c.replace("_"," ").title())
    tree.column(c,width=150)
tree.pack(side="left",fill="both",expand=True)

sb=ttk.Scrollbar(frame,orient="vertical",command=tree.yview); sb.pack(side="right",fill="y")
tree.configure(yscrollcommand=sb.set)
for r in rows: tree.insert("", "end", values=tuple(r[c] for c in cols))

def show_case():
    sel=tree.selection()
    if not sel: return
    cid=tree.item(sel[0])["values"][0]
    r=next(x for x in rows if x["case_id"]==cid)
    msg=(f"SYMPTOM\n{r['symptom']}\n\nEVIDENCE\n{r['evidence']}\n\n"
         f"EXPECTED FAULT\n{r['expected_fault']}\n\nOSI LAYER\n{r['osi_layer']}\n\n"
         f"NEXT STEP\nReview the evidence, run the suggested show command, then obtain human approval.")
    messagebox.showinfo(f"Case {cid}",msg)

ttk.Button(root,text="Open Selected Case",command=show_case).pack(pady=8)
root.mainloop()
