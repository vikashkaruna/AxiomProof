# Axiom Proof — GCP Preprod Environment Configuration Checklist

**Audience:** Single-operator deployment (Vikash). Pair this with
[`GCP_PREPROD_DEPLOYMENT_GUIDE.md`](./GCP_PREPROD_DEPLOYMENT_GUIDE.md) which describes the
happy-path launch. **This document covers what is currently placeholder, what is missing, and the
exact steps to wire it up so the environment is 100% functional.**

---

## 0. State of the World (verified 2026-09-15)

The Terraform plan has already been applied. The following resources exist live in `asia-south1`:

| Resource                                    | Live value                                                                  | Status                     |
| ------------------------------------------- | --------------------------------------------------------------------------- | -------------------------- |
| `axiom-bff-preprod`                         | `https://axiom-bff-preprod-188516662106.asia-south1.run.app`                | ✅ 200 OK on `/health`     |
| `axiom-web-preprod`                         | `https://axiom-web-preprod-188516662106.asia-south1.run.app`                | ✅ 200 OK on `/api/health` |
| `axiom-marketing-preprod`                   | `https://axiom-marketing-preprod-188516662106.asia-south1.run.app`          | ✅ 200 OK on `/api/health` |
| Marketing Firebase site                     | `https://axiom-proof.web.app`                                               | ✅ 200 OK                  |
| `axiom-agent-runtime-preprod`               | (Cloud Run internal — ingress `INGRESS_TRAFFIC_ALL` but requires token)     | ⚠️ 403 (expected)          |
| `axiom-model-gateway-preprod`               | (Cloud Run internal — ingress `INGRESS_TRAFFIC_ALL` but requires token)     | ⚠️ 403 (expected)          |
| `axiom-temporal-worker-preprod`             | Ingress `INGRESS_TRAFFIC_INTERNAL_ONLY` (BFF-only)                          | ⚠️ 403 (expected)          |
| Cloud SQL `axiom-proof-preprod-pg-af455108` | Public IP `34.93.127.93`, PG 15, `db-custom-2-7680`                         | ✅ Created                 |
| GCS `axiom-proof-evidence-preprod-e8a572ea` | WORM retention 2555 days, HMAC key provisioned                              | ✅ Created                 |
| Secret Manager                              | 11 secret IDs (`axiom-preprod-*`) — **all created with placeholder values** | ⚠️ Values are fake         |
| VPC + Serverless Connector                  | `axiom-preprod-vpc`, `axiom-preprod-conn` (10.10.16.0/28)                   | ✅ Created                 |

**Net: infrastructure exists, but `terraform.tfvars` was never filled in, so every
`google_secret_manager_secret_version` was written with the placeholder fallback from
`secrets.tf` (e.g. `placeholder-anthropic-key`, `preprod-internal-agent-token-secure`,
`preprod-model-gateway-api-key-secure`).** That is why the services come up but the
agents cannot actually call any LLM, BFF cannot sign approval tokens correctly, and
the Supabase URLs are hardcoded to a domain that doesn't resolve.

---

## 1. Where every configuration lives

| Layer                          | File                                                                                             | What it controls                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Terraform variables**        | `infra/terraform/envs/preprod/terraform.tfvars`                                                  | 8 sensitive values → Secret Manager → Cloud Run env                                                                        |
| **Terraform resource wiring**  | `infra/terraform/envs/preprod/{main,cloudrun,cloudsql,storage,iam,secrets,artifact_registry}.tf` | Resources provisioned in GCP                                                                                               |
| **Preprod Environment Config** | `infra/docker/environments/.env.preprod` (or root `.env.preprod`)                                | **Automatically read by `deploy-preprod-gcp.sh` and `teardown-preprod-gcp.sh`**; maps to `TF_VAR_*` without manual copying |
| **BFF runtime schema**         | `packages/config/src/index.ts`                                                                   | Zod validation — every key the BFF requires at boot                                                                        |
| **Agent-runtime config**       | `services/agent-runtime/src/axiom/config.py`                                                     | Pydantic `Settings` — agent runtime boot validation                                                                        |
| **Model-gateway config**       | `services/model-gateway/src/model_gateway/config.py`                                             | Pydantic `Settings` — provider keys, cache backend, region gate                                                            |
| **Web (Next.js) runtime**      | `apps/web/.env.example` + `apps/web/src/middleware.ts`                                           | Browser-facing env (`NEXT_PUBLIC_*`), server-side env for API rewrites                                                     |
| **Database migrations**        | `infra/supabase/migrations/0000..0007_*.sql`                                                     | Append-only SQL applied to Cloud SQL                                                                                       |
| **Control library seed**       | `packages/control-library/src/controls.ts` + `scripts/build-controls-json.mjs`                   | 46 DPDPA statutory controls seeded via `pnpm seed:controls`                                                                |

### Automated Deployment & Teardown Orchestration

The deployment tooling provides a progressive, dependency-aware pipeline with automated state healing:

- **Launch Deployment Pipeline (`./scripts/deploy-preprod-gcp.sh`)**:
  - Automatically loads `.env.preprod` from `infra/docker/environments/.env.preprod` or `./.env.preprod` and exports `TF_VAR_*` variables.
  - Automatically verifies Cloud SQL state in GCP. If a Cloud SQL instance was deleted outside Terraform, it auto-heals the state by pruning orphaned child resources (`google_sql_database`, `google_sql_user`, `random_id.db_suffix`), preventing GCP 403 API lockouts and name reservation conflicts.
  - Executes 8 progressive phases: `prep` → `base` → `db` → `images` → `services` → `migrate` → `firebase` → `verify`.
  - Supports `--phase <name>`, `--from-phase <name>`, `--skip-build`, `--force-build`, `--skip-migrate`, `--dry-run`, and `--heal-state`.

- **Infrastructure Teardown & Freshstart (`./scripts/teardown-preprod-gcp.sh`)**:
  - Deletes resources in reverse dependency hierarchy: `services` → `secrets` → `db` → `base` → `storage` → `images` → `network`.
  - Automatically takes a timestamped session backup of `terraform.tfstate` before mutating (`terraform.tfstate.session-backup.<timestamp>`).
  - Pass `--reset-state` to archive the state file and reset the directory for a 100% clean fresh start.
  - Supports `--phase <name>`, `--dry-run`, `--force` (`-y`), and `--delete-images`.

### Files that have **placeholders** today and need real values

