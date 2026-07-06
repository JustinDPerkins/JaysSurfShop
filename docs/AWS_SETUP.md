# AWS + GitHub Actions Setup

One-time setup to create ECR repos, GitHub OIDC roles, and wire CI to Upwind.

## What gets created

| Resource | Purpose |
|----------|---------|
| 3× ECR repos | `jays-surf-shop-demo/frontend`, `chat-rag`, `board-generator` |
| IAM OIDC provider | Lets GitHub Actions assume AWS roles without long-lived keys |
| `github-deploy` role | JaysSurfShop pushes images to ECR |
| `github-scan` role | shiftleft-automated pulls images for Upwind scans |
| Full ECS stack | ALB, Fargate, misconfigs (optional — deploy job still commented out in CI) |

## Step 1 — Prerequisites

- AWS CLI configured (`aws sts get-caller-identity`)
- Terraform >= 1.5
- OpenAI API key

## Step 2 — Deploy infrastructure

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars

export TF_VAR_openai_api_key="sk-..."
terraform init
terraform apply
```

Review the plan — it creates VPC, ECS, ECR, IAM, S3, etc.

## Step 3 — Copy role ARNs to GitHub secrets

After apply:

```bash
terraform output -raw github_actions_deploy_role_arn
terraform output -raw github_actions_ecr_pull_role_arn
terraform output ecr_repository_urls
```

### JaysSurfShop secrets

https://github.com/JustinDPerkins/JaysSurfShop/settings/secrets/actions

| Secret | Value |
|--------|--------|
| `AWS_DEPLOY_ROLE_ARN` | `github_actions_deploy_role_arn` output |

### shiftleft-automated secrets

https://github.com/JustinDPerkins/shiftleft-automated/settings/secrets/actions

| Secret | Value |
|--------|--------|
| `UPWIND_CLIENT_ID` | Upwind Console → Credentials |
| `UPWIND_CLIENT_SECRET` | Upwind Console → Credentials |
| `AWS_ECR_PULL_ROLE_ARN` | `github_actions_ecr_pull_role_arn` output |

## Step 4 — Update shiftleft-automated workflow

Push the ECR version of `scan-image.yaml` to shiftleft-automated (template in `.github/upwind/shiftleft-automated-scan-image.yaml`).

## Step 5 — Run the pipeline

1. **JaysSurfShop → Actions → Build and Push Images**
2. Images land in ECR:
   ```
   <account>.dkr.ecr.us-east-1.amazonaws.com/jays-surf-shop-demo/chat-rag:<sha>
   ```
3. Upwind GitHub App dispatches **shiftleft-automated** scan
4. Check **Upwind Console → SCA**

### Manual scan test

**shiftleft-automated → Run workflow** with image (after push):

```
<account>.dkr.ecr.us-east-1.amazonaws.com/jays-surf-shop-demo/chat-rag:latest
```

## Bootstrap ECR + roles only (faster)

If you want CI working before full ECS deploy:

```bash
cd infrastructure/terraform
export TF_VAR_openai_api_key="sk-..."
terraform apply \
  -target=aws_ecr_repository.services \
  -target=aws_iam_openid_connect_provider.github \
  -target=aws_iam_role.github_actions \
  -target=aws_iam_policy.github_ecr_push \
  -target=aws_iam_policy.github_ecr_pull \
  -target=aws_iam_role_policy_attachment.github_actions
```

Note: `-target` is for bootstrap only. Run full `terraform apply` before workshop AWS demos.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Could not load credentials` | Add `AWS_DEPLOY_ROLE_ARN` to JaysSurfShop secrets |
| `AccessDenied` on ECR push | Re-run terraform apply; confirm repo name matches workflow |
| Upwind scan not dispatched | Confirm Upwind app has both repos; ECR push succeeded |
| OIDC trust error | Repo must match `github_deploy_repo` in terraform.tfvars |

## Customize GitHub repos

In `terraform.tfvars`:

```hcl
github_deploy_repo = "JustinDPerkins/JaysSurfShop"
github_scan_repo   = "JustinDPerkins/shiftleft-automated"
```
