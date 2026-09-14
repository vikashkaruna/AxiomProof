#!/usr/bin/env bash
# ==============================================================================
# Axiom Proof — Staging Environment Deployment Launcher
# ==============================================================================
# Usage:
#   ./scripts/deploy-staging.sh [OPTIONS]
#
# Options:
#   --build, -b          Force rebuild of all images
#   --registry, -reg <r> Pull from Docker Hub registry (e.g. vikashkaruna)
#   --down, -d           Stop staging containers
#   --status, -s         Report status of staging services
#   --test, -t           Run verification tests
#   --logs, -l [svc]     View service logs
# ==============================================================================
set -eo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

exec ./scripts/dev-docker.sh --env staging "$@"
