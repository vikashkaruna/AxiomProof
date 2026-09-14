#!/usr/bin/env bash
# ==============================================================================
# Axiom Proof — Preprod Container Image Builder & Artifact Registry Pusher
# ==============================================================================
# Usage:
#   ./scripts/build-preprod-images.sh [GCP_PROJECT_ID] [REGION] [TAG]
#
# Examples:
#   ./scripts/build-preprod-images.sh
#   ./scripts/build-preprod-images.sh my-gcp-project asia-south1 preprod
# ==============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PROJECT_ID="${1:-${GCP_PROJECT_ID:-axiom-proof}}"
REGION="${2:-${GCP_REGION:-asia-south1}}"
TAG="${3:-${IMAGE_TAG:-preprod}}"
REPO_NAME="axiom-proof-preprod"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

echo "================================================================="
echo "  AXIOM PROOF — Preprod Container Image Builder                  "
echo "================================================================="
echo "  Project ID:      ${PROJECT_ID}"
echo "  Region:          ${REGION} (Mumbai)"
echo "  Artifact Target: ${REGISTRY}"
echo "  Image Tag:       ${TAG}"
echo "================================================================="

# Authenticate Docker with Google Artifact Registry if gcloud is installed
if command -v gcloud >/dev/null 2>&1; then
  echo "▶ Authenticating Docker with Artifact Registry..."
  gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet || true
fi

SERVICES=(
  "bff:infra/docker/Dockerfile.bff"
  "web:infra/docker/Dockerfile.web"
  "agent-runtime:infra/docker/Dockerfile.agent-runtime"
  "model-gateway:infra/docker/Dockerfile.model-gateway"
  "temporal-worker:infra/docker/Dockerfile.temporal-worker"
  "marketing:infra/docker/Dockerfile.marketing"
)

for entry in "${SERVICES[@]}"; do
  SVC_NAME="${entry%%:*}"
  DOCKERFILE="${entry##*:}"
  IMAGE_URI="${REGISTRY}/axiom-${SVC_NAME}:${TAG}"
  LOCAL_TAG="axiom-${SVC_NAME}:${TAG}"

  echo -e "\n▶ Building [${SVC_NAME}] using ${DOCKERFILE}..."
  docker build -f "${DOCKERFILE}" -t "${LOCAL_TAG}" -t "${IMAGE_URI}" .

  if [ "${PUSH_IMAGES:-false}" = "true" ] || [ "${1:-}" != "" ]; then
    echo "  Pushing ${IMAGE_URI}..."
    docker push "${IMAGE_URI}"
  fi
  echo "  ✓ Successfully built ${LOCAL_TAG}"
done

echo -e "\n================================================================="
echo "  ✓ All 6 Axiom Proof Preprod Container Images Built!            "
echo "================================================================="
