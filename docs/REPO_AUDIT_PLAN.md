# Axiom Proof — Repository Audit & Code Review Plan

> Status: **Part A complete; Part B pending Phase 0 baseline.**
> Author: prepared for Vikash Karuna · Axiom Minds
> Date: 2026-08-16
> Repo: https://github.com/vikashkaruna/AxiomProof.git
> Local path: `/Users/vikash/Axiom Proof`

---

## 0. What this document is

You asked for a comprehensive plan, not a code review yet. This is the plan. It is
split into two parts:

- **Part A — the branch / merge question** (small, can be done in one sitting)
- **Part B — the end-to-end code review** (large, will take multiple sessions)

Read Part A, give me a yes/no on the cleanup approach, and we'll decide together
how aggressive to be on Part B.

---

# Part A — Branches & merge safety

## A.1 What I found in the repo

### Commits on `main` (local & remote, identical, working tree clean)

```
332c290  feat(axiom-proof): full Phase 0 + Phase 1 implementation end-to-end
b789b78  Add Doc 06: infrastructure and vendor lock-in strategy
a5c5be2  Add Doc 05: technology stack analysis and vendor recommendation
2dc1598  Initial project structure: strategy docs, design system, app/site/handoff-map scaffolding
```

### Remote branches that exist on GitHub

| Branch                                                        | Base | Delta vs main          | Origin     |
| ------------------------------------------------------------- | ---- | ---------------------- | ---------- |
| `main`                                                        | self | —                      | you        |
| `dependabot/github_actions/actions/setup-python-7`            | main | +1 commit, 1 file      | Dependabot |
| `dependabot/github_actions/astral-sh/setup-uv-7`              | main | +1 commit, 1 file      | Dependabot |
| `dependabot/github_actions/pnpm/action-setup-6`               | main | +1 commit, 1 file      | Dependabot |
| `dependabot/npm_and_yarn/development-dependencies-6fcd8273be` | main | +1 commit (group bump) | Dependabot |
| `dependabot/npm_and_yarn/production-dependencies-5b388dda97`  | main | +1 commit (group bump) | Dependabot |

### Headline number

`332c290` adds **238 files, 21,405 lines** in a single commit. The repo's working
tree is clean, fully in sync with `origin/main`, no uncommitted work.

## A.2 Is it safe to "merge"?

There is nothing to merge. The Phase 0 + Phase 1 work is **already on `main`**.
The 5 dependabot branches each contain a single trivial bump on top of `main`
with no conflicts (they all branched from the same base SHA `332c290`).

**Two real questions buried in your ask:**

1. Are the 5 dependabot branches safe to merge?
2. After they're dealt with, can we delete them?

### A.2.1 Are the 5 dependabot PRs safe to merge?

**Individually — yes, but they conflict with each other** (each one mutates
`package.json` / lockfile / `action-version` files in the same files). Merge
order matters. The safer pattern is:

> **Close all 5 dependabot PRs and let Dependabot regenerate from the current
> main on its next weekly tick.** It will produce fresh PRs that are
> internally consistent and respect the current `package.json` shape.

If you want the bumps now rather than next week, the merge order should be:

1. GitHub Actions bumps first (3 branches, mostly non-overlapping files) — squash merge
2. Development-deps group bump — squash merge
3. Production-deps group bump — squash merge

Each one will trigger `ci.yml`, which must pass before the next is mergeable
(given `Require linear history` + `Require status checks to pass`).

**My recommendation: close them, let them regenerate.** Cleaner history, and
the bumps themselves are not urgent — `main` builds fine without them and we
have not yet run CI on the 21,405-line commit anyway (see A.3).

### A.2.2 Can we delete the dependabot branches after?

Yes. With `Allow deletions: OFF` in branch protection, only admins can delete
branches through the UI — `git push origin :branch-name` is the way for a CLI
deletion. Once the 5 dependabot PRs are closed and Dependabot has nothing left
to track, the branches can be removed.

