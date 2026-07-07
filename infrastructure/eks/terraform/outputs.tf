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
  description = "NLB hostname for the frontend LoadBalancer service"
  value       = try("http://${kubernetes_service.services["frontend"].status[0].load_balancer[0].ingress[0].hostname}", "pending — re-run terraform output after LoadBalancer provisions")
}

output "demo_exfiltration_url" {
  value = module.workshop.demo_exfiltration_url
}

output "eks_cluster_name" {
  value = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  value = aws_eks_cluster.main.endpoint
}

output "vpc_id" {
  value = module.workshop.vpc_id
}

output "order_webhook_url" {
  value = module.workshop.order_webhook_url
}

output "order_checkout_url" {
  value = module.workshop.order_checkout_url
}

output "order_api_misconfiguration" {
  value = module.workshop.order_api_misconfiguration
}

output "kubectl_config_command" {
  value = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}"
}
