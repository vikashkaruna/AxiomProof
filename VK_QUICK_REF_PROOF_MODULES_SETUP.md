# Axiom Proof — Modules Setup Quick Reference

This guide covers local development, full local/on-premise deployment, and production prerequisites for Axiom Proof.

Authoritative references:

- [Deployment guide](docs/08_DEPLOYMENT_GUIDE.md)
- [Operational runbook](docs/09_RUNBOOK.md)
- [Docker Compose](docker-compose.yml)
- [Production Helm values](infra/helm/axiom-proof/values-prod.yaml.example)
- [Production Terraform](infra/terraform/envs/prod/)

## 1. Modules and dependencies

| Module              |          Port | Primary dependencies                           |
| ------------------- | ------------: | ---------------------------------------------- |
| Marketing site      |          3000 | Supabase                                       |
| Web workbench       |          3001 | Supabase, BFF                                  |
| BFF/API             |          4000 | Supabase, Agent Runtime                        |
| Agent Runtime       |          8000 | Supabase, Model Gateway, S3-compatible storage |
| Model Gateway       |          8001 | PII redaction, self-hosted model or Bedrock    |
| Temporal Server     |          7233 | Temporal PostgreSQL                            |
| Temporal UI         |          8233 | Temporal Server                                |
| Temporal Worker     |             — | Temporal, Agent Runtime                        |
| Supabase API        |   55321 local | PostgreSQL                                     |
| Supabase PostgreSQL |   55322 local | Supabase                                       |
| Supabase Studio     |   55323 local | Supabase                                       |
| Valkey/Redis        | 6379 normally | Optional model cache                           |

The ten agents are:

1. Drishti — discovery
2. Vibhaag — classification
3. Parikshan — assessment
4. Saakshi — evidence
5. Sudhaar — remediation planning
6. Karya — execution gate
7. Lekha — ledger
8. Nazar — regulatory monitoring
9. Prativedan — reporting
10. Sanket — external/regulatory research

## 2. Local prerequisites

Install Docker Desktop or Docker Engine with Compose v2, Node.js 22 LTS or newer, pnpm 9.12+, Python 3.11, uv, the Supabase CLI, curl, jq, and openssl. Install kubectl, Helm, and Terraform only if deployment testing is required.

Verify:

```bash
node --version
pnpm --version
python3 --version
uv --version
docker --version
supabase --version
```

Install JavaScript dependencies:

```bash
cd "/Users/vikash/Axiom Proof"
pnpm install
```

## 3. Local Supabase setup

Start Supabase:

```bash
cd "/Users/vikash/Axiom Proof/infra/supabase"
supabase start
supabase status
```

Important local endpoints:

```text
API:    http://127.0.0.1:55321
DB:     postgresql://postgres:postgres@127.0.0.1:55322/postgres
Studio: http://127.0.0.1:55323
SMTP:   http://127.0.0.1:55324
```

Apply schema and seed data:

```bash
cd "/Users/vikash/Axiom Proof"
pnpm db:migrate
pnpm seed:controls
pnpm tsx scripts/build-controls-json.mjs
```

The seed creates this demo tenant:

```text
Tenant slug: demo-client
Tenant ID:   00000000-0000-0000-0000-000000000001
```

Create a local Supabase Auth user through Studio or the Auth API. To make a user an internal founder for local administration:

```sql
UPDATE public.users
SET is_axiom_internal = true
WHERE email = 'founder@axiomminds.ai';
```

## 4. Local environment configuration

Create the local Docker environment file:

```bash
cp infra/docker/environments/.env.local.example \
   infra/docker/environments/.env.local
```

Important local values:

```dotenv
ENVIRONMENT=development
NODE_ENV=development

NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>

SUPABASE_URL=http://host.docker.internal:55321
SUPABASE_SERVICE_KEY=<local-service-role-key>
SUPABASE_DB_URL=postgresql://postgres:postgres@host.docker.internal:55322/postgres

BFF_URL=http://bff:4000
AGENT_RUNTIME_URL=http://agent-runtime:8000
MODEL_GATEWAY_URL=http://model-gateway:8001

TEMPORAL_ADDRESS=temporal:7233
TEMPORAL_NAMESPACE=axiom-proof
TEMPORAL_TLS=false

APPROVAL_SIGNING_KEY=<at-least-32-character-development-secret>
AGENT_RUNTIME_INTERNAL_TOKEN=<development-internal-token>
MODEL_GATEWAY_API_KEY=<development-model-key>

AWS_REGION=ap-south-1
AWS_S3_EVIDENCE_BUCKET=axiom-proof-evidence-local
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

FEATURE_DRY_RUN_ENGINE=true
FEATURE_EXECUTION_ENGINE=true
FEATURE_LIVE_CONNECTORS=false
FEATURE_KILL_SWITCH=true

AXIOM_E2E_BYPASS_AUTH=true
```

