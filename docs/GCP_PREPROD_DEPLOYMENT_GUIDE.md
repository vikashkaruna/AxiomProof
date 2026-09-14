# Axiom Proof — Google Cloud Platform Preprod Deployment & Runbook

**Environment:** Preproduction (`preprod`)  
**Target Cloud:** Google Cloud Platform (GCP)  
**Primary Region:** Mumbai (`asia-south1`) — 100% Domestic Indian Data Residency  
**Architecture Tagline:** _"Agents do the work. You approve. The proof is automatic."_

---

## 1. Architectural Topology & Component Mapping

The preproduction deployment decomposes Axiom Proof into independent, horizontally-scalable containers deployed on **Cloud Run**, backed by **Cloud SQL PostgreSQL**, a **GCS WORM Evidence Vault**, **Google Firebase Static Hosting** for marketing, **Upstash Redis** for distributed rate limits, **Temporal Cloud** on GCP for durable orchestration, and a **redacting Model Gateway** executing a multi-model fallback chain (**Anthropic → OpenAI → Gemini**).

```mermaid
flowchart TD
  subgraph PublicEdge["Public Domain Edge & Ingress"]
    FB[Google Firebase Static Hosting<br/>apps/marketing static export]
    CR_WEB[Cloud Run: axiom-web-preprod<br/>apps/web :3001]
    CR_BFF[Cloud Run: axiom-bff-preprod<br/>services/bff :4000]
  end

  subgraph LogicCompute["Sovereign Microservices (Cloud Run · asia-south1)"]
    CR_RUNTIME[Cloud Run: axiom-agent-runtime-preprod<br/>services/agent-runtime :8000<br/>10 Statutory Agents]
    CR_GATEWAY[Cloud Run: axiom-model-gateway-preprod<br/>services/model-gateway :8001<br/>PII Redactor & Multi-Model Router]
    CR_WORKER[Cloud Run: axiom-temporal-worker-preprod<br/>services/temporal-workers<br/>Durable Orchestrator]
  end

  subgraph ExternalSaaS["Serverless Infrastructure & Model Providers"]
    CSQL[(Cloud SQL PostgreSQL 15<br/>asia-south1 Mumbai<br/>Audit Ledger & Tenants)]
    GCS[(GCS Evidence Vault<br/>WORM Bucket Lock<br/>asia-south1)]
    UPSTASH[(Upstash Serverless Redis<br/>Rate Limiting & Cache)]
    TMPRL[(Temporal Cloud GCP<br/>Durable Workflow Cluster)]

    subgraph ModelFallback["Multi-Model Fallback Chain (PII Redacted)"]
      M1[1. Anthropic Claude 3.5 Sonnet] -->|Failover| M2[2. OpenAI GPT-4o]
      M2 -->|Failover| M3[3. Google Gemini 2.0 Flash]
      M3 -->|Failover| M4[4. Synthetic Deterministic Stub]
    end
  end

  CR_WEB -->|API Requests| CR_BFF
  CR_BFF -->|Dispatches Tasks| CR_RUNTIME
  CR_BFF -->|Direct SQL / Ledger| CSQL
  CR_RUNTIME -->|Redacted Invocations| CR_GATEWAY
  CR_GATEWAY --> ModelFallback
  CR_RUNTIME -->|Seals Proof| GCS
  CR_RUNTIME -->|Appends Ledger| CSQL
  CR_WORKER -->|Workflows| TMPRL
  CR_WORKER -->|Triggers| CR_RUNTIME
  CR_BFF -->|Rate Limits| UPSTASH
```

### Component Inventory & Resource Allocations

