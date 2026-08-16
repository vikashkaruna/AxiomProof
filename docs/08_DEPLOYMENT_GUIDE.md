# Axiom Proof — Deployment Guide

This document is the complete, end-to-end guide to deploying Axiom
Proof to production. It covers:

1. Architecture recap
2. Prerequisites
3. AWS infrastructure provisioning (Terraform)
4. Supabase project setup
5. Storage bucket provisioning (S3 with Object Lock)
6. Container image build + push
7. Kubernetes deployment (Helm)
8. Domain + DNS + TLS
9. Smoke tests + verification
10. Operational runbook

Target environment: AWS `ap-south-1` (Mumbai), single-CSP consolidation
per Doc 06.

---

## 1. Architecture recap

The production deployment is a layered, single-CSP architecture:

```
                         Internet
                            │
                            ▼
              ┌─────────────────────────┐
              │  CloudFront / ALB / ACM │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │  EKS ap-south-1          │
              │                         │
              │  • web (Next.js)        │
              │  • marketing (Next.js)  │
              │  • bff (Hono/Node)      │
              │  • agent-runtime (Py)   │
              │  • model-gateway (Py)   │
              │  • vllm (GPU, optional) │
              │  • temporal-worker (Py) │
              └─┬──────┬──────┬──────┬──┘
                │      │      │      │
        ┌───────▼┐  ┌──▼───┐ ┌▼────┐ ┌▼────────┐
        │Supabase│  │S3+   │ │Valkey│ │Temporal │
        │(Postgres│ │Object│ │Elasti│ │Cloud    │
        │+Auth+  │ │Lock  │ │Cache │ │ap-south │
        │Storage)│ │      │ │      │ │         │
        └────────┘  └─────┘ └──────┘ └─────────┘
              ap-south-1
```

The control plane is the Next.js apps + BFF. The data plane is the
agent runtime + model gateway + S3 + Supabase. Both run in the same
EKS cluster but in different NetworkPolicies (default-deny with
explicit allow).

---

## 2. Prerequisites

### 2.1 Tooling

- `terraform` ≥ 1.7
- `kubectl` ≥ 1.29
- `helm` ≥ 3.13
- `pnpm` ≥ 9.12
- `uv` (Python package manager) ≥ 0.4
- `aws` CLI ≥ 2.13
- `docker` ≥ 24
- `supabase` CLI ≥ 1.200

### 2.2 Accounts

- **AWS** — account with permissions for EKS, S3, ElastiCache, KMS,
  Secrets Manager, IAM.
- **Supabase** — a Pro or Team plan project in `ap-south-1` (Mumbai).
- **Temporal Cloud** — namespace `axiom-proof` in `ap-south-1`.
  Free tier supports Phase 0/1 load.
- **GitHub** — repo access for the image registry (`ghcr.io`).

### 2.3 Domain + DNS

- `axiomminds.ai` (or your custom domain) with DNSSEC enabled.
- A subdomain `app.axiomminds.ai` for the product app.

---

## 3. AWS infrastructure provisioning

### 3.1 Bootstrap the state backend

In a separate one-time `terraform init` (or via the AWS console),
create:

- An S3 bucket for Terraform state, with versioning + cross-region
  replication for DR.
- A DynamoDB table for state locking.
- A KMS key for encrypting the state.

```bash
# These commands run ONCE per AWS account, not in the main stack.
aws s3api create-bucket \
  --bucket axiom-proof-terraform-state-ap-south-1 \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

aws s3api put-bucket-versioning \
  --bucket axiom-proof-terraform-state-ap-south-1 \
  --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name axiom-proof-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

### 3.2 Configure the backend

Uncomment and configure the `backend "s3"` block in
`infra/terraform/envs/prod/providers.tf` with the bucket / table
names from §3.1.

### 3.3 Plan + apply

```bash
cd infra/terraform/envs/prod

terraform init

# Set the variables you need (see variables.tf). Most have safe defaults.
export TF_VAR_cluster_name=axiom-proof-prod

