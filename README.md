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
                    ├── chat-rag (RAG + GPT-4o-mini, includes CVE-2023-50447)
                    └── board-generator (DALL·E / gpt-image)
```

| Service | Stack | Port |
|---------|-------|------|
| **frontend** | Next.js 15, React, Tailwind | 3000 |
| **chat-rag** | FastAPI, ChromaDB, OpenAI, exploit lab | 8001 |
| **board-generator** | FastAPI, image generation | 8002 |

## Quick start (local)

```bash
cp .env.example .env
# Set OPENAI_API_KEY

docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) · security dashboard at [/security](http://localhost:3000/security)

Vulnerabilities are on by default: pillow CVE, exploit endpoints, path traversal, and chat-rag on port 8001.

## Deploy to AWS

```bash
export TF_VAR_openai_api_key="sk-..."
export IMAGE_TAG=latest

chmod +x infrastructure/scripts/*.sh
./infrastructure/scripts/build-push.sh
./infrastructure/scripts/deploy.sh
```

Terraform deploys misconfigs by default: public S3 with synthetic PII, overprivileged IAM, open SSH on ECS SG.

Workshop runbook: **[docs/WORKSHOP.md](docs/WORKSHOP.md)**

### Upwind automated scanning (ECR)

1. **AWS setup:** **[docs/AWS_SETUP.md](docs/AWS_SETUP.md)** — Terraform creates ECR + GitHub OIDC roles
2. **JaysSurfShop** → **Build and Push Images** → ECR
3. **Upwind app** → **shiftleft-automated** scans → SCA tab

Also: **[docs/UPWIND_GITHUB.md](docs/UPWIND_GITHUB.md)**

Full setup: **[docs/UPWIND_GITHUB.md](docs/UPWIND_GITHUB.md)**

## Project structure

```
JaysSurfShop/
├── docs/WORKSHOP.md
├── infrastructure/terraform/
├── infrastructure/scripts/security-demo.sh
├── frontend/
├── services/chat-rag/
├── services/board-generator/
└── docker-compose.yml
```

## License

MIT