| Component                   | Repository Path             | Deploy Platform      |  Port  | Sizing (Preprod)     |  Scaling Bounds  |
| :-------------------------- | :-------------------------- | :------------------- | :----: | :------------------- | :--------------: |
| **API Layer (BFF)**         | `services/bff`              | Cloud Run v2         | `4000` | 2 vCPU / 2 GiB RAM   | 1 – 10 instances |
| **App Layer (Workbench)**   | `apps/web`                  | Cloud Run v2         | `3001` | 2 vCPU / 2 GiB RAM   | 1 – 10 instances |
| **Agents Layer (Runtime)**  | `services/agent-runtime`    | Cloud Run v2         | `8000` | 2 vCPU / 4 GiB RAM   | 1 – 5 instances  |
| **Model Gateway**           | `services/model-gateway`    | Cloud Run v2         | `8001` | 2 vCPU / 4 GiB RAM   | 1 – 5 instances  |
| **Temporal Worker**         | `services/temporal-workers` | Cloud Run v2         |   —    | 1 vCPU / 2 GiB RAM   | 1 – 3 instances  |
| **Marketing (Container)**   | `apps/marketing`            | Cloud Run v2         | `3000` | 1 vCPU / 1 GiB RAM   | 1 – 5 instances  |
| **Marketing (Public Site)** | `apps/marketing/out`        | Firebase Static      |   —    | CDN Edge Cached      | Global CDN Edge  |
| **Database**                | `infra/supabase/migrations` | Cloud SQL PG 15      | `5432` | `db-custom-2-7680`   | Auto-resize SSD  |
| **Evidence Vault**          | `packages/evidence`         | Google Cloud Storage |   —    | Standard / WORM Lock |    Unlimited     |
| **Cache & Queue**           | Upstash Redis               | Serverless Upstash   | `6379` | Serverless Redis     |    Auto-scale    |
| **Orchestration**           | Temporal Cloud              | GCP Subscription     | `7233` | Managed Cloud        |    SLA 99.99%    |

### Independent Docker Topology for Scalability & Local Parity

To maximize horizontal scalability, failure isolation, and independent rollouts, Cloud Run executes different Docker containers for each microservice layer. When running locally (or testing preprod on localhost), the exact same architecture runs across 9 distinct Docker containers:

| Service              | Container Name           | Localhost URL            | Purpose & Scalability Role                                                                     |
| :------------------- | :----------------------- | :----------------------- | :--------------------------------------------------------------------------------------------- |
| **Web Workbench**    | `axiom-web`              | `http://localhost:3001`  | Core operator UI, plan review, approval console, kill switch (Scales 1–10 on Cloud Run)        |
| **Marketing Site**   | `axiom-marketing`        | `http://localhost:3000`  | Public funnel & interactive 5-minute DPDPA gap-scan (Scales 1–5 on Cloud Run, or Firebase CDN) |
| **BFF API Engine**   | `axiom-bff`              | `http://localhost:4000`  | Execution gate, auth, approval token issuance, kill switch (Scales 1–10 on Cloud Run)          |
| **Agent Runtime**    | `axiom-agent-runtime`    | `http://localhost:8000`  | 10 named compliance agents: Drishti, Sudhaar, etc. (Scales 1–5 on Cloud Run)                   |
| **Model Gateway**    | `axiom-model-gateway`    | `http://localhost:8001`  | PII redactor (Presidio + regex) & LLM router (Scales 1–5 on Cloud Run)                         |
| **Temporal UI**      | `axiom-temporal-ui`      | `http://localhost:8233`  | Durable workflow state machine visualizer                                                      |
| **Temporal Server**  | `axiom-temporal`         | `localhost:7233`         | gRPC orchestration engine                                                                      |
| **Supabase Studio**  | `axiom-supabase-studio`  | `http://localhost:55323` | Database inspection, tables, and SQL editor                                                    |
| **Supabase Gateway** | `axiom-supabase-gateway` | `http://localhost:55321` | Kong API gateway & Supabase REST                                                               |

---

## 2. Prerequisites & Pre-flight Setup

Ensure your administrative workstation or deployment bastion has the following tools installed:

