output "name_prefix" {
  value = local.name_prefix
}

output "common_tags" {
  value = local.common_tags
}

output "services" {
  value = local.services
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
}

output "ecr_repository_urls" {
  value = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "board_images_bucket" {
  value = aws_s3_bucket.board_images.bucket
}

output "openai_secret_arn" {
  value = aws_secretsmanager_secret.openai_api_key.arn
}

output "order_webhook_url" {
  value = aws_apigatewayv2_api.order_webhook.api_endpoint
}

output "order_checkout_url" {
  value = "${aws_apigatewayv2_api.order_webhook.api_endpoint}/checkout"
}

output "demo_exfiltration_url" {
  value = "https://${aws_s3_bucket.demo_public_assets.bucket}.s3.${var.aws_region}.amazonaws.com/${aws_s3_object.demo_customer_export.key}"
}

output "github_actions_deploy_role_arn" {
  value = aws_iam_role.github_actions["deploy"].arn
}

output "github_actions_ecr_pull_role_arn" {
  value = aws_iam_role.github_actions["scan"].arn
}

output "order_api_misconfiguration" {
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

output "orders_table_name" {
  value = aws_dynamodb_table.orders.name
}

output "orders_table_arn" {
  value = aws_dynamodb_table.orders.arn
}

output "users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  value = aws_dynamodb_table.users.arn
}
