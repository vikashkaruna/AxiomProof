# IAM roles for service accounts (IRSA).
# EKS pods assume these via OIDC federation; the role is bound to a
# specific Kubernetes service account.

# Trust policy: the agent-runtime SA can assume the evidence role
data "aws_iam_policy_document" "agent_runtime_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [module.eks.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider}:sub"
      values   = ["system:serviceaccount:axiom-proof:axiom-agent-runtime"]
    }
    condition {
      test     = "StringEquals"
      variable = "${module.eks.oidc_provider}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "agent_runtime" {
  name               = "axiom-proof-agent-runtime"
  assume_role_policy = data.aws_iam_policy_document.agent_runtime_assume.json
}

resource "aws_iam_role_policy_attachment" "agent_runtime_evidence" {
  role       = aws_iam_role.agent_runtime.name
  policy_arn = aws_iam_policy.evidence_access.arn
}
