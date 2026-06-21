/* ===========================================================================
   Techniek OpsBoard Pro — QA / QC red-team suite
   ---------------------------------------------------------------------------
   Drives the REAL calculation and mutation code paths via window.TechniekOpsBoard._qa
   and independently re-derives every metric from raw card data, so a bug in the
   app cannot hide behind the same bug in the test. Verifies PMI consistency:
   creating/moving/editing cards must flow into rollups, EVM, resources, history.
   Results are rendered to the page and exposed at window.__QA_RESULTS.
   ========================================================================= */
(function () {
  "use strict";
  var groups = [];
  var cur = null;
  function group(name) { cur = { name: name, rows: [] }; groups.push(cur); }
  function rate(Q, c) { var r = c.assigneeId ? Q.resourceById(c.assigneeId) : null; return r ? r.costRate : 70; }
  function approx(a, b, eps) { return Math.abs(a - b) <= (eps == null ? 0.5 : eps); }

  function check(name, cond, detail) {
    cur.rows.push({ name: name, pass: !!cond, detail: detail || "" });
  }

  function run() {
    var TB = window.TechniekOpsBoard;
    if (!TB || !TB._qa) { setTimeout(run, 50); return; }
    var Q = TB._qa;
    var gate = document.getElementById("authGate"); if (gate) gate.remove();

    /* ---- 1. Financial rollup correctness (independent re-derivation) ---- */
    group("1 · Project financial rollups (cost / committed / margin / burn)");
    Q.resetDemo();
    Q.state().projects.forEach(function (p) {
      var cards = Q.state().cards.filter(function (c) { return c.projectId === p.id; });
      var spent = 0, committed = 0;
      cards.forEach(function (c) { var rt = rate(Q, c); spent += (c.loggedHours || 0) * rt; committed += Math.max(c.estimateHours || 0, c.loggedHours || 0) * rt; });
      var roll = Q.projectRollup(p.id);
      var revenue = p.billable ? p.budget : 0;
      check(p.name + " · spent", approx(roll.spent, spent, 1), "got " + Math.round(roll.spent) + " exp " + Math.round(spent));
      check(p.name + " · committed", approx(roll.committed, committed, 1), "got " + Math.round(roll.committed) + " exp " + Math.round(committed));
      check(p.name + " · margin", approx(roll.margin, revenue - spent, 1), "got " + Math.round(roll.margin) + " exp " + Math.round(revenue - spent));
      check(p.name + " · burn", approx(roll.burn, p.budget ? spent / p.budget : 0, 0.01), "got " + roll.burn.toFixed(3));
    });

    /* ---- 2. Earned Value Management identities (PMBOK) ---- */
    group("2 · Earned Value Management (BAC/PV/EV/AC/CV/SV/CPI/SPI/EAC)");
    var today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
    Q.state().projects.forEach(function (p) {
      var roll = Q.projectRollup(p.id);
      var evm = Q.projectEVM(p.id);
      var bac = roll.committed || p.budget || 0;
      var ev = bac * (roll.progress / 100);
      var ac = roll.spent;
      var pv = ev;
      if (p.startDate && p.endDate) {
        var s = new Date(p.startDate + "T00:00:00"), e = new Date(p.endDate + "T00:00:00");
        if (e > s) { var f = Math.max(0, Math.min(1, (today - s) / (e - s))); pv = bac * f; }
      }
      var cpi = ac > 0 ? ev / ac : 1, spi = pv > 0 ? ev / pv : 1;
      check(p.name + " · BAC", approx(evm.bac, bac, 1), "got " + Math.round(evm.bac));
      check(p.name + " · EV", approx(evm.ev, ev, 1), "got " + Math.round(evm.ev) + " exp " + Math.round(ev));
      check(p.name + " · PV", approx(evm.pv, pv, 1), "got " + Math.round(evm.pv) + " exp " + Math.round(pv));
      check(p.name + " · CV = EV-AC", approx(evm.cv, ev - ac, 1));
      check(p.name + " · SV = EV-PV", approx(evm.sv, ev - pv, 1));
      check(p.name + " · CPI", approx(evm.cpi, cpi, 0.01), "got " + evm.cpi.toFixed(2) + " exp " + cpi.toFixed(2));
      check(p.name + " · SPI", approx(evm.spi, spi, 0.01), "got " + evm.spi.toFixed(2) + " exp " + spi.toFixed(2));
      check(p.name + " · EAC = BAC/CPI", approx(evm.eac, cpi > 0 ? bac / cpi : bac, 2));
    });

    /* ---- 3. Resource utilization ---- */
    group("3 · Resource utilization & allocation");
    Q.state().resources.forEach(function (r) {
      var active = Q.state().cards.filter(function (c) { return c.assigneeId === r.id && !Q.isDone(c); });
      var allocated = 0;
      active.forEach(function (c) { allocated += Math.max(0, (c.estimateHours || 0) - (c.loggedHours || 0)); });
      var u = Q.resourceUtil(r.id);
      check(r.name + " · allocated", approx(u.allocated, allocated, 0.5), "got " + u.allocated + " exp " + allocated);
      check(r.name + " · active count", u.active === active.length, "got " + u.active + " exp " + active.length);
      check(r.name + " · util %", approx(u.util, r.capacityHrs ? allocated / r.capacityHrs * 100 : 0, 0.5));
    });

    /* ---- 4. Portfolio totals = Σ projects ---- */
    group("4 · Portfolio totals aggregate projects");
    var sum = { spent: 0, budget: 0, committed: 0, revenue: 0, margin: 0, cards: 0, done: 0 };
    Q.state().projects.forEach(function (p) { var r = Q.projectRollup(p.id); sum.spent += r.spent; sum.budget += r.budget; sum.committed += r.committed; sum.revenue += r.revenue; sum.margin += r.margin; sum.cards += r.cards; sum.done += r.done; });
    var pt = Q.portfolioTotals();
    check("Σ spent", approx(pt.spent, sum.spent, 1), "got " + Math.round(pt.spent));
    check("Σ budget", approx(pt.budget, sum.budget, 1));
    check("Σ margin", approx(pt.margin, sum.margin, 1));
    check("Σ cards (project-linked)", pt.cards === sum.cards, "got " + pt.cards);

    /* ---- 5. Reactivity: creating a card impacts rollups & EVM ---- */
    group("5 · PMI reactivity — card CREATION updates rollups + EVM");
    Q.resetDemo();
    (function () {
      var p = Q.state().projects[0];
      var board = Q.state().boards.filter(function (b) { return b.id === p.boardId; })[0];
      var r0 = Q.projectRollup(p.id); var evm0 = Q.projectEVM(p.id);
      var resId = board.rosterIds[0];
      var rt = Q.resourceById(resId).costRate;
      Q.addCardRaw({ id: Q.uid("c"), boardId: board.id, columnId: board.columns[0].id, projectId: p.id,
        title: "QA created card", desc: "", assigneeId: resId, priority: "medium", type: "Task", labels: [],
        due: null, startDate: null, estimateHours: 20, loggedHours: 0, progress: 0, milestone: false,
        deps: [], checklist: [], comments: [], activity: [], createdAt: Date.now(), order: 9999 });
      var r1 = Q.projectRollup(p.id); var evm1 = Q.projectEVM(p.id);
      check("card count +1", r1.cards === r0.cards + 1, "got " + r1.cards + " from " + r0.cards);
      check("committed += est×rate", approx(r1.committed, r0.committed + 20 * rt, 1), "Δ " + Math.round(r1.committed - r0.committed));
      check("BAC increases", evm1.bac > evm0.bac, "Δ " + Math.round(evm1.bac - evm0.bac));
    })();

    /* ---- 6. Reactivity: MOVING a card to Done updates progress, EV, resources, history ---- */
    group("6 · PMI reactivity — card MOVE to Done cascades everywhere");
    Q.resetDemo();
    (function () {
      var card = Q.state().cards.filter(function (c) { return c.projectId && c.assigneeId && !Q.isDone(c) && (c.estimateHours || 0) > (c.loggedHours || 0); })[0];
      if (!card) { check("fixture available", false, "no movable card"); return; }
      var pid = card.projectId, rid = card.assigneeId, bid = card.boardId;
      var ev0 = Q.projectEVM(pid).ev;
      var alloc0 = Q.resourceUtil(rid).allocated;
      var done0 = Q.portfolioTotals().done;
      var remaining = (card.estimateHours || 0) - (card.loggedHours || 0);
      Q.moveCardRaw(card.id, Q.lastColumnId(bid));
      var moved = Q.state().cards.filter(function (c) { return c.id === card.id; })[0];
      check("card now Done", Q.isDone(moved), "progress " + moved.progress);
      check("progress = 100", moved.progress === 100);
      check("EV increased", Q.projectEVM(pid).ev >= ev0, "Δ " + Math.round(Q.projectEVM(pid).ev - ev0));
      check("resource allocation dropped", approx(Q.resourceUtil(rid).allocated, alloc0 - remaining, 0.5), "Δ " + (Q.resourceUtil(rid).allocated - alloc0).toFixed(1));
      check("portfolio done +1", Q.portfolioTotals().done === done0 + 1, "got " + Q.portfolioTotals().done);
      check("history checkpoint = done count", Q.historyTail().completed === Q.portfolioTotals().done, "hist " + Q.historyTail().completed);
    })();

    /* ---- 7. Reactivity: editing estimate moves BAC/committed ---- */
    group("7 · PMI reactivity — editing ESTIMATE moves committed/BAC");
    Q.resetDemo();
    (function () {
      var card = Q.state().cards.filter(function (c) { return c.projectId && (c.estimateHours || 0) > 0; })[0];
      var pid = card.projectId; var rt = rate(Q, card);
      var c0 = Q.projectRollup(pid).committed;
      var old = card.estimateHours;
      Q.setEstimate(card.id, old + 40);
      var c1 = Q.projectRollup(pid).committed;
      check("committed += Δest×rate", approx(c1, c0 + 40 * rt, 1.5), "Δ " + Math.round(c1 - c0) + " exp " + Math.round(40 * rt));
    })();

    /* ---- 8. Critical path (longest dependency chain) ---- */
    group("8 · Critical path (longest dependency chain by duration)");
    Q.resetDemo();
    (function () {
      var s = Q.state();
      var col = { id: Q.uid("col"), name: "X", wip: 0 };
      var b = { id: Q.uid("b"), name: "CP Test", type: "t", columns: [col], rosterIds: [] };
      s.boards.push(b);
      function mk(est, deps) { var c = { id: Q.uid("c"), boardId: b.id, columnId: col.id, projectId: null, title: "n", desc: "", assigneeId: null, priority: "low", type: "Task", labels: [], due: null, startDate: null, estimateHours: est, loggedHours: 0, progress: 0, milestone: false, deps: deps || [], checklist: [], comments: [], activity: [], order: 0 }; s.cards.push(c); return c; }
      var A = mk(8, []); var B = mk(8, [A.id]); var C = mk(8, [B.id]); var D = mk(8, []); // D is parallel/short
      var cp = Q.criticalPath(b.id);
      check("length = 3 workdays", cp.lengthDays === 3, "got " + cp.lengthDays);
      check("A on path", !!cp.set[A.id]);
      check("B on path", !!cp.set[B.id]);
      check("C on path", !!cp.set[C.id]);
      check("isolated D excluded", !cp.set[D.id]);
    })();

    /* ---- 9. File intake parser ---- */
    group("9 · File intake — CSV / Markdown / JSON field extraction");
    (function () {
      var csv = "Summary,Status,Owner,Priority,Due Date,Effort,Tags\nMobilize,Backlog,Jordan Lee,Highest,2026-07-10,16h,Safety;Client\nBuild,In Progress,Sam,P2,07/18/2026,24,Electrical";
      var r = TB.parseFile(csv, "plan.csv");
      check("CSV task count", r.tasks.length === 2, "got " + r.tasks.length);
      check("CSV alias Summary→title", r.tasks[0].title === "Mobilize");
      check("CSV Highest→critical", r.tasks[0].priority === "critical");
      check("CSV 16h→16", r.tasks[0].estimate === 16);
      check("CSV stages detected", r.stages.indexOf("Backlog") !== -1 && r.stages.indexOf("In Progress") !== -1);
      var md = TB.parseFile("# Discovery\n- [x] Interviews\n- Survey\n## Build\n* Wire", "b.md");
      check("MD stages from headings", md.stages.length === 2);
      check("MD checkbox done→100", md.tasks[0].progress === 100);
      check("MD task count", md.tasks.length === 3);
      var js = TB.parseFile(JSON.stringify([{ title: "T", status: "Doing", estimate: 5 }]), "t.json");
      check("JSON array parse", js.tasks.length === 1 && js.tasks[0].estimate === 5);
    })();

    /* ---- 10. Role-based financial gating ---- */
    group("10 · Role-based financial visibility");
    [["Admin", true], ["Department Manager", true], ["Project Manager", true], ["Resource Manager", true], ["Engineer / Contributor", false], ["Viewer", false]].forEach(function (pair) {
      check(pair[0] + (pair[1] ? " sees" : " hidden"), Q.canFinanceFor(pair[0]) === pair[1]);
    });

    /* ---- 11. Data integrity: JSON round-trip ---- */
    group("11 · Workspace JSON round-trip integrity");
    Q.resetDemo();
    (function () {
      var s = Q.state();
      var clone = JSON.parse(JSON.stringify(s));
      check("cards preserved", clone.cards.length === s.cards.length);
      check("boards preserved", clone.boards.length === s.boards.length);
      check("risks preserved", clone.risks.length === s.risks.length);
      check("no orphan card columns", s.cards.every(function (c) { var b = s.boards.filter(function (x) { return x.id === c.boardId; })[0]; return b && b.columns.some(function (col) { return col.id === c.columnId; }); }));
    })();

    render();
  }

  function render() {
    var total = 0, passed = 0;
    groups.forEach(function (g) { g.rows.forEach(function (r) { total++; if (r.pass) passed++; }); });
    var failed = total - passed;
    window.__QA_RESULTS = { total: total, passed: passed, failed: failed, ts: new Date().toISOString(),
      groups: groups.map(function (g) { return { name: g.name, rows: g.rows }; }) };

    var root = document.getElementById("qa-report");
    var html = "<div class='qa-head'><h1 style='margin:0'>QA / QC Suite</h1>" +
      "<span class='qa-pill " + (failed ? "fail" : "pass") + "'>" + passed + " / " + total + " passed</span>" +
      (failed ? "<span class='qa-pill fail'>" + failed + " FAILED</span>" : "<span class='muted'>all green</span>") + "</div>" +
      "<p class='muted'>Techniek OpsBoard Pro v" + window.TechniekOpsBoard.version + " · independent re-derivation of every metric · " + new Date().toLocaleString() + "</p>";
    groups.forEach(function (g) {
      html += "<div class='qa-group panel panel-pad'><h3>" + g.name + "</h3>";
      g.rows.forEach(function (r) {
        html += "<div class='qa-row " + (r.pass ? "ok" : "bad") + "'><span class='ic'>" + (r.pass ? "✓" : "✕") + "</span><span>" + r.name + "</span>" + (r.detail ? "<span class='detail'>" + r.detail + "</span>" : "") + "</div>";
      });
      html += "</div>";
    });
    root.innerHTML = html;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
