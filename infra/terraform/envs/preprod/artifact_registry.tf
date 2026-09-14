# ==============================================================================
# Axiom Proof — Google Artifact Registry for Docker Images (asia-south1)
# ==============================================================================

resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "axiom-proof-${var.environment}"
  description   = "Docker repository for Axiom Proof ${var.environment} microservice images"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.apis]
}
