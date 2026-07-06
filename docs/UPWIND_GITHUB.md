# Upwind GitHub Automated Scanning

Official flow: **push to registry → Upwind App → `shiftleft-automated` scans → SCA tab**

```
JaysSurfShop          shiftleft-automated
     │                        │
     │  docker push GHCR      │
     ├──────────────────────► │  (Upwind GitHub App dispatches)
     │                        │
     │                        ├─ pull image
     │                        └─ Upwind ShiftLeft scan
```

## Step 1 — shiftleft-automated repo

Repo: **https://github.com/JustinDPerkins/shiftleft-automated**

Workflow on `main`: `.github/workflows/scan-image.yaml`

### Secrets (shiftleft-automated only)

| Secret | Description |
|--------|-------------|
| `UPWIND_CLIENT_ID` | Upwind Console → Organization → Credentials |
| `UPWIND_CLIENT_SECRET` | Same credential pair |
| `GHCR_READ_TOKEN` | GitHub PAT with `read:packages` (pull images from GHCR) |

Create PAT: GitHub **Settings → Developer settings → Personal access tokens** → enable `read:packages`.

### Test scan workflow manually

**shiftleft-automated → Actions → Upwind Shift Left Scanning → Run workflow**

```
ghcr.io/justindperkins/jays-surf-shop-chat-rag:latest
```

## Step 2 — Upwind GitHub App

Install from GitHub Marketplace. Grant access to:

- `shiftleft-automated` (required — app calls this workflow)
- `JaysSurfShop` (required — app watches pushes here)

Recommend **All repositories** for workshops.

## Step 3 — JaysSurfShop build workflow

[build-push.yml](../.github/workflows/build-push.yml) builds from this repo's Dockerfiles and pushes to GHCR:

```
ghcr.io/justindperkins/jays-surf-shop-frontend:<sha>
ghcr.io/justindperkins/jays-surf-shop-chat-rag:<sha>
ghcr.io/justindperkins/jays-surf-shop-board-generator:<sha>
```

**No Upwind secrets on JaysSurfShop** — scanning runs in `shiftleft-automated`.

Run: **JaysSurfShop → Actions → Build and Push Images**

Within a few minutes, check **shiftleft-automated → Actions** for dispatched scan runs.

## Step 4 — Verify in Upwind

**Upwind Console → SCA** — look for `jays-surf-shop-chat-rag` and **CVE-2023-50447** (pillow 10.0.1).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No scan dispatched | App missing repo access; confirm GHCR push succeeded |
| `Client id is missing` | Add `UPWIND_CLIENT_ID` / `SECRET` on **shiftleft-automated**, not JaysSurfShop |
| GHCR pull failed | Add `GHCR_READ_TOKEN` PAT, or make package public in GHCR package settings |
| Workflow not found | File must be exactly `scan-image.yaml` on `main` |

## Images in this repo

| Service | Dockerfile |
|---------|------------|
| frontend | `frontend/Dockerfile` |
| chat-rag | `services/chat-rag/Dockerfile` |
| board-generator | `services/board-generator/Dockerfile` |