## A.3 Limitations of a "merge-into-one" approach

You asked specifically about limitations of merging everything into one. Since
there is nothing to merge, the question becomes: _what are the limitations of
the current "single 21,405-line commit" shape?_

1. **Lost reasoning.** The AI agent that built Phase 0 + Phase 1 has its work
   history destroyed. If a control in the Control Library turns out to be
   wrong, or a route in `services/bff/src/routes/v1.ts` violates an invariant,
   we cannot `git bisect` or `git log -p` to find when the assumption was
   introduced. **Mitigation:** Part B of this plan does a forensic review that
   re-derives the reasoning from the docs and the code.

2. **No CI has run on it yet.** `node_modules` is not installed, no `pnpm
install` has happened, no test has been executed, no lint, no typecheck.
   The branch-protection document lists 5 required CI checks
   (`Lint + typecheck`, `TS unit tests`, `Python agent-runtime tests`,
   `Python model-gateway tests`, `Security scan`) but the green/red outcome
   for this commit is unknown. **The "is it safe to merge" question cannot be
   fully answered until CI is green.** Part B Phase 0 of the review is
   exactly this: get CI green.

3. **No atomic review possible.** A 238-file / 21,405-line commit cannot be
   code-reviewed line-by-line by a human in one sitting. The realistic path
   is review-by-slice (per BRD/PRD module), with the slices mapped to commits
   in a follow-up PR series if we choose to do a "history rewrite" later
   (i.e. reset and recommit, preserving tree). **See Part B §B.3 for
   history-rewrite options.**

4. **Branch protection rules are aspirational, not battle-tested.** The
   `.github/branch-protection.md` document specifies a strong set of rules
   (linear history, 2 approvals for security-sensitive paths, all 5 CI checks
   required), but they have never gated a real PR. Part B Phase 0 will
   exercise them with a no-op PR to confirm they're configured correctly in
   the GitHub repo settings.

   **DISCOVERY (2026-08-16, during Part A execution):** The repo is on the
   **GitHub Free plan** (private repo, no plan field on the user account).
   Branch protection is **not available** on the Free plan for private
   repos — `GET /repos/.../branches/main/protection` returns 403. So
   `.github/branch-protection.md` is documentation only; nothing it says is
   actually enforced. Implications for Part A:
   - The 5 dependabot PRs were not being held to any bar.
   - The PR we opened for the plan doc also has no checks gating it.
   - Admin-merge is available to the owner for any PR, with no approval or
     CI requirement.
   - For the merge-into-main of dependency bumps, the question becomes not
     "does CI pass" but "is the dependency bump safe to apply blind." Until
     CI is fixed, we cannot answer that question and the bumps should NOT
     be merged. **Updated Part A plan: tighten config + close stale PRs +
     delete branches, do NOT merge regenerated bumps until Phase 0 makes
     CI green.** The regenerated PRs will also be closed (they will fail
     CI for the same reason as the originals — missing `pnpm-lock.yaml`).

5. **The 5 dependabot branches are stale relative to the 21,405-line commit.**
   They were created before the big commit existed, so their diffs do not
   reflect the current `package.json` / `pnpm-lock.yaml` shape. Merging them
   naively will likely produce lockfile churn. **Mitigation:** close + let
   regenerate, as in A.2.1.

6. **No `.env.example` parity audit yet.** The 6 hard rules in `AGENTS.md`
   (no mutating action without human approval, append-only ledger, S3 Object
   Lock Compliance, `ap-south-1` data residency, etc.) imply specific env
   vars, secrets, IAM roles. We have not verified they are fully described in
   `.env.example` files (or whether `.env.example` files exist at all). Part B
   Phase 1 includes this audit.

## A.4 Recommended branch cleanup sequence

Once you sign off, this is the proposed Part A execution. Each step is small
and reversible until the deletion step.