| File                                                                        | Problem                                                                                                                                   |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `infra/terraform/envs/preprod/terraform.tfvars`                             | Identical to `.example`. All 8 sensitive fields are `sk-ant-api03-…`, `your-temporal-api-key`, etc.                                       |
| `infra/docker/environments/.env.preprod`                                    | Central preprod configuration. Contains verified values; automatically read by deployment scripts.                                        |
| `infra/docker/environments/.env.preprod.example`                            | Template with all placeholders marked and cross-references to the checklist steps.                                                        |
| `infra/terraform/envs/preprod/cloudrun.tf` (lines 76–85, 217–230)           | `SUPABASE_URL=https://preprod-supabase.axiomproof.ai` and `*_KEY=preprod-…-placeholder…` are **hardcoded** into the Cloud Run env blocks. |
| `infra/terraform/envs/preprod/cloudrun.tf` (BFF, lines 38–161)              | Missing `BFF_CORS_ORIGINS`, `BFF_PUBLIC_URL`, `MODEL_GATEWAY_API_KEY`, `RESEND_API_KEY`, `CONTACT_RECIPIENT_EMAIL`.                       |
| `infra/terraform/envs/preprod/cloudrun.tf` (Web, lines 167–245)             | Missing `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MARKETING_URL`.                                                                               |
| `infra/terraform/envs/preprod/cloudrun.tf` (temporal-worker, lines 469–537) | Missing `MODEL_GATEWAY_URL`, `MODEL_GATEWAY_API_KEY`, `TEMPORAL_CLIENT_CERT/KEY`.                                                         |
| `infra/terraform/envs/preprod/cloudrun.tf` (model-gateway, lines 362–467)   | Missing `CACHE_BACKEND=redis` (currently defaults to `memory` despite REDIS_URL being set).                                               |

---

## 2. Step-by-step configuration

### Step 2.1 — Provision a real Upstash Redis database

The current `upstash_redis_url` placeholder means the BFF's rate-limit middleware
silently uses no Redis, and the model gateway falls back to in-memory cache
(single-instance, lost on every restart — breaks cold-start failover for the
fallback chain).

1. Go to https://console.upstash.com → **Create Database**.
2. Region: pick the closest to Mumbai — `ap-south-1` (Upstash supports it under "AWS Mumbai").
3. TLS: enabled. Database name: `axiom-proof-preprod`.
4. Copy the **Redis URL** (looks like `rediss://default:AbC…xYz@flying-…-…upstash.io:6379`).
5. Do **not** paste it directly into `terraform.tfvars`. Paste it into a
   `.env.preprod.local` file outside git, or set it as an env var when invoking terraform:

```bash
cd "/Users/vikash/Axiom Proof/infra/terraform/envs/preprod"
export TF_VAR_upstash_redis_url="rediss://default:AbC…xYz@flying-…-upstash.io:6379"
```

### Step 2.2 — Provision Temporal Cloud on GCP

The agent runtime, BFF, and worker all try to connect to
`temporal_address="axiom-proof.tmprl.cloud:7233"`. That host does **not** exist
unless you've actually created a Temporal Cloud account on the GCP region.

1. https://cloud.temporal.io → sign up → **Create Namespace** in region `GCP asia-south1 (Mumbai)`.
2. Namespace name: `axiom-proof.preprod` (the value matches `var.temporal_namespace`).
3. **Generate API Key**: Settings → API Keys → Create API Key with `Write` permission on the namespace.
4. Save the key the same way you saved Upstash:

```bash
export TF_VAR_temporal_api_key="temporal-api-key-…"
export TF_VAR_temporal_namespace="axiom-proof.preprod"
```

> If you don't yet have Temporal Cloud, leave `temporal_api_key=""` — Temporal
> Cloud isn't on the critical path for the 14-step functional flow as long as
> the Cloud Run worker service starts (it currently logs a warning and proceeds).

### Step 2.3 — Provision model-provider API keys

The model gateway's fallback chain is `Anthropic → OpenAI → Gemini`. With **all
three** placeholders, every agent dispatch returns "no provider available".

```bash
export TF_VAR_anthropic_api_key="sk-ant-api03-…"   # primary
export TF_VAR_openai_api_key="sk-proj-…"            # fallback 1
export TF_VAR_gemini_api_key="AIza…"                # fallback 2
```

> **Statutory note (Hard Rule 5):** provider keys must be from **API accounts
> that have signed a no-training / no-retention DPA** before any prompt with
> Indian PII (even post-redaction) is sent. The keys above should be from a
> business account with the data-processing addendum executed, not personal
> accounts.

### Step 2.4 — Generate the three internal secrets

These are HMAC signing keys / service-to-service tokens. They must be ≥ 32 chars
and cryptographically random. **Never reuse a key across environments.**

```bash
# 256-bit HMAC key for approval tokens (used by BFF + agent-runtime)
export TF_VAR_approval_signing_key=$(openssl rand -hex 32)
#   → 64 hex chars, satisfies `z.string().min(32)` in packages/config

# Random 48-char token for BFF → agent-runtime internal calls
export TF_VAR_agent_runtime_internal_token=$(openssl rand -hex 24)

# Random 48-char API key for agent-runtime → model-gateway calls
export TF_VAR_model_gateway_api_key=$(openssl rand -hex 24)
```

### Step 2.5 — Provision a real Supabase project (or run Supabase self-hosted)

This is the **biggest gap**. `cloudrun.tf` hardcodes
`SUPABASE_URL=https://preprod-supabase.axiomproof.ai` and two placeholder JWTs
(`preprod-anon-key-placeholder-length-over-forty-chars`,
`preprod-service-key-placeholder-length-over-forty-chars`). That domain doesn't
resolve, so every authenticated request 401s.