terraform plan -out=tfplan
# Review the plan carefully. Look for unexpected changes.
terraform apply tfplan
```

This provisions:

- VPC with 3 public + 3 private subnets across 3 AZs
- EKS cluster with Fargate profiles (axiom-proof namespace) and a
  GPU node group (for the self-hosted vLLM)
- ElastiCache for Valkey (HA, 2 nodes)
- S3 evidence bucket with Object Lock Compliance mode
- KMS keys for EKS secrets + S3 evidence
- Secrets Manager entries (empty, populated in §5)
- IAM roles for IRSA

Outputs (sensitive):

- `eks_cluster_name`
- `eks_cluster_endpoint`
- `evidence_bucket`
- `redis_endpoint`

### 3.4 Configure kubectl

```bash
aws eks update-kubeconfig \
  --region ap-south-1 \
  --name axiom-proof-prod

kubectl get nodes  # should show the system + GPU managed node groups
```

---

## 4. Supabase project setup

### 4.1 Create the project

1. Sign in to [supabase.com/dashboard](https://supabase.com/dashboard).
2. Create a new project:
   - **Region:** Mumbai (ap-south-1)
   - **Name:** axiom-proof
   - **Database password:** generate a 64-char random password,
     store in `axiom-proof/supabase` secret.
3. Capture:
   - Project URL (`https://<ref>.supabase.co`)
   - Anon key (public)
   - Service-role key (server-side only — store in Secrets Manager)

### 4.2 Run the migrations

The migrations are in `infra/supabase/migrations/`. Apply them in
order:

```bash
# Install the Supabase CLI if not already
brew install supabase/tap/supabase

# Link the project (one-time)
supabase link --project-ref <ref>

# Push the migrations
supabase db push
```

This creates:

- All tables (tenants, users, controls, engagements, plans, actions,
  approval_tokens, audit_ledger, evidence, ...)
- All RLS policies
- The `append_ledger()` and `verify_ledger()` Postgres functions
- The `ledger_writer` role (no DELETE/UPDATE on the audit_ledger)
- Storage buckets (tenant-logos, report-attachments, marketing)

### 4.3 Seed the control library

```bash
cd <repo-root>
pnpm seed:controls
```

This inserts the v0.1.0 library (43 controls) into the `controls`
and `control_libraries` tables.

### 4.4 Configure auth

In the Supabase dashboard, **Authentication → Providers → Email**:

