output "github_actions_deploy_role_arn" {
  description = "JaysSurfShop secret: AWS_DEPLOY_ROLE_ARN"
  value       = aws_iam_role.github_actions["deploy"].arn
}

output "github_actions_ecr_pull_role_arn" {
  description = "shiftleft-automated secret: AWS_ECR_PULL_ROLE_ARN"
  value       = aws_iam_role.github_actions["scan"].arn
}

output "ecr_repository_urls" {
  value = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "application_url" {
  value = "http://${aws_lb.main.dns_name}"
}

output "demo_exfiltration_url" {
  value = "https://${aws_s3_bucket.demo_public_assets.bucket}.s3.${var.aws_region}.amazonaws.com/${aws_s3_object.demo_customer_export.key}"
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