> **Why both Supabase and Cloud SQL exist here:**
> Axiom Proof uses a **hybrid architecture** in preprod. Cloud SQL for PostgreSQL 15
> in `asia-south1` serves as the core relational datastore and immutable audit ledger
> (via `append_ledger()`), while Supabase provides the Identity Provider (GoTrue Auth,
> `@supabase/ssr` session cookies, and JWT issuance). Both reside in Mumbai to satisfy
> DPDPA data residency requirements. _(See [Section 8](#8-architectural-deep-dive-supabase-vs-cloud-sql-dual-setup--future-alternatives)
> below for the complete architectural analysis, trade-offs, and consolidation alternatives)._

You have two options for preprod. **Pick one.**

#### Option A — Managed Supabase (fastest)

1. https://supabase.com/dashboard → **New Project** → name `axiom-proof-preprod`, region `Mumbai (ap-south-1)`, strong DB password.
2. **Settings → API**: copy the Project URL, `anon` key, `service_role` key.
3. The Supabase project is a separate product from Cloud SQL; we keep Cloud SQL
   for the **app data** (tenants, controls, ledger) and use Supabase for **auth only**.
4. The BFF, agent-runtime, and Next.js all need the same three values. Wire them
   in via Secret Manager (preferred) instead of hardcoding.

```bash
# Replace the hardcoded values in cloudrun.tf with secret refs (see Step 2.7)
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_ANON_KEY="eyJ…"           # paste to SM
export SUPABASE_SERVICE_KEY="eyJ…"        # paste to SM
```

5. **Apply migrations**: Supabase Dashboard → SQL Editor → paste and run each file
   in `infra/supabase/migrations/` in order `0000 → 0007`. Then run
   `pnpm seed:controls` against the Supabase DB.

#### Option B — Self-host Supabase locally (matches `docker-compose.yml`)

Use the existing `infra/docker/docker-compose.supabase.yml`. This is what the
local staging runs against. For preprod you would put Supabase on a small
Compute Engine VM in `asia-south1` and point Cloud Run at its URL. **Recommended
only if you want a single-tenant control plane** — for a regulated workload the
managed product is simpler to audit.

### Step 2.6 — Decide on transactional email (Resend)

`packages/config/src/index.ts` declares `RESEND_API_KEY` (optional) and
`CONTACT_RECIPIENT_EMAIL=hello@axiomminds.ai`. Without `RESEND_API_KEY`, the
contact-form submission silently fails (logs `resend.api_key.missing`). Add to
Secret Manager:

```bash
export RESEND_API_KEY="re_…"
# Then add as a new google_secret_manager_secret
```

### Step 2.7 — Patch `cloudrun.tf` to wire the missing env vars

The biggest "looks deployed but doesn't work" source. Apply the edits below to
`infra/terraform/envs/preprod/cloudrun.tf`. They are split per service.

#### 2.7.a — BFF (lines 38–165): add CORS, public URL, model-gateway key, Resend

```hcl
# After the existing MODEL_GATEWAY_URL block on line ~64:
env {
  name  = "BFF_CORS_ORIGINS"
  value = "https://axiom-proof.web.app,https://axiom-web-preprod-188516662106.asia-south1.run.app,https://axiom-marketing-preprod-188516662106.asia-south1.run.app"
}
env {
  name  = "BFF_PUBLIC_URL"
  value = google_cloud_run_v2_service.bff.uri
}
env {
  name  = "RESEND_API_KEY"
  value_source {
    secret_key_ref {
      secret  = google_secret_manager_secret.secret["resend_api_key"].secret_id
      version = "latest"
    }
  }
}
env {
  name  = "CONTACT_RECIPIENT_EMAIL"
  value = "hello@axiomminds.ai"
}
env {
  name  = "MODEL_GATEWAY_API_KEY"
  value_source {
    secret_key_ref {
      secret  = google_secret_manager_secret.secret["model_gateway_api_key"].secret_id
      version = "latest"
    }
  }
}
```

#### 2.7.b — Replace hardcoded Supabase placeholders (BFF, Web)

In the BFF `env` block, replace lines 75–85 with secret refs:

```hcl
env {
  name = "SUPABASE_URL"
  value_source {
    secret_key_ref {
      secret  = google_secret_manager_secret.secret["supabase_url"].secret_id
      version = "latest"
    }
  }
}
env {
  name = "SUPABASE_ANON_KEY"
  value_source {
    secret_key_ref {
      secret  = google_secret_manager_secret.secret["supabase_anon_key"].secret_id
      version = "latest"
    }
  }
}
env {
  name = "SUPABASE_SERVICE_KEY"
  value_source {
    secret_key_ref {
      secret  = google_secret_manager_secret.secret["supabase_service_key"].secret_id
      version = "latest"
    }
  }
}
```

Do the same for the Web service env block (lines 167–245), but **only** for the
server-side (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`); the `NEXT_PUBLIC_*` values
**must** remain literal env values, not secret refs, because Next.js bakes them
into the client bundle at build time.

Then add three new entries in `infra/terraform/envs/preprod/secrets.tf`
`managed_secrets` (around line 6):

```hcl
supabase_url         = var.supabase_url         # add a `variable "supabase_url"` declaration too
supabase_anon_key    = var.supabase_anon_key
supabase_service_key = var.supabase_service_key
resend_api_key       = var.resend_api_key
```

…and matching `variable` declarations in `variables.tf`:

```hcl
variable "supabase_url"         { type = string; sensitive = true; default = "" }
variable "supabase_anon_key"    { type = string; sensitive = true; default = "" }
variable "supabase_service_key" { type = string; sensitive = true; default = "" }
variable "resend_api_key"       { type = string; sensitive = true; default = "" }
```

> [!NOTE]
> **Pre-existing Secret Resolution (Avoiding 409 Conflict)**:
> If a secret (e.g. `axiom-preprod-resend-api-key`) already exists in GCP Secret Manager, Terraform will attempt to re-create it and fail with `409 Conflict: Secret already exists`.
> The automated deployment script (`./scripts/deploy-preprod-gcp.sh`) features built-in self-healing (`heal_secret_manager_state_if_needed`) that auto-imports any pre-existing secrets. If applying Terraform manually, import the secret into state first:
>
> ```bash
> terraform import 'google_secret_manager_secret.secret["resend_api_key"]' projects/axiom-proof/secrets/axiom-preprod-resend-api-key
> ```

#### 2.7.c — Web (Next.js): add the missing public URLs

Inside the `google_cloud_run_v2_service.web` container `env` block, after
`NEXT_PUBLIC_BFF_URL`:

```hcl
env {
  name  = "NEXT_PUBLIC_APP_URL"
  value = google_cloud_run_v2_service.web.uri
}
env {
  name  = "NEXT_PUBLIC_MARKETING_URL"
  value = "https://axiom-proof.web.app"
}
```

#### 2.7.d — Model Gateway: flip cache backend to Redis

Inside the `google_cloud_run_v2_service.model_gateway` container env block, add:

```hcl
env {
  name  = "CACHE_BACKEND"
  value = "redis"
}
env {
  name  = "REDIS_URL"
  value_source {
    secret_key_ref {
      secret  = google_secret_manager_secret.secret["upstash_redis_url"].secret_id
      version = "latest"
    }
  }
}
```

#### 2.7.e — Temporal Worker: add Model Gateway URL + key

Inside `google_cloud_run_v2_service.temporal_worker` container env block:

```hcl
env {
  name  = "MODEL_GATEWAY_URL"
  value = google_cloud_run_v2_service.model_gateway.uri
}
env {
  name  = "MODEL_GATEWAY_API_KEY"
  value_source {
    secret_key_ref {
      secret  = google_secret_manager_secret.secret["model_gateway_api_key"].secret_id
      version = "latest"
    }
  }
}
```

### Step 2.8 — Apply the Terraform changes

```bash
cd "/Users/vikash/Axiom Proof/infra/terraform/envs/preprod"

# Preview the diff before re-applying
terraform plan -out=preprod.tfplan

# Apply (only the secret + Cloud Run env blocks change — no resource recreation)
terraform apply preprod.tfplan
```

This pushes the new secret values to Secret Manager and restarts each Cloud Run
service that has a `env` change. Cloud Run performs a rolling update by default.

### Step 2.9 — Apply database migrations + control library seed

```bash
# Get the Cloud SQL public IP (already known: 34.93.127.93)
export CLOUD_SQL_IP=$(terraform output -raw cloud_sql_public_ip)
export DB_PASSWORD=$(terraform output -raw db_password)

# Add your workstation IP to Cloud SQL authorized networks first (one-time):
gcloud sql instances patch axiom-proof-preprod-pg-af455108 \
  --project axiom-proof --region asia-south1 \
  --authorized-networks "$(curl -s ifconfig.me)/32=workstation"

# Apply all 8 migrations + the control library seed
DATABASE_URL="postgresql://axiom_admin:${DB_PASSWORD}@${CLOUD_SQL_IP}:5432/axiom_proof_preprod" \
  ./scripts/migrate-cloudsql.sh "${DATABASE_URL}"

# Back at repo root, build the controls.json and seed the 46 DPDPA controls
cd "/Users/vikash/Axiom Proof"
pnpm tsx scripts/build-controls-json.mjs
DATABASE_URL="postgresql://axiom_admin:${DB_PASSWORD}@${CLOUD_SQL_IP}:5432/axiom_proof_preprod" \
  pnpm seed:controls
```

> `scripts/migrate-cloudsql.sh` is idempotent — it skips a migration if the
> `_migrations` table already has it. Re-running is safe.

### Step 2.10 — Wire the marketing site `BFF_PUBLIC_URL`

The marketing site on `axiom-proof.web.app` was deployed **before** the BFF URL
was known, so its `BFF_PUBLIC_URL` is unset. Re-deploy it now:

```bash
cd "/Users/vikash/Axiom Proof"
./scripts/deploy-firebase-marketing.sh axiom-proof
```

(Inside, `deploy-firebase-marketing.sh` reads `NEXT_PUBLIC_BFF_URL` from the
local env file; export it before the call if you keep it in `.env.preprod`.)

### Step 2.11 — Allow Cloud Run → Cloud SQL private path

Cloud Run uses the Serverless VPC Connector to reach Cloud SQL on its private
IP. Verify:

```bash
gcloud sql instances describe axiom-proof-preprod-pg-af455108 \
  --project axiom-proof --region asia-south1 \
  --format="value(settings.ipConfiguration.privateNetwork)"
# Expected: projects/axiom-proof/global/networks/axiom-preprod-vpc

gcloud compute networks vpc-access connectors describe axiom-preprod-conn \
  --region asia-south1 --project axiom-proof \
  --format="value(state,ipCidrRange)"
# Expected: READY / 10.10.16.0/28
```

If either is missing, re-apply main.tf (the `private_vpc_connection` resource is
in `main.tf` lines 67–70).

### Step 2.12 — Disable public ingress on the worker + agent-runtime (optional hardening)

`iam.tf` allows `allUsers` to invoke BFF, Web, and Marketing (intentional). It
does **not** allow `allUsers` on `agent-runtime`, `model-gateway`, or
`temporal-worker`. That's already correct — they remain `403` from the public
internet. **Keep it that way.** The BFF calls them with the
`AGENT_RUNTIME_INTERNAL_TOKEN` header, which is what they verify.

---

### Step 2.13 — Cost-minimized sizing & scaling (keep the bill small)

Preprod currently runs with hardcoded generous sizes (`2 vCPU + 2 GiB`, `min_instance_count = 1` on every
service). That keeps the idle bill at roughly **₹36,000/month**. Cut it to roughly **₹1,000/month at idle**
with the edits below.

#### Where every size and scale knob lives

| #   | Layer                                  | File                                                             | Lines                                              | What's there                                                                                                                                             |
| --- | -------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Cloud Run services** (biggest lever) | `infra/terraform/envs/preprod/cloudrun.tf`                       | 23–35, 176–188, 256–268, 371–383, 478–490, 548–560 | `scaling { min_instance_count, max_instance_count }` + `resources.limits { cpu, memory }` per service. **Hardcoded today — edit in place.**              |
| 2   | **Cloud SQL PostgreSQL**               | `infra/terraform/envs/preprod/cloudsql.tf`                       | 21–23, 61                                          | `tier`, `disk_size`, `availability_type`, `deletion_protection`. Tier + disk come from variables — set them in `terraform.tfvars`.                       |
| 3   | **VPC Serverless Connector**           | `infra/terraform/envs/preprod/main.tf`                           | 39–55                                              | `min_instances`, `max_instances`, `machine_type`. Always-on billing per instance.                                                                        |
| 4   | **GCS Evidence Vault**                 | `infra/terraform/envs/preprod/storage.tf`                        | 11–47                                              | `storage_class`, `versioning`, `lifecycle_rule` (→ ARCHIVE), `enable_object_retention`. WORM constraint means retention/v versioning are non-negotiable. |
| 5   | **Helm (legacy EKS path)**             | `infra/helm/axiom-proof/values.yaml`                             | 35–151                                             | `replicaCount`, `resources.requests`, `resources.limits`, `autoscaling.min/maxReplicas`. **Not used for GCP preprod** (Cloud Run only).                  |
| 6   | **Local Docker compose**               | `docker-compose.yml` + `infra/docker/docker-compose.preprod.yml` | n/a                                                | No resource limits today. Host caps apply. Add `cpus:` and `mem_limit:` per service if you want a hard cap on local CI.                                  |

#### Current (costly) defaults vs. recommended cost-minimized values

##### A. Cloud Run — `cloudrun.tf` (biggest saving)

Apply these six edits:

```hcl
# BFF (block at line 23 + line 31)
scaling { min_instance_count = 0  max_instance_count = 3 }   # was: 1 / 10
resources.limits { cpu = "1"  memory = "1Gi" }               # was: 2 / 2Gi

# Web (block at line 176 + line 184)
scaling { min_instance_count = 0  max_instance_count = 3 }
resources.limits { cpu = "1"  memory = "1Gi" }

# Agent Runtime (block at line 256 + line 264) — heaviest, keep modestly warm if demos are frequent
scaling { min_instance_count = 0  max_instance_count = 2 }
resources.limits { cpu = "1"  memory = "2Gi" }                # was: 2 / 4Gi

# Model Gateway (block at line 371 + line 379)
scaling { min_instance_count = 0  max_instance_count = 2 }
resources.limits { cpu = "1"  memory = "2Gi" }

# Temporal Worker (block at line 478 + line 486) — only runs workflows
scaling { min_instance_count = 0  max_instance_count = 2 }
resources.limits { cpu = "1"  memory = "1Gi" }                # was: 1 / 2Gi

# Marketing CR (block at line 548 + line 556)
scaling { min_instance_count = 0  max_instance_count = 2 }
resources.limits { cpu = "1"  memory = "512Mi" }             # was: 1Gi
```

##### B. Cloud SQL — `terraform.tfvars` (set in step 2.x above)

```hcl
cloud_sql_tier         = "db-f1-micro"      # was db-custom-2-7680
cloud_sql_disk_size_gb = 10                 # was 20; resize up with `gcloud sql instances patch` if needed
```

For very heavy operations (full 46-control re-assessment, Parikshan run, migrations), temporarily bump
the tier:

```bash
gcloud sql instances patch axiom-proof-preprod-pg-af455108 \
  --project axiom-proof --region asia-south1 \
  --tier=db-custom-2-7680
# ... run heavy work ...
gcloud sql instances patch axiom-proof-preprod-pg-af455108 \
  --project axiom-proof --region asia-south1 \
  --tier=db-f1-micro
```

`db-f1-micro` is shared-CPU, so during the spike you get ~6× throughput. Fine for one-off.

##### C. VPC Connector — `infra/terraform/envs/preprod/main.tf`

```hcl
# Block at line 39–46
resource "google_vpc_access_connector" "connector" {
  ...
  min_instances = 0       # was: 2  → drops idle connector cost from ~₹1,300/mo to ₹0
  max_instances = 3       # was: 5
  machine_type  = "e2-micro"
}
```

Trade-off: first Cloud Run → Cloud SQL request after idle pays a ~5 s connector spin-up cost.

##### D. GCS Evidence Vault — keep as-is

`storage.tf` already does the right thing for cost: STANDARD storage with a lifecycle rule that pushes
objects to ARCHIVE after `retention_days + 30` (= 2585 days). **Do NOT** turn off versioning — it's part
of the WORM audit guarantee and removing it would break Hard Rule 4 (statutory DPDPA retention).

#### Trade-offs to be aware of

| Choice                                | What you save                        | What you give up                                                                        |
| ------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| `min_instance_count = 0` on Cloud Run | ~₹1,000/instance/month idle          | 1–3 s cold start after idle (≥15 min no traffic)                                        |
| `db-f1-micro`                         | ~₹12,000/month vs `db-custom-2-7680` | Shared CPU; 5–15 s slowdown during heavy operations                                     |
| VPC connector `min_instances = 0`     | ~₹1,300/month                        | ~5 s connector spin-up on first request after idle                                      |
| Lower `cpu` (e.g. `1` vs `2`)         | Lower per-request charge             | Caps per-instance concurrency at ~80 (vs ~33 with `2`) — irrelevant for preprod traffic |
| Lower `memory` (`512Mi` vs `1Gi`)     | Lower per-request GiB·seconds        | OOM risk on Parikshan's 46-control evaluation if concurrent assessments spike           |

**Recommended posture for preprod:** keep BFF and Web `min_instance_count = 1` so demos and smoke tests
don't pay cold-start tax. Set the rest to 0. The numbers above are the absolute floor.

#### Approximate monthly bill (asia-south1, Sept 2026 pricing)

| Component                                           | Before          | After (full cut) | After (BFF+Web warm) |
| --------------------------------------------------- | --------------- | ---------------- | -------------------- |
| Cloud SQL (`db-custom-2-7680` → `db-f1-micro`)      | ₹28,000         | ₹250             | ₹250                 |
| Cloud Run 6 services (idle, `min=1` × 6)            | ₹6,000          | **₹0**           | ₹2,000 (BFF + Web)   |
| VPC connector (`min=2`)                             | ₹1,300          | **₹0**           | ₹130 (min=1)         |
| Artifact Registry + Secret Manager + GCS versioning | ₹500            | ₹500             | ₹500                 |
| Pay-per-request spike during `run-preprod-flow.sh`  | varies          | ~₹50             | ~₹50                 |
| **Total at idle**                                   | **~₹36,000/mo** | **~₹800/mo**     | **~₹2,900/mo**       |

The 12–45× saving is almost entirely from `min_instance_count = 0` on Cloud Run.

---

## 3. Filled-in `terraform.tfvars` (template)

Save the values below into `terraform.tfvars`. **Do not commit the file** —
`.gitignore` should already exclude `*.tfvars` (verify and add if not).

```hcl
# infra/terraform/envs/preprod/terraform.tfvars

project_id             = "axiom-proof"
region                 = "asia-south1"
environment            = "preprod"
cloud_sql_tier         = "db-custom-2-7680"
cloud_sql_disk_size_gb = 20

# ─── Provisioned in Step 2.1 ────────────────────────────────────────────────
upstash_redis_url = "rediss://default:<token>@<host>.upstash.io:6379"

# ─── Provisioned in Step 2.2 ────────────────────────────────────────────────
temporal_address   = "axiom-proof.tmprl.cloud:7233"
temporal_namespace = "axiom-proof.preprod"
temporal_api_key   = "<temporal-api-key>"

# ─── Provisioned in Step 2.3 ────────────────────────────────────────────────
anthropic_api_key = "<anthropic-key>"
openai_api_key    = "<openai-key>"
gemini_api_key    = "<gemini-key>"

# ─── Generated in Step 2.4 ──────────────────────────────────────────────────
approval_signing_key         = "<openssl rand -hex 32>"
agent_runtime_internal_token = "<openssl rand -hex 24>"
model_gateway_api_key        = "<openssl rand -hex 24>"

# ─── Provisioned in Step 2.5 (Option A: Managed Supabase) ───────────────────
supabase_url         = "https://<project-ref>.supabase.co"
supabase_anon_key    = "<anon-jwt>"
supabase_service_key = "<service-role-jwt>"

# ─── Provisioned in Step 2.6 ────────────────────────────────────────────────
resend_api_key = "<resend-api-key>"
```

---

## 4. Verification (smoke tests)

After Step 2.8 and 2.9 finish, run these checks in order. Each must pass before
moving to the next.

### 4.1 — Service health

```bash
BFF="https://axiom-bff-preprod-188516662106.asia-south1.run.app"
WEB="https://axiom-web-preprod-188516662106.asia-south1.run.app"
MKT="https://axiom-marketing-preprod-188516662106.asia-south1.run.app"
FB="https://axiom-proof.web.app"

for url in "$BFF/health" "$WEB/api/health" "$MKT/api/health" "$FB"; do
  printf "%-70s %s\n" "$url" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$url")"
done
# Expected: 200 200 200 200
```

### 4.2 — BFF can reach Supabase (auth roundtrip)

```bash
curl -s -X POST "$BFF/v1/health/deep" \
  -H "Content-Type: application/json" -d '{}' | jq .
# Expected: {"status":"ok","supabase":"ok","agent_runtime":"ok",...}
```

### 4.3 — BFF can dispatch to agent-runtime (signing-key sanity)

```bash
# Use any pre-existing test JWT (a Supabase anon login). If none, hit the signup endpoint first.
JWT=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"<existing-user>","password":"<pw>"}' | jq -r '.access_token')

TENANT_ID=$(curl -s "$BFF/v1/tenants" -H "Authorization: Bearer $JWT" | jq -r '.[0].id')

curl -s -X POST "$BFF/v1/agents/drishti/run" \
  -H "Authorization: Bearer $JWT" -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"engagement_id":"<eng-id>","correlation_id":"smoke-1","systems":[]}' | jq .
