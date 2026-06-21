# Changelog

All notable changes to Techniek OpsBoard Pro are documented here.
This project follows [Semantic Versioning](https://semver.org/).

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
