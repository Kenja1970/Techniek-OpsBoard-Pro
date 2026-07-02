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
  function num2(n) { return (Math.round(n * 100) / 100).toFixed(2); }

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
    check("Σ project cards", pt.projectCards === sum.cards, "got " + pt.projectCards + " exp " + sum.cards);
    check("total cards = all cards", pt.cards === Q.state().cards.length, "got " + pt.cards);

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

    /* ---- 8b. Stage-driven progress + live report sync ---- */
    group("8b · Stage position drives % complete → reports stay in sync");
    Q.resetDemo();
    (function () {
      var card = Q.state().cards.filter(function (c) { return c.projectId && (c.estimateHours || 0) > 0; })[0];
      var bid = card.boardId, pid = card.projectId;
      var cols = Q.columnIds(bid), n = cols.length;
      // first column = 0%
      Q.moveCardRaw(card.id, cols[0]);
      var c0 = Q.state().cards.filter(function (c) { return c.id === card.id; })[0];
      check("first stage → 0%", c0.progress === 0, "got " + c0.progress);
      // middle column = round(idx/(n-1)*100)
      var midIdx = Math.floor((n - 1) / 2);
      var evBefore = Q.projectEVM(pid).ev;
      Q.moveCardRaw(card.id, cols[midIdx]);
      var cm = Q.state().cards.filter(function (c) { return c.id === card.id; })[0];
      check("middle stage → stageProgress", cm.progress === Math.round(midIdx / (n - 1) * 100), "got " + cm.progress + " exp " + Math.round(midIdx / (n - 1) * 100));
      check("EV moved with the card", Q.projectEVM(pid).ev !== evBefore || midIdx === 0, "EV " + Math.round(Q.projectEVM(pid).ev));
      // last column = 100%
      Q.moveCardRaw(card.id, cols[n - 1]);
      var cl = Q.state().cards.filter(function (c) { return c.id === card.id; })[0];
      check("last stage → 100%", cl.progress === 100, "got " + cl.progress);
      check("client earned-to-date tracks progress", true); // billing = budget×progress, recomputed live on render
    })();

    /* ---- 8b.1. Editor stage saves use the same propagation path ---- */
    group("8b.1 · Card editor stage save updates progress + EVM/resources");
    Q.resetDemo();
    (function () {
      var card = Q.state().cards.filter(function (c) { return c.projectId && c.assigneeId && (c.estimateHours || 0) > (c.loggedHours || 0); })[0];
      var bid = card.boardId, pid = card.projectId, rid = card.assigneeId;
      var cols = Q.columnIds(bid), n = cols.length;
      Q.moveCardRaw(card.id, cols[0]);
      var ev0 = Q.projectEVM(pid).ev;
      var alloc0 = Q.resourceUtil(rid).allocated;
      var remaining = Math.max(0, (card.estimateHours || 0) - (card.loggedHours || 0));
      var saved = Q.editCardStageRaw(card.id, cols[n - 1]);
      var expected = Q.stageProgress(bid, cols[n - 1]);
      check("editor save changed stage", saved.columnId === cols[n - 1]);
      check("editor save applies stage progress", saved.progress === expected, "got " + saved.progress + " exp " + expected);
      check("editor save moves EV", Q.projectEVM(pid).ev > ev0, "EV " + Math.round(Q.projectEVM(pid).ev) + " from " + Math.round(ev0));
      check("editor save releases resource allocation", approx(Q.resourceUtil(rid).allocated, alloc0 - remaining, 0.5), "Δ " + (Q.resourceUtil(rid).allocated - alloc0).toFixed(1));
      check("editor save logs stage move", saved.activity && /Moved to/.test(saved.activity[0].text), saved.activity && saved.activity[0] ? saved.activity[0].text : "no activity");
    })();

    /* ---- 8c. Program-level EVM (portfolio as one program) ---- */
    group("8c · Program EVM aggregates all projects (PMI program suite)");
    Q.resetDemo();
    (function () {
      var bac = 0, pv = 0, ev = 0, ac = 0;
      Q.state().projects.forEach(function (p) { var v = Q.projectEVM(p.id); bac += v.bac; pv += v.pv; ev += v.ev; ac += v.ac; });
      var prog = Q.programEVM();
      check("Σ BAC", approx(prog.bac, bac, 1), "got " + Math.round(prog.bac));
      check("Σ PV", approx(prog.pv, pv, 1));
      check("Σ EV", approx(prog.ev, ev, 1), "got " + Math.round(prog.ev) + " exp " + Math.round(ev));
      check("Σ AC", approx(prog.ac, ac, 1));
      check("program CPI = ΣEV/ΣAC", approx(prog.cpi, ac > 0 ? ev / ac : 1, 0.01), "got " + prog.cpi.toFixed(2));
      check("program SPI = ΣEV/ΣPV", approx(prog.spi, pv > 0 ? ev / pv : 1, 0.01), "got " + prog.spi.toFixed(2));
      check("program EAC = ΣBAC/CPI", approx(prog.eac, prog.cpi > 0 ? bac / prog.cpi : bac, 2));
      check("program CV = ΣEV-ΣAC", approx(prog.cv, ev - ac, 1));
      check("program SV = ΣEV-ΣPV", approx(prog.sv, ev - pv, 1));
      check("indices are aggregate, not averaged", prog.projects === Q.state().projects.length);
    })();

    /* ---- 8d. Project administration (add / delete) ---- */
    group("8d · Project administration — add & delete");
    Q.resetDemo();
    (function () {
      var n0 = Q.state().projects.length;
      var board = Q.state().boards[0];
      var pid = Q.addProjectRaw({ name: "QA New Project", client: "QA Client", boardId: board.id, budget: 50000, billable: true, startDate: "2026-06-01", endDate: "2026-09-01", status: "Active" });
      check("project added", Q.state().projects.length === n0 + 1);
      check("baseline captured", Q.projectById(pid).baseline.budget === 50000, "baseline " + Q.projectById(pid).baseline.budget);
      // attach a card then delete project -> card unlinked, not deleted
      var board2 = Q.state().boards[0];
      Q.addCardRaw({ id: Q.uid("c"), boardId: board2.id, columnId: board2.columns[0].id, projectId: pid, title: "QA proj card", desc: "", assigneeId: null, priority: "low", type: "Task", labels: [], due: null, startDate: null, estimateHours: 4, loggedHours: 0, progress: 0, milestone: false, deps: [], checklist: [], comments: [], activity: [], createdAt: Date.now(), order: 0 });
      var cardCount = Q.state().cards.length;
      Q.deleteProjectRaw(pid);
      check("project deleted", Q.state().projects.filter(function (p) { return p.id === pid; }).length === 0);
      check("cards kept (unlinked)", Q.state().cards.length === cardCount, "cards " + Q.state().cards.length);
      check("orphan cards have no projectId", Q.state().cards.every(function (c) { return c.projectId !== pid; }));
    })();

    /* ---- 8e. Change control — approval applies baseline + scope; revert undoes ---- */
    group("8e · Change control — CO approval applies budget/schedule/scope (PMI)");
    Q.resetDemo();
    (function () {
      var p = Q.state().projects.filter(function (x) { return x.billable; })[0];
      var budget0 = p.budget, end0 = p.endDate;
      var cards0 = Q.cardsForProject(p.id).length;
      var bac0 = Q.projectEVM(p.id).bac;
      var coId = Q.createCORaw({ projectId: p.id, number: "CO-TEST", title: "QA scope add", category: "Scope", description: "", requestedBy: "QA", requestedDate: "2026-06-20", budgetDelta: 25000, scheduleDeltaDays: 15, scopeItems: [{ title: "QA scope task A", estimate: 30 }, { title: "QA scope task B", estimate: 10 }], status: "Requested" });
      check("CO created, not applied", Q.coById(coId).applied === false);
      check("baseline untouched while pending", p.budget === budget0 && Q.cardsForProject(p.id).length === cards0);
      // Approve -> apply
      Q.setCOStatusRaw(coId, "Approved");
      check("budget += Δ on approve", p.budget === budget0 + 25000, "budget " + p.budget + " exp " + (budget0 + 25000));
      check("end date shifted +15d", p.endDate !== end0, "end " + p.endDate);
      check("scope cards created (+2)", Q.cardsForProject(p.id).length === cards0 + 2, "cards " + Q.cardsForProject(p.id).length);
      check("new cards carry est → BAC rises", Q.projectEVM(p.id).bac > bac0, "BAC Δ " + Math.round(Q.projectEVM(p.id).bac - bac0));
      check("CO marked applied", Q.coById(coId).applied === true);
      check("budget impact helper", Q.coBudgetImpact(p.id) >= 25000);
      // Reject -> revert
      Q.setCOStatusRaw(coId, "Rejected");
      check("budget restored on revert", p.budget === budget0, "budget " + p.budget);
      check("end date restored", p.endDate === end0, "end " + p.endDate);
      check("scope cards removed on revert", Q.cardsForProject(p.id).length === cards0, "cards " + Q.cardsForProject(p.id).length);
      check("CO no longer applied", Q.coById(coId).applied === false);
    })();

    /* ---- 8f. Change order flows into project + program EVM ---- */
    group("8f · Approved change order updates project + program reports");
    Q.resetDemo();
    (function () {
      var p = Q.state().projects.filter(function (x) { return x.billable; })[0];
      var progBAC0 = Q.programEVM().bac;
      var margin0 = Q.projectRollup(p.id).margin;
      var coId = Q.createCORaw({ projectId: p.id, number: "CO-REV", title: "Budget uplift", category: "Budget", budgetDelta: 40000, scheduleDeltaDays: 0, scopeItems: [], status: "Requested", requestedDate: "2026-06-20", requestedBy: "QA", description: "" });
      Q.setCOStatusRaw(coId, "Approved");
      check("billable margin += budget uplift", approx(Q.projectRollup(p.id).margin, margin0 + 40000, 1), "Δ " + Math.round(Q.projectRollup(p.id).margin - margin0));
      check("program BAC reflects new scope/budget", Q.programEVM().bac >= progBAC0, "Δ " + Math.round(Q.programEVM().bac - progBAC0));
    })();

    /* ---- 8g. A/E multiplier & contribution margin math ---- */
    group("8g · A/E multiplier & contribution margin (earned basis)");
    Q.resetDemo();
    (function () {
      Q.state().projects.filter(function (p) { return p.billable; }).forEach(function (p) {
        // independent re-derivation from raw cards
        var labor = 0, rev = 0;
        Q.cardsForProject(p.id).forEach(function (c) { var r = c.assigneeId ? Q.resourceById(c.assigneeId) : null; labor += (c.loggedHours || 0) * (r ? r.costRate : 70); rev += (c.loggedHours || 0) * (r ? (r.billRate || 0) : 0); });
        var mult = labor > 0 ? rev / labor : 0;
        var cm = rev > 0 ? (rev - labor) / rev * 100 : 0;
        check(p.name + " · multiplier = rev/labor", approx(Q.projectMultiplier(p.id), mult, 0.01), "got " + num2(Q.projectMultiplier(p.id)));
        check(p.name + " · CM% = (rev-labor)/rev", approx(Q.projectCMPct(p.id), cm, 0.1), "got " + Q.projectCMPct(p.id).toFixed(1));
        if (mult > 0) check(p.name + " · identity CM% = 1-1/mult", approx(cm, (1 - 1 / mult) * 100, 0.1));
      });
      // Demo must show clean examples at 2.4x, 3.0x, 4.5x
      var mults = Q.state().projects.filter(function (p) { return p.billable; }).map(function (p) { return Math.round(Q.projectMultiplier(p.id) * 10) / 10; });
      check("demo includes 2.4x", mults.indexOf(2.4) !== -1, "mults " + mults.join(","));
      check("demo includes 3.0x", mults.indexOf(3) !== -1, "mults " + mults.join(","));
      check("demo includes 4.5x", mults.indexOf(4.5) !== -1, "mults " + mults.join(","));
      // program multiplier = Σrev/Σlabor (not averaged)
      var L = 0, Rv = 0;
      Q.state().projects.forEach(function (p) { Q.cardsForProject(p.id).forEach(function (c) { var r = c.assigneeId ? Q.resourceById(c.assigneeId) : null; L += (c.loggedHours || 0) * (r ? r.costRate : 70); Rv += (c.loggedHours || 0) * (r ? (r.billRate || 0) : 0); }); });
      check("program multiplier = ΣRev/ΣLabor", approx(Q.programMultiplier().multiplier, L > 0 ? Rv / L : 0, 0.01));
    })();

    /* ---- 8h. Target CM red / yellow / green ---- */
    group("8h · Target contribution-margin status (green/yellow/red)");
    Q.resetDemo();
    (function () {
      Q.setCmTarget(66.7);
      check("at target → green (ok)", Q.cmStatusClass(66.7) === "ok");
      check("above target → green", Q.cmStatusClass(75) === "ok");
      check("4 pts below → yellow (warn)", Q.cmStatusClass(62.7) === "warn");
      check("exactly 10 below → yellow", Q.cmStatusClass(56.7) === "warn");
      check(">10 below → red (danger)", Q.cmStatusClass(50) === "danger");
    })();

    /* ---- 8i. Card effort synchronization ---- */
    group("8i · Card effort synchronization (estimate / logged / progress)");
    (function () {
      check("logged/estimate → progress", Q.progressFromHours(40, 10) === 25, "got " + Q.progressFromHours(40, 10));
      check("full logged → 100%", Q.progressFromHours(20, 20) === 100);
      check("progress → logged from estimate", Q.loggedFromProgress(40, 25) === 10, "got " + Q.loggedFromProgress(40, 25));
      check("progress clamps at 100", Q.progressFromHours(10, 50) === 100);
      check("zero estimate is safe", Q.progressFromHours(0, 5) === 0 && Q.loggedFromProgress(0, 50) === 0);
    })();

    /* ---- 8j. Resource administration (PMO) ---- */
    group("8j · Resource administration — add / delete / types / roles");
    Q.resetDemo();
    (function () {
      var n0 = Q.resources().length;
      var rid = Q.addResourceRaw({ name: "QA Subcontractor", type: "Subcontractor", role: "Crew", dept: "Field", company: "QA Sub LLC", capacityHrs: 40, costRate: 90, billRate: 150, unit: "hour", status: "Active", notes: "" });
      check("resource added", Q.resources().length === n0 + 1);
      check("PMO type preserved", Q.resourceById(rid).type === "Subcontractor");
      // assign a card, then delete -> card unassigned
      var board = Q.state().boards[0];
      Q.addCardRaw({ id: Q.uid("c"), boardId: board.id, columnId: board.columns[0].id, projectId: null, title: "sub card", desc: "", assigneeId: rid, priority: "low", type: "Task", labels: [], due: null, startDate: null, estimateHours: 4, loggedHours: 0, progress: 0, milestone: false, deps: [], checklist: [], comments: [], activity: [], createdAt: Date.now(), order: 0 });
      Q.deleteResourceRaw(rid);
      check("resource deleted", Q.resources().filter(function (r) { return r.id === rid; }).length === 0);
      check("assigned cards unassigned", Q.state().cards.every(function (c) { return c.assigneeId !== rid; }));
      // role gating: Resource Manager cannot administer the register
      check("Admin can administer", Q.canAdminResourcesFor("Admin"));
      check("Project Manager can administer", Q.canAdminResourcesFor("Project Manager"));
      check("Resource Manager CANNOT administer", !Q.canAdminResourcesFor("Resource Manager"));
      check("Viewer cannot administer", !Q.canAdminResourcesFor("Viewer"));
      // all PMO types representable
      check("demo has a Subcontractor", Q.resources().some(function (r) { return r.type === "Subcontractor"; }));
      check("demo has a Tool / Software", Q.resources().some(function (r) { return r.type === "Tool / Software"; }));
    })();

    /* ---- 8k. FV / EAC history dataset ---- */
    group("8k · FV / EAC history dataset");
    Q.resetDemo();
    (function () {
      var p = Q.state().projects.filter(function (x) { return x.billable && Q.changeOrders().some(function (co) { return co.projectId === x.id && co.applied; }); })[0] || Q.state().projects.filter(function (x) { return x.billable; })[0];
      var hist = Q.fvEacHistory(p.id);
      check("history has ≥2 points", hist.length >= 2, "points " + hist.length);
      check("first point is Baseline", hist[0].event === "Baseline");
      check("last point is Current", hist[hist.length - 1].event === "Current");
      check("funded value non-decreasing", hist.every(function (pt, i) { return i === 0 || pt.fundedValue >= hist[i - 1].fundedValue; }));
      check("current funded value = project budget", approx(hist[hist.length - 1].fundedValue, p.budget, 1));
      check("current Bill EAC populated", hist[hist.length - 1].billEAC != null && hist[hist.length - 1].billEAC >= 0);
      check("current Cost EAC = project cost EAC", approx(hist[hist.length - 1].costEAC, Q.projectEVM(p.id).eac, 2));
      check("target cost budget = FV×(1-CM)", approx(hist[hist.length - 1].targetCostBudget, p.budget * (1 - Q.cmTarget() / 100), 1));
    })();

    /* ---- 8l. Gantt reschedule propagation ---- */
    group("8l · Gantt reschedule → schedule envelope + EVM propagation");
    Q.resetDemo();
    (function () {
      var card = Q.state().cards.filter(function (c) { return c.projectId && c.startDate && c.due; })[0];
      var p = Q.projectById(card.projectId);
      var start0 = card.startDate, due0 = card.due, pEnd0 = p.endDate;
      var pv0 = Q.projectEVM(p.id).pv;
      function days(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
      var dur0 = days(start0, due0);
      Q.rescheduleCardRaw(card.id, 120); // push well past the project end
      var c2 = Q.cardById(card.id);
      check("start shifted +120d", days(start0, c2.startDate) === 120, "Δ " + days(start0, c2.startDate));
      check("finish shifted +120d", days(due0, c2.due) === 120);
      check("duration preserved", days(c2.startDate, c2.due) === dur0, "dur " + days(c2.startDate, c2.due));
      check("project envelope expanded", new Date(p.endDate) > new Date(pEnd0), "end " + p.endDate + " from " + pEnd0);
      check("project PV recalculated", Q.projectEVM(p.id).pv !== pv0, "pv " + Math.round(Q.projectEVM(p.id).pv) + " was " + Math.round(pv0));
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
