resource "aws_secretsmanager_secret" "openai_api_key" {
  name                    = "${local.name_prefix}/openai-api-key"
  description             = "OpenAI API key for AI microservices"
  recovery_window_in_days = 7

  tags = {
    Name       = "${local.name_prefix}-openai-key"
    SecretType = "api-key"
    AISystem   = "openai"
  }
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}
