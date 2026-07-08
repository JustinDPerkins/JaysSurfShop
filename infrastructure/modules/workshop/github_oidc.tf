data "external" "github_oidc_provider" {
  program = ["bash", "${path.module}/scripts/github_oidc_lookup.sh"]
}

resource "aws_iam_openid_connect_provider" "github" {
  count = data.external.github_oidc_provider.result.create == "true" ? 1 : 0

  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com",
  ]

  thumbprint_list = [
    "6938fd4d98bab03fa76887e67522eb9944caf965",
  ]
}

locals {
  github_oidc_provider_arn = data.external.github_oidc_provider.result.create == "true" ? aws_iam_openid_connect_provider.github[0].arn : data.external.github_oidc_provider.result.arn

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
        Federated = local.github_oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = each.key == "scan" ? [
            "repo:${local.github_repos.scan.name}:*",
            "repo:${local.github_repos.deploy.name}:*",
          ] : ["repo:${each.value.name}:*"]
        }
      }
    }]
  })

  tags = {
    Name       = "${local.name_prefix}-github-${each.key}"
    GitHubRepo = each.value.name
  }
}

resource "aws_iam_role_policy_attachment" "github_actions" {
  for_each = local.github_repos

  role       = aws_iam_role.github_actions[each.key].name
  policy_arn = each.value.policy
}

resource "aws_iam_policy" "github_ecr_push" {
  name        = "${local.name_prefix}-github-ecr-push"
  description = "JaysSurfShop GitHub Actions: push to ECR"

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
        Resource = [for repo in aws_ecr_repository.services : repo.arn]
      },
    ]
  })
}

resource "aws_iam_policy" "github_ecr_pull" {
  name        = "${local.name_prefix}-github-ecr-pull"
  description = "shiftleft-automated: pull from ECR for Upwind scans"

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
