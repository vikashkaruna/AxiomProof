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

if ! docker info >/dev/null 2>&1; then
  if [ -d "/Applications/Docker.app" ]; then
    echo "⚠ Docker daemon not running. Launching Docker Desktop..."
    open -a Docker || true
    for i in {1..30}; do
      if docker info >/dev/null 2>&1; then break; fi
      sleep 2
    done
  fi
fi
docker info >/dev/null 2>&1 || { echo "✗ Docker daemon not running. Please start Docker."; exit 1; }

# Authenticate Docker with Google Artifact Registry if gcloud is installed
if command -v gcloud >/dev/null 2>&1; then
  echo "▶ Authenticating Docker with Artifact Registry..."
  gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet || true
fi

# Force target platform for Google Cloud Run (always requires linux/amd64)
export DOCKER_DEFAULT_PLATFORM="linux/amd64"

SERVICES=(
  "bff:infra/docker/Dockerfile.bff"
  "web:infra/docker/Dockerfile.web"
  "agent-runtime:infra/docker/Dockerfile.agent-runtime"
  "model-gateway:infra/docker/Dockerfile.model-gateway"
  "temporal-worker:infra/docker/Dockerfile.temporal-worker"
  "marketing:infra/docker/Dockerfile.marketing"
)

TARGET_SERVICE="${4:-${TARGET_SERVICE:-all}}"
FORCE_BUILD="${FORCE_BUILD:-false}"

for entry in "${SERVICES[@]}"; do
  SVC_NAME="${entry%%:*}"
  DOCKERFILE="${entry##*:}"
  IMAGE_URI="${REGISTRY}/axiom-${SVC_NAME}:${TAG}"
  LOCAL_TAG="axiom-${SVC_NAME}:${TAG}"

  if [ "$TARGET_SERVICE" != "all" ] && [ "$TARGET_SERVICE" != "$SVC_NAME" ]; then
    continue
  fi

  # Check if image already exists in Artifact Registry when force-build is not set
  if [ "$FORCE_BUILD" != "true" ] && command -v gcloud >/dev/null 2>&1; then
    if gcloud artifacts docker images describe "${IMAGE_URI}" >/dev/null 2>&1; then
      echo "  ✓ Image ${IMAGE_URI} already exists in Artifact Registry (skipping build; set FORCE_BUILD=true to rebuild)"
      continue
    fi
  fi

  BUILD_ARGS=()
  if [ "$SVC_NAME" = "marketing" ]; then
    WEB_URL="${NEXT_PUBLIC_APP_URL:-https://axiom-web-preprod-7zb7qphjbq-el.a.run.app}"
    BFF_URL="${NEXT_PUBLIC_BFF_URL:-https://axiom-bff-preprod-7zb7qphjbq-el.a.run.app}"
    BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_APP_URL=${WEB_URL}" --build-arg "NEXT_PUBLIC_BFF_URL=${BFF_URL}")
  elif [ "$SVC_NAME" = "web" ]; then
    WEB_URL="${NEXT_PUBLIC_APP_URL:-https://axiom-web-preprod-7zb7qphjbq-el.a.run.app}"
    BFF_URL="${NEXT_PUBLIC_BFF_URL:-https://axiom-bff-preprod-7zb7qphjbq-el.a.run.app}"
    BUILD_ARGS+=(--build-arg "NEXT_PUBLIC_APP_URL=${WEB_URL}" --build-arg "NEXT_PUBLIC_BFF_URL=${BFF_URL}")
  fi

  echo -e "\n▶ Building [${SVC_NAME}] using ${DOCKERFILE} (platform: linux/amd64)..."
  docker build --platform linux/amd64 --provenance=false "${BUILD_ARGS[@]}" -f "${DOCKERFILE}" -t "${LOCAL_TAG}" -t "${IMAGE_URI}" .

  if [ "${PUSH_IMAGES:-false}" = "true" ] || [ "${1:-}" != "" ]; then
    echo "  Pushing ${IMAGE_URI}..."
    docker push "${IMAGE_URI}"
  fi
  echo "  ✓ Successfully built and pushed ${LOCAL_TAG}"
done

echo -e "\n================================================================="
echo "  ✓ All 6 Axiom Proof Preprod Container Images Built!            "
echo "================================================================="