`AXIOM_E2E_BYPASS_AUTH=true` is allowed only for local automated testing. It must be false or absent in shared, staging, preproduction, and production environments.

## 5. Start the complete local stack

From the repository root:

```bash
./scripts/dev-docker.sh --env local --build
```

Or:

```bash
pnpm docker:up
```

Check status and logs:

```bash
./scripts/dev-docker.sh --status
./scripts/dev-docker.sh --logs
./scripts/dev-docker.sh --logs agent-runtime
./scripts/dev-docker.sh --logs model-gateway
./scripts/dev-docker.sh --logs bff
```

Probe the main endpoints:

```bash
curl http://localhost:8001/health
curl http://localhost:8000/health
curl http://localhost:4000/health
curl -I http://localhost:3001
curl -I http://localhost:3000
```

Open:

```text
Marketing:  http://localhost:3000
Workbench:  http://localhost:3001
Supabase:   http://localhost:55323
Temporal:   http://localhost:8233
```

Stop the stack:

```bash
pnpm docker:down
```

## 6. Source-process development mode

```bash
pnpm --filter @axiom/bff dev
```

```bash
cd services/agent-runtime
uv sync
uv run python -m axiom
```

```bash
cd services/model-gateway
uv sync
uv run python -m model_gateway
```

```bash
cd services/temporal-workers
uv sync
uv run python -m temporal_workers.worker
```

Run the web applications:

```bash
pnpm --filter @axiom/web dev
pnpm --filter @axiom/marketing dev
```

For source-process mode, use localhost URLs:

```dotenv
AGENT_RUNTIME_URL=http://localhost:8000
MODEL_GATEWAY_URL=http://localhost:8001
BFF_URL=http://localhost:4000
TEMPORAL_ADDRESS=localhost:7233
```

## 7. Running an audit locally

The normal functional flow is:

1. Create or log into a Supabase Auth user.
2. Create or select a tenant.
3. Open the Web Workbench.
4. Create an engagement.
5. Provide discovery interview and system information.
6. Run Drishti discovery.
7. Run Vibhaag classification.
8. Run Parikshan assessment against the control library.
9. Generate a plan with Sudhaar.
10. Review findings, blast radius, dry-run output, and rollback definition.
11. Approve the plan through the approval console.
12. Verify the approval token, ledger chain, and execution status.
13. Generate or review evidence through Saakshi and Prativedan.

The execution sequence must always be:

```text
Plan → Dry run → Rollback validation → Human approval → Signed token → Execute → Verify → Ledger
```

No agent should receive write credentials. Sudhaar must remain non-mutating.

Useful BFF endpoints:

```text
GET  /health
GET  /ready
GET  /v1/engagements
POST /v1/engagements
GET  /v1/engagements/:id
GET  /v1/plans/:id
POST /v1/plans/approve
POST /v1/plans/:id/reject
POST /v1/plans/:id/execute
POST /v1/ledger/verify
GET  /v1/ledger
GET  /v1/kill-switch/status
POST /v1/kill-switch/engage
POST /v1/kill-switch/release
```

All `/v1/*` requests require:

```text
Authorization: Bearer <Supabase JWT>
X-Tenant-Id: <tenant UUID>
Idempotency-Key: <UUID for mutating requests>
```

## 8. Local/on-premise production-like setup

| Cloud dependency    | On-premise replacement                     |
| ------------------- | ------------------------------------------ |
| Supabase Cloud      | Self-hosted Supabase/PostgreSQL            |
| S3                  | MinIO or another S3-compatible store       |
| Temporal Cloud      | Temporal Server plus PostgreSQL            |
| ElastiCache Valkey  | Valkey/Redis                               |
| EKS                 | Kubernetes, k3s, RKE2, or OpenShift        |
| AWS Secrets Manager | Vault, External Secrets, or sealed secrets |
| Bedrock             | Self-hosted vLLM, TGI, or Ollama           |
| Route 53/ACM        | Internal DNS plus cert-manager/private CA  |

