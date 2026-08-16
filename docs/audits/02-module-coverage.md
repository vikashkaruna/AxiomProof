# Phase 2 Module Coverage — 2026-08-16

> Historical Phase 2 review. Its repository-local fixes are merged into
> `main`; current quality and cross-document status is in
> `docs/audits/03-quality-and-coverage.md`.

## Result

All 14 Phase 2 modules were traced against the Phase-Wise Implementation Plan.
The production paths are present for the core assessment/reporting flow, but
the six Phase 1 product extensions are not all complete end-to-end. This pass
implemented the safe repository-local portions and records the remaining
integration work as TODOs below. No two-reviewer approval rule was added.

The highest-risk local findings were fixed in this pass:

- internal workbench and plan pages now use user-scoped RLS reads before any
  service-role aggregate query;
- the browser now bridges its httpOnly Supabase session to the BFF bearer-token
  and tenant-header contract, and the approval console now has a separate
  execute action;
- public gap-scan reports are bound to a short-lived httpOnly access cookie,
  do not render contact email, and use the anon insert policy rather than the
  service-role client;
- the duplicate security-control mapping was corrected;
- control-library validation now matches the actual per-control weight model;
- report HTML is escaped and only explicit evidence artifact IDs are cited;
- discovery/classification/assessment edge cases have tests;
- typed local cores were added for RoPA, policy/notice drafts, and playbook
  capture/ranking without inventing legal facts.

## 14-module matrix

