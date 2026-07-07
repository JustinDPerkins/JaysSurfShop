#!/usr/bin/env bash
# Deploy ECR repos + GitHub OIDC roles only (step 1)
# Works with either ECS or EKS — shared workshop module owns ECR + OIDC.
set -euo pipefail

PLATFORM="${1:-ecs}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../${PLATFORM}/terraform"

if [[ ! -d "$TERRAFORM_DIR" ]]; then
  echo "ERROR: Unknown platform '${PLATFORM}'. Use: ecs or eks"
  exit 1
fi

cd "$TERRAFORM_DIR"
terraform init

terraform apply \
  -target=module.workshop.aws_ecr_repository.services \
  -target=module.workshop.aws_iam_policy.github_ecr_push \
  -target=module.workshop.aws_iam_policy.github_ecr_pull \
  -target=module.workshop.aws_iam_role.github_actions \
  -target=module.workshop.aws_iam_role_policy_attachment.github_actions

echo ""
echo "Add to GitHub secrets:"
terraform output -raw github_actions_deploy_role_arn
echo "  → JaysSurfShop: AWS_DEPLOY_ROLE_ARN (ECR push / build workflow)"
terraform output -raw github_actions_ecr_pull_role_arn
echo "  → JaysSurfShop: AWS_ECR_PULL_ROLE_ARN (manual Upwind scan workflow)"
echo "  → shiftleft-automated: AWS_ECR_PULL_ROLE_ARN (automated registry scans)"