The on-premise topology should contain:

```text
PostgreSQL/Supabase
Temporal + Temporal PostgreSQL
MinIO with Object Lock
Valkey/Redis
Model Gateway
vLLM or equivalent model server
Agent Runtime
Temporal Worker
BFF
Web
Marketing
Ingress/reverse proxy
Centralized logs and metrics
```

For evidence storage, the S3-compatible provider must support versioning, Object Lock, Compliance retention, legal hold, audit logging, encryption at rest, and backup/replication. Do not use an ordinary filesystem as the production evidence vault.

## 9. Production prerequisites

Production is designed for AWS `ap-south-1` and requires:

- AWS account and billing configured
- VPC spanning at least three Availability Zones
- EKS cluster
- GPU node group for self-hosted inference
- Supabase production project in the India region
- S3 bucket with Object Lock Compliance mode
- KMS key for evidence and secrets encryption
- AWS Secrets Manager
- ElastiCache Valkey
- Temporal Cloud namespace
- ECR or GHCR container registry
- DNS for `axiomminds.ai`, `app.axiomminds.ai`, and `api.axiomminds.ai`
- TLS certificates, ingress controller, and cert-manager
- Centralized logs, metrics, alerting, and paging
- Backup and disaster-recovery plan
- Security review and penetration test
- Tenant retention and deletion policy

Use IAM roles for service accounts rather than static AWS access keys.

## 10. Production configuration and secrets

Store production secrets in AWS Secrets Manager or an equivalent secret manager. Do not commit `.env` files or put plaintext secrets in Helm values.

Required secrets include:

```text
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
SUPABASE_DB_URL
APPROVAL_SIGNING_KEY
AGENT_RUNTIME_INTERNAL_TOKEN
MODEL_GATEWAY_API_KEY
TEMPORAL_API_KEY
Database credentials
Valkey/Redis credentials
Model provider credentials, if applicable
```

Minimum production settings:

```dotenv
ENVIRONMENT=production
NODE_ENV=production
AWS_REGION=ap-south-1

FEATURE_DRY_RUN_ENGINE=true
FEATURE_EXECUTION_ENGINE=true
FEATURE_LIVE_CONNECTORS=false
FEATURE_KILL_SWITCH=true

AXIOM_E2E_BYPASS_AUTH=false
```

The current application variable names are `SUPABASE_DB_URL`, `AWS_S3_EVIDENCE_BUCKET`, and `TEMPORAL_ADDRESS`. Older documentation may use `DATABASE_URL`, `EVIDENCE_VAULT_BUCKET`, or `TEMPORAL_HOST_PORT`; use the names consumed by the current services.

## 11. Production deployment sequence

### 11.1 Provision infrastructure

```bash
cd infra/terraform/envs/prod

terraform init \
  -backend-config="bucket=<terraform-state-bucket>" \
  -backend-config="key=axiom-proof/prod/terraform.tfstate" \
  -backend-config="region=ap-south-1" \
  -backend-config="dynamodb_table=<terraform-lock-table>"

terraform plan -out=prod.tfplan
terraform apply prod.tfplan
```

### 11.2 Apply Supabase migrations

```bash
supabase link --project-ref <project-ref>
cd "/Users/vikash/Axiom Proof"
pnpm db:migrate
pnpm seed:controls
pnpm tsx scripts/build-controls-json.mjs
```

### 11.3 Build immutable images

```bash
TAG="prod-$(git rev-parse --short HEAD)"

docker build -f infra/docker/Dockerfile.bff -t <registry>/axiom-bff:$TAG .
docker build -f infra/docker/Dockerfile.agent-runtime -t <registry>/axiom-agent-runtime:$TAG .
docker build -f infra/docker/Dockerfile.model-gateway -t <registry>/axiom-model-gateway:$TAG .
docker build -f infra/docker/Dockerfile.temporal-worker -t <registry>/axiom-temporal-worker:$TAG .
docker build -f infra/docker/Dockerfile.web -t <registry>/axiom-web:$TAG .
docker build -f infra/docker/Dockerfile.marketing -t <registry>/axiom-marketing:$TAG .

docker push <registry>/axiom-bff:$TAG
docker push <registry>/axiom-agent-runtime:$TAG
docker push <registry>/axiom-model-gateway:$TAG
docker push <registry>/axiom-temporal-worker:$TAG
docker push <registry>/axiom-web:$TAG
docker push <registry>/axiom-marketing:$TAG
```