# Expected: status="succeeded", no error field
```

### 4.4 — Model gateway can reach a provider

```bash
# (This is what the agent-runtime does under the hood)
curl -s -X POST "https://axiom-model-gateway-preprod-188516662106.asia-south1.run.app/v1/chat" \
  -H "X-API-Key: $MODEL_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"anthropic/claude-3-5-haiku-20241022","messages":[{"role":"user","content":"ping"}]}' \
  | jq '.provider // .error'
# Expected: "anthropic" (or "openai"/"gemini" if fallback kicked in)
```

> The 403 you see today on `axiom-model-gateway-preprod-...` is because the
> request has no `X-API-Key` header. Once `MODEL_GATEWAY_API_KEY` is on the BFF
> (Step 2.7.a), BFF-to-gateway calls succeed automatically.

### 4.5 — Ledger hash chain is intact

```bash
curl -s -X POST "$BFF/v1/ledger/verify" \
  -H "Authorization: Bearer $JWT" \
  -H "X-Tenant-Id: $TENANT_ID" | jq .
# Expected: {"valid": true, "total_records": <n>, "merkle_root": "..."}
```

### 4.6 — Evidence can be sealed into GCS WORM

```bash
curl -s -X POST "$BFF/v1/agents/saakshi/run" \
  -H "Authorization: Bearer $JWT" -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"engagement_id":"<eng-id>","correlation_id":"smoke-1"}' | jq .
