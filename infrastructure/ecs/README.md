# ECS deployment

Deploy Jay's Surf Shop on **ECS Fargate** with ALB, Service Connect, optional Upwind tracer sidecars, and the shared workshop misconfigs (public S3, Lambda API Gateway, etc.).

## Quick start

```bash
# Step 1 — ECR + GitHub OIDC (shared with EKS)
./infrastructure/scripts/apply-ci.sh ecs

# Step 2 — Build images (GitHub Actions or build-push.sh)

# Step 3 — Deploy
cp infrastructure/ecs/terraform/terraform.tfvars.example infrastructure/ecs/terraform/terraform.tfvars
export TF_VAR_openai_api_key="sk-..."
./infrastructure/scripts/deploy-ecs.sh
```

## Layout

```
infrastructure/ecs/
├── README.md
├── upwind-scan-image.yaml    # copy to shiftleft-automated for SCA
└── terraform/                # ECS root module
    ├── main.tf               # workshop module + provider
    ├── ecs.tf, alb.tf, ...   # ECS-specific resources
    └── terraform.tfvars.example
```

Shared resources (VPC, S3, Lambda, ECR, GitHub OIDC) live in `infrastructure/modules/workshop/`.

## Upwind (optional)

Set `upwind_client_id` and `upwind_client_secret` in `terraform.tfvars` to enable the Upwind ECS Fargate sensor module.

## Migrating from `infrastructure/terraform/`

**Recommended:** destroy the legacy stack and redeploy (clean state, no `state mv` churn):

```bash
./infrastructure/scripts/redeploy-ecs.sh
```

If Secrets Manager reports a secret "scheduled for deletion" after destroy, restore it before apply:

```bash
aws secretsmanager restore-secret --secret-id jays-surf-shop-demo/openai-api-key --region us-east-1
cd infrastructure/ecs/terraform
terraform import 'module.workshop.aws_secretsmanager_secret.openai_api_key' jays-surf-shop-demo/openai-api-key
terraform apply
```

After deploy, push images (GitHub Actions **Build and Push Images**, or `./infrastructure/scripts/build-push.sh` with Docker running), then:

```bash
aws ecs update-service --cluster jays-surf-shop-demo-cluster \
  --service jays-surf-shop-demo-frontend jays-surf-shop-demo-chat-rag jays-surf-shop-demo-board-generator \
  --force-new-deployment --region us-east-1
```
