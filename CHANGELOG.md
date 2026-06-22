# Changelog

All notable changes to Techniek OpsBoard Pro are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [2.4.0] — 2026-06-22

### Added — project administration & PMI integrated change control
- **Project CRUD** — add, edit, and delete projects from the Projects view. Each project's admin panel manages name, client, primary board, status, contract value/budget, billable flag, and schedule, and shows its **baseline vs. current** budget and the net approved change-order impact. Deleting a project unlinks its cards (keeps them) and removes its change orders; the original baseline is captured at creation.
- **Change orders (integrated change control)** — a new **Change Control** register lists all change requests across projects with category, budget/schedule deltas, additional scope, status, and CCB decisions. Raise/edit a change order from the register or a project's admin panel.
- **Baseline impact on approval** — approving (or implementing) a change order automatically adjusts the project baseline: **budget += Δ**, **schedule shifts by Δ days**, and **additional-scope items become cards** on the project's board. Reversing the approval cleanly **undoes** all three. Because budget, schedule, and cards feed the calculations, approved change orders flow straight into rollups, margin, EVM (project and program), the client billing snapshot, and the dashboard — no manual re-entry.
- **CCB gating** — any editor can raise/review a request; only manager (financial) roles can move it to Approved/Implemented or edit the budget delta.
- Change-order columns added to the Manager Report CSV context via the program roll-up.

### QA / QC
- Suite expanded to **157 checks (157/157 passing)**: project add/delete (cards unlinked not deleted), change-order approval applying budget+schedule+scope, revert undoing them, and approved COs propagating into project and program EVM/margin. Verified end-to-end in a browser preview (real approval through the UI) with zero console errors.

## [2.3.0] — 2026-06-22

### Fixed (consistency / red-team)
- **Reports now track the board in real time.** Card **stage position drives percent-complete** (first column 0% → last 100%), so moving a card between stages immediately changes its progress and therefore Earned Value, the project rollup, the client billing snapshot, resource pictures, and the dashboard trend. Previously progress only changed when a card reached the Done column, so mid-board moves left reports looking static. This applies to **every project in the signed-in user's workspace**.
- **Dashboard counts no longer disagree with the boards.** Portfolio card/done/overdue totals now span every card on every board (financial figures still aggregate the projects); project-linked counts are reported separately.
- New cards (quick-add and import) inherit the stage's implied percent-complete.

### Added
- **Per-stage filters at the top of every stage.** Each non-empty column has its own filter box pinned above its cards, so any stage can be viewed by filter — essential once a stage overflows its render window.
- **Program-level EVM.** The Manager Report now reports EVM for the **entire set of projects as one program** (PMI program management): a Program performance panel (EV/BAC, AC, CV, CPI, SPI, SV, EAC, VAC) plus a "Program (all projects)" roll-up row in the EVM table and the CSV export. Program indices use aggregate values (ΣEV/ΣAC, ΣEV/ΣPV) — the correct PMI roll-up, not an average of per-project indices.

### QA / QC
- Suite expanded to **138 checks (138/138 passing)**, adding stage-driven-progress / live-report-sync verification and program-EVM aggregation identities. Zero console errors.

## [2.2.0] — 2026-06-21

### Added
- **Multi-user profiles & authentication** — local sign-in/sign-out with per-profile isolated workspaces (each user's boards and data are kept separately and persist). Optional passphrase per profile, stored only as a salted SHA-256 hash (SubtleCrypto in secure contexts). Profile management in Settings (create, switch, delete, change passphrase). Legacy single-user data is migrated into a default "Local Admin" profile on first launch.
- **Enterprise SSO entry point** — an OIDC/SAML sign-in action with an honest stub explaining it requires a backend identity provider; the integration is tracked in the improvement backlog (no false security claims).
- **Per-stage (in-column) filters** — any column that overflows its render window gets its own search box to find cards within that stage, with a "matches of total" indicator and preserved focus.
- **QA / QC red-team suite** (`tests/qa.html` + `tests/qa.js`) — 122 checks that independently re-derive every metric from raw data and verify PMI reactivity. Results documented in `docs/qa/QA-REPORT.md`. **122/122 pass.**
- Live weekly **completion checkpoint** so creating/moving/editing cards immediately updates the dashboard trend and reports.

### Verified (red team)
- Financial rollups, full EVM identities, resource utilization, and portfolio aggregation match independent PMBOK re-derivations.
- Card **creation**, **move-to-Done**, and **estimate edits** cascade correctly into rollups, EVM (EV/BAC), resource allocation, portfolio done-count, and the weekly checkpoint.
- Critical-path detection, file-intake parsing, role-based financial gating, and JSON round-trip integrity all pass. Zero console errors.

## [2.1.0] — 2026-06-21

### Added
- **Gantt & Critical Path** view — date-positioned bars across the schedule span, weekly gridlines, progress fill, and automatic highlighting of the longest dependency chain (critical path) with its length in workdays.
- **Risk Register** (PMBOK) — qualitative probability × impact analysis, a 5×5 risk heat matrix, response-strategy mix (Avoid / Mitigate / Transfer / Accept), ownership, status, triggers, and a full add/edit/delete editor.
- **Earned Value Management** in the Manager Report — BAC, PV, EV, AC, CV, SV, CPI, SPI, EAC on a consistent cost basis, with time-phased planned value across the schedule baseline; EVM columns also added to the report CSV export, and EVM-driven cost/schedule alerts in insights.
- **Import & plan a board from a file** — upload CSV/TSV, JSON (task arrays or full exports), or Markdown/text; the app auto-detects PM fields (title, stage, type, priority, assignee, dates, estimate, labels), previews the result, and generates a ready-to-run board, creating resources for named assignees. Includes a downloadable CSV template.
- **Scale handling for 200+ cards** — windowed column rendering ("Show more"), collapsible columns, a compact density mode, a per-board card filter, and a synthetic-load generator for stress testing.
- Public integration API at `window.TechniekOpsBoard` (`version`, `schema`, `parseFile`).

### Changed
- Currency is **USD ($)** and dates are **US-formatted** throughout.
- Demo clients are US-based organizations.

### Fixed
- Modal overlay no longer blocks the page when no dialog is open (now defaults to `display:none` and is shown via an `.open` class). Asset URLs are versioned to defeat browser caching.

## [2.0.0] — 2026-06-21

### Added
- Initial release: zero-dependency local-first Kanban + portfolio board — drag/drop board with editable columns, full card detail, dashboard with charts and insights, resource utilization with a 4-week forecast, project rollups, manager and client reports, role-based visibility, dark mode, undo/redo, JSON/CSV import-export, and keyboard shortcuts.
