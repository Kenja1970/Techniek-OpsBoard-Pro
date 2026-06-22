# QA / QC Report — Techniek OpsBoard Pro

**Version:** 2.4.0  
**Result:** ✅ **157 / 157 checks passed · 0 failures**  
**Method:** Browser-based red-team suite (`tests/qa.html` + `tests/qa.js`) that drives the **real** production calculation and mutation code paths via the `window.TechniekOpsBoard._qa` API and **independently re-derives every metric from raw card data**, so an implementation bug cannot be masked by an identical bug in the test. Run it any time by opening `tests/qa.html`.

## How to run

```
# from any static server, or open the file directly
tests/qa.html
```
The page renders a pass/fail report and exposes machine-readable results at `window.__QA_RESULTS`.

## Coverage summary

| # | Group | Checks | Result |
|---|-------|:------:|:------:|
| 1 | Project financial rollups (cost / committed / margin / burn) | 20 | ✅ 20/20 |
| 2 | Earned Value Management identities (BAC/PV/EV/AC/CV/SV/CPI/SPI/EAC) | 40 | ✅ 40/40 |
| 3 | Resource utilization & allocation | 24 | ✅ 24/24 |
| 4 | Portfolio totals aggregate projects | 4 | ✅ 4/4 |
| 5 | PMI reactivity — card **creation** updates rollups + EVM | 3 | ✅ 3/3 |
| 6 | PMI reactivity — card **move to Done** cascades everywhere | 6 | ✅ 6/6 |
| 7 | PMI reactivity — editing **estimate** moves committed/BAC | 1 | ✅ 1/1 |
| 4 | Portfolio totals aggregate projects (+ dashboard counts) | 5 | ✅ 5/5 |
| 8 | Critical path (longest dependency chain) | 5 | ✅ 5/5 |
| 8b | Stage drives % complete → reports stay in sync | 5 | ✅ 5/5 |
| 8c | Program EVM aggregates all projects (program suite) | 10 | ✅ 10/10 |
| 8d | Project administration — add & delete | 5 | ✅ 5/5 |
| 8e | Change control — CO approval applies budget/schedule/scope | 12 | ✅ 12/12 |
| 8f | Approved change order updates project + program reports | 2 | ✅ 2/2 |
| 9 | File intake — CSV / Markdown / JSON extraction | 9 | ✅ 9/9 |
| 10 | Role-based financial visibility | 6 | ✅ 6/6 |
| 11 | Workspace JSON round-trip integrity | 4 | ✅ 4/4 |
| | **Total** | **157** | ✅ **157/157** |

> Group 4 above replaces the earlier "Portfolio totals" line (it now also verifies dashboard counts span all cards). Groups 1–3 are unchanged (20 / 40 / 24).

## PMI consistency (the critical requirement)

The suite proves that **moving and creating cards directly impacts every dependent structure**, exactly as a PMI-managed portfolio requires:

- **Create a card** → the owning project's card count increments and its **committed cost / BAC** rises by `estimate × cost rate` (group 5).
- **Move a card to *any* stage** → its percent-complete is set by stage position (first 0% → last 100%), so **Earned Value, the project rollup, the client billing snapshot, resource allocation, and the dashboard trend all move with it** — not only when it reaches Done (groups 6, 8b).
- **Program roll-up** → the whole portfolio is reported as one PMI program: ΣBAC/ΣPV/ΣEV/ΣAC with aggregate CPI = ΣEV/ΣAC and SPI = ΣEV/ΣPV (group 8c).
- **Approve a change order** → the project's budget, schedule, and scope (new cards) update, and that flows into margin, project EVM, and **program** EVM; reversing the approval undoes it all (groups 8e, 8f).
- **Edit an estimate** → **committed cost and BAC** move by `Δestimate × cost rate` (group 7).

Because every view computes from a single source of truth on each render, Dashboard, Resources, Projects, Gantt, Manager Report (incl. EVM), and Client Report always reflect the current board state.

## Correctness method (no self-confirming tests)

For each financial and EVM figure, the test re-computes the expected value from the raw `cards`/`resources` data using the PMBOK formulas — e.g. `AC = Σ(loggedHours × costRate)`, `EV = BAC × percentComplete`, `CPI = EV / AC`, `SPI = EV / PV`, `EAC = BAC / CPI`, with `PV` time-phased straight-line across the schedule baseline — and asserts the app's output matches within tolerance. The critical-path test builds a known `A → B → C` dependency chain (plus an isolated node) and asserts the detected path and its length.

## Result

v2.4.0 passes **157/157** with zero console errors. This round adds project administration and PMI integrated change control: groups 8d–8f prove that creating/deleting projects and approving/reverting change orders correctly adjust the baseline (budget, schedule, scope) and propagate into project and program reporting. The suite is committed so every future change (including the nightly routine) can be re-validated.
