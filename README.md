<h1 align="center">Jay's Surf Shop</h1>

<p align="center">
  <img src="frontend/public/logo.png" alt="Jay's Surf Shop logo" width="180" />
</p>

<p align="center">
  Open-source <strong>POC / demo</strong> app for security engineers — fork or clone it, stand it up locally or in AWS, wire in{" "}
  <strong>your</strong> CSPM / runtime / XDR / SCA tooling, then run the built-in attack chains from <code>/security</code>.
  Also a real shop UI: catalog, cart, RAG chatbot, and AI board designer.
</p>

<p align="center">
  <a href="https://github.com/AstralJays/JaysSurfShop">github.com/AstralJays/JaysSurfShop</a>
</p>

> [!CAUTION]
> **Do not deploy to production accounts.**


## Architecture

```
Internet → ALB → frontend (ECS Fargate)
                    ├── chat-rag (RAG + Bedrock Nova, order tools → DynamoDB)
                    └── board-generator (DALL·E / gpt-image)

Internet → API Gateway → order-webhook (Lambda, EICAR + PyYAML CVE-2020-14343)
              ↑ checkout from cart
```

| Service | Stack | Port / entry |
|---------|-------|------|
| **frontend** | Next.js 15, React, Tailwind | 3000 |
| **chat-rag** | FastAPI, ChromaDB, Bedrock (AWS) / OpenAI (local), DynamoDB orders | 8001 |
| **board-generator** | FastAPI, image generation | 8002 |
| **order-webhook** | Python Lambda, API Gateway HTTP API | `/checkout`, `/demo/*` |

## Quick start (local)

```bash
cp .env.example .env
# Set OPENAI_API_KEY

docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) · exploit lab at [/security](http://localhost:3000/security)

Vulnerabilities are on by default (Pillow CVE, exploit endpoints, path traversal, chat-rag on 8001). Point your tooling at the stack, then run attacks from the lab. On AWS: public API Gateway order webhook with EICAR + PyYAML CVE.

## Deploy to AWS

Choose **ECS** or **EKS** — both share ECR, VPC, S3, Lambda, and GitHub OIDC via `infrastructure/modules/workshop/`.

```bash
./infrastructure/scripts/apply-ci.sh ecs   # or: eks
# Add AWS_DEPLOY_ROLE_ARN to repo secrets, then run "Build and Push Images" in Actions
# chat-rag defaults to Bedrock (Nova Lite + Titan embeddings); board-generator still needs OpenAI
export TF_VAR_openai_api_key="sk-..."   # board-generator + optional openai fallback
# export TF_VAR_llm_provider=bedrock    # default
./infrastructure/scripts/deploy-ecs.sh     # or: deploy-eks.sh
```

Enable Nova Lite + Titan Embed access in the Bedrock console (model access) for the SurfShop account before first chat.

See [infrastructure/ecs/README.md](infrastructure/ecs/README.md) and [infrastructure/eks/README.md](infrastructure/eks/README.md).

The workflow [`.github/workflows/build-push.yml`](.github/workflows/build-push.yml) builds all three images and pushes to ECR on push to `main` (or manual dispatch). Local `./infrastructure/scripts/build-push.sh` is optional.

Workshop runbook: **[docs/WORKSHOP.md](docs/WORKSHOP.md)** (optional — local compose + the `/security` lab are enough to start).

## Project structure

```
JaysSurfShop/
├── docs/WORKSHOP.md
├── infrastructure/
│   ├── modules/workshop/      # shared VPC, S3, Lambda, ECR, GitHub OIDC
│   ├── ecs/terraform/         # ECS Fargate + ALB
│   ├── eks/terraform/         # Amazon EKS
│   ├── lambda/order-webhook/  # checkout Lambda (EICAR + PyYAML CVE)
│   └── scripts/               # apply-ci, deploy-ecs/eks, build-push, force-ecs-redeploy, security-demo
├── frontend/
├── services/
└── docker-compose.yml
```

## License

MIT
