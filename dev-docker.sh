#!/usr/bin/env bash
# Axiom Proof — Root Docker Deployment Shortcut
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${REPO_ROOT}/scripts/dev-docker.sh" "$@"
