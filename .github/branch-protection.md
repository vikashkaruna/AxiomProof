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

The repository intentionally uses one approving review for every path. There
is no path-specific requirement for two different reviewers.

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

## Security-sensitive paths

The paths above remain security-sensitive and are covered by the normal
CODEOWNERS review routing. They do not require two different approving users.