```bash
# Verify CLI installations
gcloud --version        # Google Cloud SDK (>= 470.0.0)
terraform version       # HashiCorp Terraform (>= 1.5.0)
docker --version         # Docker Engine / Desktop with Compose v2
pnpm --version           # PNPM (>= 9.12.0)
node --version           # Node.js (>= 20.11.0, recommended 22 LTS)
uv --version             # Astral uv Python package installer
firebase --version       # Firebase CLI (or run via npx)
jq --version             # Command-line JSON processor
```

### Initializing GCP Project & Identity

```bash
export GCP_PROJECT_ID="axiom-proof"
export GCP_REGION="asia-south1"

# 1. Login to Google Cloud
gcloud auth login
gcloud config set project "${GCP_PROJECT_ID}"

# 2. Configure Application Default Credentials
gcloud auth application-default login

# 3. Enable Required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  vpcaccess.googleapis.com \
  compute.googleapis.com \
  servicenetworking.googleapis.com
```

---

## 3. Step-by-Step Terraform Provisioning

The Terraform configuration at `infra/terraform/envs/preprod` establishes the entire regional infrastructure in `asia-south1`.

### Step 3.1: Configure Variables

```bash
cd "infra/terraform/envs/preprod"

# Copy the variable definitions template
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your project credentials:

```hcl
project_id             = "axiom-proof"
region                 = "asia-south1"
environment            = "preprod"
cloud_sql_tier         = "db-custom-2-7680" # Or db-f1-micro for cost optimization

# Upstash Redis
upstash_redis_url = "rediss://default:YOUR_TOKEN@your-endpoint.upstash.io:6379"

# Temporal Cloud GCP Subscription
temporal_address   = "axiom-proof.tmprl.cloud:7233"
temporal_namespace = "axiom-proof"
temporal_api_key   = "your-temporal-api-key"

# Agent Models Fallback Priority (Anthropic -> OpenAI -> Gemini)
anthropic_api_key = "sk-ant-api03-..."
openai_api_key    = "sk-proj-..."
gemini_api_key    = "AIzaSy..."

# Sovereign Security Tokens
approval_signing_key         = "your-32-character-minimum-hmac-signing-key"
agent_runtime_internal_token = "your-preprod-agent-runtime-token"
model_gateway_api_key        = "your-preprod-model-gateway-token"
```

### Step 3.2: Initialize & Apply Infrastructure

```bash
terraform init -upgrade
terraform plan -out=preprod.tfplan
terraform apply preprod.tfplan
```

### Step 3.3: Capture Terraform Outputs

```bash
export CLOUD_SQL_IP=$(terraform output -raw cloud_sql_public_ip)
export EVIDENCE_BUCKET=$(terraform output -raw evidence_vault_bucket)
export ARTIFACT_REPO=$(terraform output -raw artifact_registry_repo)
export BFF_URL=$(terraform output -raw bff_url)
export WEB_URL=$(terraform output -raw web_url)
export DB_PASSWORD=$(terraform output -raw db_password)
export GCS_S3_ENDPOINT=$(terraform output -raw gcs_s3_endpoint)
export GCS_HMAC_ACCESS_ID=$(terraform output -raw gcs_hmac_access_id)
cd -
```

### Step 3.4: Google Cloud Storage as S3 WORM Storage Architecture

To satisfy **Hard Rule 4** and statutory DPDPA auditability requirements (Section 8(4) and Rule 10 retention mandates), the Evidence Vault utilizes **Google Cloud Storage with WORM (Write Once, Read Many) Bucket Lock**, exposed via the S3-compatible XML API:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Axiom Proof Evidence Vault                         │
│             Google Cloud Storage in Mumbai (asia-south1)                │
└─────────────────────────────────────────────────────────────────────────┘
        │                                                  │
        │ S3 XML API: https://storage.googleapis.com       │ HMAC Credentials
        │ (Standard S3Client in TS / boto3 in Python)      │ (GOOG... Access ID & Secret)
        ▼                                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              GCS Bucket: axiom-proof-evidence-preprod-*                 │
│  ├─ Location: asia-south1 (Domestic Indian Residency)                   │
│  ├─ Uniform Bucket-Level Access: Enforced                              │
│  ├─ Versioning: Enabled                                                 │
│  ├─ Object Retention Lock: Enabled (enable_object_retention = true)      │
│  ├─ Bucket Lock (WORM): Retention Period = 7 Years (2555 Days)          │
│  └─ Storage Lifecycle: Transitions to ARCHIVE after retention period    │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Key Guarantees & Implementation:

1. **Cryptographic WORM Immutability**:
   - GCS Bucket Lock retention policy guarantees that once an evidence object is written (keyed by `sha256(content)`), it cannot be modified, overwritten, or deleted by any principal (including project owners, administrators, or service accounts) during the retention window.
2. **S3 Interoperability XML API**:
   - Cloud Run microservices connect to `https://storage.googleapis.com` using standard AWS S3 client libraries (`@aws-sdk/client-s3` in TypeScript, `boto3` in Python).
   - Authentication is backed by a dedicated GCP Service Account (`axiom-preprod-storage-sa`) with a generated HMAC key pair (`google_storage_hmac_key`).
   - HMAC credentials are automatically deposited into Google Secret Manager and mounted into `axiom-bff` and `axiom-agent-runtime`.
