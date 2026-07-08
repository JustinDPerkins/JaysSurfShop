terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    external = {
      source  = "hashicorp/external"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = module.workshop.common_tags
  }
}

module "workshop" {
  source = "../../modules/workshop"

  aws_region           = var.aws_region
  project_name         = var.project_name
  environment          = var.environment
  owner                = var.owner
  cost_center          = var.cost_center
  github_deploy_repo   = var.github_deploy_repo
  github_scan_repo     = var.github_scan_repo
  openai_api_key       = var.openai_api_key
  allowed_cidr_blocks  = var.allowed_cidr_blocks
}