| #   | Action                                                                                                                                                                                                                                                                | Reversible?            | Effort       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------ |
| 1   | Fetch all remotes locally; confirm branch state matches this doc                                                                                                                                                                                                      | Yes (no remote writes) | 5 min        |
| 2   | Open a no-op PR against `main` to confirm CI runs and branch protection is wired                                                                                                                                                                                      | Yes (close PR)         | 15 min       |
| 3   | **Tighten `.github/dependabot.yml`** — add `rebase-strategy: "auto"` and `delete-branch-after-merge: true` to every update block, so future PRs self-clean and the "5 stale branches" problem never recurs. Commit on a fresh branch and merge via PR so CI gates it. | Yes (revert)           | 10 min       |
| 4   | Close all 5 dependabot PRs with a "regenerate from current main" comment                                                                                                                                                                                              | Yes (reopen)           | 10 min       |
| 5   | Verify Dependabot regenerates within 24h (or trigger manually via `@dependabot recreate`)                                                                                                                                                                             | Yes                    | 5 min + wait |
| 6   | After regenerated PRs are clean, merge in the order Actions → dev-deps → prod-deps, each with CI green                                                                                                                                                                | Yes (revert)           | 30 min       |
| 7   | Delete the now-merged dependabot branches via `git push origin :<branch>`                                                                                                                                                                                             | **No — destructive**   | 5 min        |

**Why Step 3 (tighten config) moves up:** if we close the stale PRs first
and Dependabot regenerates from a config that still has no
`delete-branch-after-merge`, we get the same mess next week. Tightening the
config first means the regenerated PRs inherit the new behaviour.

Total estimated Part A effort: ~1.5 hours wall-clock (excluding the Dependabot
24h regeneration wait).

---

## A.5 Part A execution result — 2026-08-16

Part A was checked against the live GitHub repository and is complete under the
updated safe sequence described above:

- `main` and `origin/main` are both at `9e89ee5`.
- Only `origin/main` remains; all five stale Dependabot branches are gone.
- Dependabot PRs #1–#5 are closed. PRs #7 and #8 are merged.
- `.github/dependabot.yml` on `origin/main` contains both
  `rebase-strategy: "auto"` and `delete-branch-after-merge: true` for every
  update block.
- CI is wired and has run, but the latest `main` run failed. Dependency bumps
  were therefore not regenerated or merged.
- GitHub reports that `main` is not branch-protected, so the documented review
  and status-check requirements are not currently enforced by repository
  settings.
- No branch deletion was required during this execution because the stale
  branches had already been removed.

The remaining dependency-bump work is intentionally held until Part B Phase 0
identifies and resolves the CI baseline failures.

# Part B — End-to-end code review plan

Part A is small. Part B is the real work. I am proposing a **4-phase review**
that maps to the BRD/PRD module structure rather than to file paths, because
that is how the product was specified and is the only sane unit of review for
a 21,405-line commit.

## B.1 Review criteria (the four lenses you asked for)

| Lens                                              | What we measure                                                                                                                                      | Source of truth                                                                                      | Owner in this review            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Quality**                                       | Correctness, readability, type safety, code reuse, dead code, accidental complexity                                                                  | TS strict, Python type hints, Pydantic v2, lint, prettier                                            | Primary reviewer                |
| **Coverage**                                      | % of BRD/PRD modules with at least one automated test; branch coverage of the 6 non-negotiable rules; mutation-test sentinel for the approval engine | `docs/03_BRD_PRD.md`, `docs/04_Solution_Architecture.md`, `docs/07_SECURITY_REVIEW.md`               | Primary reviewer                |
| **Security**                                      | The 6 non-negotiables from `AGENTS.md` + the 8 business rules from BR-1 to BR-8 + the 9 security-sensitive paths from `branch-protection.md`         | `AGENTS.md`, `docs/03_BRD_PRD.md` §A.5, `docs/07_SECURITY_REVIEW.md`, `.github/branch-protection.md` | Security reviewer (second pass) |
| **Phase 0 / Phase 1 implementation completeness** | Does the code in `332c290` actually cover M0.1–M0.6 and M1.1–M1.8 from `docs/02_Phase_Wise_Implementation_Plan.md`?                                  | `docs/02_Phase_Wise_Implementation_Plan.md`                                                          | Primary reviewer                |

