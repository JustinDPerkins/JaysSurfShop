# Upwind CI Scanning

This repo ships three Dockerfiles. The workflow builds each image on the runner and sends it to Upwind SCA — no registry or AWS required.

## Run it

**Actions → Build and Scan → Run workflow**

Or push to `main`.

## Images scanned

| Service | Dockerfile | Notable finding |
|---------|------------|-----------------|
| `frontend` | `frontend/Dockerfile` | Next.js shop UI |
| `chat-rag` | `services/chat-rag/Dockerfile` | **CVE-2023-50447** (pillow 10.0.1) |
| `board-generator` | `services/board-generator/Dockerfile` | Image gen API |

## GitHub secrets (this repo)

**Settings → Secrets and variables → Actions**

| Secret | Description |
|--------|-------------|
| `UPWIND_CLIENT_ID` | Upwind sensor credential |
| `UPWIND_CLIENT_SECRET` | Upwind sensor credential |

Results appear in **Upwind Console → SCA**.

## Optional: Upwind GitHub App (automated scanning)

If you installed the Upwind GitHub App for org-wide scanning, it triggers when images are **pushed to a registry**. That requires:

- A separate [`shiftleft-automated`](https://github.com/JustinDPerkins/shiftleft-automated) repo with `scan-image.yaml`
- Registry push (GHCR or ECR) from CI
- Upwind secrets on `shiftleft-automated`

For this workshop repo, **Build and Scan** is the direct path — build from source, scan inline.
