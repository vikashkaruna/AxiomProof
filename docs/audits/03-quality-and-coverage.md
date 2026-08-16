# Phase 3 — Quality, Coverage, Reuse, and Cross-Document Audit

> Status: **Repository-local findings fixed; external verification TODOs remain.**
> Date: 2026-08-16
> Baseline: merged Phase 3 `main` (`c259c42`)

## Executive result

Phase 3 found and fixed the repository-local inconsistencies that could affect
runtime safety or type confidence:

- Tenant-facing pages no longer use the Supabase service-role client. The
  internal ledger page now checks `users.is_axiom_internal` before using the
  service-role client for cross-tenant chain verification.
- The shared agent contract rejects non-Zod values for `inputSchema` and
  `outputSchema`. Sudhaar now declares `plan.propose`, matching its
  no-write runtime contract.
- Public gap-scan report snapshots are validated by a shared
  `GapScanReportSchema` before rendering.
- Explicit `any` annotations in the reviewed web, marketing, evidence, BFF,
  and middleware paths were removed or replaced with concrete types,
  `unknown`, and narrow type guards.
- The architecture document now distinguishes current autonomy ceilings from
  roadmap targets and names the actual Hono BFF.
- The security review now accurately identifies MFA enforcement and cookie
  attribute verification as deployment/configuration work rather than code
  guarantees.

## 3.1 Cross-document consistency

| Topic                   | Result                                                                                                                                                                                                                                                                                                                                       | Action                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent count             | Consistent at 10 named agents across the product, architecture, runtime, and marketing documents.                                                                                                                                                                                                                                            | No change required.                                                                                                                                                   |
| Control count           | Source of truth is `packages/control-library/src/controls.ts`: `CONTROL_LIBRARY_COUNT = 46`, and the source array contains 46 controls. References in README, BRD, phase plan, deployment guide, and audit docs agree. The “43” occurrences are a historical prototype/audit note or a Phase 5 roadmap row number, not the production count. | No production change required.                                                                                                                                        |
| Current autonomy        | `docs/04_Solution_Architecture.md` previously listed L3 for agents currently implemented at L1.                                                                                                                                                                                                                                              | Fixed the table to show current L1 ceilings and label future L2/L3 values as targets. Karya remains L2 and approval-token gated; Sudhaar remains L1 and non-mutating. |
| API framework           | Architecture wording allowed “Node/TypeScript or Python/FastAPI” for the API, while the deployed BFF is Hono/TypeScript and Python is used for agent services.                                                                                                                                                                               | Fixed the architecture table to state Hono BFF plus Python/FastAPI agent services.                                                                                    |
| Framework/infra choices | The technology and infrastructure strategy documents contain historical alternatives (for example, Upstash) but label the selected implementation and supersession decisions.                                                                                                                                                                | Retained as decision history; no contradiction with the selected stack.                                                                                               |
| MFA and cookies         | Security documentation described MFA/cookie properties as if they were fully code-enforced.                                                                                                                                                                                                                                                  | Reworded the claims and added deployment TODOs below.                                                                                                                 |

## 3.2 Code-versus-document control count

The following checks are now the canonical count checks:

```bash
pnpm --filter @axiom/control-library test
pnpm tsx packages/control-library/scripts/seed.ts --help  # inspect seed entry point
rg -n "CONTROL_LIBRARY_COUNT|controls\.length" packages/control-library/src
```

The control-library test asserts both `controls.length === CONTROL_LIBRARY_COUNT`
and uniqueness of all IDs. The current result is 46 controls, version `0.1.0`.

## 3.3 Dead-code scan

No dead-code tool was installed in the repository, so this is not falsely
reported as a clean scan. The normal lint and TypeScript checks pass, but they
are not replacements for reachability analysis.

Pending commands:

```bash
pnpm dlx knip --include files,dependencies,exports,unlisted --reporter compact
uvx vulture services/agent-runtime/src services/agent-runtime/tests
uvx vulture services/model-gateway/src services/model-gateway/tests
```

