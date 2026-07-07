#!/usr/bin/env bash
# Complete state migration: move shared resources into module.workshop
set -euo pipefail

cd "$(dirname "$0")/../ecs/terraform"
terraform init -input=false

mv_if_exists() {
  local src="$1" dst="$2"
  if terraform state list 2>/dev/null | grep -Fqx "$src"; then
    echo "mv $src"
    terraform state mv "$src" "$dst"
  fi
}

# Data sources
mv_if_exists 'data.archive_file.order_webhook' 'module.workshop.data.archive_file.order_webhook'
mv_if_exists 'data.aws_availability_zones.available' 'module.workshop.data.aws_availability_zones.available'
mv_if_exists 'data.aws_caller_identity.current' 'module.workshop.data.aws_caller_identity.current'
mv_if_exists 'data.aws_iam_openid_connect_provider.github' 'module.workshop.data.aws_iam_openid_connect_provider.github'

# VPC
mv_if_exists 'aws_vpc.main' 'module.workshop.aws_vpc.main'
mv_if_exists 'aws_internet_gateway.main' 'module.workshop.aws_internet_gateway.main'
mv_if_exists 'aws_subnet.public[0]' 'module.workshop.aws_subnet.public[0]'
mv_if_exists 'aws_subnet.public[1]' 'module.workshop.aws_subnet.public[1]'
mv_if_exists 'aws_subnet.private[0]' 'module.workshop.aws_subnet.private[0]'
mv_if_exists 'aws_subnet.private[1]' 'module.workshop.aws_subnet.private[1]'
mv_if_exists 'aws_eip.nat' 'module.workshop.aws_eip.nat'
mv_if_exists 'aws_nat_gateway.main' 'module.workshop.aws_nat_gateway.main'
mv_if_exists 'aws_route_table.public' 'module.workshop.aws_route_table.public'
mv_if_exists 'aws_route_table.private' 'module.workshop.aws_route_table.private'
mv_if_exists 'aws_route_table_association.public[0]' 'module.workshop.aws_route_table_association.public[0]'
mv_if_exists 'aws_route_table_association.public[1]' 'module.workshop.aws_route_table_association.public[1]'
mv_if_exists 'aws_route_table_association.private[0]' 'module.workshop.aws_route_table_association.private[0]'
mv_if_exists 'aws_route_table_association.private[1]' 'module.workshop.aws_route_table_association.private[1]'
mv_if_exists 'aws_security_group.alb' 'module.workshop.aws_security_group.alb'

# S3
mv_if_exists 'aws_s3_account_public_access_block.demo' 'module.workshop.aws_s3_account_public_access_block.demo'
mv_if_exists 'aws_s3_bucket.board_images' 'module.workshop.aws_s3_bucket.board_images'
mv_if_exists 'aws_s3_bucket.demo_public_assets' 'module.workshop.aws_s3_bucket.demo_public_assets'
mv_if_exists 'aws_s3_bucket_policy.demo_public_read' 'module.workshop.aws_s3_bucket_policy.demo_public_read'
mv_if_exists 'aws_s3_bucket_public_access_block.board_images' 'module.workshop.aws_s3_bucket_public_access_block.board_images'
mv_if_exists 'aws_s3_bucket_public_access_block.demo_public_assets' 'module.workshop.aws_s3_bucket_public_access_block.demo_public_assets'
mv_if_exists 'aws_s3_bucket_server_side_encryption_configuration.board_images' 'module.workshop.aws_s3_bucket_server_side_encryption_configuration.board_images'
mv_if_exists 'aws_s3_bucket_versioning.board_images' 'module.workshop.aws_s3_bucket_versioning.board_images'
mv_if_exists 'aws_s3_object.demo_customer_export' 'module.workshop.aws_s3_object.demo_customer_export'

