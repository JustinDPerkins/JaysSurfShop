# Upwind GitHub Automated Scanning (ECR)

See **[AWS_SETUP.md](./AWS_SETUP.md)** for Terraform + GitHub secrets setup.

## Flow

```
Terraform apply  →  ECR repos + GitHub OIDC IAM roles
        ↓
JaysSurfShop CI  →  docker push ECR
        ↓
Upwind GitHub App  →  shiftleft-automated scan-image.yaml
        ↓
Upwind Console → SCA
```

## Secrets summary

| Repo | Secrets |
|------|---------|
| **JaysSurfShop** | `AWS_DEPLOY_ROLE_ARN` |
| **shiftleft-automated** | `UPWIND_CLIENT_ID`, `UPWIND_CLIENT_SECRET`, `AWS_ECR_PULL_ROLE_ARN` |

## ECR image paths

```
<account>.dkr.ecr.us-east-1.amazonaws.com/jays-surf-shop-demo/frontend:<tag>
<account>.dkr.ecr.us-east-1.amazonaws.com/jays-surf-shop-demo/chat-rag:<tag>
<account>.dkr.ecr.us-east-1.amazonaws.com/jays-surf-shop-demo/board-generator:<tag>
```

`chat-rag` includes **CVE-2023-50447** (pillow 10.0.1).
