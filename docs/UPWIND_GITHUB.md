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

**Required** — the scan fails with `Client id is missing` if these are not set.

1. In **Upwind Console** → **Organization** → **Credentials** → create a sensor credential (client ID + secret).
2. In GitHub: **https://github.com/JustinDPerkins/JaysSurfShop/settings/secrets/actions** → **New repository secret**

| Secret name | Value |
|-------------|--------|
| `UPWIND_CLIENT_ID` | Client ID from Upwind |
| `UPWIND_CLIENT_SECRET` | Client secret from Upwind |

Names must match exactly (case-sensitive).

Results appear in **Upwind Console → SCA**.

## Optional: Upwind GitHub App (automated scanning)

If you installed the Upwind GitHub App for org-wide scanning, it triggers when images are **pushed to a registry**. That requires:

- A separate [`shiftleft-automated`](https://github.com/JustinDPerkins/shiftleft-automated) repo with `scan-image.yaml`
- Registry push (GHCR or ECR) from CI
- Upwind secrets on `shiftleft-automated`

For this workshop repo, **Build and Scan** is the direct path — build from source, scan inline.
