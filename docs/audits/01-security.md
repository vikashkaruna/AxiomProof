# Phase 1 Security Review — 2026-08-16

## Scope and disposition

This review covers the six non-negotiables in `AGENTS.md`, the security claims
in `docs/07_SECURITY_REVIEW.md`, and the ten Phase 1 traces in
`docs/REPO_AUDIT_PLAN.md`. The four generated prototype bundles remain out of
scope.

Phase 1 is **RED for production readiness**. No P0 unauthenticated destructive
path was demonstrated in the Phase 0/1 execution stubs, but the P1 findings
below must be remediated before enabling live connectors or third-party model
egress. This report records findings only; it does not silently change runtime
security behavior.

## Positive controls verified

| Area                                     | Evidence                                                                                                                   | Result                                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| BFF authentication and tenant resolution | `services/bff/src/middleware/auth.ts:13-38`; `services/bff/src/middleware/tenant.ts:16-50`                                 | Bearer tokens are validated with Supabase and tenant membership is checked before `/v1/*`.                                  |
| Approval role gate                       | `services/bff/src/routes/v1.ts:52-67`                                                                                      | Only owner/admin/approver roles can request approval tokens.                                                                |
| Dry-run and rollback gate                | `services/bff/src/routes/v1.ts:91-126`; execution re-check at `362-364`                                                    | The positive checks exist, but completeness and token-consumption gaps remain below.                                        |
| Sudhaar separation of duties             | `services/agent-runtime/src/axiom/agents/sudhaar.py:105-112`; `services/agent-runtime/src/axiom/agents/base.py:101`        | `can_mutate` is false and the agent is L1. This is declarative; runtime tool enforcement is not implemented.                |
| Karya approval check                     | `services/agent-runtime/src/axiom/agents/karya.py:71-107`                                                                  | Karya refuses while the Phase 0/1 feature gate is disabled and verifies a token before its future execution stub.           |
| S3 evidence retention                    | `infra/terraform/envs/prod/s3.tf:16-37,81-110`                                                                             | Versioning, Object Lock `COMPLIANCE`, seven-year default retention, public-access blocking, and delete denies are declared. |
| Ledger hash chain                        | `infra/supabase/migrations/0005_approvals_ledger.sql:177-330`                                                              | `append_ledger()` is `SECURITY DEFINER`, serializes tenant counters, hashes entries, and has a verifier.                    |
| Token cryptography                       | `packages/approval-engine/src/index.ts:49-113`; Python mirror `services/agent-runtime/src/axiom/approval_engine.py:71-112` | HMAC-SHA-256, tenant keys, expiry, sorted action IDs, and timing-safe comparison are present.                               |

## Findings

### P1-01 — Approval tokens are not single-use across requests or replicas

`approval_tokens` has `status`, `consumed_at`, and a unique `nonce`
(`infra/supabase/migrations/0005_approvals_ledger.sql:18-51`), but the BFF
never loads the token row, writes `approval_token_usages`, marks the row
consumed, or checks `status` during execution. It only uses the in-memory
`ApprovalEngine.usedNonces` set and calls `markNonceUsed()` after enqueueing
(`services/bff/src/routes/v1.ts:318-431`). A process restart or a second BFF
replica can therefore accept the same still-issued token again.

Remediation: put the token ID in the signed token, atomically claim the token
row with `UPDATE ... WHERE status = 'issued'`, record usage, and make replay
failure part of the transaction before dispatch.

### P1-02 — Kill-switch release is unauthorised and tenant scope is ignored

`POST /v1/kill-switch/release` has no role check
(`services/bff/src/routes/v1.ts:484-495`), while engage checks founder/admin/owner
(`451-481`). Any authenticated tenant member who can call the route can release
the safety stop. In addition, `KillSwitchService.isActive()` returns `true` for
every tenant whenever any tenant-scoped switch is engaged
(`services/bff/src/services/kill-switch.ts:43-47`). The state is process-local
despite production defaults of two or more BFF replicas
(`infra/helm/axiom-proof/values.yaml:81-99`).

Remediation: authorize release at the same or stricter role level as engage,
pass the current tenant into the scope check, and store the state in a shared,
audited store before multi-replica deployment.

### P1-03 — Approval scope is not complete or fully bound to execution

