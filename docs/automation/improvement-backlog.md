# Improvement Backlog

Larger ideas surfaced by the nightly research routine that require human approval before implementation (they fall outside the zero-dependency, no-build, local-first constraints).

- Backend persistence and multi-user real-time sync (the v2.2.0 profiles are local-only; a server is needed to share boards across devices/users and to keep data off the browser).
- **Enterprise SSO (OIDC/SAML — Entra ID, Okta, Google Workspace).** The v2.2.0 sign-in screen exposes the entry point, but completing the OAuth/token-validation flow securely requires a backend identity broker. Implement after backend + security review.
- Enterprise authentication hardening, role-based access control on the server, audit history, and encryption at rest.
- Integration import/export adapters: Jira, GitHub Issues, Microsoft Planner, Azure DevOps, SharePoint, Smartsheet.
- AI-assisted status summaries and risk narration (needs data-handling, privacy, and API-key governance).
- Real server-side PDF generation if browser print output becomes insufficient.
- Visual regression and automated end-to-end test suites once a toolchain is introduced.

> The nightly routine appends new major recommendations here rather than implementing them.