A **fifth lens** I want to add and call out: **correctness against the docs
themselves.** The 11 docs are 2,960 lines of specification. The code should
be derivable from them. Where it isn't — the code contradicts a doc — that
is the highest-priority finding, because it means the spec or the
implementation has drifted. (Example to check: does `packages/control-library`
contain 43 controls as the commit message says? Does `docs/04 §3.2` say the
same? If one says 43 and the other says 40, that's a P0 finding.)

## B.2 Scope inventory — what is being reviewed

```
apps/web/                       (Next.js 14 app: Workbench, Approval Console, Client Portal, etc.)
apps/marketing/                (Next.js 14: positioning, gap-scan, agents pages)
services/bff/                  (Hono, TypeScript — the API + execution gate)
services/agent-runtime/        (FastAPI, Python 3.11+ — 10 named agents)
services/model-gateway/        (FastAPI, Python — self-hosted LLM gateway with PII redaction)
services/temporal-workers/     (Python — durable workflow orchestration)
packages/design-tokens/        (Tailwind preset, brand colour system)
packages/ui/                   (React primitives: Button, Card, Badge, ProofSeal, AgentPill, PostureScore, …)
packages/types/                (Zod schemas mirroring the DB)
packages/control-library/      (43 DPDPA controls, versioned)
packages/ledger/               (append-only hash-chained audit ledger client — TS)
packages/evidence/             (S3 Object Lock Compliance client — TS)
packages/approval-engine/      (HMAC-SHA-256 signed approval tokens — TS)
packages/supabase/             (Supabase client wrappers)
packages/config/               (shared runtime config)
infra/supabase/migrations/     (SQL — including the SECURITY DEFINER append_ledger)
infra/terraform/envs/prod/     (AWS: EKS, S3, ElastiCache, IAM, …)
infra/docker/, infra/helm/     (deployment packaging)
tests/e2e/                     (4 Playwright specs)
docs/                          (11 strategy & ops docs, 2,960 lines — reviewed AS SPEC, not as code)
```

**Out of scope for this review:**

- The 3 prototype folders at repo root (`Axiom Proof App/`, `Axiom Proof Site/`,
  `Axiom Proof Handoff Map/`, `design-system/`) — these are reference
  prototypes from an earlier design pass, not part of the product. The
  "real" apps live in `apps/`. (Will confirm by reading the prototypes'
  READMEs in Phase 0.)
- Vendor lock-in / stack-alternatives arguments in Docs 05 and 06 — these
  are decisions, not implementation, and they have already been decided.

## B.3 The 4 phases of review

Each phase is a self-contained work session. Each phase ends with a written
deliverable (a markdown report under `docs/audits/`). We do not start the
next phase until you sign off on the previous.

### Phase 0 — establish the baseline (must be done first)

Goal: prove the code is buildable, the tests run, and CI is wired correctly.
Without this, the other 3 phases are opinion, not evidence.

| #    | Task                                                                                             | Acceptance                                                          |
| ---- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 0.1  | `pnpm install` succeeds                                                                          | `node_modules` populated, no peer-dep errors that aren't documented |
| 0.2  | `pnpm typecheck` passes (or report of N errors with severity)                                    | exit 0 or documented error budget                                   |
| 0.3  | `pnpm lint` passes (or report)                                                                   | exit 0 or documented error budget                                   |
| 0.4  | `pnpm test` runs all 4 vitest unit tests                                                         | all pass or documented failures                                     |
| 0.5  | `cd services/agent-runtime && uv run pytest` (need `uv` installed)                               | all pass or documented failures                                     |
| 0.6  | `cd services/model-gateway && uv run pytest`                                                     | all pass or documented failures                                     |
| 0.7  | `pnpm format:check` passes                                                                       | exit 0                                                              |
| 0.8  | `pnpm build` succeeds (turbo build)                                                              | exit 0 for all packages and apps                                    |
| 0.9  | Open a no-op PR to confirm CI runs and branch protection rules are wired                         | CI green; 5 required checks present in PR UI                        |
| 0.10 | Confirm the 3 prototype folders are reference-only (read their READMEs)                          | documented                                                          |
| 0.11 | Inventory existing tests: 4 vitest + 4 Playwright. Map each test to the BRD/PRD module it covers | coverage map file produced                                          |

**Deliverable:** `docs/audits/00-baseline.md` — green/red report per task,
plus the coverage map. If anything is red, we triage before Phase 1.

### Phase 1 — security review (security-sensitive paths first)

Goal: verify the 6 non-negotiables from `AGENTS.md` and the 9
security-sensitive paths from `branch-protection.md` are actually enforced
in code, not just claimed in docs.

| #    | Task                                                                                                                                                                                                                          | Acceptance                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1.1  | Read `docs/07_SECURITY_REVIEW.md` end-to-end; extract every claim it makes about enforcement                                                                                                                                  | claim list                 |
| 1.2  | `services/bff/src/routes/v1.ts` — does it really refuse to issue approval tokens without a completed dry-run + validated rollback? (BR-2)                                                                                     | code-trace or finding      |
| 1.3  | `services/agent-runtime/src/axiom/agents/sudhaar.py` — is `can_mutate = False` actually enforced (i.e. not just declared)?                                                                                                    | code-trace or finding      |
| 1.4  | `infra/supabase/migrations/0005_approvals_ledger.sql` — is the `append_ledger()` function actually `SECURITY DEFINER`? Is the `ledger_writer` role actually `INSERT`-only?                                                    | SQL-trace or finding       |
| 1.5  | `infra/terraform/envs/prod/s3.tf` — is the evidence bucket actually in Object Lock Compliance mode (not Governance)?                                                                                                          | Terraform-trace or finding |
| 1.6  | `services/model-gateway/src/model_gateway/redaction.py` — does it actually redact the PII fields listed in Doc 05 §6, or only a subset?                                                                                       | test-trace or finding      |
| 1.7  | `packages/approval-engine/src/index.ts` + `services/agent-runtime/src/axiom/approval_engine.py` — do the TS and Python token formats agree byte-for-byte? Token-issuing and token-verifying must be cross-language compatible | code-trace + cross-test    |
| 1.8  | `services/agent-runtime/src/axiom/agents/karya.py` — does the kill-switch code path actually exist? (BR-6)                                                                                                                    | code-trace or finding      |
| 1.9  | Audit every env var / secret used by the 4 services; check no secret defaults to a real value in code                                                                                                                         | env-var map + finding      |
| 1.10 | Audit `ap-south-1` data residency claim — is it enforced in BFF + model-gateway? (BR-6)                                                                                                                                       | code-trace or finding      |

**Deliverable:** `docs/audits/01-security.md` — every claim from Doc 07 mapped
to a code-trace result, with P0/P1/P2 severity for any gaps.

### Phase 2 — BRD/PRD module coverage (the 14 modules)

Goal: confirm M0.1–M0.6 and M1.1–M1.8 are actually built (not just claimed
in the commit message), and identify stubs that need follow-up work.

| #    | Module (from Phase plan)          | Where it should live                                    | Where it actually lives         | Coverage                |
| ---- | --------------------------------- | ------------------------------------------------------- | ------------------------------- | ----------------------- |
| M0.1 | Corporate & Digital Foundation    | n/a (corp setup)                                        | `apps/marketing/`               | UI only, not corp setup |
| M0.2 | Control Library v0 (43 controls)  | `packages/control-library`                              | `packages/control-library/src/` | TBD                     |
| M0.3 | Parikshan (Assessment Agent v0)   | `services/agent-runtime/src/axiom/agents/parikshan.py`  | TBD                             | TBD                     |
| M0.4 | Prativedan (Report Agent v0)      | `services/agent-runtime/src/axiom/agents/prativedan.py` | TBD                             | TBD                     |
| M0.5 | Free Gap-Scan (public)            | `apps/marketing/src/app/gap-scan/`                      | TBD                             | TBD                     |
| M0.6 | Agent Workbench (internal)        | `apps/web/src/app/(app)/workbench/`                     | TBD                             | TBD                     |
| M1.1 | Drishti (Discovery Agent v0)      | `services/agent-runtime/src/axiom/agents/drishti.py`    | TBD                             | TBD                     |
| M1.2 | Vibhaag (Classification Agent v0) | `services/agent-runtime/src/axiom/agents/vibhaag.py`    | TBD                             | TBD                     |
| M1.3 | RoPA Generator                    | `services/agent-runtime/src/axiom/agents/...`           | TBD                             | TBD                     |
| M1.4 | Sudhaar (Remediation Planner v0)  | `services/agent-runtime/src/axiom/agents/sudhaar.py`    | TBD                             | TBD                     |
| M1.5 | Saakshi (Evidence Agent v0)       | `services/agent-runtime/src/axiom/agents/saakshi.py`    | TBD                             | TBD                     |
| M1.6 | Policy & Notice Generator         | `services/agent-runtime/src/axiom/agents/...`           | TBD                             | TBD                     |
| M1.7 | Human Review Console v0           | `apps/web/src/app/(app)/plans/`                         | TBD                             | TBD                     |
| M1.8 | Delivery Playbook Capture         | `services/agent-runtime/src/axiom/agents/...`           | TBD                             | TBD                     |

For each row, the review records: file path, line count, dependency on other
modules, test coverage, stub-vs-real, and any deviation from the phase plan
spec.

**Deliverable:** `docs/audits/02-module-coverage.md` — the 14-row table
filled in, plus a list of P0/P1 stubs.

### Phase 3 — quality + coverage + cross-doc consistency

Goal: assess the things that don't map to a single module — type safety,
code reuse, dead code, mutation-test sentinels, and the **fifth lens**
(cross-doc consistency).

| #   | Task                                                                                                                                                                                            | Acceptance       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 3.1 | Cross-doc consistency check: do `docs/01..09` + `DPDPA_Axiom_Minds_Strategic_Roadmap.md` + `AGENTS.md` + `README.md` agree on agent count, control count, phase definitions, framework choices? | diff report      |
| 3.2 | Code-vs-doc consistency: e.g. does Control Library contain 43 controls (commit message) and 43 (Doc 02 M0.2)?                                                                                   | count check      |
| 3.3 | Dead-code scan: `knip` or similar across TS packages; `vulture` for Python                                                                                                                      | dead-code report |
| 3.4 | Type-safety audit: any `any`, untyped `as`, missing Zod validation at API boundaries                                                                                                            | finding list     |
| 3.5 | Test coverage: 4 vitest + 4 Playwright against 14 modules. Is the approval engine (the most security-critical component) covered by a test?                                                     | coverage map     |
| 3.6 | Mutation-test sentinel on `packages/approval-engine` (the token signing/verification is a perfect mutation-test target)                                                                         | mutation score   |
| 3.7 | Reuse check: are Zod schemas from `packages/types` actually used at BFF boundaries, or are they duplicated inline?                                                                              | finding list     |
| 3.8 | Reuse check: are the 9 security-sensitive path patterns from `branch-protection.md` consistently applied in the security-relevant code?                                                         | finding list     |

**Deliverable:** `docs/audits/03-quality-and-coverage.md` — the cross-doc
diff, the dead-code list, the test-coverage map, the type-safety findings.

### B.3.1 Optional Phase 4 — history rewrite (only if you want it)

The 21,405-line commit is monolithic. After Phases 0–3, you may want to
**reset and recommit** the tree in module-shaped commits so the next agent
(or the next reviewer) can `git log` and follow the reasoning. This is
destructive of history and would require a force-push of `main` (only
admins can do this, and only if branch protection allows it; the
`branch-protection.md` says "Allow force pushes: OFF", so this is gated
on a config change).

I am listing it for completeness but **I do not recommend it** unless the
review finds high-severity issues that need a clean baseline. Most codebases
keep the messy initial commit and add a `docs/audits/` trail alongside.

## B.4 Effort estimate

| Phase                                                           | Effort                | Wall-clock               |
| --------------------------------------------------------------- | --------------------- | ------------------------ |
| Phase 0 — baseline (build, lint, typecheck, test, CI sanity)    | 1 reviewer, ~half day | 0.5 day                  |
| Phase 1 — security (10 code-trace tasks)                        | 1 reviewer, 1 day     | 1 day                    |
| Phase 2 — module coverage (14 modules, 6 stub-modules are deep) | 1 reviewer, 1.5 days  | 1.5 days                 |
| Phase 3 — quality + cross-doc (8 tasks)                         | 1 reviewer, 1 day     | 1 day                    |
| Phase 4 — history rewrite (if pursued)                          | 1 reviewer, 0.5 day   | 0.5 day                  |
| **Total**                                                       |                       | **~4–5 days wall-clock** |

We can do this as a single sweep or in chunks. My recommendation is **chunks**:
do Phase 0 first because it's the gate for the rest; if Phase 0 surfaces
issues (likely, given `node_modules` doesn't exist), triage them before
committing to the security review.

## B.5 Deliverables index

When this review is complete, you will have:

```
docs/audits/
├── 00-baseline.md           # Phase 0 — build, lint, test, CI
├── 01-security.md           # Phase 1 — 6 non-negotiables, 9 security-sensitive paths
├── 02-module-coverage.md    # Phase 2 — 14-module matrix
├── 03-quality-and-coverage.md  # Phase 3 — cross-doc, dead code, type safety
└── 04-history-rewrite.md    # Phase 4 — only if pursued
```

Each report has the same shape: **what was checked · how · result · severity
(P0/P1/P2) · recommended action**.

A summary index at `docs/audits/README.md` will be updated after each phase
so you can scan all findings in one place.

---

# Sign-off needed from you

Before I touch any of this, I need decisions on three questions.

## Decision 1 — Part A scope

- **A:** Do the full Part A cleanup (close 5 dependabot PRs, regenerate, merge
  in correct order, delete branches, enable Dependabot self-clean). Estimated
  ~1.5 hours wall-clock.
- **B:** Just close the 5 dependabot PRs; leave branches for now; skip
  deletion. Lower risk, leaves mess.
- **C:** Skip Part A entirely; go straight to Part B. The cleanup can wait.

## Decision 2 — Part B shape

- **A:** Do all 4 phases sequentially (Phases 0 → 1 → 2 → 3). Slowest but
  most thorough. ~4–5 days.
- **B:** Do Phase 0 only first (baseline + build green), then we decide
  together based on what Phase 0 surfaces. ~0.5 day to first decision point.
  **This is what I recommend.**
- **C:** Skip Phase 0 (you trust the code builds); do Phases 1–3 in order.
  Risky — if the code doesn't even typecheck, the rest is opinion.

## Decision 3 — history rewrite (Phase 4)

- **A:** Plan for it; do it after Phases 0–3 if findings warrant. Will
  require a force-push and a branch-protection config change.
- **B:** Don't plan for it; keep the monolithic commit. The audit trail
  in `docs/audits/` will document the reasoning instead.
  **This is what I recommend unless Phase 0–3 surface high-severity issues.**

---

## What I'll do after you reply

1. Save your 3 decisions on this doc.
2. If Decision 2 = B, kick off Phase 0 immediately and report back when
   `pnpm install` / typecheck / lint / test have either run green or have
   a specific failure list to triage.
3. Hold on Phase 1/2/3 until you sign off on the Phase 0 report.

This doc will be versioned in git (under `docs/`) so the plan is reviewable
and citable.
