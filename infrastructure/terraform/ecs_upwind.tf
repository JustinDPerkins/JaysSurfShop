locals {
  upwind_enabled = var.upwind_client_id != ""

  service_commands = {
    frontend        = ["node", "server.js"]
    chat-rag        = ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
    board-generator = ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
  }

  upwind_app_secrets = local.upwind_enabled ? [
    {
      name      = "UPWIND_AUTH_CLIENT_ID"
      valueFrom = "${module.upwind_integration_aws_ecs_cluster[0].sensor_secret_arn}:ClientID::"
    },
    {
      name      = "UPWIND_AUTH_CLIENT_SECRET"
      valueFrom = "${module.upwind_integration_aws_ecs_cluster[0].sensor_secret_arn}:ClientSecret::"
    },
  ] : []

  service_container_base = {
    for name, svc in local.services : name => {
      name      = name
      image     = "${aws_ecr_repository.services[name].repository_url}:${var.image_tag}"
      essential = true

      portMappings = [{
        containerPort = svc.port
        hostPort      = svc.port
        protocol      = "tcp"
        name          = name
      }]

      environment = concat(
        [
          { name = "SERVICE_NAME", value = name },
          { name = "ENVIRONMENT", value = var.environment },
          { name = "AWS_REGION", value = var.aws_region },
          { name = "DEPLOYMENT_ID", value = local.name_prefix },
          { name = "LOG_FORMAT", value = "json" },
        ],
        name == "frontend" ? [
          { name = "CHAT_SERVICE_URL", value = "http://chat-rag.${local.service_connect_namespace}:8001" },
          { name = "BOARD_SERVICE_URL", value = "http://board-generator.${local.service_connect_namespace}:8002" },
          { name = "ORDER_WEBHOOK_URL", value = aws_apigatewayv2_api.order_webhook.api_endpoint },
          { name = "NEXT_PUBLIC_APP_ENV", value = var.environment },
        ] : [],
        name == "board-generator" ? [
          { name = "S3_BUCKET", value = aws_s3_bucket.board_images.bucket },
          { name = "AI_MODEL", value = "gpt-image-1" },
        ] : [],
        name == "chat-rag" ? [
          { name = "AI_MODEL_CHAT", value = "gpt-4o-mini" },
          { name = "AI_MODEL_EMBED", value = "text-embedding-3-small" },
        ] : []
      )

      secrets = concat(
        [{
          name      = "OPENAI_API_KEY"
          valueFrom = aws_secretsmanager_secret.openai_api_key.arn
        }],
        local.upwind_app_secrets
      )

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services[name].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = name
        }
      }

      readonlyRootFilesystem = false

      ulimits = [{
        name      = "nofile"
        softLimit = 65536
        hardLimit = 65536
      }]
    }
  }

  # Frontend: ALB health check only (ECS container health check was killing tasks).
  # Backend services: curl-based container health check.
  service_health_checks = {
    for name, svc in local.services : name => name != "frontend" ? {
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${svc.port}/health || curl -f http://localhost:${svc.port}/api/security/posture || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    } : {}
  }

  service_app_containers_plain = {
    for name, base in local.service_container_base : name => merge(base, local.service_health_checks[name], {
      entryPoint  = []
      command     = local.service_commands[name]
      volumesFrom = []
      linuxParameters = {
        initProcessEnabled = true
        capabilities = {
          add  = []
          drop = []
        }
      }
    })
  }

  service_app_containers_instrumented = {
    for name, base in local.service_container_base : name => merge(base, local.service_health_checks[name], {
      entryPoint = [module.upwind_integration_aws_ecs_cluster[0].tracer.entrypoint]
      command    = local.service_commands[name]
      volumesFrom = [{
        sourceContainer = module.upwind_integration_aws_ecs_cluster[0].tracer.container.name
        readOnly        = true
      }]
      linuxParameters = {
        initProcessEnabled = true
        capabilities = {
          add  = ["SYS_PTRACE"]
          drop = []
        }
      }
    })
  }

  service_app_containers = local.upwind_enabled ? local.service_app_containers_instrumented : local.service_app_containers_plain

  upwind_tracer_sidecars = {
    for name, svc in local.services : name => merge(
      module.upwind_integration_aws_ecs_cluster[0].tracer.container,
      {
        environment = [
          for k, v in module.upwind_integration_aws_ecs_cluster[0].tracer.env :
          { name = k, value = v }
        ]
        logConfiguration = {
          logDriver = "awslogs"
          options = {
            "awslogs-group"         = aws_cloudwatch_log_group.services[name].name
            "awslogs-region"        = var.aws_region
            "awslogs-stream-prefix" = "upwind-tracer"
          }
        }
      }
    )
  }

  service_task_containers = {
    for name, svc in local.services : name => concat(
      [local.service_app_containers[name]],
      local.upwind_enabled ? [local.upwind_tracer_sidecars[name]] : []
    )
  }
}