Review every result manually before deleting code: agent registries, Next.js
route conventions, and Supabase RPC names can appear unused to static tools.
Record accepted false positives in this report or in a tool configuration file.

## 3.4 Type-safety and API-boundary audit

### Fixed

| Finding                                                                                | Fix                                                                                                                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `z.any()` was used for agent input/output schema fields.                               | `AgentContractSchema` now requires a `ZodType`; the static roster uses actual Zod schemas and has regression tests.                         |
| Sudhaar’s shared contract declared `plan.write` while the runtime is proposal-only.    | Changed the shared scope to `plan.propose`; the test asserts that `plan.write` is absent.                                                   |
| Web middleware cookie callbacks used `options: any`.                                   | Uses `CookieOptions` from `@supabase/ssr`.                                                                                                  |
| Evidence Object Lock error handling used `catch (err: any)`.                           | Uses `unknown` plus a narrow property accessor.                                                                                             |
| BFF approval persistence forced `signed.spec` through `as any`.                        | Persists the typed signed specification directly.                                                                                           |
| Several web and marketing pages used explicit `any` for database rows and agent names. | Added local row contracts, `AgentName`/`StatusKind` types, relation-shape handling, and removed explicit `any` casts in the reviewed paths. |
| Public report JSON was cast to `any` before rendering.                                 | Added and applied shared `GapScanReportSchema`; malformed stored snapshots now return `notFound()` rather than rendering unchecked data.    |

### API validation result

The BFF validates request bodies with shared Zod schemas at the approval,
execution, kill-switch, status-update, and public gap-scan boundaries. The
Next.js BFF proxy is only a same-origin transport bridge and does not make
business decisions from the body. No missing domain-boundary parser was found
in the Phase 3 review.

## 3.5 Test coverage map

Current local TypeScript tests pass: **29 assertions** across approval engine,
configuration, control library, evidence, ledger, and shared agent contracts.
The approval engine has eight tests covering signing, verification, tampering,
expiry, nonce replay, and tenant-secret separation. The new agent-contract test
covers schema rejection and the Sudhaar/Karya safety contract.

Existing E2E coverage contains four Playwright specs covering the gap scan,
approval console, agent/UI communication, and security headers. The E2E suite
still needs a configured browser run in CI or a local environment with the
application dependencies and Supabase test configuration.

The Python suites are configured for Python 3.11 in CI. Local Python execution
was not available in this workstation because `uv` is not installed; CI remains
the authoritative Python test run.

Coverage gaps that remain are primarily UI rendering and integration coverage:

- `apps/web` and `apps/marketing` have no unit-test files; behavior is covered
  only by the E2E suite.
- The BFF route handlers do not yet have an isolated request/response test
  harness.
- Vitest coverage reporting and a project threshold are not configured for the
  TypeScript packages.

## 3.6 Approval-engine mutation sentinel

The approval engine has a strong unit-test sentinel, but no mutation runner is
currently installed. This is an external tooling/configuration TODO rather than
a reason to weaken the approval gate.

Recommended implementation:

```bash
pnpm --filter @axiom/approval-engine add -D \
  @stryker-mutator/core @stryker-mutator/vitest-runner
pnpm --filter @axiom/approval-engine exec stryker init
```

Configure Stryker to mutate `packages/approval-engine/src/index.ts`, run the
package’s Vitest tests, exclude generated files, and fail below an agreed
threshold (recommended initial threshold: 80%, then raise it as the sentinel
stabilises). Add `pnpm --filter @axiom/approval-engine exec stryker run` as a
required CI job. This needs a dependency update and CI budget decision, so it
was not silently added to the lockfile during this audit.

## 3.7 Schema reuse

The BFF uses the shared schemas from `@axiom/types` for approval, execution,
kill-switch, engagement status, and public gap-scan requests. The new
`GapScanReportSchema` is also reused by the marketing report page instead of
defining a page-local JSON shape. No duplicate approval or execution schema was
found.

The remaining untyped database rows are a consequence of the absence of
generated Supabase database types. The reviewed pages now have local row
contracts where needed. The durable follow-up is to generate
`Database` types from the target Supabase schema and pass them to both the
server and admin clients; that requires a live project/schema and is therefore
deployment-specific.