3. **Multi-Cloud Client Layer (`@axiom/evidence` & `axiom.evidence_client`)**:
   - When `S3_ENDPOINT` points to `storage.googleapis.com`, the runtime automatically targets GCS S3 interoperability.
   - Immutability is enforced natively by the GCS bucket retention lock without sending unsupported AWS-specific request headers (`x-amz-object-lock-*`), providing seamless portability between AWS S3 Object Lock and Google Cloud Storage Bucket Lock.

---

## 4. Cloud SQL PostgreSQL Database Migrations & Seeding

Cloud SQL requires bootstrap initialization to configure roles (`anon`, `authenticated`, `service_role`, `ledger_writer`) and cryptographic extensions (`pgcrypto`, `uuid-ossp`) before applying the 7 sequential migrations.

```bash
export DATABASE_URL="postgresql://axiom_admin:${DB_PASSWORD}@${CLOUD_SQL_IP}:5432/axiom_proof_preprod"

# Execute all migrations and control library seed
./scripts/migrate-cloudsql.sh "${DATABASE_URL}"
```

This applies:

1. `0000_bootstrap_roles_and_extensions.sql` (Sovereign roles & pgcrypto)
2. `0001_init_tenants_users.sql` (Multi-tenant foundation, users, engagements)
3. `0002_control_library.sql` (Statutory control library schemas)
4. `0003_assessments_findings.sql` (Parikshan findings & risk scoring)
5. `0004_remediation_actions.sql` (Sudhaar blueprints & rollbacks)
6. `0005_approvals_ledger.sql` (Cryptographic append-only audit ledger)
7. `0006_ledger_role_and_extras.sql` (Security definer `append_ledger()`)
8. `0007_storage_buckets_and_policies.sql` (Storage schemas)
9. Statutory seed of all 46 DPDPA controls (`pnpm seed:controls`).

---

## 5. Building & Pushing Container Images to Google Artifact Registry

All 6 microservices utilize multi-stage Docker builds for minimal container sizes and fast startup times on Cloud Run:

```bash
# Authenticate Docker with Google Artifact Registry in Mumbai
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet

# Build and push all 6 images
PUSH_IMAGES=true ./scripts/build-preprod-images.sh "${GCP_PROJECT_ID}" "${GCP_REGION}" "preprod"
```

Images built and pushed:

