# Techniek OpsBoard Pro

A professional, **local-first Kanban + portfolio management board** for engineering operations — a faster, manager-aware alternative to Microsoft Planner. Built as a **zero-dependency single-page app**: no build step, no install, no server. Open `index.html` and it runs.

> All seeded content is **fictional Techniek demo data**. Currency is **USD ($)**, dates are US-formatted, and reporting follows **PMI / PMBOK** practices (Earned Value Management).

![version](https://img.shields.io/badge/version-2.1.0-blue) ![stack](https://img.shields.io/badge/stack-vanilla%20JS-yellow) ![build](https://img.shields.io/badge/build-none%20required-success) ![pm](https://img.shields.io/badge/PMI%2FPMBOK-EVM%20%C2%B7%20Risk%20%C2%B7%20Critical%20Path-0f766e)

**Live:** https://kenja1970.github.io/Techniek-OpsBoard-Pro/

---

## Why it's better than MS Planner

| Capability | MS Planner | Techniek OpsBoard Pro |
|---|---|---|
| Editable columns / WIP limits | ❌ fixed buckets | ✅ add, rename, reorder, delete, WIP limits |
| Multiple work boards | ⚠️ separate plans | ✅ board switcher with per-board rosters |
| Resource utilization + forecast | ❌ | ✅ allocation, capacity, 4-week forecast |
| Cost / budget / margin / burn | ❌ | ✅ role-gated financials |
| Earned Value Management (CPI/SPI/EAC) | ❌ | ✅ PMI/PMBOK |
| Gantt + critical path | ❌ | ✅ |
| Risk register | ❌ | ✅ probability × impact matrix |
| Scales to 200+ cards | ⚠️ sluggish | ✅ windowed + collapsible columns |
| Plan a board from an uploaded file | ❌ | ✅ CSV / JSON / Markdown |
| Manager **and** client reports | ❌ | ✅ print/PDF, financials hidden from clients |
| Role-based visibility | ⚠️ limited | ✅ 6 simulated roles |
| Works offline / no account | ❌ | ✅ 100% local, no sign-in |
| Undo / redo, keyboard shortcuts | ⚠️ | ✅ |

---

## Run it

**Option A — just open it.** Double-click `index.html` (or drag it into your browser). Works from `file://`, fully offline.

**Option B — serve it (any static server).** If you later add Node:

```bash
npx serve .
# or
python -m http.server 8080
```

There is **no build pipeline** — `index.html`, `styles.css`, and `app.js` are the whole app.

---

## Features

- **Kanban** — native drag & drop, editable/reorderable columns, WIP limits, quick-add, filters by assignee/priority/text.
- **Scales to 200+ cards** — windowed column rendering ("Show more"), collapsible columns, compact density mode, and a per-board card filter keep large boards fast and navigable. A synthetic-load generator (Settings) lets you stress-test it.
- **Cards** — title, description, assignee, priority, type, labels, due/start dates, estimate & logged hours, progress, milestone flag, checklist, dependencies, and an activity log.
- **Gantt & Critical Path** — date-positioned bars with weekly gridlines, progress fill, and automatic highlighting of the longest dependency chain (critical path).
- **Risk Register (PMBOK)** — probability × impact heat matrix, response strategy (Avoid/Mitigate/Transfer/Accept), owner, status, and triggers.
- **Import & plan a board from a file** — upload CSV/TSV, JSON, or Markdown; the app extracts PM fields, previews, and generates a board (see below).
- **Dashboard** — portfolio KPIs, stage distribution chart, 6-week completion trend, rule-based insights & alerts, upcoming/overdue list.
- **Resources** — utilization vs capacity, allocation, and a 4-week forecast per person (board roster-aware).
- **Projects** — rollups for progress, budget, committed, spent, variance, margin, and burn; click a project to open its board.
- **Manager Report** — full financial briefing with **PMI/PMBOK Earned Value Management** (BAC, PV, EV, AC, CV, SV, CPI, SPI, EAC), printable to PDF, with CSV (incl. EVM columns) and Jira-CSV export.
- **Client Report** — printable status & billing snapshot that **excludes internal cost and margin**.
- **Roles** — Admin, Department Manager, Project Manager, Resource Manager, Engineer/Contributor, Viewer. Financials are limited to manager roles; Viewer is read-only.
- **Data** — JSON export/import (schema-validated), CSV exports, demo reset, clear local data.
- **UX** — light/dark theme, undo/redo, global search, keyboard shortcuts, responsive layout, print styles.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `N` | New card |
| `/` | Focus search |
| `Esc` | Close dialog / search |
| `Ctrl`/`⌘` + `Z` | Undo |
| `Ctrl`/`⌘` + `Shift` + `Z` | Redo |
| `?` | Help |

---

## Import & plan a board from a file

Go to **Settings / Data → Import & plan a board from a file** and upload one of:

- **CSV / TSV** — a task list. Headers are matched by alias, so `Summary`/`Task`/`Name` → title, `Status`/`Stage` → column, `Owner`/`Assignee` → assignee, plus priority, due/start, estimate, labels, description. Distinct stage values become the board's columns.
- **JSON** — either an array of task objects, or a full OpsBoard export (which is imported as a complete workspace).
- **Markdown / text** — headings (`#`, `##`) become stages and bullets/checkboxes (`- [ ]`, `- [x]`) become tasks; checked items start at 100%.

The app previews the extracted tasks, lets you name the board and adjust columns, optionally creates resources for named assignees, then builds the board. A starter template is available via **Download CSV template**.

Programmatic use: `window.TechniekOpsBoard.parseFile(text, filename)` returns the normalized `{ tasks, stages }`.

## Roles & financial visibility

Financial views (cost, spent, margin, burn, rates) are visible only to:
**Admin · Department Manager · Project Manager · Resource Manager.**
Engineer/Contributor sees work without money; **Viewer** is read-only.
Switch roles from the top bar or **Settings / Data**.

---

## Data & persistence

Data is stored in the current browser via `localStorage` (schema version `2.0.0`). Use **Settings / Data** to export a JSON backup before clearing browser data or switching machines. Import replaces the current workspace (undoable).

## Sensitive data warning

Prototype / local-first app. **Do not use for CUI, export-controlled, classified, proprietary client, or sensitive employee data** until enterprise authentication, access control, encryption, and security review are implemented.

---

## File layout

```
.
├── index.html     # app shell
├── styles.css     # design system (light/dark + print)
├── app.js         # all logic: state, persistence, views, charts, DnD, reports, intake
├── docs/          # product notes & roadmap
├── .github/       # nightly research-refresh automation
├── CHANGELOG.md
└── README.md
```

## Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md). Highlights: backend persistence & multi-user sync, enterprise auth/audit, integrations (Jira, Planner, GitHub Issues, Azure DevOps, SharePoint, Smartsheet), AI status summaries, and real server-side PDF generation — each pending approval and security review.

## License

MIT — see [`LICENSE`](LICENSE).
