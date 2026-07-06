# GitHub Actions OIDC — separate from app deployment (infrastructure/terraform)
# Requires ECR repos to exist first (created by app terraform).

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
    Name       = "${local.name_prefix}-github-${each.key}"
    GitHubRepo = each.value.name
    Purpose    = each.key == "deploy" ? "ecr-push" : "ecr-pull-upwind-scan"
  }
}

resource "aws_iam_role_policy_attachment" "github_actions" {
  for_each = local.github_repos

  role       = aws_iam_role.github_actions[each.key].name
  policy_arn = each.value.policy
}

resource "aws_iam_policy" "github_ecr_push" {
  name        = "${local.name_prefix}-github-ecr-push"
  description = "GitHub Actions: push to project ECR repos"

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
        Sid    = "ECRPush"
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
        Resource = local.ecr_repository_arns
      },
    ]
  })
}

resource "aws_iam_policy" "github_ecr_pull" {
  name        = "${local.name_prefix}-github-ecr-pull"
  description = "shiftleft-automated: pull from project ECR repos"

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
        Resource = local.ecr_repository_arns
      },
    ]
  })
}