The approval lookup filters actions by plan but never verifies that every
requested ID was returned (`services/bff/src/routes/v1.ts:71-108`). An approval
can therefore be issued for a partially nonexistent set and the DB update
errors are ignored (`168-177`). More importantly, `conditions` are accepted by
`IssueApprovalRequestSchema` (`packages/types/src/api.ts:148-162`) and stored,
but are not passed into the signed token (`v1.ts:128-156`) and are never
evaluated during execution. Finally, execution forwards caller-supplied
`mode`, `concurrency`, and `stopOnFailure` rather than requiring them to match
the signed spec (`v1.ts:386-424`).

Remediation: require an exact action-set match, bind conditions and all
execution parameters into the signature, compare request values to the token,
and fail closed on every persistence/update error.

### P1-04 — Internal service authentication is miswired and optional

The agent runtime expects `INTERNAL_TOKEN` through the Pydantic field
`internal_token` (`services/agent-runtime/src/axiom/config.py:65-66`), but Helm
injects `AGENT_RUNTIME_INTERNAL_TOKEN`
(`infra/helm/axiom-proof/templates/agent-runtime-deployment.yaml:55-64`). When
the expected variable is absent, `/agents/{agent}/invoke` skips authentication
(`services/agent-runtime/src/axiom/app.py:154-170`) and `/internal/execute`
rejects every request (`205-209`). The model-gateway API key has the same
problem in reverse: its settings field is `api_key` (`services/model-gateway/src/model_gateway/config.py:20-22`),
while Helm injects `MODEL_GATEWAY_API_KEY`
(`infra/helm/axiom-proof/templates/model-gateway-deployment.yaml:47-51`).

Remediation: define explicit environment aliases, make both internal tokens
required in production, render the Helm chart, and add an authenticated
service-to-service smoke test.

### P1-05 — Model-gateway redaction is not an enforced egress boundary

The gateway trusts the request's `pii_redact` flag
(`services/model-gateway/src/model_gateway/app.py:101-120`). The router also
honours caller-selected hosted models (`router.py:49-63`). The advertised
Presidio NER path is not implemented: `redaction.py:43-47` contains only the
regex fallback, with no `AnalyzerEngine` or anonymizer invocation. Names,
addresses, and other free-form personal data can pass through, and a caller can
set `pii_redact=false`. The current `_dispatch()` is a deterministic Phase 0/1
stub (`app.py:174-190`), so there is no live provider egress today; this remains
a release-blocking gap before the provider dispatcher is enabled.

Remediation: enforce redaction server-side for every hosted-provider request,
remove caller control over the safety-critical bypass, implement and test the
Presidio path, and allow structural bypass only after schema-level proof that
no row values are present.

### P1-06 — Data residency is configuration, not an invariant

AWS region defaults to `ap-south-1` in TypeScript, agent runtime, and gateway
settings, and Terraform declares the same region. However, all three settings
accept arbitrary values; the gateway accepts arbitrary `self_hosted_base_url`
and the agent accepts arbitrary `s3_endpoint`/`model_gateway_url`. There is no
startup assertion or provider allowlist that prevents non-India endpoints.
`services/model-gateway/src/model_gateway/router.py:49-83` can route to hosted
Bedrock based on caller input. The `ap-south-1` claim is therefore not
enforced by code.

Remediation: make production region and endpoint allowlists immutable, reject
non-`ap-south-1` AWS configuration at boot, and route hosted models only
through an explicitly approved India-region provider configuration.

### P1-07 — Ledger append-only enforcement is incomplete at the database boundary

The migration correctly declares `append_ledger()` as `SECURITY DEFINER`, and
`ledger_writer` receives INSERT without UPDATE/DELETE
(`0006_ledger_role_and_extras.sql:14-25`). But the runtime clients actually use
the Supabase service key (`services/bff/src/services/ledger.ts:17-29`,
`packages/ledger/src/append.ts:66-84`), not the `ledger_writer` role. Supabase
service-role access bypasses RLS, and the migrations do not revoke direct
INSERT from that privileged path. The claim that the function is the only
sanctioned write path is consequently enforced by convention, not by the
database privilege boundary. The `SECURITY DEFINER` function also lacks an
explicit `SET search_path`.

Remediation: expose only the RPC to the application role, revoke direct table
INSERT from all application roles, set a safe function search path, and add a
database-level privilege test.

### P1-08 — Public-facing Next.js services hold service-role credentials

