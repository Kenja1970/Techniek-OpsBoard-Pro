# Nightly research refresh

Techniek OpsBoard Pro keeps current through a two-part nightly automation.

## 1. Scheduled Claude Code routine (the "research" half)

A scheduled cloud agent runs every night and:

1. **Pulls the latest research** — searches for current developments in project-management tooling, Kanban/portfolio UX, PMI/PMBOK practice, and relevant front-end web technology.
2. **Selects one small, safe improvement** that fits the existing **zero-dependency, no-build** architecture (no new packages, no backend, no external AI calls baked into the app, no core data-model break).
3. **Implements and self-verifies** the change (loads the app in a local preview, checks for console errors, exercises the affected view).
4. **Annotates the revision** — bumps the patch version (`APP_VERSION` in `app.js`), bumps the `?v=` asset markers in `index.html`, and adds a dated entry to `CHANGELOG.md`.
5. **Opens a pull request** for the change so the guardrail workflow validates it; on green checks it may merge to `main`, which auto-deploys to GitHub Pages.

Larger ideas (backend, auth, integrations, real AI features, new dependencies) are **recommended, not applied** — they are appended to [`improvement-backlog.md`](./improvement-backlog.md) for human approval.

## 2. Guardrails workflow (the "safety net" half)

[`.github/workflows/guardrails.yml`](../../.github/workflows/guardrails.yml) runs on every push/PR and nightly at 03:00 UTC:

- `node --check app.js` (syntax)
- required files present (`index.html`, `styles.css`, `app.js`, docs, `.nojekyll`)
- `index.html` uses **relative, versioned** asset URLs (no build-only paths)
- version marker in `app.js` has a matching `CHANGELOG.md` entry
- no leftover debug markers (`console.log`, `debugger`, `FIXME`)

## Guarantees

- The app stays a static, install-free site that runs from `file://` or any static host.
- Every nightly change carries a version bump and changelog line, so the revision history in GitHub is always meaningful.
