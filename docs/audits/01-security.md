# Phase 1 Security Review — 2026-08-16

## Scope and result

This review traces the ten Phase 1 tasks in `docs/REPO_AUDIT_PLAN.md` against
the production code and infrastructure definitions. The four generated root
prototype bundles remain outside scope and were not changed.

Result: the locally actionable findings are fixed in this worktree. External
deployment and GitHub settings still require the TODOs in this document.

## Findings and fixes

| Task                              | Trace result                                                                                                                                                                                                                    | Fix / remaining action                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 Security claims               | The security document claimed two approvals for sensitive paths, while the configured branch policy uses one. It also described the approval and residency controls more strongly than the code enforced.                       | Security claims now match the single-review policy and the implemented fail-closed checks. The remaining external claims are listed below.                                                                                                                                                                                                                    |
| 1.2 Approval issuance / BR-2      | The dry-run and rollback checks existed, but a request could name an action that was not returned by the tenant+plan query; the token could then be issued for an unverified ID. Action updates were also not tenant-qualified. | `v1.ts` now rejects missing action IDs, rejects non-reviewable plans, validates expiry, qualifies every action query/update by tenant and plan, and returns persistence errors. Duplicate action IDs are rejected by the shared schema.                                                                                                                       |
| 1.3 Sudhaar separation of duties  | `can_mutate = False` was present and the implementation only generated proposals, but its declared `plan.write` scope contradicted the no-write contract.                                                                       | Sudhaar now declares `plan.propose`; it does not receive a persistence scope or execute a connector. Regression coverage continues to assert `can_mutate is False` and L1 autonomy.                                                                                                                                                                           |
| 1.4 Ledger function and role      | `append_ledger()` was `SECURITY DEFINER`, but its search path and RPC privileges were not explicitly hardened. The dedicated role had INSERT but the default public table privileges were not explicitly revoked.               | The migration sets `search_path = public, pg_temp`, revokes public/anon/authenticated table access, grants only INSERT to `ledger_writer`, revokes its update/delete/truncate privileges, and grants the append RPC only to `service_role`. Apply the migration before relying on this in Supabase.                                                           |
| 1.5 Evidence Object Lock          | Compliance mode and seven-year default retention were declared, but bucket creation did not explicitly enable Object Lock at the bucket resource.                                                                               | Terraform now sets `object_lock_enabled = true`, keeps versioning enabled, uses `COMPLIANCE`, and retains the delete deny. A real AWS plan/apply and an API verification remain external.                                                                                                                                                                     |
| 1.6 PII redaction                 | Regex coverage included PAN, Aadhaar, passport, IFSC, email, Indian phone, card, and IP, but UPI was missing and Presidio was described but never invoked.                                                                      | Added UPI detection and lazy Presidio analysis for person/location/address/phone/email/card/IP/date entities. The gateway now forces the redaction pipeline for every hosted-model route even when the caller sends `pii_redact=false`. Install and verify the Presidio language model in the deployment before treating NER coverage as production-complete. |
| 1.7 TS/Python token compatibility | Canonical action ordering already matched after the Phase 0 fix. Karya still accepted a valid signature without checking the plan or action scope.                                                                              | Karya now requires both `spec.planId == input.plan_id` and the requested action in `spec.actionIds`. The BFF also binds the token to the persisted tenant/plan/signature/scope record.                                                                                                                                                                        |
| 1.8 Kill switch / BR-6            | The tenant-scoped kill switch returned active for every tenant, and release had no role check.                                                                                                                                  | `isActive(tenantId)` now honors global versus matching-tenant scope. Release is founder-only; global engagement is founder/owner-only; tenant engagement can be performed by the existing elevated roles after schema validation.                                                                                                                             |
| 1.9 Environment and secrets       | Several production secrets were optional, and the BFF used unvalidated process environment variables for the agent-runtime call.                                                                                                | TS, agent-runtime, and model-gateway settings now fail at production boot when signing/auth secrets are absent, redaction is disabled, or the region is not `ap-south-1`. The BFF validates and uses `AGENT_RUNTIME_URL` and `AGENT_RUNTIME_INTERNAL_TOKEN` through central config. Helm now supplies the runtime URL.                                        |
| 1.10 Residency                    | Region defaults existed but could be overridden, and hosted routing could be requested with redaction disabled.                                                                                                                 | Production settings reject non-`ap-south-1`; hosted routes force redaction. AWS/Supabase/Temporal vendor-region evidence still requires external account verification.                                                                                                                                                                                        |

