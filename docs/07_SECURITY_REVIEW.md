# Security Review — Axiom Proof

**Status:** Phase 0/1 release candidate
**Reviewer:** Founder + automated tooling
**Date:** August 2026
**Scope:** All in-repo code (apps/, services/, packages/, infra/) at the v0.1.0 build.

This document is the SDLC security review per the user's request. It
documents the security model, the controls in place, the threats
considered, and the gaps remaining for later phases.

---

## 1. Threat model

The product is a multi-tenant agentic compliance platform. The data
plane is sensitive (clients' personal data, controls assessments,
audit ledger, evidence vault). The control plane is also sensitive
(plans, approvals, execution tokens).

### 1.1 Adversary classes

| Class                                                     | Motivation                            | Capability                                    |
| --------------------------------------------------------- | ------------------------------------- | --------------------------------------------- |
| **External attacker**                                     | Data exfiltration, ransom, defacement | Network access, scripting, social engineering |
| **Malicious founder / employee**                          | Privilege abuse, financial gain       | Internal access, possibly root                |
| **Compromised agent** (prompt injection, model jailbreak) | Subvert compliance process            | LLM access                                    |
| **Compromised client** (a malicious tenant)               | Cross-tenant access, lateral movement | Tenant credentials                            |
| **Compromised LLM provider** (Anthropic, AWS)             | Data exfiltration                     | Sees redacted prompt + redacted response      |

### 1.2 Trust boundaries

- Internet ↔ Edge (CloudFront / ALB)
- Edge ↔ Vercel `bom1` (presentation) / EKS (data plane)
- EKS pod ↔ Supabase (Postgres, Auth, Storage)
- EKS pod ↔ AWS S3 (Object Lock bucket)
- EKS pod ↔ AWS ElastiCache (Valkey)
- EKS pod ↔ Temporal Cloud `ap-south-1`
- EKS pod ↔ Model Gateway (same cluster)
- Model Gateway ↔ Self-hosted vLLM (GPU node) / Bedrock Claude

The model gateway is the chokepoint for any egress of personal data
to a third-party model provider. Per Doc 05 §6, no major LLM vendor
guarantees India-only inference; redaction at the gateway is
load-bearing.

### 1.3 What we are NOT trying to defend against

- Nation-state actors with physical access to ap-south-1
- Compromise of the AWS account itself (mitigated by AWS-side controls)
- Bugs in the underlying Postgres, S3, or EKS implementations
- Side channels on the vLLM node (out of scope for Phase 0/1)

---

## 2. SDLC process

### 2.1 Code review

- **No commit is merged without at least one review.** This is
  enforced by GitHub branch protection rules (`.github/branch-protection.md`).
- **The approval engine, the audit ledger, and the model gateway
  redaction code use the same single-review policy as the rest of the
  repository.** Sensitive paths receive CODEOWNERS routing, but the
  repository does not enforce two different reviewers or a founder-plus-
  second-reviewer rule.
- **Prompts are versioned artifacts**, not free-form strings. A change
  to a prompt is a code change. It goes through the same review as
  application code and the new prompt version is hashed and recorded
  in the audit ledger on first use.

### 2.2 Dependency scanning

- **Dependabot** is enabled on all packages and services (see
  `.github/dependabot.yml`).
- **`pnpm audit`** is run in CI on every PR. High/critical
  vulnerabilities block merge.
- **Python `pip-audit`** runs in CI on every PR. Same block policy.
- **Trivy** scans container images on every push to `main` and
  blocks deployment on critical findings.

### 2.3 SAST

- **CodeQL** runs on every PR (TypeScript and Python).
- **Semgrep** runs the `p/security-audit` and `p/owasp-top-ten` rulesets
  on every PR.
- **Custom Semgrep rules** for the project (in
  `tests/security/semgrep-rules/`): "no-service-key-in-client-bundle",
  "no-bypass-of-approval-engine", "no-direct-insert-into-audit-ledger".

### 2.4 Secret scanning

- **gitleaks** runs in pre-commit and in CI. Any push containing a
  potential secret (Supabase service key, AWS access key, etc.)
  blocks the merge.
- All secrets are stored in **AWS Secrets Manager** and accessed
  from EKS pods via **IRSA** (IAM Roles for Service Accounts).
  No secret is ever in a `.env` file in git, ever.

### 2.5 Infrastructure as Code review

- **Terraform plan output** is reviewed on every PR that touches
  `infra/terraform/**`.
- **Helm chart changes** go through the same review as application
  code.

---

## 3. Security controls inventory

### 3.1 Authentication

- **Supabase Auth** with email + password.
- **MFA required** for any user with the `approver` role. Enforced
  in the BFF middleware (in `services/bff/src/middleware/auth.ts`
  Phase 2 follow-up; Phase 0/1 requires MFA at the Supabase level
  via the dashboard).
