# Roadmap

The current app is a polished local-first prototype. The following require approval and, where noted, security review before implementation.

## Near term (no new infrastructure)
- Card comments UI (data model already supports `comments[]`).
- Saved board filters and per-user view presets.
- Bulk card actions (multi-select move / assign).
- Gantt and calendar views over existing dated cards & milestones.
- Configurable label palette per board.

## Platform (needs approval)
- Backend persistence and multi-user real-time sync.
- Enterprise authentication, RBAC, audit history, encryption at rest.
- Integration import/export adapters: Jira, GitHub Issues, Microsoft Planner, Azure DevOps, SharePoint, Smartsheet.
- Server-side PDF generation if browser print output becomes insufficient.

## AI (needs data-handling + key governance approval)
- Draft manager status summaries and lessons-learned from activity logs.
- Trend and risk narration on the dashboard.

## Quality
- Visual regression tests once UI patterns stabilize.
- Automated accessibility (axe) and end-to-end smoke checks.

## Compliance
- CUI / export-controlled data handling only after approval and security review.
