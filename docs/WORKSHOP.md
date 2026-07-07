# Security Workshop Guide

Jay's Surf Shop ships **vulnerable by default** — misconfigs, CVEs, and exploit endpoints are always on. Use only in isolated demo accounts.

## Local

```bash
cp .env.example .env
# Set OPENAI_API_KEY

docker compose up --build
```

- Shop: [http://localhost:3000](http://localhost:3000)
- Posture + PoCs: [/security](http://localhost:3000/security)

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

After CI apply: add `AWS_ECR_PULL_ROLE_ARN` + Upwind credentials to **shiftleft-automated**. Copy `infrastructure/ecs/upwind-scan-image.yaml` into that repo's workflows. Push images → Upwind GitHub App triggers scan → SCA tab.

## Key endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /security` | Posture UI + PoC buttons |
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
