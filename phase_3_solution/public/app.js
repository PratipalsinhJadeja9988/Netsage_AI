// NetSage AI Web Dashboard Client Application

let globalData = {
  cases: [],
  ruleChecks: [],
  aiDiagnoses: [],
  responsibleLog: [],
  stats: {}
};

let activeCase = null;

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initSearchAndFilters();
  initModal();
  loadAllData();

  document.getElementById("btn-refresh").addEventListener("click", () => {
    loadAllData();
  });
});

// Load all API endpoints asynchronously
async function loadAllData() {
  try {
    const [casesRes, rulesRes, aiRes, logRes, statsRes] = await Promise.all([
      fetch("/api/cases").then(r => r.json()),
      fetch("/api/rule-check").then(r => r.json()),
      fetch("/api/ai-diagnoses").then(r => r.json()),
      fetch("/api/responsible-log").then(r => r.json()),
      fetch("/api/stats").then(r => r.json())
    ]);

    globalData.cases = casesRes;
    globalData.ruleChecks = rulesRes;
    globalData.aiDiagnoses = aiRes;
    globalData.responsibleLog = logRes;
    globalData.stats = statsRes;

    renderStats();
    renderCasesTable();
    renderRulesTable();
    renderAICards();
    renderLogTable();

  } catch (err) {
    console.error("Failed to fetch dashboard data:", err);
    document.getElementById("server-status").innerText = "Connection Error";
  }
}

// Render Dashboard Stat Cards
function renderStats() {
  if (!globalData.stats) return;
  document.getElementById("stat-total-cases").innerText = globalData.stats.total_cases || 0;
  document.getElementById("stat-rule-failures").innerText = globalData.stats.rule_failures_detected || 0;
  document.getElementById("stat-ai-diagnoses").innerText = globalData.aiDiagnoses.length || 0;
  document.getElementById("stat-human-reviews").innerText = globalData.stats.human_reviews_logged || 0;
}

// Tab Switching
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const targetPane = tab.dataset.tab;
      document.querySelectorAll(".tab-pane").forEach(pane => {
        pane.classList.remove("active");
        if (pane.id === targetPane) pane.classList.add("active");
      });
    });
  });
}

// Search and Filter Handlers
function initSearchAndFilters() {
  const searchInput = document.getElementById("search-input");
  const filterType = document.getElementById("filter-type");
  const filterSeverity = document.getElementById("filter-severity");
  const filterOsi = document.getElementById("filter-osi");

  [searchInput, filterType, filterSeverity, filterOsi].forEach(el => {
    el.addEventListener("input", renderCasesTable);
    el.addEventListener("change", renderCasesTable);
  });
}

