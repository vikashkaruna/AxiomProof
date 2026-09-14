# ==============================================================================
# Axiom Proof — Cloud Run v2 Microservices Deployments (asia-south1)
# ==============================================================================

locals {
  image_prefix = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.name}"
}

# ─── 1. BFF (API Gateway & Execution Gate) ───────────────────────────────────
resource "google_cloud_run_v2_service" "bff" {
  name     = "axiom-bff-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloudrun_sa.email

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    containers {
      image = "${local.image_prefix}/axiom-bff:${var.environment}"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      ports {
        container_port = 4000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "AWS_REGION"
        value = var.region
      }
      env {
        name  = "BFF_PORT"
        value = "4000"
      }
      env {
        name  = "AGENT_RUNTIME_URL"
        value = "https://axiom-agent-runtime-${var.environment}-${substr(google_service_account.cloudrun_sa.unique_id, 0, 10)}.a.run.app"
      }
      env {
        name  = "MODEL_GATEWAY_URL"
        value = "https://axiom-model-gateway-${var.environment}-${substr(google_service_account.cloudrun_sa.unique_id, 0, 10)}.a.run.app"
      }
      env {
        name  = "AWS_S3_EVIDENCE_BUCKET"
        value = google_storage_bucket.evidence_vault.name
      }
      env {
        name  = "AWS_S3_ENDPOINT"
        value = "https://storage.googleapis.com"
      }
      env {
        name  = "SUPABASE_URL"
        value = "https://preprod-supabase.axiomminds.ai"
      }
      env {
        name  = "SUPABASE_ANON_KEY"
        value = "preprod-anon-key-placeholder-length-over-forty-chars"
      }
      env {
        name  = "SUPABASE_SERVICE_KEY"
        value = "preprod-service-key-placeholder-length-over-forty-chars"
      }

      # Secrets
      env {
        name = "APPROVAL_SIGNING_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["approval_signing_key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "AGENT_RUNTIME_INTERNAL_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["agent_runtime_internal_token"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "MODEL_GATEWAY_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["model_gateway_api_key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "UPSTASH_REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["upstash_redis_url"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SUPABASE_DB_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["db_url"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "AWS_ACCESS_KEY_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["gcs_hmac_access_key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "AWS_SECRET_ACCESS_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["gcs_hmac_secret_key"].secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 4000
        }
        initial_delay_seconds = 10
        period_seconds        = 10
        failure_threshold     = 3
      }
    }
  }

  depends_on = [google_secret_manager_secret_version.version]
}

# ─── 2. Web App (Compliance Workbench & Approval Console) ───────────────────
resource "google_cloud_run_v2_service" "web" {
  name     = "axiom-web-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloudrun_sa.email

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    containers {
      image = "${local.image_prefix}/axiom-web:${var.environment}"

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      ports {
        container_port = 3001
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "NEXT_TELEMETRY_DISABLED"
        value = "1"
      }
      env {
        name  = "BFF_PUBLIC_URL"
        value = google_cloud_run_v2_service.bff.uri
      }
      env {
        name  = "NEXT_PUBLIC_BFF_URL"
        value = google_cloud_run_v2_service.bff.uri
      }
      env {
        name  = "NEXT_PUBLIC_SUPABASE_URL"
        value = "https://preprod-supabase.axiomminds.ai"
      }
      env {
        name  = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        value = "preprod-anon-key-placeholder-length-over-forty-chars"
      }
      env {
        name  = "SUPABASE_URL"
        value = "https://preprod-supabase.axiomminds.ai"
      }
      env {
        name  = "SUPABASE_SERVICE_KEY"
        value = "preprod-service-key-placeholder-length-over-forty-chars"
      }

      startup_probe {
        http_get {
          path = "/api/health"
          port = 3001
        }
        initial_delay_seconds = 15
        period_seconds        = 10
        failure_threshold     = 3
      }
    }
  }

  depends_on = [google_cloud_run_v2_service.bff]
}

