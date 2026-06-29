# Nightly Changelog

The nightly research routine appends a dated note here on nights when it ships a change (summarizing the research that informed it) or when it finds nothing worth changing.

## 2026-06-29 — Card editor stage propagation

- Fixed card editor stage saves so they share the drag/drop stage-progress propagation path.
- Added focused QA coverage for editor-stage saves updating progress, EVM, and activity.
- Added the zero-dependency `pnpm run release` helper to validate guardrails and refresh the root `opsboard/` public build.

## 2026-06-21 — Routine established

- Nightly research-refresh routine scheduled (~03:00 local) and `Guardrails` GitHub Actions workflow added.
- Baseline at v2.1.0: Gantt/critical path, risk register, Earned Value Management, file intake, and 200+ card scaling.