// Render Cases Table
function renderCasesTable() {
  const tbody = document.getElementById("cases-tbody");
  tbody.innerHTML = "";

  const query = document.getElementById("search-input").value.toLowerCase().trim();
  const typeFilter = document.getElementById("filter-type").value;
  const sevFilter = document.getElementById("filter-severity").value;
  const osiFilter = document.getElementById("filter-osi").value;

  const filtered = globalData.cases.filter(c => {
    const matchesQuery = !query || 
      c.case_id.toLowerCase().includes(query) ||
      c.symptom.toLowerCase().includes(query) ||
      c.expected_fault.toLowerCase().includes(query) ||
      c.issue_type.toLowerCase().includes(query);

    const matchesType = (typeFilter === "ALL") || (c.issue_type === typeFilter);
    const matchesSev = (sevFilter === "ALL") || (c.severity === sevFilter);
    const matchesOsi = (osiFilter === "ALL") || (String(c.osi_layer) === osiFilter);

    return matchesQuery && matchesType && matchesSev && matchesOsi;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">No matching cases found.</td></tr>`;
    return;
  }

  filtered.forEach(c => {
    const tr = document.createElement("tr");

    // Get Log Status
    const reviewLog = globalData.responsibleLog.find(l => l.case_id === c.case_id);
    let reviewBadge = `<span class="badge badge-secondary">Pending</span>`;
    if (reviewLog) {
      if (reviewLog.review_status === "Accepted") reviewBadge = `<span class="badge badge-success"><i class="fa-solid fa-check"></i> Accepted</span>`;
      else if (reviewLog.review_status === "Edited") reviewBadge = `<span class="badge badge-warning"><i class="fa-solid fa-pen"></i> Edited</span>`;
      else if (reviewLog.review_status === "Rejected") reviewBadge = `<span class="badge badge-danger"><i class="fa-solid fa-xmark"></i> Rejected</span>`;
    }

    // Severity Badge Color
    let sevBadgeClass = "badge-primary";
    if (c.severity === "Critical") sevBadgeClass = "badge-danger";
    else if (c.severity === "High") sevBadgeClass = "badge-warning";
    else if (c.severity === "Medium") sevBadgeClass = "badge-info";

    tr.innerHTML = `
      <td><strong>${c.case_id}</strong></td>
      <td><span class="badge badge-primary">${c.issue_type}</span></td>
      <td>Layer ${c.osi_layer}</td>
      <td><span class="badge ${sevBadgeClass}">${c.severity}</span></td>
      <td>${escapeHtml(c.symptom)}</td>
      <td>${escapeHtml(c.expected_fault)}</td>
      <td>
        <button class="btn btn-secondary btn-sm open-case-btn" data-id="${c.case_id}">
          <i class="fa-solid fa-eye"></i> View & Review
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  document.querySelectorAll(".open-case-btn").forEach(btn => {
    btn.addEventListener("click", () => openCaseModal(btn.dataset.id));
  });
}

// Render Rule Checker Table
function renderRulesTable() {
  const tbody = document.getElementById("rules-tbody");
  tbody.innerHTML = "";

  globalData.ruleChecks.forEach(r => {
    r.checks.forEach(check => {
      const [ruleName, status, details] = check;
      const tr = document.createElement("tr");

      const badge = (status === "FAIL") 
        ? `<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> FAIL</span>` 
        : `<span class="badge badge-success"><i class="fa-solid fa-check"></i> PASS</span>`;

      tr.innerHTML = `
        <td><strong>${r.case_id}</strong></td>
        <td><code>${ruleName}</code></td>
        <td>${badge}</td>
        <td>${escapeHtml(details)}</td>
      `;
      tbody.appendChild(tr);
    });
  });

  document.getElementById("btn-rerun-rules").addEventListener("click", () => {
    loadAllData();
  });
}

// Render AI Cards Grid
function renderAICards() {
  const container = document.getElementById("ai-cards-container");
  container.innerHTML = "";

  globalData.aiDiagnoses.forEach(ai => {
    const card = document.createElement("div");
    card.className = "ai-card";

    const fixStepsList = (ai.fix_steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join("");

    card.innerHTML = `
      <div class="ai-card-header">
        <span class="badge badge-primary">Case ${ai.case_id}</span>
        <span class="badge badge-info">${ai.confidence} confidence</span>
      </div>
      <div class="ai-card-title">${escapeHtml(ai.root_cause)}</div>
      <div class="text-sm text-muted"><strong>OSI Layer:</strong> Layer ${ai.osi_layer} | <strong>Concept:</strong> ${ai.concept}</div>
      <div class="ai-card-command"><code>${escapeHtml(ai.next_command)}</code></div>
      <div class="text-sm text-muted">
        <strong>Recommended Fix:</strong>
        <ul style="padding-left: 18px; margin-top: 4px;">${fixStepsList}</ul>
      </div>
      <button class="btn btn-secondary btn-sm open-case-btn" data-id="${ai.case_id}" style="margin-top: auto;">
        <i class="fa-solid fa-user-check"></i> Human Oversight Review
      </button>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll(".open-case-btn").forEach(btn => {
    btn.addEventListener("click", () => openCaseModal(btn.dataset.id));
  });
}

// Render Responsible AI Log Table
function renderLogTable() {
  const tbody = document.getElementById("log-tbody");
  tbody.innerHTML = "";

  globalData.responsibleLog.forEach(log => {
    const tr = document.createElement("tr");

    let badge = `<span class="badge badge-success">Accepted</span>`;
    if (log.review_status === "Edited") badge = `<span class="badge badge-warning">Edited</span>`;
    else if (log.review_status === "Rejected") badge = `<span class="badge badge-danger">Rejected</span>`;

    tr.innerHTML = `
      <td><strong>${log.case_id}</strong></td>
      <td>${badge}</td>
      <td>${escapeHtml(log.human_reason)}</td>
      <td><code style="color: var(--accent-emerald);">${escapeHtml(log.final_decision)}</code></td>
    `;
    tbody.appendChild(tr);
  });
}

// Modal Handlers
function initModal() {
  const modal = document.getElementById("case-modal");
  const closeBtn = document.getElementById("modal-close-btn");
  const cancelBtn = document.getElementById("modal-cancel-btn");
  const form = document.getElementById("review-form");

  [closeBtn, cancelBtn].forEach(b => {
    b.addEventListener("click", () => modal.classList.remove("active"));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!activeCase) return;

    const payload = {
      case_id: activeCase.case_id,
      review_status: document.getElementById("review-status").value,
      human_reason: document.getElementById("human-reason").value,
      final_decision: document.getElementById("final-decision").value
    };

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        modal.classList.remove("active");
        loadAllData();
      } else {
        alert("Failed to submit review: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error submitting review: " + err.message);
    }
  });
}

// Open Modal with Specific Case Details
function openCaseModal(caseId) {
  const c = globalData.cases.find(x => x.case_id === caseId);
  if (!c) return;
  activeCase = c;

  const modal = document.getElementById("case-modal");
  document.getElementById("modal-case-id").innerText = c.case_id;
  document.getElementById("modal-case-title").innerText = `${c.issue_type} Fault Analysis`;
  document.getElementById("modal-symptom").innerText = c.symptom;
  document.getElementById("modal-evidence").innerText = c.evidence;
  document.getElementById("modal-expected-fault").innerText = c.expected_fault;

  // Rule result match
  const ruleMatch = globalData.ruleChecks.find(r => r.case_id === c.case_id);
  const ruleResultEl = document.getElementById("modal-rule-result");
  if (ruleMatch && ruleMatch.checks.length > 0) {
    const check = ruleMatch.checks[0];
    const badge = (check[1] === "FAIL") 
      ? `<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> ${check[0]}</span>`
      : `<span class="badge badge-success"><i class="fa-solid fa-check"></i> ${check[0]}</span>`;
    ruleResultEl.innerHTML = `${badge} <div class="text-sm text-muted" style="margin-top:4px;">${escapeHtml(check[2])}</div>`;
  } else {
    ruleResultEl.innerHTML = `<span class="badge badge-secondary">No rule match</span>`;
  }

  // AI Recommendation match
  const aiDiag = globalData.aiDiagnoses.find(a => a.case_id === c.case_id);
  if (aiDiag) {
    document.getElementById("modal-ai-confidence").innerText = `${aiDiag.confidence} confidence`;
    document.getElementById("modal-ai-rootcause").innerText = aiDiag.root_cause;
    document.getElementById("modal-ai-command").innerText = aiDiag.next_command;
    document.getElementById("modal-ai-fixsteps").innerHTML = (aiDiag.fix_steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join("");
  } else {
    document.getElementById("modal-ai-rootcause").innerText = "No AI model output cached.";
    document.getElementById("modal-ai-command").innerText = "show running-config";
    document.getElementById("modal-ai-fixsteps").innerHTML = "<li>Verify configuration manually.</li>";
  }

  // Pre-fill existing review if present
  const existingLog = globalData.responsibleLog.find(l => l.case_id === c.case_id);
  if (existingLog) {
    document.getElementById("review-status").value = existingLog.review_status;
    document.getElementById("human-reason").value = existingLog.human_reason;
    document.getElementById("final-decision").value = existingLog.final_decision;
  } else {
    document.getElementById("review-status").value = "Accepted";
    document.getElementById("human-reason").value = "";
    document.getElementById("final-decision").value = "";
  }

  modal.classList.add("active");
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