- `asia-south1-docker.pkg.dev/axiom-proof/axiom-proof-preprod/axiom-bff:preprod`
- `asia-south1-docker.pkg.dev/axiom-proof/axiom-proof-preprod/axiom-web:preprod`
- `asia-south1-docker.pkg.dev/axiom-proof/axiom-proof-preprod/axiom-agent-runtime:preprod`
- `asia-south1-docker.pkg.dev/axiom-proof/axiom-proof-preprod/axiom-model-gateway:preprod`
- `asia-south1-docker.pkg.dev/axiom-proof/axiom-proof-preprod/axiom-temporal-worker:preprod`
- `asia-south1-docker.pkg.dev/axiom-proof/axiom-proof-preprod/axiom-marketing:preprod`

---

## 6. Deploying Public Marketing Site to Google Firebase Static Hosting

The public-facing marketing site (`apps/marketing`) is deployed to **Google Firebase Static Hosting** integrated directly with GCP project `axiom-proof` for global CDN edge delivery with zero compute costs and sub-50ms TTFB.

### Firebase Project Integration with GCP

Firebase is enabled directly on the existing GCP project `axiom-proof`:

```bash
# Integrate Firebase into the GCP project (if not already enabled in console)
firebase projects:addfirebase axiom-proof
```

```bash
# 1. Login to Firebase CLI
firebase login

# 2. Build static export and deploy to Firebase site: axiom-proof
./scripts/deploy-firebase-marketing.sh "${GCP_PROJECT_ID}"
```

Under the hood, this executes:

- `NEXT_OUTPUT=export pnpm --filter @axiom/marketing build:export`
- Exports 12 pre-rendered pages to `apps/marketing/out`
- Deploys static assets, security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`), clean URLs, and SSL certificates to `https://axiom-proof.web.app` and `https://axiom-proof.firebaseapp.com`.

---

## 7. Multi-Model Fallback Chain for Statutory Agents

Axiom Proof enforces statutory separation between compute and LLM intelligence. Raw prompt values NEVER leave the sovereign boundary unredacted.

### Fallback Hierarchy & Egress Invariant

```
Prompt -> Presidio PII Redactor (Aadhaar, PAN, Phone, Email scrubbed)
       -> 1. Anthropic (Claude 3.5 Sonnet / Haiku via ANTHROPIC_API_KEY)
            ↓ (On rate-limit / timeout / 5xx)
       -> 2. OpenAI (GPT-4o / GPT-4o-mini via OPENAI_API_KEY)
            ↓ (On secondary error / quota exhaustion)
       -> 3. Google Gemini (Gemini 2.0 Flash / 1.5 Pro via GEMINI_API_KEY)
            ↓ (Offline / test resilience)
       -> 4. Deterministic Synthetic Stub (Preserves Zero Downtime)
```

### Self-Hosted Model Gateway Roadmap (Phase 2+)

In later phases, self-hosted open-weights models (e.g. `Qwen/Qwen2.5-32B-Instruct-AWQ`) will be hosted on GKE GPU nodes (`g2-standard-8` with NVIDIA L4 GPUs) in `asia-south1`. The Model Gateway configuration already supports switching to self-hosted compute simply by setting `SELF_HOSTED_BASE_URL=http://vllm-service:8000/v1`.

---

## 8. Executing the 100% Non-Hardcoded Live Functional Flow

To verify that the preprod environment is completely functional without any hardcoded data, execute the automated end-to-end dynamic functional flow runner:

```bash
./scripts/run-preprod-flow.sh "${BFF_URL}"
```

### The 14-Step Statutory Verification Lifecycle

