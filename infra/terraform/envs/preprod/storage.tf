# ==============================================================================
# Axiom Proof — Evidence Vault Storage (GCS Bucket Lock / WORM in asia-south1)
# ==============================================================================

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# The Evidence Vault bucket must enforce WORM semantics (Object Lock / Bucket Lock)
# to satisfy DPDPA auditability and Hard Rule 4.
resource "google_storage_bucket" "evidence_vault" {
  name                        = "axiom-proof-evidence-${var.environment}-${random_id.bucket_suffix.hex}"
  location                    = var.region # Strictly asia-south1 Mumbai
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  enable_object_retention = true

  # Retention Policy for WORM compliance
  retention_policy {
    is_locked        = false # Keep unlocked in preprod for testing; locked in prod
    retention_period = var.retention_days * 86400
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = var.retention_days + 30
    }
    action {
      type = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  force_destroy = false
}

# Service account for Cloud Run services to interact with storage & S3 interoperability
resource "google_service_account" "storage_sa" {
  account_id   = "axiom-${var.environment}-storage-sa"
  display_name = "Axiom Proof ${var.environment} Storage Accessor"
}

resource "google_storage_bucket_iam_member" "storage_admin" {
  bucket = google_storage_bucket.evidence_vault.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.storage_sa.email}"
}

# S3 Interoperability HMAC Key for AWS SDK / S3 compatibility
resource "google_storage_hmac_key" "s3_compat_key" {
  service_account_email = google_service_account.storage_sa.email
  depends_on            = [google_storage_bucket_iam_member.storage_admin]
}
