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

```bash
export TF_VAR_openai_api_key="sk-..."
./infrastructure/scripts/build-push.sh
cd infrastructure/terraform && cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply
```

Misconfigs deploy automatically: public S3 + synthetic PII, wildcard IAM on ECS task role, SSH open on ECS security group.

```bash
./infrastructure/scripts/security-demo.sh exploit   # curl public customer-export.json
```

## Key endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /security` | Posture UI + PoC buttons |
| `GET /api/security/posture` | Machine-readable findings |
| `POST /api/chat` | AI inference audit logs |
| `POST /api/board` | Image generation audit logs |

## Cleanup

```bash
cd infrastructure/terraform && terraform destroy
```

## Upwind CI scanning

GitHub Actions builds and scans all three images with Upwind. See **[UPWIND_GITHUB.md](./UPWIND_GITHUB.md)**.
