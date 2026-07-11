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

**Runtime (ECS):** Set `upwind_client_id` and `upwind_client_secret` in `terraform.tfvars` to enable the Upwind ECS Fargate sensor module.

**Runtime (Lambda):** Instrument `order-webhook` separately with `upwindctl lambda instrument` (see [Upwind Lambda docs](https://docs.upwind.io/getting-started/install-sensor/amazon-lambda/overview)).

**SCA (GitHub Actions):** Add `UPWIND_CLIENT_ID` and `UPWIND_CLIENT_SECRET` to repo secrets, then run the **Upwind Manual Image Scan** workflow (`.github/workflows/upwind-scan.yml`). See [docs/WORKSHOP.md](../../docs/WORKSHOP.md#upwind-scanning).

After deploy, push images (GitHub Actions **Build and Push Images**, or `./infrastructure/scripts/build-push.sh` with Docker running), then restart ECS tasks:

```bash
./infrastructure/scripts/force-ecs-redeploy.sh
```

Or one service at a time:

```bash
aws ecs update-service --cluster jays-surf-shop-demo-cluster \
  --service jays-surf-shop-demo-frontend \
  --force-new-deployment --region us-east-1
```
