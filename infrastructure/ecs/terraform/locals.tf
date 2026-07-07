locals {
  name_prefix = module.workshop.name_prefix

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
