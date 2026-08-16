# Branch protection policy

This document specifies the branch protection rules for the
`main` branch. The settings are configured in the GitHub
repository's Settings → Branches → Branch protection rules.

## Current enforcement status — verified 2026-08-16

The authenticated repository settings currently enforce the baseline rules
below on `main`: one approving review, CODEOWNERS review, all five required CI
checks, strict/up-to-date branches, linear history, conversation resolution,
and no force-pushes or branch deletions. PR #9 demonstrated this state: all
five checks passed, but GitHub kept the PR in `REVIEW_REQUIRED`.

Classic branch protection does not support path-specific approval counts. The
two-approval rule below is therefore a policy target, not fully automated
enforcement. To enforce it, configure GitHub rulesets or an external review
workflow that evaluates changed paths.

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

## Special: security-sensitive paths (policy target)

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
