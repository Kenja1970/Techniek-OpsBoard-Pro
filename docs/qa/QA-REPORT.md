# QA / QC Report — Techniek OpsBoard Pro

**Version:** 2.2.0  
**Result:** ✅ **122 / 122 checks passed · 0 failures**  
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
| 8 | Critical path (longest dependency chain) | 5 | ✅ 5/5 |
| 9 | File intake — CSV / Markdown / JSON extraction | 9 | ✅ 9/9 |
| 10 | Role-based financial visibility | 6 | ✅ 6/6 |
| 11 | Workspace JSON round-trip integrity | 4 | ✅ 4/4 |
| | **Total** | **122** | ✅ **122/122** |

## PMI consistency (the critical requirement)

The suite proves that **moving and creating cards directly impacts every dependent structure**, exactly as a PMI-managed portfolio requires:

- **Create a card** → the owning project's card count increments and its **committed cost / BAC** rises by `estimate × cost rate` (group 5).
- **Move a card to the Done stage** → its progress is forced to 100%, the project's **Earned Value (EV) rises**, the assignee's **resource allocation drops** by the card's remaining hours, the **portfolio "done" count** increments, and the **weekly completion checkpoint** (dashboard trend / reports) updates to match — all in one action (group 6).
- **Edit an estimate** → **committed cost and BAC** move by `Δestimate × cost rate` (group 7).

Because every view computes from a single source of truth on each render, Dashboard, Resources, Projects, Gantt, Manager Report (incl. EVM), and Client Report always reflect the current board state.

## Correctness method (no self-confirming tests)

For each financial and EVM figure, the test re-computes the expected value from the raw `cards`/`resources` data using the PMBOK formulas — e.g. `AC = Σ(loggedHours × costRate)`, `EV = BAC × percentComplete`, `CPI = EV / AC`, `SPI = EV / PV`, `EAC = BAC / CPI`, with `PV` time-phased straight-line across the schedule baseline — and asserts the app's output matches within tolerance. The critical-path test builds a known `A → B → C` dependency chain (plus an isolated node) and asserts the detected path and its length.

## Result

No patches were required: the build passed all checks on the first full run at v2.2.0. The suite is committed so every future change (including the nightly routine) can be re-validated.
