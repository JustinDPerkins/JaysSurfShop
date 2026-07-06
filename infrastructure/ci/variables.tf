variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name — must match app terraform (ECR repo prefix)"
  type        = string
  default     = "jays-surf-shop"
}

variable "environment" {
  description = "Environment label — must match app terraform"
  type        = string
  default     = "demo"
}

variable "github_deploy_repo" {
  description = "GitHub repo allowed to push images (org/repo)"
  type        = string
  default     = "JustinDPerkins/JaysSurfShop"
}

variable "github_scan_repo" {
  description = "GitHub repo allowed to pull ECR images for Upwind scans (org/repo)"
  type        = string
  default     = "JustinDPerkins/shiftleft-automated"
}

variable "ecr_services" {
  description = "ECR service image names (must match app terraform ECR repos)"
  type        = list(string)
  default     = ["frontend", "chat-rag", "board-generator"]
}
