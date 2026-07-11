# CSPM workshop: public API Gateway → overprivileged order webhook Lambda
# (EICAR + PyYAML CVE-2020-14343 for serverless security demos)

resource "null_resource" "order_webhook_package" {
  triggers = {
    handler = filemd5("${path.module}/../../lambda/order-webhook/handler.py")
    chain   = filemd5("${path.module}/../../lambda/order-webhook/workshop_chain.py")
    reqs    = filemd5("${path.module}/../../lambda/order-webhook/requirements.txt")
  }

  provisioner "local-exec" {
    command     = "chmod +x ${path.module}/../../lambda/order-webhook/build.sh && ${path.module}/../../lambda/order-webhook/build.sh"
    interpreter = ["bash", "-c"]
  }
}

data "archive_file" "order_webhook" {
  depends_on  = [null_resource.order_webhook_package]
  type        = "zip"
  source_dir  = "${path.module}/../../lambda/order-webhook/package"
  output_path = "${path.module}/../../lambda/order-webhook/build.zip"
}

resource "aws_iam_role" "order_webhook_lambda" {
  name = "${local.name_prefix}-order-webhook"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = {
    Name        = "${local.name_prefix}-order-webhook-role"
    DemoFinding = "lambda-overprivileged-role"
  }
}

resource "aws_iam_role_policy_attachment" "order_webhook_basic" {
  role       = aws_iam_role.order_webhook_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# CSPM workshop finding: Lambda role mirrors ECS overprivilege
resource "aws_iam_role_policy" "order_webhook_overprivileged" {
  name = "${local.name_prefix}-lambda-demo-overprivileged"
  role = aws_iam_role.order_webhook_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:*", "secretsmanager:*", "iam:*"]
      Resource = "*"
    }]
  })
}

resource "aws_cloudwatch_log_group" "order_webhook" {
  name              = "/aws/lambda/${local.name_prefix}-order-webhook"
  retention_in_days = 7

  tags = {
    Name    = "${local.name_prefix}-order-webhook-logs"
    Service = "order-webhook"
  }
}

resource "aws_lambda_function" "order_webhook" {
  function_name = "${local.name_prefix}-order-webhook"
  role          = aws_iam_role.order_webhook_lambda.arn
  handler       = "handler.handler"
  runtime       = "python3.12"
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.order_webhook.output_path
  source_code_hash = data.archive_file.order_webhook.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.order_webhook,
    aws_iam_role_policy_attachment.order_webhook_basic,
  ]

  tags = {
    Name        = "${local.name_prefix}-order-webhook"
    DemoFinding = "eicar-and-cve-package"
    CSPMCheck   = "serverless-vulnerable-deps"
  }
}

# CSPM workshop finding: intentionally public, unauthenticated HTTP API
resource "aws_apigatewayv2_api" "order_webhook" {
  name          = "${local.name_prefix}-order-api"
  protocol_type = "HTTP"

  disable_execute_api_endpoint = false

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
  }

  tags = {
    Name        = "${local.name_prefix}-order-api"
    DemoFinding = "public-api-no-auth"
    CSPMCheck   = "api-gateway-unauthenticated-public"
    AuthType    = "NONE"
  }
}

resource "aws_apigatewayv2_stage" "order_webhook" {
  api_id      = aws_apigatewayv2_api.order_webhook.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 100
    throttling_rate_limit  = 50
  }

  tags = {
    Name        = "${local.name_prefix}-order-api-default"
    DemoFinding = "public-api-stage-no-auth"
    CSPMCheck   = "api-gateway-unauthenticated-public"
  }
}

resource "aws_apigatewayv2_integration" "order_webhook" {
  api_id                 = aws_apigatewayv2_api.order_webhook.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.order_webhook.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "order_webhook" {
  for_each = toset([
    "POST /checkout",
    "GET /status",
    "GET /demo/eicar",
    "POST /demo/yaml",
  ])

  api_id             = aws_apigatewayv2_api.order_webhook.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.order_webhook.id}"
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "order_webhook_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.order_webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.order_webhook.execution_arn}/*/*"
}
