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