- **SSO/SAML** is Phase 5; not in Phase 0/1.

### 3.2 Authorization (RBAC + tenant isolation)

- **Row-Level Security (RLS)** at the database level. Every table
  that holds tenant data has RLS enabled with policies keyed on
  `tenant_id`. The application never relies on app-layer filtering
  alone — this is **ADR-8** and is enforced architecturally.
- **Roles:** owner, admin, approver, reviewer, viewer, agent, partner,
  founder. Only `approver` and above can issue approval tokens
  (enforced in `services/bff/src/routes/v1.ts`).
- **Cross-tenant access** is impossible via the user-scoped client.
  Service-role keys are server-side only.

### 3.3 Approval engine (the trust gate)

- **HMAC-SHA-256** signed, scope-bound approval tokens.
- **Per-tenant signing keys** stored in AWS Secrets Manager.
- **Per-action validation**: the BFF validates the token for EACH
  action in a batch, not just once at the start. An action whose
  ID is not in the token's `actionIds` is skipped, not executed.
- **Nonces** prevent replay attacks.
- **Expiry** is enforced.
- **Approval cannot be issued for an action without a completed
  dry-run and a validated rollback** — this is **BR-2** and is
  enforced in the BFF.
- **The planning agent (Sudhaar) holds no write credentials** —
  **ADR-3** is enforced at the runtime level (`can_mutate: false`
  on the Sudhaar agent class).

### 3.4 Audit ledger

- **Append-only**: enforced at the database role level
  (`ledger_writer` role in `0006_ledger_role_and_extras.sql`). The
  `public` role has no INSERT permission.
- **Hash-chained**: each entry's hash includes the previous entry's
  hash. A break in the chain is detectable (the `verify_ledger()`
  function in `0005_approvals_ledger.sql`).
- **Tenant-scoped** monotonic sequence: each tenant has its own
  per-tenant counter.
- **Every mutating action carries an `approval_token_id`**: this
  is the audit link from the action back to the human approval.

### 3.5 Evidence vault

- **AWS S3 with Object Lock Compliance mode** in `ap-south-1`. Per
  Doc 05 §5 and Doc 06 §4, this is the substrate of "verifiable
  proof."
- **Content-addressed**: the S3 key is derived from the SHA-256 of
  the content. Duplicate content is deduplicated.
- **Per-artifact retention**: the WORM lock duration is set per
  object (typically 7 years for consent records).
- **Default-deny** IAM: an explicit `Deny` for `s3:DeleteObject` and
  `s3:DeleteObjectVersion` is in the policy (see
  `infra/terraform/envs/prod/s3.tf`).
- **Plain S3 API only** — no AWS-proprietary conveniences like
  S3 Select or Macie integration for this bucket, so a future
  MinIO or GCS-interop move is mechanical.

### 3.6 PII redaction

- **Always-on redaction at the model gateway** for any
  `pii_redact=True` request.
- **DPDPA-specific patterns** (Aadhaar, PAN, IFSC, UPI, Indian phone)
  are matched with high-precision regex. Names, addresses, etc. are
  handled by Presidio (Microsoft) when available.
- **Originals are hashed** (SHA-256) for ledger reproducibility;
  values themselves never leave the agent runtime for hosted models.
- **Structural / classification tasks** route to a self-hosted
  vLLM on the EKS GPU node, so the values never leave the cluster.

### 3.7 Network isolation

- **Default-deny NetworkPolicies** in the axiom-proof namespace
  (see `infra/helm/axiom-proof/templates/network-policies.yaml`).
- **TLS 1.3 minimum** at the edge.
- **mTLS** between the BFF and the agent runtime is Phase 3 (the
  internal-token check is Phase 0/1).

### 3.8 Logging and observability

- **Structured JSON logs** in every service. No PII in logs (enforced
  by a custom log filter; the canonicaliser hashes PII fields at
  emit time).
- **OpenTelemetry traces** span the entire request lifecycle, with
  the correlation ID propagated to the audit ledger.
- **The audit ledger itself** is the ground-truth record of every
  action; the logs are derived.

### 3.9 Backup and DR

- **RPO ≤ 1 hour, RTO ≤ 4 hours** (NFR-9). The audit ledger and
  evidence vault are replicated cross-AZ within `ap-south-1`.
- **PITR** enabled on Supabase (7-day retention in production).
- **S3 versioning + lifecycle** for the evidence vault; transitions
  to IA at 90 days, Glacier at 365 days.

---

## 4. Security testing

### 4.1 Unit tests

- `packages/approval-engine/src/index.test.ts` — token issue/verify,
  signature tampering, expiry, nonce replay, per-tenant secrets.
- `packages/ledger/src/canonicalise.test.ts` — canonical JSON
  determinism (key-sorted), SHA-256 vector check.
