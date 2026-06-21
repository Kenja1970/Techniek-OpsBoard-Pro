# Techniek OpsBoard Pro

A professional, **local-first Kanban + portfolio management board** for engineering operations — a faster, manager-aware alternative to Microsoft Planner. Built as a **zero-dependency single-page app**: no build step, no install, no server. Open `index.html` and it runs.

> All seeded content is **fictional Techniek demo data**.

![status](https://img.shields.io/badge/status-prototype-blue) ![stack](https://img.shields.io/badge/stack-vanilla%20JS-yellow) ![build](https://img.shields.io/badge/build-none%20required-success)

---

## Why it's better than MS Planner

| Capability | MS Planner | Techniek OpsBoard Pro |
|---|---|---|
| Editable columns / WIP limits | ❌ fixed buckets | ✅ add, rename, reorder, delete, WIP limits |
| Multiple work boards | ⚠️ separate plans | ✅ board switcher with per-board rosters |
| Resource utilization + forecast | ❌ | ✅ allocation, capacity, 4-week forecast |
| Cost / budget / margin / burn | ❌ | ✅ role-gated financials |
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

- **Kanban** — native drag & drop, editable/reorderable columns, WIP limits, quick-add, filters by assignee/priority.
- **Cards** — title, description, assignee, priority, type, labels, due/start dates, estimate & logged hours, progress, milestone flag, checklist, dependencies, and an activity log.
- **Dashboard** — portfolio KPIs, stage distribution chart, 6-week completion trend, rule-based insights & alerts, upcoming/overdue list.
- **Resources** — utilization vs capacity, allocation, and a 4-week forecast per person (board roster-aware).
- **Projects** — rollups for progress, budget, committed, spent, variance, margin, and burn; click a project to open its board.
- **Manager Report** — full financial briefing, printable to PDF, with CSV and Jira-CSV export.
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
├── app.js         # all logic: state, persistence, views, charts, DnD, reports
├── docs/          # product notes & roadmap
└── README.md
```

## Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md). Highlights: backend persistence & multi-user sync, enterprise auth/audit, integrations (Jira, Planner, GitHub Issues, Azure DevOps, SharePoint, Smartsheet), AI status summaries, and real server-side PDF generation — each pending approval and security review.

## License

MIT — see [`LICENSE`](LICENSE).