`packages/supabase/src/admin.ts:8-13` says Next.js apps never use the admin
client, but multiple `apps/web` pages import `createSupabaseAdmin`, and the web
deployment mounts `SUPABASE_SERVICE_KEY`
(`infra/helm/axiom-proof/templates/web-deployment.yaml:35-47`). This increases
the blast radius of a public web compromise and contradicts the stated
service-role isolation model. The direct admin writes also bypass the BFF's
tenant and approval policy layer.

Remediation: remove service-role credentials from web/marketing deployments;
move privileged operations behind the authenticated BFF or narrowly scoped
server-side endpoints with explicit tenant checks.

## Process and test gaps

These are P2 unless they are relied upon as the sole production control:

1. `docs/07_SECURITY_REVIEW.md` claims CodeQL and Semgrep run on every PR, but
   `.github/workflows/ci.yml` has neither. It claims Trivy scans container
   images, while CI runs a filesystem scan. `pip-audit` is explicitly made
   non-blocking with `|| true` (`ci.yml:101-104`).
2. Cross-language token compatibility is asserted by separate unit tests, but
   there is no test that issues in TypeScript and verifies in Python (and vice
   versa). Python and JavaScript can serialize some numeric values differently
   in canonical JSON (`packages/ledger/src/canonicalise.ts:21-43`,
   `services/agent-runtime/src/axiom/canonicalise.py:14-39`).
3. The Python verifier constructs `ApprovalTokenSpec` from unchecked dictionary
   keys (`services/agent-runtime/src/axiom/approval_engine.py:85-100`), so a
   malformed token can raise an exception rather than return a controlled
   invalid result.
4. The `can_mutate` flag is declarative. `BaseAgent.invoke()` dispatches to
   `_run()` without a tool-scope or mutation capability guard
   (`services/agent-runtime/src/axiom/agents/base.py:128-175`). Karya's current
   stub checks the token, but future connectors must not rely on the class
   attribute alone.

## Phase 1 claim map

| Doc 07 claim                                                          | Trace result                                                                                                                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One review / two reviews for security paths                           | **No longer true by repository configuration.** Review enforcement was intentionally disabled; the policy document now labels two-review behavior as non-enforced policy. |
| Dependabot, `pnpm audit`, `pip-audit`, Trivy block high/critical risk | **Partial.** Dependabot and `pnpm audit` exist; `pip-audit` is non-blocking; Trivy scans the filesystem, not built images.                                                |
| CodeQL and Semgrep run on every PR                                    | **Not present in workflow.**                                                                                                                                              |
| Supabase Auth, tenant RLS, server-only service keys                   | **Partial.** BFF auth/RLS path exists, but web deployments and pages use the service role.                                                                                |
| Approval engine is HMAC, scoped, expiring, nonced, single-use         | **Partial.** HMAC/scope/expiry/nonce exist; DB-backed single-use and usage logging are not wired.                                                                         |
| BR-2 requires dry-run and validated rollback                          | **Partial.** Checks exist, but requested-action completeness is not verified.                                                                                             |
| Sudhaar has no write credentials                                      | **Partial.** `can_mutate=False` is declared; runtime capability enforcement is absent.                                                                                    |
| Ledger is append-only and hash-chained                                | **Partial.** Hash chain/RPC/role exist; direct service-role insert is not denied and function search path is unset.                                                       |
| Evidence vault is S3 Object Lock Compliance                           | **Verified in Terraform.** Deployment state still requires `terraform plan/apply` verification.                                                                           |
| Gateway always redacts PII before hosted egress                       | **Not verified.** Regex-only fallback, caller-controlled bypass, and no provider egress test.                                                                             |
| Data remains in `ap-south-1`                                          | **Not enforced.** Region and endpoint values are mutable configuration without an allowlist.                                                                              |

## Required remediation order

1. Fix internal-token/API-key aliases and make service authentication mandatory
   in production.
2. Implement atomic DB-backed approval-token consumption and bind the complete
   execution scope to the signed token.
3. Lock down kill-switch release and replace process-local tenant/global state.
4. Enforce model-gateway redaction and provider/region allowlists before live
   model dispatch.
5. Remove service-role keys from public Next.js workloads and route privileged
   operations through the BFF.
6. Harden the ledger function/privileges and add database privilege tests.
7. Align CI security claims with actual tools and make audit failures blocking.

## Phase 1 conclusion

Phase 1 review is complete as an audit deliverable, but Phase 1 acceptance is
**blocked** until the P1 findings are remediated and the targeted tests are
added. The next safe action is a remediation pass, followed by a rerun of this
report's traces before starting Phase 2.
