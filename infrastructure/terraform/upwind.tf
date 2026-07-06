# Upwind ECS Fargate sensor onboarding (optional — set credentials in terraform.tfvars)
module "upwind_integration_aws_ecs_cluster" {
  count  = var.upwind_client_id != "" ? 1 : 0
  source = "https://get.upwind.io/terraform/modules/aws-ecs-fargate/aws-ecs-fargate-0.37.0.tar.gz"

  upwind_client_id     = var.upwind_client_id
  upwind_client_secret = var.upwind_client_secret
  ecs_cluster_name     = aws_ecs_cluster.main.name
  vpc_id               = aws_vpc.main.id
  subnets              = aws_subnet.private[*].id
}
