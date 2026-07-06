#!/usr/bin/env bash
# Deploy ECR repos + GitHub OIDC roles only (step 1)
set -euo pipefail

cd "$(dirname "$0")/../terraform"
terraform init

terraform apply \
  -target=aws_ecr_repository.services \
  -target=aws_iam_policy.github_ecr_push \
  -target=aws_iam_policy.github_ecr_pull \
  -target=aws_iam_role.github_actions \
  -target=aws_iam_role_policy_attachment.github_actions

echo ""
echo "Add to GitHub secrets:"
terraform output -raw github_actions_deploy_role_arn
echo "  → JaysSurfShop: AWS_DEPLOY_ROLE_ARN"
terraform output -raw github_actions_ecr_pull_role_arn
echo "  → shiftleft-automated: AWS_ECR_PULL_ROLE_ARN"