## Approval replay protection

The execute route previously relied on the process-local nonce set. It now
looks up the token by its signed nonce, tenant, and plan, checks its persisted
signature and scope, and atomically changes `approval_tokens.status` from
`issued` to `consumed` before marking actions executing. This makes the
single-use gate work across BFF replicas. The in-memory check remains a fast
path only.

## Explicit external TODOs

These cannot be proven or completed from repository files alone:

1. **GitHub branch protection (repository administrator).** In the repository
   settings for `main`, retain exactly one required approving review, required
   CODEOWNERS review, the five required CI checks, strict up-to-date branches,
   conversation resolution, linear history, and disabled force pushes/deletes.
   Do not configure a ruleset or workflow requiring two different approvers.
   Open a disposable no-op PR, confirm the five checks run and the PR is held
   until the single configured review exists, then close it. Record the PR
   number, check run IDs, and settings screenshot or API response here.

2. **Supabase migration and privilege verification.** From a trusted operator
   environment, apply migrations in order. Query `pg_proc` to confirm
   `prosecdef = true` and the expected `proconfig` search path for
   `public.append_ledger`. Query `information_schema.role_table_grants` and
   `information_schema.routine_privileges` to confirm `ledger_writer` has only
   INSERT on `audit_ledger` and `service_role` is the only application role
   with EXECUTE on `append_ledger`. Attempt direct INSERT/UPDATE/DELETE as the
   application roles and confirm denial; call the RPC through the service role
   and confirm success.

3. **AWS Object Lock verification.** Run `terraform init` and
   `terraform plan` under the production AWS account, review that the evidence
   bucket is in `ap-south-1`, then apply through the approved deployment path.
   Verify with `aws s3api get-object-lock-configuration --bucket
axiom-proof-evidence-ap-south-1` that the rule is `COMPLIANCE` with the
   intended retention. Also verify versioning, public-access blocking, SSE-KMS,
   and the effective IAM deny for object deletion. Never test deletion against
   a live retained evidence object.

4. **Secrets and service identity.** Populate the referenced AWS Secrets
   Manager / External Secrets entries for Supabase, the BFF signing key, the
   BFF-to-agent token, and the model-gateway API key. Deploy with
   `ENVIRONMENT=production`; confirm each service starts and that removing one
   secret causes readiness/startup failure. Confirm the model gateway Network
   Policy only permits the intended in-cluster callers.

5. **Presidio model readiness.** Build the Python 3.11 image, install the
   pinned Presidio/spaCy set, ensure the required English spaCy model is present
   in the image, and run the redaction tests with representative names,
   addresses, UPI IDs, Indian identifiers, and nested variables. Keep the
   regex-only fallback for local development, but fail the production release
   gate if the Presidio analyzer cannot initialize.

6. **Residency evidence.** In AWS, Supabase, Temporal, and the model-provider
   accounts, record the actual project/namespace/endpoint regions and any
   cross-region inference setting. The application now rejects an incorrect
   AWS region, but vendor account configuration and provider inference routing
   remain external controls.

## Verification performed in this worktree

- `pnpm typecheck` — PASS (11 TypeScript packages).
- `git diff --check` — PASS.
- Python dependency tests could not be rerun here because `uv` is not
  installed on this machine. CI is configured to run both Python suites with
  Python 3.11; use `uv sync --extra dev && uv run pytest` in each service.
- Terraform apply, Supabase privilege queries, and GitHub branch-protection /
  no-op-PR verification were not claimed as local results.
