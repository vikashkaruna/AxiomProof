variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "axiom-proof-prod"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.10.0.0/16"
}

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS control plane"
  type        = string
  default     = "1.29"
}

variable "domain_name" {
  description = "Primary domain for the deployment"
  type        = string
  default     = "axiomminds.ai"
}
