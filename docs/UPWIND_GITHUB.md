# Upwind GitHub Automated Scanning

Two repos work together:

```
JaysSurfShop workflow  →  docker push ghcr.io/...
         ↓
Upwind GitHub App detects registry push
         ↓
shiftleft-automated/scan-image.yaml  →  pull + Upwind SCA scan
         ↓
Upwind Console → SCA tab
```

This is **not** the same as running the Upwind action inline in JaysSurfShop. The app orchestrates scans from `shiftleft-automated`.

## 1. shiftleft-automated repo (required)

Create (or use): **https://github.com/JustinDPerkins/shiftleft-automated**

Workflow must live at exactly:

```
.github/workflows/scan-image.yaml
```

Template: [.github/upwind/shiftleft-automated-scan-image.yaml](../.github/upwind/shiftleft-automated-scan-image.yaml)

### Secrets on shiftleft-automated

| Secret | Description |
|--------|-------------|
| `UPWIND_CLIENT_ID` | Upwind sensor credential |
| `UPWIND_CLIENT_SECRET` | Upwind sensor credential |
| `GHCR_READ_TOKEN` | GitHub PAT with `read:packages` to pull images from GHCR |

Create PAT: **Settings → Developer settings → Personal access tokens** → `read:packages` scope.

## 2. Upwind GitHub App

You installed the app — confirm:

- **Repository access** includes:
  - `shiftleft-automated` (required — app calls this workflow)
  - `JaysSurfShop` (required — app watches pushes here)
- Or select **All repositories**

## 3. JaysSurfShop workflow

[build-push.yml](../.github/workflows/build-push.yml) builds and pushes to GHCR:

```
ghcr.io/justindperkins/jays-surf-shop-frontend:<sha>
ghcr.io/justindperkins/jays-surf-shop-chat-rag:<sha>
ghcr.io/justindperkins/jays-surf-shop-board-generator:<sha>
```

No Upwind secrets needed on JaysSurfShop — scanning happens in `shiftleft-automated`.

## 4. Test the flow

1. Add secrets to `shiftleft-automated`
2. Run **JaysSurfShop → Actions → Build and Push Images**
3. Watch **shiftleft-automated → Actions** — Upwind app should dispatch `Upwind Shift Left Scanning` within a few minutes
4. Check **Upwind Console → SCA** for `chat-rag` / CVE-2023-50447

Manual test of scan workflow: **shiftleft-automated → Actions → Run workflow** with image:

```
ghcr.io/justindperkins/jays-surf-shop-chat-rag:latest
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No scan dispatched | App missing access to `shiftleft-automated` or JaysSurfShop |
| Pull failed in shiftleft-automated | Add `GHCR_READ_TOKEN` PAT, or make GHCR package public |
| Workflow not found | File must be `scan-image.yaml` on `main` branch |
| Scan empty in Upwind | Confirm `UPWIND_CLIENT_ID` / `SECRET` on **shiftleft-automated** |

## ECR (later)

When AWS is ready, switch build-push to ECR and update `scan-image.yaml` to use `aws-actions/amazon-ecr-login` instead of GHCR.