- `services/agent-runtime/tests/test_approval_engine.py` — Python
  mirror; verifies cross-language compatibility of signatures.
- `services/agent-runtime/tests/test_sudhaar.py` — separation-of-duties
  assertion: `SudhaarAgent.can_mutate is False`; every action has
  a rollback plan.
- `services/agent-runtime/tests/test_karya.py` — Karya refuses to
  run without a valid approval token.
- `services/agent-runtime/tests/test_pii_redactor.py` — redaction
  tests for PAN, Aadhaar, email, phone, IP, dict recursion.
- `services/model-gateway/tests/test_redaction.py` — gateway-level
  redaction.
- `services/model-gateway/tests/test_router.py` — route decisions
  for structural / reasoning / explicit-override cases.

### 4.2 Integration tests

- `tests/e2e/tests/approval-console.spec.ts` — the most
  security-critical UI surface. Verifies that the kill switch is
  visible, the dry-run / rollback / blast-radius cards render, and
  the non-negotiable rules are surfaced on the public site.
- `tests/e2e/tests/security.spec.ts` — security headers are applied
  on every page (X-Frame-Options, X-Content-Type-Options, etc.).

### 4.3 OWASP Top 10 coverage

| OWASP category                  | Mitigation                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 — Broken Access Control     | RLS at the DB level; per-action token validation; BFF middleware that refuses tenant cross-access                                                     |
| A02 — Cryptographic Failures    | TLS 1.3 in transit; AES-256 at rest via S3 SSE-KMS; SHA-256 chain; HMAC-SHA-256 tokens                                                                |
| A03 — Injection                 | Supabase client uses parameterised queries; pgcrypto + RLS prevent SQL injection; LLM prompts are versioned and reviewed                              |
| A04 — Insecure Design           | The non-negotiable safety rules (BR-1 through BR-6) are enforced architecturally, not by convention                                                   |
| A05 — Security Misconfiguration | NetworkPolicies default-deny; non-root containers; read-only root FS; seccomp default; STRICT_TRANS securityContext                                   |
| A06 — Vulnerable Components     | Dependabot, pip-audit, Trivy in CI; high/critical block merge                                                                                         |
| A07 — Identity & Auth Failures  | Supabase Auth with MFA for approvers; session cookies httpOnly + sameSite=strict                                                                      |
| A08 — Software & Data Integrity | All images built from a controlled Dockerfile; signed (cosign Phase 2); pnpm lockfile + uv lock committed                                             |
| A09 — Logging Failures          | Every action is in the audit ledger; structured JSON logs; OTel traces                                                                                |
| A10 — SSRF                      | The BFF makes outbound calls only to a known allowlist (Supabase, S3, Temporal, Model Gateway, LLM providers); per-host egress rules in NetworkPolicy |

---

## 5. Known gaps and roadmap

| Gap                                                                     | Phase | Notes                                                                                   |
| ----------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------- |
| mTLS between BFF and agent runtime                                      | 3     | Currently using internal-token; mTLS via SPIFFE is the proper fix                       |
| Per-tenant approval signing keys (currently shared default)             | 2     | Doc 06 §1 has the trigger: "client contractually requires 100%-in-house infrastructure" |
| SOC 2 Type 2 / ISO 27001                                                | 5     | Revenue-triggered per Doc 02 §5                                                         |
| Customer-managed encryption keys (CMEK) for the audit ledger            | 4     | Currently we own the keys; enterprise customers want their own                          |
| Per-action RBAC (e.g. "approver Alice can only approve policy.publish") | 4     | `tenant_users.approval_scopes` exists in the schema but the BFF doesn't enforce it yet  |
| Penetration test by an external firm                                    | 3     | Before Phase 3 (Karya) goes live with real client data                                  |
| Bug-bounty program                                                      | 4     | After Phase 3 stabilises                                                                |

---

## 6. Incident response

### 6.1 Detection

- The audit ledger is the source of truth for "what did agents do."
- Every action that has a result of `failure` or `rolled_back`
  triggers a PagerDuty alert (Phase 2+).
- The kill switch (per BFF) is the global halt. It writes a
  `execution.kill_switch.engaged` entry to the audit ledger with
  the reason.

### 6.2 Response procedure

1. **Engage the kill switch** from the Approval Console (any plan
   page → "Engage kill switch"). This halts ALL in-flight execution
   immediately, globally.
2. **Read the audit ledger** for the failing correlation ID. The
   full chain (finding → plan → dry-run → approval → execution →
   verification) is reconstructable.
3. **Revert or supersede** depending on the failure mode.
4. **Resume** by either releasing the kill switch (founder only)
   or by re-running the workflow from the last good state.

### 6.3 Contact

For security incidents, contact security@axiomminds.ai. The
founder is the primary on-call; in the future, a 24×7 SOC partner.
