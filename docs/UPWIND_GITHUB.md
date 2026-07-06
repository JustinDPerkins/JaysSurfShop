# Upwind GitHub Automated Scanning (ECR)

## Two separate Terraform stacks

| Folder | Purpose |
|--------|---------|
| `infrastructure/terraform/` | **App** — ECS, VPC, ALB, ECR repos, misconfigs |
| `infrastructure/ci/` | **CI only** — GitHub OIDC roles for ECR push/pull |

## Flow

```
1. App terraform     →  ECR repos + ECS stack
2. CI terraform      →  GitHub OIDC IAM roles
3. JaysSurfShop CI   →  push to ECR
4. Upwind GitHub App →  shiftleft-automated scan
5. Upwind Console    →  SCA tab
```

## Setup

See **[infrastructure/ci/README.md](../infrastructure/ci/README.md)** for step-by-step.

## Secrets summary

| Repo | Secrets |
|------|---------|
| **JaysSurfShop** | `AWS_DEPLOY_ROLE_ARN` (from `infrastructure/ci` output) |
| **shiftleft-automated** | `UPWIND_CLIENT_ID`, `UPWIND_CLIENT_SECRET`, `AWS_ECR_PULL_ROLE_ARN` |

## ECR images

```
<account>.dkr.ecr.us-east-1.amazonaws.com/jays-surf-shop-demo/chat-rag:<tag>
```

`chat-rag` includes **CVE-2023-50447** (pillow 10.0.1).
