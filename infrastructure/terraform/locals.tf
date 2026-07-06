locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project        = var.project_name
    Environment    = var.environment
    Owner          = var.owner
    Application    = "cspm-demo"
    CostCenter     = var.cost_center
    DataClass      = "internal"
    ManagedBy      = "terraform"
    SecurityReview = "required"
    Workshop       = "cloud-security-monitoring"
  }

  services = {
    frontend = {
      port     = 3000
      image    = "frontend"
      cpu      = var.upwind_client_id != "" ? 1024 : var.container_cpu
      memory   = var.upwind_client_id != "" ? 2048 : var.container_memory
      public   = true
      path     = "/*"
      priority = 100
    }
    chat-rag = {
      port     = 8001
      image    = "chat-rag"
      cpu      = var.container_cpu
      memory   = var.container_memory
      public   = false
      path     = null
      priority = null
    }
    board-generator = {
      port     = 8002
      image    = "board-generator"
      cpu      = var.container_cpu
      memory   = var.container_memory
      public   = false
      path     = null
      priority = null
    }
  }

  service_connect_namespace = "${local.name_prefix}.local"
}