## 3.8 Security-sensitive path review

| Path                           | Result                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication/session refresh | Middleware validates the Supabase session and uses typed cookie options. MFA claim enforcement remains a deployment/code follow-up.     |
| Tenant resolution/RLS          | Tenant-facing portal, engagements, evidence, breach, and DSAR pages now use the user-scoped client so RLS remains authoritative.        |
| Internal cross-tenant views    | Workbench already checked `is_axiom_internal`; ledger now performs the same check before service-role access.                           |
| Approval issuance              | Shared Zod parsing, dry-run freshness, rollback validation, role checks, signed token issuance, and ledger persistence remain in place. |
| Execution                      | Shared Zod parsing, idempotency, per-action token verification, kill-switch checks, and tenant/plan/action matching remain in place.    |
| Evidence                       | Object Lock verification now has type-safe error handling; the compliance-mode implementation is unchanged.                             |
| Ledger                         | Append-only path and chain verification remain unchanged; public users are redirected away from the internal ledger.                    |
| PII/model gateway              | Existing redaction and model-routing tests remain the source of truth; production provider/network verification is external.            |
| CI/repository controls         | CI checks are present, but GitHub branch-protection/no-op-PR behavior must be verified in the GitHub project settings.                  |

## External TODOs with exact instructions

### TODO 1 — Supabase MFA and cookie verification

1. In the production Supabase project, enable TOTP MFA under Authentication.
2. Require the appropriate assurance level for approver users in the project’s
   authentication policy; do not rely on the UI label alone.
3. Create a test approver, enroll TOTP, and verify the session assurance level
   is AAL2 before calling the approval endpoint.
4. Add/enable BFF enforcement using the Supabase MFA assurance response or JWT
   `aal`/`amr` claim, returning `403 mfa_required` for approver actions below
   AAL2. Add an integration test with an AAL1 token and an AAL2 token.
5. In browser DevTools on the deployed web app, inspect the auth cookies and
   record `HttpOnly`, `Secure`, `SameSite=Strict`, and the expected domain/path.
6. Update `docs/07_SECURITY_REVIEW.md` and this TODO with the date/project
   reference after verification.

### TODO 2 — Generated Supabase types

Against the target project, run the Supabase type generator and commit the
generated type file (without secrets):

```bash
npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_REF" \
  > packages/supabase/src/database.types.ts
```

Then update `createSupabaseServerClient` and `createSupabaseAdmin` to use
`SupabaseClient<Database>`, replace local row contracts incrementally, and run
`pnpm typecheck && pnpm test`.

### TODO 3 — Dead-code, coverage, and mutation tooling

Install/run the commands in Sections 3.3 and 3.6 in CI, upload the reports as
artifacts, and set merge thresholds after reviewing the first baseline. Add
Vitest’s V8 coverage provider for the TypeScript packages and require coverage
for the approval engine, shared types, BFF, and scoring logic.

### TODO 4 — GitHub branch protection and no-op PR

In repository Settings → Branches → the `main` ruleset, verify required status
checks, linear/history policy, force-push/delete restrictions, and the intended
single-user approval policy. Do not configure a two-different-reviewer rule.
Create a temporary no-op branch with a documentation-only change, open a PR,
confirm the required checks appear and merge according to the configured policy,
then delete the temporary branch. Record the ruleset name, required check names,
and verification date here.

## Verification run

Passed locally:

```text
pnpm lint
pnpm test
pnpm --filter @axiom/types typecheck
pnpm --filter @axiom/web typecheck
pnpm --filter @axiom/marketing typecheck
pnpm --filter @axiom/evidence typecheck
pnpm --filter @axiom/types test
pnpm --filter @axiom/approval-engine test
```

Not locally available: `uv`, `knip`, and `vulture`; their exact commands and
acceptance guidance are recorded above. The known generated prototype edits in
the four design/support files were intentionally left untouched and are not
part of this Phase 3 change.
