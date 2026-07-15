data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_role" "app_irsa" {
  name = "${local.name_prefix}-eks-app"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:${local.namespace}:app"
          "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = {
    Name = "${local.name_prefix}-eks-app-role"
  }
}

resource "aws_iam_role_policy" "app_s3_board_images" {
  name = "${local.name_prefix}-s3-board-images"
  role = aws_iam_role.app_irsa.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ]
      Resource = "arn:aws:s3:::${module.workshop.board_images_bucket}/*"
    }]
  })
}

# CSPM workshop finding: overly permissive IAM (IRSA)
resource "aws_iam_role_policy" "demo_overprivileged" {
  name = "${local.name_prefix}-eks-demo-overprivileged"
  role = aws_iam_role.app_irsa.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:*", "secretsmanager:*", "iam:*"]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy" "app_bedrock" {
  name = "${local.name_prefix}-eks-bedrock"
  role = aws_iam_role.app_irsa.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:Converse",
        "bedrock:ConverseStream",
      ]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy" "app_orders" {
  name = "${local.name_prefix}-eks-orders"
  role = aws_iam_role.app_irsa.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan",
        ]
        Resource = module.workshop.orders_table_arn
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Scan",
        ]
        Resource = module.workshop.users_table_arn
      },
    ]
  })
}
