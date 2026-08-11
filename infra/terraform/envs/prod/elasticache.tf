# Amazon ElastiCache for Valkey.
# Per Doc 06 §5: Upstash was the Doc 05 pick; this document supersedes
# that with ElastiCache because (a) it sits inside our existing VPC,
# (b) it's on the open Valkey engine (no Redis Inc. license lock-in),
# (c) it's a managed service with no cluster to run.
# Used for: cache, queue, idempotency keys, kill-switch state.

resource "aws_elasticache_subnet_group" "main" {
  name       = "axiom-proof-cache"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "redis" {
  name        = "axiom-proof-redis"
  description = "Allow inbound Redis from EKS nodes"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "Redis from VPC"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "axiom-proof"
  description          = "Axiom Proof cache and queue"
  engine               = "valkey"
  engine_version       = "7.2"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 2

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result

  automatic_failover_enabled = true
  multi_az_enabled           = true

  snapshot_retention_limit = 7
  snapshot_window          = "03:00-05:00"
  maintenance_window       = "Sun:05:00-Sun:07:00"

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }
}

resource "aws_cloudwatch_log_group" "redis" {
  name              = "/aws/elasticache/axiom-proof/redis"
  retention_in_days = 30
}

resource "random_password" "redis_auth" {
  length  = 64
  special = false
}
