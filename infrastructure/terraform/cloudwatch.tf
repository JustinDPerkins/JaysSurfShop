resource "aws_cloudwatch_log_group" "services" {
  for_each = local.services

  name              = "/ecs/${local.name_prefix}/${each.key}"
  retention_in_days = 30

  tags = {
    Name    = "${local.name_prefix}-${each.key}-logs"
    Service = each.key
  }
}

resource "aws_cloudwatch_log_metric_filter" "ai_events" {
  for_each = toset(["chat-rag", "board-generator"])

  name           = "${local.name_prefix}-${each.key}-ai-events"
  log_group_name = aws_cloudwatch_log_group.services[each.key].name
  pattern        = "{ $.event_type = \"ai_*\" }"

  metric_transformation {
    name          = "${local.name_prefix}-${each.key}-ai-events"
    namespace     = "JaysSurfShop/AISPM"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "security_events" {
  name           = "${local.name_prefix}-security-events"
  log_group_name = aws_cloudwatch_log_group.services["frontend"].name
  pattern        = "{ $.event_type = \"security_*\" }"

  metric_transformation {
    name          = "${local.name_prefix}-security-events"
    namespace     = "JaysSurfShop/Security"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "iam_abuse_events" {
  name           = "${local.name_prefix}-iam-abuse-events"
  log_group_name = aws_cloudwatch_log_group.services["chat-rag"].name
  pattern        = "{ $.event_type = \"iam_role_abuse\" }"

  metric_transformation {
    name          = "${local.name_prefix}-iam-abuse-events"
    namespace     = "JaysSurfShop/Security"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_ai_usage" {
  alarm_name          = "${local.name_prefix}-high-ai-usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "${local.name_prefix}-chat-rag-ai-events"
  namespace           = "JaysSurfShop/AISPM"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "AI SPM KPI: unusual volume of AI inference calls"

  tags = {
    KPI       = "ai-inference-rate"
    Tooling   = "ai-spm"
  }
}