# ─── 3. Agent Runtime (10 Compliance Agents Fleet) ──────────────────────────
resource "google_cloud_run_v2_service" "agent_runtime" {
  name     = "axiom-agent-runtime-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL" # Invoked by BFF

  template {
    service_account = google_service_account.cloudrun_sa.email

    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }

    containers {
      image = "${local.image_prefix}/axiom-agent-runtime:${var.environment}"

      resources {
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
      }

      ports {
        container_port = 8000
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "LOG_LEVEL"
        value = "info"
      }
      env {
        name  = "AWS_REGION"
        value = var.region
      }
      env {
        name  = "MODEL_GATEWAY_URL"
        value = google_cloud_run_v2_service.model_gateway.uri
      }
      env {
        name  = "S3_EVIDENCE_BUCKET"
        value = google_storage_bucket.evidence_vault.name
      }
      env {
        name  = "S3_ENDPOINT"
        value = "https://storage.googleapis.com"
      }

      # Secrets
      env {
        name = "INTERNAL_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["agent_runtime_internal_token"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "APPROVAL_SIGNING_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["approval_signing_key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "MODEL_GATEWAY_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["model_gateway_api_key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "AWS_ACCESS_KEY_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["gcs_hmac_access_key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "AWS_SECRET_ACCESS_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["gcs_hmac_secret_key"].secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        initial_delay_seconds = 10
        period_seconds        = 10
        failure_threshold     = 3
      }
    }
  }

  depends_on = [google_cloud_run_v2_service.model_gateway]
}

# ─── 4. Model Gateway (PII Redactor & Multi-Model Fallback Chain) ───────────
resource "google_cloud_run_v2_service" "model_gateway" {
  name     = "axiom-model-gateway-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloudrun_sa.email

    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }

    containers {
      image = "${local.image_prefix}/axiom-model-gateway:${var.environment}"

      resources {
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
      }

      ports {
        container_port = 8001
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "LOG_LEVEL"
        value = "info"
      }
      env {
        name  = "AWS_REGION"
        value = var.region
      }
      env {
        name  = "PII_REDACTION_ENABLED"
        value = "true"
      }

      # Secrets for Multi-Model Fallback Chain:
      env {
        name = "API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["model_gateway_api_key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "ANTHROPIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["anthropic_api_key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["openai_api_key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "GEMINI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["gemini_api_key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["upstash_redis_url"].secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8001
        }
        initial_delay_seconds = 10
        period_seconds        = 10
        failure_threshold     = 3
      }
    }
  }

  depends_on = [google_secret_manager_secret_version.version]
}

# ─── 5. Temporal Worker (Durable Orchestration on GCP) ──────────────────────
resource "google_cloud_run_v2_service" "temporal_worker" {
  name     = "axiom-temporal-worker-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.cloudrun_sa.email

    scaling {
      min_instance_count = 1
      max_instance_count = 3
    }

    containers {
      image = "${local.image_prefix}/axiom-temporal-worker:${var.environment}"

      resources {
        limits = {
          cpu    = "1"
          memory = "2Gi"
        }
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "TEMPORAL_ADDRESS"
        value = var.temporal_address
      }
      env {
        name  = "TEMPORAL_NAMESPACE"
        value = var.temporal_namespace
      }
      env {
        name  = "TEMPORAL_TLS"
        value = "true"
      }
      env {
        name  = "AGENT_RUNTIME_URL"
        value = google_cloud_run_v2_service.agent_runtime.uri
      }

      env {
        name = "TEMPORAL_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secret["temporal_api_key"].secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        failure_threshold     = 3
      }
    }
  }

  depends_on = [google_cloud_run_v2_service.agent_runtime]
}

# ─── 6. Marketing Container (Cloud Run deployment option) ───────────────────
resource "google_cloud_run_v2_service" "marketing" {
  name     = "axiom-marketing-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloudrun_sa.email

    scaling {
      min_instance_count = 1
      max_instance_count = 5
    }

    containers {
      image = "${local.image_prefix}/axiom-marketing:${var.environment}"

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }

      ports {
        container_port = 3000
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "BFF_PUBLIC_URL"
        value = google_cloud_run_v2_service.bff.uri
      }

      startup_probe {
        http_get {
          path = "/api/health"
          port = 3000
        }
        initial_delay_seconds = 10
        period_seconds        = 10
        failure_threshold     = 3
      }
    }
  }

  depends_on = [google_cloud_run_v2_service.bff]
}
