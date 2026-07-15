# Security Workshop Guide

Jay's Surf Shop is a **real-looking surf store** that is vulnerable on purpose — like DVWA, but you can browse boards, design customs, check out, and chat with Maya. Use only in isolated demo accounts.

## The store (shopper experience)

| Area | Route | What shoppers do |
|------|-------|------------------|
| Shop | `/shop` | Browse boards, wax, wetsuits |
| Product | `/products/[id]` | View details, add to cart |
| Create-A-Board | `/design` | AI custom board designer |
| Cart | cart drawer | Checkout |
| Orders | `/orders` | Track shipments (sign in) |
| Maya | `/chat` | AI support for sizing & shipping |
| Sign in | `/login` | Demo customer accounts |
| Staff | `/admin` | User management (staff) |

## Security workshop (`/security`)

Three tabs for presenters:

1. **Shop vulnerability map** — DVWA-style grid: every storefront area → what's wrong → how to try it manually → auto-run buttons where applicable.
2. **Attack stories** — four headline chains (auto-run):
   - **AI** — Free surfboard via support chat (Maya order hijack)
   - **Container CVEs** — Path traversal → Pillow RCE → post-exploit toolkit
   - **Lambda & storefront** — React2Shell → poisoned checkout YAML
   - **Cloud XDR** — Metadata creds → IAM enum → S3 exfil
3. **Cloud posture** — CVE, CSPM, IAM, and public attack surface (baseline before stories).

Shoppers never need `/security`. Presenters use it to fire live signals for detections.

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| `jordan.lee@example.com` | `jordanwaves` | Attacker (order hijack story) |
| `sam.rivera@example.com` | `samwaves` | Victim (Classic Longboard JSS-10847) |
| `admin@jayssurfshop.example` | `staffadmin` | Staff admin |

## Local

```bash
cp .env.example .env
# Set OPENAI_API_KEY

docker compose up --build
```

- Shop: [http://localhost:3000](http://localhost:3000)
- Security workshop: [/security](http://localhost:3000/security)

### Built-in local findings

| Finding | Detail |
|---------|--------|
| CVE-2023-50447 | pillow 10.0.1 in chat-rag image |
| Exploit lab | `/demo/exploit/*`, `/legacy/download` |
| Exposed admin | `POST /reindex` on port 8001 (no auth) |

## Scripted demo

```bash
chmod +x infrastructure/scripts/security-demo.sh

./infrastructure/scripts/security-demo.sh baseline
./infrastructure/scripts/security-demo.sh scan-cve
./infrastructure/scripts/security-demo.sh exploit-live
./infrastructure/scripts/security-demo.sh local-abuse
```

## AWS

Pick an orchestrator:

### ECS (default)

```bash
./infrastructure/scripts/apply-ci.sh ecs
# Add AWS_DEPLOY_ROLE_ARN to JaysSurfShop GitHub secrets
# GitHub Actions → "Build and Push Images"

export TF_VAR_openai_api_key="sk-..."
./infrastructure/scripts/deploy-ecs.sh
```

### EKS

```bash
./infrastructure/scripts/apply-ci.sh eks
export TF_VAR_openai_api_key="sk-..."
./infrastructure/scripts/deploy-eks.sh
```

Misconfigs deploy automatically: public S3 + synthetic PII, wildcard IAM (ECS task role or EKS IRSA), SSH open on compute security group, public API Gateway order webhook Lambda (EICAR + PyYAML CVE).

```bash
./infrastructure/scripts/security-demo.sh exploit   # curl public customer-export.json
```

After deploy, checkout in the shop cart posts to the order webhook Lambda via API Gateway.

## Upwind scanning

### Manual scan (this repo)

Add GitHub Actions secrets to **JaysSurfShop**:

| Secret | Role | How to get ARN |
|--------|------|----------------|
| `AWS_DEPLOY_ROLE_ARN` | ECR **push** (build workflow) | `terraform output -raw github_actions_deploy_role_arn` from `infrastructure/ecs/terraform` |
| `AWS_ECR_PULL_ROLE_ARN` | ECR **pull** (manual scan workflow) | `terraform output -raw github_actions_ecr_pull_role_arn` from `infrastructure/ecs/terraform` |
| `UPWIND_CLIENT_ID` | Upwind SCA | Upwind Console → Settings → Credentials |
| `UPWIND_CLIENT_SECRET` | Upwind SCA | Upwind Console → Settings → Credentials |

After updating Terraform (scan role trust includes this repo), run `terraform apply` in `infrastructure/ecs/terraform` if the scan workflow cannot assume the pull role yet.

Then run **Actions → Upwind Manual Image Scan → Run workflow**:

- **ECR mode** (default) — pull `latest` (or chosen tag) from ECR and scan. Use after **Build and Push Images**.
- **Build mode** — build from Dockerfile on the runner and scan before push (shift-left).

Results appear in Upwind → Shift Left / SCA.

### Automated scan (optional, separate repo)

For registry-triggered scans via the Upwind GitHub App: add `AWS_ECR_PULL_ROLE_ARN` + Upwind credentials to **shiftleft-automated**. Copy `infrastructure/ecs/upwind-scan-image.yaml` into that repo's workflows. Push images → Upwind GitHub App triggers scan → SCA tab.

## Key endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /security` | Shop vuln map + attack stories + cloud posture |
| `GET /api/security/posture` | Machine-readable findings |
| `POST /api/checkout` | Cart checkout → order webhook Lambda |
| `POST /api/chat` | AI inference audit logs |
| `POST /api/board` | Image generation audit logs |

## Cleanup

```bash
# ECS
cd infrastructure/ecs/terraform && terraform destroy

# EKS
cd infrastructure/eks/terraform && terraform destroy
```
