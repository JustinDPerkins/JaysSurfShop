output "application_url" {
  description = "Public URL for the surf shop application"
  value       = "http://${aws_lb.main.dns_name}"
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name for runtime protection tooling"
  value       = aws_ecs_cluster.main.name
}

output "ecr_repository_urls" {
  description = "ECR repository URLs for CI/CD image pushes"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "cloudwatch_log_groups" {
  description = "CloudWatch log groups for XDR/SIEM ingestion"
  value       = { for k, v in aws_cloudwatch_log_group.services : k => v.name }
}

output "secrets_manager_arn" {
  description = "Secrets Manager ARN for OpenAI API key (AI SPM scope)"
  value       = aws_secretsmanager_secret.openai_api_key.arn
  sensitive   = true
}

output "board_images_bucket" {
  description = "S3 bucket for AI-generated board images"
  value       = aws_s3_bucket.board_images.bucket
}

output "service_discovery_namespace" {
  description = "Private DNS namespace for internal microservices"
  value       = local.service_connect_namespace
}

output "demo_exfiltration_url" {
  description = "Public URL for synthetic customer export (CSPM exfil demo)"
  value       = "https://${aws_s3_bucket.demo_public_assets.bucket}.s3.${var.aws_region}.amazonaws.com/${aws_s3_object.demo_customer_export.key}"
}

output "demo_scenario" {
  description = "Security workshop scenario metadata"
  value = {
    misconfigurations    = ["public-s3-bucket", "public-sensitive-export", "overprivileged-iam", "open-ssh-sg"]
    intentional_cve      = "CVE-2023-50447"
    cve_package          = "pillow==10.0.1"
    cve_service          = "chat-rag"
    runbook              = "docs/WORKSHOP.md"
    exfiltration_command = "curl -s '${aws_s3_bucket.demo_public_assets.bucket}.s3.${var.aws_region}.amazonaws.com/${aws_s3_object.demo_customer_export.key}' | jq ."
  }
}

output "cspm_resource_inventory" {
  description = "Tagged resources for CSPM inventory validation"
  value = {
    vpc_id           = aws_vpc.main.id
    cluster_arn      = aws_ecs_cluster.main.arn
    alb_arn          = aws_lb.main.arn
    task_roles       = [aws_iam_role.ecs_task.arn, aws_iam_role.ecs_task_execution.arn]
    security_groups  = [aws_security_group.alb.id, aws_security_group.ecs_tasks.id]
    private_subnets  = aws_subnet.private[*].id
    public_subnets   = aws_subnet.public[*].id
  }
}

output "monitoring_kpi_namespaces" {
  description = "CloudWatch namespaces for KPI dashboards"
  value = {
    ai_spm    = "JaysSurfShop/AISPM"
    security  = "JaysSurfShop/Security"
    container = "ECS/ContainerInsights"
  }
}