# Expected: status="succeeded", object_key set, sha256 matches
```

### 4.7 — Full end-to-end flow

Once the smoke tests pass, the full 14-step live functional flow:

```bash
./scripts/run-preprod-flow.sh "$BFF"
```

must reach Step 14 (Ledger Verification) and return `intact: true`.

---

## 5. Pre-flight answers the audit will ask

| Question                              | Where the evidence lives                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Is all data resident in `ap-south-1`? | Cloud SQL region + GCS bucket region = `asia-south1`; Cloud Run region = `asia-south1`. `terraform output` lists them.                     |
| Is the evidence bucket truly WORM?    | `gsutil bucketpolicyonly get gs://axiom-proof-evidence-preprod-*` + `enable_object_retention=true` in `storage.tf`.                        |
| Are approval tokens HMAC-signed?      | `approval_signing_key` (32-byte hex) set in Secret Manager; consumed by `services/bff/src/services/approval.ts:14`.                        |
| Is the audit ledger append-only?      | `0006_ledger_role_and_extras.sql` defines `append_ledger()` as `SECURITY DEFINER`; `ledger_writer` role has `INSERT` only.                 |
| Is PII redacted before model egress?  | `model-gateway` runs Presidio + regex before calling any provider; structured log `model_gateway.route_decision` records redaction counts. |
| Can the planning agent mutate data?   | `SudhaarAgent.can_mutate = False` (Hard Rule 2; enforced in agent-runtime source).                                                         |
| Is there a kill switch?               | `FEATURE_KILL_SWITCH=true` env on BFF + `/v1/kill-switch/engage` route in `routes/v1.ts`.                                                  |