| Module                              | Evidence and dependencies                                                                                                                                                     | Tests                                                                             | Status / deviation                                                                                                                                                                                                                                                                 | Severity            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| M0.1 Corporate & Digital Foundation | `apps/marketing/` (site pages and positioning); company incorporation, domain ownership, legal terms, email, analytics, and production accounts are not repository artifacts. | Marketing E2E covers public navigation only.                                      | UI exists; corporate foundation remains an external operating task, not an application implementation.                                                                                                                                                                             | P2 external         |
| M0.2 Control Library v0             | `packages/control-library/src/controls.ts` (1,680 lines), `src/seed.ts`, `src/controls.test.ts`; consumed by gap-scan and seed tooling.                                       | 2 new Vitest tests; `validateLibrary()` and seed count/ID uniqueness are covered. | 46 controls are present. Fixed a pre-existing invariant that incorrectly required every domain’s per-control weights to sum to 1; the source uses weight 1 per control.                                                                                                            | Fixed               |
| M0.3 Parikshan Assessment v0        | `services/agent-runtime/src/axiom/agents/parikshan.py` (167 lines); uses `control_library_loader`, Pydantic input/output, and the common ledger-bearing `BaseAgent`.          | 3 tests in `test_parikshan.py`.                                                   | Deterministic scoring is real and ledger-wrapped. Fixed unknown-question handling so extra answer keys cannot inflate scores; persistence of findings is owned by the caller/API, not this agent.                                                                                  | P2 integration      |
| M0.4 Prativedan Report v0           | `services/agent-runtime/src/axiom/agents/prativedan.py` (185 lines); consumes Parikshan findings and emits structured sections/HTML.                                          | 2 new tests in `test_prativedan.py`.                                              | HTML rendering is real. Fixed XSS-prone interpolation and evidence citation extraction. PDF rendering and signed report delivery are not implemented despite the declared `pdf.render` scope.                                                                                      | P1 stub             |
| M0.5 Free Gap-Scan                  | `apps/marketing/src/app/gap-scan/route.ts` (94), `src/lib/gap-scan-scoring.ts` (107), report page (165); uses Zod, control library, and Supabase RLS.                         | Existing E2E gap-scan coverage; scoring is now corrected for SEC-002.             | Public scoring and report are real. Added cookie-bound report access, removed contact email from public output, and removed unnecessary service-role insertion. Distributed rate limiting, abuse monitoring, and lead-delivery integration remain external infrastructure work.    | P1 external         |
| M0.6 Agent Workbench                | `apps/web/src/app/(app)/workbench/page.tsx` (203); Supabase auth, user profile, RLS, and service-role aggregate reads.                                                        | Existing workbench E2E; no dedicated authorization test.                          | Fixed login-only cross-tenant exposure by requiring `users.is_axiom_internal` before admin aggregates. Roster/status UI exists; actual agent-run controls and live progress are still not implemented.                                                                             | Fixed / P1 stub     |
| M1.1 Drishti Discovery v0           | `agents/drishti.py` (137); interview normalization and typed `SystemRecord`, consumed by Vibhaag/ROPA.                                                                        | Covered by new discovery/classification tests.                                    | Interview-driven discovery is real. The Phase 2 live read-only connectors are absent; no connector credentials or adapter implementations are in the repository.                                                                                                                   | P1 stub             |
| M1.2 Vibhaag Classification v0      | `agents/vibhaag.py` (172); pattern classifier consumes Drishti inventory and field hints.                                                                                     | Covered by new tests for documented and legacy hint shapes.                       | Rule-based classification and review flags are real. Fixed the documented `{field_name: hint}` shape. Persistent review queue and model-assisted classification are not wired.                                                                                                     | P1 integration      |
| M1.3 RoPA Generator                 | New `services/agent-runtime/src/axiom/ropa_generator.py` (81); consumes Drishti inventory + Vibhaag classifications.                                                          | Covered by `test_phase2_generators.py`.                                           | Safe deterministic generator now emits reviewable records and refuses to guess lawful basis, retention, or transfer safeguards. There is no API route, database table, UI, or evidence linkage yet.                                                                                | P1 stub             |
| M1.4 Sudhaar Remediation Planner v0 | `agents/sudhaar.py` (227); consumes findings and emits typed actions/rollback plans for the BFF approval gate.                                                                | Existing 3 Sudhaar tests.                                                         | Planning contract and rollback metadata are real; Sudhaar remains non-mutating. Plan persistence and dry-run production adapters remain BFF/infrastructure integration work.                                                                                                       | P2 integration      |
| M1.5 Saakshi Evidence v0            | `agents/saakshi.py` (152), `evidence_client.py`; S3 Object Lock and Supabase evidence row are dependencies.                                                                   | Existing evidence/agent safety coverage plus input constraints.                   | Seal path is real and retention is now constrained to a positive value. AWS bucket/Object Lock, IAM, and Supabase row verification must be run in the target accounts; DB upsert failure currently cannot undo an already sealed WORM object and must be operationally reconciled. | P1 external         |
| M1.6 Policy & Notice Generator      | New `services/agent-runtime/src/axiom/policy_generator.py` (51), consuming `RopaRecord`.                                                                                      | Covered by `test_phase2_generators.py`.                                           | Deterministic draft sections are implemented and marked for legal review; no legal text is asserted as final. Publication/versioning, client approval, template storage, and delivery are absent.                                                                                  | P1 stub             |
| M1.7 Human Review Console v0        | `apps/web/src/app/(app)/plans/` (list 109, detail 261, approval actions); BFF `/v1/plans/approve`, `/v1/plans/:id/execute`, Supabase RLS.                                     | Existing approval-console E2E; TypeScript typecheck.                              | Fixed service-role data exposure, added cookie-to-BFF auth bridge with `X-Tenant-Id`, and added explicit approve-then-execute UI. The backend still needs a live Supabase/BFF session and role configuration; one approving human remains the policy.                              | Fixed / P1 external |
| M1.8 Delivery Playbook Capture      | New typed local core `services/agent-runtime/src/axiom/playbook.py` (27).                                                                                                     | Covered by `test_phase2_generators.py`.                                           | Capture validation and deterministic backlog ranking are implemented. There is no persistence, engagement linkage, time-entry UI, ledger event, or cross-engagement automation backlog.                                                                                            | P1 stub             |

## Remaining P0/P1 work

No unresolved P0 was found after the local access-control and report-access
fixes. The remaining P1 items are product/infrastructure completion items:

