output "github_actions_deploy_role_arn" {
  description = "JaysSurfShop secret: AWS_DEPLOY_ROLE_ARN"
  value       = module.workshop.github_actions_deploy_role_arn
}

output "github_actions_ecr_pull_role_arn" {
  description = "shiftleft-automated secret: AWS_ECR_PULL_ROLE_ARN"
  value       = module.workshop.github_actions_ecr_pull_role_arn
}

output "ecr_repository_urls" {
  value = module.workshop.ecr_repository_urls
}

output "application_url" {
  value = "http://${aws_lb.main.dns_name}"
}

output "demo_exfiltration_url" {
  value = module.workshop.demo_exfiltration_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "vpc_id" {
  value = module.workshop.vpc_id
}

output "private_subnet_ids" {
  value = module.workshop.private_subnet_ids
}

output "order_webhook_url" {
  description = "Public API Gateway base URL for checkout + security demos"
  value       = module.workshop.order_webhook_url
}

output "order_checkout_url" {
  description = "Checkout webhook endpoint (cart integration)"
  value       = module.workshop.order_checkout_url
}

output "order_api_misconfiguration" {
  description = "CSPM workshop metadata for the public unauthenticated API Gateway"
  value       = module.workshop.order_api_misconfiguration
}