# ECR + GitHub
mv_if_exists 'aws_ecr_repository.services["board-generator"]' 'module.workshop.aws_ecr_repository.services["board-generator"]'
mv_if_exists 'aws_ecr_repository.services["chat-rag"]' 'module.workshop.aws_ecr_repository.services["chat-rag"]'
mv_if_exists 'aws_ecr_repository.services["frontend"]' 'module.workshop.aws_ecr_repository.services["frontend"]'
mv_if_exists 'aws_iam_policy.github_ecr_pull' 'module.workshop.aws_iam_policy.github_ecr_pull'
mv_if_exists 'aws_iam_policy.github_ecr_push' 'module.workshop.aws_iam_policy.github_ecr_push'
mv_if_exists 'aws_iam_role.github_actions["deploy"]' 'module.workshop.aws_iam_role.github_actions["deploy"]'
mv_if_exists 'aws_iam_role.github_actions["scan"]' 'module.workshop.aws_iam_role.github_actions["scan"]'
mv_if_exists 'aws_iam_role_policy_attachment.github_actions["deploy"]' 'module.workshop.aws_iam_role_policy_attachment.github_actions["deploy"]'
mv_if_exists 'aws_iam_role_policy_attachment.github_actions["scan"]' 'module.workshop.aws_iam_role_policy_attachment.github_actions["scan"]'

# Secrets
mv_if_exists 'aws_secretsmanager_secret.openai_api_key' 'module.workshop.aws_secretsmanager_secret.openai_api_key'
mv_if_exists 'aws_secretsmanager_secret_version.openai_api_key' 'module.workshop.aws_secretsmanager_secret_version.openai_api_key'

# Lambda + API GW
mv_if_exists 'null_resource.order_webhook_package' 'module.workshop.null_resource.order_webhook_package'
mv_if_exists 'aws_iam_role.order_webhook_lambda' 'module.workshop.aws_iam_role.order_webhook_lambda'
mv_if_exists 'aws_iam_role_policy.order_webhook_overprivileged' 'module.workshop.aws_iam_role_policy.order_webhook_overprivileged'
mv_if_exists 'aws_iam_role_policy_attachment.order_webhook_basic' 'module.workshop.aws_iam_role_policy_attachment.order_webhook_basic'
mv_if_exists 'aws_cloudwatch_log_group.order_webhook' 'module.workshop.aws_cloudwatch_log_group.order_webhook'
mv_if_exists 'aws_lambda_function.order_webhook' 'module.workshop.aws_lambda_function.order_webhook'
mv_if_exists 'aws_apigatewayv2_api.order_webhook' 'module.workshop.aws_apigatewayv2_api.order_webhook'
mv_if_exists 'aws_apigatewayv2_stage.order_webhook' 'module.workshop.aws_apigatewayv2_stage.order_webhook'
mv_if_exists 'aws_apigatewayv2_integration.order_webhook' 'module.workshop.aws_apigatewayv2_integration.order_webhook'
mv_if_exists 'aws_apigatewayv2_route.order_webhook["GET /demo/eicar"]' 'module.workshop.aws_apigatewayv2_route.order_webhook["GET /demo/eicar"]'
mv_if_exists 'aws_apigatewayv2_route.order_webhook["GET /status"]' 'module.workshop.aws_apigatewayv2_route.order_webhook["GET /status"]'
mv_if_exists 'aws_apigatewayv2_route.order_webhook["POST /checkout"]' 'module.workshop.aws_apigatewayv2_route.order_webhook["POST /checkout"]'
mv_if_exists 'aws_apigatewayv2_route.order_webhook["POST /demo/yaml"]' 'module.workshop.aws_apigatewayv2_route.order_webhook["POST /demo/yaml"]'
mv_if_exists 'aws_lambda_permission.order_webhook_api' 'module.workshop.aws_lambda_permission.order_webhook_api'

echo ""
echo "Workshop resources in state: $(terraform state list | grep -c module.workshop || true)"
terraform plan -detailed-exitcode
