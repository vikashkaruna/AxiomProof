# ─── Backend ───────────────────────────────────────────────────────
# Uncomment and configure for production. The bucket must be created
# in a separate bootstrap step (e.g. via the AWS console or a
# one-off terraform run).
#
# terraform {
#   backend "s3" {
#     bucket         = "axiom-proof-terraform-state-ap-south-1"
#     key            = "prod/terraform.tfstate"
#     region         = "ap-south-1"
#     dynamodb_table = "axiom-proof-terraform-locks"
#     encrypt        = true
#     kms_key_id     = "alias/axiom-proof-tf-state"
#   }
# }

# ─── Versions / providers ──────────────────────────────────────────
terraform {
  required_version = ">= 1.7.0"
}
