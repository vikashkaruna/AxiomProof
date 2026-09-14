# ==============================================================================
# Axiom Proof — Identity & Access Management (Least-Privilege Roles)
# ==============================================================================

# Dedicated service account for Cloud Run runtime
resource "google_service_account" "cloudrun_sa" {
  account_id   = "axiom-${var.environment}-cloudrun-sa"
  display_name = "Axiom Proof ${var.environment} Cloud Run Workload"
}

# Grant Cloud SQL client access
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# Grant Secret Manager accessor
resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# Grant Artifact Registry reader to service account
resource "google_project_iam_member" "artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.cloudrun_sa.email}"
}

# Allow public invocations on Web App and Marketing services
resource "google_cloud_run_v2_service_iam_member" "web_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "marketing_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.marketing.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "bff_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.bff.name
  role     = "roles/run.invoker"
  member   = "allUsers" # Public for API endpoints & CORS
}