### 11.4 Deploy Helm release

```bash
aws eks update-kubeconfig \
  --name axiom-proof-prod \
  --region ap-south-1

helm upgrade --install axiom-proof ./infra/helm/axiom-proof \
  --namespace axiom-proof \
  --create-namespace \
  --values ./infra/helm/axiom-proof/values-prod.yaml \
  --set image.tag="$TAG"
```

Verify rollout:

```bash
kubectl -n axiom-proof get pods
kubectl -n axiom-proof get services
kubectl -n axiom-proof get ingress
kubectl -n axiom-proof rollout status deployment/axiom-proof-bff
kubectl -n axiom-proof rollout status deployment/axiom-proof-agent-runtime
kubectl -n axiom-proof rollout status deployment/axiom-proof-model-gateway
```

## 12. Production verification checklist

```bash
curl -fsS https://api.axiomminds.ai/health
curl -fsS https://api.axiomminds.ai/ready
curl -fsS https://app.axiomminds.ai/
curl -fsS https://axiomminds.ai/
```

Verify:

- `SudhaarAgent.can_mutate == false`
- `AXIOM_E2E_BYPASS_AUTH` is absent or false
- Model Gateway redaction is enabled
- Hosted-model routes always redact PII
- Raw model-provider access is impossible from application pods
- BFF-to-Agent Runtime authentication works
- mTLS is enabled for internal service traffic
- S3 Object Lock is Compliance mode
- S3 versioning is enabled
- Direct ledger inserts are denied
- `append_ledger()` is the only ledger write path
- RLS isolates tenant data
- Approval requires dry-run and validated rollback
- Kill switch works
- Temporal workers reconnect after restart
- Backups and restore procedures have been tested
- `verify_ledger('<tenant-id>')` returns no broken chain rows

Verify a tenant ledger:

```sql
SELECT *
FROM verify_ledger('<tenant-uuid>');
```

No returned rows means the chain is intact.

## 13. Current production gaps

The repository is suitable for local functional audits and approval-gated workflow testing, but it is not yet a complete production execution platform.

Remaining areas include:

- Real connector implementations and connector credentials
- Full Karya execution implementation; the current path is a Phase 0/1 stub
- Real model dispatch; the current Model Gateway has a deterministic stub dispatcher
- Complete RoPA, policy, and playbook persistence/API/UI integration
- Report PDF rendering and signed delivery
- Production mTLS and stronger internal service identity
- MFA assurance enforcement and verification
- Independent verification of production S3 Object Lock
- Production Supabase privilege and RLS verification
- External data-residency evidence
- SSO/SAML
- PagerDuty, Slack, and production alert integrations

Keep live connectors and real execution disabled until these controls are independently tested.

Recommended rollout:

```text
Local functional audit
→ Private staging
→ Production-parity preprod
→ Security, residency, and backup verification
→ Controlled pilot with execution disabled
→ Approval-only production
→ Limited connector rollout
→ Full production execution
```

## 14. End-to-End Testing & Live Verification Guide

This section provides the complete operational reference for validating Axiom Proof across all environments. It maintains strict architectural segregation among **Local Bare-Metal**, **Local Docker Compose**, **Staging/Pre-Production**, and **Production** environments.

---

### 14.1 Environment Architecture & Boundary Matrix

