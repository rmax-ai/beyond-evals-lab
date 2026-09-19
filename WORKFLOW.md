# Agent workflow

Allowed task classes: design, plan, implementation, review, verification, research.
Protected branches: main.
Branch names: spec/issue-N-slug (design/plan/docs-only); agent/issue-N-slug (implementation work from recorded base SHA); claims/issue-N (atomic mutex; never a work branch).
Required checks: pnpm test; pnpm typecheck.
Test-count mode: growth.
Allowed paths: src/**, test/**, datasets/**, docs/**, examples/**, reports/**, package.json, pnpm-lock.yaml, README.md, top-level *.md.
Forbidden paths: .env*, **/secrets/**.
Approval gates: the operator's ready transition is execution approval; merges are operator-only.
Public disclosure: this repository is public; disclose AI assistance in PR evidence.
Proof of work: Objective / Changes / Verification / Evidence / Risks / Human Review Needed / Follow-up Issues.
Network policy: acceptance checks must be keyless and offline unless the issue explicitly declares an operator-approved live check. Never commit credentials.
Rollback: revert PR; never force-push or rewrite accepted history.
