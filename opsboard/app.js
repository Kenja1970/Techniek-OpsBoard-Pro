/* ===========================================================================
   Techniek OpsBoard Pro
   Local-first engineering management workboard. Zero dependencies.
   ---------------------------------------------------------------------------
   All seeded content is fictional Techniek demo data.
   Data is stored in this browser via localStorage unless exported.
   ========================================================================= */
(function () {
  "use strict";

  /* ----------------------------------------------------------------------- *
   * Constants & configuration
   * ----------------------------------------------------------------------- */
  var STORAGE_KEY = "techniek-opsboard-pro";
  var ACCOUNTS_KEY = "techniek-opsboard-accounts";
  var SCHEMA_VERSION = "2.2.0";
  var APP_VERSION = "2.5.1";

  // A/E financials & PMO resource model.
  var CONTRACT_TYPES = ["T&M", "FP"];           // Time & Materials / Firm Fixed Price
  var RESOURCE_TYPES = ["Employee", "Subcontractor", "Tool / Software", "Equipment", "Facility", "Material", "Other"];
  var RESOURCE_STATUS = ["Active", "Inactive", "On Leave", "Planned"];
  var DEFAULT_TARGET_CM_PCT = 66.7;             // ~3.0x multiplier

  // PMI integrated change control.
  var CO_CATEGORIES = ["Scope", "Budget", "Schedule", "Quality", "Resource", "Other"];
  var CO_STATUS = ["Requested", "Under Review", "Approved", "Rejected", "Implemented"];
  var PROJECT_STATUS = ["Active", "Pursuit", "On Hold", "Closed", "Cancelled"];

  // PMBOK risk-response strategies and qualitative scales.
  var RISK_RESPONSES = ["Avoid", "Mitigate", "Transfer", "Accept"];
  var RISK_STATUS = ["Open", "Mitigating", "Closed"];
  var RISK_SCALE = [
    { v: 1, label: "Very Low" }, { v: 2, label: "Low" }, { v: 3, label: "Moderate" },
    { v: 4, label: "High" }, { v: 5, label: "Very High" },
  ];
  // Render at most this many cards per column before "Show more" (200+ card UX).
  var COLUMN_RENDER_CAP = 20;

  var ROLES = [
    "Admin",
    "Department Manager",
    "Project Manager",
    "Resource Manager",
    "Engineer / Contributor",
    "Viewer",
  ];
  // Roles allowed to see cost / revenue / margin.
  var FINANCIAL_ROLES = ["Admin", "Department Manager", "Project Manager", "Resource Manager"];
  var READONLY_ROLES = ["Viewer"];

  var PRIORITIES = ["critical", "high", "medium", "low"];
  var CARD_TYPES = ["Task", "Feature", "Bug", "Proposal", "Milestone", "Risk", "Research"];

  var LABEL_COLORS = {
    Backend: "#2563eb",
    Frontend: "#7c3aed",
    Mechanical: "#0d9488",
    Electrical: "#ca8a04",
    Safety: "#dc2626",
    Documentation: "#64748b",
    Client: "#db2777",
    Compliance: "#b45309",
    Research: "#0891b2",
    Marketing: "#16a34a",
  };

  var NAV = [
    { id: "dashboard", label: "Dashboard", ico: "▦" },
    { id: "board", label: "Kanban Board", ico: "▤" },
    { id: "resources", label: "Resources", ico: "▣" },
    { id: "projects", label: "Projects", ico: "▥" },
    { id: "changecontrol", label: "Change Control", ico: "⇄" },
    { id: "gantt", label: "Gantt & Critical Path", ico: "▰" },
    { id: "risks", label: "Risk Register", ico: "△" },
    { id: "reports", label: "Manager Report", ico: "▧" },
    { id: "client", label: "Client Report", ico: "▨" },
    { id: "settings", label: "Settings / Data", ico: "⚙" },
    { id: "help", label: "Help", ico: "?" },
  ];

  /* ----------------------------------------------------------------------- *
   * Small utilities
   * ----------------------------------------------------------------------- */
  function uid(prefix) {
    return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 9);
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function money(n) {
    if (n == null || isNaN(n)) return "—";
    var v = Math.round(n);
    return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US");
  }
  function hours(n) { return (Math.round(n * 10) / 10) + "h"; }
  function pct(n) { return Math.round(n) + "%"; }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function parseDate(s) { return s ? new Date(s + "T00:00:00") : null; }
  function fmtDate(s) {
    var d = parseDate(s);
    if (!d) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function fmtDateLong(s) {
    var d = parseDate(s);
    if (!d) return "—";
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  function daysUntil(s) {
    var d = parseDate(s);
    if (!d) return null;
    var t = new Date(todayISO() + "T00:00:00");
    return Math.round((d - t) / 86400000);
  }
  function initials(name) {
    if (!name) return "?";
    var p = name.trim().split(/\s+/);
    return ((p[0] || "")[0] || "" ) + ((p[1] || "")[0] || "");
  }
  function avatarColor(seed) {
    var colors = ["#2563eb", "#0d9488", "#7c3aed", "#db2777", "#ca8a04", "#dc2626", "#0891b2", "#16a34a", "#9333ea"];
    var h = 0;
    for (var i = 0; i < (seed || "").length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return colors[h % colors.length];
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") n.className = attrs[k];
      else if (k === "dataset") for (var d in attrs[k]) n.dataset[d] = attrs[k][d];
      else n.setAttribute(k, attrs[k]);
    }
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ----------------------------------------------------------------------- *
   * Demo workspace (fictional Techniek data)
   * ----------------------------------------------------------------------- */
  function demoWorkspace() {
    var R = function (name, role, dept, cap, cost, bill, type, company) {
      return { id: uid("r"), name: name, role: role, dept: dept, type: type || "Employee", company: company || "Techniek",
        capacityHrs: cap, costRate: cost, billRate: bill, unit: "hour", status: "Active", notes: "" };
    };
    // Bill rates set so demo billable projects show clean A/E multipliers
    // (Harbor 3.0x, Substation 2.4x, Wind Farm SCADA 4.5x).
    var resources = [
      R("Maaike de Vries", "Project Manager", "Engineering", 32, 85, 255),
      R("Sven Bakker", "Senior Engineer", "Mechanical", 38, 78, 234),
      R("Imran Haddad", "Engineer", "Electrical", 40, 68, 163),
      R("Lotte Janssen", "Engineer", "Software", 36, 72, 173),
      R("Pieter Vermeer", "Resource Manager", "Operations", 30, 80, 0),
      R("Anja Koster", "Proposal Lead", "Business Dev", 34, 76, 0),
      R("Diego Romero", "Engineer", "Software", 40, 66, 158),
      R("Femke Visser", "Designer", "Digital", 36, 60, 110),
      R("Karl Mensah", "Principal Engineer", "Controls", 30, 110, 495),
      R("Apex Controls LLC", "Subcontract crew", "Electrical", 60, 95, 150, "Subcontractor", "Apex Controls LLC"),
      R("SCADA Sim License", "Simulation software", "Controls", 0, 40, 0, "Tool / Software", "Techniek"),
    ];
    var rid = {};
    resources.forEach(function (r) { rid[r.name] = r.id; });

    function col(name, wip) { return { id: uid("col"), name: name, wip: wip || 0 }; }

    var boards = [
      {
        id: uid("b"), name: "Engineering Delivery", type: "engineering",
        columns: [col("Backlog"), col("Ready"), col("In Progress", 4), col("Review"), col("Done")],
        rosterIds: [rid["Maaike de Vries"], rid["Sven Bakker"], rid["Imran Haddad"], rid["Lotte Janssen"], rid["Diego Romero"], rid["Karl Mensah"], rid["Apex Controls LLC"]],
      },
      {
        id: uid("b"), name: "Proposals & BD", type: "bizdev",
        columns: [col("Identified"), col("Qualifying"), col("Proposal"), col("Gate Review"), col("Submitted"), col("Won/Lost")],
        rosterIds: [rid["Anja Koster"], rid["Maaike de Vries"]],
      },
      {
        id: uid("b"), name: "Website & Digital", type: "digital",
        columns: [col("Ideas"), col("Designing"), col("Building", 3), col("QA"), col("Live")],
        rosterIds: [rid["Femke Visser"], rid["Diego Romero"], rid["Lotte Janssen"]],
      },
      {
        id: uid("b"), name: "Operations", type: "operations",
        columns: [col("Inbox"), col("This Week"), col("Doing"), col("Blocked"), col("Complete")],
        rosterIds: [rid["Pieter Vermeer"], rid["Maaike de Vries"]],
      },
    ];
    var bid = {};
    boards.forEach(function (b) { bid[b.name] = b; });

    var projects = [
      { id: uid("p"), name: "Harbor Crane Retrofit", client: "Port of Houston Authority", boardId: bid["Engineering Delivery"].id, budget: 184000, billable: true, contractType: "T&M", startDate: "2026-04-01", endDate: "2026-08-15", status: "Active" },
      { id: uid("p"), name: "Substation Control Upgrade", client: "Midwest Grid & Power", boardId: bid["Engineering Delivery"].id, budget: 96000, billable: true, contractType: "T&M", startDate: "2026-05-12", endDate: "2026-07-30", status: "Active" },
      { id: uid("p"), name: "Wind Farm SCADA Integration", client: "Gulf Coast Wind", boardId: bid["Engineering Delivery"].id, budget: 142000, billable: true, contractType: "FP", startDate: "2026-05-01", endDate: "2026-09-10", status: "Active" },
      { id: uid("p"), name: "Offshore Survey Bid", client: "Gulf Coast Wind", boardId: bid["Proposals & BD"].id, budget: 28000, billable: false, contractType: "T&M", startDate: "2026-06-01", endDate: "2026-07-05", status: "Pursuit" },
      { id: uid("p"), name: "Corporate Site Relaunch", client: "Techniek (internal)", boardId: bid["Website & Digital"].id, budget: 32000, billable: false, contractType: "FP", startDate: "2026-05-01", endDate: "2026-07-20", status: "Active" },
      { id: uid("p"), name: "Workshop Lean Rollout", client: "Techniek (internal)", boardId: bid["Operations"].id, budget: 15000, billable: false, contractType: "T&M", startDate: "2026-06-01", endDate: "2026-09-01", status: "Active" },
    ];
    var pid = {};
    projects.forEach(function (p) { pid[p.name] = p; });

    var cards = [];
    var order = 0;
    function card(board, colName, o) {
      var b = bid[board];
      var c = b.columns.filter(function (x) { return x.name === colName; })[0] || b.columns[0];
      var base = {
        id: uid("c"), boardId: b.id, columnId: c.id, projectId: o.project ? pid[o.project].id : null,
        title: o.title, desc: o.desc || "", assigneeId: o.assignee ? rid[o.assignee] : null,
        priority: o.priority || "medium", type: o.type || "Task", labels: o.labels || [],
        due: o.due || null, startDate: o.start || null, estimateHours: o.est || 0, loggedHours: o.logged || 0,
        progress: o.progress != null ? o.progress : (colName === "Done" || colName === "Live" || colName === "Complete" ? 100 : 0),
        milestone: !!o.milestone, deps: [], checklist: o.checklist || [], comments: [],
        activity: [{ text: "Card created", ts: Date.now() - (o.age || 1) * 86400000 }],
        createdAt: Date.now() - (o.age || 1) * 86400000, order: order++,
      };
      cards.push(base);
      return base;
    }

    // Engineering Delivery
    card("Engineering Delivery", "In Progress", { title: "Hydraulic actuator FEA validation", project: "Harbor Crane Retrofit", assignee: "Sven Bakker", priority: "high", type: "Feature", labels: ["Mechanical", "Safety"], due: "2026-06-26", est: 40, logged: 22, progress: 55, age: 30, checklist: [{ id: uid("ck"), text: "Mesh refinement", done: true }, { id: uid("ck"), text: "Load cases", done: true }, { id: uid("ck"), text: "Report sign-off", done: false }] });
    card("Engineering Delivery", "In Progress", { title: "PLC control loop tuning", project: "Substation Control Upgrade", assignee: "Imran Haddad", priority: "high", type: "Task", labels: ["Electrical"], due: "2026-06-22", est: 24, logged: 14, progress: 60, age: 18 });
    card("Engineering Delivery", "Review", { title: "Crane safety interlock spec", project: "Harbor Crane Retrofit", assignee: "Maaike de Vries", priority: "critical", type: "Risk", labels: ["Safety", "Compliance"], due: "2026-06-19", est: 16, logged: 16, progress: 90, age: 24 });
    card("Engineering Delivery", "Ready", { title: "Sensor harness routing", project: "Substation Control Upgrade", assignee: "Imran Haddad", priority: "medium", type: "Task", labels: ["Electrical"], due: "2026-07-04", est: 18, logged: 0, age: 8 });
    card("Engineering Delivery", "Backlog", { title: "Corrosion coating selection", project: "Harbor Crane Retrofit", assignee: "Sven Bakker", priority: "low", type: "Research", labels: ["Mechanical"], due: "2026-07-15", est: 12, logged: 0, age: 5 });
    card("Engineering Delivery", "In Progress", { title: "Control cabinet wiring diagrams", project: "Substation Control Upgrade", assignee: "Lotte Janssen", priority: "medium", type: "Feature", labels: ["Electrical", "Documentation"], due: "2026-06-28", est: 28, logged: 10, progress: 35, age: 14 });
    card("Engineering Delivery", "Done", { title: "Kickoff & requirements baseline", project: "Harbor Crane Retrofit", assignee: "Maaike de Vries", priority: "medium", type: "Milestone", labels: ["Client"], due: "2026-04-10", est: 12, logged: 12, milestone: true, age: 70 });
    card("Engineering Delivery", "Done", { title: "Grid interface FAT", project: "Substation Control Upgrade", assignee: "Diego Romero", priority: "high", type: "Task", labels: ["Electrical"], due: "2026-06-05", est: 20, logged: 21, age: 40 });
    card("Engineering Delivery", "Backlog", { title: "Commissioning milestone", project: "Harbor Crane Retrofit", assignee: "Maaike de Vries", priority: "high", type: "Milestone", labels: ["Client"], due: "2026-08-12", est: 8, logged: 0, milestone: true, age: 2 });
    // Wind Farm SCADA Integration (FP, 4.5x via Karl Mensah)
    card("Engineering Delivery", "In Progress", { title: "SCADA gateway architecture", project: "Wind Farm SCADA Integration", assignee: "Karl Mensah", priority: "high", type: "Feature", labels: ["Electrical"], start: "2026-05-04", due: "2026-06-30", est: 60, logged: 30, progress: 50, age: 28 });
    card("Engineering Delivery", "Ready", { title: "Turbine protocol mapping", project: "Wind Farm SCADA Integration", assignee: "Karl Mensah", priority: "medium", type: "Task", labels: ["Electrical"], start: "2026-07-01", due: "2026-07-25", est: 40, logged: 10, progress: 20, age: 10 });
    card("Engineering Delivery", "Backlog", { title: "SCADA factory acceptance test", project: "Wind Farm SCADA Integration", assignee: "Karl Mensah", priority: "high", type: "Milestone", labels: ["Client"], due: "2026-09-05", est: 16, logged: 0, milestone: true, age: 3 });

    // Proposals & BD
    card("Proposals & BD", "Proposal", { title: "Offshore survey technical narrative", project: "Offshore Survey Bid", assignee: "Anja Koster", priority: "high", type: "Proposal", labels: ["Client"], due: "2026-06-27", est: 30, logged: 12, progress: 40, age: 12 });
    card("Proposals & BD", "Gate Review", { title: "Pricing & margin gate", project: "Offshore Survey Bid", assignee: "Maaike de Vries", priority: "critical", type: "Risk", labels: ["Compliance"], due: "2026-06-24", est: 6, logged: 2, age: 6 });
    card("Proposals & BD", "Qualifying", { title: "Win-theme workshop", project: "Offshore Survey Bid", assignee: "Anja Koster", priority: "medium", type: "Task", due: "2026-06-30", est: 8, logged: 0, age: 3 });
    card("Proposals & BD", "Submitted", { title: "Past performance dossier", project: "Offshore Survey Bid", assignee: "Anja Koster", priority: "low", type: "Task", labels: ["Documentation"], due: "2026-06-15", est: 10, logged: 10, age: 20 });

    // Website & Digital
    card("Website & Digital", "Building", { title: "Project portfolio gallery", project: "Corporate Site Relaunch", assignee: "Femke Visser", priority: "medium", type: "Feature", labels: ["Frontend"], due: "2026-06-29", est: 22, logged: 9, progress: 40, age: 16 });
    card("Website & Digital", "Designing", { title: "Service pages content model", project: "Corporate Site Relaunch", assignee: "Femke Visser", priority: "medium", type: "Task", labels: ["Documentation"], due: "2026-07-03", est: 14, logged: 4, progress: 25, age: 9 });
    card("Website & Digital", "QA", { title: "Accessibility audit (WCAG AA)", project: "Corporate Site Relaunch", assignee: "Diego Romero", priority: "high", type: "Task", labels: ["Frontend", "Compliance"], due: "2026-06-23", est: 10, logged: 6, progress: 65, age: 7 });
    card("Website & Digital", "Live", { title: "Careers landing page", project: "Corporate Site Relaunch", assignee: "Lotte Janssen", priority: "low", type: "Feature", labels: ["Frontend", "Marketing"], due: "2026-06-01", est: 12, logged: 12, age: 30 });
    card("Website & Digital", "Ideas", { title: "Case study: Harbor Crane", project: "Corporate Site Relaunch", assignee: "Femke Visser", priority: "low", type: "Research", labels: ["Marketing"], due: "2026-07-12", est: 8, logged: 0, age: 2 });

    // Operations
    card("Operations", "Doing", { title: "5S audit — main workshop", project: "Workshop Lean Rollout", assignee: "Pieter Vermeer", priority: "medium", type: "Task", due: "2026-06-25", est: 10, logged: 4, progress: 40, age: 10 });
    card("Operations", "Blocked", { title: "Calibration lab scheduling", project: "Workshop Lean Rollout", assignee: "Pieter Vermeer", priority: "high", type: "Risk", due: "2026-06-20", est: 6, logged: 1, age: 8 });
    card("Operations", "This Week", { title: "Quarterly QHSE training", project: "Workshop Lean Rollout", assignee: "Pieter Vermeer", priority: "medium", type: "Task", labels: ["Compliance"], due: "2026-06-27", est: 8, logged: 0, age: 4 });
    card("Operations", "Inbox", { title: "Tooling inventory reconcile", project: "Workshop Lean Rollout", assignee: "Pieter Vermeer", priority: "low", type: "Task", due: "2026-07-08", est: 5, logged: 0, age: 1 });

    // Add a couple of dependencies between engineering cards.
    var engCards = cards.filter(function (c) { return c.boardId === bid["Engineering Delivery"].id; });
    if (engCards.length >= 4) { engCards[2].deps = [engCards[0].id]; engCards[3].deps = [engCards[1].id]; }

    var risks = [
      { id: uid("rk"), projectId: pid["Harbor Crane Retrofit"].id, title: "Long-lead actuator delivery slips past commissioning", category: "Schedule", probability: 3, impact: 5, response: "Mitigate", ownerId: rid["Maaike de Vries"], status: "Mitigating", trigger: "Vendor confirmation past Jul 1", notes: "Expedite PO; qualify second supplier." },
      { id: uid("rk"), projectId: pid["Harbor Crane Retrofit"].id, title: "Safety interlock fails client acceptance", category: "Technical", probability: 2, impact: 5, response: "Avoid", ownerId: rid["Sven Bakker"], status: "Open", trigger: "FAT defect on interlock", notes: "Independent design review before FAT." },
      { id: uid("rk"), projectId: pid["Substation Control Upgrade"].id, title: "Grid interface standard revision during build", category: "Compliance", probability: 2, impact: 4, response: "Transfer", ownerId: rid["Imran Haddad"], status: "Open", trigger: "Utility issues new spec", notes: "Contract change-order clause." },
      { id: uid("rk"), projectId: pid["Offshore Survey Bid"].id, title: "Pricing below cost to win", category: "Cost", probability: 3, impact: 4, response: "Mitigate", ownerId: rid["Anja Koster"], status: "Open", trigger: "Competitor undercut", notes: "Hold margin gate; scope options." },
      { id: uid("rk"), projectId: pid["Workshop Lean Rollout"].id, title: "Calibration lab unavailable blocks audit", category: "Resource", probability: 4, impact: 3, response: "Accept", ownerId: rid["Pieter Vermeer"], status: "Mitigating", trigger: "Lab booked >2 weeks", notes: "Shift audit window; pre-book slots." },
    ];

    // Capture each project's original baseline (for change-control variance).
    projects.forEach(function (p) { p.baseline = { budget: p.budget, endDate: p.endDate }; });

    var changeOrders = [
      { id: uid("co"), projectId: pid["Harbor Crane Retrofit"].id, number: "CO-001", title: "Add cathodic protection scope", category: "Scope",
        description: "Client requested cathodic protection on the lower assembly after site survey.", requestedBy: "Rotterdam ops",
        requestedDate: "2026-05-20", budgetDelta: 18000, scheduleDeltaDays: 10,
        scopeItems: [{ title: "Cathodic protection design", estimate: 24 }, { title: "Install & test anodes", estimate: 16 }],
        status: "Approved", decidedDate: "2026-05-28", decidedBy: "Maaike de Vries", notes: "Approved at CCB; funded.", applied: true, createdCardIds: [] },
      { id: uid("co"), projectId: pid["Substation Control Upgrade"].id, number: "CO-002", title: "Schedule extension for utility outage window", category: "Schedule",
        description: "Utility moved the cutover window two weeks later.", requestedBy: "Stedin coordination",
        requestedDate: "2026-06-10", budgetDelta: 0, scheduleDeltaDays: 14, scopeItems: [],
        status: "Under Review", decidedDate: "", decidedBy: "", notes: "Awaiting CCB.", applied: false, createdCardIds: [] },
      { id: uid("co"), projectId: pid["Harbor Crane Retrofit"].id, number: "CO-003", title: "Additional load-test instrumentation", category: "Budget",
        description: "Extra strain gauges requested for acceptance testing.", requestedBy: "QA",
        requestedDate: "2026-06-18", budgetDelta: 6500, scheduleDeltaDays: 0, scopeItems: [{ title: "Instrument & calibrate strain gauges", estimate: 12 }],
        status: "Requested", decidedDate: "", decidedBy: "", notes: "", applied: false, createdCardIds: [] },
    ];

    // Reflect the already-approved CO-001 in the live baseline + scope so the demo
    // is internally consistent (budget/end already include it; scope cards exist).
    var hc = pid["Harbor Crane Retrofit"];
    hc.budget += 18000;
    hc.endDate = "2026-08-25";
    var hcBoard = bid["Engineering Delivery"];
    var co1 = changeOrders[0];
    [["Cathodic protection design", 24], ["Install & test anodes", 16]].forEach(function (it) {
      var nc = { id: uid("c"), boardId: hcBoard.id, columnId: hcBoard.columns[0].id, projectId: hc.id, title: it[0], desc: "Added via " + co1.number, assigneeId: rid["Sven Bakker"], priority: "medium", type: "Task", labels: ["Client"], due: null, startDate: null, estimateHours: it[1], loggedHours: 0, progress: 0, milestone: false, deps: [], checklist: [], comments: [], activity: [{ text: "Added by change order " + co1.number, ts: Date.now() }], createdAt: Date.now(), order: order++ };
      cards.push(nc); co1.createdCardIds.push(nc.id);
    });

    return {
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
      activeBoardId: boards[0].id,
      resources: resources,
      boards: boards,
      projects: projects,
      cards: cards,
      risks: risks,
      changeOrders: changeOrders,
      history: buildInitialHistory(boards, cards),
      settings: { role: "Department Manager", theme: "light", compact: false,
        targetContributionMarginPct: DEFAULT_TARGET_CM_PCT, apiEndpoint: "", apiKey: "" },
    };
  }

  function buildInitialHistory(boards, cards) {
    // Synthetic 6-week portfolio progress trend for charts/reports.
    var weeks = [];
    var totalDone = cards.filter(function (c) { return c.progress >= 100; }).length;
    var base = Math.max(2, totalDone - 5);
    for (var i = 5; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i * 7);
      weeks.push({
        week: d.toISOString().slice(0, 10),
        completed: Math.min(cards.length, base + (5 - i) * 1 + (i === 0 ? totalDone - base - 5 : 0)),
        total: cards.length,
      });
    }
    return weeks;
  }

  /* ----------------------------------------------------------------------- *
   * State management + persistence + undo/redo
   * ----------------------------------------------------------------------- */
  var state = null;          // current workspace
  var undoStack = [];
  var redoStack = [];
  var ui = { view: "dashboard", filterAssignee: "", filterPriority: "", filterText: "", navOpen: false,
             collapsed: {}, reveal: {}, colFilter: {} };
  var accounts = null;       // { users: [...], currentUserId }

  // Per-user workspace storage key. Legacy single-user data lives at STORAGE_KEY.
  function wsKey(userId) { return userId ? STORAGE_KEY + "::" + userId : STORAGE_KEY; }
  function load(userId) {
    try {
      var raw = localStorage.getItem(wsKey(userId));
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.boards && parsed.cards) return migrate(parsed);
      }
    } catch (e) { /* fall through to demo */ }
    return demoWorkspace();
  }
  function migrate(ws) {
    if (!ws.version) ws.version = SCHEMA_VERSION;
    if (!ws.settings) ws.settings = { role: "Department Manager", theme: "light" };
    if (ws.settings.compact == null) ws.settings.compact = false;
    if (!ws.history) ws.history = buildInitialHistory(ws.boards, ws.cards);
    if (!ws.risks) ws.risks = [];
    if (!ws.changeOrders) ws.changeOrders = [];
    if (ws.settings.targetContributionMarginPct == null) ws.settings.targetContributionMarginPct = DEFAULT_TARGET_CM_PCT;
    if (ws.settings.apiEndpoint == null) ws.settings.apiEndpoint = "";
    if (ws.settings.apiKey == null) ws.settings.apiKey = "";
    (ws.projects || []).forEach(function (p) {
      if (!p.baseline) p.baseline = { budget: p.budget, endDate: p.endDate };
      if (!p.status) p.status = "Active";
      if (!p.contractType) p.contractType = "T&M";
    });
    (ws.resources || []).forEach(function (r) {
      if (!r.type) r.type = "Employee";
      if (r.company == null) r.company = "Techniek";
      if (!r.unit) r.unit = "hour";
      if (!r.status) r.status = "Active";
      if (r.notes == null) r.notes = "";
    });
    ws.version = SCHEMA_VERSION;
    return ws;
  }
  function save() {
    state.savedAt = Date.now();
    updateHistoryCheckpoint();
    try { localStorage.setItem(wsKey(accounts && accounts.currentUserId), JSON.stringify(state)); }
    catch (e) { toast("Could not save to localStorage", "err"); }
    updateSavedStamp();
  }
  // Keep the current week's completion checkpoint live so card create/move/edit
  // immediately flows into the dashboard trend and reports (PMI progress tracking).
  function updateHistoryCheckpoint() {
    if (!state.history) return;
    var done = state.cards.filter(function (c) { return isDone(c); }).length;
    var total = state.cards.length;
    var d = new Date();
    var monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    var wk = monday.toISOString().slice(0, 10);
    var last = state.history[state.history.length - 1];
    if (last && last.week === wk) { last.completed = done; last.total = total; }
    else { state.history.push({ week: wk, completed: done, total: total }); if (state.history.length > 52) state.history.shift(); }
  }
  function snapshot() {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
    refreshUndoRedo();
  }
  function commit() { save(); render(); }
  function mutate(fn) { snapshot(); fn(); commit(); }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify(state));
    state = JSON.parse(undoStack.pop());
    save(); render(); refreshUndoRedo(); toast("Undone");
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(state));
    state = JSON.parse(redoStack.pop());
    save(); render(); refreshUndoRedo(); toast("Redone");
  }
  function refreshUndoRedo() {
    var u = $("#undoBtn"), r = $("#redoBtn");
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }

  /* ----------------------------------------------------------------------- *
   * Accounts & authentication (local profiles; enterprise SSO is a stub)
   * ----------------------------------------------------------------------- *
   * This is a LOCAL convenience gate, not enterprise-grade security. Each user
   * gets an isolated workspace in localStorage. Optional passphrases are stored
   * only as a salted SHA-256 hash (never in plaintext). Real SSO requires a
   * backend identity provider — see docs/automation/improvement-backlog.md.
   * ----------------------------------------------------------------------- */
  function loadAccounts() {
    try { var a = JSON.parse(localStorage.getItem(ACCOUNTS_KEY)); if (a && a.users) return a; } catch (e) {}
    return { users: [], currentUserId: null };
  }
  function saveAccounts() { try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); } catch (e) {} }
  function currentUser() { return accounts.users.filter(function (u) { return u.id === accounts.currentUserId; })[0] || null; }
  function userById(id) { return accounts.users.filter(function (u) { return u.id === id; })[0] || null; }

  function randSalt() {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    }
    return String(Math.random()).slice(2) + String(Math.random()).slice(2);
  }
  // Returns a Promise<string hash>. Uses SubtleCrypto where available (secure
  // contexts incl. https Pages); falls back to a non-crypto hash on file://.
  function hashPass(pass, salt) {
    var msg = salt + "::" + pass;
    if (window.crypto && crypto.subtle && window.isSecureContext) {
      var bytes = new TextEncoder().encode(msg);
      return crypto.subtle.digest("SHA-256", bytes).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      });
    }
    var h = 5381;
    for (var i = 0; i < msg.length; i++) h = ((h << 5) + h + msg.charCodeAt(i)) >>> 0;
    return Promise.resolve("fnv" + h.toString(16));
  }

  function createUser(displayName, pass, role) {
    var id = uid("u");
    var user = { id: id, displayName: displayName, role: role || "Department Manager", hasPass: !!pass, salt: randSalt(), hash: null, createdAt: Date.now() };
    var finish = function () { accounts.users.push(user); accounts.currentUserId = id; saveAccounts(); markUnlocked(id); };
    if (pass) return hashPass(pass, user.salt).then(function (h) { user.hash = h; finish(); return user; });
    finish(); return Promise.resolve(user);
  }
  function verifyPass(user, pass) {
    if (!user.hasPass) return Promise.resolve(true);
    return hashPass(pass, user.salt).then(function (h) { return h === user.hash; });
  }
  // Session unlock (per browser session) so a passphrase isn't asked every render.
  function markUnlocked(id) { try { sessionStorage.setItem("opsboard-unlocked", id); } catch (e) {} }
  function isUnlocked(id) { try { return sessionStorage.getItem("opsboard-unlocked") === id; } catch (e) { return true; } }
  function needsUnlock(user) { return user && user.hasPass && !isUnlocked(user.id); }

  function enterApp(userId) {
    accounts.currentUserId = userId; saveAccounts(); markUnlocked(userId);
    state = load(userId);
    var u = userById(userId);
    if (u && u.role) state.settings.role = u.role; // signed-in user's role drives visibility
    undoStack.length = 0; redoStack.length = 0;
    hideAuthGate();
    ui.view = "dashboard";
    render();
    if (!localStorage.getItem(wsKey(userId))) save();
    toast("Signed in as " + (userById(userId) || {}).displayName, "ok");
  }
  function logout() {
    try { sessionStorage.removeItem("opsboard-unlocked"); } catch (e) {}
    accounts.currentUserId = null; saveAccounts();
    renderAuthGate();
  }

  function hideAuthGate() { var g = $("#authGate"); if (g) g.remove(); document.getElementById("app").style.visibility = "visible"; }
  function renderAuthGate(prefillUserId) {
    document.getElementById("app").style.visibility = "hidden";
    var existing = $("#authGate"); if (existing) existing.remove();
    var gate = el("div", { id: "authGate", class: "auth-gate" });
    var card = el("div", { class: "auth-card" });

    var users = accounts.users;
    var selectedId = prefillUserId || (users[0] && users[0].id);
    function draw() {
      var sel = userById(selectedId);
      card.innerHTML =
        "<div class='auth-brand'><div class='brand-mark'>TO</div><div><strong>Techniek OpsBoard Pro</strong><div class='faint' style='font-size:12px'>Sign in to your workspace</div></div></div>";
      var content = el("div");
      if (users.length) {
        content.appendChild(el("label", { class: "field-label inline" }, "Profile"));
        var usel = el("select", { class: "select", id: "authUser", style: "width:100%" },
          users.map(function (u) { return "<option value='" + u.id + "'" + (u.id === selectedId ? " selected" : "") + ">" + esc(u.displayName) + " · " + esc(u.role) + (u.hasPass ? " 🔒" : "") + "</option>"; }).join(""));
        usel.addEventListener("change", function () { selectedId = this.value; draw(); });
        content.appendChild(usel);
        if (sel && sel.hasPass) {
          content.appendChild(el("label", { class: "field-label inline mt" }, "Passphrase"));
          var pin = el("input", { class: "input", type: "password", id: "authPass", placeholder: "Enter passphrase" });
          pin.addEventListener("keydown", function (e) { if (e.key === "Enter") doSignIn(); });
          content.appendChild(pin);
        }
        var signBtn = el("button", { class: "btn primary mt", style: "width:100%" }, "Sign in");
        signBtn.addEventListener("click", doSignIn);
        content.appendChild(signBtn);
        content.appendChild(el("div", { class: "divider" }));
      }
      var newBtn = el("button", { class: "btn mt", style: "width:100%" }, "+ Create a profile");
      newBtn.addEventListener("click", showCreate);
      content.appendChild(newBtn);
      var ssoBtn = el("button", { class: "btn mt", style: "width:100%" }, "🏢 Sign in with Enterprise SSO");
      ssoBtn.addEventListener("click", ssoStub);
      content.appendChild(ssoBtn);
      content.appendChild(el("div", { class: "auth-note" }, "Local-first profiles keep each user's boards separate in this browser. This is a convenience gate, not enterprise security — do not store sensitive data."));
      card.appendChild(content);
    }
    function doSignIn() {
      var id = ($("#authUser") || {}).value || selectedId;
      var u = userById(id);
      if (!u) return;
      if (u.hasPass) {
        var pass = ($("#authPass") || {}).value || "";
        verifyPass(u, pass).then(function (ok) { if (ok) enterApp(id); else toast("Incorrect passphrase", "err"); });
      } else enterApp(id);
    }
    function showCreate() {
      card.innerHTML = "<div class='auth-brand'><div class='brand-mark'>TO</div><div><strong>Create a profile</strong></div></div>";
      var c = el("div");
      c.innerHTML =
        "<label class='field-label inline'>Display name</label><input class='input' id='ncName' placeholder='e.g., Jordan Lee'>" +
        "<label class='field-label inline mt'>Role</label><select class='select' id='ncRole' style='width:100%'>" + ROLES.map(function (r) { return "<option" + (r === "Department Manager" ? " selected" : "") + ">" + esc(r) + "</option>"; }).join("") + "</select>" +
        "<label class='field-label inline mt'>Passphrase (optional)</label><input class='input' id='ncPass' type='password' placeholder='Leave blank for quick local access'>";
      var create = el("button", { class: "btn primary mt", style: "width:100%" }, "Create & sign in");
      create.addEventListener("click", function () {
        var name = $("#ncName").value.trim();
        if (!name) { toast("Name is required", "err"); return; }
        createUser(name, $("#ncPass").value, $("#ncRole").value).then(function (u) { enterApp(u.id); });
      });
      c.appendChild(create);
      if (accounts.users.length) {
        var back = el("button", { class: "btn mt", style: "width:100%" }, "← Back");
        back.addEventListener("click", draw);
        c.appendChild(back);
      }
      card.appendChild(c);
      setTimeout(function () { var n = $("#ncName"); if (n) n.focus(); }, 30);
    }
    function ssoStub() {
      modal("Enterprise SSO", el("div", null,
        "<p class='muted'>Single sign-on with an enterprise identity provider (OIDC / SAML — Azure AD / Entra ID, Okta, Google Workspace) requires a backend service to complete the OAuth flow and validate tokens. This local-first prototype cannot do that securely on its own.</p>" +
        "<p class='muted'>The integration is tracked in the improvement backlog for implementation after a backend and security review are approved. For now, use a local profile.</p>"),
        [{ label: "Back to sign in", cls: "btn primary", fn: closeModal }], "sm");
    }
    draw();
    gate.appendChild(card);
    document.body.appendChild(gate);
  }

  function changePassphrase(user) {
    var body = el("div");
    body.innerHTML =
      (user.hasPass ? "<label class='field-label inline'>Current passphrase</label><input class='input' id='cpCur' type='password'>" : "") +
      "<label class='field-label inline mt'>New passphrase (blank removes it)</label><input class='input' id='cpNew' type='password'>";
    modal("Passphrase", body, [
      { label: "Cancel", cls: "btn", fn: closeModal },
      { label: "Save", cls: "btn primary", fn: function () {
        var apply = function () {
          var np = $("#cpNew").value;
          if (!np) { user.hasPass = false; user.hash = null; saveAccounts(); closeModal(); toast("Passphrase removed", "ok"); renderShell(); return; }
          user.salt = randSalt();
          hashPass(np, user.salt).then(function (h) { user.hash = h; user.hasPass = true; saveAccounts(); markUnlocked(user.id); closeModal(); toast("Passphrase updated", "ok"); renderShell(); });
        };
        if (user.hasPass) verifyPass(user, $("#cpCur").value).then(function (ok) { if (ok) apply(); else toast("Current passphrase incorrect", "err"); });
        else apply();
      } },
    ], "sm");
  }
  function deleteUser(user) {
    confirmModal("Delete profile " + user.displayName + "?", "This permanently removes the profile and its workspace data from this browser.", function () {
      try { localStorage.removeItem(wsKey(user.id)); } catch (e) {}
      accounts.users = accounts.users.filter(function (u) { return u.id !== user.id; });
      saveAccounts();
      toast("Profile deleted");
      render();
    });
  }

  /* ----------------------------------------------------------------------- *
   * Lookups & permissions
   * ----------------------------------------------------------------------- */
  function activeBoard() {
    return state.boards.filter(function (b) { return b.id === state.activeBoardId; })[0] || state.boards[0];
  }
  function resourceById(id) { return state.resources.filter(function (r) { return r.id === id; })[0] || null; }
  function projectById(id) { return state.projects.filter(function (p) { return p.id === id; })[0] || null; }
  function cardById(id) { return state.cards.filter(function (c) { return c.id === id; })[0] || null; }
  function boardCards(boardId) { return state.cards.filter(function (c) { return c.boardId === boardId; }); }

  function role() { return state.settings.role; }
  function canFinance() { return FINANCIAL_ROLES.indexOf(role()) !== -1; }
  function canEdit() { return READONLY_ROLES.indexOf(role()) === -1; }
  // Master resource register admin: Admin, Department Manager, Project Manager.
  // (Resource Manager can view resource + financial data but not administer it.)
  var RESOURCE_ADMIN_ROLES = ["Admin", "Department Manager", "Project Manager"];
  function canAdminResources() { return RESOURCE_ADMIN_ROLES.indexOf(role()) !== -1; }

  /* ----------------------------------------------------------------------- *
   * Calculations
   * ----------------------------------------------------------------------- */
  function cardCost(c) {
    var r = resourceById(c.assigneeId);
    var rate = r ? r.costRate : 70;
    return (c.loggedHours || 0) * rate;
  }
  function cardCommitted(c) {
    var r = resourceById(c.assigneeId);
    var rate = r ? r.costRate : 70;
    return Math.max(c.estimateHours || 0, c.loggedHours || 0) * rate;
  }
  function isDone(c) {
    var b = state.boards.filter(function (x) { return x.id === c.boardId; })[0];
    if (!b) return c.progress >= 100;
    var last = b.columns[b.columns.length - 1];
    return c.columnId === last.id || c.progress >= 100;
  }
  function projectRollup(p) {
    var cs = state.cards.filter(function (c) { return c.projectId === p.id; });
    var spent = 0, committed = 0, est = 0, logged = 0, done = 0, overdue = 0;
    cs.forEach(function (c) {
      spent += cardCost(c); committed += cardCommitted(c);
      est += c.estimateHours || 0; logged += c.loggedHours || 0;
      if (isDone(c)) done++;
      var du = daysUntil(c.due);
      if (du != null && du < 0 && !isDone(c)) overdue++;
    });
    var progress = cs.length ? Math.round(cs.reduce(function (a, c) { return a + (c.progress || 0); }, 0) / cs.length) : 0;
    var revenue = p.billable ? p.budget : 0;
    return {
      cards: cs.length, done: done, overdue: overdue, progress: progress,
      est: est, logged: logged, spent: spent, committed: committed,
      budget: p.budget, revenue: revenue, margin: revenue - spent,
      burn: p.budget ? spent / p.budget : 0,
      variance: p.budget - committed,
    };
  }
  // PMI / PMBOK Earned Value Management, computed on a consistent cost basis.
  // BAC (budget at completion) uses committed planned cost; PV is time-phased
  // straight-line across the schedule baseline (start..end).
  function projectEVM(p) {
    var r = projectRollup(p);
    var bac = r.committed || p.budget || 0;       // cost baseline
    var ev = bac * (r.progress / 100);            // earned value
    var ac = r.spent;                             // actual cost
    var pv = ev;                                  // planned value (fallback)
    var s = parseDate(p.startDate), e = parseDate(p.endDate);
    if (s && e && e > s) {
      var now = new Date(todayISO() + "T00:00:00");
      pv = bac * clamp((now - s) / (e - s), 0, 1);
    }
    var cpi = ac > 0 ? ev / ac : 1;               // cost performance index
    var spi = pv > 0 ? ev / pv : 1;               // schedule performance index
    var eac = cpi > 0 ? bac / cpi : bac;
    return {
      bac: bac, ev: ev, ac: ac, pv: pv, cpi: cpi, spi: spi,
      cv: ev - ac, sv: ev - pv, eac: eac, vac: bac - eac,
    };
  }
  function num2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
  function multStr(m) { return (Math.round(m * 10) / 10).toFixed(1) + "×"; }
  // Card effort synchronization helpers (shared by the editor and QA).
  function progressFromHours(est, logged) { return est > 0 ? clamp(Math.round(logged / est * 100), 0, 100) : 0; }
  function loggedFromProgress(est, progress) { return est > 0 ? Math.round(est * clamp(progress, 0, 100) / 100 * 10) / 10 : 0; }

  /* ---------- A/E earned-multiplier financials ---------- */
  function projectLabor(p) { // billable direct labor (actual cost of logged effort)
    return state.cards.filter(function (c) { return c.projectId === p.id; }).reduce(function (a, c) { var r = resourceById(c.assigneeId); return a + (c.loggedHours || 0) * (r ? r.costRate : 70); }, 0);
  }
  function projectEarnedRevenue(p) {
    return state.cards.filter(function (c) { return c.projectId === p.id; }).reduce(function (a, c) { var r = resourceById(c.assigneeId); return a + (c.loggedHours || 0) * (r ? (r.billRate || 0) : 0); }, 0);
  }
  function projectMultiplier(p) { var l = projectLabor(p); return l > 0 ? projectEarnedRevenue(p) / l : 0; }
  function projectCMPct(p) { var rev = projectEarnedRevenue(p); return rev > 0 ? (rev - projectLabor(p)) / rev * 100 : 0; }
  function cmTarget() { return state.settings.targetContributionMarginPct != null ? state.settings.targetContributionMarginPct : DEFAULT_TARGET_CM_PCT; }
  // Green at/above target, yellow within 10 pts below, red >10 pts below.
  function cmStatusClass(cm) { var t = cmTarget(); if (cm >= t) return "ok"; if (cm >= t - 10) return "warn"; return "danger"; }
  function programMultiplier() {
    var l = 0, rev = 0;
    state.projects.forEach(function (p) { l += projectLabor(p); rev += projectEarnedRevenue(p); });
    return { labor: l, revenue: rev, multiplier: l > 0 ? rev / l : 0, cm: rev > 0 ? (rev - l) / rev * 100 : 0 };
  }
  // Forecasts for FV/EAC history.
  function projectBillEAC(p) {
    return state.cards.filter(function (c) { return c.projectId === p.id; }).reduce(function (a, c) { var r = resourceById(c.assigneeId); return a + Math.max(c.estimateHours || 0, c.loggedHours || 0) * (r ? (r.billRate || 0) : 0); }, 0);
  }
  function projectCostEAC(p) { return projectEVM(p).eac; }
  function targetCostBudget(p) { return (p.budget || 0) * (1 - cmTarget() / 100); }
  // Time-phased FV/EAC dataset from baseline + approved change orders + current.
  function fvEacHistory(p) {
    var t = cmTarget();
    var pts = [];
    var base = p.baseline || { budget: p.budget, endDate: p.endDate };
    var fv = base.budget;
    pts.push({ date: p.startDate || todayISO(), event: "Baseline", fundedValue: fv, targetCostBudget: fv * (1 - t / 100), billEAC: projectBillEAC(p), costEAC: projectRollup(p).committed });
    changeOrdersFor(p.id).filter(function (co) { return co.applied && co.decidedDate; })
      .sort(function (a, b) { return String(a.decidedDate).localeCompare(String(b.decidedDate)); })
      .forEach(function (co) {
        fv += (co.budgetDelta || 0);
        pts.push({ date: co.decidedDate, event: co.number + " approved", fundedValue: fv, targetCostBudget: fv * (1 - t / 100), billEAC: null, costEAC: null });
      });
    pts.push({ date: todayISO(), event: "Current", fundedValue: p.budget, targetCostBudget: p.budget * (1 - t / 100), billEAC: projectBillEAC(p), costEAC: projectCostEAC(p) });
    return pts;
  }
  // Program-level EVM: the portfolio rolled up as one program of common projects.
  // Indices use aggregate values (ΣEV/ΣAC, ΣEV/ΣPV) — the correct PMI roll-up,
  // not an average of per-project indices.
  function programEVM() {
    var t = { bac: 0, pv: 0, ev: 0, ac: 0 };
    state.projects.forEach(function (p) { var v = projectEVM(p); t.bac += v.bac; t.pv += v.pv; t.ev += v.ev; t.ac += v.ac; });
    var cpi = t.ac > 0 ? t.ev / t.ac : 1, spi = t.pv > 0 ? t.ev / t.pv : 1;
    return { bac: t.bac, pv: t.pv, ev: t.ev, ac: t.ac, cv: t.ev - t.ac, sv: t.ev - t.pv, cpi: cpi, spi: spi,
      eac: cpi > 0 ? t.bac / cpi : t.bac, projects: state.projects.length };
  }
  /* ---------- Change control (PMI integrated change control) ---------- */
  function changeOrdersFor(projectId) { return (state.changeOrders || []).filter(function (co) { return co.projectId === projectId; }); }
  function coApproved(co) { return co.status === "Approved" || co.status === "Implemented"; }
  function shiftDate(iso, days) { if (!iso || !days) return iso; var d = parseDate(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
  function coBudgetImpact(projectId) { return changeOrdersFor(projectId).filter(function (co) { return co.applied; }).reduce(function (a, co) { return a + (co.budgetDelta || 0); }, 0); }
  function coScheduleImpact(projectId) { return changeOrdersFor(projectId).filter(function (co) { return co.applied; }).reduce(function (a, co) { return a + (co.scheduleDeltaDays || 0); }, 0); }
  // Apply an approved change order to the project baseline: adjust contract value,
  // shift the schedule, and create the additional-scope cards on the board.
  function applyChangeOrder(co) {
    if (co.applied) return;
    var p = projectById(co.projectId);
    if (!p) return;
    if (!p.baseline) p.baseline = { budget: p.budget, endDate: p.endDate };
    p.budget += (co.budgetDelta || 0);
    if (co.scheduleDeltaDays) p.endDate = shiftDate(p.endDate, co.scheduleDeltaDays);
    co.createdCardIds = co.createdCardIds || [];
    var board = state.boards.filter(function (b) { return b.id === p.boardId; })[0];
    if (board) {
      (co.scopeItems || []).forEach(function (it) {
        if (!it.title) return;
        var nc = { id: uid("c"), boardId: board.id, columnId: board.columns[0].id, projectId: p.id,
          title: it.title, desc: "Added via " + co.number, assigneeId: it.assigneeId || null,
          priority: "medium", type: "Task", labels: ["Client"], due: null, startDate: null,
          estimateHours: it.estimate || 0, loggedHours: 0, progress: stageProgress(board, board.columns[0].id),
          milestone: false, deps: [], checklist: [], comments: [],
          activity: [{ text: "Added by change order " + co.number, ts: Date.now() }], createdAt: Date.now(),
          order: boardCards(board.id).filter(function (c) { return c.columnId === board.columns[0].id; }).length };
        state.cards.push(nc); co.createdCardIds.push(nc.id);
      });
    }
    co.applied = true;
  }
  // Reverse a previously applied change order (e.g., approval rescinded).
  function revertChangeOrder(co) {
    if (!co.applied) return;
    var p = projectById(co.projectId);
    if (p) { p.budget -= (co.budgetDelta || 0); if (co.scheduleDeltaDays) p.endDate = shiftDate(p.endDate, -co.scheduleDeltaDays); }
    (co.createdCardIds || []).forEach(function (id) { state.cards = state.cards.filter(function (c) { return c.id !== id; }); });
    co.createdCardIds = [];
    co.applied = false;
  }
  // Reconcile a CO's applied state to its status (call inside mutate()).
  function reconcileChangeOrder(co) {
    if (coApproved(co) && !co.applied) applyChangeOrder(co);
    else if (!coApproved(co) && co.applied) revertChangeOrder(co);
  }

  function resourceUtil(r) {
    var active = state.cards.filter(function (c) { return c.assigneeId === r.id && !isDone(c); });
    var allocated = active.reduce(function (a, c) { return a + Math.max(0, (c.estimateHours || 0) - (c.loggedHours || 0)); }, 0);
    var cap = r.capacityHrs || 1;
    var util = cap ? (allocated / cap) * 100 : 0;
    // 4-week forecast: remaining hours bucketed by due week.
    var weeks = [0, 0, 0, 0];
    active.forEach(function (c) {
      var du = daysUntil(c.due);
      var rem = Math.max(0, (c.estimateHours || 0) - (c.loggedHours || 0));
      var wk = du == null ? 3 : clamp(Math.floor(du / 7), 0, 3);
      weeks[wk] += rem;
    });
    return { active: active.length, allocated: allocated, capacity: cap, util: util, weeks: weeks };
  }
  function portfolioTotals() {
    var ps = state.projects.map(projectRollup);
    // Financials aggregate the projects; card counts span EVERY card on every
    // board so the dashboard never disagrees with the boards.
    var t = { budget: 0, spent: 0, committed: 0, revenue: 0, margin: 0, projectCards: 0, projectDone: 0 };
    ps.forEach(function (r) {
      t.budget += r.budget; t.spent += r.spent; t.committed += r.committed;
      t.revenue += r.revenue; t.margin += r.margin; t.projectCards += r.cards; t.projectDone += r.done;
    });
    t.cards = state.cards.length;
    t.done = state.cards.filter(function (c) { return isDone(c); }).length;
    t.overdue = state.cards.filter(function (c) { var d = daysUntil(c.due); return d != null && d < 0 && !isDone(c); }).length;
    t.dueSoon = state.cards.filter(function (c) { var d = daysUntil(c.due); return d != null && d >= 0 && d <= 7 && !isDone(c); }).length;
    return t;
  }
  function insights() {
    var out = [];
    state.projects.forEach(function (p) {
      var r = projectRollup(p);
      if (r.burn > 0.85 && p.billable) out.push({ level: "danger", title: p.name + " burn at " + pct(r.burn * 100), body: money(r.spent) + " spent of " + money(r.budget) + " budget." });
      if (r.overdue > 0) out.push({ level: "warn", title: r.overdue + " overdue task" + (r.overdue > 1 ? "s" : "") + " on " + p.name, body: "Reassign or reschedule to protect the milestone." });
      if (r.margin < 0 && p.billable) out.push({ level: "danger", title: p.name + " margin negative", body: "Spend exceeds billable value by " + money(-r.margin) + "." });
      var v = projectEVM(p);
      if (v.ac > 500 && v.cpi < 0.9) out.push({ level: "danger", title: p.name + " cost overrun (CPI " + num2(v.cpi) + ")", body: "Earned value trails actual cost; forecast EAC " + money(v.eac) + " vs BAC " + money(v.bac) + "." });
      if (v.ac > 500 && v.spi < 0.9) out.push({ level: "warn", title: p.name + " behind schedule (SPI " + num2(v.spi) + ")", body: "Earned value is behind the time-phased plan — review critical path." });
      if (v.ac > 500 && v.vac < 0) out.push({ level: "warn", title: p.name + " negative VAC (" + money(v.vac) + ")", body: "Forecast cost at completion exceeds the budget baseline." });
      if (p.billable && projectEarnedRevenue(p) > 0) {
        var cm = projectCMPct(p);
        if (cm < cmTarget() - 10) out.push({ level: "danger", title: p.name + " contribution margin " + cm.toFixed(1) + "% (target " + cmTarget() + "%)", body: "Multiplier " + num2(projectMultiplier(p)) + "× is well below target — review staffing mix or rates." });
        else if (cm < cmTarget()) out.push({ level: "warn", title: p.name + " margin below target (" + cm.toFixed(1) + "% vs " + cmTarget() + "%)", body: "Within 10 points of target; monitor labor multiplier." });
      }
    });
    state.resources.forEach(function (r) {
      var u = resourceUtil(r);
      if (u.util > 110) out.push({ level: "warn", title: r.name + " over-allocated (" + pct(u.util) + ")", body: hours(u.allocated) + " of remaining work vs " + hours(u.capacity) + " capacity." });
    });
    var crit = state.cards.filter(function (c) { return c.priority === "critical" && !isDone(c); });
    if (crit.length) out.push({ level: "warn", title: crit.length + " critical item" + (crit.length > 1 ? "s" : "") + " open", body: "Highest priority work needs manager attention." });
    if (!out.length) out.push({ level: "ok", title: "Portfolio healthy", body: "No budget, schedule, or capacity alerts." });
    return out;
  }

  /* ----------------------------------------------------------------------- *
   * Rendering — shell
   * ----------------------------------------------------------------------- */
  function renderShell() {
    var nav = $("#nav");
    nav.innerHTML = "";
    NAV.forEach(function (n) {
      var b = el("button", { dataset: { view: n.id }, class: ui.view === n.id ? "active" : "" },
        '<span class="nav-ico">' + n.ico + "</span><span>" + esc(n.label) + "</span>");
      b.addEventListener("click", function () { go(n.id); });
      nav.appendChild(b);
    });

    var bs = $("#boardSelect");
    bs.innerHTML = state.boards.map(function (b) {
      return '<option value="' + b.id + '"' + (b.id === state.activeBoardId ? " selected" : "") + ">" + esc(b.name) + "</option>";
    }).join("");

    var rs = $("#roleSelect");
    rs.innerHTML = ROLES.map(function (r) {
      return '<option value="' + esc(r) + '"' + (r === role() ? " selected" : "") + ">" + esc(r) + "</option>";
    }).join("");

    document.documentElement.setAttribute("data-theme", state.settings.theme);
    $("#themeBtn").textContent = state.settings.theme === "dark" ? "☀" : "🌙";
    $("#newCardBtn").disabled = !canEdit();
    refreshUndoRedo();
    renderUserChip();
  }

  function renderUserChip() {
    var u = currentUser();
    var foot = $(".sidebar-foot");
    if (!foot) return;
    var existing = $("#userChip");
    if (existing) existing.remove();
    if (!u) return;
    var chip = el("div", { id: "userChip", class: "user-chip" });
    chip.innerHTML =
      "<span class='avatar' style='background:" + avatarColor(u.displayName) + "'>" + esc(initials(u.displayName)) + "</span>" +
      "<div class='user-chip-text'><strong>" + esc(u.displayName) + "</strong><span class='faint'>" + esc(u.role) + "</span></div>";
    var out = el("button", { class: "btn sm ghost", title: "Sign out" }, "Sign out");
    out.addEventListener("click", function () { logout(); });
    chip.appendChild(out);
    foot.insertBefore(chip, foot.firstChild);
  }

  function updateSavedStamp() {
    var hint = $(".sidebar-foot .hint");
    if (hint) hint.textContent = "Saved " + new Date(state.savedAt).toLocaleTimeString() + " · local-first";
  }

  function go(view) {
    ui.view = view;
    ui.navOpen = false;
    $("#app").classList.remove("nav-open");
    render();
    $("#view").focus();
  }

  /* ----------------------------------------------------------------------- *
   * Rendering — dispatch
   * ----------------------------------------------------------------------- */
  function render() {
    renderShell();
    var v = $("#view");
    v.innerHTML = "";
    var fn = VIEWS[ui.view] || VIEWS.dashboard;
    fn(v);
  }

  var VIEWS = {};

  /* ---------- Dashboard ---------- */
  VIEWS.dashboard = function (root) {
    var t = portfolioTotals();
    var fin = canFinance();
    root.appendChild(pageHead("Portfolio Dashboard", "Live status across all boards, projects, and resources."));

    var stats = el("div", { class: "grid cols-4" });
    stats.appendChild(statCard("Active cards", t.cards, (t.done + " completed")));
    stats.appendChild(statCard("Due in 7 days", t.dueSoon, "across all boards", t.dueSoon > 0 ? "warn" : "ok"));
    stats.appendChild(statCard("Overdue", t.overdue, "needs attention", t.overdue > 0 ? "danger" : "ok"));
    if (fin) {
      var mClass = t.margin < 0 ? "danger" : "ok";
      stats.appendChild(statCard("Portfolio margin", money(t.margin), money(t.spent) + " spent · " + money(t.revenue) + " billable", mClass));
    } else {
      stats.appendChild(statCard("Boards", state.boards.length, state.projects.length + " projects"));
    }
    root.appendChild(stats);

    var twoCol = el("div", { class: "grid cols-2 mt" });

    // Status distribution chart (by column position bucket)
    var statusPanel = el("div", { class: "panel panel-pad" });
    statusPanel.appendChild(el("h2", null, "Work by stage — " + esc(activeBoard().name)));
    statusPanel.appendChild(stageBarChart(activeBoard()));
    twoCol.appendChild(statusPanel);

    // Progress trend
    var trendPanel = el("div", { class: "panel panel-pad" });
    trendPanel.appendChild(el("h2", null, "Completion trend (6 weeks)"));
    trendPanel.appendChild(lineChart(state.history));
    twoCol.appendChild(trendPanel);
    root.appendChild(twoCol);

    // Insights + upcoming
    var twoCol2 = el("div", { class: "grid cols-2 mt" });
    var insightPanel = el("div", { class: "panel panel-pad" });
    insightPanel.appendChild(el("h2", null, "Insights & alerts"));
    insights().forEach(function (i) {
      var ico = i.level === "danger" ? "⛔" : i.level === "warn" ? "⚠️" : "✅";
      insightPanel.appendChild(el("div", { class: "insight " + i.level },
        '<span class="ico">' + ico + '</span><div class="insight-body"><strong>' + esc(i.title) + "</strong><span>" + esc(i.body) + "</span></div>"));
    });
    twoCol2.appendChild(insightPanel);

    var duePanel = el("div", { class: "panel panel-pad" });
    duePanel.appendChild(el("h2", null, "Upcoming & overdue"));
    var upcoming = state.cards.filter(function (c) { return c.due && !isDone(c); })
      .sort(function (a, b) { return (a.due || "").localeCompare(b.due || ""); }).slice(0, 8);
    if (!upcoming.length) duePanel.appendChild(el("div", { class: "empty" }, "Nothing scheduled."));
    else {
      var tbl = el("table", { class: "table" });
      tbl.innerHTML = "<thead><tr><th>Card</th><th>Owner</th><th>Due</th></tr></thead>";
      var tb = el("tbody");
      upcoming.forEach(function (c) {
        var du = daysUntil(c.due);
        var cls = du < 0 ? "danger" : du <= 3 ? "warn" : "neutral";
        var lbl = du < 0 ? Math.abs(du) + "d late" : du === 0 ? "today" : "in " + du + "d";
        var r = resourceById(c.assigneeId);
        var tr = el("tr");
        tr.innerHTML = "<td><button class='linklike' data-open-card='" + c.id + "'>" + esc(c.title) + "</button></td>" +
          "<td>" + (r ? esc(r.name) : "—") + "</td><td><span class='badge " + cls + "'>" + esc(lbl) + "</span></td>";
        tb.appendChild(tr);
      });
      tbl.appendChild(tb);
      duePanel.appendChild(tbl);
    }
    twoCol2.appendChild(duePanel);
    root.appendChild(twoCol2);
  };

  /* ---------- Kanban board ---------- */
  VIEWS.board = function (root) {
    var b = activeBoard();
    var head = pageHead(b.name, "Drag cards between stages. Columns are editable.");
    root.appendChild(head);

    // Toolbar: filters
    var toolbar = el("div", { class: "board-toolbar no-print" });
    var roster = b.rosterIds.map(resourceById).filter(Boolean);
    var filters = el("div", { class: "filters" });
    var assigneeSel = el("select", { class: "select select-sm" },
      "<option value=''>All assignees</option>" + roster.map(function (r) {
        return "<option value='" + r.id + "'" + (ui.filterAssignee === r.id ? " selected" : "") + ">" + esc(r.name) + "</option>";
      }).join(""));
    assigneeSel.addEventListener("change", function () { ui.filterAssignee = this.value; render(); });
    var prioSel = el("select", { class: "select select-sm" },
      "<option value=''>All priorities</option>" + PRIORITIES.map(function (p) {
        return "<option value='" + p + "'" + (ui.filterPriority === p ? " selected" : "") + ">" + cap(p) + "</option>";
      }).join(""));
    prioSel.addEventListener("change", function () { ui.filterPriority = this.value; render(); });
    var textInput = el("input", { class: "input", type: "search", placeholder: "Filter cards on this board…", style: "max-width:220px" });
    textInput.value = ui.filterText || "";
    var textTimer = null;
    textInput.addEventListener("input", function () {
      clearTimeout(textTimer);
      var val = this.value;
      textTimer = setTimeout(function () { ui.filterText = val; render(); var i = $(".board-toolbar input[type=search]"); if (i) { i.focus(); try { i.setSelectionRange(val.length, val.length); } catch (x) {} } }, 180);
    });
    filters.appendChild(textInput);
    filters.appendChild(assigneeSel);
    filters.appendChild(prioSel);
    if (ui.filterAssignee || ui.filterPriority || ui.filterText) {
      var clr = el("button", { class: "btn sm ghost" }, "Clear");
      clr.addEventListener("click", function () { ui.filterAssignee = ""; ui.filterPriority = ""; ui.filterText = ""; render(); });
      filters.appendChild(clr);
    }
    toolbar.appendChild(filters);
    var spacer = el("div"); spacer.style.flex = "1"; toolbar.appendChild(spacer);

    // Scale controls (matter at 200+ cards): total count, density, collapse all.
    var totalOnBoard = boardCards(b.id).length;
    var shown = boardCards(b.id).filter(cardMatchesFilter).length;
    toolbar.appendChild(el("span", { class: "faint", style: "font-size:12px" },
      (shown === totalOnBoard ? totalOnBoard + " cards" : shown + " of " + totalOnBoard + " cards")));
    var densityBtn = el("button", { class: "btn sm ghost", title: "Toggle card density" }, state.settings.compact ? "▤ Comfortable" : "≡ Compact");
    densityBtn.addEventListener("click", function () { mutate(function () { state.settings.compact = !state.settings.compact; }); });
    toolbar.appendChild(densityBtn);
    var allCollapsed = b.columns.every(function (col) { return ui.collapsed[col.id]; });
    var collapseBtn = el("button", { class: "btn sm ghost", title: "Collapse or expand all columns" }, allCollapsed ? "⊞ Expand all" : "⊟ Collapse all");
    collapseBtn.addEventListener("click", function () {
      var target = !allCollapsed;
      b.columns.forEach(function (col) { ui.collapsed[col.id] = target; });
      render();
    });
    toolbar.appendChild(collapseBtn);
    if (canEdit()) {
      var addCardBtn = el("button", { class: "btn primary sm" }, "+ New card");
      addCardBtn.addEventListener("click", function () { openCardEditor(null); });
      toolbar.appendChild(addCardBtn);
    }
    root.appendChild(toolbar);

    var board = el("div", { class: "board" + (state.settings.compact ? " compact" : "") });
    b.columns.forEach(function (col) { board.appendChild(renderColumn(b, col)); });
    if (canEdit()) {
      var addCol = el("div", { class: "add-column" });
      var addColBtn = el("button", null, "+ Add column");
      addColBtn.addEventListener("click", addColumn);
      addCol.appendChild(addColBtn);
      board.appendChild(addCol);
    }
    root.appendChild(board);
  };

  function cardMatchesFilter(c) {
    if (ui.filterAssignee && c.assigneeId !== ui.filterAssignee) return false;
    if (ui.filterPriority && c.priority !== ui.filterPriority) return false;
    if (ui.filterText) {
      var q = ui.filterText.toLowerCase();
      var hay = (c.title + " " + (c.desc || "") + " " + (c.labels || []).join(" ") + " " + (c.type || "")).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function renderColumn(b, col) {
    var cards = boardCards(b.id).filter(function (c) { return c.columnId === col.id; })
      .filter(cardMatchesFilter)
      .sort(function (a, c) { return a.order - c.order; });
    var totalInCol = cards.length;
    // Per-stage (in-column) filter — appears when a stage overflows its window
    // so cards beyond the visible length can still be found within the stage.
    var cf = (ui.colFilter[col.id] || "").trim().toLowerCase();
    if (cf) cards = cards.filter(function (c) {
      var hay = (c.title + " " + (c.desc || "") + " " + (c.labels || []).join(" ") + " " + (c.type || "") + " " + ((resourceById(c.assigneeId) || {}).name || "")).toLowerCase();
      return hay.indexOf(cf) !== -1;
    });
    // A filter sits at the top of every non-empty stage so cards can be viewed by
    // filter; it's essential once a stage overflows its render window.
    var showColFilter = totalInCol > 0 || !!cf;
    var collapsed = !!ui.collapsed[col.id];
    var node = el("div", { class: "column" + (collapsed ? " collapsed" : ""), dataset: { col: col.id } });

    var head = el("div", { class: "column-head" });
    var caret = el("button", { class: "column-collapse", title: collapsed ? "Expand" : "Collapse" }, collapsed ? "▸" : "▾");
    caret.addEventListener("click", function (e) { e.stopPropagation(); ui.collapsed[col.id] = !collapsed; render(); });
    head.appendChild(caret);
    var title = el("input", { class: "column-title", value: col.name, "aria-label": "Column name" });
    title.value = col.name;
    title.disabled = !canEdit();
    title.addEventListener("change", function () {
      mutate(function () { col.name = title.value.trim() || "Untitled"; });
    });
    var count = el("span", { class: "column-count" + (col.wip && cards.length > col.wip ? " over" : "") },
      cards.length + (col.wip ? " / " + col.wip : ""));
    head.appendChild(title);
    head.appendChild(count);
    if (canEdit()) {
      var menu = el("button", { class: "column-menu", title: "Column options" }, "⋯");
      menu.addEventListener("click", function (e) { e.stopPropagation(); columnMenu(b, col); });
      head.appendChild(menu);
    }
    node.appendChild(head);

    if (collapsed) {
      // Collapsed columns render as a slim strip — keeps a 12-column board navigable.
      head.style.cursor = "pointer";
      head.addEventListener("click", function () { ui.collapsed[col.id] = false; render(); });
      return node;
    }

    if (showColFilter) {
      var cfWrap = el("div", { class: "col-filter" });
      var cfInput = el("input", { class: "input", type: "search", placeholder: "Filter " + (totalInCol) + " in this stage…", dataset: { colfilter: col.id } });
      cfInput.value = ui.colFilter[col.id] || "";
      var cfTimer = null;
      cfInput.addEventListener("input", function () {
        clearTimeout(cfTimer);
        var v = this.value;
        cfTimer = setTimeout(function () {
          ui.colFilter[col.id] = v; ui.reveal[col.id] = 0; render();
          var again = document.querySelector("[data-colfilter='" + col.id + "']");
          if (again) { again.focus(); try { again.setSelectionRange(v.length, v.length); } catch (x) {} }
        }, 160);
      });
      cfInput.addEventListener("click", function (e) { e.stopPropagation(); });
      cfWrap.appendChild(cfInput);
      if (cf) cfWrap.appendChild(el("span", { class: "faint", style: "font-size:11px;padding:0 4px" }, cards.length + " of " + totalInCol));
      node.appendChild(cfWrap);
    }

    var body = el("div", { class: "column-body", dataset: { col: col.id } });
    if (!cards.length) body.appendChild(el("div", { class: "faint", style: "padding:8px;font-size:12px;" }, cf ? "No matches in this stage" : "No cards"));

    // Windowed rendering: only build DOM for the first N cards; reveal more on demand.
    // This keeps a 200+ card column responsive instead of rendering every node.
    var limit = ui.reveal[col.id] || COLUMN_RENDER_CAP;
    var visible = cards.slice(0, limit);
    visible.forEach(function (c) { body.appendChild(renderCard(c)); });
    if (cards.length > limit) {
      var remaining = cards.length - limit;
      var more = el("div", { class: "show-more" });
      var moreBtn = el("button", { class: "btn sm" }, "Show " + Math.min(COLUMN_RENDER_CAP, remaining) + " more (" + remaining + " hidden)");
      moreBtn.addEventListener("click", function (e) { e.stopPropagation(); ui.reveal[col.id] = limit + COLUMN_RENDER_CAP; render(); });
      var allBtn = el("button", { class: "btn sm ghost" }, "Show all");
      allBtn.addEventListener("click", function (e) { e.stopPropagation(); ui.reveal[col.id] = cards.length; render(); });
      more.appendChild(moreBtn); more.appendChild(allBtn);
      body.appendChild(more);
    }
    node.appendChild(body);

    if (canEdit()) {
      var add = el("div", { class: "column-add" });
      var addBtn = el("button", null, "+ Add card");
      addBtn.addEventListener("click", function () { quickAddCard(col.id); });
      add.appendChild(addBtn);
      node.appendChild(add);
    }

    setupColumnDnD(body, col.id);
    return node;
  }

  function renderCard(c) {
    var r = resourceById(c.assigneeId);
    var node = el("div", { class: "card prio-" + c.priority, draggable: canEdit() ? "true" : "false", dataset: { card: c.id } });
    var labels = (c.labels || []).map(function (l) {
      var color = LABEL_COLORS[l] || "#64748b";
      return "<span class='chip label'><span class='tag-dot' style='background:" + color + "'></span> " + esc(l) + "</span>";
    }).join("");
    var du = daysUntil(c.due);
    var dueCls = du == null ? "" : du < 0 && !isDone(c) ? "overdue" : du <= 3 ? "soon" : "";
    var dueTxt = c.due ? "📅 " + fmtDate(c.due) : "";
    var checklist = (c.checklist || []);
    var doneCk = checklist.filter(function (x) { return x.done; }).length;
    var html = "";
    if (labels) html += "<div class='card-labels'>" + labels + "</div>";
    html += "<div class='card-title'>" + (c.milestone ? "◆ " : "") + esc(c.title) + "</div>";
    if ((c.progress || 0) > 0 && (c.progress || 0) < 100) html += "<div class='mini-progress'><span style='width:" + c.progress + "%'></span></div>";
    html += "<div class='card-meta'>";
    html += "<span class='chip label'>" + esc(c.type) + "</span>";
    if (dueTxt) html += "<span class='due " + dueCls + "'>" + dueTxt + "</span>";
    if (checklist.length) html += "<span title='Checklist'>☑ " + doneCk + "/" + checklist.length + "</span>";
    if ((c.deps || []).length) html += "<span title='Dependencies'>🔗 " + c.deps.length + "</span>";
    html += "<span style='flex:1'></span>";
    if (r) html += "<span class='avatar' title='" + esc(r.name) + "' style='background:" + avatarColor(r.name) + "'>" + esc(initials(r.name)) + "</span>";
    html += "</div>";
    node.innerHTML = html;
    node.addEventListener("click", function () { openCardEditor(c.id); });
    if (canEdit()) setupCardDnD(node, c.id);
    return node;
  }

  /* ---------- Resources ---------- */
  VIEWS.resources = function (root) {
    var head = pageHead("Resources", "PMO master resource register — people, subcontractors, tools, equipment — with utilization and a 4-week forecast.");
    var admin = canAdminResources();
    if (admin) {
      var actions = head.querySelector(".head-actions");
      actions.appendChild(mkBtn("+ Add resource", "btn primary sm", function () { openResourceEditor(null); }));
      actions.appendChild(mkBtn("⬇ CSV", "btn sm", exportResourcesCSV));
      actions.appendChild(mkBtn("⬆ CSV", "btn sm", importResourcesCSV));
    }
    root.appendChild(head);
    var fin = canFinance();

    // Roster forecast (active board) — utilization picture
    var b = activeBoard();
    var roster = b.rosterIds.map(resourceById).filter(Boolean);
    var fpanel = el("div", { class: "panel" });
    fpanel.appendChild(el("div", { class: "panel-pad" }, "<h2 style='font-size:14px;margin:0'>Utilization & 4-week forecast — " + esc(b.name) + " roster</h2>"));
    var ftbl = el("table", { class: "table" });
    ftbl.innerHTML = "<thead><tr><th>Resource</th><th>Role</th><th class='num'>Active</th><th class='num'>Allocated</th><th>Utilization</th><th>Wk1</th><th>Wk2</th><th>Wk3</th><th>Wk4</th></tr></thead>";
    var ftb = el("tbody");
    roster.forEach(function (r) {
      var u = resourceUtil(r);
      var cls = u.util > 110 ? "danger" : u.util > 90 ? "warn" : "ok";
      ftb.appendChild(el("tr", null,
        "<td><div class='flex'><span class='avatar' style='background:" + avatarColor(r.name) + "'>" + esc(initials(r.name)) + "</span> <strong>" + esc(r.name) + "</strong></div></td>" +
        "<td class='muted'>" + esc(r.role) + "</td>" +
        "<td class='num'>" + u.active + "</td>" +
        "<td class='num'>" + hours(u.allocated) + " / " + hours(u.capacity) + "</td>" +
        "<td><div class='flex'><div class='bar'><span class='" + cls + "' style='width:" + clamp(u.util, 0, 100) + "%'></span></div> <span class='muted'>" + pct(u.util) + "</span></div></td>" +
        u.weeks.map(function (w) { return "<td class='muted'>" + (w ? hours(w) : "—") + "</td>"; }).join("")));
    });
    ftbl.appendChild(ftb); fpanel.appendChild(ftbl); root.appendChild(fpanel);

    // Master register (all resource types)
    var panel = el("div", { class: "panel mt" });
    panel.appendChild(el("div", { class: "panel-pad" }, "<h2 style='font-size:14px;margin:0'>Master resource register</h2>"));
    var tbl = el("table", { class: "table" });
    tbl.innerHTML = "<thead><tr><th>Name</th><th>Type</th><th>Role</th><th>Dept</th><th>Company</th><th>Status</th><th class='num'>Capacity</th>" +
      (fin ? "<th class='num'>Cost</th><th class='num'>Bill</th>" : "") + (admin ? "<th></th>" : "") + "</tr></thead>";
    var tb = el("tbody");
    state.resources.forEach(function (r) {
      var tr = el("tr");
      tr.innerHTML =
        "<td><div class='flex'><span class='avatar' style='background:" + avatarColor(r.name) + "'>" + esc(initials(r.name)) + "</span> <strong>" + esc(r.name) + "</strong></div></td>" +
        "<td><span class='chip label'>" + esc(r.type || "Employee") + "</span></td>" +
        "<td class='muted'>" + esc(r.role) + "</td>" +
        "<td class='muted'>" + esc(r.dept || "—") + "</td>" +
        "<td class='muted'>" + esc(r.company || "—") + "</td>" +
        "<td><span class='badge " + (r.status === "Active" ? "ok" : "neutral") + "'>" + esc(r.status || "Active") + "</span></td>" +
        "<td class='num'>" + (r.capacityHrs ? hours(r.capacityHrs) + "/wk" : "—") + "</td>" +
        (fin ? "<td class='num'>" + money(r.costRate) + "/" + esc(r.unit || "hr") + "</td><td class='num'>" + (r.billRate ? money(r.billRate) + "/" + esc(r.unit || "hr") : "—") + "</td>" : "") +
        (admin ? "<td class='right'></td>" : "");
      if (admin) {
        var ed = el("button", { class: "btn sm" }, "Edit");
        ed.addEventListener("click", function () { openResourceEditor(r.id); });
        tr.querySelector("td.right").appendChild(ed);
      }
      tb.appendChild(tr);
    });
    tbl.appendChild(tb); panel.appendChild(tbl); root.appendChild(panel);

    if (!fin) root.appendChild(el("div", { class: "warn-banner mt" }, "Cost and bill rates are hidden for your role. Financial visibility is limited to manager roles."));
    else if (!admin) root.appendChild(el("div", { class: "warn-banner mt" }, "You can view the resource register; administering it (add/edit/delete/import) is limited to: " + RESOURCE_ADMIN_ROLES.join(", ") + "."));
  };

  function openResourceEditor(resourceId) {
    if (!canAdminResources()) { toast("Resource administration is limited to Admin, Department Manager, Project Manager", "err"); return; }
    var isNew = !resourceId;
    var r = resourceId ? resourceById(resourceId) : {
      id: uid("r"), name: "", role: "", dept: "", type: "Employee", company: "Techniek",
      capacityHrs: 36, costRate: 0, billRate: 0, unit: "hour", status: "Active", notes: "", _new: true,
    };
    var body = el("div");
    body.innerHTML =
      "<div class='form-grid'>" +
      "<div class='form-row full'><label class='field-label inline'>Name</label><input class='input' id='resName' value='" + esc(r.name) + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Type</label><select class='select' id='resType'>" + RESOURCE_TYPES.map(function (t) { return "<option" + (t === r.type ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Status</label><select class='select' id='resStatus'>" + RESOURCE_STATUS.map(function (s) { return "<option" + (s === r.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Role / title</label><input class='input' id='resRole' value='" + esc(r.role) + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Department</label><input class='input' id='resDept' value='" + esc(r.dept || "") + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Company</label><input class='input' id='resCompany' value='" + esc(r.company || "") + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Unit</label><input class='input' id='resUnit' value='" + esc(r.unit || "hour") + "' placeholder='hour, day, each, use'></div>" +
      "<div class='form-row'><label class='field-label inline'>Capacity (hrs/wk)</label><input class='input' type='number' id='resCap' value='" + (r.capacityHrs || 0) + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Cost rate ($)</label><input class='input' type='number' id='resCost' value='" + (r.costRate || 0) + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Bill rate ($)</label><input class='input' type='number' id='resBill' value='" + (r.billRate || 0) + "'></div>" +
      "<div class='form-row full'><label class='field-label inline'>Notes</label><input class='input' id='resNotes' value='" + esc(r.notes || "") + "'></div>" +
      "</div>";
    // Board roster membership
    var rosterWrap = el("div", { class: "mt" });
    rosterWrap.innerHTML = "<label class='field-label inline'>Board roster membership</label>";
    var rosterBox = el("div", { class: "flex wrap", style: "gap:12px;margin-top:6px" });
    state.boards.forEach(function (b) {
      var on = b.rosterIds.indexOf(r.id) !== -1;
      var lab = el("label", { style: "display:inline-flex;align-items:center;gap:6px" });
      lab.innerHTML = "<input type='checkbox' data-board='" + b.id + "'" + (on ? " checked" : "") + "> " + esc(b.name);
      rosterBox.appendChild(lab);
    });
    rosterWrap.appendChild(rosterBox);
    body.appendChild(rosterWrap);

    var foot = [];
    if (!isNew) foot.push({ label: "Delete", cls: "btn danger", side: "left", fn: function () {
      closeModal();
      confirmModal("Delete resource " + r.name + "?", "Cards assigned to this resource become unassigned. Undoable.", function () {
        mutate(function () {
          state.cards.forEach(function (c) { if (c.assigneeId === r.id) c.assigneeId = null; });
          state.boards.forEach(function (b) { b.rosterIds = b.rosterIds.filter(function (id) { return id !== r.id; }); });
          state.resources = state.resources.filter(function (x) { return x.id !== r.id; });
        });
        toast("Resource deleted");
      });
    } });
    foot.push({ label: "Cancel", cls: "btn", fn: closeModal });
    foot.push({ label: isNew ? "Add resource" : "Save", cls: "btn primary", fn: function () {
      var name = $("#resName").value.trim();
      if (!name) { toast("Name is required", "err"); return; }
      mutate(function () {
        r.name = name; r.type = $("#resType").value; r.status = $("#resStatus").value; r.role = $("#resRole").value.trim();
        r.dept = $("#resDept").value.trim(); r.company = $("#resCompany").value.trim(); r.unit = $("#resUnit").value.trim() || "hour";
        r.capacityHrs = parseFloat($("#resCap").value) || 0; r.costRate = parseFloat($("#resCost").value) || 0; r.billRate = parseFloat($("#resBill").value) || 0;
        r.notes = $("#resNotes").value;
        if (r._new) { delete r._new; state.resources.push(r); }
        // Apply roster membership
        rosterBox.querySelectorAll("[data-board]").forEach(function (cb) {
          var b = state.boards.filter(function (x) { return x.id === cb.dataset.board; })[0];
          if (!b) return;
          var has = b.rosterIds.indexOf(r.id) !== -1;
          if (cb.checked && !has) b.rosterIds.push(r.id);
          if (!cb.checked && has) b.rosterIds = b.rosterIds.filter(function (id) { return id !== r.id; });
        });
      });
      closeModal();
      toast(isNew ? "Resource added" : "Resource saved", "ok");
    } });
    modal(isNew ? "New resource" : "Edit · " + r.name, body, foot);
    setTimeout(function () { var n = $("#resName"); if (n) n.focus(); }, 30);
  }
  function exportResourcesCSV() {
    var rows = [["Name", "Type", "Role", "Department", "Company", "CapacityHrs", "CostRate", "BillRate", "Unit", "Status", "Notes"]];
    state.resources.forEach(function (r) { rows.push([r.name, r.type, r.role, r.dept, r.company, r.capacityHrs, r.costRate, r.billRate, r.unit, r.status, r.notes]); });
    download("opsboard-resources-" + todayISO() + ".csv", rows.map(function (r) { return r.map(csvCell).join(","); }).join("\n"), "text/csv");
    toast("Resources exported", "ok");
  }
  function importResourcesCSV() {
    if (!canAdminResources()) { toast("Not permitted", "err"); return; }
    var input = el("input", { type: "file", accept: ".csv,text/csv" });
    input.addEventListener("change", function () {
      var file = input.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var rows = parseDelimited(String(reader.result), ",");
          if (rows.length < 2) throw new Error("No rows");
          var headers = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
          function idx() { for (var i = 0; i < arguments.length; i++) { var k = headers.indexOf(arguments[i]); if (k !== -1) return k; } return -1; }
          var iName = idx("name"), iType = idx("type"), iRole = idx("role"), iDept = idx("department", "dept"),
              iCo = idx("company"), iCap = idx("capacityhrs", "capacity"), iCost = idx("costrate", "cost"),
              iBill = idx("billrate", "bill"), iUnit = idx("unit"), iStatus = idx("status"), iNotes = idx("notes");
          if (iName === -1) throw new Error("CSV needs a Name column");
          var added = 0, updated = 0;
          mutate(function () {
            rows.slice(1).forEach(function (row) {
              var name = (row[iName] || "").trim(); if (!name) return;
              var existing = state.resources.filter(function (x) { return x.name.toLowerCase() === name.toLowerCase(); })[0];
              var rec = existing || { id: uid("r"), name: name };
              if (iType !== -1 && row[iType]) rec.type = row[iType].trim(); else rec.type = rec.type || "Employee";
              if (iRole !== -1) rec.role = (row[iRole] || "").trim();
              if (iDept !== -1) rec.dept = (row[iDept] || "").trim();
              if (iCo !== -1) rec.company = (row[iCo] || "").trim();
              if (iCap !== -1) rec.capacityHrs = parseFloat(row[iCap]) || 0;
              if (iCost !== -1) rec.costRate = parseFloat(row[iCost]) || 0;
              if (iBill !== -1) rec.billRate = parseFloat(row[iBill]) || 0;
              rec.unit = (iUnit !== -1 && row[iUnit]) ? row[iUnit].trim() : (rec.unit || "hour");
              rec.status = (iStatus !== -1 && row[iStatus]) ? row[iStatus].trim() : (rec.status || "Active");
              if (iNotes !== -1) rec.notes = (row[iNotes] || "").trim();
              if (existing) updated++; else { state.resources.push(rec); added++; }
            });
          });
          toast("Imported: " + added + " added, " + updated + " updated", "ok");
        } catch (e) { toast("Import failed: " + e.message, "err"); }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  /* ---------- Projects ---------- */
  VIEWS.projects = function (root) {
    var head = pageHead("Projects", "Rollups across all boards. Open a board, or administer a project's information and change orders.");
    if (canEdit()) {
      var addBtn = el("button", { class: "btn primary sm" }, "+ New project");
      addBtn.addEventListener("click", function () { openProjectAdmin(null); });
      head.querySelector(".head-actions").appendChild(addBtn);
    }
    root.appendChild(head);
    var fin = canFinance();
    if (!state.projects.length) { root.appendChild(el("div", { class: "panel panel-pad empty" }, "No projects yet. Create one to start tracking scope, budget, and change orders.")); return; }
    var panel = el("div", { class: "panel" });
    var tbl = el("table", { class: "table" });
    tbl.innerHTML = "<thead><tr><th>Project</th><th>Client</th><th>Type</th><th>Status</th><th>Progress</th><th class='num'>Cards</th><th class='num'>CO</th>" +
      (fin ? "<th class='num'>Budget</th><th class='num'>Spent</th><th class='num'>Mult.</th><th class='num'>CM %</th><th>Burn</th>" : "") + "<th></th></tr></thead>";
    var tb = el("tbody");
    state.projects.forEach(function (p) {
      var r = projectRollup(p);
      var tr = el("tr");
      var burnCls = r.burn > 0.9 ? "danger" : r.burn > 0.7 ? "warn" : "ok";
      var cos = changeOrdersFor(p.id);
      var pending = cos.filter(function (c) { return !coApproved(c) && c.status !== "Rejected"; }).length;
      var html =
        "<td><button class='linklike' data-open-project='" + p.id + "'>" + esc(p.name) + "</button></td>" +
        "<td class='muted'>" + esc(p.client) + "</td>" +
        "<td><span class='chip label'>" + esc(p.contractType || "T&M") + "</span></td>" +
        "<td><span class='badge " + (p.status === "Active" ? "ok" : p.status === "Closed" || p.status === "Cancelled" ? "neutral" : "warn") + "'>" + esc(p.status) + "</span></td>" +
        "<td><div class='flex'><div class='bar'><span class='ok' style='width:" + r.progress + "%'></span></div> <span class='muted'>" + r.progress + "%</span></div></td>" +
        "<td class='num'>" + r.done + "/" + r.cards + "</td>" +
        "<td class='num'>" + cos.length + (pending ? " <span class='badge warn'>" + pending + " pend</span>" : "") + "</td>";
      if (fin) {
        var mult = projectMultiplier(p), cm = projectCMPct(p);
        html += "<td class='num'>" + money(r.budget) + "</td>" +
          "<td class='num'>" + money(r.spent) + "</td>" +
          "<td class='num'>" + (p.billable && mult ? multStr(mult) : "<span class='muted'>—</span>") + "</td>" +
          "<td class='num'>" + (p.billable && projectEarnedRevenue(p) > 0 ? "<span class='badge " + cmStatusClass(cm) + "'>" + cm.toFixed(1) + "%</span>" : "<span class='muted'>—</span>") + "</td>" +
          "<td><div class='flex'><div class='bar'><span class='" + burnCls + "' style='width:" + clamp(r.burn * 100, 0, 100) + "%'></span></div> <span class='muted'>" + pct(r.burn * 100) + "</span></div></td>";
      }
      html += "<td class='right'></td>";
      tr.innerHTML = html;
      var actions = el("div", { class: "flex", style: "gap:6px;justify-content:flex-end" });
      if (fin) { var fvBtn = el("button", { class: "btn sm ghost", title: "Funded Value / EAC history" }, "FV/EAC"); fvBtn.addEventListener("click", function () { openFvEacHistory(p.id); }); actions.appendChild(fvBtn); }
      var adminBtn = el("button", { class: "btn sm" }, canEdit() ? "⚙ Admin" : "View");
      adminBtn.addEventListener("click", function () { openProjectAdmin(p.id); });
      actions.appendChild(adminBtn);
      tr.querySelector("td.right").appendChild(actions);
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    panel.appendChild(tbl);
    root.appendChild(panel);
  };

  /* ---------- Project administration ---------- */
  function openProjectAdmin(projectId) {
    if (!canEdit() && !projectId) return;
    var isNew = !projectId;
    var p = projectId ? projectById(projectId) : {
      id: uid("p"), name: "", client: "", boardId: (activeBoard() || state.boards[0]).id, budget: 0,
      billable: true, startDate: todayISO(), endDate: todayISO(), status: "Active", _new: true,
    };
    var ro = !canEdit();
    var body = el("div");
    body.innerHTML =
      "<div class='form-grid'>" +
      "<div class='form-row full'><label class='field-label inline'>Project name</label><input class='input' id='paName' value='" + esc(p.name) + "'" + (ro ? " disabled" : "") + "></div>" +
      "<div class='form-row'><label class='field-label inline'>Client</label><input class='input' id='paClient' value='" + esc(p.client) + "'" + (ro ? " disabled" : "") + "></div>" +
      "<div class='form-row'><label class='field-label inline'>Primary board</label><select class='select' id='paBoard'" + (ro ? " disabled" : "") + ">" + state.boards.map(function (b) { return "<option value='" + b.id + "'" + (b.id === p.boardId ? " selected" : "") + ">" + esc(b.name) + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Status</label><select class='select' id='paStatus'" + (ro ? " disabled" : "") + ">" + PROJECT_STATUS.map(function (s) { return "<option" + (s === p.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Contract value / budget ($)</label><input class='input' type='number' id='paBudget' value='" + (p.budget || 0) + "'" + (ro ? " disabled" : "") + "></div>" +
      "<div class='form-row'><label class='field-label inline'><input type='checkbox' id='paBillable'" + (p.billable ? " checked" : "") + (ro ? " disabled" : "") + "> Billable (client-facing revenue)</label></div>" +
      "<div class='form-row'><label class='field-label inline'>Start date</label><input class='input' type='date' id='paStart' value='" + (p.startDate || "") + "'" + (ro ? " disabled" : "") + "></div>" +
      "<div class='form-row'><label class='field-label inline'>Target end date</label><input class='input' type='date' id='paEnd' value='" + (p.endDate || "") + "'" + (ro ? " disabled" : "") + "></div>" +
      "</div>";

    if (!isNew) {
      // Baseline + change-control summary
      var bImpact = coBudgetImpact(p.id), sImpact = coScheduleImpact(p.id);
      var base = p.baseline || { budget: p.budget, endDate: p.endDate };
      var summary = el("div", { class: "panel panel-pad mt" });
      summary.innerHTML = "<h2 style='font-size:14px'>Baseline & change-control impact</h2>" +
        "<div class='grid cols-3'>" +
        statCardHTML("Original budget", money(base.budget), "baseline") +
        statCardHTML("Approved CO impact", (bImpact >= 0 ? "+" : "") + money(bImpact), sImpact ? sImpact + " days schedule" : "no schedule change") +
        statCardHTML("Current budget", money(p.budget), "baseline + approved COs") + "</div>";
      if (canFinance()) {
        var multRow = el("div", { class: "flex mt", style: "gap:14px;flex-wrap:wrap" });
        var mult = projectMultiplier(p), cm = projectCMPct(p);
        multRow.innerHTML = "<span class='muted'>A/E multiplier: <strong style='color:var(--text)'>" + (mult ? multStr(mult) : "—") + "</strong></span>" +
          "<span class='muted'>Contribution margin: <span class='badge " + cmStatusClass(cm) + "'>" + (projectEarnedRevenue(p) > 0 ? cm.toFixed(1) + "%" : "—") + "</span> (target " + cmTarget() + "%)</span>";
        var fvBtn = el("button", { class: "btn sm", style: "margin-left:auto" }, "📈 FV / EAC history");
        fvBtn.addEventListener("click", function () { closeModal(); openFvEacHistory(p.id); });
        multRow.appendChild(fvBtn);
        summary.appendChild(multRow);
      }
      body.appendChild(summary);

      // Change orders list
      var coWrap = el("div", { class: "mt" });
      var coHead = el("div", { class: "flex" });
      coHead.appendChild(el("label", { class: "field-label inline", style: "flex:1" }, "Change orders"));
      if (canEdit()) { var addCo = el("button", { class: "btn sm" }, "+ Add change order"); addCo.addEventListener("click", function () { closeModal(); openChangeOrderEditor(null, p.id); }); coHead.appendChild(addCo); }
      coWrap.appendChild(coHead);
      var cos = changeOrdersFor(p.id);
      if (!cos.length) coWrap.appendChild(el("div", { class: "muted mt" }, "No change orders."));
      else {
        var ct = el("table", { class: "table mt" });
        ct.innerHTML = "<thead><tr><th>#</th><th>Title</th><th>Category</th><th class='num'>Δ Budget</th><th class='num'>Δ Days</th><th>Status</th></tr></thead>";
        var ctb = el("tbody");
        cos.forEach(function (co) {
          var tr = el("tr", { style: "cursor:pointer" });
          tr.innerHTML = "<td>" + esc(co.number) + "</td><td>" + esc(co.title) + "</td><td><span class='chip label'>" + esc(co.category) + "</span></td>" +
            "<td class='num'>" + (co.budgetDelta ? money(co.budgetDelta) : "—") + "</td><td class='num'>" + (co.scheduleDeltaDays || "—") + "</td>" +
            "<td>" + coStatusBadge(co.status) + "</td>";
          tr.addEventListener("click", function () { closeModal(); openChangeOrderEditor(co.id, p.id); });
          ctb.appendChild(tr);
        });
        ct.appendChild(ctb); coWrap.appendChild(ct);
      }
      body.appendChild(coWrap);
    }

    var foot = [];
    if (!isNew && canEdit()) foot.push({ label: "Delete project", cls: "btn danger", side: "left", fn: function () {
      closeModal();
      confirmModal("Delete project " + p.name + "?", "Its " + changeOrdersFor(p.id).length + " change order(s) are removed and its cards are unlinked (not deleted). Undoable.", function () {
        mutate(function () {
          state.changeOrders = (state.changeOrders || []).filter(function (co) { return co.projectId !== p.id; });
          state.cards.forEach(function (c) { if (c.projectId === p.id) c.projectId = null; });
          state.projects = state.projects.filter(function (x) { return x.id !== p.id; });
        });
        toast("Project deleted");
      });
    } });
    foot.push({ label: "Close", cls: "btn", fn: closeModal });
    if (canEdit()) foot.push({ label: isNew ? "Create project" : "Save", cls: "btn primary", fn: function () {
      var name = $("#paName").value.trim();
      if (!name) { toast("Project name is required", "err"); return; }
      mutate(function () {
        p.name = name; p.client = $("#paClient").value.trim(); p.boardId = $("#paBoard").value;
        p.status = $("#paStatus").value; p.budget = parseFloat($("#paBudget").value) || 0;
        p.billable = $("#paBillable").checked; p.startDate = $("#paStart").value || null; p.endDate = $("#paEnd").value || null;
        if (p._new) { delete p._new; p.baseline = { budget: p.budget, endDate: p.endDate }; state.projects.push(p); }
      });
      closeModal();
      toast(isNew ? "Project created" : "Project saved", "ok");
    } });
    modal(isNew ? "New project" : "Administer · " + p.name, body, foot);
    setTimeout(function () { var n = $("#paName"); if (n && isNew) n.focus(); }, 30);
  }

  function coStatusBadge(s) {
    var cls = s === "Approved" || s === "Implemented" ? "ok" : s === "Rejected" ? "danger" : s === "Under Review" ? "warn" : "neutral";
    return "<span class='badge " + cls + "'>" + esc(s) + "</span>";
  }
  function nextCoNumber() {
    var max = 0;
    (state.changeOrders || []).forEach(function (co) { var m = String(co.number || "").match(/(\d+)/); if (m) max = Math.max(max, parseInt(m[1], 10)); });
    var n = max + 1;
    return "CO-" + (n < 100 ? ("00" + n).slice(-3) : n);
  }

  /* ---------- Change Control register (PMI integrated change control) ---------- */
  VIEWS.changecontrol = function (root) {
    var head = pageHead("Change Control", "Integrated change control: requests, CCB decisions, and baseline impact across all projects.");
    if (canEdit() && state.projects.length) {
      var addBtn = el("button", { class: "btn primary sm" }, "+ New change order");
      addBtn.addEventListener("click", function () { openChangeOrderEditor(null, state.projects[0].id); });
      head.querySelector(".head-actions").appendChild(addBtn);
    }
    root.appendChild(head);

    var cos = (state.changeOrders || []).slice();
    var pending = cos.filter(function (c) { return !coApproved(c) && c.status !== "Rejected"; });
    var approved = cos.filter(coApproved);
    var approvedBudget = approved.reduce(function (a, c) { return a + (c.budgetDelta || 0); }, 0);
    var approvedDays = approved.reduce(function (a, c) { return a + (c.scheduleDeltaDays || 0); }, 0);
    var pendingBudget = pending.reduce(function (a, c) { return a + (c.budgetDelta || 0); }, 0);

    var stats = el("div", { class: "grid cols-4" });
    stats.appendChild(statCard("Total change orders", cos.length, approved.length + " approved"));
    stats.appendChild(statCard("Pending CCB", pending.length, money(pendingBudget) + " at stake", pending.length ? "warn" : "ok"));
    stats.appendChild(statCard("Approved Δ budget", (approvedBudget >= 0 ? "+" : "") + money(approvedBudget), "applied to baselines", approvedBudget > 0 ? "warn" : "ok"));
    stats.appendChild(statCard("Approved Δ schedule", approvedDays + " days", "across projects", approvedDays > 0 ? "warn" : "ok"));
    root.appendChild(stats);

    if (!cos.length) { root.appendChild(el("div", { class: "panel panel-pad empty mt" }, "No change orders yet. Raise one from here or from a project's admin panel.")); return; }

    var panel = el("div", { class: "panel mt" });
    var tbl = el("table", { class: "table" });
    var fin = canFinance();
    tbl.innerHTML = "<thead><tr><th>#</th><th>Project</th><th>Title</th><th>Category</th>" + (fin ? "<th class='num'>Δ Budget</th>" : "") + "<th class='num'>Δ Days</th><th>Scope</th><th>Status</th><th>Requested</th></tr></thead>";
    var tb = el("tbody");
    cos.sort(function (a, b) { return String(b.requestedDate || "").localeCompare(String(a.requestedDate || "")); }).forEach(function (co) {
      var p = projectById(co.projectId);
      var tr = el("tr", { style: "cursor:pointer" });
      tr.innerHTML = "<td>" + esc(co.number) + "</td>" +
        "<td>" + (p ? esc(p.name) : "—") + "</td>" +
        "<td><strong>" + esc(co.title) + "</strong></td>" +
        "<td><span class='chip label'>" + esc(co.category) + "</span></td>" +
        (fin ? "<td class='num'>" + (co.budgetDelta ? money(co.budgetDelta) : "—") + "</td>" : "") +
        "<td class='num'>" + (co.scheduleDeltaDays || "—") + "</td>" +
        "<td class='muted'>" + ((co.scopeItems || []).length ? (co.scopeItems.length + " item" + (co.scopeItems.length > 1 ? "s" : "")) : "—") + "</td>" +
        "<td>" + coStatusBadge(co.status) + (co.applied ? " <span class='faint' title='Applied to baseline'>●</span>" : "") + "</td>" +
        "<td class='muted'>" + fmtDate(co.requestedDate) + "</td>";
      tr.addEventListener("click", function () { openChangeOrderEditor(co.id, co.projectId); });
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    panel.appendChild(tbl);
    root.appendChild(panel);
    if (!fin) root.appendChild(el("div", { class: "warn-banner mt" }, "Budget figures and CCB approval are limited to manager roles. You can raise and review requests."));
  };

  function openChangeOrderEditor(coId, projectId) {
    if (!canEdit()) { toast("Viewer role is read-only", "err"); return; }
    var isNew = !coId;
    var co = coId ? (state.changeOrders.filter(function (x) { return x.id === coId; })[0]) : {
      id: uid("co"), projectId: projectId || (state.projects[0] || {}).id, number: nextCoNumber(), title: "", category: "Scope",
      description: "", requestedBy: (currentUser() || {}).displayName || "", requestedDate: todayISO(),
      budgetDelta: 0, scheduleDeltaDays: 0, scopeItems: [], status: "Requested", decidedDate: "", decidedBy: "", notes: "", applied: false, createdCardIds: [], _new: true,
    };
    var fin = canFinance();
    // Non-managers cannot move a CO into an approving (budget-impacting) state.
    var statusOpts = CO_STATUS.filter(function (s) { return fin || (s !== "Approved" && s !== "Implemented"); });
    if (statusOpts.indexOf(co.status) === -1) statusOpts.push(co.status);

    var body = el("div");
    body.innerHTML =
      "<div class='form-grid'>" +
      "<div class='form-row'><label class='field-label inline'>Number</label><input class='input' id='coNum' value='" + esc(co.number) + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Project</label><select class='select' id='coProject'>" + state.projects.map(function (p) { return "<option value='" + p.id + "'" + (p.id === co.projectId ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row full'><label class='field-label inline'>Title</label><input class='input' id='coTitle' value='" + esc(co.title) + "' placeholder='Short change description'></div>" +
      "<div class='form-row full'><label class='field-label inline'>Description / justification</label><textarea class='textarea' id='coDesc'>" + esc(co.description) + "</textarea></div>" +
      "<div class='form-row'><label class='field-label inline'>Category</label><select class='select' id='coCat'>" + CO_CATEGORIES.map(function (c) { return "<option" + (c === co.category ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Requested by</label><input class='input' id='coBy' value='" + esc(co.requestedBy) + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Δ Budget ($)</label><input class='input' type='number' id='coBudget' value='" + (co.budgetDelta || 0) + "'" + (fin ? "" : " disabled") + "></div>" +
      "<div class='form-row'><label class='field-label inline'>Δ Schedule (days)</label><input class='input' type='number' id='coDays' value='" + (co.scheduleDeltaDays || 0) + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Status</label><select class='select' id='coStatus'>" + statusOpts.map(function (s) { return "<option" + (s === co.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Decision notes</label><input class='input' id='coNotes' value='" + esc(co.notes || "") + "'></div>" +
      "</div>";

    // Additional scope items (cards created on approval)
    var scopeWrap = el("div", { class: "mt" });
    scopeWrap.innerHTML = "<label class='field-label inline'>Additional scope (cards created on approval)</label>";
    var scopeList = el("div", { id: "coScope" });
    (co.scopeItems || []).forEach(function (it) { scopeList.appendChild(scopeRow(it)); });
    scopeWrap.appendChild(scopeList);
    var addScope = el("button", { class: "btn sm mt", type: "button" }, "+ Add scope item");
    addScope.addEventListener("click", function () { scopeList.appendChild(scopeRow({ title: "", estimate: 0 })); });
    scopeWrap.appendChild(addScope);
    body.appendChild(scopeWrap);
    if (co.applied) body.appendChild(el("div", { class: "warn-banner mt" }, "This change order is approved and applied to the project baseline (" + (co.createdCardIds || []).length + " scope card(s) created). Changing it to a non-approved status will reverse the budget, schedule, and scope impact."));

    var foot = [];
    if (!isNew) foot.push({ label: "Delete", cls: "btn danger", side: "left", fn: function () {
      closeModal();
      confirmModal("Delete change order " + co.number + "?", co.applied ? "It is applied; its baseline and scope impact will be reversed first." : "This removes the request.", function () {
        mutate(function () { if (co.applied) revertChangeOrder(co); state.changeOrders = state.changeOrders.filter(function (x) { return x.id !== co.id; }); });
        toast("Change order deleted");
      });
    } });
    foot.push({ label: "Cancel", cls: "btn", fn: closeModal });
    foot.push({ label: isNew ? "Raise change order" : "Save", cls: "btn primary", fn: function () {
      var title = $("#coTitle").value.trim();
      if (!title) { toast("Title is required", "err"); return; }
      var newStatus = $("#coStatus").value;
      var scopeItems = [].slice.call(scopeList.querySelectorAll(".scope-row")).map(function (rowEl) {
        return { title: rowEl.querySelector(".scope-title").value.trim(), estimate: parseFloat(rowEl.querySelector(".scope-est").value) || 0 };
      }).filter(function (x) { return x.title; });
      mutate(function () {
        co.number = $("#coNum").value.trim() || co.number;
        co.projectId = $("#coProject").value;
        co.title = title;
        co.description = $("#coDesc").value;
        co.category = $("#coCat").value;
        co.requestedBy = $("#coBy").value;
        if (fin) co.budgetDelta = parseFloat($("#coBudget").value) || 0;
        co.scheduleDeltaDays = parseFloat($("#coDays").value) || 0;
        co.notes = $("#coNotes").value;
        // Scope items can only change while not yet applied.
        if (!co.applied) co.scopeItems = scopeItems;
        var becomingApproved = coApprovedStatus(newStatus) && !coApproved(co);
        co.status = newStatus;
        if (becomingApproved) { co.decidedDate = todayISO(); co.decidedBy = (currentUser() || {}).displayName || ""; }
        if (co._new) { delete co._new; state.changeOrders.push(co); }
        reconcileChangeOrder(co); // applies or reverses baseline impact to match status
      });
      closeModal();
      toast(isNew ? "Change order raised" : "Change order saved", "ok");
    } });
    modal((isNew ? "New change order" : co.number) + " · integrated change control", body, foot);
    setTimeout(function () { var t = $("#coTitle"); if (t) t.focus(); }, 30);
  }
  function coApprovedStatus(s) { return s === "Approved" || s === "Implemented"; }
  function scopeRow(it) {
    var row = el("div", { class: "scope-row flex", style: "gap:8px;margin-top:6px" });
    var t = el("input", { class: "input scope-title", placeholder: "Scope task" }); t.value = it.title || "";
    var e = el("input", { class: "input scope-est", type: "number", placeholder: "hrs", style: "max-width:90px" }); e.value = it.estimate || 0;
    var del = el("button", { class: "btn sm ghost", type: "button" }, "✕");
    del.addEventListener("click", function () { row.remove(); });
    row.appendChild(t); row.appendChild(e); row.appendChild(del);
    return row;
  }

  /* ---------- Funded Value / EAC history ---------- */
  function fvEacSeries(isFP) {
    return [
      { key: "fundedValue", label: "Funded Value", kind: "step", color: "#2563eb", on: !isFP },
      { key: "targetCostBudget", label: "Target Cost Budget", kind: "step", color: "#c2780b", on: true },
      { key: "billEAC", label: "Bill EAC", kind: "point", color: "#0f766e", on: !isFP },
      { key: "costEAC", label: "Cost EAC", kind: "point", color: "#dc2626", on: true },
    ];
  }
  function fvEacChart(data, series) {
    var w = 640, h = 280, pad = 44;
    var dates = data.map(function (d) { return parseDate(d.date).getTime(); });
    var minX = Math.min.apply(null, dates), maxX = Math.max.apply(null, dates);
    var spanX = Math.max(1, maxX - minX);
    var vals = [];
    series.filter(function (s) { return s.on; }).forEach(function (s) { data.forEach(function (d) { if (d[s.key] != null) vals.push(d[s.key]); }); });
    var maxY = Math.max.apply(null, vals.concat([1]));
    function X(ts) { return pad + ((ts - minX) / spanX) * (w - pad * 2); }
    function Y(v) { return h - pad - (v / maxY) * (h - pad * 2); }
    var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" role="img" aria-label="Funded value and EAC history">';
    // axes
    svg += '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" stroke="var(--border)"></line>';
    svg += '<line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (h - pad) + '" stroke="var(--border)"></line>';
    // y gridlines
    for (var g = 0; g <= 4; g++) { var yy = pad + g * (h - pad * 2) / 4; var vv = maxY * (1 - g / 4); svg += '<line x1="' + pad + '" y1="' + yy + '" x2="' + (w - pad) + '" y2="' + yy + '" stroke="var(--border)" stroke-dasharray="2 4" opacity="0.5"></line>'; svg += '<text x="' + (pad - 6) + '" y="' + (yy + 3) + '" text-anchor="end" font-size="9" fill="var(--text-faint)">' + money(vv) + '</text>'; }
    // x labels
    data.forEach(function (d) { var x = X(parseDate(d.date).getTime()); svg += '<text x="' + x + '" y="' + (h - pad + 14) + '" text-anchor="middle" font-size="9" fill="var(--text-faint)">' + fmtDate(d.date) + '</text>'; });
    // step lines
    series.filter(function (s) { return s.on && s.kind === "step"; }).forEach(function (s) {
      // step-after path: hold each value until the next dated event
      var pd = "", py = null;
      data.forEach(function (d) { if (d[s.key] == null) return; var x = X(parseDate(d.date).getTime()), y = Y(d[s.key]); if (py === null) { pd = "M" + x + "," + y; } else { pd += " L" + x + "," + py + " L" + x + "," + y; } py = y; });
      // extend last value to right edge
      var lastWith = null; data.forEach(function (d) { if (d[s.key] != null) lastWith = d; });
      if (lastWith != null) pd += " L" + (w - pad) + "," + Y(lastWith[s.key]);
      svg += '<path d="' + pd + '" fill="none" stroke="' + s.color + '" stroke-width="2"></path>';
    });
    // point series
    series.filter(function (s) { return s.on && s.kind === "point"; }).forEach(function (s) {
      data.forEach(function (d) {
        if (d[s.key] == null) return;
        var x = X(parseDate(d.date).getTime()), y = Y(d[s.key]);
        svg += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + s.color + '"><title>' + s.label + " · " + fmtDate(d.date) + " · " + d.event + " · " + money(d[s.key]) + '</title></circle>';
      });
    });
    svg += "</svg>";
    var wrap = el("div");
    wrap.innerHTML = svg;
    var legend = el("div", { class: "chart-legend" });
    series.forEach(function (s) {
      var lab = el("label", { style: "display:inline-flex;align-items:center;gap:6px;cursor:pointer" });
      lab.innerHTML = "<input type='checkbox' data-series='" + s.key + "'" + (s.on ? " checked" : "") + "><span class='tag-dot' style='background:" + s.color + "'></span>" + s.label + " <span class='faint'>(" + (s.kind === "step" ? "step" : "point") + ")</span>";
      legend.appendChild(lab);
    });
    wrap.appendChild(legend);
    return wrap;
  }
  function fvEacTable(data, series) {
    var active = series.filter(function (s) { return s.on; });
    var t = el("table", { class: "table" });
    t.innerHTML = "<thead><tr><th>Date</th><th>Event</th>" + active.map(function (s) { return "<th class='num'>" + esc(s.label) + "</th>"; }).join("") + "</tr></thead>";
    var tb = el("tbody");
    data.forEach(function (d) {
      tb.appendChild(el("tr", null, "<td>" + fmtDate(d.date) + "</td><td class='muted'>" + esc(d.event) + "</td>" +
        active.map(function (s) { return "<td class='num'>" + (d[s.key] == null ? "—" : money(d[s.key])) + "</td>"; }).join("")));
    });
    t.appendChild(tb);
    return t;
  }
  function openFvEacHistory(projectId) {
    var p = projectById(projectId);
    if (!p) return;
    if (!canFinance()) { toast("Financial views are limited to manager roles", "err"); return; }
    var isFP = p.contractType === "FP";
    var series = fvEacSeries(isFP);
    var data = fvEacHistory(p);
    var body = el("div");
    body.innerHTML = "<p class='muted' style='margin-top:0'>" + esc(p.name) + " · " + esc(p.contractType || "T&M") + " · Funded Value vs Bill EAC and Target Cost Budget vs Cost EAC. " +
      (isFP ? "Fixed-price view hides Funded Value and Bill EAC by default — toggle them on below." : "Toggle series and table fields below.") + "</p>";
    var chartHost = el("div", { class: "panel panel-pad" });
    var tableHost = el("div", { class: "mt" });
    body.appendChild(chartHost);
    body.appendChild(el("label", { class: "field-label inline mt" }, "Dataset (select fields via the legend)"));
    body.appendChild(tableHost);
    function draw() {
      chartHost.innerHTML = "";
      var chart = fvEacChart(data, series);
      chartHost.appendChild(chart);
      chart.querySelectorAll("[data-series]").forEach(function (cb) {
        cb.addEventListener("change", function () { var s = series.filter(function (x) { return x.key === cb.dataset.series; })[0]; s.on = cb.checked; draw(); });
      });
      tableHost.innerHTML = "";
      tableHost.appendChild(fvEacTable(data, series));
    }
    draw();
    modal("FV / EAC History", body, [{ label: "Close", cls: "btn primary", fn: closeModal }]);
  }

  /* ---------- Critical path (longest dependency chain by duration) ---------- */
  function criticalPath(cards) {
    var byId = {};
    cards.forEach(function (c) { byId[c.id] = c; });
    function dur(c) { return Math.max(1, c.estimateHours || 8) / 8; } // workdays
    var memo = {};
    var stack = {};
    function longest(id) {
      if (memo[id] != null) return memo[id];
      if (stack[id]) return 0; // guard against cycles
      stack[id] = true;
      var c = byId[id];
      var best = 0;
      (c && c.deps || []).forEach(function (dep) { if (byId[dep]) best = Math.max(best, longest(dep)); });
      stack[id] = false;
      return (memo[id] = best + dur(c));
    }
    var maxLen = 0, endId = null;
    cards.forEach(function (c) { var l = longest(c.id); if (l > maxLen) { maxLen = l; endId = c.id; } });
    // Walk back along the max-length predecessor chain.
    var path = {};
    var cur = endId;
    while (cur) {
      path[cur] = true;
      var c = byId[cur];
      var next = null, nv = -1;
      (c && c.deps || []).forEach(function (dep) { if (byId[dep] && memo[dep] > nv) { nv = memo[dep]; next = dep; } });
      cur = next;
    }
    return { set: path, lengthDays: Math.round(maxLen) };
  }

  /* ---------- Gantt & Critical Path ---------- */
  VIEWS.gantt = function (root) {
    var b = activeBoard();
    root.appendChild(pageHead("Gantt & Critical Path — " + b.name, "Scheduled work by date. The critical path (longest dependency chain) is highlighted."));
    var cards = boardCards(b.id).filter(function (c) { return c.due || c.startDate; });
    if (!cards.length) { root.appendChild(el("div", { class: "panel panel-pad empty" }, "No dated work on this board yet. Add start/due dates to cards to see the timeline.")); return; }

    // Determine date span.
    var dates = [];
    cards.forEach(function (c) { if (c.startDate) dates.push(parseDate(c.startDate)); if (c.due) dates.push(parseDate(c.due)); });
    var min = new Date(Math.min.apply(null, dates)), max = new Date(Math.max.apply(null, dates));
    min.setDate(min.getDate() - 2); max.setDate(max.getDate() + 2);
    var span = Math.max(1, (max - min) / 86400000);
    var cp = criticalPath(boardCards(b.id));

    var legend = el("div", { class: "flex wrap mb", style: "gap:14px;font-size:12px" });
    legend.innerHTML = "<span class='flex'><span class='gantt-swatch cp'></span> Critical path (" + cp.lengthDays + " workdays)</span>" +
      "<span class='flex'><span class='gantt-swatch'></span> Scheduled work</span>" +
      "<span class='flex'><span class='gantt-swatch ms'></span> Milestone</span>" +
      "<span class='flex'><span class='gantt-swatch late'></span> Overdue</span>";
    root.appendChild(legend);

    var panel = el("div", { class: "panel", style: "overflow-x:auto" });
    var chart = el("div", { class: "gantt" });
    // Month gridlines header
    var header = el("div", { class: "gantt-row gantt-head" });
    header.appendChild(el("div", { class: "gantt-label" }, "Task"));
    var track = el("div", { class: "gantt-track" });
    var cursor = new Date(min);
    while (cursor <= max) {
      var leftPct = ((cursor - min) / 86400000 / span) * 100;
      track.appendChild(el("div", { class: "gantt-grid", style: "left:" + leftPct + "%" },
        "<span>" + cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + "</span>"));
      cursor.setDate(cursor.getDate() + 7);
    }
    header.appendChild(track);
    chart.appendChild(header);

    cards.sort(function (a, c) { return (a.startDate || a.due || "").localeCompare(c.startDate || c.due || ""); });
    cards.forEach(function (c) {
      var s = parseDate(c.startDate || c.due);
      var e = parseDate(c.due || c.startDate);
      if (e < s) { var t = s; s = e; e = t; }
      var leftPct = ((s - min) / 86400000 / span) * 100;
      var widthPct = Math.max(1.5, ((e - s) / 86400000 / span) * 100);
      var onCP = cp.set[c.id];
      var overdue = daysUntil(c.due) != null && daysUntil(c.due) < 0 && !isDone(c);
      var r = resourceById(c.assigneeId);
      var row = el("div", { class: "gantt-row" });
      row.appendChild(el("div", { class: "gantt-label", title: c.title },
        "<button class='linklike' data-open-card='" + c.id + "'>" + (c.milestone ? "◆ " : "") + esc(c.title) + "</button>" +
        "<div class='faint' style='font-size:11px'>" + (r ? esc(r.name) : "Unassigned") + "</div>"));
      var rtrack = el("div", { class: "gantt-track" });
      var barCls = "gantt-bar" + (onCP ? " cp" : "") + (c.milestone ? " ms" : "") + (overdue ? " late" : "");
      var bar = el("div", { class: barCls, style: "left:" + leftPct + "%;width:" + widthPct + "%", title: fmtDate(c.startDate || c.due) + " → " + fmtDate(c.due || c.startDate) + (canEdit() ? " · drag to reschedule" : "") });
      bar.innerHTML = "<span class='gantt-fill' style='width:" + (c.progress || 0) + "%'></span><span class='gantt-bar-label'>" + (c.progress || 0) + "%</span>";
      setupGanttDrag(bar, rtrack, c, min, span);
      rtrack.appendChild(bar);
      row.appendChild(rtrack);
      chart.appendChild(row);
    });
    panel.appendChild(chart);
    root.appendChild(panel);
    if (canEdit()) root.appendChild(el("div", { class: "hint mt no-print" }, "Tip: drag a bar left or right to reschedule. Duration is preserved; the project schedule envelope and all EVM schedule metrics (PV, SV, SPI, EAC, VAC) recalculate after the move."));
  };

  // Shift a card's dates, preserving duration, and expand the project envelope.
  function rescheduleCard(c, deltaDays) {
    if (!deltaDays) return;
    mutate(function () {
      if (c.startDate) c.startDate = shiftDate(c.startDate, deltaDays);
      if (c.due) c.due = shiftDate(c.due, deltaDays);
      var p = c.projectId ? projectById(c.projectId) : null;
      if (p) {
        if (c.due && (!p.endDate || c.due > p.endDate)) p.endDate = c.due;
        if (c.startDate && (!p.startDate || c.startDate < p.startDate)) p.startDate = c.startDate;
      }
      logActivity(c, "Rescheduled " + (deltaDays > 0 ? "+" : "") + deltaDays + " day" + (Math.abs(deltaDays) === 1 ? "" : "s"));
    });
  }
  function setupGanttDrag(bar, rtrack, c, min, span) {
    if (!canEdit()) { bar.addEventListener("click", function () { openCardEditor(c.id); }); return; }
    var dragging = false, startX = 0, moved = 0, deltaDays = 0;
    bar.style.cursor = "grab";
    bar.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      dragging = true; startX = e.clientX; moved = 0; deltaDays = 0;
      try { bar.setPointerCapture(e.pointerId); } catch (x) {}
      bar.style.cursor = "grabbing";
    });
    bar.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      var w = rtrack.clientWidth || 1;
      deltaDays = Math.round((dx / w) * span);
      bar.style.transform = "translateX(" + dx + "px)";
    });
    function end() {
      if (!dragging) return;
      dragging = false; bar.style.cursor = "grab"; bar.style.transform = "";
      if (moved < 4) { openCardEditor(c.id); return; }
      if (deltaDays !== 0) rescheduleCard(c, deltaDays); else render();
    }
    bar.addEventListener("pointerup", end);
    bar.addEventListener("pointercancel", end);
  }

  /* ---------- Risk Register (PMBOK) ---------- */
  VIEWS.risks = function (root) {
    var head = pageHead("Risk Register", "Qualitative risk analysis (probability × impact), response strategy, and ownership.");
    if (canEdit()) {
      var addBtn = el("button", { class: "btn primary sm" }, "+ Add risk");
      addBtn.addEventListener("click", function () { openRiskEditor(null); });
      head.querySelector(".head-actions").appendChild(addBtn);
    }
    root.appendChild(head);

    var risks = state.risks || [];
    var open = risks.filter(function (r) { return r.status !== "Closed"; });
    var high = risks.filter(function (r) { return r.probability * r.impact >= 12 && r.status !== "Closed"; });
    var stats = el("div", { class: "grid cols-4" });
    stats.appendChild(statCard("Total risks", risks.length, open.length + " open"));
    stats.appendChild(statCard("High exposure", high.length, "score ≥ 12", high.length ? "danger" : "ok"));
    stats.appendChild(statCard("Mitigating", risks.filter(function (r) { return r.status === "Mitigating"; }).length, "active responses", "warn"));
    stats.appendChild(statCard("Closed", risks.filter(function (r) { return r.status === "Closed"; }).length, "retired"));
    root.appendChild(stats);

    var two = el("div", { class: "grid cols-2 mt" });
    var matrixPanel = el("div", { class: "panel panel-pad" });
    matrixPanel.appendChild(el("h2", null, "Probability × Impact matrix"));
    matrixPanel.appendChild(riskMatrix(risks));
    two.appendChild(matrixPanel);

    var byCat = {};
    risks.forEach(function (r) { byCat[r.category] = (byCat[r.category] || 0) + 1; });
    var catPanel = el("div", { class: "panel panel-pad" });
    catPanel.appendChild(el("h2", null, "Response strategy mix (PMBOK)"));
    var respCount = {};
    RISK_RESPONSES.forEach(function (rs) { respCount[rs] = risks.filter(function (r) { return r.response === rs && r.status !== "Closed"; }).length; });
    var maxResp = Math.max(1, Math.max.apply(null, RISK_RESPONSES.map(function (rs) { return respCount[rs]; })));
    RISK_RESPONSES.forEach(function (rs) {
      catPanel.appendChild(el("div", { class: "flex mt", style: "gap:10px" },
        "<span style='width:80px' class='muted'>" + rs + "</span><div class='bar' style='flex:1'><span class='ok' style='width:" + (respCount[rs] / maxResp * 100) + "%'></span></div><span class='muted'>" + respCount[rs] + "</span>"));
    });
    two.appendChild(catPanel);
    root.appendChild(two);

    var panel = el("div", { class: "panel mt" });
    var tbl = el("table", { class: "table" });
    tbl.innerHTML = "<thead><tr><th>Risk</th><th>Project</th><th>Category</th><th class='num'>P</th><th class='num'>I</th><th class='num'>Score</th><th>Response</th><th>Owner</th><th>Status</th></tr></thead>";
    var tb = el("tbody");
    risks.slice().sort(function (a, c) { return (c.probability * c.impact) - (a.probability * a.impact); }).forEach(function (rk) {
      var score = rk.probability * rk.impact;
      var sev = score >= 15 ? "danger" : score >= 8 ? "warn" : "ok";
      var p = projectById(rk.projectId);
      var owner = resourceById(rk.ownerId);
      var tr = el("tr", { style: "cursor:pointer" });
      tr.innerHTML =
        "<td><strong>" + esc(rk.title) + "</strong></td>" +
        "<td class='muted'>" + (p ? esc(p.name) : "—") + "</td>" +
        "<td><span class='chip label'>" + esc(rk.category) + "</span></td>" +
        "<td class='num'>" + rk.probability + "</td><td class='num'>" + rk.impact + "</td>" +
        "<td class='num'><span class='badge " + sev + "'>" + score + "</span></td>" +
        "<td>" + esc(rk.response) + "</td>" +
        "<td class='muted'>" + (owner ? esc(owner.name) : "—") + "</td>" +
        "<td><span class='badge " + (rk.status === "Closed" ? "ok" : rk.status === "Mitigating" ? "warn" : "neutral") + "'>" + esc(rk.status) + "</span></td>";
      if (canEdit()) tr.addEventListener("click", function () { openRiskEditor(rk.id); });
      tb.appendChild(tr);
    });
    if (!risks.length) tb.appendChild(el("tr", null, "<td colspan='9' class='empty'>No risks logged. Add the first risk to start the register.</td>"));
    tbl.appendChild(tb);
    panel.appendChild(tbl);
    root.appendChild(panel);
  };

  function riskMatrix(risks) {
    var counts = {};
    risks.filter(function (r) { return r.status !== "Closed"; }).forEach(function (r) {
      var k = r.probability + "x" + r.impact;
      counts[k] = (counts[k] || 0) + 1;
    });
    var wrap = el("div", { class: "risk-matrix" });
    // Header row (impact axis)
    var head = el("div", { class: "rm-row" });
    head.appendChild(el("div", { class: "rm-cell rm-axis" }, "P＼I"));
    for (var i = 1; i <= 5; i++) head.appendChild(el("div", { class: "rm-cell rm-axis" }, String(i)));
    wrap.appendChild(head);
    for (var p = 5; p >= 1; p--) {
      var row = el("div", { class: "rm-row" });
      row.appendChild(el("div", { class: "rm-cell rm-axis" }, String(p)));
      for (var im = 1; im <= 5; im++) {
        var score = p * im;
        var sev = score >= 15 ? "danger" : score >= 8 ? "warn" : "ok";
        var n = counts[p + "x" + im] || 0;
        row.appendChild(el("div", { class: "rm-cell rm-" + sev + (n ? " has" : ""), title: "P" + p + " × I" + im + " = " + score }, n ? String(n) : ""));
      }
      wrap.appendChild(row);
    }
    return wrap;
  }

  function openRiskEditor(riskId) {
    if (!canEdit()) { toast("Viewer role is read-only", "err"); return; }
    var rk = riskId ? (state.risks.filter(function (r) { return r.id === riskId; })[0]) : {
      id: uid("rk"), projectId: state.projects[0] ? state.projects[0].id : null, title: "", category: "Technical",
      probability: 3, impact: 3, response: "Mitigate", ownerId: null, status: "Open", trigger: "", notes: "", _new: true,
    };
    var scaleOpts = function (sel) { return RISK_SCALE.map(function (s) { return "<option value='" + s.v + "'" + (s.v === sel ? " selected" : "") + ">" + s.v + " · " + s.label + "</option>"; }).join(""); };
    var body = el("div");
    body.innerHTML =
      "<div class='form-grid'>" +
      "<div class='form-row full'><label class='field-label inline'>Risk statement</label><input class='input' id='rkTitle' value='" + esc(rk.title) + "' placeholder='If … then … impact …'></div>" +
      "<div class='form-row'><label class='field-label inline'>Project</label><select class='select' id='rkProject'><option value=''>Portfolio-level</option>" + state.projects.map(function (p) { return "<option value='" + p.id + "'" + (p.id === rk.projectId ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Category</label><select class='select' id='rkCategory'>" + ["Technical", "Schedule", "Cost", "Resource", "Compliance", "External", "Quality"].map(function (c) { return "<option" + (c === rk.category ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Probability</label><select class='select' id='rkProb'>" + scaleOpts(rk.probability) + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Impact</label><select class='select' id='rkImpact'>" + scaleOpts(rk.impact) + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Response (PMBOK)</label><select class='select' id='rkResponse'>" + RISK_RESPONSES.map(function (c) { return "<option" + (c === rk.response ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Status</label><select class='select' id='rkStatus'>" + RISK_STATUS.map(function (c) { return "<option" + (c === rk.status ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Owner</label><select class='select' id='rkOwner'><option value=''>Unassigned</option>" + state.resources.map(function (r) { return "<option value='" + r.id + "'" + (r.id === rk.ownerId ? " selected" : "") + ">" + esc(r.name) + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Trigger</label><input class='input' id='rkTrigger' value='" + esc(rk.trigger) + "' placeholder='Early warning sign'></div>" +
      "<div class='form-row full'><label class='field-label inline'>Response plan / notes</label><textarea class='textarea' id='rkNotes'>" + esc(rk.notes) + "</textarea></div>" +
      "</div>";
    var foot = [];
    if (!rk._new) foot.push({ label: "Delete", cls: "btn danger", side: "left", fn: function () {
      closeModal();
      confirmModal("Delete risk?", "This removes it from the register. You can undo.", function () {
        mutate(function () { state.risks = state.risks.filter(function (r) { return r.id !== rk.id; }); });
        toast("Risk deleted");
      });
    } });
    foot.push({ label: "Cancel", cls: "btn", fn: closeModal });
    foot.push({ label: rk._new ? "Add risk" : "Save", cls: "btn primary", fn: function () {
      var title = $("#rkTitle").value.trim();
      if (!title) { toast("Risk statement is required", "err"); return; }
      var wasNew = !!rk._new;
      mutate(function () {
        rk.title = title;
        rk.projectId = $("#rkProject").value || null;
        rk.category = $("#rkCategory").value;
        rk.probability = parseInt($("#rkProb").value, 10);
        rk.impact = parseInt($("#rkImpact").value, 10);
        rk.response = $("#rkResponse").value;
        rk.status = $("#rkStatus").value;
        rk.ownerId = $("#rkOwner").value || null;
        rk.trigger = $("#rkTrigger").value;
        rk.notes = $("#rkNotes").value;
        if (wasNew) { delete rk._new; state.risks.push(rk); }
      });
      closeModal();
      toast(wasNew ? "Risk added" : "Risk saved", "ok");
    } });
    modal(rk._new ? "New risk" : "Edit risk", body, foot);
    setTimeout(function () { var t = $("#rkTitle"); if (t) t.focus(); }, 30);
  }

  /* ---------- Manager Report ---------- */
  VIEWS.reports = function (root) {
    if (!canFinance()) {
      root.appendChild(pageHead("Manager Report", "Restricted view."));
      root.appendChild(el("div", { class: "warn-banner" }, "The manager report includes financial data and is limited to manager roles. Switch role to a manager to view, or open the Client Report."));
      return;
    }
    var head = pageHead("Manager Report", "Internal portfolio briefing with full financials. " + fmtDateLong(todayISO()) + ".");
    var actions = el("div", { class: "head-actions no-print" });
    var printBtn = el("button", { class: "btn" }, "🖨 Print / PDF");
    printBtn.addEventListener("click", function () { window.print(); });
    var csvBtn = el("button", { class: "btn" }, "⬇ Export CSV");
    csvBtn.addEventListener("click", exportReportCSV);
    var jiraBtn = el("button", { class: "btn" }, "⬇ Jira CSV");
    jiraBtn.addEventListener("click", exportJiraCSV);
    actions.appendChild(printBtn); actions.appendChild(csvBtn); actions.appendChild(jiraBtn);
    head.querySelector(".head-actions") ? head.querySelector(".head-actions").appendChild(actions) : head.appendChild(actions);
    root.appendChild(head);

    var t = portfolioTotals();
    var stats = el("div", { class: "grid cols-4" });
    stats.appendChild(statCard("Billable value", money(t.revenue), "across billable projects"));
    stats.appendChild(statCard("Cost to date", money(t.spent), "logged effort"));
    stats.appendChild(statCard("Margin", money(t.margin), t.margin < 0 ? "over budget" : "on track", t.margin < 0 ? "danger" : "ok"));
    stats.appendChild(statCard("Overdue", t.overdue, t.dueSoon + " due in 7 days", t.overdue > 0 ? "danger" : "ok"));
    root.appendChild(stats);

    var panel = el("div", { class: "panel mt" });
    panel.appendChild(el("div", { class: "panel-pad" }, "<h2>Project financials</h2>"));
    var tbl = el("table", { class: "table" });
    tbl.innerHTML = "<thead><tr><th>Project</th><th>Client</th><th>Type</th><th class='num'>Budget</th><th class='num'>Spent</th><th class='num'>Mult.</th><th class='num'>CM %</th><th class='num'>Margin $</th><th class='num'>Progress</th></tr></thead>";
    var tb = el("tbody");
    state.projects.forEach(function (p) {
      var r = projectRollup(p);
      var mult = projectMultiplier(p), cm = projectCMPct(p), hasRev = projectEarnedRevenue(p) > 0;
      tb.appendChild(el("tr", null,
        "<td><strong>" + esc(p.name) + "</strong></td>" +
        "<td class='muted'>" + esc(p.client) + "</td>" +
        "<td><span class='chip label'>" + esc(p.contractType || "T&M") + "</span></td>" +
        "<td class='num'>" + money(r.budget) + "</td>" +
        "<td class='num'>" + money(r.spent) + "</td>" +
        "<td class='num'>" + (p.billable && mult ? multStr(mult) : "<span class='muted'>—</span>") + "</td>" +
        "<td class='num'>" + (p.billable && hasRev ? "<span class='badge " + cmStatusClass(cm) + "'>" + cm.toFixed(1) + "%</span>" : "<span class='muted'>—</span>") + "</td>" +
        "<td class='num'>" + (p.billable ? money(r.margin) : "<span class='muted'>internal</span>") + "</td>" +
        "<td class='num'>" + r.progress + "%</td>"));
    });
    var tot = portfolioTotals();
    var prog = programMultiplier();
    tb.appendChild(el("tr", { style: "font-weight:700;border-top:2px solid var(--border-strong)" },
      "<td>Program total</td><td></td><td></td><td class='num'>" + money(tot.budget) + "</td><td class='num'>" + money(tot.spent) + "</td><td class='num'>" + (prog.multiplier ? multStr(prog.multiplier) : "—") + "</td><td class='num'>" + (prog.revenue > 0 ? "<span class='badge " + cmStatusClass(prog.cm) + "'>" + prog.cm.toFixed(1) + "%</span>" : "—") + "</td><td class='num'>" + money(tot.margin) + "</td><td></td>"));
    tbl.appendChild(tb);
    panel.appendChild(tbl);
    root.appendChild(panel);

    // PMI Earned Value Management
    var evmPanel = el("div", { class: "panel mt" });
    evmPanel.appendChild(el("div", { class: "panel-pad" },
      "<h2>Earned Value Management (PMI / PMBOK)</h2>" +
      "<p class='muted' style='margin:0;font-size:12px'>Cost basis. BAC budget at completion · PV planned value · EV earned value · AC actual cost · CV cost variance · SV schedule variance (in $) · CPI cost performance index · SPI schedule performance index · EAC estimate at completion · VAC variance at completion (BAC − EAC).</p>"));
    var et = el("table", { class: "table" });
    et.innerHTML = "<thead><tr><th>Project</th><th class='num'>BAC</th><th class='num'>PV</th><th class='num'>EV</th><th class='num'>AC</th><th class='num'>CV</th><th class='num'>SV</th><th class='num'>CPI</th><th class='num'>SPI</th><th class='num'>EAC</th><th class='num'>VAC</th></tr></thead>";
    var etb = el("tbody");
    state.projects.forEach(function (p) {
      var v = projectEVM(p);
      var cpiBadge = "<span class='badge " + (v.cpi >= 1 ? "ok" : v.cpi >= 0.9 ? "warn" : "danger") + "'>" + num2(v.cpi) + "</span>";
      var spiBadge = "<span class='badge " + (v.spi >= 1 ? "ok" : v.spi >= 0.9 ? "warn" : "danger") + "'>" + num2(v.spi) + "</span>";
      etb.appendChild(el("tr", null,
        "<td><strong>" + esc(p.name) + "</strong></td>" +
        "<td class='num'>" + money(v.bac) + "</td>" +
        "<td class='num'>" + money(v.pv) + "</td>" +
        "<td class='num'>" + money(v.ev) + "</td>" +
        "<td class='num'>" + money(v.ac) + "</td>" +
        "<td class='num'>" + (v.cv < 0 ? "<span class='badge danger'>" + money(v.cv) + "</span>" : money(v.cv)) + "</td>" +
        "<td class='num'>" + (v.sv < 0 ? "<span class='badge warn'>" + money(v.sv) + "</span>" : money(v.sv)) + "</td>" +
        "<td class='num'>" + cpiBadge + "</td>" +
        "<td class='num'>" + spiBadge + "</td>" +
        "<td class='num'>" + money(v.eac) + "</td>" +
        "<td class='num'>" + (v.vac < 0 ? "<span class='badge danger'>" + money(v.vac) + "</span>" : money(v.vac)) + "</td>"));
    });
    // Program roll-up row (all projects as one program).
    var pe = programEVM();
    var peCpi = "<span class='badge " + (pe.cpi >= 1 ? "ok" : pe.cpi >= 0.9 ? "warn" : "danger") + "'>" + num2(pe.cpi) + "</span>";
    var peSpi = "<span class='badge " + (pe.spi >= 1 ? "ok" : pe.spi >= 0.9 ? "warn" : "danger") + "'>" + num2(pe.spi) + "</span>";
    var peVac = pe.bac - pe.eac;
    etb.appendChild(el("tr", { style: "font-weight:700;border-top:2px solid var(--border-strong)" },
      "<td>Program (all projects)</td>" +
      "<td class='num'>" + money(pe.bac) + "</td><td class='num'>" + money(pe.pv) + "</td><td class='num'>" + money(pe.ev) + "</td>" +
      "<td class='num'>" + money(pe.ac) + "</td><td class='num'>" + money(pe.cv) + "</td><td class='num'>" + money(pe.sv) + "</td>" +
      "<td class='num'>" + peCpi + "</td><td class='num'>" + peSpi + "</td><td class='num'>" + money(pe.eac) + "</td><td class='num'>" + money(peVac) + "</td>"));
    et.appendChild(etb);
    evmPanel.appendChild(et);
    root.appendChild(evmPanel);

    // Program-level EVM summary (portfolio as one program of common projects)
    var progPanel = el("div", { class: "panel panel-pad mt" });
    progPanel.appendChild(el("h2", null, "Program performance — " + pe.projects + " projects as one program"));
    var pg = el("div", { class: "grid cols-4" });
    pg.appendChild(statCard("Program EV / BAC", money(pe.ev) + " / " + money(pe.bac), pct(pe.bac ? pe.ev / pe.bac * 100 : 0) + " earned"));
    pg.appendChild(statCard("Actual cost (AC)", money(pe.ac), money(pe.cv) + " cost variance", pe.cv < 0 ? "danger" : "ok"));
    pg.appendChild(statCard("Program CPI", num2(pe.cpi), pe.cpi >= 1 ? "on/under cost" : "over cost", pe.cpi >= 1 ? "ok" : pe.cpi >= 0.9 ? "warn" : "danger"));
    pg.appendChild(statCard("Program SPI", num2(pe.spi), pe.spi >= 1 ? "on/ahead of schedule" : "behind schedule", pe.spi >= 1 ? "ok" : pe.spi >= 0.9 ? "warn" : "danger"));
    progPanel.appendChild(pg);
    var pg2 = el("div", { class: "grid cols-3 mt" });
    pg2.appendChild(statCard("Schedule variance (SV)", money(pe.sv), "earned vs planned", pe.sv < 0 ? "warn" : "ok"));
    pg2.appendChild(statCard("Estimate at completion (EAC)", money(pe.eac), "BAC ÷ CPI", pe.eac > pe.bac ? "danger" : "ok"));
    pg2.appendChild(statCard("Variance at completion (VAC)", money(pe.bac - pe.eac), "BAC − EAC", (pe.bac - pe.eac) < 0 ? "danger" : "ok"));
    progPanel.appendChild(pg2);
    root.appendChild(progPanel);

    var insightPanel = el("div", { class: "panel panel-pad mt" });
    insightPanel.appendChild(el("h2", null, "Manager actions & risks"));
    insights().forEach(function (i) {
      var ico = i.level === "danger" ? "⛔" : i.level === "warn" ? "⚠️" : "✅";
      insightPanel.appendChild(el("div", { class: "insight " + i.level },
        '<span class="ico">' + ico + '</span><div class="insight-body"><strong>' + esc(i.title) + "</strong><span>" + esc(i.body) + "</span></div>"));
    });
    root.appendChild(insightPanel);
  };

  /* ---------- Client Report ---------- */
  VIEWS.client = function (root) {
    var billable = state.projects.filter(function (p) { return p.billable; });
    var head = pageHead("Client Project Briefing", "Printable status snapshot. Internal cost and margin are excluded.");
    var actions = el("div", { class: "head-actions no-print" });
    var sel = el("select", { class: "select select-sm" }, billable.map(function (p, i) {
      return "<option value='" + p.id + "'>" + esc(p.name) + " — " + esc(p.client) + "</option>";
    }).join(""));
    var printBtn = el("button", { class: "btn primary" }, "🖨 Print / PDF");
    printBtn.addEventListener("click", function () { window.print(); });
    actions.appendChild(sel); actions.appendChild(printBtn);
    head.appendChild(actions);
    root.appendChild(head);

    var container = el("div", { id: "clientReportBody" });
    root.appendChild(container);
    function draw(pid2) {
      container.innerHTML = "";
      var p = projectById(pid2);
      if (!p) { container.appendChild(el("div", { class: "empty" }, "No billable project selected.")); return; }
      container.appendChild(renderClientReport(p));
    }
    sel.addEventListener("change", function () { draw(this.value); });
    draw(billable.length ? billable[0].id : null);
  };

  function renderClientReport(p) {
    var r = projectRollup(p);
    var cs = state.cards.filter(function (c) { return c.projectId === p.id; });
    var wrap = el("div");

    var header = el("div", { class: "panel panel-pad" });
    header.innerHTML =
      "<div class='flex' style='justify-content:space-between;align-items:flex-start'>" +
      "<div><div class='brand' style='padding:0'><div class='brand-mark'>TO</div><div class='brand-text'><strong>Techniek Engineering</strong><span>Project Status Briefing</span></div></div></div>" +
      "<div class='right muted'><div><strong style='color:var(--text);font-size:16px'>" + esc(p.name) + "</strong></div><div>" + esc(p.client) + "</div><div>" + fmtDateLong(todayISO()) + "</div></div>" +
      "</div>";
    wrap.appendChild(header);

    var stats = el("div", { class: "grid cols-4 mt" });
    stats.appendChild(statCard("Overall progress", r.progress + "%", p.status));
    stats.appendChild(statCard("Milestones", cs.filter(function (c) { return c.milestone && isDone(c); }).length + "/" + cs.filter(function (c) { return c.milestone; }).length, "completed"));
    stats.appendChild(statCard("Deliverables", r.done + "/" + r.cards, "complete"));
    stats.appendChild(statCard("Target date", fmtDate(p.endDate), "planned completion"));
    wrap.appendChild(stats);

    // Milestones
    var msPanel = el("div", { class: "panel panel-pad mt" });
    msPanel.appendChild(el("h2", null, "Key milestones"));
    var milestones = cs.filter(function (c) { return c.milestone; }).sort(function (a, b) { return (a.due || "").localeCompare(b.due || ""); });
    if (!milestones.length) msPanel.appendChild(el("div", { class: "muted" }, "No milestones defined."));
    else {
      var mt = el("table", { class: "table" });
      mt.innerHTML = "<thead><tr><th>Milestone</th><th>Target</th><th>Status</th></tr></thead>";
      var mtb = el("tbody");
      milestones.forEach(function (c) {
        var st = isDone(c) ? "<span class='badge ok'>Complete</span>" : daysUntil(c.due) < 0 ? "<span class='badge warn'>In progress</span>" : "<span class='badge neutral'>Planned</span>";
        mtb.appendChild(el("tr", null, "<td>" + esc(c.title) + "</td><td>" + fmtDate(c.due) + "</td><td>" + st + "</td>"));
      });
      mt.appendChild(mtb); msPanel.appendChild(mt);
    }
    wrap.appendChild(msPanel);

    // Recent / active deliverables (no cost)
    var actPanel = el("div", { class: "panel panel-pad mt" });
    actPanel.appendChild(el("h2", null, "Current workstream"));
    var at = el("table", { class: "table" });
    at.innerHTML = "<thead><tr><th>Deliverable</th><th>Stage</th><th>Progress</th><th>Target</th></tr></thead>";
    var atb = el("tbody");
    cs.filter(function (c) { return !c.milestone; }).sort(function (a, b) { return (b.progress || 0) - (a.progress || 0); }).slice(0, 12).forEach(function (c) {
      var col = columnName(c);
      atb.appendChild(el("tr", null,
        "<td>" + esc(c.title) + "</td><td class='muted'>" + esc(col) + "</td>" +
        "<td><div class='bar'><span class='ok' style='width:" + (c.progress || 0) + "%'></span></div></td>" +
        "<td class='muted'>" + fmtDate(c.due) + "</td>"));
    });
    at.appendChild(atb); actPanel.appendChild(at);
    wrap.appendChild(actPanel);

    // Billing snapshot — value only, no cost/margin
    var billPanel = el("div", { class: "panel panel-pad mt" });
    billPanel.appendChild(el("h2", null, "Billing snapshot"));
    var billed = Math.round(p.budget * (r.progress / 100));
    billPanel.innerHTML +=
      "<div class='grid cols-3'>" +
      statCardHTML("Contract value", money(p.budget), "agreed scope") +
      statCardHTML("Earned to date", money(billed), r.progress + "% complete") +
      statCardHTML("Remaining", money(p.budget - billed), "to be delivered") +
      "</div>" +
      "<div class='hint mt'>Figures reflect progress against the agreed contract value. Internal effort, cost, and margin are not shown.</div>";
    wrap.appendChild(billPanel);

    return wrap;
  }

  /* ---------- Settings / Data ---------- */
  VIEWS.settings = function (root) {
    root.appendChild(pageHead("Settings & Data", "Local-first workspace controls. Export before clearing browser data."));

    root.appendChild(el("div", { class: "warn-banner mb" },
      "⚠ Prototype / local-first app. Do not use for CUI, export-controlled, classified, proprietary client, or sensitive employee data until enterprise authentication, access control, encryption, and security review are implemented. Data is stored in this browser via localStorage unless exported."));

    var grid = el("div", { class: "grid cols-2" });

    var dataPanel = el("div", { class: "panel panel-pad" });
    dataPanel.appendChild(el("h2", null, "Workspace data"));
    dataPanel.appendChild(el("p", { class: "muted" }, "Schema version " + esc(state.version) + " · last saved " + new Date(state.savedAt).toLocaleString()));
    var row = el("div", { class: "flex wrap mt" });
    row.appendChild(mkBtn("⬇ Export JSON", "btn", exportJSON));
    row.appendChild(mkBtn("⬆ Import JSON", "btn", importJSONPrompt));
    row.appendChild(mkBtn("⬇ Reports CSV", "btn", exportReportCSV));
    dataPanel.appendChild(row);
    var row2 = el("div", { class: "flex wrap mt" });
    row2.appendChild(mkBtn("↻ Reset demo data", "btn", function () {
      confirmModal("Reset demo data?", "This replaces the current workspace with the fictional Techniek sample. Export first if you want a backup.", function () {
        snapshot(); state = demoWorkspace(); commit(); toast("Demo workspace restored", "ok");
      });
    }));
    row2.appendChild(mkBtn("🗑 Clear local data", "btn danger", function () {
      confirmModal("Clear all local data?", "This permanently removes the workspace from this browser. This cannot be undone except via a JSON backup.", function () {
        localStorage.removeItem(STORAGE_KEY); state = demoWorkspace(); undoStack.length = 0; redoStack.length = 0; commit(); toast("Local data cleared", "ok");
      });
    }));
    dataPanel.appendChild(row2);
    grid.appendChild(dataPanel);

    var prefPanel = el("div", { class: "panel panel-pad" });
    prefPanel.appendChild(el("h2", null, "Preferences"));
    var themeRow = el("div", { class: "form-row" });
    themeRow.innerHTML = "<label class='field-label inline'>Theme</label>";
    var themeSel = el("select", { class: "select" }, "<option value='light'>Light</option><option value='dark'>Dark</option>");
    themeSel.value = state.settings.theme;
    themeSel.addEventListener("change", function () { mutate(function () { state.settings.theme = themeSel.value; }); });
    themeRow.appendChild(themeSel);
    prefPanel.appendChild(themeRow);

    var roleRow = el("div", { class: "form-row mt" });
    roleRow.innerHTML = "<label class='field-label inline'>Simulated role</label>";
    var roleSel = el("select", { class: "select" }, ROLES.map(function (r) { return "<option" + (r === role() ? " selected" : "") + ">" + esc(r) + "</option>"; }).join(""));
    roleSel.addEventListener("change", function () { mutate(function () { state.settings.role = roleSel.value; }); });
    roleRow.appendChild(roleSel);
    prefPanel.appendChild(roleRow);
    prefPanel.appendChild(el("div", { class: "hint mt" }, "Financial views (cost, margin, burn) are visible only to: " + FINANCIAL_ROLES.join(", ") + "."));
    grid.appendChild(prefPanel);

    root.appendChild(grid);

    // Financial controls & integration (manager-only)
    if (canFinance()) {
      var finPanel = el("div", { class: "panel panel-pad mt" });
      finPanel.appendChild(el("h2", null, "Financial controls & integration"));
      var cmRow = el("div", { class: "form-row" });
      cmRow.innerHTML = "<label class='field-label inline'>Target contribution margin (%)</label>";
      var cmInput = el("input", { class: "input", type: "number", min: "0", max: "99", step: "0.1", style: "max-width:160px" });
      cmInput.value = cmTarget();
      cmInput.addEventListener("change", function () { var v = clamp(parseFloat(cmInput.value) || 0, 0, 99); mutate(function () { state.settings.targetContributionMarginPct = v; }); });
      cmRow.appendChild(cmInput);
      cmRow.appendChild(el("div", { class: "hint" }, "Default 66.7% ≈ a 3.0× multiplier. Projects color green at/above target, yellow within 10 pts, red beyond."));
      finPanel.appendChild(cmRow);

      var apiRow = el("div", { class: "form-grid mt" });
      apiRow.innerHTML =
        "<div class='form-row'><label class='field-label inline'>API endpoint (scaffold)</label><input class='input' id='setApiEndpoint' value='" + esc(state.settings.apiEndpoint || "") + "' placeholder='https://api.example.com'></div>" +
        "<div class='form-row'><label class='field-label inline'>API key (scaffold — not secure)</label><input class='input' id='setApiKey' type='password' value='" + esc(state.settings.apiKey || "") + "' placeholder='stored only in this browser'></div>";
      finPanel.appendChild(apiRow);
      var saveApi = el("button", { class: "btn sm mt" }, "Save integration scaffold");
      saveApi.addEventListener("click", function () { mutate(function () { state.settings.apiEndpoint = $("#setApiEndpoint").value.trim(); state.settings.apiKey = $("#setApiKey").value; }); toast("Saved (local scaffold)", "ok"); });
      finPanel.appendChild(saveApi);
      finPanel.appendChild(el("div", { class: "warn-banner mt" }, "⚠ The API key field is a local-first scaffold only. Do NOT store a production secret here — browser localStorage is not secure. In production, keep API keys in a server-side secret manager or encrypted backend store."));
      root.appendChild(finPanel);
    }

    // Account & access
    var acctPanel = el("div", { class: "panel panel-pad mt" });
    var cu = currentUser();
    acctPanel.appendChild(el("h2", null, "Account & access"));
    acctPanel.appendChild(el("p", { class: "muted" },
      "Signed in as " + (cu ? cu.displayName + " (" + cu.role + ")" : "guest") + ". Each profile keeps its own boards and workspace data in this browser."));
    var acctRow = el("div", { class: "flex wrap mt" });
    acctRow.appendChild(mkBtn("🔌 Sign out", "btn", function () { logout(); }));
    acctRow.appendChild(mkBtn("👤 Switch / add profile", "btn", function () { renderAuthGate(cu && cu.id); }));
    if (cu) acctRow.appendChild(mkBtn(cu.hasPass ? "🔑 Change passphrase" : "🔑 Set passphrase", "btn", function () { changePassphrase(cu); }));
    acctPanel.appendChild(acctRow);
    // User roster
    if (accounts.users.length > 1) {
      var ut = el("table", { class: "table mt" });
      ut.innerHTML = "<thead><tr><th>Profile</th><th>Role</th><th>Secured</th><th></th></tr></thead>";
      var utb = el("tbody");
      accounts.users.forEach(function (u) {
        var tr = el("tr");
        tr.innerHTML = "<td><strong>" + esc(u.displayName) + "</strong>" + (u.id === accounts.currentUserId ? " <span class='badge ok'>you</span>" : "") + "</td><td class='muted'>" + esc(u.role) + "</td><td>" + (u.hasPass ? "🔒 passphrase" : "—") + "</td><td class='right'></td>";
        if (u.id !== accounts.currentUserId) {
          var del = el("button", { class: "btn sm danger" }, "Delete");
          del.addEventListener("click", function () { deleteUser(u); });
          tr.querySelector("td.right").appendChild(del);
        }
        utb.appendChild(tr);
      });
      ut.appendChild(utb); acctPanel.appendChild(ut);
    }
    acctPanel.appendChild(el("div", { class: "warn-banner mt" },
      "Local profiles are a convenience gate, not enterprise security. Enterprise SSO (OIDC/SAML) requires a backend and is tracked in the improvement backlog."));
    root.appendChild(acctPanel);

    // Import & Plan a Board from a file
    var planPanel = el("div", { class: "panel panel-pad mt" });
    planPanel.appendChild(el("h2", null, "Import & plan a board from a file"));
    planPanel.appendChild(el("p", { class: "muted" },
      "Upload a project file — Techniek extracts the PM fields and builds a ready-to-run board. Supports CSV / TSV (task lists), JSON (task arrays or full workspace exports), and Markdown / text (briefs with headings and bullet/checkbox tasks). Files are parsed entirely in your browser; nothing is uploaded to a server."));
    var planRow = el("div", { class: "flex wrap mt" });
    planRow.appendChild(mkBtn("📄 Upload & plan board", "btn primary", function () { importAndPlanPrompt(); }));
    planRow.appendChild(mkBtn("⬇ Download CSV template", "btn", downloadCsvTemplate));
    planPanel.appendChild(planRow);
    if (!canEdit()) planPanel.appendChild(el("div", { class: "warn-banner mt" }, "Viewer role is read-only — switch role to import."));
    root.appendChild(planPanel);

    // Scale / performance testing for large boards
    var scalePanel = el("div", { class: "panel panel-pad mt" });
    scalePanel.appendChild(el("h2", null, "Scale & performance"));
    scalePanel.appendChild(el("p", { class: "muted" }, "Boards stay responsive at high card counts via windowed column rendering, collapsible columns, and compact density. Generate a synthetic load to see it in action."));
    var scaleRow = el("div", { class: "flex wrap mt" });
    scaleRow.appendChild(mkBtn("➕ Add 200 demo cards", "btn", function () { generateLoadCards(200); }));
    scaleRow.appendChild(mkBtn("🧹 Remove generated cards", "btn", removeLoadCards));
    scalePanel.appendChild(scaleRow);
    root.appendChild(scalePanel);

    var statsPanel = el("div", { class: "panel panel-pad mt" });
    statsPanel.appendChild(el("h2", null, "Workspace summary"));
    statsPanel.innerHTML += "<div class='grid cols-4'>" +
      statCardHTML("Boards", state.boards.length, "") +
      statCardHTML("Projects", state.projects.length, "") +
      statCardHTML("Cards", state.cards.length, "") +
      statCardHTML("Resources", state.resources.length, "") + "</div>";
    root.appendChild(statsPanel);
  };

  /* ---------- Help ---------- */
  VIEWS.help = function (root) {
    root.appendChild(pageHead("Help", "Quick reference for Techniek OpsBoard Pro."));
    var grid = el("div", { class: "grid cols-2" });

    var kb = el("div", { class: "panel panel-pad" });
    kb.innerHTML = "<h2>Keyboard shortcuts</h2>" +
      "<table class='table'><tbody>" +
      row2cell("<span class='kbd'>N</span>", "New card") +
      row2cell("<span class='kbd'>/</span>", "Focus search") +
      row2cell("<span class='kbd'>Esc</span>", "Close dialog / search") +
      row2cell("<span class='kbd'>Ctrl/⌘ + Z</span>", "Undo") +
      row2cell("<span class='kbd'>Ctrl/⌘ + Shift + Z</span>", "Redo") +
      row2cell("<span class='kbd'>?</span>", "Open this help") +
      "</tbody></table>";
    grid.appendChild(kb);

    var feat = el("div", { class: "panel panel-pad" });
    feat.innerHTML = "<h2>What's inside</h2>" +
      "<ul class='muted' style='line-height:1.9;padding-left:18px'>" +
      "<li><strong>Multi-user profiles</strong> with local sign-in/out, isolated workspaces, optional passphrase, and an enterprise-SSO entry point</li>" +
      "<li>Drag-and-drop Kanban with editable, reorderable columns and WIP limits</li>" +
      "<li><strong>Scales to 200+ cards</strong>: windowed columns, collapse, compact density, board filter, and <strong>per-stage filters</strong></li>" +
      "<li>Full card detail: assignee, priority, type, labels, dates, effort, checklist, dependencies, activity</li>" +
      "<li><strong>Gantt &amp; critical path</strong> over dated work and dependencies</li>" +
      "<li><strong>Risk register</strong> (PMBOK): probability × impact matrix, response strategy, ownership</li>" +
      "<li><strong>Project administration & integrated change control</strong>: add/edit/delete projects; raise change orders that adjust budget, schedule, and scope on approval</li>" +
      "<li>Resource utilization with a 4-week forecast</li>" +
      "<li><strong>A/E financials</strong>: earned multiplier and contribution margin % with a configurable target (green/yellow/red)</li>" +
      "<li>Project <strong>and program</strong> rollups + <strong>Earned Value Management</strong> (CPI, SPI, EAC, VAC) in the manager report</li>" +
      "<li><strong>FV / EAC history</strong>: Funded Value &amp; Target Cost Budget step lines vs Bill/Cost EAC datapoints, with a selectable data table</li>" +
      "<li><strong>PMO resource register</strong>: people, subcontractors, tools, equipment — inline edit, add/delete, CSV import/export</li>" +
      "<li><strong>Gantt rescheduling</strong>: drag a bar to move dates (duration preserved); schedule and EVM recalculate</li>" +
      "<li>Card effort sync: estimate/logged/progress stay consistent</li>" +
      "<li><strong>Live report sync</strong> — stage position drives % complete, so moving a card updates EV, rollups, billing, and resources</li>" +
      "<li>Manager report (full financials) and client report (financials hidden)</li>" +
      "<li><strong>Import &amp; plan a board from a file</strong> (CSV / JSON / Markdown)</li>" +
      "<li>Role-based visibility, dark mode, undo/redo, JSON/CSV import &amp; export</li>" +
      "</ul>";
    grid.appendChild(feat);
    root.appendChild(grid);

    root.appendChild(el("div", { class: "flex mt", style: "justify-content:space-between" },
      "<span class='warn-banner' style='flex:1'>Local-first prototype. Sensitive data should not be entered until enterprise authentication and security review are complete.</span>"));
    root.appendChild(el("div", { class: "faint mt", style: "font-size:12px" }, "Techniek OpsBoard Pro · version " + APP_VERSION + " · schema " + SCHEMA_VERSION));
  };

  /* ----------------------------------------------------------------------- *
   * Reusable render helpers
   * ----------------------------------------------------------------------- */
  function pageHead(title, sub) {
    var h = el("div", { class: "page-head" });
    h.innerHTML = "<div><h1>" + esc(title) + "</h1><p>" + esc(sub) + "</p></div><div class='spacer'></div><div class='head-actions'></div>";
    return h;
  }
  function statCard(label, value, sub, cls) {
    return el("div", { class: "stat" },
      "<div class='stat-label'>" + esc(label) + "</div><div class='stat-value " + (cls || "") + "'>" + esc(value) + "</div>" + (sub ? "<div class='stat-sub'>" + esc(sub) + "</div>" : ""));
  }
  function statCardHTML(label, value, sub) {
    return "<div class='stat'><div class='stat-label'>" + esc(label) + "</div><div class='stat-value'>" + esc(value) + "</div>" + (sub ? "<div class='stat-sub'>" + esc(sub) + "</div>" : "") + "</div>";
  }
  function row2cell(a, b) { return "<tr><td style='width:160px'>" + a + "</td><td class='muted'>" + esc(b) + "</td></tr>"; }
  function mkBtn(label, cls, fn) { var b = el("button", { class: cls }, label); b.addEventListener("click", fn); return b; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function columnName(c) {
    var b = state.boards.filter(function (x) { return x.id === c.boardId; })[0];
    if (!b) return "";
    var col = b.columns.filter(function (x) { return x.id === c.columnId; })[0];
    return col ? col.name : "";
  }

  /* ---------- Charts (inline SVG) ---------- */
  function stageBarChart(b) {
    var data = b.columns.map(function (col) {
      return { name: col.name, n: boardCards(b.id).filter(function (c) { return c.columnId === col.id; }).length };
    });
    var max = Math.max(1, Math.max.apply(null, data.map(function (d) { return d.n; })));
    var w = 460, h = 200, pad = 28, bw = (w - pad * 2) / data.length;
    var svg = '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" role="img" aria-label="Cards per stage">';
    data.forEach(function (d, i) {
      var bh = (d.n / max) * (h - pad * 2);
      var x = pad + i * bw + 6;
      var y = h - pad - bh;
      svg += '<rect x="' + x + '" y="' + y + '" width="' + (bw - 12) + '" height="' + bh + '" rx="5" fill="var(--brand)"></rect>';
      svg += '<text x="' + (x + (bw - 12) / 2) + '" y="' + (y - 6) + '" text-anchor="middle" font-size="12" fill="var(--text)">' + d.n + "</text>";
      svg += '<text x="' + (x + (bw - 12) / 2) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10" fill="var(--text-faint)">' + esc(d.name.slice(0, 8)) + "</text>";
    });
    svg += "</svg>";
    var div = el("div"); div.innerHTML = svg; return div;
  }
  function lineChart(history) {
    var data = history.slice(-6);
    var w = 460, h = 200, pad = 30;
    var max = Math.max(1, Math.max.apply(null, data.map(function (d) { return d.total; })));
    var stepX = (w - pad * 2) / Math.max(1, data.length - 1);
    function x(i) { return pad + i * stepX; }
    function y(v) { return h - pad - (v / max) * (h - pad * 2); }
    var pts = data.map(function (d, i) { return x(i) + "," + y(d.completed); }).join(" ");
    var area = "M" + x(0) + "," + (h - pad) + " L" + pts.split(" ").join(" L") + " L" + x(data.length - 1) + "," + (h - pad) + " Z";
    var svg = '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" role="img" aria-label="Completion trend">';
    svg += '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" stroke="var(--border)"></line>';
    svg += '<path d="' + area + '" fill="var(--brand-soft)" opacity="0.7"></path>';
    svg += '<polyline points="' + pts + '" fill="none" stroke="var(--brand)" stroke-width="2.5"></polyline>';
    data.forEach(function (d, i) {
      svg += '<circle cx="' + x(i) + '" cy="' + y(d.completed) + '" r="3.5" fill="var(--brand)"></circle>';
      svg += '<text x="' + x(i) + '" y="' + (h - 10) + '" text-anchor="middle" font-size="10" fill="var(--text-faint)">' + fmtDate(d.week) + "</text>";
    });
    svg += "</svg>";
    var div = el("div"); div.innerHTML = svg;
    div.appendChild(el("div", { class: "chart-legend" }, "<span><span class='tag-dot' style='background:var(--brand)'></span> Cards completed of " + data[data.length - 1].total + "</span>"));
    return div;
  }

  /* ----------------------------------------------------------------------- *
   * Drag & drop
   * ----------------------------------------------------------------------- */
  var dragCardId = null;
  function setupCardDnD(node, cardId) {
    node.addEventListener("dragstart", function (e) {
      dragCardId = cardId;
      node.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", cardId); } catch (x) {}
    });
    node.addEventListener("dragend", function () { node.classList.remove("dragging"); dragCardId = null; });
  }
  function setupColumnDnD(body, colId) {
    var column = body.parentNode;
    body.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      column.classList.add("drop-target");
    });
    body.addEventListener("dragleave", function (e) {
      if (!body.contains(e.relatedTarget)) column.classList.remove("drop-target");
    });
    body.addEventListener("drop", function (e) {
      e.preventDefault();
      column.classList.remove("drop-target");
      var id = dragCardId || e.dataTransfer.getData("text/plain");
      if (!id) return;
      var afterEl = cardAfterPoint(body, e.clientY);
      moveCard(id, colId, afterEl ? afterEl.dataset.card : null);
    });
  }
  function cardAfterPoint(body, y) {
    var cards = [].slice.call(body.querySelectorAll(".card:not(.dragging)"));
    var closest = null, closestOffset = -Infinity;
    cards.forEach(function (c) {
      var box = c.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closestOffset) { closestOffset = offset; closest = c; }
    });
    return closest;
  }
  function moveCard(cardId, colId, beforeCardId) {
    var c = cardById(cardId);
    if (!c) return;
    var b = activeBoard();
    mutate(function () {
      applyStageToCard(c, b, colId);
      // Reorder: assign sequential order among cards in this column.
      var siblings = boardCards(b.id).filter(function (x) { return x.columnId === colId && x.id !== cardId; })
        .sort(function (a, d) { return a.order - d.order; });
      var insertAt = beforeCardId ? siblings.map(function (s) { return s.id; }).indexOf(beforeCardId) : siblings.length;
      if (insertAt < 0) insertAt = siblings.length;
      siblings.splice(insertAt, 0, c);
      siblings.forEach(function (s, i) { s.order = i; });
    });
  }
  // Percent-complete implied by a card's stage position: first column 0%, last 100%.
  function stageProgress(b, colId) {
    var idx = b.columns.map(function (x) { return x.id; }).indexOf(colId);
    var n = b.columns.length;
    if (idx < 0) return 0;
    if (n <= 1) return idx === 0 ? 100 : 0;
    return Math.round((idx / (n - 1)) * 100);
  }
  // Stage drives percent-complete so every stage edit flows into progress, EV,
  // resource allocation, and all reports (PMI: earned value tracks the board).
  function applyStageToCard(c, b, colId) {
    var changedCol = c.columnId !== colId;
    c.columnId = colId;
    if (changedCol) {
      c.progress = stageProgress(b, colId);
      var nm = (b.columns.filter(function (x) { return x.id === colId; })[0] || {}).name;
      var last = b.columns[b.columns.length - 1];
      logActivity(c, "Moved to " + nm + (colId === last.id ? " (completed)" : " (" + c.progress + "%)"));
    }
    return changedCol;
  }
  function logActivity(c, text) {
    c.activity = c.activity || [];
    c.activity.unshift({ text: text, ts: Date.now() });
  }

  /* ----------------------------------------------------------------------- *
   * Column operations
   * ----------------------------------------------------------------------- */
  function addColumn() {
    mutate(function () { activeBoard().columns.push({ id: uid("col"), name: "New Column", wip: 0 }); });
  }
  function columnMenu(b, col) {
    var idx = b.columns.indexOf(col);
    var body = el("div");
    body.innerHTML =
      "<div class='form-row'><label class='field-label inline'>Column name</label><input class='input' id='cmName' value='" + esc(col.name) + "'></div>" +
      "<div class='form-row mt'><label class='field-label inline'>WIP limit (0 = none)</label><input class='input' id='cmWip' type='number' min='0' value='" + (col.wip || 0) + "'></div>";
    var foot = [
      { label: "Move ◀", cls: "btn sm", fn: function () { if (idx > 0) mutate(function () { b.columns.splice(idx - 1, 0, b.columns.splice(idx, 1)[0]); }); closeModal(); } },
      { label: "Move ▶", cls: "btn sm", fn: function () { if (idx < b.columns.length - 1) mutate(function () { b.columns.splice(idx + 1, 0, b.columns.splice(idx, 1)[0]); }); closeModal(); } },
      { label: "Delete", cls: "btn sm danger", fn: function () { deleteColumn(b, col); } },
      { label: "Save", cls: "btn sm primary", fn: function () {
        var name = $("#cmName").value.trim() || "Untitled";
        var wip = parseInt($("#cmWip").value, 10) || 0;
        mutate(function () { col.name = name; col.wip = wip; }); closeModal();
      } },
    ];
    modal("Column settings", body, foot, "sm");
  }
  function deleteColumn(b, col) {
    var cards = boardCards(b.id).filter(function (c) { return c.columnId === col.id; });
    if (b.columns.length <= 1) { toast("A board needs at least one column", "err"); return; }
    closeModal();
    confirmModal("Delete column '" + col.name + "'?", cards.length ? cards.length + " card(s) will move to the previous column." : "This column is empty.", function () {
      mutate(function () {
        var idx = b.columns.indexOf(col);
        var target = b.columns[idx - 1] || b.columns[idx + 1];
        cards.forEach(function (c) { c.columnId = target.id; });
        b.columns.splice(idx, 1);
      });
      toast("Column deleted");
    });
  }

  /* ----------------------------------------------------------------------- *
   * Card create / edit
   * ----------------------------------------------------------------------- */
  function quickAddCard(colId) {
    var b = activeBoard();
    mutate(function () {
      state.cards.push({
        id: uid("c"), boardId: b.id, columnId: colId, projectId: null, title: "New card",
        desc: "", assigneeId: null, priority: "medium", type: "Task", labels: [], due: null, startDate: null,
        estimateHours: 0, loggedHours: 0, progress: stageProgress(b, colId), milestone: false, deps: [], checklist: [], comments: [],
        activity: [{ text: "Card created", ts: Date.now() }], createdAt: Date.now(),
        order: boardCards(b.id).filter(function (c) { return c.columnId === colId; }).length,
      });
    });
  }

  function openCardEditor(cardId) {
    if (!canEdit() && cardId) return openCardReadonly(cardId);
    if (!canEdit()) { toast("Viewer role is read-only", "err"); return; }
    var b = activeBoard();
    var c = cardId ? cardById(cardId) : {
      id: uid("c"), boardId: b.id, columnId: b.columns[0].id, projectId: null, title: "", desc: "",
      assigneeId: null, priority: "medium", type: "Task", labels: [], due: null, startDate: null,
      estimateHours: 0, loggedHours: 0, progress: 0, milestone: false, deps: [], checklist: [], comments: [],
      activity: [], createdAt: Date.now(), order: 999, _new: true,
    };
    var roster = b.rosterIds.map(resourceById).filter(Boolean);
    var projects = state.projects.filter(function (p) { return p.boardId === b.id; });
    var allLabels = Object.keys(LABEL_COLORS);
    var fin = canFinance();

    var body = el("div");
    body.innerHTML =
      "<div class='form-grid'>" +
      "<div class='form-row full'><label class='field-label inline'>Title</label><input class='input' id='fTitle' value='" + esc(c.title) + "' placeholder='Card title'></div>" +
      "<div class='form-row full'><label class='field-label inline'>Description</label><textarea class='textarea' id='fDesc' placeholder='Details, scope, acceptance criteria…'>" + esc(c.desc) + "</textarea></div>" +
      "<div class='form-row'><label class='field-label inline'>Stage</label><select class='select' id='fCol'>" + b.columns.map(function (col) { return "<option value='" + col.id + "'" + (col.id === c.columnId ? " selected" : "") + ">" + esc(col.name) + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Assignee</label><select class='select' id='fAssignee'><option value=''>Unassigned</option>" + roster.map(function (r) { return "<option value='" + r.id + "'" + (r.id === c.assigneeId ? " selected" : "") + ">" + esc(r.name) + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Priority</label><select class='select' id='fPrio'>" + PRIORITIES.map(function (p) { return "<option value='" + p + "'" + (p === c.priority ? " selected" : "") + ">" + cap(p) + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Type</label><select class='select' id='fType'>" + CARD_TYPES.map(function (t) { return "<option" + (t === c.type ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Project</label><select class='select' id='fProject'><option value=''>None</option>" + projects.map(function (p) { return "<option value='" + p.id + "'" + (p.id === c.projectId ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select></div>" +
      "<div class='form-row'><label class='field-label inline'>Due date</label><input class='input' type='date' id='fDue' value='" + (c.due || "") + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Estimate (h)</label><input class='input' type='number' min='0' id='fEst' value='" + (c.estimateHours || 0) + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Logged (h)</label><input class='input' type='number' min='0' id='fLogged' value='" + (c.loggedHours || 0) + "'></div>" +
      "<div class='form-row'><label class='field-label inline'>Progress %</label><input class='input' type='number' min='0' max='100' id='fProgress' value='" + (c.progress || 0) + "'></div>" +
      "<div class='form-row'><label class='field-label inline'><input type='checkbox' id='fMilestone'" + (c.milestone ? " checked" : "") + "> Milestone</label></div>" +
      "<div class='form-row full'><label class='field-label inline'>Labels</label><div id='fLabels' class='flex wrap'>" +
        allLabels.map(function (l) { var on = c.labels.indexOf(l) !== -1; return "<button type='button' class='chip label' data-label='" + l + "' style='cursor:pointer;border:1px solid " + (on ? LABEL_COLORS[l] : "var(--border)") + ";" + (on ? "background:" + LABEL_COLORS[l] + "22" : "") + "'><span class='tag-dot' style='background:" + LABEL_COLORS[l] + "'></span> " + l + "</button>"; }).join("") +
      "</div></div>" +
      "</div>";

    // Checklist
    var ckWrap = el("div", { class: "mt" });
    ckWrap.innerHTML = "<label class='field-label inline'>Checklist</label>";
    var ckList = el("div", { id: "fChecklist" });
    (c.checklist || []).forEach(function (item) { ckList.appendChild(checklistRow(item)); });
    ckWrap.appendChild(ckList);
    var addCk = el("button", { class: "btn sm mt", type: "button" }, "+ Add checklist item");
    addCk.addEventListener("click", function () { ckList.appendChild(checklistRow({ id: uid("ck"), text: "", done: false })); });
    ckWrap.appendChild(addCk);
    body.appendChild(ckWrap);

    // Activity (existing)
    if (c.activity && c.activity.length) {
      var actWrap = el("div", { class: "mt" });
      actWrap.innerHTML = "<label class='field-label inline'>Activity</label>";
      var ul = el("ul", { class: "activity-list" });
      c.activity.slice(0, 8).forEach(function (a) {
        ul.appendChild(el("li", null, esc(a.text) + " <span class='ts'>· " + new Date(a.ts).toLocaleString() + "</span>"));
      });
      actWrap.appendChild(ul);
      body.appendChild(actWrap);
    }

    // label toggle handlers
    body.querySelectorAll("[data-label]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var l = btn.dataset.label;
        var on = btn.getAttribute("data-on") === "1";
        on = !on;
        btn.setAttribute("data-on", on ? "1" : "0");
        btn.style.border = "1px solid " + (on ? LABEL_COLORS[l] : "var(--border)");
        btn.style.background = on ? LABEL_COLORS[l] + "22" : "";
      });
      btn.setAttribute("data-on", c.labels.indexOf(btn.dataset.label) !== -1 ? "1" : "0");
    });

    var foot = [];
    if (!c._new) foot.push({ label: "Delete", cls: "btn danger", side: "left", fn: function () {
      closeModal();
      confirmModal("Delete card?", "'" + c.title + "' will be removed. You can undo this.", function () {
        mutate(function () { state.cards = state.cards.filter(function (x) { return x.id !== c.id; }); });
        toast("Card deleted");
      });
    } });
    foot.push({ label: "Cancel", cls: "btn", fn: closeModal });
    foot.push({ label: c._new ? "Create card" : "Save", cls: "btn primary", fn: function () {
      var title = $("#fTitle").value.trim();
      if (!title) { toast("Title is required", "err"); return; }
      var labels = [].slice.call(body.querySelectorAll("[data-label]")).filter(function (b2) { return b2.getAttribute("data-on") === "1"; }).map(function (b2) { return b2.dataset.label; });
      var checklist = [].slice.call(ckList.querySelectorAll(".checklist-item")).map(function (rowEl) {
        return { id: rowEl.dataset.ck, text: rowEl.querySelector("input[type=text]").value, done: rowEl.querySelector("input[type=checkbox]").checked };
      }).filter(function (x) { return x.text.trim(); });
      var wasNew = !!c._new;
      mutate(function () {
        var nextColId = $("#fCol").value;
        c.title = title;
        c.desc = $("#fDesc").value;
        c.assigneeId = $("#fAssignee").value || null;
        c.priority = $("#fPrio").value;
        c.type = $("#fType").value;
        c.projectId = $("#fProject").value || null;
        c.due = $("#fDue").value || null;
        c.estimateHours = parseFloat($("#fEst").value) || 0;
        c.loggedHours = parseFloat($("#fLogged").value) || 0;
        c.progress = clamp(parseInt($("#fProgress").value, 10) || 0, 0, 100);
        applyStageToCard(c, b, nextColId);
        c.milestone = $("#fMilestone").checked;
        c.labels = labels;
        c.checklist = checklist;
        if (wasNew) { delete c._new; logActivity(c, "Card created"); state.cards.push(c); }
        else logActivity(c, "Card updated");
      });
      closeModal();
      toast(wasNew ? "Card created" : "Card saved", "ok");
    } });

    modal((c._new ? "New card" : "Edit card") + (c.type ? " · " + c.type : ""), body, foot);
    // Effort synchronization: estimate/logged drive progress; progress drives logged.
    (function () {
      var col = $("#fCol"), est = $("#fEst"), logged = $("#fLogged"), prog = $("#fProgress");
      if (!col || !est || !logged || !prog) return;
      function fromStage() {
        prog.value = stageProgress(b, col.value);
      }
      function fromHours() {
        var e = parseFloat(est.value) || 0, l = parseFloat(logged.value) || 0;
        if (e > 0) prog.value = progressFromHours(e, l);
      }
      function fromProgress() {
        var e = parseFloat(est.value) || 0, pv = parseInt(prog.value, 10) || 0;
        if (e > 0) logged.value = loggedFromProgress(e, pv);
      }
      col.addEventListener("change", fromStage);
      est.addEventListener("input", fromHours);
      logged.addEventListener("input", fromHours);
      prog.addEventListener("input", fromProgress);
    })();
    setTimeout(function () { var t = $("#fTitle"); if (t) t.focus(); }, 30);
  }

  function checklistRow(item) {
    var row = el("div", { class: "checklist-item" + (item.done ? " done" : ""), dataset: { ck: item.id } });
    var cb = el("input", { type: "checkbox" }); cb.checked = item.done;
    cb.addEventListener("change", function () { row.classList.toggle("done", cb.checked); });
    var tx = el("input", { type: "text", value: item.text, placeholder: "Checklist item" });
    tx.value = item.text;
    var del = el("button", { class: "btn sm ghost", type: "button" }, "✕");
    del.addEventListener("click", function () { row.remove(); });
    row.appendChild(cb); row.appendChild(tx); row.appendChild(del);
    return row;
  }

  function openCardReadonly(cardId) {
    var c = cardById(cardId);
    if (!c) return;
    var r = resourceById(c.assigneeId);
    var body = el("div");
    body.innerHTML =
      "<p class='muted'>" + esc(c.desc || "No description.") + "</p>" +
      "<div class='grid cols-2 mt'>" +
      statCardHTML("Stage", columnName(c), "") +
      statCardHTML("Assignee", r ? r.name : "Unassigned", "") +
      statCardHTML("Priority", cap(c.priority), c.type) +
      statCardHTML("Due", fmtDate(c.due), c.progress + "% complete") + "</div>";
    modal("Card details", body, [{ label: "Close", cls: "btn primary", fn: closeModal }]);
  }

  /* ----------------------------------------------------------------------- *
   * Modal infrastructure
   * ----------------------------------------------------------------------- */
  function modal(title, bodyNode, footButtons, size) {
    var host = $("#modalHost");
    host.innerHTML = "";
    host.hidden = false;
    host.classList.add("open");
    var m = el("div", { class: "modal" + (size === "sm" ? " sm" : "") });
    var head = el("div", { class: "modal-head" }, "<h3>" + esc(title) + "</h3>");
    var x = el("button", { class: "btn ghost", "aria-label": "Close" }, "✕");
    x.addEventListener("click", closeModal);
    head.appendChild(x);
    var body = el("div", { class: "modal-body" });
    body.appendChild(bodyNode);
    var foot = el("div", { class: "modal-foot" });
    var leftButtons = (footButtons || []).filter(function (b) { return b.side === "left"; });
    var rightButtons = (footButtons || []).filter(function (b) { return b.side !== "left"; });
    leftButtons.forEach(function (b) { foot.appendChild(mkBtn(b.label, b.cls, b.fn)); });
    foot.appendChild(el("div", { class: "spacer" }));
    rightButtons.forEach(function (b) { foot.appendChild(mkBtn(b.label, b.cls, b.fn)); });
    m.appendChild(head); m.appendChild(body); m.appendChild(foot);
    host.appendChild(m);
    host.onclick = function (e) { if (e.target === host) closeModal(); };
  }
  function closeModal() { var h = $("#modalHost"); h.hidden = true; h.classList.remove("open"); h.innerHTML = ""; h.onclick = null; }
  function confirmModal(title, msg, onYes) {
    modal(title, el("p", { class: "muted" }, esc(msg)), [
      { label: "Cancel", cls: "btn", fn: closeModal },
      { label: "Confirm", cls: "btn primary", fn: function () { closeModal(); onYes(); } },
    ], "sm");
  }

  /* ----------------------------------------------------------------------- *
   * Search
   * ----------------------------------------------------------------------- */
  function runSearch(q) {
    var box = $("#searchResults");
    q = (q || "").trim().toLowerCase();
    if (!q) { box.hidden = true; box.innerHTML = ""; return; }
    var groups = [];
    var cards = state.cards.filter(function (c) { return c.title.toLowerCase().indexOf(q) !== -1; }).slice(0, 6);
    var projects = state.projects.filter(function (p) { return p.name.toLowerCase().indexOf(q) !== -1 || p.client.toLowerCase().indexOf(q) !== -1; }).slice(0, 4);
    var people = state.resources.filter(function (r) { return r.name.toLowerCase().indexOf(q) !== -1; }).slice(0, 4);
    if (cards.length) groups.push({ label: "Cards", items: cards.map(function (c) { return { title: c.title, sub: columnName(c), act: function () { switchToCardBoard(c); openCardEditor(c.id); } }; }) });
    if (projects.length) groups.push({ label: "Projects", items: projects.map(function (p) { return { title: p.name, sub: p.client, act: function () { openProject(p.id); } }; }) });
    if (people.length) groups.push({ label: "People", items: people.map(function (r) { return { title: r.name, sub: r.role, act: function () { go("resources"); } }; }) });
    if (!groups.length) { box.hidden = false; box.innerHTML = "<div class='sr-item muted'>No results for “" + esc(q) + "”</div>"; return; }
    box.innerHTML = "";
    groups.forEach(function (g) {
      box.appendChild(el("div", { class: "sr-group" }, esc(g.label)));
      g.items.forEach(function (it) {
        var item = el("div", { class: "sr-item" }, "<div><div>" + esc(it.title) + "</div><div class='sr-sub'>" + esc(it.sub) + "</div></div>");
        item.addEventListener("click", function () { box.hidden = true; $("#search").value = ""; it.act(); });
        box.appendChild(item);
      });
    });
    box.hidden = false;
  }
  function switchToCardBoard(c) { if (state.activeBoardId !== c.boardId) { state.activeBoardId = c.boardId; save(); } ui.view = "board"; render(); }
  function openProject(pid2) {
    var p = projectById(pid2);
    if (!p) return;
    state.activeBoardId = p.boardId;
    save();
    go("board");
    toast("Opened board for " + p.name);
  }

  /* ----------------------------------------------------------------------- *
   * Import / export
   * ----------------------------------------------------------------------- */
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: filename });
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }
  function exportJSON() { download("techniek-opsboard-" + todayISO() + ".json", JSON.stringify(state, null, 2), "application/json"); toast("Workspace exported", "ok"); }
  function importJSONPrompt() {
    var input = el("input", { type: "file", accept: "application/json" });
    input.addEventListener("change", function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          if (!parsed.boards || !parsed.cards) throw new Error("Invalid workspace file");
          confirmModal("Import workspace?", "This replaces your current local workspace. You can undo afterwards.", function () {
            snapshot(); state = migrate(parsed); commit(); toast("Workspace imported", "ok");
          });
        } catch (e) { toast("Import failed: " + e.message, "err"); }
      };
      reader.readAsText(file);
    });
    input.click();
  }
  function csvCell(v) {
    v = String(v == null ? "" : v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function exportReportCSV() {
    var fin = canFinance();
    var rows = [["Project", "Client", "Type", "Cards", "Done", "Overdue", "Progress %"].concat(
      fin ? ["Budget", "Spent", "Multiplier", "CM %", "Margin", "Burn %",
             "BAC", "PV", "EV", "AC", "CV", "SV", "CPI", "SPI", "EAC", "VAC"] : [])];
    state.projects.forEach(function (p) {
      var r = projectRollup(p);
      var base = [p.name, p.client, p.contractType || "T&M", r.cards, r.done, r.overdue, r.progress];
      if (fin) {
        var v = projectEVM(p);
        base = base.concat([
          Math.round(r.budget), Math.round(r.spent),
          p.billable ? num2(projectMultiplier(p)) : "", p.billable && projectEarnedRevenue(p) > 0 ? projectCMPct(p).toFixed(1) : "",
          p.billable ? Math.round(r.margin) : "", Math.round(r.burn * 100),
          Math.round(v.bac), Math.round(v.pv), Math.round(v.ev), Math.round(v.ac),
          Math.round(v.cv), Math.round(v.sv), num2(v.cpi), num2(v.spi), Math.round(v.eac), Math.round(v.vac),
        ]);
      }
      rows.push(base);
    });
    if (fin) {
      var pe = programEVM();
      var pt = portfolioTotals();
      var pm = programMultiplier();
      rows.push(["PROGRAM (all projects)", state.projects.length + " projects", "", pt.projectCards, pt.projectDone, pt.overdue, "",
        Math.round(pt.budget), Math.round(pt.spent), num2(pm.multiplier), pm.revenue > 0 ? pm.cm.toFixed(1) : "",
        Math.round(pt.margin), pt.budget ? Math.round(pt.spent / pt.budget * 100) : 0,
        Math.round(pe.bac), Math.round(pe.pv), Math.round(pe.ev), Math.round(pe.ac),
        Math.round(pe.cv), Math.round(pe.sv), num2(pe.cpi), num2(pe.spi), Math.round(pe.eac), Math.round(pe.bac - pe.eac)]);
    }
    download("opsboard-report-" + todayISO() + ".csv", rows.map(function (r) { return r.map(csvCell).join(","); }).join("\n"), "text/csv");
    toast("Report CSV exported", "ok");
  }
  function exportJiraCSV() {
    var rows = [["Summary", "Issue Type", "Status", "Priority", "Assignee", "Due Date", "Labels", "Original Estimate", "Description"]];
    state.cards.forEach(function (c) {
      var r = resourceById(c.assigneeId);
      rows.push([c.title, c.type, columnName(c), cap(c.priority), r ? r.name : "", c.due || "", (c.labels || []).join(" "), (c.estimateHours || 0) + "h", c.desc || ""]);
    });
    download("opsboard-jira-" + todayISO() + ".csv", rows.map(function (r) { return r.map(csvCell).join(","); }).join("\n"), "text/csv");
    toast("Jira CSV exported", "ok");
  }

  /* ----------------------------------------------------------------------- *
   * File intake → extract PM info → plan a board
   * ----------------------------------------------------------------------- */
  function downloadCsvTemplate() {
    var rows = [
      ["Title", "Stage", "Type", "Priority", "Assignee", "Due", "Estimate", "Labels", "Description"],
      ["Site survey & access plan", "Backlog", "Task", "high", "Jordan Lee", "2026-07-10", "16", "Safety", "Confirm permits and access windows"],
      ["Draft control philosophy", "In Progress", "Feature", "medium", "Sam Carter", "2026-07-18", "24", "Documentation", "Author control narrative"],
      ["Client design review", "Review", "Milestone", "critical", "Jordan Lee", "2026-07-25", "8", "Client", "Gate review with stakeholder sign-off"],
    ];
    download("opsboard-board-template.csv", rows.map(function (r) { return r.map(csvCell).join(","); }).join("\n"), "text/csv");
    toast("Template downloaded", "ok");
  }

  // Minimal RFC-4180-ish CSV/TSV parser (handles quotes, commas, newlines).
  function parseDelimited(text, delim) {
    var rows = [], row = [], field = "", i = 0, inQ = false;
    while (i < text.length) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === delim) { row.push(field); field = ""; }
        else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
        else if (ch === "\r") { /* skip */ }
        else field += ch;
      }
      i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ""; }); });
  }

  var FIELD_ALIASES = {
    title: ["title", "summary", "name", "task", "deliverable", "work item", "subject"],
    stage: ["stage", "status", "column", "state", "phase", "swimlane"],
    type: ["type", "issue type", "category", "kind"],
    priority: ["priority", "severity", "urgency"],
    assignee: ["assignee", "owner", "responsible", "assigned to", "resource"],
    due: ["due", "due date", "end", "end date", "finish", "target", "deadline"],
    start: ["start", "start date", "begin"],
    estimate: ["estimate", "estimate hours", "original estimate", "effort", "hours", "story points"],
    labels: ["labels", "label", "tags", "tag"],
    desc: ["description", "details", "notes", "desc"],
    progress: ["progress", "percent", "% complete", "complete"],
  };
  function matchField(header) {
    var h = String(header || "").trim().toLowerCase();
    for (var key in FIELD_ALIASES) {
      if (FIELD_ALIASES[key].indexOf(h) !== -1) return key;
    }
    return null;
  }
  function normPriority(v) {
    var s = String(v || "").trim().toLowerCase();
    if (/crit|block|p0|urgent|highest/.test(s)) return "critical";
    if (/high|p1|major/.test(s)) return "high";
    if (/low|p3|minor|trivial/.test(s)) return "low";
    return "medium";
  }
  function normEstimate(v) {
    var m = String(v || "").match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 0;
  }
  function normDate(v) {
    var s = String(v || "").trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var d = new Date(s);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return null;
  }

  // Returns { tasks:[{title,stage,type,priority,assignee,due,start,estimate,labels,desc,progress}], stages:[...] }
  function extractTasks(text, filename) {
    var ext = (filename.split(".").pop() || "").toLowerCase();
    var tasks = [];
    if (ext === "json" || (/^\s*[\[{]/.test(text))) {
      var data = JSON.parse(text);
      if (data && data.boards && data.cards) return { workspace: data }; // full export
      var arr = Array.isArray(data) ? data : (data.tasks || data.cards || data.items || []);
      arr.forEach(function (o) {
        tasks.push({
          title: o.title || o.summary || o.name || "Untitled",
          stage: o.stage || o.status || o.column || "",
          type: o.type || "Task", priority: normPriority(o.priority),
          assignee: o.assignee || o.owner || "", due: normDate(o.due || o.dueDate || o.end),
          start: normDate(o.start || o.startDate), estimate: normEstimate(o.estimate || o.estimateHours || o.effort),
          labels: Array.isArray(o.labels) ? o.labels : (o.labels ? String(o.labels).split(/[,;]/) : []),
          desc: o.desc || o.description || "", progress: parseInt(o.progress, 10) || 0,
        });
      });
    } else if (ext === "csv" || ext === "tsv" || /,|\t/.test(text.split("\n")[0] || "")) {
      var delim = ext === "tsv" || (text.split("\n")[0] || "").indexOf("\t") !== -1 ? "\t" : ",";
      var rows = parseDelimited(text, delim);
      if (!rows.length) return { tasks: [] };
      var headers = rows[0].map(matchField);
      rows.slice(1).forEach(function (r) {
        var o = {};
        headers.forEach(function (key, idx) { if (key) o[key] = r[idx]; });
        if (!o.title) return;
        tasks.push({
          title: o.title, stage: o.stage || "", type: o.type || "Task", priority: normPriority(o.priority),
          assignee: o.assignee || "", due: normDate(o.due), start: normDate(o.start),
          estimate: normEstimate(o.estimate), labels: o.labels ? String(o.labels).split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean) : [],
          desc: o.desc || "", progress: parseInt(o.progress, 10) || 0,
        });
      });
    } else {
      // Markdown / plain text: headings (#, ##) become stages; bullets / checkboxes become tasks.
      var lines = text.split("\n");
      var curStage = "Backlog";
      lines.forEach(function (line) {
        var h = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
        if (h) { curStage = h[2].trim().replace(/[:#]+$/, ""); return; }
        var b = line.match(/^\s*[-*+]\s+(?:\[( |x|X)\]\s+)?(.*)$/);
        if (b && b[2].trim()) {
          var done = b[1] && b[1].toLowerCase() === "x";
          tasks.push({ title: b[2].trim().replace(/\s*\(.*\)$/, ""), stage: curStage, type: "Task", priority: "medium",
            assignee: "", due: null, start: null, estimate: 0, labels: [], desc: "", progress: done ? 100 : 0 });
        }
      });
    }
    var stages = [];
    tasks.forEach(function (t) { if (t.stage && stages.indexOf(t.stage) === -1) stages.push(t.stage); });
    return { tasks: tasks, stages: stages };
  }

  function importAndPlanPrompt() {
    if (!canEdit()) { toast("Viewer role is read-only", "err"); return; }
    var input = el("input", { type: "file", accept: ".csv,.tsv,.json,.md,.txt,text/*,application/json" });
    input.addEventListener("change", function () {
      var file = input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var result = extractTasks(String(reader.result), file.name);
          if (result.workspace) {
            confirmModal("Import full workspace?", "This file is a complete OpsBoard export. Importing replaces your current local workspace (undoable).", function () {
              snapshot(); state = migrate(result.workspace); commit(); toast("Workspace imported", "ok");
            });
            return;
          }
          if (!result.tasks.length) { toast("No tasks found in that file", "err"); return; }
          planBoardWizard(result, file.name);
        } catch (e) { toast("Could not parse file: " + e.message, "err"); }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function planBoardWizard(result, filename) {
    var tasks = result.tasks;
    var defaultStages = result.stages.length ? result.stages : ["Backlog", "Ready", "In Progress", "Review", "Done"];
    var suggestedName = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\b\w/g, function (m) { return m.toUpperCase(); }).slice(0, 40);
    var withDates = tasks.filter(function (t) { return t.due; }).length;
    var withAssignee = tasks.filter(function (t) { return t.assignee; }).length;
    var body = el("div");
    body.innerHTML =
      "<p class='muted'>Extracted <strong>" + tasks.length + " tasks</strong> from <strong>" + esc(filename) + "</strong>. " +
      withDates + " have due dates, " + withAssignee + " name an assignee, across " + defaultStages.length + " stage" + (defaultStages.length > 1 ? "s" : "") + ".</p>" +
      "<div class='form-row mt'><label class='field-label inline'>Board name</label><input class='input' id='planName' value='" + esc(suggestedName || "Imported Board") + "'></div>" +
      "<div class='form-row mt'><label class='field-label inline'>Columns (comma-separated)</label><input class='input' id='planStages' value='" + esc(defaultStages.join(", ")) + "'></div>" +
      "<div class='form-row mt'><label class='field-label inline'><input type='checkbox' id='planRoster' checked> Create resources for named assignees</label></div>";
    var preview = el("div", { class: "panel mt", style: "max-height:240px;overflow:auto" });
    var pt = el("table", { class: "table" });
    pt.innerHTML = "<thead><tr><th>Task</th><th>Stage</th><th>Priority</th><th>Assignee</th><th>Due</th></tr></thead>";
    var ptb = el("tbody");
    tasks.slice(0, 30).forEach(function (t) {
      ptb.appendChild(el("tr", null, "<td>" + esc(t.title) + "</td><td class='muted'>" + esc(t.stage || defaultStages[0]) + "</td><td>" + cap(t.priority) + "</td><td class='muted'>" + esc(t.assignee || "—") + "</td><td class='muted'>" + (t.due ? fmtDate(t.due) : "—") + "</td>"));
    });
    if (tasks.length > 30) ptb.appendChild(el("tr", null, "<td colspan='5' class='faint'>…and " + (tasks.length - 30) + " more</td>"));
    pt.appendChild(ptb); preview.appendChild(pt); body.appendChild(preview);

    modal("Plan a board from " + esc(filename), body, [
      { label: "Cancel", cls: "btn", fn: closeModal },
      { label: "Create board", cls: "btn primary", fn: function () {
        var name = $("#planName").value.trim() || "Imported Board";
        var stageNames = $("#planStages").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
        if (!stageNames.length) stageNames = defaultStages;
        var makeRoster = $("#planRoster").checked;
        buildBoardFromTasks(name, stageNames, tasks, makeRoster);
        closeModal();
      } },
    ]);
  }

  function buildBoardFromTasks(name, stageNames, tasks, makeRoster) {
    mutate(function () {
      var columns = stageNames.map(function (s) { return { id: uid("col"), name: s, wip: 0 }; });
      var colByName = {};
      columns.forEach(function (c) { colByName[c.name.toLowerCase()] = c; });
      var board = { id: uid("b"), name: name, type: "imported", columns: columns, rosterIds: [] };

      // Resolve assignees → resources (reuse existing by name, else create).
      var resByName = {};
      state.resources.forEach(function (r) { resByName[r.name.toLowerCase()] = r; });
      function resolveAssignee(nm) {
        if (!nm) return null;
        var key = nm.trim().toLowerCase();
        if (resByName[key]) return resByName[key];
        if (!makeRoster) return null;
        var nr = { id: uid("r"), name: nm.trim(), role: "Contributor", dept: "Imported", capacityHrs: 36, costRate: 70, billRate: 120 };
        state.resources.push(nr); resByName[key] = nr;
        return nr;
      }

      var order = 0;
      tasks.forEach(function (t) {
        var col = (t.stage && colByName[t.stage.toLowerCase()]) || columns[0];
        var r = resolveAssignee(t.assignee);
        if (r && board.rosterIds.indexOf(r.id) === -1) board.rosterIds.push(r.id);
        var isLast = col === columns[columns.length - 1];
        state.cards.push({
          id: uid("c"), boardId: board.id, columnId: col.id, projectId: null,
          title: t.title, desc: t.desc || "", assigneeId: r ? r.id : null,
          priority: t.priority || "medium", type: t.type || "Task", labels: t.labels || [],
          due: t.due || null, startDate: t.start || null, estimateHours: t.estimate || 0, loggedHours: 0,
          progress: t.progress != null ? t.progress : (isLast ? 100 : 0),
          milestone: /milestone/i.test(t.type || ""), deps: [], checklist: [], comments: [],
          activity: [{ text: "Imported from file", ts: Date.now() }], createdAt: Date.now(), order: order++,
        });
      });
      if (!board.rosterIds.length) board.rosterIds = state.resources.slice(0, 5).map(function (r) { return r.id; });
      state.boards.push(board);
      state.activeBoardId = board.id;
    });
    ui.view = "board";
    render();
    toast("Board “" + name + "” created with " + tasks.length + " cards", "ok");
  }

  /* ---------- Scale testing ---------- */
  function generateLoadCards(n) {
    var b = activeBoard();
    var verbs = ["Review", "Draft", "Inspect", "Validate", "Calibrate", "Wire", "Test", "Document", "Procure", "Assemble", "Schedule", "Audit"];
    var nouns = ["actuator", "harness", "controller", "bracket", "sensor", "panel", "gearbox", "manifold", "enclosure", "relay", "fixture", "report"];
    mutate(function () {
      for (var i = 0; i < n; i++) {
        var col = b.columns[i % b.columns.length];
        var r = b.rosterIds[i % Math.max(1, b.rosterIds.length)];
        var due = new Date(); due.setDate(due.getDate() + (i % 40) - 10);
        state.cards.push({
          id: uid("c"), boardId: b.id, columnId: col.id, projectId: null,
          title: verbs[i % verbs.length] + " " + nouns[(i * 7) % nouns.length] + " #" + (i + 1),
          desc: "", assigneeId: r || null, priority: PRIORITIES[i % PRIORITIES.length], type: "Task",
          labels: [], due: due.toISOString().slice(0, 10), startDate: null,
          estimateHours: (i % 8) * 4, loggedHours: 0, progress: (i % 5) * 20, milestone: false,
          deps: [], checklist: [], comments: [], activity: [], createdAt: Date.now(), order: 1000 + i, _gen: true,
        });
      }
    });
    toast(n + " demo cards added to " + b.name, "ok");
  }
  function removeLoadCards() {
    var before = state.cards.length;
    mutate(function () { state.cards = state.cards.filter(function (c) { return !c._gen; }); });
    toast((before - state.cards.length) + " generated cards removed", "ok");
  }

  /* ----------------------------------------------------------------------- *
   * Toasts
   * ----------------------------------------------------------------------- */
  function toast(msg, kind) {
    var t = el("div", { class: "toast " + (kind || "") }, esc(msg));
    $("#toasts").appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .3s"; }, 2200);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }

  /* ----------------------------------------------------------------------- *
   * Global events & init
   * ----------------------------------------------------------------------- */
  function bindGlobal() {
    $("#boardSelect").addEventListener("change", function () { state.activeBoardId = this.value; ui.filterAssignee = ""; save(); render(); });
    $("#roleSelect").addEventListener("change", function () { mutate(function () { state.settings.role = $("#roleSelect").value; }); });
    $("#themeBtn").addEventListener("click", function () { mutate(function () { state.settings.theme = state.settings.theme === "dark" ? "light" : "dark"; }); });
    $("#newCardBtn").addEventListener("click", function () { go("board"); openCardEditor(null); });
    $("#undoBtn").addEventListener("click", undo);
    $("#redoBtn").addEventListener("click", redo);
    $("#menuToggle").addEventListener("click", function () { ui.navOpen = !ui.navOpen; $("#app").classList.toggle("nav-open", ui.navOpen); });

    var search = $("#search");
    search.addEventListener("input", function () { runSearch(this.value); });
    search.addEventListener("blur", function () { setTimeout(function () { $("#searchResults").hidden = true; }, 160); });

    // Delegated link clicks (open card / project) inside views
    $("#view").addEventListener("click", function (e) {
      var oc = e.target.closest("[data-open-card]");
      if (oc) { var c = cardById(oc.dataset.openCard); if (c) { switchToCardBoard(c); openCardEditor(c.id); } return; }
      var op = e.target.closest("[data-open-project]");
      if (op) { openProject(op.dataset.openProject); return; }
    });

    document.addEventListener("keydown", function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      var mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "z" || e.key === "Z")) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && (e.key === "y")) { e.preventDefault(); redo(); return; }
      if (typing) {
        if (e.key === "Escape") { document.activeElement.blur(); $("#searchResults").hidden = true; }
        return;
      }
      if (e.key === "Escape") { if (!$("#modalHost").hidden) closeModal(); $("#searchResults").hidden = true; }
      else if (e.key === "/") { e.preventDefault(); $("#search").focus(); }
      else if (e.key === "n" || e.key === "N") { if (canEdit()) { go("board"); openCardEditor(null); } }
      else if (e.key === "?") { go("help"); }
    });

    window.addEventListener("beforeprint", function () { /* hook for future */ });
  }

  function init() {
    accounts = loadAccounts();
    bindGlobal();
    // First launch: migrate any legacy single-user workspace into a default profile
    // so existing local data is preserved under a signed-in user.
    if (!accounts.users.length) {
      var legacy = localStorage.getItem(STORAGE_KEY);
      var u = { id: uid("u"), displayName: "Local Admin", role: "Admin", hasPass: false, salt: randSalt(), hash: null, createdAt: Date.now() };
      accounts.users.push(u); accounts.currentUserId = u.id; saveAccounts();
      if (legacy) { try { localStorage.setItem(wsKey(u.id), legacy); } catch (e) {} }
      markUnlocked(u.id);
    }
    var cu = currentUser();
    if (!cu || needsUnlock(cu)) { renderAuthGate(cu && cu.id); return; }
    enterApp(cu.id);
  }

  // Small public API for programmatic integration and testing (no DOM side effects).
  window.TechniekOpsBoard = {
    version: APP_VERSION,
    schema: SCHEMA_VERSION,
    // Parse a project file's text into normalized PM tasks. See README "Import & plan".
    parseFile: function (text, filename) { return extractTasks(String(text), filename || "input.csv"); },
    // QA harness surface — drives the REAL calculation/mutation code paths so the
    // test suite exercises production logic, not a reimplementation.
    _qa: {
      resetDemo: function () { state = demoWorkspace(); accounts = accounts || loadAccounts(); return true; },
      state: function () { return state; },
      projectById: projectById, resourceById: resourceById, boardCards: boardCards,
      isDone: isDone, cardCost: cardCost, cardCommitted: cardCommitted,
      projectRollup: function (pid) { return projectRollup(projectById(pid)); },
      projectEVM: function (pid) { return projectEVM(projectById(pid)); },
      programEVM: programEVM,
      resourceUtil: function (rid) { return resourceUtil(resourceById(rid)); },
      portfolioTotals: portfolioTotals,
      criticalPath: function (boardId) { return criticalPath(boardCards(boardId)); },
      lastColumnId: function (boardId) { var b = state.boards.filter(function (x) { return x.id === boardId; })[0]; return b.columns[b.columns.length - 1].id; },
      columnIds: function (boardId) { var b = state.boards.filter(function (x) { return x.id === boardId; })[0]; return b.columns.map(function (c) { return c.id; }); },
      stageProgress: function (boardId, colId) { var b = state.boards.filter(function (x) { return x.id === boardId; })[0]; return stageProgress(b, colId); },
      // Change control + project admin
      changeOrders: function () { return state.changeOrders; },
      coBudgetImpact: coBudgetImpact, coScheduleImpact: coScheduleImpact,
      addProjectRaw: function (o) { o.id = o.id || uid("p"); o.baseline = { budget: o.budget, endDate: o.endDate }; state.projects.push(o); save(); return o.id; },
      deleteProjectRaw: function (id) { state.changeOrders = (state.changeOrders || []).filter(function (co) { return co.projectId !== id; }); state.cards.forEach(function (c) { if (c.projectId === id) c.projectId = null; }); state.projects = state.projects.filter(function (x) { return x.id !== id; }); save(); },
      createCORaw: function (co) { co.id = co.id || uid("co"); co.applied = false; co.createdCardIds = []; if (co.scopeItems == null) co.scopeItems = []; state.changeOrders.push(co); save(); return co.id; },
      setCOStatusRaw: function (coId, status) { var co = state.changeOrders.filter(function (x) { return x.id === coId; })[0]; co.status = status; reconcileChangeOrder(co); save(); return co; },
      coById: function (id) { return state.changeOrders.filter(function (x) { return x.id === id; })[0]; },
      cardsForProject: function (pid) { return state.cards.filter(function (c) { return c.projectId === pid; }); },
      // A/E financials + resources + schedule
      projectLabor: function (pid) { return projectLabor(projectById(pid)); },
      projectEarnedRevenue: function (pid) { return projectEarnedRevenue(projectById(pid)); },
      projectMultiplier: function (pid) { return projectMultiplier(projectById(pid)); },
      projectCMPct: function (pid) { return projectCMPct(projectById(pid)); },
      programMultiplier: programMultiplier,
      cmTarget: cmTarget, setCmTarget: function (v) { state.settings.targetContributionMarginPct = v; },
      cmStatusClass: cmStatusClass,
      fvEacHistory: function (pid) { return fvEacHistory(projectById(pid)); },
      projectBillEAC: function (pid) { return projectBillEAC(projectById(pid)); },
      resources: function () { return state.resources; },
      resourceById: resourceById,
      addResourceRaw: function (o) { o.id = o.id || uid("r"); state.resources.push(o); save(); return o.id; },
      deleteResourceRaw: function (id) { state.cards.forEach(function (c) { if (c.assigneeId === id) c.assigneeId = null; }); state.boards.forEach(function (b) { b.rosterIds = b.rosterIds.filter(function (x) { return x !== id; }); }); state.resources = state.resources.filter(function (x) { return x.id !== id; }); save(); },
      canAdminResourcesFor: function (r) { return RESOURCE_ADMIN_ROLES.indexOf(r) !== -1; },
      rescheduleCardRaw: function (cardId, days) { rescheduleCard(cardById(cardId), days); },
      cardById: cardById,
      progressFromHours: progressFromHours, loggedFromProgress: loggedFromProgress,
      moveCardRaw: function (cardId, colId) { var c = cardById(cardId); var b = state.boards.filter(function (x) { return x.id === c.boardId; })[0]; var prevActive = state.activeBoardId; state.activeBoardId = c.boardId; moveCard(cardId, colId, null); state.activeBoardId = prevActive; },
      editCardStageRaw: function (cardId, colId) { var c = cardById(cardId); var b = c ? state.boards.filter(function (x) { return x.id === c.boardId; })[0] : null; if (c && b) { applyStageToCard(c, b, colId); save(); } return c; },
      addCardRaw: function (card) { state.cards.push(card); save(); },
      setEstimate: function (cardId, est) { var c = cardById(cardId); c.estimateHours = est; save(); },
      historyTail: function () { return state.history[state.history.length - 1]; },
      canFinanceFor: function (r) { return FINANCIAL_ROLES.indexOf(r) !== -1; },
      uid: uid,
    },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
