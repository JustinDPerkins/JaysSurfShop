output "aws_account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "github_actions_deploy_role_arn" {
  description = "Set as AWS_DEPLOY_ROLE_ARN in JaysSurfShop GitHub secrets"
  value       = aws_iam_role.github_actions["deploy"].arn
}

output "github_actions_ecr_pull_role_arn" {
  description = "Set as AWS_ECR_PULL_ROLE_ARN in shiftleft-automated GitHub secrets"
  value       = aws_iam_role.github_actions["scan"].arn
}

output "ecr_image_prefix" {
  description = "ECR registry prefix for workflow image tags"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.name_prefix}"
}