---

## 6. Where to look for X (quick index)

| Need                                 | File / command                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Terraform inputs                     | `infra/terraform/envs/preprod/terraform.tfvars`                                                                          |
| What secrets get auto-created        | `infra/terraform/envs/preprod/secrets.tf` (`managed_secrets` map)                                                        |
| What env each Cloud Run service gets | `infra/terraform/envs/preprod/cloudrun.tf` (`env` blocks per service)                                                    |
| BFF config schema                    | `packages/config/src/index.ts` (`EnvSchema` Zod object)                                                                  |
| Agent-runtime config                 | `services/agent-runtime/src/axiom/config.py` (`Settings` Pydantic class)                                                 |
| Model-gateway config                 | `services/model-gateway/src/model_gateway/config.py` (`Settings` Pydantic class)                                         |
| Migration runner                     | `scripts/migrate-cloudsql.sh`                                                                                            |
| Image build/push                     | `scripts/build-preprod-images.sh` + `infra/docker/Dockerfile.*`                                                          |
| End-to-end functional flow           | `scripts/run-preprod-flow.sh`                                                                                            |
| Local Docker parity (for testing)    | `infra/docker/docker-compose.preprod.yml` + `infra/docker/environments/.env.preprod` (structure: `.env.preprod.example`) |
| Firebase hosting config              | `firebase.json` + `apps/marketing/out` (built by `scripts/deploy-firebase-marketing.sh`)                                 |
| Live logs                            | `gcloud run services logs read axiom-bff-preprod --region asia-south1 --follow`                                          |
| Evidence Storage Credentials (HMAC)  | `docs/GCP_PREPROD_DEPLOYMENT_GUIDE.md` (Step 3.5) + `terraform output -raw gcs_hmac_secret`                              |
| DB & Auth Architecture Analysis      | [Section 8](#8-architectural-deep-dive-supabase-vs-cloud-sql-dual-setup--future-alternatives)                            |

---

## 7. What this checklist does NOT cover

- **Production hardening** (S3 Object Lock, mTLS between services, MFA enforcement). That is documented in `docs/07_SECURITY_REVIEW.md` and is intentionally out of scope for preprod.
- **Kubernetes / Helm templates.** `infra/helm/axiom-proof/` is the legacy AWS EKS path; GCP preprod runs on Cloud Run only. Per `Axiom-Proof_Readiness_Matrix.md` §1.3, the Helm `marketing` and `temporal-worker` Deployment templates are still missing.
- **Custom domain mapping** (`app.axiomproof.ai` / `preprod-app.axiomproof.ai`). Today preprod serves on `*.run.app`. To attach the custom domain you need to add a `google_cloud_run_domain_mapping` resource and validate ownership in Search Console.

---

## 8. Architectural Deep-Dive: Supabase vs. Cloud SQL Dual Setup & Future Alternatives

### 8.1 Why Both Exist (The Transition Context)

Axiom Proof is operating in a **hybrid transition state**:

1. **Initial BaaS Architecture (Phases 0–1 / Local Dev)**:
   - Designed around **Supabase** as an all-in-one Backend-as-a-Service (BaaS) providing PostgreSQL, Row-Level Security (RLS), GoTrue Auth, PostgREST HTTP APIs, and Realtime WebSockets (`docs/05_Technology_Stack_Analysis.md` §5).
   - Core application packages (`@axiom/supabase`, `@axiom/ledger`, `@axiom/bff`, Next.js SSR middleware, and Python `agent-runtime`) were built directly on Supabase SDK primitives (`supabase.from()`, `supabase.rpc()`).
2. **GCP Preproduction Deployment (Phase 2)**:
   - Compute workloads were migrated to **Google Cloud Platform (GCP)** in Mumbai (`asia-south1`), decomposed into independent Cloud Run microservices.
   - For enterprise data management within GCP, **Cloud SQL for PostgreSQL 15** was provisioned inside the VPC (`axiom-preprod-vpc`) to serve as the high-availability relational datastore.
3. **The Current Division**:
   - **Cloud SQL** acts as the primary relational database, statutory control library, and cryptographic append-only audit ledger (`audit_ledger`).
   - **Supabase** acts as the Identity Provider (GoTrue Auth) for user sessions and JWT issuance, as well as the local dev emulator.

### 8.2 Division of Responsibilities in Preprod

| Capability                         | Component             | Purpose & Implementation                                                                                                                                                                    |
| :--------------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User Authentication & Sessions** | **Supabase (GoTrue)** | Handles user registration, login, session cookies (`@supabase/ssr`), and JWT issuance (`anon`, `authenticated`, `service_role`). Meets DPDPA residency by running in Mumbai (`ap-south-1`). |
| **Relational Business Data**       | **Cloud SQL (PG 15)** | Tenants, organizations, engagements, findings, and remediation blueprints hosted in `asia-south1`.                                                                                          |
| **Cryptographic Audit Ledger**     | **Cloud SQL (PG 15)** | The `audit_ledger` table and the `append_ledger()` SECURITY DEFINER function; `ledger_writer` role is INSERT-only (Hard Rule 3).                                                            |
| **Statutory Control Library**      | **Cloud SQL (PG 15)** | Immutable 46 DPDPA statutory controls and framework mappings (`controls`, `framework_controls`).                                                                                            |
| **Compliance & Audit Telemetry**   | **Cloud SQL (PG 15)** | `cloudsql.enable_pgaudit` flag, IAM database authentication, automated PITR, and private Serverless VPC Access.                                                                             |
| **Local Dev & CI Tests**           | **Supabase Local**    | Dockerized Supabase stack (`docker-compose.supabase.yml`) for local testing without cloud dependencies.                                                                                     |

> **Bootstrap Bridge:** Vanilla Cloud SQL instances do not have Supabase's built-in role system. `infra/supabase/migrations/0000_bootstrap_roles_and_extensions.sql` explicitly initializes `anon`, `authenticated`, `service_role`, `authenticator`, and `ledger_writer` roles plus `pgcrypto`/`uuid-ossp` extensions so the 7 sequential migrations execute identically on Cloud SQL.

### 8.3 Architectural Tensions of the Current Setup

1. **Client Protocol Mismatch**: Application code in `@axiom/ledger` and `@axiom/bff` calls `createSupabaseAdmin()` and invokes PostgREST RPCs (`supabase.rpc('append_ledger')`), while Cloud SQL is standard PostgreSQL accessed over port 5432 (`SUPABASE_DB_URL`).
2. **Dual Identity & Credential Management**: Operators must configure and rotate credentials for both Cloud SQL (`axiom_admin` password) and Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`).
3. **Cross-Cloud Latency**: When using Managed Supabase (AWS `ap-south-1`) alongside Cloud Run and Cloud SQL (GCP `asia-south1`), auth session validations cross CSP boundaries over the public internet.

### 8.4 Evaluated Alternatives

#### Alternative 1: Full GCP Consolidation (Retire Supabase)

_Consolidate entirely into a single-cloud GCP footprint in Mumbai (`asia-south1`)._

- **Database**: Retain Cloud SQL PostgreSQL 15 as the single source of truth.
- **Data Access Layer**: Replace `@supabase/supabase-js` with a type-safe TypeScript ORM/query builder (**Drizzle ORM** or **Kysely**) with direct pooled TCP connections (via Cloud SQL Auth Proxy or PgBouncer).
- **Auth Layer**:
  - _Option 1A (Managed GCP)_: **Google Cloud Identity Platform / Firebase Auth** (configured with tenant custom claims; verify Mumbai data residency).
  - _Option 1B (Self-Hosted Sovereign)_: Deploy **Keycloak** or **Ory Kratos** on Cloud Run in Mumbai backed by Cloud SQL tables.
  - _Option 1C (App-Native)_: **Auth.js (NextAuth)** or **Lucia**, storing user and session records directly in Cloud SQL tables.
- **Trade-offs**:
  - _Pros_: Single GCP VPC envelope, lowest network latency, single billing account, zero per-MAU auth pricing, no external SaaS dependencies.
  - _Cons_: Requires refactoring client data fetching from `@supabase/supabase-js` to SQL/ORM, and rewriting auth middleware.

#### Alternative 2: Full Supabase Consolidation (Retire Cloud SQL)

_Return to the original Phase 0–1 BaaS architecture documented in `docs/05_Technology_Stack_Analysis.md` §5._

- **Database & Auth**: Single managed **Supabase Pro/Team** project in AWS `ap-south-1` (Mumbai) handling Auth, Postgres 15, RLS, pgvector, and PostgREST.
- **Evidence Storage**: AWS S3 with Object Lock in Compliance Mode (or GCS Bucket Lock).
- **Trade-offs**:
  - _Pros_: Zero refactoring needed (codebase natively expects this model); built-in Supabase Realtime for live dashboard notifications; exact parity with local dev.
  - _Cons_: Cross-cloud latency/egress if compute stays on GCP Cloud Run; pricing scales with Monthly Active Users (MAU).

#### Alternative 3: Self-Hosted Supabase Stack on GCP (Best of Both Worlds)

_Keep Cloud SQL as the database engine, but host the open-source Supabase stack on GCP._

- **Architecture**: Deploy open-source Supabase containers (**GoTrue**, **PostgREST**, **Kong**) on Cloud Run in `asia-south1`, pointing to Cloud SQL over the private VPC connector.
- **Trade-offs**:
  - _Pros_: 100% compatibility with existing `@supabase/supabase-js` and `@supabase/ssr` code; backed by enterprise Cloud SQL in your VPC; no per-MAU SaaS tax.
  - _Cons_: Ongoing operational maintenance of GoTrue, PostgREST, and Kong container configurations.

#### Alternative 4: Full AWS Consolidation (Doc 06 Strategy)

_Migrate compute and data to AWS `ap-south-1` (Mumbai)._

- **Compute**: Amazon EKS or ECS Fargate.
- **Database**: Amazon Aurora PostgreSQL Serverless v2 or RDS PostgreSQL (with pgAudit).
- **Auth**: Amazon Cognito or self-hosted Keycloak.
- **Storage & Cache**: AWS S3 Object Lock (Compliance mode) + Amazon ElastiCache for Valkey.
- **Trade-offs**:
  - _Pros_: Eliminates all GCP/AWS cross-cloud splits; native AWS S3 Object Lock; single AWS account envelope.
  - _Cons_: Significant migration effort to dismantle GCP Cloud Run and Terraform setups.

### 8.5 Comparison Matrix

| Evaluation Dimension        | Current Hybrid (Supabase Auth + Cloud SQL) | Alt 1: Full GCP (Cloud SQL + Drizzle + Keycloak/Firebase) | Alt 2: Full Supabase (Managed Supabase Pro Mumbai) | Alt 3: Self-Hosted Supabase on GCP (Cloud Run) |
| :-------------------------- | :----------------------------------------- | :-------------------------------------------------------- | :------------------------------------------------- | :--------------------------------------------- |
| **DPDPA Residency (India)** | ✅ Yes (Both in Mumbai)                    | ✅ Yes (All GCP `asia-south1`)                            | ✅ Yes (AWS `ap-south-1`)                          | ✅ Yes (All GCP `asia-south1`)                 |
| **Code Refactoring**        | Minimal (already wired)                    | Medium (replace Supabase SDK with ORM)                    | None (native code fit)                             | None (emulates Supabase API)                   |
| **Network Latency**         | Moderate (Cross-cloud hops)                | Lowest (Zero egress; private VPC)                         | Moderate (Cross-cloud to Cloud Run)                | Lowest (Private VPC)                           |
| **Ops Burden**              | Moderate (dual vendors)                    | Low–Moderate (GCP managed)                                | Lowest (managed BaaS)                              | High (maintain container stack)                |
| **Cost Predictability**     | High DB / Variable Auth MAU                | Highest (flat compute + storage)                          | Variable (scales with MAU)                         | Highest (no per-MAU fee)                       |
| **Audit Posture**           | Fragmented audit trail                     | Unified GCP CloudTrail/Audit Logs                         | Managed SOC2 / ISO reports                         | Self-managed audit posture                     |

### 8.6 Recommended Path

1. **Short Term (Preprod Validation)**:
   - Complete preprod following **Step 2.5 Option A**: provision a managed Supabase project in Mumbai for Auth/JWT issuance, while keeping all business tables and the audit ledger in Cloud SQL. This unblocks E2E smoke tests immediately without code refactoring.
2. **Long Term (Production Strategy)**:
   - **If committed to GCP**: Adopt **Alternative 1** (Drizzle ORM directly over Cloud SQL + Keycloak or Google Identity Platform). Consolidating onto native GCP eliminates cross-cloud latency and avoids per-MAU auth cost escalations as customer volume scales.
   - **If prioritizing developer velocity & BaaS simplicity**: Adopt **Alternative 2** (Managed Supabase Pro in Mumbai for both Auth and DB) and co-locate compute on AWS EKS or keep Cloud Run with regional peering.

---

**Owner sign-off:**

- [ ] All `terraform.tfvars` values filled in (Step 2.1–2.6)
- [ ] `cloudrun.tf` patches applied (Step 2.7.a–e)
- [ ] `terraform apply` successful (Step 2.8)
- [ ] Cloud SQL migrations applied (Step 2.9)
- [ ] 46 control library rows seeded (Step 2.9)
- [ ] Marketing site re-deployed with BFF URL (Step 2.10)
- [ ] All smoke tests in §4 pass

Once each box is ticked, run `./scripts/run-preprod-flow.sh "$BFF_URL"` and expect
**Step 14: Lekha Hash Chain Verification → `intact: true`**.
