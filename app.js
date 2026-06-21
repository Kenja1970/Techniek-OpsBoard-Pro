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
  var SCHEMA_VERSION = "2.0.0";

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
    return "€" + Math.round(n).toLocaleString("en-US");
  }
  function hours(n) { return (Math.round(n * 10) / 10) + "h"; }
  function pct(n) { return Math.round(n) + "%"; }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function parseDate(s) { return s ? new Date(s + "T00:00:00") : null; }
  function fmtDate(s) {
    var d = parseDate(s);
    if (!d) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }
  function fmtDateLong(s) {
    var d = parseDate(s);
    if (!d) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
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
    var R = function (name, role, dept, cap, cost, bill) {
      return { id: uid("r"), name: name, role: role, dept: dept, capacityHrs: cap, costRate: cost, billRate: bill };
    };
    var resources = [
      R("Maaike de Vries", "Project Manager", "Engineering", 32, 85, 145),
      R("Sven Bakker", "Senior Engineer", "Mechanical", 38, 78, 130),
      R("Imran Haddad", "Engineer", "Electrical", 40, 68, 120),
      R("Lotte Janssen", "Engineer", "Software", 36, 72, 125),
      R("Pieter Vermeer", "Resource Manager", "Operations", 30, 80, 0),
      R("Anja Koster", "Proposal Lead", "Business Dev", 34, 76, 0),
      R("Diego Romero", "Engineer", "Software", 40, 66, 118),
      R("Femke Visser", "Designer", "Digital", 36, 60, 110),
    ];
    var rid = {};
    resources.forEach(function (r) { rid[r.name] = r.id; });

    function col(name, wip) { return { id: uid("col"), name: name, wip: wip || 0 }; }

    var boards = [
      {
        id: uid("b"), name: "Engineering Delivery", type: "engineering",
        columns: [col("Backlog"), col("Ready"), col("In Progress", 4), col("Review"), col("Done")],
        rosterIds: [rid["Maaike de Vries"], rid["Sven Bakker"], rid["Imran Haddad"], rid["Lotte Janssen"], rid["Diego Romero"]],
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
      { id: uid("p"), name: "Harbor Crane Retrofit", client: "Rotterdam Port Authority", boardId: bid["Engineering Delivery"].id, budget: 184000, billable: true, startDate: "2026-04-01", endDate: "2026-08-15", status: "Active" },
      { id: uid("p"), name: "Substation Control Upgrade", client: "Stedin Grid", boardId: bid["Engineering Delivery"].id, budget: 96000, billable: true, startDate: "2026-05-12", endDate: "2026-07-30", status: "Active" },
      { id: uid("p"), name: "Offshore Survey Bid", client: "North Sea Wind", boardId: bid["Proposals & BD"].id, budget: 28000, billable: false, startDate: "2026-06-01", endDate: "2026-07-05", status: "Pursuit" },
      { id: uid("p"), name: "Corporate Site Relaunch", client: "Techniek (internal)", boardId: bid["Website & Digital"].id, budget: 32000, billable: false, startDate: "2026-05-01", endDate: "2026-07-20", status: "Active" },
      { id: uid("p"), name: "Workshop Lean Rollout", client: "Techniek (internal)", boardId: bid["Operations"].id, budget: 15000, billable: false, startDate: "2026-06-01", endDate: "2026-09-01", status: "Active" },
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

    return {
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
      activeBoardId: boards[0].id,
      resources: resources,
      boards: boards,
      projects: projects,
      cards: cards,
      history: buildInitialHistory(boards, cards),
      settings: { role: "Department Manager", theme: "light" },
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
  var ui = { view: "dashboard", filterAssignee: "", filterPriority: "", filterText: "", navOpen: false };

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
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
    if (!ws.history) ws.history = buildInitialHistory(ws.boards, ws.cards);
    return ws;
  }
  function save() {
    state.savedAt = Date.now();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { toast("Could not save to localStorage", "err"); }
    updateSavedStamp();
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
    $("#undoBtn").disabled = !undoStack.length;
    $("#redoBtn").disabled = !redoStack.length;
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
    var t = { budget: 0, spent: 0, committed: 0, revenue: 0, margin: 0, cards: 0, done: 0, overdue: 0 };
    ps.forEach(function (r) {
      t.budget += r.budget; t.spent += r.spent; t.committed += r.committed;
      t.revenue += r.revenue; t.margin += r.margin; t.cards += r.cards; t.done += r.done; t.overdue += r.overdue;
    });
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
    filters.appendChild(assigneeSel);
    filters.appendChild(prioSel);
    if (ui.filterAssignee || ui.filterPriority) {
      var clr = el("button", { class: "btn sm ghost" }, "Clear filters");
      clr.addEventListener("click", function () { ui.filterAssignee = ""; ui.filterPriority = ""; render(); });
      filters.appendChild(clr);
    }
    toolbar.appendChild(filters);
    var spacer = el("div"); spacer.style.flex = "1"; toolbar.appendChild(spacer);
    if (canEdit()) {
      var addCardBtn = el("button", { class: "btn primary sm" }, "+ New card");
      addCardBtn.addEventListener("click", function () { openCardEditor(null); });
      toolbar.appendChild(addCardBtn);
    }
    root.appendChild(toolbar);

    var board = el("div", { class: "board" });
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
    return true;
  }

  function renderColumn(b, col) {
    var cards = boardCards(b.id).filter(function (c) { return c.columnId === col.id; })
      .filter(cardMatchesFilter)
      .sort(function (a, c) { return a.order - c.order; });
    var node = el("div", { class: "column", dataset: { col: col.id } });

    var head = el("div", { class: "column-head" });
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

    var body = el("div", { class: "column-body", dataset: { col: col.id } });
    if (!cards.length) body.appendChild(el("div", { class: "faint", style: "padding:8px;font-size:12px;" }, "No cards"));
    cards.forEach(function (c) { body.appendChild(renderCard(c)); });
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
    root.appendChild(pageHead("Resource Utilization", "Allocation, capacity pressure, and a 4-week forecast. Roster reflects the active board."));
    var b = activeBoard();
    var roster = b.rosterIds.map(resourceById).filter(Boolean);
    var fin = canFinance();

    var panel = el("div", { class: "panel" });
    var tbl = el("table", { class: "table" });
    tbl.innerHTML = "<thead><tr><th>Resource</th><th>Role</th><th class='num'>Active</th><th class='num'>Allocated</th><th>Utilization</th><th>Wk1</th><th>Wk2</th><th>Wk3</th><th>Wk4</th>" + (fin ? "<th class='num'>Cost rate</th>" : "") + "</tr></thead>";
    var tb = el("tbody");
    roster.forEach(function (r) {
      var u = resourceUtil(r);
      var cls = u.util > 110 ? "danger" : u.util > 90 ? "warn" : "ok";
      var tr = el("tr");
      tr.innerHTML =
        "<td><div class='flex'><span class='avatar' style='background:" + avatarColor(r.name) + "'>" + esc(initials(r.name)) + "</span> <strong>" + esc(r.name) + "</strong></div></td>" +
        "<td class='muted'>" + esc(r.role) + "</td>" +
        "<td class='num'>" + u.active + "</td>" +
        "<td class='num'>" + hours(u.allocated) + " / " + hours(u.capacity) + "</td>" +
        "<td><div class='flex'><div class='bar'><span class='" + cls + "' style='width:" + clamp(u.util, 0, 100) + "%'></span></div> <span class='muted'>" + pct(u.util) + "</span></div></td>" +
        u.weeks.map(function (w) { return "<td class='muted'>" + (w ? hours(w) : "—") + "</td>"; }).join("") +
        (fin ? "<td class='num'>" + money(r.costRate) + "/h</td>" : "");
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    panel.appendChild(tbl);
    root.appendChild(panel);

    if (!fin) root.appendChild(el("div", { class: "warn-banner mt" }, "Cost rates are hidden for your role. Financial visibility is limited to manager roles."));
  };

  /* ---------- Projects ---------- */
  VIEWS.projects = function (root) {
    root.appendChild(pageHead("Projects", "Rollups across all boards. Select a project to open its board filtered."));
    var fin = canFinance();
    var panel = el("div", { class: "panel" });
    var tbl = el("table", { class: "table" });
    tbl.innerHTML = "<thead><tr><th>Project</th><th>Client</th><th>Progress</th><th class='num'>Cards</th><th class='num'>Overdue</th>" +
      (fin ? "<th class='num'>Budget</th><th class='num'>Spent</th><th class='num'>Margin</th><th>Burn</th>" : "<th>Status</th>") + "</tr></thead>";
    var tb = el("tbody");
    state.projects.forEach(function (p) {
      var r = projectRollup(p);
      var tr = el("tr");
      var burnCls = r.burn > 0.9 ? "danger" : r.burn > 0.7 ? "warn" : "ok";
      var html =
        "<td><button class='linklike' data-open-project='" + p.id + "'>" + esc(p.name) + "</button></td>" +
        "<td class='muted'>" + esc(p.client) + "</td>" +
        "<td><div class='flex'><div class='bar'><span class='ok' style='width:" + r.progress + "%'></span></div> <span class='muted'>" + r.progress + "%</span></div></td>" +
        "<td class='num'>" + r.done + "/" + r.cards + "</td>" +
        "<td class='num'>" + (r.overdue ? "<span class='badge danger'>" + r.overdue + "</span>" : "0") + "</td>";
      if (fin) {
        html += "<td class='num'>" + money(r.budget) + "</td>" +
          "<td class='num'>" + money(r.spent) + "</td>" +
          "<td class='num " + (r.margin < 0 ? "" : "") + "'>" + (p.billable ? "<span class='badge " + (r.margin < 0 ? "danger" : "ok") + "'>" + money(r.margin) + "</span>" : "<span class='muted'>internal</span>") + "</td>" +
          "<td><div class='flex'><div class='bar'><span class='" + burnCls + "' style='width:" + clamp(r.burn * 100, 0, 100) + "%'></span></div> <span class='muted'>" + pct(r.burn * 100) + "</span></div></td>";
      } else {
        html += "<td><span class='badge neutral'>" + esc(p.status) + "</span></td>";
      }
      tr.innerHTML = html;
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    panel.appendChild(tbl);
    root.appendChild(panel);
  };

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
    tbl.innerHTML = "<thead><tr><th>Project</th><th>Client</th><th class='num'>Budget</th><th class='num'>Committed</th><th class='num'>Spent</th><th class='num'>Variance</th><th class='num'>Margin</th><th class='num'>Progress</th></tr></thead>";
    var tb = el("tbody");
    state.projects.forEach(function (p) {
      var r = projectRollup(p);
      tb.appendChild(el("tr", null,
        "<td><strong>" + esc(p.name) + "</strong></td>" +
        "<td class='muted'>" + esc(p.client) + "</td>" +
        "<td class='num'>" + money(r.budget) + "</td>" +
        "<td class='num'>" + money(r.committed) + "</td>" +
        "<td class='num'>" + money(r.spent) + "</td>" +
        "<td class='num'>" + (r.variance < 0 ? "<span class='badge danger'>" + money(r.variance) + "</span>" : money(r.variance)) + "</td>" +
        "<td class='num'>" + (p.billable ? money(r.margin) : "<span class='muted'>—</span>") + "</td>" +
        "<td class='num'>" + r.progress + "%</td>"));
    });
    var tot = portfolioTotals();
    var totCommitted = state.projects.map(projectRollup).reduce(function (a, r) { return a + r.committed; }, 0);
    tb.appendChild(el("tr", { style: "font-weight:700;border-top:2px solid var(--border-strong)" },
      "<td>Total</td><td></td><td class='num'>" + money(tot.budget) + "</td><td class='num'>" + money(totCommitted) + "</td><td class='num'>" + money(tot.spent) + "</td><td class='num'>" + money(tot.budget - totCommitted) + "</td><td class='num'>" + money(tot.margin) + "</td><td></td>"));
    tbl.appendChild(tb);
    panel.appendChild(tbl);
    root.appendChild(panel);

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
      "<li>Drag-and-drop Kanban with editable, reorderable columns and WIP limits</li>" +
      "<li>Full card detail: assignee, priority, type, labels, dates, effort, checklist, dependencies, comments &amp; activity</li>" +
      "<li>Dashboard with stage, trend, capacity, and alert insights</li>" +
      "<li>Resource utilization with a 4-week forecast</li>" +
      "<li>Project rollups: budget, committed, spent, variance, margin, burn</li>" +
      "<li>Manager report (full financials) and client report (financials hidden)</li>" +
      "<li>Role-based visibility, dark mode, undo/redo, JSON/CSV import &amp; export</li>" +
      "</ul>";
    grid.appendChild(feat);
    root.appendChild(grid);

    root.appendChild(el("div", { class: "warn-banner mt" },
      "Local-first prototype. Sensitive data should not be entered until enterprise authentication and security review are complete."));
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
    var changedCol = c.columnId !== colId;
    mutate(function () {
      c.columnId = colId;
      // Reorder: assign sequential order among cards in this column.
      var siblings = boardCards(b.id).filter(function (x) { return x.columnId === colId && x.id !== cardId; })
        .sort(function (a, d) { return a.order - d.order; });
      var insertAt = beforeCardId ? siblings.map(function (s) { return s.id; }).indexOf(beforeCardId) : siblings.length;
      if (insertAt < 0) insertAt = siblings.length;
      siblings.splice(insertAt, 0, c);
      siblings.forEach(function (s, i) { s.order = i; });
      // If moved to last column, mark complete.
      var last = b.columns[b.columns.length - 1];
      if (changedCol && colId === last.id) { c.progress = 100; logActivity(c, "Moved to " + last.name + " (completed)"); }
      else if (changedCol) { logActivity(c, "Moved to " + (b.columns.filter(function (x) { return x.id === colId; })[0] || {}).name); if (c.progress === 100) c.progress = 80; }
    });
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
        estimateHours: 0, loggedHours: 0, progress: 0, milestone: false, deps: [], checklist: [], comments: [],
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
        c.title = title;
        c.desc = $("#fDesc").value;
        c.columnId = $("#fCol").value;
        c.assigneeId = $("#fAssignee").value || null;
        c.priority = $("#fPrio").value;
        c.type = $("#fType").value;
        c.projectId = $("#fProject").value || null;
        c.due = $("#fDue").value || null;
        c.estimateHours = parseFloat($("#fEst").value) || 0;
        c.loggedHours = parseFloat($("#fLogged").value) || 0;
        c.progress = clamp(parseInt($("#fProgress").value, 10) || 0, 0, 100);
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
  function closeModal() { var h = $("#modalHost"); h.hidden = true; h.innerHTML = ""; h.onclick = null; }
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
    var rows = [["Project", "Client", "Cards", "Done", "Overdue", "Progress %"].concat(fin ? ["Budget", "Committed", "Spent", "Variance", "Margin", "Burn %"] : [])];
    state.projects.forEach(function (p) {
      var r = projectRollup(p);
      var base = [p.name, p.client, r.cards, r.done, r.overdue, r.progress];
      if (fin) base = base.concat([r.budget, Math.round(r.committed), Math.round(r.spent), Math.round(r.variance), p.billable ? Math.round(r.margin) : "", Math.round(r.burn * 100)]);
      rows.push(base);
    });
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
    state = load();
    bindGlobal();
    render();
    updateSavedStamp();
    if (!localStorage.getItem(STORAGE_KEY)) save();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