1. **Dynamic User Creation**: Dynamically generates unique random timestamp and credentials, creating a Compliance Officer account in the database.
2. **JWT Authentication**: Exchanges user credentials for a valid JWT access token.
3. **Organization Onboarding**: Dynamically onboards a fresh organization (e.g., `Bharat FinTech Sovereign 4821`) and registers 2 data stores in `asia-south1` (Cloud SQL PG ledger + GCS KYC vault).
4. **Drishti Discovery**: Scans systems for personal data, verifying that all repositories reside within the `asia-south1` domestic boundary.
5. **Vibhaag Categorization**: Classifies ingested fields into the 9 statutory DPDPA categories.
6. **Parikshan Assessment**: Evaluates the organization across all 46 controls, computing the baseline posture score.
7. **Sudhaar Blueprinting**: Generates an actionable remediation blueprint with explicit blast-radius calculations and rollback snapshots (enforcing `can_mutate = false`).
8. **Human Approval Gate (BR-2)**: Simulates the compliance officer review, verifies dry-run simulation results and validated snapshot rollbacks, and issues an HMAC-SHA256 scope-bound approval token.
9. **Karya Execution**: Token-gated mutating engine validates the cryptographic token signature and executes approved remediations.
10. **Saakshi Sealing**: Cryptographically seals compliance evidence into the GCS Evidence Vault (WORM Compliance mode) and computes canonical SHA-256 hashes.
11. **Nazar Watchdog**: Scans MeitY and Data Protection Board gazette notices for regulatory changes.
12. **Sanket Monitoring**: Evaluates real-time breach signals and threat telemetry across BFSI and Fintech sectors.
13. **Prativedan Reporting**: Compiles the executive Board pack and DPB auditor compliance dossier.
14. **Lekha Hash Chain Verification**: Verifies the unbroken cryptographic Merkle hash chain on the immutable audit ledger.

---

## 9. Web Workbench Inspection & Verification URLs

Once the flow finishes, inspect the live results in the Web Workbench:

- **Compliance Posture Dashboard:** `https://${WEB_URL}/dashboard`
- **Human Approval Console:** `https://${WEB_URL}/approval`
- **Evidence Vault Explorer:** `https://${WEB_URL}/evidence`
- **Immutable Audit Ledger:** `https://${WEB_URL}/ledger`
- **Executive Board Reports:** `https://${WEB_URL}/reports`
- **Agent Interactive Workbench:** `https://${WEB_URL}/workbench`

---

## 10. Observability, Logging & Troubleshooting Runbook

### Viewing Cloud Run Microservice Logs

```bash
# Stream BFF API logs
gcloud run services logs read axiom-bff-preprod --region asia-south1 --limit 50 --follow

# Stream Agent Runtime logs
gcloud run services logs read axiom-agent-runtime-preprod --region asia-south1 --limit 50 --follow

# Stream Model Gateway routing and failover logs
gcloud run services logs read axiom-model-gateway-preprod --region asia-south1 --limit 50 --follow
```

### Investigating PII Redaction Audit Logs

Every request passing through `axiom-model-gateway` logs its redaction statistics in structured JSON:

```json
{
  "event": "model_gateway.route_decision",
  "task": "reasoning",
  "provider": "anthropic",
  "model": "anthropic/claude-3-5-sonnet-20241022",
  "pii_redacted": true,
  "redactions": { "AADHAAR": 2, "PAN": 1, "PHONE": 1 },
  "correlation_id": "corr-preprod-1726321900"
}
```

### Verifying Audit Ledger Integrity

To verify that the audit ledger has not been tampered with:

```bash
curl -s -X POST "${BFF_URL}/v1/ledger/verify" \
  -H "Authorization: Bearer ${JWT}" \
  -H "X-Tenant-Id: ${TENANT_ID}" | jq .
```

Expected response:

```json
{
  "valid": true,
  "total_records": 18,
  "merkle_root": "a7f4b82c9e1...",
  "verified_at": "2026-09-14T20:20:00Z"
}
```

---

## 11. One-Command Full Preprod Deployment

To run the full deployment pipeline end-to-end:

```bash
# Full deployment orchestration launcher
./scripts/deploy-preprod-gcp.sh "axiom-proof" "asia-south1"
```
