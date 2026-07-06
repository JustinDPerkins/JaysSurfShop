locals {
  name_prefix = "${var.project_name}-${var.environment}"

  ecr_repository_arns = [
    for svc in var.ecr_services :
    "arn:aws:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/${local.name_prefix}/${svc}"
  ]
}