| Construct | Local Bare-Metal (Host) | Local Full-Stack (Docker) | Staging / Pre-Production | Production (EKS / AWS) |
| :--- | :--- | :--- | :--- | :--- |
| **`ENVIRONMENT`** | `local` | `local` or `development` | `staging` / `preprod` | `production` |
| **`NODE_ENV`** | `development` | `production` (Next.js standalone) | `production` | `production` |
| **Topology** | Host processes (`pnpm dev`, `uv`) | Docker network (`axiom-network`) | AWS Private VPC (`ap-south-1`) | AWS EKS Cluster (`ap-south-1`) |
| **Marketing Site** | `http://localhost:3000` | `http://localhost:3000` | `https://staging.axiomminds.ai` | `https://axiomminds.ai` |
| **Web Workbench** | `http://localhost:3001` | `http://localhost:3001` | `https://app-staging.axiomminds.ai` | `https://app.axiomminds.ai` |
| **BFF API Gateway** | `http://localhost:4000` | `http://localhost:4000` | `https://api-staging.axiomminds.ai` | `https://api.axiomminds.ai` |
| **Agent Runtime** | `http://localhost:8000` | `http://localhost:8000` | Internal VPC / Cluster IP | Internal VPC / Cluster IP |
| **Model Gateway** | `http://localhost:8001` | `http://localhost:8001` | Internal VPC (Self-hosted/Bedrock) | Internal VPC (Self-hosted/Bedrock) |
| **Temporal UI** | `http://localhost:8233` | `http://localhost:8233` | Temporal Cloud / Internal UI | Temporal Cloud / Internal UI |
| **Supabase DB** | `127.0.0.1:55322` | `127.0.0.1:55322` | Managed RDS / Supabase Cloud | Managed RDS / Supabase Cloud |
| **Supabase Studio**| `http://127.0.0.1:55323` | `http://127.0.0.1:55323` | Private Admin Portal / Bastion | Private Admin Portal / Bastion |
| **Email Delivery** | Stdout / Mailpit (`:55324`) | Stdout mock or live Resend key | Resend API (Verified Domain) | Resend API (Strict SPF/DKIM/DMARC)|
| **Evidence Vault** | Local FS or MinIO bucket | Local S3-compatible mock | S3 Object Lock (Governance) | S3 Object Lock (Compliance mode) |
| **Auth Bypass** | Optional (`AXIOM_E2E_BYPASS_AUTH`)| Optional for testing | Strictly `false` | Strictly `false` (Mandatory MFA) |
| **Planning Agent** | `can_mutate = False` | `can_mutate = False` | `can_mutate = False` | `can_mutate = False` (ADR-3) |
| **Audit Ledger** | Append-only function | Append-only function | `append_ledger()` SECURITY DEFINER| `append_ledger()` SECURITY DEFINER |

---

### 14.2 Automated Test Suites (Pre-CI Verification)

Execute the all-in-one pre-flight verification script before any push or deployment:

```bash
./scripts/test-local-stack.sh
```

This automated runner executes 5 sequential stages:
1. **TypeScript Workspace Tests (`pnpm test`)**: Validates types, schema contracts, control definitions, ledger canonicalization, and evidence packages across all 10 monorepo packages.
2. **Python Agent Runtime Pytest (`services/agent-runtime`)**: Executes 32 unit and integration tests verifying all 10 named agents, Sudhaar's non-mutating lock, Karya's execution gate, and the PII redactor.
3. **Python Model Gateway Pytest (`services/model-gateway`)**: Executes 14 tests verifying regex and NER redaction for Indian identifiers (Aadhaar, PAN, phone numbers, passport, voter ID), model routing, and token budget governance.
4. **Live HTTP Health Checks**: Verifies live responses from:
   - Model Gateway (`http://localhost:8001/health`)
   - Agent Runtime (`http://localhost:8000/health`)
   - BFF API (`http://localhost:4000/health`)
   - Temporal UI (`http://localhost:8233`)
   - Web Product Workbench (`http://localhost:3001`)
   - Marketing Site (`http://localhost:3000`)
5. **Playwright E2E UI Suite (`tests/e2e`)**: Validates the public gap-scan funnel, contact form email submission, trust surface, kill-switch visibility, and security headers.

To run individual sub-suites:

```bash
# TypeScript workspace tests
pnpm test

# Agent Runtime tests
cd services/agent-runtime && uv run pytest -v

# Model Gateway tests
cd services/model-gateway && uv run pytest -v

# E2E Playwright tests (headless)
cd tests/e2e && pnpm test:e2e

# E2E Playwright interactive UI runner
cd tests/e2e && pnpm exec playwright test --ui
```

---

### 14.3 Manual End-to-End Testing (Local Docker Stack)

Follow these manual steps to interactively verify the entire application in your browser.

#### Step 1: Public Marketing Funnel & Diagnostic Scan (`http://localhost:3000`)

