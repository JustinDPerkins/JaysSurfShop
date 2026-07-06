# GitHub Actions OIDC — push images to ECR (JaysSurfShop) and pull for Upwind scans (shiftleft-automated)

# GitHub's OIDC provider (one per AWS account)
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03fa02195ae0576d5899661cfcb",
    "1c58a3a8518e7979c638139b782e724b5d6e7e3",
  ]

  tags = {
    Name = "${local.name_prefix}-github-oidc"
  }
}

locals {
  github_repos = {
    deploy = {
      name   = var.github_deploy_repo
      policy = aws_iam_policy.github_ecr_push.arn
    }
    scan = {
      name   = var.github_scan_repo
      policy = aws_iam_policy.github_ecr_pull.arn
    }
  }
}

resource "aws_iam_role" "github_actions" {
  for_each = local.github_repos

  name = "${local.name_prefix}-github-${each.key}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRoleWithWebIdentity"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${each.value.name}:*"
        }
      }
    }]
  })

  tags = {
    Name        = "${local.name_prefix}-github-${each.key}"
    GitHubRepo  = each.value.name
    Purpose     = each.key == "deploy" ? "ecr-push" : "ecr-pull-upwind-scan"
  }
}

resource "aws_iam_role_policy_attachment" "github_actions" {
  for_each = local.github_repos

  role       = aws_iam_role.github_actions[each.key].name
  policy_arn = each.value.policy
}

# JaysSurfShop CI — build and push to ECR
resource "aws_iam_policy" "github_ecr_push" {
  name        = "${local.name_prefix}-github-ecr-push"
  description = "Allow GitHub Actions to push container images to project ECR repos"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ECRAuth"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Sid    = "ECRPushPull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
        ]
        Resource = [for repo in aws_ecr_repository.services : repo.arn]
      },
    ]
  })
}

# shiftleft-automated — pull images for Upwind SCA scans
resource "aws_iam_policy" "github_ecr_pull" {
  name        = "${local.name_prefix}-github-ecr-pull"
  description = "Allow shiftleft-automated to pull images from project ECR repos"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ECRAuth"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Sid    = "ECRPull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ]
        Resource = [for repo in aws_ecr_repository.services : repo.arn]
      },
    ]
  })
}
