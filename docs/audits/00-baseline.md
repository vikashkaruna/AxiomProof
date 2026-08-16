# Phase 0 Baseline — 2026-08-16

## Scope

This baseline was run against the current local worktree on `main`, at the
same commit as `origin/main` (`9e89ee5`). The worktree already contained a
large set of local implementation changes; no files were reset or discarded.

## Results

| Check                            | Result                 | Evidence                                                                                                                                                                                       |
| -------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | PASS                   | Dependencies installed; local lockfile was available.                                                                                                                                          |
| `pnpm format:check`              | FAIL                   | `packages/ui/src/primitives/Button.tsx` is not Prettier-formatted.                                                                                                                             |
| `pnpm lint`                      | PASS                   | Marketing and web ESLint completed with no warnings or errors; package lint scripts mostly report no config.                                                                                   |
| `pnpm typecheck`                 | FAIL                   | `packages/types/src/_test.ts:7` omits required property `b`; this file is untracked.                                                                                                           |
| `pnpm test`                      | FAIL                   | 1 approval-engine test failed; the other four discovered TS test files passed.                                                                                                                 |
| Agent-runtime pytest             | FAIL                   | 24 collected; 18 passed and 6 failed because required Supabase settings were absent. Standard `uv sync` is also blocked by an invalid lockfile and the `httpx-mock` Python-version constraint. |
| Model-gateway pytest             | PASS with workaround   | 13 tests passed in an isolated Python 3.11 environment with `PYTHONPATH=src`; the local Python 3.14 environment cannot install the pinned spaCy wheel.                                         |
| `pnpm build`                     | FAIL                   | Both Next.js builds fail on unresolved `.js` imports from workspace TypeScript packages.                                                                                                       |
| Playwright E2E                   | FAIL before collection | `playwright.config.ts` starts `pnpm dev`, but `tests/e2e/package.json` has no `dev` script.                                                                                                    |
| CI / branch protection           | FAIL                   | GitHub CI runs, but the latest `main` run failed and GitHub reports `main` is not branch-protected.                                                                                            |

## Remediation rerun — 2026-08-16

The initial failures above were remediated in the local worktree. The commands
below were rerun successfully against `a38782f` plus the current remediation
changes:

| Check                | Result | Evidence                                                                                                                                                          |
| -------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`  | PASS   | Prettier reported that all checked files use the required style.                                                                                                  |
| `pnpm lint`          | PASS   | Web and marketing ESLint completed with no warnings or errors.                                                                                                    |
| `pnpm typecheck`     | PASS   | All 11 TypeScript packages passed.                                                                                                                                |
| `pnpm test`          | PASS   | 9 Turbo test tasks completed; approval-engine 8/8, evidence 3/3, ledger 8/8, config 5/5. Packages without test files exited successfully via `--passWithNoTests`. |
| Agent-runtime pytest | PASS   | 24/24 passed under Python 3.11 with local test Supabase settings.                                                                                                 |
| Model-gateway pytest | PASS   | 13/13 passed under Python 3.11. Python 3.14 remains unsuitable for the pinned spaCy/Presidio dependency set.                                                      |
| `pnpm build`         | PASS   | Web and marketing Next.js production builds completed successfully.                                                                                               |
| Playwright E2E       | PASS   | 10/10 Chromium tests passed; local web and marketing servers were started by the Playwright config.                                                               |

### Remediation notes

- Workspace-relative TypeScript imports were made extensionless so Next.js and
  webpack resolve the source packages correctly.
- Approval-token canonicalisation now sorts `actionIds` in both the TypeScript
  and Python implementations, making verification order-independent.
- Agent-runtime now has valid `uv` metadata, a project README required by the
  build backend, test-only Supabase settings, and `pythonpath = ["src"]` so its
  documented `uv run pytest` command works directly.
- Playwright now starts both apps from the repository root with safe local
  Supabase values and a development-only E2E data/auth facade. The bypass is
  explicitly disabled when `NODE_ENV=production`.
- The current control-library source contains 46 controls. Product copy,
  seed metadata, and Python agent references now use the exported count or the
  corrected 46-control value. The generated prototype folders still contain
  historical 43-control copy and remain reference-only by scope.

Phase 0 code/build/test acceptance is now green. The source control library is
46 controls; the 43-control strings that remain in the four generated
prototype bundles are intentionally outside the production audit scope.

### GitHub verification — 2026-08-16

The repository settings were checked through the authenticated GitHub session.
`main` now has branch protection enabled with pull requests required, zero
required approvals, strict/up-to-date required checks, linear history,
conversation resolution, and force-push/deletion disabled. The required checks
are:

- `Lint + typecheck`
- `TS unit tests`
- `Python (agent runtime) tests`
- `Python (model gateway) tests`
- `Security scan`

PR #9 (`fix(ci): run Phase 0 checks in GitHub Actions`) completed all five
required checks successfully and merged into `main` without requiring an
approval. The documented path-specific two-approval rule remains a policy
limitation and is not enforced by the current settings.

## Failed test details

### TypeScript

`packages/approval-engine/src/index.test.ts` has one failure:

> `sorts actionIds canonically so verifier order does not matter`

The test expects verification to remain valid after reordering `actionIds`, but
the current token verification returns `valid: false`.

### Python agent runtime

The six failures are in `test_karya.py`, `test_parikshan.py`, and
`test_sudhaar.py`. They fail during agent construction because
`SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are required settings and are not
provided by the test environment. The approval-engine, canonicalisation, and
PII-redaction tests pass.

