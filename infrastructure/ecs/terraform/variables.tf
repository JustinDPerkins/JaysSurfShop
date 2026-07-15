variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "jays-surf-shop"
}

variable "environment" {
  type    = string
  default = "demo"
}

variable "owner" {
  type    = string
  default = "security-ops"
}

variable "cost_center" {
  type    = string
  default = "cloud-security"
}

variable "github_deploy_repo" {
  type    = string
  default = "AstralJays/JaysSurfShop"
}

variable "github_scan_repo" {
  type    = string
  default = "JustinDPerkins/shiftleft-automated"
}

variable "openai_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "allowed_cidr_blocks" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "container_cpu" {
  type    = number
  default = 512
}

variable "container_memory" {
  type    = number
  default = 1024
}

variable "upwind_client_id" {
  description = "Upwind API client ID for ECS sensor onboarding (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "upwind_client_secret" {
  description = "Upwind API client secret for ECS sensor onboarding (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "llm_provider" {
  type        = string
  default     = "bedrock"
  description = "LLM backend for chat-rag: bedrock (AWS) or openai"
}

variable "bedrock_chat_model" {
  type    = string
  default = "amazon.nova-lite-v1:0"
}

variable "bedrock_embed_model" {
  type    = string
  default = "amazon.titan-embed-text-v2:0"
}
