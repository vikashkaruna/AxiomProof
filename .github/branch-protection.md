# Branch protection policy

This document specifies the branch protection rules for the
`main` branch. The settings are configured in the GitHub
repository's Settings → Branches → Branch protection rules.

## `main` branch

- **Require a pull request before merging** — ON
- **Require approvals:** 1 (minimum)
- **Dismiss stale pull request approvals when new commits are pushed** — ON
- **Require review from Code Owners** — ON (see `CODEOWNERS`)
- **Restrict who can dismiss pull request reviews** — Repository admins
- **Require status checks to pass before merging** — ON
  - Required checks:
    - `Lint + typecheck`
    - `TS unit tests`
    - `Python (agent runtime) tests`
    - `Python (model gateway) tests`
    - `Security scan`
- **Require branches to be up to date before merging** — ON
- **Require linear history** — ON (squash or rebase only)
- **Include administrators** — ON
- **Allow force pushes** — OFF
- **Allow deletions** — OFF

## Special: security-sensitive paths

PRs that touch any of these paths require **TWO** approvals, one of
which must be the founder (`@vikashkaruna`):

- `packages/approval-engine/**`
- `services/bff/src/routes/v1.ts` (the approval / execution gate)
- `infra/supabase/migrations/0005_approvals_ledger.sql` (the ledger)
- `infra/terraform/envs/prod/s3.tf` (the evidence vault)
- `services/model-gateway/src/model_gateway/redaction.py` (PII redaction)
- `services/agent-runtime/src/axiom/approval_engine.py` (Python mirror)
- `services/agent-runtime/src/axiom/agents/sudhaar.py` (planning agent)
- `services/agent-runtime/src/axiom/agents/karya.py` (execution agent)
- `docs/07_SECURITY_REVIEW.md`
