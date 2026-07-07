<h1 align="center">Jay's Surf Shop</h1>

<p align="center">
  <img src="frontend/public/logo.png" alt="Jay's Surf Shop logo" width="180" />
</p>

<p align="center">
  A cloud-native surf shop <strong>intentionally vulnerable</strong> for security workshops — CSPM, container runtime, AI SPM, and XDR demos. Also a real app: catalog, cart, RAG chatbot, and AI board designer.
</p>

> [!CAUTION]
> **Do not deploy to production accounts.**


## Architecture

```
Internet → ALB → frontend (ECS Fargate)
                    ├── chat-rag (RAG + GPT-4o-mini, CVE-2023-50447)
                    └── board-generator (DALL·E / gpt-image)

Internet → API Gateway → order-webhook (Lambda, EICAR + PyYAML CVE-2020-14343)
              ↑ checkout from cart
```

| Service | Stack | Port / entry |
|---------|-------|------|
| **frontend** | Next.js 15, React, Tailwind | 3000 |
| **chat-rag** | FastAPI, ChromaDB, OpenAI, exploit lab | 8001 |
| **board-generator** | FastAPI, image generation | 8002 |
| **order-webhook** | Python Lambda, API Gateway HTTP API | `/checkout`, `/demo/*` |

## Quick start (local)

```bash
cp .env.example .env
# Set OPENAI_API_KEY

docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) · security dashboard at [/security](http://localhost:3000/security)

Vulnerabilities are on by default: pillow CVE, exploit endpoints, path traversal, chat-rag on port 8001. On AWS: public API Gateway order webhook with EICAR + PyYAML CVE.

## Deploy to AWS

One Terraform folder, two steps:

```bash
./infrastructure/scripts/apply-ci.sh          # ECR + GitHub OIDC roles
# Add AWS_DEPLOY_ROLE_ARN to repo secrets, then run "Build and Push Images" in Actions
export TF_VAR_openai_api_key="sk-..."
./infrastructure/scripts/deploy.sh            # ECS cluster (later)
```

The workflow [`.github/workflows/build-push.yml`](.github/workflows/build-push.yml) builds all three images and pushes to ECR on push to `main` (or manual dispatch). Local `./infrastructure/scripts/build-push.sh` is optional.

Workshop runbook: **[docs/WORKSHOP.md](docs/WORKSHOP.md)**

## Project structure

```
JaysSurfShop/
├── docs/WORKSHOP.md
├── infrastructure/
│   ├── lambda/order-webhook/  # checkout Lambda (EICAR + PyYAML CVE)
│   ├── terraform/             # all AWS infra
│   └── scripts/               # apply-ci.sh, deploy.sh, build-push.sh
├── frontend/
├── services/
└── docker-compose.yml
```

## License

MIT
