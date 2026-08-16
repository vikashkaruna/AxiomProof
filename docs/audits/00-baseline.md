# Phase 0 Baseline — 2026-08-16

## Scope

This baseline was run against the current local worktree on `main`, at the
same commit as `origin/main` (`9e89ee5`). The worktree already contained a
large set of local implementation changes; no files were reset or discarded.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS | Dependencies installed; local lockfile was available. |
| `pnpm format:check` | FAIL | `packages/ui/src/primitives/Button.tsx` is not Prettier-formatted. |
| `pnpm lint` | PASS | Marketing and web ESLint completed with no warnings or errors; package lint scripts mostly report no config. |
| `pnpm typecheck` | FAIL | `packages/types/src/_test.ts:7` omits required property `b`; this file is untracked. |
| `pnpm test` | FAIL | 1 approval-engine test failed; the other four discovered TS test files passed. |
| Agent-runtime pytest | FAIL | 24 collected; 18 passed and 6 failed because required Supabase settings were absent. Standard `uv sync` is also blocked by an invalid lockfile and the `httpx-mock` Python-version constraint. |
| Model-gateway pytest | PASS with workaround | 13 tests passed in an isolated Python 3.11 environment with `PYTHONPATH=src`; the local Python 3.14 environment cannot install the pinned spaCy wheel. |
| `pnpm build` | FAIL | Both Next.js builds fail on unresolved `.js` imports from workspace TypeScript packages. |
| Playwright E2E | FAIL before collection | `playwright.config.ts` starts `pnpm dev`, but `tests/e2e/package.json` has no `dev` script. |
| CI / branch protection | FAIL | GitHub CI runs, but the latest `main` run failed and GitHub reports `main` is not branch-protected. |

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

| Test file | Tests | Result | Primary area |
| --- | ---: | --- | --- |
| `packages/approval-engine/src/index.test.ts` | 8 | 7 passed, 1 failed | approval-token signing and verification |
| `packages/config/src/index.test.ts` | 5 | passed | runtime configuration |
| `packages/evidence/src/index.test.ts` | 3 | passed | evidence sealing/presigning |
| `packages/ledger/src/canonicalise.test.ts` | 8 | passed | ledger canonicalisation and hashing |

### Python unit tests

| Test file | Tests | Result | Primary area |
| --- | ---: | --- | --- |
| `services/agent-runtime/tests/test_approval_engine.py` | 5 | passed | approval-token mirror |
| `services/agent-runtime/tests/test_canonicalise.py` | 7 | passed | canonical JSON and hashing |
| `services/agent-runtime/tests/test_karya.py` | 1 | failed at setup | execution gate / approval token |
| `services/agent-runtime/tests/test_parikshan.py` | 2 | failed at setup | assessment agent |
| `services/agent-runtime/tests/test_pii_redactor.py` | 6 | passed | PII redaction |
| `services/agent-runtime/tests/test_sudhaar.py` | 3 | failed at setup | planning agent safety |
| `services/model-gateway/tests/test_redaction.py` | 9 | passed | model-gateway redaction |
| `services/model-gateway/tests/test_router.py` | 4 | passed | model routing |

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
