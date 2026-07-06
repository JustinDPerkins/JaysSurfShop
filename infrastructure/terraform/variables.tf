variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
  default     = "jays-surf-shop"
}

variable "environment" {
  description = "Environment label (demo, staging, prod)"
  type        = string
  default     = "demo"
}

variable "owner" {
  description = "Team or owner tag for CSPM inventory"
  type        = string
  default     = "security-ops"
}

variable "cost_center" {
  description = "Cost center tag for chargeback reporting"
  type        = string
  default     = "cloud-security"
}

variable "openai_api_key" {
  description = "OpenAI API key (stored in Secrets Manager)"
  type        = string
  sensitive   = true
}

variable "image_tag" {
  description = "Container image tag for all services"
  type        = string
  default     = "latest"
}

variable "desired_count" {
  description = "Number of tasks per ECS service"
  type        = number
  default     = 1
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to reach the ALB"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "container_cpu" {
  description = "CPU units per task (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "container_memory" {
  description = "Memory (MiB) per task"
  type        = number
  default     = 1024
}
