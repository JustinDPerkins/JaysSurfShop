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

output "order_webhook_url" {
  description = "Public API Gateway base URL for checkout + security demos"
  value       = aws_apigatewayv2_api.order_webhook.api_endpoint
}

output "order_checkout_url" {
  description = "Checkout webhook endpoint (cart integration)"
  value       = "${aws_apigatewayv2_api.order_webhook.api_endpoint}/checkout"
}

output "order_api_misconfiguration" {
  description = "CSPM workshop metadata for the public unauthenticated API Gateway"
  value = {
    endpoint               = aws_apigatewayv2_api.order_webhook.api_endpoint
    protocol               = "HTTP"
    execute_api_public     = !aws_apigatewayv2_api.order_webhook.disable_execute_api_endpoint
    authorization_type     = "NONE"
    api_key_required       = false
    authorizer             = "none"
    cors_allow_origins     = "*"
    unauthenticated_routes = ["POST /checkout", "GET /status", "GET /demo/eicar", "POST /demo/yaml"]
    direct_invoke_example  = "curl -s ${aws_apigatewayv2_api.order_webhook.api_endpoint}/demo/eicar"
  }
}
