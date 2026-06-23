# Revision Control

This project is version-controlled with Git and synced to GitHub (Pages auto-deploys `main`). Revision evidence does not depend on a chat session.

## Per-release checklist

1. Update `APP_VERSION` in `app.js` for behavior changes.
2. Bump the `?v=` markers in `index.html` (both `styles.css` and `app.js`, incremented together) to defeat browser caching.
3. Update `CHANGELOG.md`.
4. Run the QA suite (`tests/qa.html`) and update `docs/qa/QA-REPORT.md` with the result.
5. Commit, then tag the approved baseline:

```powershell
git tag v2.5.0
git push origin v2.5.0
```

6. Cut a GitHub Release from the tag (or, offline, archive a dated zip of the implementation files).

## If Git is unavailable

Maintain revision evidence through version markers, changelog entries, QA reports, dated zip archives, and signed-off review notes.

## Implementation files

```
index.html  styles.css  app.js
tests/qa.html  tests/qa.js
README.md  CHANGELOG.md
docs/qa/QA-REPORT.md
docs/AEC-FINANCIAL-METRICS.md
docs/PMI-SCHEDULE-METRICS.md
docs/PMO-RESOURCE-MANAGEMENT.md
docs/FV-EAC-HISTORY.md
docs/REVISION-CONTROL.md
docs/LATEST-VERSION-IMPLEMENTATION.md
docs/automation/  (nightly routine + guardrails)
```
