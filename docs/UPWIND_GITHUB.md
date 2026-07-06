# Upwind GitHub Integration

Jay's Surf Shop CI builds container images on GitHub Actions and scans them with Upwind ShiftLeft. Results appear in the **SCA** tab in the Upwind Console.

## GitHub secrets (this repo)

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Required now | Description |
|--------|--------------|-------------|
| `UPWIND_CLIENT_ID` | Yes | Upwind sensor credential |
| `UPWIND_CLIENT_SECRET` | Yes | Upwind sensor credential |
| `AWS_DEPLOY_ROLE_ARN` | No (ECR push disabled) | IAM role for ECR push + deploy |
| `OPENAI_API_KEY` | No (deploy disabled) | OpenAI key for Terraform |

## What runs today

The [upwind-scan.yml](../.github/workflows/upwind-scan.yml) workflow builds each service and runs **Upwind ShiftLeft Scan** — no AWS required.

Run manually: **Actions → Upwind Scan → Run workflow**

Images scanned:

```
jays-surf-shop-demo/frontend:<sha>
jays-surf-shop-demo/chat-rag:<sha>
jays-surf-shop-demo/board-generator:<sha>
```

`chat-rag` includes **CVE-2023-50447** (pillow 10.0.1) — expect it in Upwind SCA findings.

## GitHub Automated Scanning (optional org setup)

For org-wide scanning when **any** repo pushes to a registry, Upwind can dispatch scans via a dedicated repo.

### Step 1 — Create `shiftleft-automated` repo

In your GitHub **organization**, create a repo named exactly:

```
shiftleft-automated
```

Copy the workflow template from this repo:

```
.github/upwind/shiftleft-automated-scan-image.yaml
  →  shiftleft-automated/.github/workflows/scan-image.yaml
```

Add secret `AWS_ECR_PULL_ROLE_ARN` — an IAM role GitHub Actions can assume to pull from ECR. Minimum policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRPullAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:BatchCheckLayerAvailability"
      ],
      "Resource": "arn:aws:ecr:us-east-1:<ACCOUNT_ID>:repository/jays-surf-shop-demo/*"
    },
    {
      "Sid": "ECRAuth",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    }
  ]
}
```

Also add `UPWIND_CLIENT_ID` and `UPWIND_CLIENT_SECRET` to that repo.

Test manually: **Actions → Upwind Shift Left Scanning → Run workflow** with an image name.

### Step 2 — Install the Upwind GitHub App

1. Open the [Upwind app on GitHub Marketplace](https://github.com/marketplace)
2. Choose your organization
3. Grant access to **All repositories** (or include `shiftleft-automated` plus repos that push images)
4. Approve permissions (workflow jobs, Actions API)

After install, the app watches workflow activity. When it detects an image push to a registry, it dispatches `scan-image.yaml` in `shiftleft-automated`.

## Verify in Upwind

1. Run the deploy workflow (push to `main` or manual dispatch)
2. Open Upwind Console → **SCA**
3. Look for `jays-surf-shop-demo/chat-rag` and CVE-2023-50447
