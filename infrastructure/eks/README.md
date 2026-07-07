# EKS deployment

Deploy Jay's Surf Shop on **Amazon EKS** with the same workshop misconfigs as ECS (public S3, overprivileged IRSA, open SSH on node SG, public Lambda API Gateway).

## Quick start

```bash
# Step 1 — ECR + GitHub OIDC (shared with ECS)
./infrastructure/scripts/apply-ci.sh eks

# Step 2 — Build images (GitHub Actions or build-push.sh)

# Step 3 — Deploy
cp infrastructure/eks/terraform/terraform.tfvars.example infrastructure/eks/terraform/terraform.tfvars
export TF_VAR_openai_api_key="sk-..."
./infrastructure/scripts/deploy-eks.sh
```

The frontend is exposed via a Kubernetes `LoadBalancer` service (NLB). After apply, re-run `terraform output application_url` if the hostname is still `pending`.

## Layout

```
infrastructure/eks/
├── README.md
└── terraform/           # EKS root module
    ├── main.tf          # workshop module + kubernetes provider
    ├── eks.tf           # cluster + node group
    ├── kubernetes.tf    # deployments + services
    └── terraform.tfvars.example
```

Shared resources (VPC, S3, Lambda, ECR, GitHub OIDC) live in `infrastructure/modules/workshop/`.

## Upwind (optional)

Subscribe to the **Upwind Security** EKS add-on in AWS Marketplace, then set `upwind_client_id` in `terraform.tfvars` to install `upwind-security_upwind-operator`.

## kubectl

```bash
aws eks update-kubeconfig --region us-east-1 --name jays-surf-shop-demo-eks
kubectl get pods -n jays-surf-shop-demo
```

## Cleanup

```bash
cd infrastructure/eks/terraform && terraform destroy
```
