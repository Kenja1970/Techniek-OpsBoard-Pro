# Techniek OpsBoard Pro — Latest Version Implementation

**Application version:** 2.5.1 · **Schema version:** 2.2.0 · **QA:** 227/227 passing
**Primary files:** `index.html`, `styles.css`, `app.js`, `tests/qa.html`, `tests/qa.js`

Techniek OpsBoard Pro is a zero-dependency, local-first Kanban, project-controls, and portfolio-reporting application for engineering project delivery. Data is stored in browser `localStorage`; production use should move persistence, authentication, API keys, audit trail, and secrets to a server-side backend.

> **Branding:** the application is **Techniek OpsBoard Pro**. (A handoff document proposed an alternate brand; that rebrand was intentionally **not** applied per the project owner.)

## Feature set

- **Kanban** execution with editable columns, WIP limits, per-stage filters, 200+ card scaling.
- **A/E financials** — earned multiplier, contribution margin % with target status. See [AEC-FINANCIAL-METRICS](AEC-FINANCIAL-METRICS.md).
- **PMI/PMBOK EVM** — BAC, PV, EV, AC, CV, SV ($), CPI, SPI, EAC, VAC at project and program level. See [PMI-SCHEDULE-METRICS](PMI-SCHEDULE-METRICS.md).
- **Project administration & integrated change control** — project CRUD; change orders that adjust budget/schedule/scope on approval.
- **PMO resource register** — types, CRUD, CSV import/export, role-gated. See [PMO-RESOURCE-MANAGEMENT](PMO-RESOURCE-MANAGEMENT.md).
- **FV/EAC history** — funded value vs forecast. See [FV-EAC-HISTORY](FV-EAC-HISTORY.md).
- **Gantt** with critical path and **drag-to-reschedule**.
- **Card effort synchronization** — estimate / logged / progress stay consistent; stage drives percent complete.
- **Reports** — Dashboard, Projects, Manager (with multiplier, CM%, EVM, program EVM, CSV parity), Client (excludes internal cost/margin/rates/multiplier), Resources, FV/EAC table.
- **Multi-user local profiles**, dark mode, undo/redo, JSON/CSV import-export, deterministic insights/alerts.

## Roles

Roles: Admin, Department Manager, Project Manager, Resource Manager, Engineer/Contributor, Viewer.
Financial visibility: Admin, Department Manager, Project Manager, Resource Manager.
Resource register administration: Admin, Department Manager, Project Manager.

## Settings of note

`targetContributionMarginPct` (default 66.7), `apiEndpoint`, `apiKey` (local scaffold — **not secure**; move to a backend secret store for production), role, theme, compact display.

## Local checks

```powershell
node --check app.js
node --check tests\qa.js
# then open tests/qa.html and confirm window.__QA_RESULTS.failed === 0
```

## Production hardening backlog

Server-side persistence, enterprise auth/authorization, server-side secret storage, immutable audit trail, database-backed budget history, backend role enforcement, encryption in transit/at rest, integration logging, and a security review before CUI / export-controlled / client-proprietary / sensitive employee data is entered. Tracked in [`automation/improvement-backlog.md`](automation/improvement-backlog.md).