1. **Complete the 5-Minute Gap-Scan**:
   - Open **[http://localhost:3000/#gap-scan](http://localhost:3000/#gap-scan)** in your browser.
   - **Step 1 (Profile)**: Select *Fintech & Financial Services*, choose *51–200 employees*, and click **Start assessment**.
   - **Step 2 (Diagnostic)**: Answer the 12 Yes/No questions regarding consent notices, DPO appointment, retention schedules, and grievance redressal.
   - **Step 3 (Contact Info)**: Enter name, email, and company (e.g. `Aarav Sharma`, `aarav@example.com`, `Aarav Pay`).
   - **Step 4 (Review & Submit)**: Click **Generate my report**.
   - **Verification**: The browser redirects to **`/gap-scan/report/<id>`**, displaying:
     - Overall DPDPA posture score (0–100 scale).
     - Estimated regulatory financial exposure in INR.
     - Top 5 remediation priorities ranked by risk weight.
     - Full table of 12 evaluated controls with domain, severity, and compliance badges.

2. **Test Founder Contact Form (Resend Integration)**:
   - Open **[http://localhost:3000/contact](http://localhost:3000/contact)**.
   - Fill in:
     - **Name**: `Aarav Sharma`
     - **Email**: `aarav@example.com`
     - **Company**: `Aarav Payments Pvt Ltd`
     - **Message**: `We process customer personal data across 4 states and need guidance on multilingual consent notice requirements under DPDPA 2023.`
   - Click **Send message**.
   - **Verification**:
     - Button displays a spinner with **Sending...**.
     - Form transitions to the confirmation state: *"Message sent successfully. Your message has been sent directly to Axiom Minds Private Limited's founder."*
     - In terminal, inspect stdout: `docker logs --tail 15 axiom-marketing` to see the formatted delivery log.

3. **Inspect the Agent Roster**:
   - Open **[http://localhost:3000/agents](http://localhost:3000/agents)**.
   - Verify all 10 specialized agents are listed with their compliance roles (Drishti, Vibhaag, Parikshan, Saakshi, Sudhaar, Karya, Lekha, Nazar, Prativedan, Sanket).

---

#### Step 2: Enterprise Workbench & Compliance Console (`http://localhost:3001`)

1. **Workspace Overview**:
   - Open **[http://localhost:3001/workbench](http://localhost:3001/workbench)**.
   - Verify current posture score, identified gaps count, and active compliance engagement status.

2. **Control Library Browser**:
   - Open **[http://localhost:3001/controls](http://localhost:3001/controls)**.
   - Browse the **47 DPDPA Controls** across all 9 statutory domains (`DPDPA-GOV`, `DPDPA-CNS`, `DPDPA-NOT`, `DPDPA-RCD`, `DPDPA-SEC`, `DPDPA-DSR`, `DPDPA-XBD`, `DPDPA-CHL`, `DPDPA-DAT`).
   - Click any control to view statutory citations, verification guidance, and evidence requirements.

3. **Remediation Plans & Human Approval Gate (ADR-1, BR-2)**:
   - Open **[http://localhost:3001/plans](http://localhost:3001/plans)**.
   - Inspect actions in `pending_approval` state.
   - Verify that actions require both a completed **Dry-Run Output** and a validated **Rollback Definition** before the **Approve** button activates.
   - Verify the **Emergency Kill Switch** is readily visible on the interface.

4. **Cryptographic Audit Ledger**:
   - Open **[http://localhost:3001/ledger](http://localhost:3001/ledger)**.
   - Inspect compliance events: sequence numbers, event types, timestamp, and SHA-256 current hash and previous hash chain linkage.

5. **Evidence Vault**:
   - Open **[http://localhost:3001/evidence](http://localhost:3001/evidence)**.
   - Verify tamper-proof evidence items, hash seals, and metadata.

---

#### Step 3: Temporal Durable Workflow Orchestration (`http://localhost:8233`)

1. Open **[http://localhost:8233](http://localhost:8233)** in your browser.
2. Select the **`default`** namespace.
3. Inspect background workflows:
   - Review task queues: `gap_scan_queue`, `agent_execution_queue`.
   - Click any workflow execution to inspect the event history tree, activity retries, execution times, and payload summaries.

---

#### Step 4: Supabase Studio & Database Admin (`http://127.0.0.1:55323`)

1. Open **[http://127.0.0.1:55323](http://127.0.0.1:55323)** in your browser.
2. In the **Table Editor**:
   - `controls`: View 47 immutable controls.
   - `gap_scan_responses`: View recent public submissions and scoring snapshots.
   - `audit_ledger`: View sealed compliance records and cryptographic hashes.
3. In the **SQL Editor**:
   - Run custom queries against the local schema:
     ```sql
     SELECT id, sector, employee_band, posture_score, created_at 
     FROM gap_scan_responses 
     ORDER BY created_at DESC 
     LIMIT 5;
     ```

---

### 14.4 Backend Guardrails & API Verification (Terminal / Curl)

#### 4.1 Indian PII Redaction & Data Residency (Model Gateway)
Verifies that client personal data stays in `ap-south-1` and raw Indian identifiers are stripped before reaching external LLMs:

```bash
curl -s -X POST http://localhost:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "stub-dpdpa-specialist",
    "messages": [
      {
        "role": "user",
        "content": "Verify consent for Aadhaar 3456 7890 1234, PAN ABCDE1234F, and mobile +91 98765 43210."
      }
    ],
    "tenant_id": "00000000-0000-0000-0000-000000000001"
  }' | jq -r '.choices[0].message.content'
```

*(Note: Ensure `.choices[0].message.content` is wrapped in single quotes to prevent zsh from interpreting `[0]` as a file glob pattern).*

*Expected Output*:
```text
Model Gateway received prompt with PII redacted: Verify consent for Aadhaar [REDACTED:AADHAAR], PAN [REDACTED:PAN], and mobile [REDACTED:PHONE_IN].
```

You can also query the gateway's direct completion endpoint:
```bash
curl -s -X POST http://localhost:8001/v1/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-model-gateway-key-axiom" \
  -d '{
    "prompt": "Verify consent for Aadhaar 3456 7890 1234, PAN ABCDE1234F, and mobile +91 98765 43210.",
    "task": "reasoning"
  }' | jq .
```

---

#### 4.2 Running Audits Against Target Systems (Discovery & Assessment)

Axiom Proof audits target systems using autonomous compliance agents that record all findings and decisions to the append-only ledger.

##### A. Target Discovery Audit (Drishti)
Drishti discovers data repositories (PostgreSQL, MySQL, S3 buckets, APIs), identifies personal data categories (Aadhaar, PAN, phone, email), and flags statutory escalations (e.g. cross-border transfer under Section 16).

Trigger Drishti via the BFF API:
```bash
curl -s -X POST http://localhost:4000/v1/agents/drishti/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -d '{
    "systems": [
      {
        "name": "Production Customer DB",
        "type": "postgres",
        "description": "Core database holding user credentials and KYC docs",
        "hosts_personal_data": true,
        "data_categories": ["aadhaar", "pan", "phone", "email"],
        "cross_border": false
      },
      {
        "name": "US Analytics S3 Bucket",
        "type": "s3",
        "description": "Log telemetry archive in us-east-1",
        "hosts_personal_data": true,
        "data_categories": ["ip_address", "telemetry"],
        "cross_border": true
      }
    ]
  }' | jq .
```

*Or invoke directly via the Agent Runtime (`:8000`):*
```bash
curl -s -X POST http://localhost:8000/agents/drishti/invoke \
  -H "Content-Type: application/json" \
  -H "x-internal-token: dev-agent-runtime-token-axiom" \
  -d '{
    "input": {
      "tenant_id": "00000000-0000-0000-0000-000000000001",
      "engagement_id": "00000000-0000-0000-0000-000000000001",
      "systems": [
        {
          "name": "Production Customer DB",
          "type": "postgres",
          "description": "Core database holding user credentials and KYC docs",
          "hosts_personal_data": true,
          "data_categories": ["aadhaar", "pan", "phone", "email"],
          "cross_border": false
        }
      ]
    }
  }' | jq .
```

##### B. Statutory Control Assessment Audit (Parikshan)
Parikshan audits the target against the 46 versioned DPDPA controls, computing the client's Posture Score (0-100%) and estimated statutory penalty exposure:
```bash
curl -s -X POST http://localhost:4000/v1/agents/parikshan/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -d '{
    "library_version": "0.1.0",
    "processes_children": true,
    "processes_health": false,
    "answers": {
      "DPDPA-NOT-01": {"multilingual_notice": "no"},
      "DPDPA-CON-01": {"itemised_consent": "yes"},
      "DPDPA-XBD-01": {"cross_border_blacklisted": "no"}
    }
  }' | jq .
```

---

#### 4.3 Verifying the Append-Only Audit Ledger

Every agent execution automatically appends cryptographic records to the hash chain.

##### Option 1: Web UI
Navigate to `http://localhost:3001/ledger` in your browser.
- Verify that every sequence (`#1`, `#2`, `#3`, `#4`, etc.) is displayed.
- Inspect the actor badge (`drishti`, `parikshan`), action type (`discovery.started`, `assessment.started`), execution outcome (`success`), timestamp, and the tamper-evident **ProofSeal** hash.
- Click **"Verify chain integrity"** to mathematically validate the hash chain.

##### Option 2: Direct PostgreSQL Inspection
Query the `audit_ledger` table using the schema's exact column names:
```bash
docker exec -it supabase_db_axiom-proof psql -U postgres -d postgres -c \
  "SELECT sequence_no, actor_type, actor_id, action_type, result, entry_hash, prev_entry_hash, occurred_at FROM audit_ledger WHERE tenant_id = '00000000-0000-0000-0000-000000000001' ORDER BY sequence_no DESC LIMIT 5;"
```

##### Option 3: API Verification via cURL
Trigger the cryptographic SHA-256 chain verification through the Web Proxy or directly via the BFF API:
```bash
# Via Web Next.js BFF proxy
curl -s -X POST http://localhost:3001/api/bff/v1/ledger/verify | jq .

# Directly against the BFF service
curl -s -X POST http://localhost:4000/v1/ledger/verify \
  -H "Authorization: Bearer dev-token" \
  -H "X-Tenant-Id: 00000000-0000-0000-0000-000000000001" | jq .
```
*Expected Output*:
```json
{
  "intact": true
}
```

---

#### 4.4 Mathematical Proof of Non-Tampering
Run the built-in cryptographic audit verification function in PostgreSQL:

```bash
docker exec -it supabase_db_axiom-proof psql -U postgres -d postgres -c \
  "SELECT * FROM verify_ledger('00000000-0000-0000-0000-000000000001'::uuid, 1);"
```

*Expected Output*:
```text
 sequence_no | reason 
-------------+--------
(0 rows)
```
*(Zero rows returned mathematically proves every entry's `entry_hash` and `prev_entry_hash` are unbroken).*

---

#### 4.5 Immutability Rejection Test (Attempted Tampering)
Attempt an unauthorized update on an existing ledger entry:

```bash
docker exec -it supabase_db_axiom-proof psql -U postgres -d postgres -c \
  "UPDATE audit_ledger SET detail = '{\"tampered\": true}' WHERE sequence_no = 1;"
```

*Expected Output*:
```text
ERROR:  permission denied for table audit_ledger
```
*(Or rejected by append-only rule: the DB role and triggers strictly forbid UPDATE and DELETE operations).*

---

#### 4.5 Emergency Kill-Switch Drill
Trigger an emergency halt across all running agents for a tenant:

```bash
curl -s -X POST http://localhost:4000/v1/kill-switch \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 00000000-0000-0000-0000-000000000001" \
  -d '{"reason": "Manual compliance test drill"}' | jq .
```

*Expected Output*:
```json
{
  "status": "halted",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "active_agents_stopped": 0,
  "timestamp": "..."
}
```

---

### 14.5 Staging & Production Parity Verification Checklist

Before deploying or promoting builds to private staging or production, execute this pre-flight verification:

1. **Separation of Duties (ADR-3)**:
   - Ensure `SudhaarAgent.can_mutate == False`.
   - Verify `KaryaAgent` refuses execution without a signed, scope-bound approval token issued after dry-run and rollback validation.
2. **Zero Raw PII Egress (ADR-5)**:
   - Ensure `MODEL_GATEWAY_URL` points to an `ap-south-1` deployment.
   - Verify outbound prompts strip Indian Aadhaar, PAN, phone numbers, passport, and voter IDs.
3. **Database Security & RLS**:
   - Ensure direct INSERT, UPDATE, and DELETE on `audit_ledger` are revoked for application roles.
   - Verify `append_ledger()` SECURITY DEFINER function is the sole write path.
   - Ensure Row Level Security (RLS) is enabled and active on all tenant-keyed tables.
4. **Evidence Vault Immutability**:
   - In Staging: S3 Object Lock in Governance mode.
   - In Production: S3 Object Lock in Compliance mode with multi-year retention (preventing deletion even by root).
5. **Auth & Identity**:
   - Ensure `AXIOM_E2E_BYPASS_AUTH` is strictly absent or `false`.
   - Require MFA assurance level 2 for all human approval actions.
6. **Ledger Integrity Proof**:
   - Run `SELECT * FROM verify_ledger('<tenant-uuid>');` across all active tenants. Must return 0 broken rows.