1. Configure and test distributed rate limiting for the public gap-scan route.
2. Build the live Drishti connector adapters and persistent Vibhaag review queue.
3. Add database/API/UI persistence for RoPA, policy drafts, and playbook entries.
4. Add Prativedan PDF generation, signed delivery, and evidence-pack storage.
5. Complete Supabase/BFF session, tenant, and role configuration for the
   browser approval flow, then test approve → execute against a non-production
   plan.
6. Verify the Saakshi S3 Object Lock and evidence-row reconciliation path in
   AWS/Supabase.

## External TODO instructions

### TODO-1: public gap-scan production controls

Configure a Redis/API-gateway rate limit keyed by a privacy-preserving client
identifier (for example, IP prefix plus a short-lived session hash), with a
separate limit for repeated report requests. Return `429` with
`Retry-After`. Add metrics for accepted, rejected, and persistence-failure
counts. Apply the `0006` migration, confirm anonymous INSERT is allowed but
anonymous SELECT is denied, and verify that the `gap_scan_access` cookie is
`Secure`, `HttpOnly`, `SameSite=Lax`, and expires after one hour in a
production browser.

### TODO-2: live discovery and classification

Implement read-only connector adapters for the first three approved connector
types. Store credentials in AWS Secrets Manager, give each adapter a narrowly
scoped read role, and return only structural metadata to Drishti. Persist
`SystemRecord` and `FieldClassification` rows under tenant/engagement RLS
policies. Create a review-queue table keyed by field path and confidence;
require a human decision before a low-confidence classification is used to
generate a client-facing RoPA or notice. Record connector reads and review
decisions in the append-only ledger.

### TODO-3: RoPA, policy, and playbook persistence

Add append-only migrations for `ropa_records`, `policy_drafts`, and
`playbook_entries`, each with `tenant_id`, `engagement_id`, source IDs,
created-by, version, and review status. Add Zod/Pydantic API contracts and
tenant-scoped RLS policies. On every publish or review decision, append a
ledger entry and link the relevant evidence IDs. Build the web review screens;
do not expose a draft as final legal advice until a human reviewer marks it
approved.

### TODO-4: report rendering and delivery

Run the Python 3.11 agent image with the pinned PDF dependencies. Convert the
escaped structured report to PDF in a sandboxed worker, seal the resulting
bytes through Saakshi, and return the evidence ID. Verify that all rendered
claims point to explicit evidence IDs and that the report cannot be published
without a reviewer ID/sign-off record.

### TODO-5: approval-console deployment verification

Set `BFF_PUBLIC_URL` on the web deployment and deploy the new
`/api/bff/[...path]` route. Confirm the BFF receives a valid Supabase bearer
token and the plan tenant UUID in `X-Tenant-Id`. In a staging tenant, create
a plan whose every action has `dry_run_status = 'dry_run_complete'` and
`rollback_validated = true`; verify one approver can issue a token, the
separate execute call consumes it once, a replay returns `409`, and an
ineligible action is rejected. Keep branch protection at exactly one required
approval; do not add a second-user rule.

### TODO-6: evidence and Python runtime

Build and run the agent services with Python 3.11. Apply Terraform in
`ap-south-1`, verify the evidence bucket has Object Lock `COMPLIANCE`, and
exercise a non-production seal/read/integrity check. Verify Supabase evidence
row upsert permissions and add an operator reconciliation alert for a sealed
S3 object with a missing database row. The local Python 3.14 interpreter is
not the supported deployment target because it cannot install the pinned
spaCy/Presidio set.

## Verification in this worktree

- `pnpm typecheck` — PASS.
- `pnpm --filter @axiom/control-library test` — PASS (2 tests).
- `PYTHONPATH=src pytest -q` in `services/agent-runtime` — PASS (32 tests;
  local interpreter was Python 3.14, while deployment/CI remains Python 3.11).
- `PYTHONPATH=src pytest -q` in `services/model-gateway` — PASS (14 tests).
- `git diff --check` — PASS before the final documentation edits.
- The four generated prototype changes remain intentionally untouched and
  unstaged.
