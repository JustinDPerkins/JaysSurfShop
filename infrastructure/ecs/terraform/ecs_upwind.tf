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

  upwind_tracer_env = local.upwind_enabled ? [
    for k, v in module.upwind_integration_aws_ecs_cluster[0].tracer.env :
    { name = k, value = v }
  ] : []

  service_container_base = {
    for name, svc in local.services : name => {
      name      = name
      image     = "${module.workshop.ecr_repository_urls[name]}:${var.image_tag}"
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
          { name = "ORDER_WEBHOOK_URL", value = module.workshop.order_webhook_url },
          { name = "NEXT_PUBLIC_APP_ENV", value = var.environment },
        ] : [],
        name == "board-generator" ? [
          { name = "S3_BUCKET", value = module.workshop.board_images_bucket },
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
          valueFrom = module.workshop.openai_secret_arn
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
      environment = concat(
        base.environment,
        local.upwind_tracer_env,
        [
          { name = "UPWIND_TRACER_EXTENDED_SYSCALLS", value = "true" },
        ],
      )
      entryPoint  = [module.upwind_integration_aws_ecs_cluster[0].tracer.entrypoint]
      command     = local.service_commands[name]
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

  # App container first, then upwind-tracer sidecar (per Upwind ECS sidecar docs).
  service_task_containers = {
    for name, svc in local.services : name => concat(
      [local.service_app_containers[name]],
      local.upwind_enabled ? [local.upwind_tracer_sidecars[name]] : []
    )
  }
}