## Test inventory and coverage map

### TypeScript unit tests

| Test file                                    | Tests | Result             | Primary area                            |
| -------------------------------------------- | ----: | ------------------ | --------------------------------------- |
| `packages/approval-engine/src/index.test.ts` |     8 | 7 passed, 1 failed | approval-token signing and verification |
| `packages/config/src/index.test.ts`          |     5 | passed             | runtime configuration                   |
| `packages/evidence/src/index.test.ts`        |     3 | passed             | evidence sealing/presigning             |
| `packages/ledger/src/canonicalise.test.ts`   |     8 | passed             | ledger canonicalisation and hashing     |

### Python unit tests

| Test file                                              | Tests | Result          | Primary area                    |
| ------------------------------------------------------ | ----: | --------------- | ------------------------------- |
| `services/agent-runtime/tests/test_approval_engine.py` |     5 | passed          | approval-token mirror           |
| `services/agent-runtime/tests/test_canonicalise.py`    |     7 | passed          | canonical JSON and hashing      |
| `services/agent-runtime/tests/test_karya.py`           |     1 | failed at setup | execution gate / approval token |
| `services/agent-runtime/tests/test_parikshan.py`       |     2 | failed at setup | assessment agent                |
| `services/agent-runtime/tests/test_pii_redactor.py`    |     6 | passed          | PII redaction                   |
| `services/agent-runtime/tests/test_sudhaar.py`         |     3 | failed at setup | planning agent safety           |
| `services/model-gateway/tests/test_redaction.py`       |     9 | passed          | model-gateway redaction         |
| `services/model-gateway/tests/test_router.py`          |     4 | passed          | model routing                   |

### Playwright E2E tests

There are 4 spec files and 10 test cases:

- `agent-ui-communication.spec.ts` — workbench and agent progress UI (2)
- `approval-console.spec.ts` — approval console and safety UI (3)
- `gap-scan.spec.ts` — marketing gap-scan and 10-agent roster (3)
- `security.spec.ts` — security headers on web and marketing surfaces (2)

The suite did not reach test collection because its configured web-server
command is unavailable.

## Prototype scope confirmation

The root folders `Axiom Proof App/`, `Axiom Proof Site/`, and `Axiom Proof
Handoff Map/` describe generated UI prototypes and handoff references; their
READMEs explicitly state that the production applications live elsewhere or
are to be scaffolded. `design-system/` is a token/component reference. They
are therefore reference-only for the code review scope.

## Baseline conclusion

Phase 0 is **RED**. Lint and dependency installation are healthy, but the
repository is not currently a green baseline. The first remediation queue is:

1. fix the workspace package `.js` import/build configuration;
2. fix or remove the untracked typecheck sentinel;
3. resolve approval-engine canonical ordering behavior;
4. provide test-safe settings for agent-runtime tests;
5. repair Python lock/dependency metadata and the E2E web-server command;
6. rerun the complete baseline before starting Phase 1.
