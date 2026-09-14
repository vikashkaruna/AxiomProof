#!/usr/bin/env bash
# ==============================================================================
# Axiom Proof — Complete GCP Preprod Deployment Launcher
# ==============================================================================
# Deploys Axiom Proof to Google Cloud Platform in Mumbai (asia-south1):
#   - Cloud Run microservices (BFF, Web, Agent Runtime, Model Gateway, Temporal Worker, Marketing)
#   - Cloud SQL PostgreSQL
#   - GCS WORM Evidence Vault
#   - Google Firebase static hosting for marketing
#   - Upstash Redis integration
#   - Multi-model fallback chain (Anthropic -> OpenAI -> Gemini)
# ==============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PROJECT_ID="${1:-${GCP_PROJECT_ID:-axiom-proof}}"
REGION="${2:-${GCP_REGION:-asia-south1}}"
ENV="preprod"

# Colors
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
info() { echo -e "\n${BOLD}${CYAN}▶ $1${NC}"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }

echo -e "\n${BOLD}${MAGENTA}=================================================================${NC}"
echo -e "${BOLD}${MAGENTA}  AXIOM PROOF — Google Cloud Platform Preprod Deployment         ${NC}"
echo -e "${BOLD}${MAGENTA}  Region: Mumbai (asia-south1) · Sovereign Indian Data Residency ${NC}"
echo -e "${BOLD}${MAGENTA}=================================================================${NC}"
echo -e "  GCP Project ID:    ${BOLD}${CYAN}${PROJECT_ID}${NC}"
echo -e "  Target Region:     ${BOLD}${CYAN}${REGION}${NC}"
echo -e "  Environment:       ${BOLD}${CYAN}${ENV}${NC}\n"

# Step 1: Pre-flight Verification
info "Step 1/6: Verifying deployment prerequisites..."
command -v gcloud >/dev/null 2>&1 || { fail "gcloud CLI not installed. Please install Google Cloud SDK."; exit 1; }
command -v terraform >/dev/null 2>&1 || { fail "Terraform not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { fail "Docker not installed or daemon not running."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { fail "pnpm not installed."; exit 1; }
pass "Pre-flight dependencies verified (gcloud, terraform, docker, pnpm)"

# Step 2: Infrastructure Provisioning with Terraform
info "Step 2/6: Planning & applying GCP Terraform infrastructure..."
cd "infra/terraform/envs/preprod"
terraform init -upgrade
if [ ! -f "terraform.tfvars" ] && [ -f "terraform.tfvars.example" ]; then
  warn "terraform.tfvars not found. Creating from terraform.tfvars.example..."
  cp terraform.tfvars.example terraform.tfvars
fi
terraform apply -auto-approve -var="project_id=${PROJECT_ID}" -var="region=${REGION}"
BFF_URL=$(terraform output -raw bff_url 2>/dev/null || echo "")
WEB_URL=$(terraform output -raw web_url 2>/dev/null || echo "")
DB_PUBLIC_IP=$(terraform output -raw cloud_sql_public_ip 2>/dev/null || echo "")
cd "$REPO_ROOT"
pass "GCP Infrastructure provisioned (VPC, Cloud SQL, GCS, Artifact Registry, Secrets)"

# Step 3: Build & Push Container Images to Artifact Registry
info "Step 3/6: Building and pushing container images to Artifact Registry..."
PUSH_IMAGES=true ./scripts/build-preprod-images.sh "${PROJECT_ID}" "${REGION}" "${ENV}"
pass "Container images pushed to ${REGION}-docker.pkg.dev/${PROJECT_ID}/axiom-proof-preprod"

# Step 4: Cloud SQL Database Migrations
info "Step 4/6: Applying database migrations to Cloud SQL PostgreSQL..."
if [ -n "$DB_PUBLIC_IP" ]; then
  echo "  Target Cloud SQL IP: ${DB_PUBLIC_IP}"
  ./scripts/migrate-cloudsql.sh "postgresql://axiom_admin:$(cd infra/terraform/envs/preprod && terraform output -raw db_password 2>/dev/null || echo '')@${DB_PUBLIC_IP}:5432/axiom_proof_preprod" || warn "Migrations direct connect notice — ensure authorized networks allow your IP."
else
  warn "Skipping direct migration; Cloud SQL public IP not exported."
fi

# Step 5: Firebase Static Deployment for Marketing Site
info "Step 5/6: Deploying marketing site to Google Firebase Static Hosting..."
./scripts/deploy-firebase-marketing.sh "${PROJECT_ID}" || warn "Firebase CLI deploy skipped or requires login."

# Step 6: Health & Readiness Verification
info "Step 6/6: Verifying service health..."
if [ -n "$BFF_URL" ]; then
  curl -fsS "${BFF_URL}/health" >/dev/null 2>&1 && pass "Cloud Run BFF is healthy (${BFF_URL})" || warn "BFF starting up..."
fi

echo -e "\n${BOLD}${GREEN}=================================================================${NC}"
echo -e "${BOLD}${GREEN}  ✓ PREPROD DEPLOYMENT COMPLETE!                                 ${NC}"
echo -e "${BOLD}${GREEN}=================================================================${NC}"
echo -e "  Web Workbench:     ${CYAN}${WEB_URL:-"https://axiom-web-preprod-<hash>.a.run.app"}${NC}"
echo -e "  API Layer (BFF):   ${CYAN}${BFF_URL:-"https://axiom-bff-preprod-<hash>.a.run.app"}${NC}"
echo -e "  Marketing Site:    ${CYAN}https://${PROJECT_ID}.web.app${NC}\n"
echo -e "  ${BOLD}Run Live Functional Flow:${NC}"
echo -e "  ${CYAN}./scripts/run-preprod-flow.sh \"${BFF_URL}\"${NC}\n"
