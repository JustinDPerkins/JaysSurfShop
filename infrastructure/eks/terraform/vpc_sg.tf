resource "aws_security_group" "eks_nodes" {
  name        = "${local.name_prefix}-eks-nodes-sg"
  description = "EKS worker node security group"
  vpc_id      = module.workshop.vpc_id

  ingress {
    description = "Node-to-node"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description = "Cluster API to nodes"
    from_port   = 1025
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = [module.workshop.vpc_id != "" ? data.aws_vpc.main.cidr_block : "10.20.0.0/16"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-eks-nodes-sg"
  }
}

data "aws_vpc" "main" {
  id = module.workshop.vpc_id
}

# CSPM workshop finding: overly permissive ingress
resource "aws_security_group_rule" "demo_open_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.eks_nodes.id
  description       = "DEMO FINDING: SSH open to world - remove in production"
}
