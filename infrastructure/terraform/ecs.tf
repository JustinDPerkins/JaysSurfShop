resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${local.name_prefix}-cluster"
  }
}

resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = local.service_connect_namespace
  description = "Private DNS for Jay's Surf Shop microservices"
  vpc         = aws_vpc.main.id

  tags = {
    Name = local.service_connect_namespace
  }
}

resource "aws_service_discovery_service" "services" {
  for_each = { for k, v in local.services : k => v if !v.public }

  name = each.key

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_ecs_task_definition" "services" {
  for_each = local.services

  family                   = "${local.name_prefix}-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = each.key
    image     = "${aws_ecr_repository.services[each.key].repository_url}:${var.image_tag}"
    essential = true

    portMappings = [{
      containerPort = each.value.port
      hostPort      = each.value.port
      protocol      = "tcp"
      name          = each.key
    }]

    environment = concat(
      [
        { name = "SERVICE_NAME", value = each.key },
        { name = "ENVIRONMENT", value = var.environment },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "DEPLOYMENT_ID", value = local.name_prefix },
        { name = "LOG_FORMAT", value = "json" },
      ],
      each.key == "frontend" ? [
        { name = "CHAT_SERVICE_URL", value = "http://chat-rag.${local.service_connect_namespace}:8001" },
        { name = "BOARD_SERVICE_URL", value = "http://board-generator.${local.service_connect_namespace}:8002" },
        { name = "NEXT_PUBLIC_APP_ENV", value = var.environment },
      ] : [],
      each.key == "board-generator" ? [
        { name = "S3_BUCKET", value = aws_s3_bucket.board_images.bucket },
        { name = "AI_MODEL", value = "gpt-image-1" },
      ] : [],
      each.key == "chat-rag" ? [
        { name = "AI_MODEL_CHAT", value = "gpt-4o-mini" },
        { name = "AI_MODEL_EMBED", value = "text-embedding-3-small" },
      ] : []
    )

    secrets = contains(["chat-rag", "board-generator", "frontend"], each.key) ? [{
      name      = "OPENAI_API_KEY"
      valueFrom = aws_secretsmanager_secret.openai_api_key.arn
    }] : []

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.services[each.key].name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = each.key
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:${each.value.port}/health || curl -f http://localhost:${each.value.port}/api/security/posture || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }

    linuxParameters = {
      initProcessEnabled = true
    }

    readonlyRootFilesystem = false

    ulimits = [{
      name      = "nofile"
      softLimit = 65536
      hardLimit = 65536
    }]
  }])

  tags = {
    Name    = "${local.name_prefix}-${each.key}-task"
    Service = each.key
  }
}

resource "aws_ecs_service" "services" {
  for_each = local.services

  name            = "${local.name_prefix}-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = each.value.public ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.frontend.arn
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  dynamic "service_registries" {
    for_each = each.value.public ? [] : [1]
    content {
      registry_arn = aws_service_discovery_service.services[each.key].arn
    }
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  depends_on = [aws_lb_listener.http]

  tags = {
    Name    = "${local.name_prefix}-${each.key}-service"
    Service = each.key
  }
}