- Enable email provider
- Disable "Confirm email" (we send our own confirmation via
  Supabase Auth's email template)
- Set the site URL to `https://app.axiomminds.ai`
- Set the redirect URL to `https://app.axiomminds.ai/login`

For MFA, **Authentication → Multi-Factor**:

- Enable TOTP
- **Do not** require MFA at signup; the BFF enforces MFA for any
  user with the `approver` role.

---

## 5. Storage bucket provisioning

The S3 bucket is created by Terraform in §3.3. The agent runtime
uses IRSA to assume a role that grants the required permissions.

### 5.1 Verify Object Lock

```bash
aws s3api get-object-lock-configuration \
  --bucket axiom-proof-evidence-ap-south-1 \
  --region ap-south-1
```

Expected output includes `"ObjectLockEnabled": "Enabled"` and a
rule with `Mode: COMPLIANCE`.

### 5.2 Seed Secrets Manager

```bash
# Store the Supabase URL + keys
aws secretsmanager put-secret-value \
  --secret-id axiom-proof/supabase \
  --secret-string '{
    "url": "https://<ref>.supabase.co",
    "anon-key": "<anon-key>",
    "service-key": "<service-role-key>"
  }' \
  --region ap-south-1

# Generate and store the approval signing key
APPROVAL_KEY=$(openssl rand -hex 32)
aws secretsmanager put-secret-value \
  --secret-id axiom-proof/internal \
  --secret-string "{
    \"approval-key\": \"$APPROVAL_KEY\",
    \"agent-runtime-token\": \"$(openssl rand -hex 32)\",
    \"model-gateway-key\": \"$(openssl rand -hex 32)\"
  }" \
  --region ap-south-1

# Store the Temporal Cloud API key
aws secretsmanager put-secret-value \
  --secret-id axiom-proof/temporal \
  --secret-string '{"api-key": "<your-temporal-api-key>"}' \
  --region ap-south-1
```

### 5.3 Mount secrets to EKS

The Helm chart in `infra/helm/axiom-proof/` expects a Kubernetes
secret named `{{ include "axiom-proof.fullname" . }}-supabase`,
`...-internal`, `...-temporal`. We use the [AWS Secrets Manager
CSI driver](https://docs.aws.amazon.com/secrets-manager/latest/userguide/integrating_csi.html)
or the [External Secrets Operator](https://external-secrets.io/).

**External Secrets Operator** is recommended. Install it:

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets --create-namespace
```

Then create a `SecretStore` (saved to `infra/k8s/base/secretstore.yaml`):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: axiom-proof
spec:
  provider:
    aws:
      service: SecretsManager
      region: ap-south-1
      auth:
        jwt:
          serviceAccountRef:
            name: axiom-proof
```

And `ExternalSecret` resources (saved to
`infra/k8s/base/external-secrets.yaml`) that mirror each AWS secret
into a Kubernetes secret.

---

## 6. Container image build + push

### 6.1 GitHub Container Registry

The Helm chart expects images at
`ghcr.io/axiom-minds/axiom-{component}:{tag}`. We build 5 images:

- `axiom-web` — Next.js product app
- `axiom-marketing` — Next.js marketing site
- `axiom-bff` — Hono/Node BFF
- `axiom-agent-runtime` — Python FastAPI agent runtime
- `axiom-model-gateway` — Python FastAPI model gateway
- `axiom-temporal-worker` — Python Temporal worker (Phase 2+)

### 6.2 Build and push

```bash
# Log in to ghcr.io (one-time)
echo $GITHUB_TOKEN | docker login ghcr.io -u <your-username> --password-stdin

# Build all images
export IMAGE_TAG=$(git rev-parse --short HEAD)
for component in web marketing bff agent-runtime model-gateway; do
  docker build \
    -f infra/docker/Dockerfile.${component} \
    -t ghcr.io/axiom-minds/axiom-${component}:${IMAGE_TAG} \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    .
  docker push ghcr.io/axiom-minds/axiom-${component}:${IMAGE_TAG}
done
```

For production, also tag with the semver:

```bash
docker tag ghcr.io/axiom-minds/axiom-bff:${IMAGE_TAG} ghcr.io/axiom-minds/axiom-bff:0.1.0
docker push ghcr.io/axiom-minds/axiom-bff:0.1.0
```

---

## 7. Kubernetes deployment (Helm)

### 7.1 Install ingress + cert-manager

```bash
# NGINX ingress controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# cert-manager (for automatic Let's Encrypt TLS)
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

# ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@axiomminds.ai
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 7.2 Create the namespace

```bash
kubectl create namespace axiom-proof
```

### 7.3 Install the Helm chart

```bash
helm install axiom-proof ./infra/helm/axiom-proof \
  --namespace axiom-proof \
  --values infra/helm/axiom-proof/values.yaml \
  --values infra/helm/axiom-proof/values-prod.yaml \
  --set image.tag=${IMAGE_TAG} \
  --set config.supabaseUrl=<your-supabase-url> \
  --wait
```

Verify the rollout:

```bash
kubectl -n axiom-proof get pods
# All pods should be Running within 2-3 minutes.
```

### 7.4 Verify the service mesh

```bash
kubectl -n axiom-proof get svc
# Should list: axiom-proof-web, axiom-proof-marketing, axiom-proof-bff,
# axiom-proof-agent-runtime, axiom-proof-model-gateway.
```

---

## 8. Domain + DNS + TLS

### 8.1 DNS

Point the domain's A/AAAA records at the NGINX ingress controller's
external IP:

```bash
INGRESS_IP=$(kubectl -n ingress-nginx get svc ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# At your DNS provider, create:
axiomminds.ai        A    $INGRESS_IP
app.axiomminds.ai    A    $INGRESS_IP
```

### 8.2 TLS

The ingress-nginx + cert-manager combination auto-issues Let's Encrypt
certificates. The Helm chart's `tls.secretName` references the
cert-manager-generated secret.

To verify:

```bash
kubectl -n axiom-proof get ingress axiom-proof -o yaml
# Status should show the cert-manager issued cert.
```

---

## 9. Smoke tests + verification

### 9.1 Health checks

```bash
# Marketing site
curl -fsS https://axiomminds.ai/ -o /dev/null -w "%{http_code}\n"
# Expected: 200

# App
curl -fsS https://app.axiomminds.ai/ -o /dev/null -w "%{http_code}\n"
# Expected: 200

# BFF health (port-forwarded for direct check)
kubectl -n axiom-proof port-forward svc/axiom-proof-bff 4000:4000 &
curl -fsS http://localhost:4000/health
# Expected: {"status":"ok","timestamp":"..."}

# Agent runtime
kubectl -n axiom-proof port-forward svc/axiom-proof-agent-runtime 8000:8000 &
curl -fsS http://localhost:8000/ready
# Expected: {"status":"ready","gateway_healthy":true,...}

# Model gateway
kubectl -n axiom-proof port-forward svc/axiom-proof-model-gateway 8001:8001 &
curl -fsS http://localhost:8001/ready
# Expected: {"status":"ready","providers":{...},"redaction_enabled":true}
```

### 9.2 End-to-end gap-scan

1. Open https://axiomminds.ai in a browser.
2. Click "Run the free 5-min gap-scan".
3. Fill out the form (sector, size, 12 questions, contact info).
4. Submit. You should see a report with a posture score, top
   recommendations, and the full findings table.
5. Verify the report's `id` appears in the Supabase
   `gap_scan_responses` table.

### 9.3 Approval flow

1. Create a test engagement via the Supabase dashboard
   (insert into `engagements`).
2. Run Parikshan via the agent runtime: `curl -X POST
http://localhost:8000/agents/parikshan/invoke ...`
3. Generate a plan with Sudhaar.
4. Open the plan in the app. The dry-run / rollback / blast-radius
   cards should be visible.
5. Approve an action. The approval token should be issued and
   visible in the `approval_tokens` table.

### 9.4 Audit ledger verification

```sql
-- In Supabase SQL editor
SELECT * FROM verify_ledger('<tenant-uuid>');
-- Should return 0 rows (intact chain)
```

---

## 10. Operational runbook

### 10.1 Scaling

- BFF and agent-runtime have HPA enabled in the Helm chart
  (`minReplicas: 2, maxReplicas: 10/20`).
- To scale beyond, edit the Helm values and `helm upgrade`.
- The model gateway should scale with the agent runtime
  (1:1 request volume).

### 10.2 Logs

```bash
# Tail logs from a specific component
kubectl -n axiom-proof logs -l app.kubernetes.io/component=bff --tail=100 -f

# All components
kubectl -n axiom-proof logs -l app.kubernetes.io/part-of=axiom-proof --tail=100 -f
```

### 10.3 Engaging the kill switch

From the Approval Console (any plan page → "Engage kill switch"):

```bash
# Or via the BFF API directly
curl -X POST https://app.axiomminds.ai/api/bff/v1/kill-switch/engage \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"scope": "global", "reason": "production incident 2026-08-XX"}'
```

This halts ALL in-flight execution immediately. The action is
recorded in the audit ledger.

### 10.4 Reading the audit ledger

```sql
-- Reconstruct the full chain for a correlation ID
SELECT sequence_no, actor_type, actor_id, action_type, result, occurred_at
FROM audit_ledger
WHERE correlation_id = '<correlation-uuid>'
ORDER BY sequence_no;
```

```sql
-- Verify chain integrity for a tenant
SELECT * FROM verify_ledger('<tenant-uuid>');
-- Returns 0 rows if intact, or the first break.
```

### 10.5 Rotation of secrets

```bash
# Rotate the approval signing key
NEW_KEY=$(openssl rand -hex 32)
aws secretsmanager update-secret \
  --secret-id axiom-proof/internal \
  --secret-string "$(jq --arg k "$NEW_KEY" '.["approval-key"] = $k' \
    "$(aws secretsmanager get-secret-value --secret-id axiom-proof/internal \
       --query SecretString --output text)")" \
  --region ap-south-1

# Restart the BFF to pick up the new key
kubectl -n axiom-proof rollout restart deployment/axiom-proof-bff
```

After rotation, all previously-issued tokens become invalid (they
were signed with the old key). This is the desired property for
key compromise scenarios.

### 10.6 Backup + restore

- **Supabase** — daily logical backups (managed by Supabase), PITR
  available for 7 days.
- **S3 evidence** — versioning + cross-AZ replication, no
  point-in-time delete possible (Object Lock Compliance mode is
  WORM).
- **EKS** — stateless; all state is in Supabase or S3.

### 10.7 Disaster recovery

| Scenario                 | Recovery                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Single EKS pod crash     | Kubernetes reschedules automatically                                                                            |
| EKS node failure         | Managed node group replaces it                                                                                  |
| AZ failure               | Multi-AZ Fargate + cross-AZ S3 replication                                                                      |
| Region failure           | DR runbook (manual) — restore Supabase from backup, S3 from cross-region replication, redeploy EKS in DR region |
| Supabase data loss       | PITR (7-day)                                                                                                    |
| Evidence vault data loss | S3 versioning + cross-region replication (in `ap-south-1` only)                                                 |
| Approval key compromise  | Rotate the key (see §10.5); all outstanding tokens become invalid                                               |

---

## Appendix A — CI/CD

The repo has a `.github/workflows/` directory with:

- `ci.yml` — runs unit + integration tests on every PR
- `build-images.yml` — builds and pushes images on `main` merge
- `deploy.yml` — deploys to EKS via Helm upgrade

(These are documented but not yet committed; the `infra/`
artifacts here are the source of truth for what they should do.)

## Appendix B — Disaster Recovery

RPO ≤ 1 hour, RTO ≤ 4 hours (NFR-9). The cross-region S3 replication

- Supabase PITR + Terraform-from-scratch recovery are the safety net.

For region-failure scenarios, the recovery procedure is:

1. Re-run Terraform in the DR region with the same state file
   (the S3 backend is replicated).
2. Run `supabase db push` against the restored Supabase project.
3. Deploy the Helm chart.
4. Update DNS to point to the DR ingress.
5. Restore the S3 evidence bucket from the replicated state.

This is not yet automated; the runbook is the source of truth until
the automation is in place.

## Appendix C — Cost

Estimated Phase 0/1 monthly cost (Mumbai, 1 EKS cluster, low
traffic):

| Resource                                                   | Monthly (USD) |
| ---------------------------------------------------------- | ------------- |
| EKS control plane                                          | 73            |
| Fargate (BFF + agent runtime + model gateway, low traffic) | 100–300       |
| S3 evidence (1 TB, IA)                                     | 25            |
| Supabase Pro                                               | 25            |
| Temporal Cloud                                             | 25–100        |
| ElastiCache (cache.r6g.large × 2)                          | 200           |
| KMS                                                        | 5             |
| Secrets Manager                                            | 5             |
| CloudWatch logs (30-day retention)                         | 20            |
| Route 53 + ACM                                             | 5             |
| **Total**                                                  | **~480–760**  |

Phase 3+ (Karya executing real remediation) will add significant
cost for the GPU node group and per-tenant approval key storage.
The Model Gateway's per-tenant cost attribution (NFR-11) tracks
LLM spend; the dashboard shows it per client.
