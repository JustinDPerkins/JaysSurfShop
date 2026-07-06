# CI / GitHub Actions (separate from app deploy)

This stack is **independent** from `infrastructure/terraform/` (the app: ECS, VPC, ALB, etc.).

It only creates:
- GitHub OIDC provider
- IAM roles for ECR push (JaysSurfShop) and pull (shiftleft-automated)

## Prerequisites

1. **App ECR repos must exist first** — run app terraform once:
   ```bash
   cd ../terraform
   terraform apply   # creates jays-surf-shop-demo/* ECR repos
   ```

2. AWS CLI configured

## Deploy CI stack

```bash
cd infrastructure/ci
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

## GitHub secrets

```bash
terraform output -raw github_actions_deploy_role_arn      # → JaysSurfShop: AWS_DEPLOY_ROLE_ARN
terraform output -raw github_actions_ecr_pull_role_arn    # → shiftleft-automated: AWS_ECR_PULL_ROLE_ARN
terraform output -raw ecr_image_prefix                    # image prefix for manual scan tests
```

### shiftleft-automated (also needs Upwind credentials)

| Secret | Source |
|--------|--------|
| `UPWIND_CLIENT_ID` | Upwind Console |
| `UPWIND_CLIENT_SECRET` | Upwind Console |
| `AWS_ECR_PULL_ROLE_ARN` | terraform output above |

Copy `upwind-scan-image.yaml` to `shiftleft-automated/.github/workflows/scan-image.yaml`.

## Run pipeline

**JaysSurfShop → Actions → Build and Push Images** → ECR → Upwind app → shiftleft-automated scan

See also: [docs/UPWIND_GITHUB.md](../../docs/UPWIND_GITHUB.md)
